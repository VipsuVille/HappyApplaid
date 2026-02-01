// lib/langchain/coverLetterGenerator.ts - ✅ PRIVACY FIXED
// ATS V1 - EI HENKILÖTIETOJA AI:LLE!

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV1Input {
  jobDescription: string;
  
  // 🔒 PRIVACY: Henkilötiedot (EI lähetetä AI:lle, vain template:lle)
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  
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
  
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  guardianValidation?: boolean;
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV1Output {
  content: string; // Body WITHOUT name/contact
  title: string;
  signature: string; // Name stored separately
  keyHighlights: string[];
  extractedKeywords?: string[];
  guardianReport?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  questions?: any[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: BASIC KEYWORD EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractBasicKeywords(jobDescription: string): Promise<string[]> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Extract 10-15 most important keywords from job posting.

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
// MAIN V1 GENERATOR - ✅ PRIVACY FIXED
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV1(
  input: ATSV1Input
): Promise<ATSV1Output> {
  
  console.log('🚀 [V1-ATS] Starting basic ATS generation...');
  console.log('🔒 [V1-ATS] PRIVACY MODE: Name will NOT be sent to AI');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: SMART QUESTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!input.skipQuestions) {
    console.log('🧠 [V1-ATS] Running smart question analysis...');
    
    try {
      const analysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          // 🔒 PRIVACY: NO NAME to question analyzer
          name: 'Applicant',
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
            signature: input.name, // ✅ Stored separately
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
      groundTruth = await extractGroundTruthAI(
        {
          // 🔒 PRIVACY: NO NAME to Guardian!
          // name: input.name, ❌ POISTETTU!
          
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
      console.log('✅ [V1-ATS] Ground truth extracted (no personal data sent)');
    } catch (error) {
      console.error('⚠️ [V1-ATS] Ground truth extraction failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: GENERATE LETTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.6,
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : 'englanti';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a cover letter writer (V1 - Basic ATS awareness).

# ════════════════════════════════════════════════════════════════
# 🔒 PRIVACY: NO PERSONAL INFO IN GENERATION
# ════════════════════════════════════════════════════════════════

**YOU WILL NOT RECEIVE:**
❌ Applicant's full name
❌ Email address
❌ Phone number
❌ Home address

**YOU WILL RECEIVE:**
✅ Anonymous work experience
✅ Skills and education
✅ Personality traits
✅ Career goals

**TEMPLATE HANDLES:**
The system will add name and contact info separately to the final document.

# ════════════════════════════════════════════════════════════════
# TRUTH SCALE: 3-4 (Critical!)
# ════════════════════════════════════════════════════════════════

SCALE 1-10:
1 = Word-for-word from profile (robotic)
3-4 = ⭐ TARGET: Reads profile, understands person, writes naturally BUT stays truthful
10 = Completely fabricates (liar)

# ════════════════════════════════════════════════════════════════
# V1: BASIC KEYWORD AWARENESS (NOT OPTIMIZED)
# ════════════════════════════════════════════════════════════════

**EXTRACTED KEYWORDS:**
{keywords}

**KEYWORD STRATEGY:**
1. Use keywords naturally IF user has related experience
2. Don't force keywords
3. If no experience → express interest to learn (mention keyword!)
4. DON'T spam keywords

**MISSING KEYWORD INTEGRATION:**
If keyword missing from user's profile, use this pattern:

✅ CORRECT:
"Vaikka minulla ei ole kokemusta Pythonista, ohjelmointitaustani 
C#:lla antaa vahvan pohjan. Olen innokas oppimaan Python."

WHY: ATS finds "Python", human sees honesty

❌ WRONG:
"Kiinnostaa ohjelmointi" (no Python keyword → ATS fails)

# ════════════════════════════════════════════════════════════════
# STRUCTURE (300-400 words)
# ════════════════════════════════════════════════════════════════

**NO HEADER INFO:**
- Don't include: Name, email, phone, date, address
- Template handles these

**PARAGRAPH 1: HOOK (2-3 sentences)**
Modern opening (no clichés):
✅ "Accenturen Fullstack Developer -rooli yhdistää täsmälleen ne teknologiat..."
❌ "Olen innostunut hakemaan..."

**PARAGRAPH 2-3: EXPERIENCE & SKILLS (5-7 sentences)**
- Real experiences + keywords
- Use "missing keyword integration" for gaps
- Concrete examples

**PARAGRAPH 4: CLOSING (2 sentences)**
- Enthusiasm
- Forward-looking
- NO signature or name (template handles it)

✅ "Odotan innolla mahdollisuutta keskustella."
[STOP HERE - no name, no "Ystävällisin terveisin"]

**LANGUAGE:** {languageName}
**STYLE:** {style}`],

    ['human', `Write cover letter for THIS job (V1 - Basic).

**JOB DESCRIPTION:**
{jobDescription}

**KEYWORDS (use naturally):**
{keywords}

**APPLICANT (ANONYMIZED - NO NAME):**
Experience Level: {careerLevel}
Years: {yearsOfExperience}
Work: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Strength: {uniqueStrength}
Superpower: {superpower}

**MOTIVATION:**
Goals: {careerGoals}
Best Project: {bestProjectExample}

**FOLLOW-UP:**
{followUpAnswers}

**CRITICAL RULES:**
1. Truth 3-4 (honest but natural)
2. Integrate keywords (use "missing keyword strategy")
3. Modern opening
4. NO name, email, phone, or signature in body
5. Write in {languageName}
6. End with forward-looking sentence (no sign-off)

Generate body text ONLY. Template will add header and signature.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      languageName,
      style: input.style || 'professional',
      keywords: keywords.join(', '),
      jobDescription: input.jobDescription,
      
      // ✅ ANONYMIZED DATA ONLY
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
      careerGoals: input.careerGoals || 'Professional growth',
      bestProjectExample: input.bestProjectExample || 'No specific project',
      followUpAnswers: input.followUpAnswers 
        ? Object.entries(input.followUpAnswers).map(([q, a]) => `${q}: ${a}`).join('\n')
        : 'None',
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // ✅ PUHDISTUS: Poista turhat merkit
    content = content
      .replace(/\[.*?\]/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // ✅ PUHDISTUS: Poista lopputeksti (AI saattaa lisätä vahingossa)
    content = content
      .replace(/Ystävällisin terveisin,?\s*/gi, '')
      .replace(/Best regards,?\s*/gi, '')
      .replace(/Sincerely,?\s*/gi, '')
      .trim();

    // ✅ PUHDISTUS: Poista nimi jos AI lisäsi sen vahingossa
    const namePattern = new RegExp(`\\b${input.name}\\b`, 'gi');
    const nameCount = (content.match(namePattern) || []).length;
    
    if (nameCount > 0) {
      console.warn(`⚠️ [V1-ATS] AI accidentally included name ${nameCount} times - removing`);
      content = content.replace(namePattern, '[Name will be added by template]').trim();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: GUARDIAN VALIDATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let guardianReport = null;
    if (input.guardianValidation !== false && groundTruth) {
      console.log('🛡️ [V1-ATS] Running Guardian validation...');
      try {
        guardianReport = await masterGuardianValidatorV2(
          content,
          groundTruth,
          'generation'
        );
        console.log(`🛡️ [V1-ATS] Guardian: ${guardianReport.approved ? 'APPROVED' : 'ISSUES'}`);
      } catch (error) {
        console.error('⚠️ [V1-ATS] Guardian validation failed:', error);
      }
    }

    console.log(`✅ [V1-ATS] Generated ${content.length} chars (body only, no personal data)`);

    return {
      content, // ✅ Body WITHOUT name/contact
      title: `Application - ${input.jobDescription.substring(0, 50)}...`,
      signature: input.name, // ✅ Stored separately
      keyHighlights: keywords.slice(0, 5),
      extractedKeywords: keywords,
      guardianReport: guardianReport || undefined,
    };

  } catch (error) {
    console.error('❌ [V1-ATS] Generation failed:', error);
    throw error;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';