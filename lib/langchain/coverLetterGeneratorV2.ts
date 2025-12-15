// lib/langchain/coverLetterGeneratorV2.ts - KORJATTU TYYPITYS

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { analyzeJobAndProfile, type SmartQuestion } from "./smartQuestionAnalyzer";
import type { GroundTruth } from "@/lib/ats/masterGuardian";
import { buildAIContext } from "@/lib/knowledge";

// ✅ SCHEMA
const coherentCoverLetterSchema = z.object({
  fullText: z.string().optional(),
  questions: z.array(z.object({
    id: z.string(),
    question: z.string(),
    why: z.string(),
    context: z.string(),
    priority: z.enum(['critical', 'important', 'helpful'])
  })).optional(),
  keyPoints: z.object({
    personalityHook: z.string(),
    experienceHighlight: z.string(),
    skillsMatch: z.string(),
    motivation: z.string(),
  }).optional(),
  atsData: z.object({
    matchedKeywords: z.array(z.string()),
    missingExperience: z.boolean(),
    compensationUsed: z.string().optional(),
    readabilityScore: z.number().min(1).max(10),
  }).optional(),
});

type CoherentCoverLetter = z.infer<typeof coherentCoverLetterSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(coherentCoverLetterSchema);

/**
 * ✅ ANALYZE JOB
 */
async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = `You are analyzing a UNIQUE job posting. NO predefined assumptions.

**DETECT:**
- Industry (infer from text)
- Company size (infer from text)
- Keywords (extract semantically)
- Required skills (extract from text)
- Experience level (infer from text)

Job Posting:
${jobDescription}

Return JSON:
{
  "detected_industry": "industry name",
  "company_size": "startup|small|medium|large|enterprise",
  "keywords": ["keyword1", "keyword2"],
  "required_skills": ["skill1", "skill2"],
  "required_experience": "X years" or "Entry level",
  "company_name": "Company Name",
  "job_title": "Job Title"
}`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { 
      detected_industry: "unknown",
      company_size: "unknown",
      keywords: [], 
      required_skills: [], 
      required_experience: "Not specified", 
      company_name: "the company", 
      job_title: "this position" 
    };
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return { 
      detected_industry: "unknown",
      company_size: "unknown",
      keywords: [], 
      required_skills: [], 
      required_experience: "Not specified",       company_name: "the company", 
      job_title: "this position" 
    };
  }
}

/**
 * ✅ MAIN GENERATOR - KORJATTU TYYPITYS
 */
export async function generateCoherentCoverLetter(input: {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  workExperience?: string;
  education?: string;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;
  personalNotes?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  language?: string;
  style?: "formal" | "casual";
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  
  // ✅ LISÄTTY PUUTTUVAT KENTÄT:
  skipQuestions?: boolean;
  answeredQuestions?: Record<string, string>;
  userId?: string; // ✅ TÄMÄ PUUTTUI!
}) {
  console.log('🔍 V2: Flexible job-profile analysis (ATS + RAG)...');
  
  // ✅ KORJAUS: Jos skipQuestions=true, ohita kysymysanalyysi KOKONAAN
  if (input.skipQuestions) {
    console.log('⏭️ Skipping question analysis (skipQuestions=true)');
  } else {
    // ✅ STEP 0: Smart analysis - NYT KÄYTTÄÄ userId:tä
    const smartAnalysis = await analyzeJobAndProfile({
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
      userId: input.userId // ✅ VÄLITÄ userId ANALYZERILLE
    });
    // KYSYTÄÄNKÖ?
    if (smartAnalysis.shouldAskQuestions && smartAnalysis.questions.length > 0) {
      const criticalQuestions = smartAnalysis.questions.filter(
        q => q.priority === 'critical'
      );
      
      if (criticalQuestions.length > 0) {
        console.log(`❓ Found ${criticalQuestions.length} critical questions`);
        
        return {
          fullText: "",
          content: "",
          title: "Lisätietoja tarvitaan",
          signature: input.name,
          questions: criticalQuestions,
          keyPoints: {
            personalityHook: "",
            experienceHighlight: "",
            skillsMatch: "",
            motivation: ""
          },
          atsData: {
            matchedKeywords: [],
            missingExperience: true,
            readabilityScore: 0
          },
          hasWorkExperience: false,
          needsMoreInfo: true
        };
      }
    }
  }

  console.log('✅ Profile sufficient OR questions skipped');
  console.log('🔍 Analyzing job...');
  
  // STEP 1: Analyze job
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);
  console.log(`📊 Detected: ${jobAnalysis.detected_industry}, ${jobAnalysis.company_size}`);

  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;

  // ✅ STEP 2: LOAD RAG CONTEXT
  let knowledgeContext = '';
  
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: input.jobDescription,
        userProfile: {
          workExperience: input.workExperience || "Not specified",
          education: input.education || "Not specified",
          skills: input.skills || "Not specified",
          workingStyle: input.workingStyle || "Not specified",
          problemSolving: input.problemSolving || "Not specified",
          uniqueStrength: input.uniqueStrength || "Not specified",
          learningStyle: input.learningStyle || "Not specified",
          teamRole: input.teamRole || "Not specified",
          superpower: input.superpower || "Not specified",
          careerGoals: input.careerGoals || "Not specified",
          bestProjectExample: input.bestProjectExample || "Not specified",
          failureLesson: input.failureLesson || "Not specified",
        },
        enableRAG: true,
        contentType: 'cover_letter'
      });
      console.log('✅ RAG context loaded');
    } catch (error) {
      console.warn('⚠️ RAG failed, continuing without:', error);
      knowledgeContext = '';
    }
  } else {
    console.log('📋 RAG disabled');
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const styleInstructions = input.style === 'casual' 
    ? `TONE: Conversational yet professional.`
    : `TONE: Professional and structured.`;

  const ageInstruction = input.age 
    ? `OPENING: Start with age and professional identity.`
    : `OPENING: Start with professional identity.`;

  // ✅ STEP 3: BUILD PROMPT
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are writing an ATS-optimized cover letter for THIS SPECIFIC job.

**DETECTED JOB CONTEXT:**
Industry: {detectedIndustry}
Company Size: {companySize}
ATS Keywords: {keywords}
Requirements: {requiredSkills}

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE BASE (PRO Feature)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GROUND TRUTH - CANDIDATE'S ACTUAL SKILLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ALLOWED SKILLS (candidate has):**
{allowedSkills}

**FORBIDDEN CLAIMS (candidate does NOT have):**
{forbiddenClaims}

**VERIFICATION PROTOCOL:**
NEVER fabricate skills. Use ONLY allowedSkills.

**YOUR MISSION:**
1. Match candidate to THIS job
2. Use ONLY allowedSkills
3. Natural ATS keyword integration
4. MAX 350 words

**LANGUAGE:** {language}
**STYLE:** {styleInstructions}

{format_instructions}`],

    ["human", `Generate cover letter.

**JOB:**
{jobDescription}

**JOB ANALYSIS:**
Industry: {detectedIndustry}
Keywords: {keywords}
Skills Needed: {requiredSkills}
Experience: {experienceLevel}
Company: {companyName}
Role: {jobTitle}

**CANDIDATE:**
Name: {name}
Age: {age}
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
Identity: {superpower}
Values: {valuesExample}

**STORIES:**
Goals: {careerGoals}
Best Project: {bestProjectExample}
Learning: {failureLesson}

**PERSONAL NOTES (TOP PRIORITY):**
{personalNotes}

{ageInstruction}

Return JSON with ONLY "fullText" field. Do NOT return "questions".`]
  ]);

  try {
    const formattedPrompt = await prompt.formatMessages({
      detectedIndustry: jobAnalysis.detected_industry,
      companySize: jobAnalysis.company_size,
      keywords: jobAnalysis.keywords.join(", ") || "Not specified",
      requiredSkills: jobAnalysis.required_skills.join(", ") || "Not specified",
      experienceLevel: jobAnalysis.required_experience,
      companyName: jobAnalysis.company_name,
      jobTitle: jobAnalysis.job_title,
      styleInstructions,
      language: input.language || "Finnish",
      jobDescription: input.jobDescription || "Not specified",
      name: input.name || "Not specified",
      age: input.age ? `${input.age} years` : 'Not specified',
      workExperience: input.workExperience || "Limited formal experience",
      education: input.education || "Not specified",
      skills: input.skills || "Developing",
      allowedSkills: input.allowedSkills?.join(", ") || "All skills from profile",
      forbiddenClaims: input.forbiddenClaims?.join(", ") || "None",
      workingStyle: input.workingStyle || "Not specified",
      problemSolving: input.problemSolving || "Not specified",
      energySources: input.energySources || "Not specified",
      uniqueStrength: input.uniqueStrength || "Not specified",
      learningStyle: input.learningStyle || "Not specified",
      teamRole: input.teamRole || "Not specified",
      superpower: input.superpower || "Not specified",
      valuesExample: input.valuesExample || "Not specified",
      careerGoals: input.careerGoals || "Not specified",
      bestProjectExample: input.bestProjectExample || "Not specified",
      failureLesson: input.failureLesson || "Not specified",
      personalNotes: input.personalNotes || "Not specified",
      ageInstruction,
      format_instructions: outputParser.getFormatInstructions(),
});
const result = await model.invoke(formattedPrompt);
const content = typeof result.content === 'string' 
  ? result.content 
  : JSON.stringify(result.content);

const cleanContent = content
  .replace(/```json/g, '')
  .replace(/```/g, '')
  .trim();

const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error('No valid JSON');

const parsed = await outputParser.parse(jsonMatch[0]);

// ✅ KORJAUS: Jos AI palautti kysymyksiä vaikka skipQuestions=true, IGNOROI NE
if (input.skipQuestions && parsed.questions && parsed.questions.length > 0) {
  console.warn(`⚠️ AI returned ${parsed.questions.length} questions despite skipQuestions=true - IGNORING`);
  parsed.questions = []; // Tyhjennä kysymykset
}

// ✅ NORMAL: Return letter
return {
  fullText: parsed.fullText,
  content: parsed.fullText,
  title: jobAnalysis.job_title || "Cover Letter",
  signature: input.name,
  keyPoints: parsed.keyPoints || {
    personalityHook: "",
    experienceHighlight: "",
    skillsMatch: "",
    motivation: ""
  },
  atsData: parsed.atsData || {
    matchedKeywords: [],
    missingExperience: false,
    readabilityScore: 7
  },
  jobAnalysis,
  hasWorkExperience,
};
} catch (error) {
console.error('❌ V2 Generator error:', error);
throw new Error("Generator failed:");
}
}
export function generateATSReport(data: { atsData: CoherentCoverLetter['atsData'] }) {
return {
keywords_used: data.atsData?.matchedKeywords.length || 0,
total_keywords: data.atsData?.matchedKeywords.length || 0,
keyword_match_score: Math.round(((data.atsData?.matchedKeywords.length || 0) / 15) * 100),
ats_compatibility_score: (data.atsData?.readabilityScore || 5) * 10,
critical_keywords_used: data.atsData?.matchedKeywords || [],
missing_keywords: [],
improvement_suggestions: [
(data.atsData?.matchedKeywords.length || 0) < 8
? "Consider adding more relevant terms"
: "Good keyword coverage",
(data.atsData?.readabilityScore || 5) < 6
? "Simplify language"
: "Good readability",
],
};
}