// lib/langchain/coverLetterGenerator.ts - V1 WITH SMARTANALYSIS

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════
const GENERATOR_VERSION = '2025-01-17-V4-FIXED';
console.log(`🔍 GENERAL VERSION: ${GENERATOR_VERSION}`);
export interface CoverLetterInput {
  jobDescription: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  education?: any;
  workExperience?: any;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual";
  userId?: string;
  skipQuestions?: boolean;
}

export interface CoverLetterOutput {
  content: string;
  title: string;
  signature: string;
  questions?: any[];
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateCoverLetterV1(
  input: CoverLetterInput
): Promise<CoverLetterOutput> {

  console.log('🚀 V1 Generator starting...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SMART QUESTION ANALYSIS (PREVENTS FABRICATION)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (!input.skipQuestions) {
    console.log('🧠 V1: Running smart question analysis...');
    
    try {
      // 🛡️ DEFENSIVE WRAPPER
      let smartAnalysis;
      try {
        const rawAnalysis = await analyzeJobAndProfile({
          jobDescription: input.jobDescription,
          userProfile: {
            name: input.name || "Not specified",
            workExperience: input.workExperience || "Not specified",
            education: input.education || "Not specified",
            skills: input.skills || "Not specified",
            workingStyle: input.workingStyle || "Not specified",
            problemSolving: input.problemSolving || "Not specified",
            uniqueStrength: input.uniqueStrength || "Not specified",
            careerGoals: input.careerGoals || "Not specified",
            bestProjectExample: input.bestProjectExample || "Not specified",
            failureLesson: input.failureLesson || "Not specified",
            personalNotes: input.personalNotes || "Not specified",
          },
          language: input.language || 'finnish',
          userId: input.userId
        });

        // 🛡️ NORMALIZE - CRITICAL: Estää undefined.filter() crashin
        smartAnalysis = {
          shouldAskQuestions: rawAnalysis?.shouldAskQuestions ?? false,
          canGenerateWithoutQuestions: rawAnalysis?.canGenerateWithoutQuestions ?? true,
          confidence: rawAnalysis?.confidence ?? 70,
          questions: Array.isArray(rawAnalysis?.questions) ? rawAnalysis.questions : [], // ✅ TURVATTU
          reasoning: rawAnalysis?.reasoning ?? 'Analysis completed'
        };
      } catch (error) {
        console.error('⚠️ SmartAnalysis failed:', error);
        smartAnalysis = {
          shouldAskQuestions: false,
          canGenerateWithoutQuestions: true,
          confidence: 70,
          questions: [], // ✅ AINA ARRAY
          reasoning: 'Analysis failed'
        };
      }

      // ✅ NYT TÄMÄ ON AINA ARRAY
      const safeQuestions = smartAnalysis.questions;

      console.log('🧠 V1 SmartAnalysis:', {
        shouldAsk: smartAnalysis.shouldAskQuestions,
        questionsCount: safeQuestions.length, // ✅ SAFE
        confidence: smartAnalysis.confidence
      });

      // ✅ TURVATTU FILTER - ei voi kaatua
      if (smartAnalysis.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(
          q => q && q.priority === 'critical'
        );

        if (criticalQuestions.length > 0) {
          console.log(`❓ V1: Returning ${criticalQuestions.length} critical questions`);

          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            questions: criticalQuestions,
          };
        }
      }

      console.log('✅ V1: Profile sufficient');
      
    } catch (error) {
      console.error('⚠️ V1: Question analysis failed, continuing safely:', error);
    }
  } else {
    console.log('⏭️ V1: Skipping questions (skipQuestions=true)');
  }
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // GENERATION (FULLY DYNAMIC - NO HARDCODING)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const targetLanguage = (input.language || 'finnish').toLowerCase();
  const isFinnish = targetLanguage.includes('fi') || targetLanguage.includes('suom');
  const languageName = isFinnish ? 'suomi' : 'englanti';
  
  console.log(`🌍 Language: ${languageName}`);

  // Extract real projects (DYNAMIC - FROM ACTUAL DATA)
  const realProjects = [];
  
  if (input.bestProjectExample && input.bestProjectExample.length > 20) {
    realProjects.push(input.bestProjectExample);
  }
  
  if (input.workExperience) {
    try {
      const workExp = typeof input.workExperience === 'string' 
        ? JSON.parse(input.workExperience) 
        : input.workExperience;
      
      if (Array.isArray(workExp)) {
        workExp.forEach((job: any) => {
          if (job.description && job.description.length > 20) {
            realProjects.push(`${job.position}: ${job.description}`);
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ Work experience parse failed');
    }
  }

  const hasRealProjects = realProjects.length > 0;
  const projectsText = hasRealProjects 
    ? realProjects.join('\n\n') 
    : 'No detailed project descriptions - use general strengths';

  console.log(`📋 Real projects: ${realProjects.length}`);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a professional cover letter writer. Write MODERN, CLEAR cover letters.

# ════════════════════════════════════════════════════════════════
# CRITICAL: MODERN COVER LETTER FORMAT
# ════════════════════════════════════════════════════════════════

**COVER LETTER CONTAINS ONLY:**
1. Greeting
2. Body text (3-4 paragraphs)
3. Closing
4. Signature

**NEVER WRITE:**
❌ Applicant's address
❌ Applicant's phone number
❌ Applicant's email
❌ Company address
❌ [Placeholders in brackets]
❌ Date in body text (added automatically)

**CRITICAL: NAME USAGE**
- Applicant's name is: {name}
- NEVER write "Applicant"
- NEVER write "[Your Name]"
- ALWAYS use name {name}

# ════════════════════════════════════════════════════════════════
# NO HARDCODING - REPRESENTATION FROM ACTUAL DATA
# ════════════════════════════════════════════════════════════════

**RULE 1: LANGUAGE**
TARGET LANGUAGE: {languageName}
- EVERY WORD in language: {languageName}

**RULE 2: ONLY USE WHAT'S IN THE PROFILE**

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WHAT YOU CAN DO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If user has skill/experience:

✅ "I've developed programming skills through practical projects"
   → OK when skills contains "programming"

✅ "I have customer service experience"
   → OK when workExperience contains customer work

✅ "I've worked on projects where..."
   → OK when workExperience or bestProject describes work

✅ "I master [skill] and have applied it..."
   → OK when skill is in skills list

✅ "I'm excited to learn more about [topic]"
   → ALWAYS OK

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WHAT YOU CANNOT DO
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "I developed an automated system that..."
   → NOT OK if not in realProjects

❌ "I created a 50-user application..."
   → NOT OK if no details provided

❌ Any detailed project descriptions if not provided

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STRUCTURE (280-350 words):**

**PARAGRAPH 1: OPENING (2-3 sentences)**
- Why THIS role interests you
- Connection to your background

**PARAGRAPHS 2-3: STRENGTHS (4-6 sentences)**
- Real skills presented interestingly
- Personality at work
- Concrete examples FROM PROFILE

**PARAGRAPH 4: CLOSING (2-3 sentences)**
- Enthusiasm for role
- Willingness to discuss
- Thanks

Write PURELY in language {languageName}. Use name {name}.`],

    ['human', `Write MODERN cover letter in language {languageName}.

**JOB DESCRIPTION:**
{jobDescription}

**APPLICANT INFO:**
NAME: {name} (USE THIS, NOT "Applicant")
Skills: {skills}
Work Experience: {workExperience}
Education: {education}

**REAL PROJECTS (USE THESE):**
{realProjects}

**PERSONALITY:**
- Working Style: {workingStyle}
- Problem Solving: {problemSolving}
- Strength: {uniqueStrength}
- Superpower: {superpower}

**MOTIVATION:**
- Goals: {careerGoals}
- Values: {valuesExample}

**NOTES:**
{personalNotes}

Create cover letter NOW in language {languageName}.
USE ONLY INFORMATION FROM ABOVE. NO FABRICATION.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      languageName,
      name: input.name || 'Applicant',
      jobDescription: input.jobDescription || 'Not specified',
      skills: input.skills || 'Developing skills',
      workExperience: typeof input.workExperience === 'string' 
        ? input.workExperience 
        : JSON.stringify(input.workExperience || 'Building experience'),
      education: typeof input.education === 'string'
        ? input.education
        : JSON.stringify(input.education || 'Continuous learner'),
      realProjects: projectsText,
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Logical',
      uniqueStrength: input.uniqueStrength || 'Committed',
      superpower: input.superpower || 'Motivated',
      careerGoals: input.careerGoals || 'Professional growth',
      valuesExample: input.valuesExample || 'Honesty',
      personalNotes: input.personalNotes || 'No additional info'
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // Remove placeholders
    content = content
      .replace(/\[Osoite\]/g, '')
      .replace(/\[Puhelinnumero\]/g, '')
      .replace(/\[Sähköposti\]/g, '')
      .replace(/\[Paikkakunta\]/g, '')
      .replace(/\[Päivämäärä\]/g, '')
      .replace(/\[Your Name\]/g, input.name || '')
      .replace(/\[Nimi\]/g, input.name || '')
      .replace(/\[Nimesi\]/g, input.name || '')
      .replace(/^Hakija(?=\s|$)/gm, input.name || '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // Ensure signature
    const signatureFinnish = `Ystävällisin terveisin,\n\n${input.name || 'Hakija'}`;
    const signatureEnglish = `Best regards,\n\n${input.name || 'Applicant'}`;
    
    if (!content.includes(input.name || 'Hakija')) {
      content += '\n\n' + (isFinnish ? signatureFinnish : signatureEnglish);
    }

    console.log(`✅ V1 generated ${content.length} characters in ${languageName}`);

    return {
      content,
      title: input.jobDescription?.substring(0, 80) || 'Cover Letter',
      signature: input.name || 'Applicant',
      questions: [],
    };

  } catch (error) {
    console.error('❌ V1 generation failed:', error);
    throw error;
  }
}