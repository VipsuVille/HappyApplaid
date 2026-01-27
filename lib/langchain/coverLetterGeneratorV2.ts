// lib/langchain/atsCoverLetterV2Generator.ts - ATS V2 (ADVANCED)

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { analyzeKeywordsUniversal } from "@/lib/ats/synonymMatcher";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV2Input {
  // Required
  jobDescription: string;
  name: string;
  
  // Contact (not in letter body)
  email?: string;
  phone?: string;
  location?: string;
  
  // Profile
  workExperience?: string;
  education?: string;
  skills?: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  
  // Personality (CRITICAL for truth scale 3-4)
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
  
  // Settings
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  guardianValidation?: boolean; // Use Guardian
  
  // Control
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV2Output {
  content: string;
  title: string;
  signature: string;
  keyHighlights: string[];
  
  // ATS Analysis
  atsScore: number; // 0-100
  atsAnalysis: {
    keywordMatch: number;
    readability: number;
    overall: number;
    exactMatches: string[];
    synonymMatches: string[];
    missingCritical: string[];
  };
  
  // Guardian Report
  guardianReport?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  
  // Meta
  iterations: number;
  questions?: any[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: DEEP KEYWORD EXTRACTION
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

  const prompt = `Deep ATS keyword analysis.

Job Posting:
${jobDescription.substring(0, 2500)}

Extract keywords by priority:

Return JSON:
{
  "critical": ["MUST-HAVE skills/qualifications"],
  "important": ["Strongly preferred"],
  "bonus": ["Nice to have"]
}

Focus on:
- Required qualifications (critical)
- Preferred skills (important)
- Bonus skills (bonus)
- Industry terminology
- Certifications`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
    const jsonMatch = content.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    return {
      critical: Array.isArray(parsed.critical) ? parsed.critical : [],
      important: Array.isArray(parsed.important) ? parsed.important : [],
      bonus: Array.isArray(parsed.bonus) ? parsed.bonus : []
    };
  } catch (error) {
    console.error('❌ Deep keyword extraction failed:', error);
    return { critical: [], important: [], bonus: [] };
  }
}

// ═══════════════════════════════════════════════════════════════
// HELPER: CALCULATE ATS SCORE
// ═══════════════════════════════════════════════════════════════

async function calculateATSScore(
  content: string,
  keywords: { critical: string[]; important: string[]; bonus: string[] },
  jobDescription: string
): Promise<{
  score: number;
  exactMatches: string[];
  synonymMatches: string[];
  missingCritical: string[];
}> {
  
  const allKeywords = [
    ...keywords.critical,
    ...keywords.important,
    ...keywords.bonus
  ];

  // Use universal semantic matching
  const analysis = await analyzeKeywordsUniversal(
    allKeywords,
    content,
    jobDescription,
    'finnish'
  );

  const exactMatches = analysis.exactMatches.map(m => m.keyword);
  const synonymMatches = analysis.synonymMatches.map(m => m.keyword);
  
  const missingCritical = keywords.critical.filter(
    k => !exactMatches.includes(k) && !synonymMatches.includes(k)
  );

  // Score calculation
  const criticalScore = (
    (keywords.critical.length - missingCritical.length) / 
    Math.max(keywords.critical.length, 1)
  ) * 60; // 60% weight

  const importantMatches = keywords.important.filter(
    k => exactMatches.includes(k) || synonymMatches.includes(k)
  );
  const importantScore = (
    importantMatches.length / Math.max(keywords.important.length, 1)
  ) * 30; // 30% weight

  const bonusMatches = keywords.bonus.filter(
    k => exactMatches.includes(k) || synonymMatches.includes(k)
  );
  const bonusScore = Math.min(bonusMatches.length * 2, 10); // 10% weight (max 5 bonus)

  const totalScore = Math.round(criticalScore + importantScore + bonusScore);

  return {
    score: totalScore,
    exactMatches,
    synonymMatches,
    missingCritical
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN V2 GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV2(
  input: ATSV2Input
): Promise<ATSV2Output> {
  
  console.log('🚀 [V2-ATS] Starting advanced ATS generation...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: SMART QUESTIONS (if needed)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!input.skipQuestions) {
    console.log('🧠 [V2-ATS] Running smart question analysis...');
    
    try {
      const analysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          name: input.name,
          workExperience: input.workExperience || "",
          education: input.education || "",
          skills: input.skills || "",
          workingStyle: input.workingStyle || "",
          problemSolving: input.problemSolving || "",
          uniqueStrength: input.uniqueStrength || "",
          careerGoals: input.careerGoals || "",
          bestProjectExample: input.bestProjectExample || "",
          failureLesson: input.failureLesson || "",
          personalNotes: input.personalNotes || "",
        },
        language: input.language || 'finnish',
        userId: input.userId
      });

      const safeQuestions = Array.isArray(analysis?.questions) ? analysis.questions : [];

      if (analysis?.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(q => q && q.priority === 'critical');

        if (criticalQuestions.length > 0) {
          console.log(`❓ [V2-ATS] Returning ${criticalQuestions.length} questions`);
          
          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            keyHighlights: [],
            atsScore: 0,
            atsAnalysis: {
              keywordMatch: 0,
              readability: 0,
              overall: 0,
              exactMatches: [],
              synonymMatches: [],
              missingCritical: []
            },
            iterations: 0,
            questions: criticalQuestions,
          };
        }
      }
    } catch (error) {
      console.error('⚠️ [V2-ATS] Question analysis failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: EXTRACT DEEP KEYWORDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔍 [V2-ATS] Extracting deep keywords...');
  const keywords = await extractDeepKeywords(input.jobDescription);
  console.log(`✅ [V2-ATS] Keywords: ${keywords.critical.length} critical, ${keywords.important.length} important, ${keywords.bonus.length} bonus`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: GUARDIAN - EXTRACT GROUND TRUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let groundTruth = null;
  if (input.guardianValidation !== false) {
    console.log('🛡️ [V2-ATS] Extracting ground truth...');
    try {
      groundTruth = await extractGroundTruthAI(
        {
          name: input.name,
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
  // STEP 4: INITIAL GENERATION (TRUTH SCALE 3-4)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5, // Lower for more precision
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : 'englanti';

  console.log('🤖 [V2-ATS] Generating initial letter...');

  let currentContent = '';
  let iteration = 0;
  const MAX_ITERATIONS = 3;

  while (iteration < MAX_ITERATIONS) {
    iteration++;
    console.log(`🔄 [V2-ATS] Iteration ${iteration}/${MAX_ITERATIONS}`);

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ADVANCED ATS-optimized cover letter writer (V2).

# ════════════════════════════════════════════════════════════════
# TRUTH SCALE: 3-4 (NON-NEGOTIABLE!)
# ════════════════════════════════════════════════════════════════

SCALE 1-10:
1 = Word-for-word from profile
3-4 = ⭐ TARGET: Professional interpretation, stays truthful
10 = Complete fabrication

**YOUR MISSION:**
- Understand the PERSON from their profile
- Write as a professional career advisor would
- Stay 100% TRUTHFUL
- Present them in best light WITHOUT lying

# ════════════════════════════════════════════════════════════════
# ATS V2: ADVANCED OPTIMIZATION
# ════════════════════════════════════════════════════════════════

**CRITICAL KEYWORDS (MUST include):**
{criticalKeywords}

**IMPORTANT KEYWORDS (Strongly recommended):**
{importantKeywords}

**BONUS KEYWORDS (If applicable):**
{bonusKeywords}

**KEYWORD RULES:**
1. Use ALL critical keywords naturally
2. Use most important keywords
3. Integrate keywords in context
4. DON'T spam (density < 3% per keyword)
5. Use synonyms if exact keyword doesn't fit
6. If no experience with keyword → express interest

${iteration > 1 ? `
**PREVIOUS ATTEMPT FAILED ATS TEST:**
Score: {previousScore}%
Missing Critical: {missingCritical}

**IMPROVEMENT STRATEGY:**
- Add missing critical keywords NATURALLY
- Don't spam - integrate smoothly
- Maintain truth scale 3-4
` : ''}

# ════════════════════════════════════════════════════════════════
# STRUCTURE (350-450 words)
# ════════════════════════════════════════════════════════════════

**PARAGRAPH 1: HOOK (2-3 sentences)**
- Why THIS role (mention 1-2 critical keywords)
- Your background connection

**PARAGRAPH 2: EXPERIENCE (4-5 sentences)**
- Real experiences + keywords
- Truth scale 3-4!
- Quantify if possible

**PARAGRAPH 3: SKILLS (4-5 sentences)**
- Match skills to job requirements
- Integrate important keywords
- Personality at work

**PARAGRAPH 4: MOTIVATION (2-3 sentences)**
- Enthusiasm for role
- Company alignment
- Call to action

**LANGUAGE:** {languageName}

Write in {languageName}.`],

      ['human', `Generate ATS-optimized letter (V2 - Advanced).

${iteration > 1 ? `**THIS IS ITERATION ${iteration} - IMPROVE PREVIOUS ATTEMPT**\n` : ''}

**JOB DESCRIPTION:**
{jobDescription}

**ATS KEYWORDS:**
Critical: {criticalKeywords}
Important: {importantKeywords}
Bonus: {bonusKeywords}

**APPLICANT:**
Name: {name}
Level: {careerLevel}
Years: {yearsOfExperience}

Work: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY:**
Working: {workingStyle}
Solving: {problemSolving}
Strength: {uniqueStrength}
Superpower: {superpower}
Team: {teamRole}
Values: {valuesExample}

**GOALS:**
Career: {careerGoals}
Project: {bestProjectExample}
Lesson: {failureLesson}

**FOLLOW-UP:**
{followUpAnswers}

**NOTES:**
{personalNotes}

${iteration > 1 ? `
**IMPROVE FROM PREVIOUS:**
Previous Score: {previousScore}%
Missing: {missingCritical}
→ ADD THESE NATURALLY!
` : ''}

**CRITICAL:**
1. Truth Scale 3-4 (NO fabrication)
2. Include ALL critical keywords naturally
3. Integrate important keywords
4. Write in {languageName}

Generate NOW.`]
    ]);

    try {
      const previousScore = iteration > 1 
        ? (await calculateATSScore(currentContent, keywords, input.jobDescription)).score 
        : 0;
      
      const previousMissing = iteration > 1
        ? (await calculateATSScore(currentContent, keywords, input.jobDescription)).missingCritical
        : [];

      const formatted = await prompt.formatMessages({
        languageName,
        name: input.name,
        criticalKeywords: keywords.critical.join(', '),
        importantKeywords: keywords.important.join(', '),
        bonusKeywords: keywords.bonus.join(', '),
        jobDescription: input.jobDescription,
        careerLevel: input.careerLevel || 'mid',
        yearsOfExperience: input.yearsOfExperience || 0,
        workExperience: input.workExperience || 'Building experience',
        education: input.education || 'Continuous learner',
        skills: input.skills || 'Developing skills',
        workingStyle: input.workingStyle || 'Adaptable',
        problemSolving: input.problemSolving || 'Logical',
        uniqueStrength: input.uniqueStrength || 'Committed',
        superpower: input.superpower || 'Motivated',
        teamRole: input.teamRole || 'Collaborative',
        valuesExample: input.valuesExample || 'Honest',
        careerGoals: input.careerGoals || 'Growth',
        bestProjectExample: input.bestProjectExample || 'None',
        failureLesson: input.failureLesson || 'Learning',
        followUpAnswers: input.followUpAnswers 
          ? Object.entries(input.followUpAnswers).map(([q, a]) => `${q}: ${a}`).join('\n')
          : 'None',
        personalNotes: input.personalNotes || 'None',
        previousScore: previousScore.toString(),
        missingCritical: previousMissing.join(', ')
      });

      const result = await model.invoke(formatted);
      
      currentContent = typeof result.content === 'string' 
        ? result.content 
        : JSON.stringify(result.content);

      currentContent = currentContent
        .replace(/\[.*?\]/g, '')
        .replace(/\n\s*\n\s*\n/g, '\n\n')
        .trim();

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 5: CALCULATE ATS SCORE
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      const atsResult = await calculateATSScore(currentContent, keywords, input.jobDescription);
      console.log(`📊 [V2-ATS] Iteration ${iteration} Score: ${atsResult.score}%`);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // STEP 6: CHECK IF GOOD ENOUGH (>= 75%)
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

      if (atsResult.score >= 75) {
        console.log(`✅ [V2-ATS] Passed ATS threshold (${atsResult.score}%)`);
        break;
      }

      if (iteration === MAX_ITERATIONS) {
        console.log(`⚠️ [V2-ATS] Max iterations reached. Final score: ${atsResult.score}%`);
      }

    } catch (error) {
      console.error(`❌ [V2-ATS] Iteration ${iteration} failed:`, error);
      throw error;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 7: GUARDIAN VALIDATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let guardianReport = null;
  if (input.guardianValidation !== false && groundTruth) {
    console.log('🛡️ [V2-ATS] Running Guardian validation...');
    try {
      guardianReport = await masterGuardianValidatorV2(
        currentContent,
        groundTruth,
        'generation'
      );
      console.log(`🛡️ [V2-ATS] Guardian: ${guardianReport.approved ? 'APPROVED' : 'ISSUES FOUND'}`);
    } catch (error) {
      console.error('⚠️ [V2-ATS] Guardian validation failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 8: FINAL ATS ANALYSIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const finalATS = await calculateATSScore(currentContent, keywords, input.jobDescription);

  // Ensure signature
  const signatureFinnish = `Ystävällisin terveisin,\n\n${input.name}`;
  const signatureEnglish = `Best regards,\n\n${input.name}`;
  
  if (!currentContent.includes(input.name)) {
    currentContent += '\n\n' + (isFinnish ? signatureFinnish : signatureEnglish);
  }

  console.log(`✅ [V2-ATS] Complete! Score: ${finalATS.score}%, Iterations: ${iteration}`);

  return {
    content: currentContent,
    title: `Application - ${input.jobDescription.substring(0, 50)}...`,
    signature: input.name,
    keyHighlights: [...finalATS.exactMatches, ...finalATS.synonymMatches].slice(0, 8),
    atsScore: finalATS.score,
    atsAnalysis: {
      keywordMatch: finalATS.score,
      readability: 85, // TODO: Implement readability score
      overall: finalATS.score,
      exactMatches: finalATS.exactMatches,
      synonymMatches: finalATS.synonymMatches,
      missingCritical: finalATS.missingCritical
    },
    guardianReport: guardianReport || undefined,
    iterations: iteration,
  };
}

// ═══════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';