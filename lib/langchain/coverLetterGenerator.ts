// lib/langchain/coverLetterGenerator.ts - V1 REWRITTEN: NO ATS, V2-QUALITY + finnishStyle + appGuide + RAG

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { buildAIContext } from "@/lib/knowledge";                 // ✅ RAG
import { FINNISH_STYLE_RULES } from "./finnishStyle";
import { GOOD_APPLICATION_GUIDE } from "./goodApplicationguide";  // ✅ kirjainkoko täsmää tiedostoon

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV1Input {
  jobDescription: string;

  // 🔒 PRIVACY: Personal info (NOT sent to AI)
  name: string;
  email?: string;
  phone?: string;
  location?: string;

  // ✅ ANONYMIZED DATA
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

  // ✅ Lisätiedot
  additionalNotes?: string;

  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;          // ✅ premium-portti reitissä
  guardianValidation?: boolean;
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV1Output {
  content: string;
  title: string;
  signature: string;
  keyHighlights: string[];
  extractedKeywords?: string[];
  guardianReport?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  questions?: any[];
  needsMoreInfo?: boolean;
  qualityScore?: number;
  iterations?: number;
}

// ═══════════════════════════════════════════════════════════════
// HELPER: JOB CONTEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractJobContext(jobDescription: string): Promise<{
  keyThemes: string[];
  requiredQualities: string[];
  companySignals: string[];
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Analyze this job posting and extract what truly matters to the employer.

Job Posting:
${jobDescription.substring(0, 6000)}

Return JSON:
{
  "keyThemes": ["what this role is fundamentally about, 3-5 themes"],
  "requiredQualities": ["what kind of person they want, 4-6 qualities"],
  "companySignals": ["culture/values clues from the posting, 2-4 signals"]
}

Focus on the spirit of the role, not just keywords.`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { keyThemes: [], requiredQualities: [], companySignals: [] };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      keyThemes: Array.isArray(parsed.keyThemes) ? parsed.keyThemes : [],
      requiredQualities: Array.isArray(parsed.requiredQualities) ? parsed.requiredQualities : [],
      companySignals: Array.isArray(parsed.companySignals) ? parsed.companySignals : [],
    };
  } catch (error) {
    console.error('❌ Job context extraction failed:', error);
    return { keyThemes: [], requiredQualities: [], companySignals: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// QUALITY EVALUATOR
// ═══════════════════════════════════════════════════════════════

async function evaluateLetterQuality(
  content: string,
  jobContext: { keyThemes: string[]; requiredQualities: string[]; companySignals: string[] },
  language: string
): Promise<{
  score: number;
  weaknesses: string[];
  isGoodEnough: boolean;
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Evaluate this cover letter for QUALITY (not ATS keyword matching).

Cover Letter:
${content}

Job Context:
- Key Themes: ${jobContext.keyThemes.join(', ')}
- Required Qualities: ${jobContext.requiredQualities.join(', ')}
- Company Signals: ${jobContext.companySignals.join(', ')}

Evaluate on:
1. Does it feel personal and genuine? (not generic)
2. Does it tell stories/examples, not just list traits?
3. Does it connect the applicant's background to the role's themes?
4. Does it show personality and motivation clearly?
5. Is it specific rather than vague?

Return JSON:
{
  "score": 0-100,
  "weaknesses": ["specific things that could be better, max 3"],
  "isGoodEnough": true/false (true if score >= 75)
}`;

  try {
    const result = await model.invoke(prompt);
    const content2 = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    const jsonMatch = content2.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return { score: 70, weaknesses: [], isGoodEnough: true };
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: typeof parsed.score === 'number' ? parsed.score : 70,
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      isGoodEnough: Boolean(parsed.isGoodEnough),
    };
  } catch (error) {
    console.error('❌ Quality evaluation failed:', error);
    return { score: 70, weaknesses: [], isGoodEnough: true };
  }
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

❌ FORBIDDEN PHRASES:
- "I have strong communication skills"
- "I am a motivated professional"
- "I am ready for any challenge"
- "I work well in teams" / "I am a team player"
- "I have X years of experience in..."
- Any invented metric or achievement

✅ USE INSTEAD:
- "At [Company], I noticed that..."
- "Working on [Project] taught me..."
- "I'm drawn to this role because..."
- "What excites me about this field is..."
`;

// ═══════════════════════════════════════════════════════════════
// MAIN V1 GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV1(
  input: ATSV1Input
): Promise<ATSV1Output> {

  console.log('🚀 [V1] Starting quality-focused generation...');
  console.log('🔒 [V1] Privacy: Personal info NOT sent to AI');
  console.log('💬 [V1] Additional notes:', input.additionalNotes ? 'YES' : 'NO');

  // ━━━ STEP 1: SMART QUESTIONS ━━━
  if (!input.skipQuestions) {
    console.log('🧠 [V1] Checking if questions needed...');
    try {
      const analysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          workExperience: input.workExperience || '',
          education: input.education || '',
          skills: input.skills || '',
          workingStyle: input.workingStyle || '',
          problemSolving: input.problemSolving || '',
          uniqueStrength: input.uniqueStrength || '',
          careerGoals: input.careerGoals || '',
          bestProjectExample: input.bestProjectExample || '',
          failureLesson: input.failureLesson || '',
          personalNotes: input.personalNotes || '',
        },
        language: input.language || 'finnish',
        userId: input.userId,
      });

      const safeQuestions = Array.isArray(analysis?.questions) ? analysis.questions : [];
      const criticalQuestions = safeQuestions.filter(q => q && q.priority === 'critical');

      if (analysis?.shouldAskQuestions && criticalQuestions.length > 0) {
        console.log(`❓ [V1] Returning ${criticalQuestions.length} critical questions`);
        return {
          content: '',
          title: 'Lisätietoja tarvitaan',
          signature: input.name,
          keyHighlights: [],
          needsMoreInfo: true,
          questions: criticalQuestions,
        };
      }
      console.log('✅ [V1] No critical questions needed');
    } catch (error) {
      console.error('⚠️ [V1] Question analysis failed, proceeding:', error);
    }
  } else {
    console.log('⏭️ [V1] Questions skipped');
  }

  // ━━━ STEP 2: EXTRACT JOB CONTEXT ━━━
  console.log('🔍 [V1] Extracting job context...');
  const jobContext = await extractJobContext(input.jobDescription);

  // ━━━ STEP 3: GROUND TRUTH ━━━
  let groundTruth = null;
  if (input.guardianValidation !== false) {
    console.log('🛡️ [V1] Extracting ground truth...');
    try {
      groundTruth = await extractGroundTruthAI(
        {
          work_experience: input.workExperience,
          education: input.education,
          skills: input.skills,
          working_style: input.workingStyle,
          problem_solving: input.problemSolving,
          unique_strength: input.uniqueStrength,
          team_role: input.teamRole,
          superpower: input.superpower,
          career_goals: input.careerGoals,
          best_project_example: input.bestProjectExample,
        },
        input.userId
      );
      console.log('✅ [V1] Ground truth extracted');
    } catch (error) {
      console.error('⚠️ [V1] Ground truth failed:', error);
    }
  }

  // ━━━ STEP 3.5: ✅ FINNISH STYLE + APP GUIDE + RAG ━━━
  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : 'englanti';
  const finnishStyle = isFinnish ? FINNISH_STYLE_RULES : '';
  const appGuide = isFinnish ? GOOD_APPLICATION_GUIDE : '';

  let knowledgeContext = '';
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: input.jobDescription,
        userProfile: { skills: input.skills, workExperience: input.workExperience, education: input.education },
        enableRAG: true,
        contentType: 'cover_letter',
        language: input.language || 'finnish',
      });
    } catch { knowledgeContext = ''; }
  }

  // ━━━ STEP 4: ITERATIVE QUALITY GENERATION ━━━
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.6,
  });

  let iteration = 0;
  let bestContent = '';
  let bestScore = 0;
  const maxIterations = 3;

  let additionalInstructionsText = 'None';
  if (input.additionalNotes && input.additionalNotes.trim()) {
    additionalInstructionsText = `"${input.additionalNotes}"\n\nFollow these carefully — user knows their situation best.`;
  }

  while (iteration < maxIterations) {
    iteration++;
    console.log(`🔄 [V1] Quality iteration ${iteration}/${maxIterations}...`);

    let improvementGuidance = '';
    if (iteration > 1) {
      improvementGuidance = `
**THIS IS REVISION ${iteration} — FIX THESE WEAKNESSES:**
The previous version was not good enough. Address these specific issues:
${bestScore > 0 ? `Previous quality score: ${bestScore}/100` : ''}

Make the letter MORE:
- Personal and specific (use concrete examples, not vague traits)
- Story-driven (show don't tell)
- Connected to the role's actual themes: ${jobContext.keyThemes.join(', ')}
- Emotionally resonant (show genuine motivation)

Keep all truthful content, improve the delivery.`;
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You write cover letters that feel HUMAN and GENUINE.

{knowledgeContext}

{finnishStyle}

{appGuide}

# ════════════════════════════════════════════════════════════════
# MISSION: CHARACTER-DRIVEN, NOT CREDENTIAL-DRIVEN
# ════════════════════════════════════════════════════════════════

This letter must reveal WHO this person is, not just WHAT they've done.

CV handles: jobs, degrees, skills list
This letter handles: WHY they do what they do, HOW they think, WHAT drives them

${TRUTH_RULES}

# ════════════════════════════════════════════════════════════════
# JOB CONTEXT — WHAT THIS EMPLOYER ACTUALLY WANTS
# ════════════════════════════════════════════════════════════════

Key themes of this role: {keyThemes}
They're looking for someone who: {requiredQualities}
Company culture signals: {companySignals}

Use this to CONNECT the applicant's personality to the role.
Don't just list matching skills — show WHY this person fits this culture.

# ════════════════════════════════════════════════════════════════
# STRUCTURE (300-400 words, 4 paragraphs)
# ════════════════════════════════════════════════════════════════

**Paragraph 1 — HOOK (why THIS role):**
Start with something specific about why this role/company interests them.
NOT: "I am applying for the position of..."
YES: "What drew me to this role is..." / "I've been following [company area] because..."

**Paragraph 2 — APPROACH & EXAMPLES:**
How do they work? Tell a micro-story from their experience.
Use real examples from their background (only what's provided).
Connect their approach to the role's key themes.

**Paragraph 3 — MOTIVATION & VALUES:**
What drives them? What makes them proud? What frustrates them?
Show genuine emotion and values — not corporate buzzwords.
Connect to company culture signals.

**Paragraph 4 — FORWARD CLOSE:**
Where are they headed? Why does this role fit that direction?
End with genuine forward momentum.

# ════════════════════════════════════════════════════════════════
# PRIVACY — NO PERSONAL DETAILS IN BODY
# ════════════════════════════════════════════════════════════════

❌ NO name, email, phone, address in the letter body
✅ Template handles all personal info separately

# ════════════════════════════════════════════════════════════════
# 💬 USER'S SPECIAL INSTRUCTIONS
# ════════════════════════════════════════════════════════════════

{additionalInstructions}

Language: {languageName}
Style: {style}

{improvementGuidance}`],

      ['human', `Write a character-driven cover letter based ONLY on this data.

**JOB:**
{jobDescription}

**WHAT THIS EMPLOYER WANTS:**
Themes: {keyThemes}
Qualities: {requiredQualities}
Culture: {companySignals}

**APPLICANT (ANONYMOUS):**
Career Level: {careerLevel}
Years Experience: {yearsOfExperience}

Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY (USE THIS HEAVILY):**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Energy Sources: {energySources}
Team Role: {teamRole}

**STORIES & MOTIVATION:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}
Failure Lesson: {failureLesson}

**FOLLOW-UP ANSWERS:**
{followUpAnswers}

**USER'S SPECIAL INSTRUCTIONS:**
{additionalInstructions}

**ABSOLUTE RULES:**
1. Every fact from data above only — no inventions
2. NO name/email/phone in body text
3. Tell stories, not lists
4. Connect personality to the role's themes
5. 300-400 words, 4 paragraphs
6. Write in {languageName}
7. End with forward momentum (no sign-off)`]
    ]);

    try {
      const formatted = await prompt.formatMessages({
        knowledgeContext: knowledgeContext || '',
        finnishStyle,
        appGuide,
        languageName,
        style: input.style || 'professional',
        keyThemes: jobContext.keyThemes.join(', ') || 'Professional excellence',
        requiredQualities: jobContext.requiredQualities.join(', ') || 'Motivated and capable',
        companySignals: jobContext.companySignals.join(', ') || 'Professional environment',
        jobDescription: input.jobDescription,
        additionalInstructions: additionalInstructionsText,
        improvementGuidance,
        careerLevel: input.careerLevel || 'mid',
        yearsOfExperience: input.yearsOfExperience || 0,
        workExperience: input.workExperience || 'Building experience',
        education: input.education || 'Continuous learner',
        skills: input.skills || 'Developing skills',
        workingStyle: input.workingStyle || 'Adaptable',
        problemSolving: input.problemSolving || 'Resourceful',
        uniqueStrength: input.uniqueStrength || 'Committed',
        superpower: input.superpower || 'Motivated',
        energySources: input.energySources || 'Challenges',
        teamRole: input.teamRole || 'Collaborative',
        careerGoals: input.careerGoals || 'Professional growth',
        bestProjectExample: input.bestProjectExample || '',
        failureLesson: input.failureLesson || '',
        followUpAnswers: input.followUpAnswers
          ? Object.entries(input.followUpAnswers).map(([q, a]) => `${q}: ${a}`).join('\n')
          : 'None',
      });

      const result = await model.invoke(formatted);

      let content = typeof result.content === 'string'
        ? result.content
        : JSON.stringify(result.content);

      content = content
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .replace(/Ystävällisin terveisin,?\s*/gi, '')
        .replace(/Best regards,?\s*/gi, '')
        .replace(/Sincerely,?\s*/gi, '')
        .trim();

      const namePattern = new RegExp(`\\b${input.name}\\b`, 'gi');
      const nameCount = (content.match(namePattern) || []).length;
      if (nameCount > 0) {
        console.warn(`⚠️ [V1] AI leaked name ${nameCount} times - removing`);
        content = content.replace(namePattern, '').trim();
      }

      if (input.email) {
        const emailPattern = new RegExp(input.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        content = content.replace(emailPattern, '').trim();
      }

      const quality = await evaluateLetterQuality(content, jobContext, input.language || 'finnish');
      console.log(`📊 [V1] Iteration ${iteration} quality: ${quality.score}/100 (good enough: ${quality.isGoodEnough})`);

      if (quality.score > bestScore) {
        bestScore = quality.score;
        bestContent = content;
      }

      if (quality.isGoodEnough) {
        console.log(`✅ [V1] Quality target reached (${quality.score}/100)`);
        break;
      } else {
        console.log(`⚠️ [V1] Weaknesses: ${quality.weaknesses.join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ [V1] Iteration ${iteration} failed:`, error);
      if (bestContent) break;
    }
  }

  console.log(`✅ [V1] Final quality score: ${bestScore}/100 after ${iteration} iterations`);

  // ━━━ STEP 5: GUARDIAN VALIDATION ━━━
  let guardianReport = null;
  if (input.guardianValidation !== false && groundTruth) {
    console.log('🛡️ [V1] Running Guardian...');
    try {
      guardianReport = await masterGuardianValidatorV2(bestContent, groundTruth, 'generation');
      console.log(`🛡️ [V1] Guardian: ${guardianReport.approved ? 'APPROVED ✅' : 'ISSUES ⚠️'}`);
    } catch (error) {
      console.error('⚠️ [V1] Guardian failed:', error);
    }
  }

  return {
    content: bestContent,
    title: `Application - ${input.jobDescription.substring(0, 50)}...`,
    signature: input.name,
    keyHighlights: [
      ...jobContext.keyThemes.slice(0, 3),
      ...jobContext.requiredQualities.slice(0, 2),
    ].slice(0, 5),
    guardianReport: guardianReport || undefined,
    qualityScore: bestScore,
    iterations: iteration,
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';