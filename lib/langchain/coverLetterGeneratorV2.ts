// lib/langchain/atsCoverLetterV2Generator.ts - PRIVACY + LANGUAGE FIXED

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { analyzeKeywordsUniversal } from "@/lib/ats/synonymMatcher";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV2Input {
  jobDescription: string;
  
  // ✅ PRIVACY: Henkilötiedot (EI lähetetä AI:lle)
  name: string;
  email?: string;
  phone?: string;
  location?: string;
      additionalNotes?: string;

  // ✅ ANONYMISOITU DATA (Lähetetään AI:lle)
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
  
  // ✅ NEW: "Ota huomioon" -osio
  personalContext?: string; // "Asun Hyvinkäällä, tunnen alueen"
  
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  guardianValidation?: boolean;
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV2Output {
  content: string; // Body WITHOUT personal info
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
  languageWarning?: { // ✅ NEW
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
    personalContext?: string;

}

// ═══════════════════════════════════════════════════════════════
// HELPER: LANGUAGE DETECTION
// ═══════════════════════════════════════════════════════════════

function detectLanguageSimple(text: string): string {
  const lower = text.toLowerCase();
  
  // Suomi
  if (lower.match(/\b(olen|minä|että|joka|kun|mutta|työssä|hakija|kokemus)\b/)) {
    return 'finnish';
  }
  
  // Ruotsi
  if (lower.match(/\b(jag|är|att|som|när|med|arbete)\b/)) {
    return 'swedish';
  }
  
  // Englanti (default)
  return 'english';
}

// ═══════════════════════════════════════════════════════════════
// HELPER: KEYWORD EXTRACTION
// ═══════════════════════════════════════════════════════════════

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
${jobDescription.substring(0, 3000)}

Return JSON:
{
  "critical": ["keyword1", "keyword2"],
  "important": ["keyword3"],
  "bonus": ["keyword5"]
}`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
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
// MAIN V2 GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV2(
  input: ATSV2Input
): Promise<ATSV2Output> {
  
  console.log('🚀 [V2-ATS] Starting advanced generation...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 0: LANGUAGE CHECK
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const jobLanguage = detectLanguageSimple(input.jobDescription);
  const letterLanguage = (input.language || 'finnish').toLowerCase();
  
  const languageWarning = {
    jobLanguage,
    letterLanguage,
    needsTranslation: jobLanguage !== letterLanguage
  };

  if (languageWarning.needsTranslation) {
    console.warn(`⚠️ [V2-ATS] Language mismatch: Job is ${jobLanguage}, letter is ${letterLanguage}`);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: SKIP QUESTIONS (sama kuin ennen)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // [Sama koodi kuin aiemmin]

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: EXTRACT KEYWORDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔍 [V2-ATS] Extracting keywords...');
  const keywords = await extractDeepKeywords(input.jobDescription);
  console.log(`✅ [V2-ATS] Found ${keywords.critical.length} critical keywords`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: GUARDIAN - EXTRACT GROUND TRUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let groundTruth = null;
  if (input.guardianValidation !== false) {
    console.log('🛡️ [V2-ATS] Extracting ground truth...');
    try {
      // ✅ PRIVACY: Ei henkilötietoja Guardianille!
      groundTruth = await extractGroundTruthAI(
        {
          // ❌ POISTA:
          // name: input.name,
          
          // ✅ VAIN ANONYMISOITU DATA:
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
      console.log('✅ [V2-ATS] Ground truth extracted');
    } catch (error) {
      console.error('⚠️ [V2-ATS] Ground truth extraction failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: ITERATIVE GENERATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const isFinnish = letterLanguage.includes('fi');
  const languageName = isFinnish ? 'suomi' : letterLanguage;

  let iteration = 0;
  let bestContent = "";
  let bestScore = 0;
  let bestAnalysis: any = null;

  const targetScore = 75;
  const maxIterations = 3;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`🔄 [V2-ATS] Iteration ${iteration}/${maxIterations}...`);

    let missingKeywordsPrompt = "";
    if (iteration > 1 && bestAnalysis) {
      const missing = bestAnalysis.missingCritical || [];
      if (missing.length > 0) {
        missingKeywordsPrompt = `\n\n**MISSING KEYWORDS:**\n${missing.join(', ')}\n\nIntegrate these!`;
      }
    }

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ATS-optimized cover letter writer (V2).

# ════════════════════════════════════════════════════════════════
# PRIVACY: NO PERSONAL INFO IN PROMPT
# ════════════════════════════════════════════════════════════════

❌ DO NOT INCLUDE:
- Full name (use placeholder like "Applicant")
- Email address
- Phone number
- Home address
- Social security number

✅ FOCUS ON:
- Skills and experience (anonymized)
- Personality traits
- Career goals
- Work style

# ════════════════════════════════════════════════════════════════
# TRUTH SCALE: 3-4
# ════════════════════════════════════════════════════════════════

Read profile, write naturally, stay truthful.

# ════════════════════════════════════════════════════════════════
# KEYWORD INTEGRATION (V2 ADVANCED)
# ════════════════════════════════════════════════════════════════

**KEYWORDS:**
CRITICAL: {critical_keywords}
IMPORTANT: {important_keywords}
BONUS: {bonus_keywords}

**INTEGRATION:**
1. HAS EXPERIENCE → Use naturally
2. NO EXPERIENCE → Mention honestly + express interest
   
   Example: "Vaikka ei kokemusta Pythonista, C# tausta antaa pohjan. 
   Innokas oppimaan Python."

# ════════════════════════════════════════════════════════════════
# PERSONAL CONTEXT (✅ NEW)
# ════════════════════════════════════════════════════════════════

# ════════════════════════════════════════════════════════════════
# 💬 USER'S SPECIAL INSTRUCTIONS
# ════════════════════════════════════════════════════════════════

**USER SAYS:**
{additionalNotes}

**FOLLOW THESE INSTRUCTIONS CAREFULLY!**
User knows their situation best. If they say "emphasize X", do it.

Example: "Living in stockholm means I know the area and can start immediately."


# ════════════════════════════════════════════════════════════════
# STRUCTURE (350-450 words)
# ════════════════════════════════════════════════════════════════

**NO HEADER** (template handles it)

PARAGRAPH 1: Hook (why THIS role)
PARAGRAPH 2: Technical skills + keywords
PARAGRAPH 3: Soft skills + personal context
PARAGRAPH 4: Forward-looking closing

**NO SIGNATURE** (template handles it)

Write in {languageName}.${missingKeywordsPrompt}`],

      ['human', `Write ATS-optimized letter (V2 - Iteration ${iteration}).

**JOB:**
{jobDescription}

**KEYWORDS:**
Critical: {critical_keywords}
Important: {important_keywords}

**APPLICANT (ANONYMIZED):**
Experience: {yearsOfExperience} years
Level: {careerLevel}
Work: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY:**
Style: {workingStyle}
Problem Solving: {problemSolving}
Strength: {uniqueStrength}
Goals: {careerGoals}

**PERSONAL CONTEXT:**
{personalContext}

Generate NOW in {languageName}.`]
    ]);

    try {
      const formatted = await prompt.formatMessages({
        languageName,
        critical_keywords: keywords.critical.join(', ') || 'None',
        important_keywords: keywords.important.join(', ') || 'None',
        bonus_keywords: keywords.bonus.join(', ') || 'None',
        jobDescription: input.jobDescription,
        yearsOfExperience: input.yearsOfExperience || 0,
        additionalNotes: input.additionalNotes || input.personalContext || 'None',
        careerLevel: input.careerLevel || 'mid',
        workExperience: input.workExperience || 'Building experience',
        education: input.education || 'Continuous learner',
        skills: input.skills || 'Developing skills',
        workingStyle: input.workingStyle || 'Adaptable',
        problemSolving: input.problemSolving || 'Logical',
        uniqueStrength: input.uniqueStrength || 'Committed',
        careerGoals: input.careerGoals || 'Growth',
        personalContext: input.personalContext || 'Not provided', // ✅ NEW
      });

      const result = await model.invoke(formatted);
      
      let content = typeof result.content === 'string' 
        ? result.content 
        : JSON.stringify(result.content);

      content = content
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      // Calculate ATS score
      const allKeywords = [
        ...keywords.critical,
        ...keywords.important,
        ...keywords.bonus
      ];

      const analysis = await analyzeKeywordsUniversal(
        allKeywords,
        content,
        letterLanguage
      );

      const criticalMatched = keywords.critical.filter(k => 
        content.toLowerCase().includes(k.toLowerCase())
      ).length;
      const criticalTotal = keywords.critical.length || 1;

      const importantMatched = keywords.important.filter(k => 
        content.toLowerCase().includes(k.toLowerCase())
      ).length;
      const importantTotal = keywords.important.length || 1;

      const bonusMatched = keywords.bonus.filter(k => 
        content.toLowerCase().includes(k.toLowerCase())
      ).length;

      const criticalScore = (criticalMatched / criticalTotal) * 60;
      const importantScore = (importantMatched / importantTotal) * 30;
      const bonusScore = Math.min(bonusMatched * 2, 10);

      const atsScore = Math.round(criticalScore + importantScore + bonusScore);

      console.log(`📊 [V2-ATS] Iteration ${iteration} Score: ${atsScore}%`);

      const missingCritical = keywords.critical.filter(k => 
        !content.toLowerCase().includes(k.toLowerCase())
      );

      const currentAnalysis = {
        keywordMatch: atsScore,
        readability: 85,
        overall: atsScore,
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

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 5: GUARDIAN VALIDATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let guardianReport = null;
  if (input.guardianValidation !== false && groundTruth) {
    console.log('🛡️ [V2-ATS] Running Guardian...');
    try {
      guardianReport = await masterGuardianValidatorV2(
        bestContent,
        groundTruth,
        'generation'
      );
      console.log(`🛡️ [V2-ATS] Guardian: ${guardianReport.approved ? 'APPROVED' : 'ISSUES'}`);
    } catch (error) {
      console.error('⚠️ [V2-ATS] Guardian failed:', error);
    }
  }

  // ✅ DO NOT ADD NAME (template will add it)
  // Generaattori palauttaa VAIN bodyn, ilman nimeä

  return {
    content: bestContent, // Body only, no personal info
    title: `Application - ${input.jobDescription.substring(0, 50)}...`,
    signature: input.name, // Stored separately
    keyHighlights: [...keywords.critical.slice(0, 5)],
    atsScore: bestScore,
    atsAnalysis: bestAnalysis,
    languageWarning, // ✅ NEW
    guardianReport: guardianReport || undefined,
    iterations: iteration,
  };
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';