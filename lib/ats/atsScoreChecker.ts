// lib/ats/atsScoreChecker.ts
// ═══════════════════════════════════════════════════════════════
// ATS REALITY SIMULATOR — Core Scoring Engine
//
// Analyses job posting + user's CV/cover letter and returns:
// - Overall ATS score (0-100)
// - Keyword match breakdown
// - Experience gap analysis
// - Language match check
// - Missing keyword warnings
// - Actionable recommendations
//
// SECURITY: All inputs are sanitized before processing.
// No user PII is sent to AI — only extracted keywords.
// ═══════════════════════════════════════════════════════════════

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface ATSCheckInput {
  jobPosting: string;       // The job advertisement text
  userDocument?: string;    // User's CV or cover letter text (optional for job-only mode)
  documentType: 'cv' | 'cover_letter' | 'both' | 'job_only';
}

// Job-only analysis result (no user document needed)
export interface JobRequirementsResult {
  jobTitle: string;
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: { skill: string; years: string }[];
  requiredLanguages: string[];
  educationLevel: string;
  detectedLanguage: string;
  keywordCount: number;
  difficultyEstimate: 'easy' | 'moderate' | 'hard' | 'very_hard';
  tips: string[];
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  context: string;          // Where it was found (or "missing")
  importance: 'required' | 'preferred' | 'nice_to_have';
  weight: number;           // 1-3
}

export interface ExperienceGap {
  skill: string;
  required: string;         // e.g. "5+ years"
  userHas: string;          // e.g. "1 year" or "not mentioned"
  gapSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  passLikelihood: number;   // 0-100
}

export interface ATSScoreResult {
  // Core scores
  overallScore: number;             // 0-100
  keywordScore: number;             // 0-100
  experienceScore: number;          // 0-100
  languageScore: number;            // 0-100
  formattingScore: number;          // 0-100

  // Detailed breakdowns
  keywordMatches: KeywordMatch[];
  experienceGaps: ExperienceGap[];

  // Analysis
  detectedLanguage: {
    jobPosting: string;
    userDocument: string;
    match: boolean;
  };

  // Recommendations
  recommendations: {
    critical: string[];     // Must fix
    important: string[];    // Should fix
    optional: string[];     // Nice to fix
  };

  // Meta
  jobTitle: string;
  requiredSkillsCount: number;
  matchedSkillsCount: number;
  passLikelihood: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  summary: string;
}

// ═══════════════════════════════════════
// SECURITY: Input validation & sanitization
// ═══════════════════════════════════════

const MAX_INPUT_LENGTH = 15000; // ~3000 words
const MAX_KEYWORD_LENGTH = 100;

/** Remove potential XSS, SQL injection, script injection */
function sanitizeInput(text: string): string {
  if (!text || typeof text !== 'string') return '';

  let clean = text;

  // 1. Strip HTML tags completely
  clean = clean.replace(/<[^>]*>/g, '');

  // 2. Remove script-like patterns
  clean = clean.replace(/javascript:/gi, '');
  clean = clean.replace(/on\w+\s*=/gi, '');
  clean = clean.replace(/data:\s*text\/html/gi, '');
  clean = clean.replace(/vbscript:/gi, '');

  // 3. Remove SQL injection patterns
  clean = clean.replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE|CAST|CONVERT|xp_)\b)/gi, 
    (match) => match.replace(/./g, '*'));

  // 4. Remove null bytes and control characters
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // 5. Normalize whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  // 6. Truncate
  if (clean.length > MAX_INPUT_LENGTH) {
    clean = clean.substring(0, MAX_INPUT_LENGTH);
  }

  return clean;
}

/** Validate that input looks like real text, not an attack payload */
function validateInput(text: string): { valid: boolean; reason?: string } {
  if (!text || text.length < 20) {
    return { valid: false, reason: 'Input too short (minimum 20 characters)' };
  }
  if (text.length > MAX_INPUT_LENGTH) {
    return { valid: false, reason: `Input too long (maximum ${MAX_INPUT_LENGTH} characters)` };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(\{|\[)\s*("|')?\s*(\\|\/)/,                    // JSON/path injection
    /<\s*script/i,                                      // Script tags
    /\b(eval|setTimeout|setInterval|Function)\s*\(/,   // JS execution
    /\$\{.*\}/,                                         // Template injection
    /\{\{.*\}\}/,                                       // Template injection
    /\.\.\//g,                                          // Path traversal
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      return { valid: false, reason: 'Input contains suspicious patterns' };
    }
  }

  // Must contain some actual words (not just special chars)
  const wordCount = text.split(/\s+/).filter(w => /^[a-zA-ZäöåÄÖÅ]/.test(w)).length;
  if (wordCount < 5) {
    return { valid: false, reason: 'Input must contain readable text' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════
// KEYWORD EXTRACTION (no AI needed)
// ═══════════════════════════════════════

interface ExtractedRequirements {
  requiredSkills: string[];
  preferredSkills: string[];
  experienceRequirements: { skill: string; years: string }[];
  languages: string[];
  educationLevel: string;
  jobTitle: string;
}

function extractRequirementsLocal(jobPosting: string): ExtractedRequirements {
  const text = jobPosting.toLowerCase();
  const lines = jobPosting.split('\n').map(l => l.trim()).filter(Boolean);

  // Common tech keywords to look for
  const techKeywords = [
    'react', 'angular', 'vue', 'javascript', 'typescript', 'python', 'java', 'c#', 'c++',
    'node.js', 'nodejs', 'express', 'next.js', 'nextjs', 'docker', 'kubernetes', 'aws',
    'azure', 'gcp', 'sql', 'postgresql', 'mongodb', 'redis', 'git', 'ci/cd', 'agile',
    'scrum', 'rest', 'graphql', 'html', 'css', 'sass', 'tailwind', 'figma', 'linux',
    'terraform', 'ansible', 'jenkins', 'github actions', 'jira', 'confluence',
    'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'pandas', 'numpy',
    'spring boot', 'django', 'flask', 'ruby on rails', '.net', 'blazor', 'wordpress',
    'php', 'laravel', 'swift', 'kotlin', 'flutter', 'react native', 'unity',
    'power bi', 'tableau', 'excel', 'sap', 'salesforce', 'hubspot',
  ];

  // Soft skills
  const softSkills = [
    'communication', 'teamwork', 'leadership', 'problem-solving', 'problem solving',
    'analytical', 'creative', 'detail-oriented', 'self-motivated', 'proactive',
    'time management', 'project management', 'stakeholder management',
    'viestintä', 'tiimityö', 'johtaminen', 'ongelmanratkaisu', 'analyyttinen',
  ];

  const requiredSkills: string[] = [];
  const preferredSkills: string[] = [];
  const experienceReqs: { skill: string; years: string }[] = [];

  // Find mentioned tech skills
  for (const kw of techKeywords) {
    if (text.includes(kw)) {
      // Check if in "required" or "preferred" context
      const isRequired = text.includes(`require`) || text.includes(`must have`) || 
                         text.includes(`essential`) || text.includes(`mandatory`) ||
                         text.includes(`edellytämme`) || text.includes(`vaaditaan`);
      if (isRequired) {
        requiredSkills.push(kw);
      } else {
        preferredSkills.push(kw);
      }
    }
  }

  // Find soft skills
  for (const ss of softSkills) {
    if (text.includes(ss)) {
      preferredSkills.push(ss);
    }
  }

  // If no required/preferred distinction, treat all as required
  if (requiredSkills.length === 0 && preferredSkills.length > 0) {
    requiredSkills.push(...preferredSkills.splice(0, Math.ceil(preferredSkills.length * 0.6)));
  }

  // Extract experience requirements (e.g., "3+ years of React")
  const expPatterns = [
    /(\d+)\+?\s*(?:years?|vuot|v\.)\s*(?:of\s+)?(?:experience\s+(?:with|in)\s+)?([a-zA-Z\s.#+]+)/gi,
    /(?:experience\s+(?:with|in)\s+)([a-zA-Z\s.#+]+)\s*(?:\(?\s*(\d+)\+?\s*(?:years?|v\.?)\s*\)?)/gi,
  ];

  for (const pattern of expPatterns) {
    let match;
    while ((match = pattern.exec(jobPosting)) !== null) {
      const years = match[1] || match[2];
      const skill = (match[2] || match[1]).trim().substring(0, MAX_KEYWORD_LENGTH);
      if (years && skill && skill.length > 1) {
        experienceReqs.push({ skill, years: `${years}+ years` });
      }
    }
  }

  // Detect languages
  const langs: string[] = [];
  if (/\b(english|englanti)\b/i.test(text)) langs.push('English');
  if (/\b(finnish|suomi|suomen)\b/i.test(text)) langs.push('Finnish');
  if (/\b(swedish|ruotsi)\b/i.test(text)) langs.push('Swedish');
  if (/\b(german|saksa)\b/i.test(text)) langs.push('German');

  // Extract job title (first line or after common headers)
  let jobTitle = lines[0]?.substring(0, 100) || 'Unknown Position';
  const titlePatterns = /(?:position|role|title|tehtävä|rooli):\s*(.+)/i;
  const titleMatch = jobPosting.match(titlePatterns);
  if (titleMatch) jobTitle = titleMatch[1].trim().substring(0, 100);

  return {
    requiredSkills: [...new Set(requiredSkills)],
    preferredSkills: [...new Set(preferredSkills)],
    experienceRequirements: experienceReqs,
    languages: langs,
    educationLevel: /\b(master|maisteri|diplomi)/i.test(text) ? 'masters' :
                    /\b(bachelor|kandidaatti|amk|ammattikorkeakoulu)/i.test(text) ? 'bachelors' : 'any',
    jobTitle,
  };
}

// ═══════════════════════════════════════
// LANGUAGE DETECTION (no AI needed)
// ═══════════════════════════════════════

function detectLanguage(text: string): string {
  const sample = text.substring(0, 500).toLowerCase();

  // Finnish indicators
  const fiWords = ['ja', 'on', 'ei', 'että', 'tai', 'mutta', 'ovat', 'kanssa', 'myös', 'vain', 'hän', 'tämä', 'ovat', 'sinun', 'minun', 'työ', 'kokemus'];
  const enWords = ['the', 'and', 'is', 'are', 'with', 'for', 'that', 'this', 'have', 'from', 'will', 'your', 'experience', 'work', 'team'];

  let fiScore = 0;
  let enScore = 0;

  for (const w of fiWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) fiScore++;
  }
  for (const w of enWords) {
    if (new RegExp(`\\b${w}\\b`).test(sample)) enScore++;
  }

  // Check for Finnish characters
  if (/[äöåÄÖÅ]/.test(sample)) fiScore += 3;

  if (fiScore > enScore) return 'fi';
  if (enScore > fiScore) return 'en';
  return 'unknown';
}

// ═══════════════════════════════════════
// KEYWORD MATCHING (exact + fuzzy)
// ═══════════════════════════════════════

function matchKeywords(
  requirements: ExtractedRequirements,
  userText: string
): KeywordMatch[] {
  const userLower = userText.toLowerCase();
  const matches: KeywordMatch[] = [];

  // Check required skills
  for (const skill of requirements.requiredSkills) {
    const found = userLower.includes(skill.toLowerCase());
    let context = 'missing';
    if (found) {
      // Extract surrounding context (50 chars)
      const idx = userLower.indexOf(skill.toLowerCase());
      const start = Math.max(0, idx - 25);
      const end = Math.min(userText.length, idx + skill.length + 25);
      context = '...' + userText.substring(start, end).trim() + '...';
    }
    matches.push({
      keyword: skill,
      found,
      context,
      importance: 'required',
      weight: 3,
    });
  }

  // Check preferred skills
  for (const skill of requirements.preferredSkills) {
    const found = userLower.includes(skill.toLowerCase());
    matches.push({
      keyword: skill,
      found,
      context: found ? 'found' : 'missing',
      importance: 'preferred',
      weight: 1,
    });
  }

  return matches;
}

// ═══════════════════════════════════════
// AI-ENHANCED ANALYSIS (optional, for deeper insights)
// ═══════════════════════════════════════

async function aiEnhancedAnalysis(
  jobRequirements: ExtractedRequirements,
  userText: string,
): Promise<{
  experienceGaps: ExperienceGap[];
  additionalKeywords: string[];
  summary: string;
} | null> {
  try {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.1,
      maxTokens: 1000,
    });

    // SECURITY: Send only keywords, not full text
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You analyze job requirement gaps. Return ONLY valid JSON.
No personal data analysis. Only skill/experience matching.
Response format:
{
  "experience_gaps": [
    { "skill": "React", "required": "5+ years", "user_has": "mentioned", "gap": "medium", "pass_pct": 60 }
  ],
  "additional_keywords": ["keyword1", "keyword2"],
  "summary": "Brief 1-sentence assessment"
}`],
      ["human", `Job requires: ${jobRequirements.requiredSkills.join(', ')}
Experience requirements: ${jobRequirements.experienceRequirements.map(e => `${e.skill}: ${e.years}`).join(', ') || 'none specified'}

User document mentions these skills: ${extractMentionedSkills(userText, jobRequirements).join(', ')}
User document word count: ${userText.split(/\s+/).length}

Analyze gaps. Return JSON only.`],
    ]);

    const result = await model.invoke(await prompt.formatMessages({}));
    const content = typeof result.content === 'string' ? result.content : '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      experienceGaps: (parsed.experience_gaps || []).map((g: any) => ({
        skill: String(g.skill || '').substring(0, MAX_KEYWORD_LENGTH),
        required: String(g.required || 'not specified').substring(0, 50),
        userHas: String(g.user_has || 'not mentioned').substring(0, 50),
        gapSeverity: ['none', 'low', 'medium', 'high', 'critical'].includes(g.gap) ? g.gap : 'medium',
        passLikelihood: Math.min(100, Math.max(0, Number(g.pass_pct) || 50)),
      })),
      additionalKeywords: (parsed.additional_keywords || [])
        .filter((k: any) => typeof k === 'string')
        .map((k: string) => k.substring(0, MAX_KEYWORD_LENGTH)),
      summary: String(parsed.summary || '').substring(0, 500),
    };
  } catch (error) {
    console.error('AI analysis failed (non-critical):', error);
    return null;
  }
}

/** Extract which required skills the user mentions (without sending full text to AI) */
function extractMentionedSkills(userText: string, reqs: ExtractedRequirements): string[] {
  const userLower = userText.toLowerCase();
  const mentioned: string[] = [];

  for (const skill of [...reqs.requiredSkills, ...reqs.preferredSkills]) {
    if (userLower.includes(skill.toLowerCase())) {
      mentioned.push(skill);
    }
  }

  return mentioned;
}

// ═══════════════════════════════════════
// JOB-ONLY ANALYSIS (no AI, no cost)
// ═══════════════════════════════════════

export function analyzeJobOnly(jobPosting: string): JobRequirementsResult {
  const cleanJob = sanitizeInput(jobPosting);
  const validation = validateInput(cleanJob);
  if (!validation.valid) {
    throw new Error(`Invalid job posting: ${validation.reason}`);
  }

  const reqs = extractRequirementsLocal(cleanJob);
  const lang = detectLanguage(cleanJob);
  const totalKeywords = reqs.requiredSkills.length + reqs.preferredSkills.length;

  // Estimate difficulty
  const difficulty: JobRequirementsResult['difficultyEstimate'] =
    totalKeywords >= 15 ? 'very_hard' :
    totalKeywords >= 10 ? 'hard' :
    totalKeywords >= 5  ? 'moderate' : 'easy';

  // Generate tips
  const tips: string[] = [];
  if (reqs.requiredSkills.length > 0) {
    tips.push(`This job requires ${reqs.requiredSkills.length} specific skills. Make sure to mention each one you have.`);
  }
  if (reqs.experienceRequirements.length > 0) {
    tips.push(`Experience requirements: ${reqs.experienceRequirements.map(e => `${e.skill} (${e.years})`).join(', ')}`);
  }
  if (reqs.languages.length > 0) {
    tips.push(`Language requirements: ${reqs.languages.join(', ')}. Write your application in the same language as the posting.`);
  }
  if (totalKeywords >= 10) {
    tips.push('This is a keyword-heavy posting. ATS will likely filter strictly — use exact terms from the ad.');
  }
  if (reqs.educationLevel !== 'any') {
    tips.push(`Education level: ${reqs.educationLevel === 'masters' ? "Master's degree" : "Bachelor's degree"} mentioned.`);
  }

  return {
    jobTitle: reqs.jobTitle,
    requiredSkills: reqs.requiredSkills,
    preferredSkills: reqs.preferredSkills,
    experienceRequirements: reqs.experienceRequirements,
    requiredLanguages: reqs.languages,
    educationLevel: reqs.educationLevel,
    detectedLanguage: lang,
    keywordCount: totalKeywords,
    difficultyEstimate: difficulty,
    tips,
  };
}

// ═══════════════════════════════════════
// MAIN SCORING FUNCTION
// ═══════════════════════════════════════

export async function checkATSScore(input: ATSCheckInput): Promise<ATSScoreResult> {
  // ═══ STEP 1: Validate & sanitize ═══
 // ═══ STEP 1: Validate & sanitize ═══
const cleanJob = sanitizeInput(input.jobPosting);

const jobValidation = validateInput(cleanJob);
if (!jobValidation.valid) {
  throw new Error(`Invalid job posting: ${jobValidation.reason}`);
}

// Käsittele userDocument vain jos se on annettu
const cleanDoc = input.userDocument ? sanitizeInput(input.userDocument) : '';

if (input.userDocument) {
  const docValidation = validateInput(cleanDoc);
  if (!docValidation.valid) {
    throw new Error(`Invalid document: ${docValidation.reason}`);
  }
}

  // ═══ STEP 2: Extract requirements (local, no AI) ═══
  const requirements = extractRequirementsLocal(cleanJob);

  // ═══ STEP 3: Keyword matching (local, no AI) ═══
  const keywordMatches = matchKeywords(requirements, cleanDoc);

  // ═══ STEP 4: Language detection (local) ═══
  const jobLang = detectLanguage(cleanJob);
  const docLang = detectLanguage(cleanDoc);
  const languageMatch = jobLang === docLang || jobLang === 'unknown' || docLang === 'unknown';

  // ═══ STEP 5: Calculate scores ═══

  // Keyword score
  const totalWeight = keywordMatches.reduce((sum, m) => sum + m.weight, 0);
  const matchedWeight = keywordMatches.filter(m => m.found).reduce((sum, m) => sum + m.weight, 0);
  const keywordScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 50;

  // Language score
  const languageScore = languageMatch ? 100 : 15;

  // Formatting score (basic heuristics)
  const formattingScore = calculateFormattingScore(cleanDoc);

  // ═══ STEP 6: AI-enhanced analysis (optional) ═══
  let experienceGaps: ExperienceGap[] = [];
  let aiSummary = '';
  let additionalKeywords: string[] = [];

  const aiResult = await aiEnhancedAnalysis(requirements, cleanDoc);
  if (aiResult) {
    experienceGaps = aiResult.experienceGaps;
    aiSummary = aiResult.summary;
    additionalKeywords = aiResult.additionalKeywords;
  }

  // Experience score (from gaps)
  const experienceScore = experienceGaps.length > 0
    ? Math.round(experienceGaps.reduce((sum, g) => sum + g.passLikelihood, 0) / experienceGaps.length)
    : keywordScore; // Default to keyword score if no gap analysis

  // ═══ STEP 7: Overall score ═══
  const overallScore = Math.round(
    keywordScore * 0.40 +
    experienceScore * 0.25 +
    languageScore * 0.20 +
    formattingScore * 0.15
  );

  // ═══ STEP 8: Generate recommendations ═══
  const recommendations = generateRecommendations(
    keywordMatches, experienceGaps, languageMatch, formattingScore, additionalKeywords
  );

  // ═══ STEP 9: Pass likelihood ═══
  const passLikelihood: ATSScoreResult['passLikelihood'] =
    overallScore >= 80 ? 'very_high' :
    overallScore >= 65 ? 'high' :
    overallScore >= 50 ? 'medium' :
    overallScore >= 35 ? 'low' : 'very_low';

  // ═══ STEP 10: Summary ═══
  const matchedCount = keywordMatches.filter(m => m.found).length;
  const totalCount = keywordMatches.length;
  const summary = aiSummary || 
    `Matched ${matchedCount}/${totalCount} keywords. ` +
    `${!languageMatch ? 'Language mismatch detected. ' : ''}` +
    `Overall ATS pass likelihood: ${passLikelihood.replace('_', ' ')}.`;

  return {
    overallScore,
    keywordScore,
    experienceScore,
    languageScore,
    formattingScore,
    keywordMatches,
    experienceGaps,
    detectedLanguage: {
      jobPosting: jobLang,
      userDocument: docLang,
      match: languageMatch,
    },
    recommendations,
    jobTitle: requirements.jobTitle,
    requiredSkillsCount: requirements.requiredSkills.length,
    matchedSkillsCount: matchedCount,
    passLikelihood,
    summary,
  };
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function calculateFormattingScore(text: string): number {
  let score = 70; // Base

  // Has structure (bullet points, sections)
  if (/[•\-\*]\s/.test(text)) score += 10;
  if (/\n\n/.test(text)) score += 5;

  // Not too short
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 50) score -= 20;
  if (wordCount > 200) score += 10;
  if (wordCount > 1000) score += 5;

  // Has numbers (quantified achievements)
  if (/\d+%/.test(text)) score += 5;
  if (/\d+/.test(text)) score += 5;

  return Math.min(100, Math.max(0, score));
}

function generateRecommendations(
  matches: KeywordMatch[],
  gaps: ExperienceGap[],
  languageMatch: boolean,
  formattingScore: number,
  additionalKeywords: string[],
): ATSScoreResult['recommendations'] {
  const critical: string[] = [];
  const important: string[] = [];
  const optional: string[] = [];

  // Language mismatch
  if (!languageMatch) {
    critical.push('Your document language does not match the job posting language. This will likely cause automatic rejection.');
  }

  // Missing required keywords
  const missingRequired = matches.filter(m => !m.found && m.importance === 'required');
  if (missingRequired.length > 0) {
    const keywords = missingRequired.map(m => m.keyword).slice(0, 5).join(', ');
    critical.push(`Missing critical keywords: ${keywords}. Add these if you have the experience.`);
  }

  // Experience gaps
  const criticalGaps = gaps.filter(g => g.gapSeverity === 'critical' || g.gapSeverity === 'high');
  if (criticalGaps.length > 0) {
    important.push(`Significant experience gaps in: ${criticalGaps.map(g => g.skill).join(', ')}. Consider addressing these honestly.`);
  }

  // Missing preferred keywords
  const missingPreferred = matches.filter(m => !m.found && m.importance === 'preferred');
  if (missingPreferred.length > 0) {
    const keywords = missingPreferred.map(m => m.keyword).slice(0, 5).join(', ');
    important.push(`Missing preferred skills: ${keywords}. Adding these would improve your score.`);
  }

  // Formatting
  if (formattingScore < 60) {
    important.push('Improve document formatting: use bullet points, clear sections, and quantified achievements.');
  }

  // Additional keywords from AI
  if (additionalKeywords.length > 0) {
    optional.push(`Consider mentioning: ${additionalKeywords.slice(0, 5).join(', ')}`);
  }

  return { critical, important, optional };
}