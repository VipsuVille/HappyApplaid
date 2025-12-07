// lib/langchain/coverLetterGenerator.ts - TÄYDELLINEN V1 + RAG

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile, type SmartQuestion } from "./smartQuestionAnalyzer";
import { buildAIContext } from "@/lib/knowledge"; // ✅ RAG

export interface CoverLetterV1Output {
  content: string;
  title: string;
  signature: string;
  personality_hooks?: string[];
  job_match_score?: number;
  key_differentiators?: string[];
  questions?: SmartQuestion[];
  data_quality?: DataQuality;
  needsMoreInfo?: boolean;
}

export interface AIQuestion {
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface DataQuality {
  quality: 'rich' | 'moderate' | 'minimal';
  score: number;
  reasoning: string;
  personalityCompleteness: number;
  suggestions: string[];
}

// ✅ VAIN YKSI INTERFACE MÄÄRITTELY
export interface CoverLetterV1Input {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  
  jobTitle?: string;
  education?: string;
  workExperience?: string;
  skills?: string;
  personalNotes?: string;
  
  language?: string;
  style?: 'formal' | 'casual';
  
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
  
  groundTruthWarning?: string;
  
  // ✅ RAG + Ground Truth
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  
  // ✅ SKIP QUESTIONS
  skipQuestions?: boolean;
}

/**
 * ✅ ANALYZE JOB FOR PERSONALITY FIT (NO HARDCODING)
 */
async function analyzeJobForPersonalityFit(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are analyzing THIS UNIQUE job. NO assumptions.

**INFER FROM TEXT:**
- Industry
- Role type
- Personality traits needed
- Work environment
- Company culture
- Key requirements

**OUTPUT:**
{
  "detected_industry": "industry",
  "role_type": "entry|mid|senior|specialist",
  "personality_traits": ["trait1", "trait2"],
  "work_environment": "description",
  "company_culture": "culture",
  "key_requirements": ["req1", "req2"],
  "red_flags": ["avoid X"],
  "green_flags": ["emphasize Y"]
}

Return JSON.`],
    ["human", `Analyze THIS job:

{jobDescription}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({ jobDescription });
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return {
      detected_industry: "unknown",
      role_type: "unknown",
      personality_traits: [],
      work_environment: "",
      company_culture: "",
      key_requirements: [],
      red_flags: [],
      green_flags: []
    };
  }
}

/**
 * ✅ MAIN V1 GENERATOR (RAG + Questions)
 */
export async function generateCoverLetterV1(input: CoverLetterV1Input): Promise<CoverLetterV1Output> {
  try {
    console.log("🔍 V1: Flexible analysis...");
    console.log(`   - skipQuestions: ${input.skipQuestions}`);

    // ✅ TALLENNETAAN smartAnalysis MUUTTUJAAN (scope koko funktion laajuinen)
    let smartAnalysis: any = null;

    // ✅ STEP 0: Smart analysis (JOS EI SKIP)
    if (!input.skipQuestions) {
      smartAnalysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          name: input.name,
          workExperience: input.workExperience,
          education: input.education,
          skills: input.skills,
          workingStyle: input.workingStyle,
          problemSolving: input.problemSolving,
          uniqueStrength: input.uniqueStrength,
          careerGoals: input.careerGoals,
          bestProjectExample: input.bestProjectExample,
          failureLesson: input.failureLesson,
          personalNotes: input.personalNotes
        },
        language: input.language || 'finnish'
      });

      // KYSYTÄÄNKÖ?
      if (smartAnalysis.shouldAskQuestions && smartAnalysis.questions.length > 0) {
        console.log(`❓ Generated ${smartAnalysis.questions.length} questions`);
        
        return {
          content: "",
          title: "Lisätietoja tarvitaan",
          signature: input.name,
          questions: smartAnalysis.questions,
          needsMoreInfo: true,
          data_quality: {
            quality: smartAnalysis.confidence > 70 ? 'moderate' : 'minimal',
            score: smartAnalysis.confidence,
            reasoning: smartAnalysis.reasoning,
            personalityCompleteness: smartAnalysis.confidence,
            suggestions: smartAnalysis.questions.map((q: SmartQuestion) => q.question)
          }
        };
      }

      console.log("✅ Profile sufficient");
    } else {
      console.log("⏭️ Skipping question analysis (skipQuestions=true)");
    }

    console.log("🚀 Analyzing job...");

    // STEP 1: Analyze job
    const jobAnalysis = await analyzeJobForPersonalityFit(input.jobDescription);
    console.log(`📊 Detected: ${jobAnalysis.detected_industry}, ${jobAnalysis.role_type}`);

    // ✅ STEP 2: LOAD RAG CONTEXT
    let knowledgeContext = '';
    
    if (input.enableRAG) {
      try {
        knowledgeContext = await buildAIContext({
          jobDescription: input.jobDescription,
          userProfile: {
            workExperience: input.workExperience,
            education: input.education,
            skills: input.skills,
            workingStyle: input.workingStyle,
            problemSolving: input.problemSolving,
            uniqueStrength: input.uniqueStrength,
            learningStyle: input.learningStyle,
            teamRole: input.teamRole,
            superpower: input.superpower,
            careerGoals: input.careerGoals,
            bestProjectExample: input.bestProjectExample,
            failureLesson: input.failureLesson,
          },
          enableRAG: true,
          contentType: 'cover_letter'
        });
        console.log('✅ RAG loaded (cover_letter type)');
      } catch (error) {
        console.warn('⚠️ RAG failed:', error);
      }
    }

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    // ✅ STEP 3: BUILD PROMPT
    const systemPrompt = `You are writing a cover letter for THIS SPECIFIC job.

**DETECTED CONTEXT:**
Industry: {detectedIndustry}
Role Level: {roleType}
Work Environment: {workEnvironment}
Company Culture: {companyCulture}

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE BASE (PRO - Cover Letter Specific)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GROUND TRUTH - CANDIDATE'S ACTUAL SKILLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ALLOWED SKILLS:**
{allowedSkills}

**FORBIDDEN CLAIMS:**
{forbiddenClaims}

**YOUR MISSION:**
1. Match personality to THIS job
2. Use ONLY allowedSkills
3. Show fit through authentic stories
4. 280-350 words

**STRUCTURE:**
1. Opening: Hook + fit
2. Body 1: Authentic story showing trait
3. Body 2: Experience/skills match
4. Closing: Enthusiasm

**FORBIDDEN:**
- Skills not in allowedSkills
- Generic phrases
- Industry stereotypes
- False claims

**OUTPUT:**
{{
  "content": "full letter",
  "title": "job title",
  "signature": "name",
  "personality_hooks": ["trait1", "trait2"],
  "job_match_score": 1-10,
  "key_differentiators": ["unique1", "unique2"]
}}

Return JSON.`;

    const humanTemplate = `Generate cover letter.

**JOB:**
{jobDescription}

**JOB ANALYSIS:**
Industry: {detectedIndustry}
Traits: {personalityTraits}
Environment: {workEnvironment}
Culture: {companyCulture}
Requirements: {keyRequirements}
Red Flags: {redFlags}
Green Flags: {greenFlags}

**CANDIDATE:**
Name: {name}
Goal: {jobTitle}
Education: {education}
Experience: {workExperience}
Skills: {skills}

**GROUND TRUTH:**
ALLOWED: {allowedSkills}
FORBIDDEN: {forbiddenClaims}

**PERSONALITY:**
Style: {workingStyle}
Problem Solving: {problemSolving}
Energy: {energySources}
Strength: {uniqueStrength}
Learning: {learningStyle}
Team: {teamRole}
Values: {valuesExample}
Identity: {superpower}

**STORIES:**
Goals: {careerGoals}
Best: {bestProjectExample}
Learning: {failureLesson}

**PERSONAL NOTES (TOP PRIORITY):**
{personalNotes}

Return JSON with cover letter.`;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanTemplate],
    ]);

    const formatted = await prompt.formatMessages({
      detectedIndustry: jobAnalysis.detected_industry,
      roleType: jobAnalysis.role_type,
      workEnvironment: jobAnalysis.work_environment,
      companyCulture: jobAnalysis.company_culture,
      allowedSkills: input.allowedSkills?.join(", ") || "All from profile",
      forbiddenClaims: input.forbiddenClaims?.join(", ") || "None",
      jobDescription: input.jobDescription,
      personalityTraits: jobAnalysis.personality_traits.join(", ") || "Not specified",
      keyRequirements: jobAnalysis.key_requirements.join(", ") || "Not specified",
      redFlags: jobAnalysis.red_flags.join(", ") || "None",
      greenFlags: jobAnalysis.green_flags.join(", ") || "None",
      name: input.name,
      jobTitle: input.jobTitle || "Not specified",
      education: input.education || "Not specified",
      workExperience: input.workExperience || "Not specified",
      skills: input.skills || "Not specified",
      workingStyle: input.workingStyle || "Not specified",
      problemSolving: input.problemSolving || "Not specified",
      energySources: input.energySources || "Not specified",
      uniqueStrength: input.uniqueStrength || "Not specified",
      learningStyle: input.learningStyle || "Not specified",
      teamRole: input.teamRole || "Not specified",
      valuesExample: input.valuesExample || "Not specified",
      superpower: input.superpower || "Not specified",
      careerGoals: input.careerGoals || "Not specified",
      bestProjectExample: input.bestProjectExample || "Not specified",
      failureLesson: input.failureLesson || "Not specified",
      personalNotes: input.personalNotes || "Not specified",
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);

    // ✅ FORMAT CONTENT
    const formattedContent = (parsed.content || '')
      .replace(/\*\*/g, "")
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      content: formattedContent,
      title: parsed.title || "Cover Letter",
      signature: parsed.signature || input.name,
      personality_hooks: parsed.personality_hooks || [],
      job_match_score: parsed.job_match_score || 7,
      key_differentiators: parsed.key_differentiators || [],
      // ✅ KORJATTU: Käytä smartAnalysis jos olemassa, muuten fallback
      data_quality: smartAnalysis ? {
        quality: smartAnalysis.confidence >= 80 ? 'rich' : smartAnalysis.confidence >= 50 ? 'moderate' : 'minimal',
        score: smartAnalysis.confidence,
        reasoning: smartAnalysis.reasoning,
        personalityCompleteness: smartAnalysis.confidence,
        suggestions: []
      } : {
        quality: 'moderate',
        score: 70,
        reasoning: 'Generated with skipQuestions=true',
        personalityCompleteness: 70,
        suggestions: []
      }
    };
  } catch (error) {
    console.error("V1 Generation failed:", error);
    throw error;
  }
}