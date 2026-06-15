// lib/langchain/atsCoverLetterV2Generator.ts - V2 + SMART QUESTIONS + finnishStyle + appGuide + RAG

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { analyzeKeywordsUniversal } from "@/lib/ats/synonymMatcher";
import { supabaseAdmin } from "@/lib/supabase";

import {
  mergeResponsesIntoLetterContext,
  type AnswerEntry,
} from "@/lib/langchain/responseHelper";
import { buildAIContext } from "@/lib/knowledge";                 // ✅ RAG
import { FINNISH_STYLE_RULES } from "./finnishStyle";
import { GOOD_APPLICATION_GUIDE } from "./goodApplicationguide";  // ✅ kirjainkoko täsmää tiedostoon

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV2Input {
  jobDescription: string;

  name: string;
  email?: string;
  phone?: string;
  location?: string;
  additionalNotes?: string;

  workExperience?: string;
  education?: string;
  skills?: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  superpower?: string;
  energySources?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  personalNotes?: string;
  personalContext?: string;

  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;          // ✅ premium-portti reitissä
  guardianValidation?: boolean;
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV2Output {
  content: string;
  additionalNotes?: string;
  title: string;
  signature: string;
  keyHighlights: string[];
  atsScore: number;
  atsAnalysis: {
    keywordMatch: number;
    readability: number;
    overall: number;
    exactMatches: string[];
    synonymMatches: string[];
    missingCritical: string[];
  };
  languageWarning?: {
    jobLanguage: string;
    letterLanguage: string;
    needsTranslation: boolean;
  };
  guardianReport?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  iterations: number;
  questions?: any[];
  needsMoreInfo?: boolean;
  personalContext?: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function detectLanguageSimple(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/\b(olen|minä|että|joka|kun|mutta|työssä|hakija|kokemus)\b/)) return 'finnish';
  if (lower.match(/\b(jag|är|att|som|när|med|arbete)\b/)) return 'swedish';
  return 'english';
}

async function extractDeepKeywords(jobDescription: string): Promise<{
  critical: string[];
  important: string[];
  bonus: string[];
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Extract keywords from job posting.

Job Posting:
${jobDescription.substring(0, 6000)}

Return JSON:
{
  "critical": ["keyword1", "keyword2"],
  "important": ["keyword3"],
  "bonus": ["keyword5"]
}`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { critical: [], important: [], bonus: [] };
    const keywords = JSON.parse(jsonMatch[0]);
    return {
      critical: Array.isArray(keywords.critical) ? keywords.critical : [],
      important: Array.isArray(keywords.important) ? keywords.important : [],
      bonus: Array.isArray(keywords.bonus) ? keywords.bonus : [],
    };
  } catch (error) {
    console.error('❌ Keyword extraction failed:', error);
    return { critical: [], important: [], bonus: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// SAVED RESPONSES
// ═══════════════════════════════════════════════════════════════

function inferCategory(dbCategory: string, questionText: string): string {
  const cat = (dbCategory || '').toLowerCase();
  const q = (questionText || '').toLowerCase();

  if (cat.includes('experience') || cat.includes('work')) return 'experience';
  if (cat.includes('education')) return 'education';
  if (cat.includes('skill')) return 'skills';
  if (cat.includes('personality') || cat.includes('strength') || cat.includes('working_style')) return 'personality';
  if (cat.includes('achievement') || cat.includes('project')) return 'achievements';

  if (q.includes('työkokemus') || q.includes('work experience') || q.includes('projektit') || q.includes('projects') || q.includes('mitä olet tehnyt') || q.includes('what have you done') || q.includes('tehtävä') || q.includes('responsibilities')) return 'experience';
  if (q.includes('koulutus') || q.includes('education') || q.includes('tutkinto') || q.includes('degree') || q.includes('opiskelu') || q.includes('kurssi')) return 'education';
  if (q.includes('taido') || q.includes('osaamis') || q.includes('skill') || q.includes('teknolog') || q.includes('ohjelmoint') || q.includes('työkalu') || q.includes('listaa')) return 'skills';
  if (q.includes('vahvuu') || q.includes('strength') || q.includes('työskentelytyyli') || q.includes('working style') || q.includes('ongelmanratkaisu') || q.includes('problem solving')) return 'personality';
  if (q.includes('paras projekti') || q.includes('best project') || q.includes('saavutus') || q.includes('achievement')) return 'achievements';

  return 'other';
}

async function fetchSavedResponsesFromDB(userId: string): Promise<AnswerEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_responses')
      .select('id, question_text, answer, question_category')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) { console.error('❌ DB fetch saved responses failed:', error); return []; }
    if (!data || data.length === 0) { console.log('ℹ️ [V2-ATS] No saved responses in DB'); return []; }

    console.log(`📚 [V2-ATS] Fetched ${data.length} saved responses from DB`);

    return data.map(r => ({
      id: r.id,
      question: r.question_text,
      answer: r.answer,
      category: inferCategory(r.question_category, r.question_text),
    }));
  } catch (err) {
    console.error('❌ fetchSavedResponsesFromDB error:', err);
    return [];
  }
}

async function enrichInputWithSavedResponses(input: ATSV2Input): Promise<ATSV2Input> {
  if (!input.userId) {
    console.log('⚠️ [V2-ATS] No userId — skipping saved response fetch');
    return input;
  }

  const answerEntries = await fetchSavedResponsesFromDB(input.userId);
  if (answerEntries.length === 0) return input;

  const contextObj: Record<string, any> = {
    workExperience: input.workExperience || '',
    education: input.education || '',
    skills: input.skills || '',
    keyStrengths: input.uniqueStrength || '',
    relevantExperience: input.bestProjectExample || '',
    additionalContext: '',
  };

  const merged = mergeResponsesIntoLetterContext(contextObj, answerEntries);

  console.log('✅ [V2-ATS] Merged saved responses into input');

  return {
    ...input,
    workExperience: merged.workExperience || input.workExperience,
    education: merged.education || input.education,
    skills: merged.skills || input.skills,
    uniqueStrength: merged.keyStrengths || input.uniqueStrength,
    bestProjectExample: merged.relevantExperience || input.bestProjectExample,
  };
}

// ═══════════════════════════════════════════════════════════════
// TRUTH RULES
// ═══════════════════════════════════════════════════════════════

const TRUTH_RULES = `
# ════════════════════════════════════════════════════════════════
# ABSOLUTE TRUTH RULES — VIOLATION = FAILURE
# ════════════════════════════════════════════════════════════════

You write cover letters, not fiction. Present the applicant's ACTUAL background.

1. ONLY write facts from the input data.
2. NEVER invent:
   - Technologies, tools, or frameworks not listed
   - Numbers, percentages, or metrics (e.g. "improved X by 30%")
   - Job titles, company names, or durations not provided
   - Certifications or degrees not listed
   - Team sizes, budgets, or project scales
3. If applicant says "I built a CV generator" — say that.
   Do NOT add what language, how many users, or what impact — unless stated.
4. Missing info? Two options:
   a) OMIT the detail
   b) Use honest phrases: "Eager to learn...", "Interested in..."
      NEVER claim actual experience that doesn't exist
5. Shorter + honest > longer + fabricated.
6. You may rephrase WORDING. You may NOT add NEW FACTS.

❌ FORBIDDEN:
- "Built X using Python and React improving engagement by 30%" (invented)
- "Managed a team of 15" (invented team size)
- "Expert in React, TypeScript, Node.js, Docker" (added tools)
- Any metric the user did not provide

✅ ALLOWED:
- Rephrasing user's words more professionally
- "Eager to expand into cloud technologies" (honest interest)
- "Developing skills in X" (honest about learning)
`;

// ═══════════════════════════════════════════════════════════════
// EMPTY OUTPUT HELPER
// ═══════════════════════════════════════════════════════════════

function buildEmptyOutputWithQuestions(input: ATSV2Input, questions: any[]): ATSV2Output {
  return {
    content: "",
    title: "Lisätietoja tarvitaan",
    signature: input.name,
    keyHighlights: [],
    atsScore: 0,
    atsAnalysis: { keywordMatch: 0, readability: 0, overall: 0, exactMatches: [], synonymMatches: [], missingCritical: [] },
    iterations: 0,
    needsMoreInfo: true,
    questions,
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN V2 GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV2(
  input: ATSV2Input
): Promise<ATSV2Output> {

  console.log('🚀 [V2-ATS] Starting advanced generation...');

  // STEP 0: ENRICH WITH SAVED RESPONSES
  let enrichedInput: ATSV2Input;
  try {
    enrichedInput = await enrichInputWithSavedResponses(input);
  } catch (err) {
    console.error('⚠️ [V2-ATS] Saved response enrichment failed, continuing:', err);
    enrichedInput = { ...input };
  }

  // STEP 0.5: SMART QUESTIONS
  if (!enrichedInput.skipQuestions) {
    console.log('🧠 [V2-ATS] Checking if questions needed...');
    try {
      const analysis = await analyzeJobAndProfile({
        jobDescription: enrichedInput.jobDescription,
        userProfile: {
          workExperience: enrichedInput.workExperience || '',
          education: enrichedInput.education || '',
          skills: enrichedInput.skills || '',
          workingStyle: enrichedInput.workingStyle || '',
          problemSolving: enrichedInput.problemSolving || '',
          uniqueStrength: enrichedInput.uniqueStrength || '',
          careerGoals: enrichedInput.careerGoals || '',
          bestProjectExample: enrichedInput.bestProjectExample || '',
          failureLesson: enrichedInput.failureLesson || '',
          personalNotes: enrichedInput.personalNotes || '',
        },
        language: enrichedInput.language || 'finnish',
        userId: enrichedInput.userId,
      });

      const safeQuestions = Array.isArray(analysis?.questions) ? analysis.questions : [];
      const criticalQuestions = safeQuestions.filter(q => q && q.priority === 'critical');

      if (analysis?.shouldAskQuestions && criticalQuestions.length > 0) {
        console.log(`❓ [V2-ATS] Returning ${criticalQuestions.length} critical questions`);
        return buildEmptyOutputWithQuestions(enrichedInput, criticalQuestions);
      }
      console.log('✅ [V2-ATS] No critical questions needed, proceeding...');
    } catch (error) {
      console.error('⚠️ [V2-ATS] Question analysis failed, proceeding without questions:', error);
    }
  } else {
    console.log('⏭️ [V2-ATS] Questions skipped');
  }

  // STEP 1: LANGUAGE CHECK
  const jobLanguage = detectLanguageSimple(enrichedInput.jobDescription);
  const letterLanguage = (enrichedInput.language || 'finnish').toLowerCase();
  const languageWarning = { jobLanguage, letterLanguage, needsTranslation: jobLanguage !== letterLanguage };
  if (languageWarning.needsTranslation) {
    console.warn(`⚠️ [V2-ATS] Language mismatch: Job is ${jobLanguage}, letter is ${letterLanguage}`);
  }

  // STEP 2: EXTRACT KEYWORDS
  console.log('🔍 [V2-ATS] Extracting keywords...');
  const keywords = await extractDeepKeywords(enrichedInput.jobDescription);
  console.log(`✅ [V2-ATS] Found ${keywords.critical.length} critical keywords`);

  // STEP 3: GROUND TRUTH
  let groundTruth = null;
  if (enrichedInput.guardianValidation !== false) {
    console.log('🛡️ [V2-ATS] Extracting ground truth...');
    try {
      groundTruth = await extractGroundTruthAI(
        {
          work_experience: enrichedInput.workExperience,
          education: enrichedInput.education,
          skills: enrichedInput.skills,
          working_style: enrichedInput.workingStyle,
          problem_solving: enrichedInput.problemSolving,
          unique_strength: enrichedInput.uniqueStrength,
          team_role: enrichedInput.teamRole,
          superpower: enrichedInput.superpower,
          career_goals: enrichedInput.careerGoals,
          best_project_example: enrichedInput.bestProjectExample,
        },
        enrichedInput.userId
      );
      console.log('✅ [V2-ATS] Ground truth extracted');
    } catch (error) {
      console.error('⚠️ [V2-ATS] Ground truth extraction failed:', error);
    }
  }

  // STEP 4: ITERATIVE GENERATION
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : letterLanguage;
  const finnishStyle = isFinnish ? FINNISH_STYLE_RULES : '';
  const appGuide = isFinnish ? GOOD_APPLICATION_GUIDE : '';

  // ✅ RAG
  let knowledgeContext = '';
  if (enrichedInput.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: enrichedInput.jobDescription,
        userProfile: { skills: enrichedInput.skills, workExperience: enrichedInput.workExperience, education: enrichedInput.education },
        enableRAG: true,
        contentType: 'cover_letter',
        language: enrichedInput.language || 'finnish',
      });
    } catch { knowledgeContext = ''; }
  }
console.log('🔍 V2 RAG enableRAG:', enrichedInput.enableRAG,
            '| ctx pituus:', knowledgeContext?.length || 0,
            '| alku:', (knowledgeContext || '').slice(0, 150));
  let iteration = 0;
  let bestContent = "";
  let bestScore = 0;
  let bestAnalysis: any = null;

  const targetScore = 65;
  const maxIterations = 2;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`🔄 [V2-ATS] Iteration ${iteration}/${maxIterations}...`);

    let missingKeywordsPrompt = "";
    if (iteration > 1 && bestAnalysis) {
      const missing = bestAnalysis.missingCritical || [];
      if (missing.length > 0) {
        missingKeywordsPrompt = `\n\n**MISSING KEYWORDS FROM PREVIOUS ITERATION:**\n${missing.join(', ')}\n\nIntegrate these naturally — but ONLY if the applicant has relevant experience. If not, mention interest honestly.`;
      }
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ATS-optimized cover letter writer (V2).

{knowledgeContext}

{finnishStyle}

{appGuide}

# ════════════════════════════════════════════════════════════════
# PRIVACY: NO PERSONAL INFO IN OUTPUT
# ════════════════════════════════════════════════════════════════

❌ DO NOT INCLUDE in the letter body:
- Full name (template handles it)
- Email, phone, address

✅ FOCUS ON:
- Skills and experience (anonymized)
- Personality traits
- Career goals and motivation

${TRUTH_RULES}

# ════════════════════════════════════════════════════════════════
# KEYWORD INTEGRATION (V2 ADVANCED)
# ════════════════════════════════════════════════════════════════

**KEYWORDS:**
CRITICAL: {critical_keywords}
IMPORTANT: {important_keywords}
BONUS: {bonus_keywords}

**INTEGRATION RULES:**
1. HAS EXPERIENCE with keyword → Use naturally in context
2. NO EXPERIENCE with keyword → Mention honestly + express interest
   Example: "While I haven't worked with Python professionally, my C# background
   provides a strong foundation, and I'm eager to expand into Python."
3. NEVER claim experience with a keyword the applicant didn't mention

# ════════════════════════════════════════════════════════════════
# 💬 USER'S SPECIAL INSTRUCTIONS
# ════════════════════════════════════════════════════════════════

**USER SAYS:**
{additionalNotes}

Follow these carefully — the user knows their situation best.

# ════════════════════════════════════════════════════════════════
# STRUCTURE (350-450 words)
# ════════════════════════════════════════════════════════════════

**NO HEADER** (template handles it)

PARAGRAPH 1: Hook — why THIS role excites them
PARAGRAPH 2: Technical skills + keyword integration (ONLY from input)
PARAGRAPH 3: Soft skills + personal context + motivation
PARAGRAPH 4: Forward-looking closing

**NO SIGNATURE** (template handles it)

Write in {languageName}.${missingKeywordsPrompt}`],

      ['human', `Write ATS-optimized cover letter (V2 - Iteration ${iteration}).

**JOB POSTING:**
{jobDescription}

**KEYWORDS TO INTEGRATE:**
Critical: {critical_keywords}
Important: {important_keywords}

**APPLICANT PROFILE (ANONYMIZED — no personal info):**
Experience: {yearsOfExperience} years
Level: {careerLevel}
Work History: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY & STYLE:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Career Goals: {careerGoals}

**PERSONAL CONTEXT:**
{personalContext}

Generate the letter body NOW in {languageName}.
REMINDER: Every claim must come from the data above. Do NOT invent facts, metrics, or technologies.`]
    ]);

    try {
      const formatted = await prompt.formatMessages({
        knowledgeContext: knowledgeContext || '',
        finnishStyle,
        appGuide,
        languageName,
        critical_keywords: keywords.critical.join(', ') || 'None',
        important_keywords: keywords.important.join(', ') || 'None',
        bonus_keywords: keywords.bonus.join(', ') || 'None',
        jobDescription: enrichedInput.jobDescription,
        yearsOfExperience: enrichedInput.yearsOfExperience || 0,
        additionalNotes: enrichedInput.additionalNotes || enrichedInput.personalContext || 'None',
        careerLevel: enrichedInput.careerLevel || 'mid',
        workExperience: enrichedInput.workExperience || 'Not specified',
        education: enrichedInput.education || 'Not specified',
        skills: enrichedInput.skills || 'Not specified',
        workingStyle: enrichedInput.workingStyle || 'Not specified',
        problemSolving: enrichedInput.problemSolving || 'Not specified',
        uniqueStrength: enrichedInput.uniqueStrength || 'Not specified',
        careerGoals: enrichedInput.careerGoals || '',
        personalContext: enrichedInput.personalContext || 'Not provided',
      });

      const result = await model.invoke(formatted);

      let content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
      content = content.replace(/\[.*?\]/g, '').replace(/\n\s*\n\s*\n/g, '\n\n').trim();

      if (input.name) {
        const namePattern = new RegExp(`\\b${input.name}\\b`, 'gi');
        const nameCount = (content.match(namePattern) || []).length;
        if (nameCount > 0) {
          console.warn(`⚠️ [V2-ATS] AI leaked name ${nameCount} times - removing`);
          content = content.replace(namePattern, '').trim();
        }
      }

      const allKeywords = [...keywords.critical, ...keywords.important, ...keywords.bonus];
      const analysis = await analyzeKeywordsUniversal(allKeywords, content, letterLanguage);

      const criticalMatched = keywords.critical.filter(k => content.toLowerCase().includes(k.toLowerCase())).length;
      const criticalTotal = keywords.critical.length || 1;
      const importantMatched = keywords.important.filter(k => content.toLowerCase().includes(k.toLowerCase())).length;
      const importantTotal = keywords.important.length || 1;
      const bonusMatched = keywords.bonus.filter(k => content.toLowerCase().includes(k.toLowerCase())).length;

      const criticalScore = (criticalMatched / criticalTotal) * 60;
      const importantScore = (importantMatched / importantTotal) * 30;
      const bonusScore = Math.min(bonusMatched * 2, 10);
      const atsScore = Math.round(criticalScore + importantScore + bonusScore);

      console.log(`📊 [V2-ATS] Iteration ${iteration} Score: ${atsScore}%`);

      const missingCritical = keywords.critical.filter(k => !content.toLowerCase().includes(k.toLowerCase()));
      const currentAnalysis = {
        keywordMatch: atsScore, readability: 85, overall: atsScore,
        exactMatches: analysis.exactMatches?.map((m: any) => m.keyword) || [],
        synonymMatches: analysis.synonymMatches?.map((m: any) => m.keyword) || [],
        missingCritical,
      };

      if (atsScore > bestScore) {
        bestScore = atsScore;
        bestContent = content;
        bestAnalysis = currentAnalysis;
      }

      if (atsScore >= targetScore) {
        console.log(`✅ [V2-ATS] Target reached! (${atsScore}%)`);
        break;
      }
    } catch (error) {
      console.error(`❌ [V2-ATS] Iteration ${iteration} failed:`, error);
    }
  }

  console.log(`✅ [V2-ATS] Best score: ${bestScore}% after ${iteration} iterations`);

  // STEP 5: GUARDIAN VALIDATION
  let guardianReport = null;
  if (enrichedInput.guardianValidation !== false && groundTruth) {
    console.log('🛡️ [V2-ATS] Running Guardian...');
    try {
      guardianReport = await masterGuardianValidatorV2(bestContent, groundTruth, 'generation');
      console.log(`🛡️ [V2-ATS] Guardian: ${guardianReport.approved ? 'APPROVED' : 'ISSUES'}`);
    } catch (error) {
      console.error('⚠️ [V2-ATS] Guardian failed:', error);
    }
  }

  return {
    content: bestContent,
    title: `Application - ${enrichedInput.jobDescription.substring(0, 50)}...`,
    signature: enrichedInput.name,
    keyHighlights: [...keywords.critical.slice(0, 5)],
    atsScore: bestScore,
    atsAnalysis: bestAnalysis || {
      keywordMatch: 0, readability: 0, overall: 0,
      exactMatches: [], synonymMatches: [], missingCritical: keywords.critical,
    },
    languageWarning,
    guardianReport: guardianReport || undefined,
    iterations: iteration,
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';