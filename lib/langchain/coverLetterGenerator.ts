// lib/langchain/atsCoverLetterV1Generator.ts - ATS V1 (BASIC)

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV1Input {
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
  guardianValidation?: boolean; // ✅ LISÄTTY (default: true)
  
  // Control
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
  guardianReport?: { // ✅ LISÄTTY
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  questions?: any[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: EXTRACT BASIC KEYWORDS
// ═══════════════════════════════════════════════════════════════

async function extractBasicKeywords(jobDescription: string): Promise<string[]> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Extract 10-15 most important ATS keywords from job posting.

Job Posting:
${jobDescription.substring(0, 2000)}

Return ONLY a JSON array of keywords:
["keyword1", "keyword2", ...]

Focus on:
- Technical skills
- Required qualifications
- Key responsibilities
- Industry terms`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];
    
    const keywords = JSON.parse(jsonMatch[0]);
    return Array.isArray(keywords) ? keywords : [];
  } catch (error) {
    console.error('❌ Keyword extraction failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN V1 GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV1(
  input: ATSV1Input
): Promise<ATSV1Output> {
  
  console.log('🚀 [V1-ATS] Starting basic ATS generation...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: SMART QUESTIONS (if needed)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!input.skipQuestions) {
    console.log('🧠 [V1-ATS] Running smart question analysis...');
    
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
          console.log(`❓ [V1-ATS] Returning ${criticalQuestions.length} questions`);
          
          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            keyHighlights: [],
            questions: criticalQuestions,
          };
        }
      }
    } catch (error) {
      console.error('⚠️ [V1-ATS] Question analysis failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: EXTRACT KEYWORDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔍 [V1-ATS] Extracting keywords...');
  const keywords = await extractBasicKeywords(input.jobDescription);
  console.log(`✅ [V1-ATS] Found ${keywords.length} keywords`);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: GUARDIAN - EXTRACT GROUND TRUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let groundTruth = null;
  if (input.guardianValidation !== false) {
    console.log('🛡️ [V1-ATS] Extracting ground truth...');
    try {
      const { extractGroundTruthAI } = await import("@/lib/ats/masterGuardian");
      
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
      console.log('✅ [V1-ATS] Ground truth extracted');
    } catch (error) {
      console.error('⚠️ [V1-ATS] Ground truth extraction failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: GENERATE LETTER (TRUTH SCALE 3-4)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.6,
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : 'englanti';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an ATS-aware cover letter writer (V1 - Basic Level).

# ════════════════════════════════════════════════════════════════
# TRUTH SCALE: 3-4 (Critical!)
# ════════════════════════════════════════════════════════════════

SCALE 1-10:
1 = Word-for-word from profile (robotic)
3-4 = ⭐ TARGET: Reads profile, understands person, writes naturally BUT stays truthful
10 = Completely fabricates (liar)

**YOUR MISSION:**
- Read the profile and understand WHO this person is
- Write about them in your own professional words
- Stay TRUTHFUL - don't invent experiences/skills
- Present them as a professional would see them
- "Read between the lines" but don't lie

**EXAMPLES:**

❌ WRONG (Scale 1 - Too literal):
"Profiilin mukaan olen työskennellyt kassalla 2 vuotta."

✅ CORRECT (Scale 3-4):
"Kahden vuoden asiakaspalvelukokemukseni on opettanut minulle kärsivällisyyttä ja kommunikaatiotaitoja."

❌ WRONG (Scale 10 - Fabrication):
"Johdin 50-hengen tiimiä ja kasvoitin myyntiä 300%."
(NOT in profile → LYING)

✅ CORRECT (Scale 3-4):
"Tiimityöskentelyssä olen oppinut kuuntelemaan ja jakamaan vastuuta."
(Based on teamRole: "supportive team member")

# ════════════════════════════════════════════════════════════════
# ATS V1: BASIC KEYWORD INTEGRATION
# ════════════════════════════════════════════════════════════════

**KEYWORD STRATEGY:**
1. Use keywords naturally in context
2. Don't spam keywords
3. Only use keywords IF user has related experience/skill
4. If no experience → express interest to learn

**EXTRACTED KEYWORDS:**
{keywords}

**INTEGRATION RULES:**
- IF keyword in user's skills → Use it
- IF keyword related to experience → Mention naturally
- IF keyword not in profile → Express interest/willingness to learn
- DON'T force keywords that don't fit

# ════════════════════════════════════════════════════════════════
# STRUCTURE (300-400 words)
# ════════════════════════════════════════════════════════════════

**PARAGRAPH 1: OPENING (2-3 sentences)**
- Why THIS specific role interests you
- Connection to your background
- Mention 1-2 relevant keywords naturally

**PARAGRAPH 2-3: EXPERIENCE & SKILLS (5-7 sentences)**
- Real experiences presented professionally
- Personality at work (truth scale 3-4!)
- Integrate keywords naturally
- Concrete examples FROM PROFILE

**PARAGRAPH 4: MOTIVATION & CLOSING (2-3 sentences)**
- Enthusiasm for THIS role
- Willingness to discuss
- Professional closing

**LANGUAGE:** {languageName}
**STYLE:** {style}

Write ONLY in {languageName}. Use name {name}.`],

    ['human', `Write ATS-optimized cover letter (V1 - Basic).

**JOB DESCRIPTION:**
{jobDescription}

**EXTRACTED ATS KEYWORDS:**
{keywords}

**APPLICANT PROFILE:**
Name: {name}
Experience Level: {careerLevel}
Years: {yearsOfExperience}

Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY (for Truth Scale 3-4):**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Team Role: {teamRole}
Values: {valuesExample}

**MOTIVATION:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}
Lesson Learned: {failureLesson}

**FOLLOW-UP ANSWERS:**
{followUpAnswers}

**ADDITIONAL NOTES:**
{personalNotes}

**CRITICAL RULES:**
1. Truth Scale 3-4 (read profile, write naturally, stay truthful)
2. Integrate keywords ONLY if user has related experience
3. Don't fabricate projects/skills
4. Express interest to learn if keyword not in profile
5. Write in {languageName}

Generate cover letter NOW.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      languageName,
      name: input.name,
      style: input.style || 'professional',
      keywords: keywords.join(', '),
      jobDescription: input.jobDescription,
      careerLevel: input.careerLevel || 'mid',
      yearsOfExperience: input.yearsOfExperience || 0,
      workExperience: input.workExperience || 'Building experience',
      education: input.education || 'Continuous learner',
      skills: input.skills || 'Developing skills',
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Logical thinker',
      uniqueStrength: input.uniqueStrength || 'Committed',
      superpower: input.superpower || 'Motivated',
      teamRole: input.teamRole || 'Collaborative',
      valuesExample: input.valuesExample || 'Honest',
      careerGoals: input.careerGoals || 'Professional growth',
      bestProjectExample: input.bestProjectExample || 'No specific project',
      failureLesson: input.failureLesson || 'Always learning',
      followUpAnswers: input.followUpAnswers 
        ? Object.entries(input.followUpAnswers).map(([q, a]) => `${q}: ${a}`).join('\n')
        : 'None',
      personalNotes: input.personalNotes || 'None'
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // Clean up
    content = content
      .replace(/\[.*?\]/g, '') // Remove placeholders
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: GUARDIAN VALIDATION (✅ LISÄTTY V1:EEN!)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let guardianReport = null;
    if (input.guardianValidation !== false && groundTruth) {
      console.log('🛡️ [V1-ATS] Running Guardian validation...');
      try {
        const { masterGuardianValidatorV2 } = await import("@/lib/ats/masterGuardian");
        
        guardianReport = await masterGuardianValidatorV2(
          content,
          groundTruth,
          'generation'
        );
        console.log(`🛡️ [V1-ATS] Guardian: ${guardianReport.approved ? 'APPROVED' : 'ISSUES FOUND'}`);
      } catch (error) {
        console.error('⚠️ [V1-ATS] Guardian validation failed:', error);
      }
    }

    // Ensure signature
    const signatureFinnish = `Ystävällisin terveisin,\n\n${input.name}`;
    const signatureEnglish = `Best regards,\n\n${input.name}`;
    
    if (!content.includes(input.name)) {
      content += '\n\n' + (isFinnish ? signatureFinnish : signatureEnglish);
    }

    // Extract key highlights (for UI display)
    const keyHighlights = keywords.slice(0, 5); // Top 5 keywords used

    console.log(`✅ [V1-ATS] Generated ${content.length} chars with ${keywords.length} keywords`);

    return {
      content,
      title: `Application - ${input.jobDescription.substring(0, 50)}...`,
      signature: input.name,
      keyHighlights,
      extractedKeywords: keywords,
      guardianReport: guardianReport || undefined, // ✅ LISÄTTY
    };

  } catch (error) {
    console.error('❌ [V1-ATS] Generation failed:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// METADATA
// ═══════════════════════════════════════════════════════════════

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';