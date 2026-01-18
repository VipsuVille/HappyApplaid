// lib/langchain/coverLetterGeneratorV2.ts - FINAL WITH SMARTANALYSIS

const FORCE_REBUILD = 'v20250119_0002';


import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
const GENERATOR_VERSION = '2025-01-17-V4-FIXED';
console.log(`🔍 GENERAL VERSION: ${GENERATOR_VERSION}`);
// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CoverLetterV2Input {
  jobDescription: string;
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual";
  
  name: string;
  email: string;
  phone: string;
  age?: number;
  
  education?: string;
  workExperience?: string;
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
  
  userId?: string;
  skipQuestions?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════

const v2Schema = z.object({
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

const outputParser = StructuredOutputParser.fromZodSchema(v2Schema);

// ═══════════════════════════════════════════════════════════════
// JOB ANALYZER (DYNAMIC - NO HARDCODING)
// ═══════════════════════════════════════════════════════════════

async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = `You are analyzing a UNIQUE job posting. NO predefined assumptions.

**DETECT FROM TEXT:**
- Industry (infer semantically)
- Company size (infer from text)
- Keywords (extract from actual text)
- Required skills (extract from text)
- Experience level (infer from text)

Job Posting:
${jobDescription}

Return JSON:
{
  "detected_industry": "actual industry from text",
  "company_size": "startup|small|medium|large|enterprise",
  "keywords": ["actual", "keywords", "from", "text"],
  "required_skills": ["actual", "skills", "mentioned"],
  "required_experience": "X years or Entry level",
  "company_name": "Actual Company Name",
  "job_title": "Actual Job Title"
}`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return {
        detected_industry: "unknown",
        company_size: "unknown",
        keywords: [],
        required_skills: [],
        required_experience: "Not specified",
        company_name: "the company",
        job_title: "this position"
      };
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return {
      detected_industry: "unknown",
      company_size: "unknown",
      keywords: [],
      required_skills: [],
      required_experience: "Not specified",
      company_name: "the company",
      job_title: "this position"
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR (FULLY DYNAMIC)
// ═══════════════════════════════════════════════════════════════

export async function generateCoherentCoverLetter(input: CoverLetterV2Input) {
  console.log('🔍 V2: Flexible job-profile analysis (ATS + RAG)...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 0: SMART QUESTION ANALYSIS (CRITICAL - PREVENTS HALLUCINATIONS)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
if (!input.skipQuestions) {
    console.log('🧠 Running smart analysis...');
    
    try {
      // 🛡️ DEFENSIVE WRAPPER - Prevents ANY crash possibility
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

        // 🛡️ NORMALIZE - CRITICAL: Takaa että questions on AINA array
        smartAnalysis = {
          shouldAskQuestions: rawAnalysis?.shouldAskQuestions ?? false,
          canGenerateWithoutQuestions: rawAnalysis?.canGenerateWithoutQuestions ?? true,
          confidence: rawAnalysis?.confidence ?? 70,
          questions: Array.isArray(rawAnalysis?.questions) ? rawAnalysis.questions : [], // ✅ EI VOI OLLA UNDEFINED
          reasoning: rawAnalysis?.reasoning ?? 'Analysis completed'
        };
      } catch (error) {
        console.error('⚠️ SmartAnalysis failed completely:', error);
        smartAnalysis = {
          shouldAskQuestions: false,
          canGenerateWithoutQuestions: true,
          confidence: 70,
          questions: [], // ✅ AINA ARRAY
          reasoning: 'Analysis failed, proceeding with available data'
        };
      }

      // ✅ NYT safeQuestions on AINA array - ei voi crashata
      const safeQuestions = smartAnalysis.questions;

      console.log('🧠 SmartAnalysis result:', {
        shouldAsk: smartAnalysis.shouldAskQuestions,
        questionsCount: safeQuestions.length, // ✅ SAFE
        confidence: smartAnalysis.confidence
      });

      // ✅ TURVATTU FILTER - ei voi enää kaatua
      if (smartAnalysis.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(
          q => q && q.priority === 'critical'
        );

        if (criticalQuestions.length > 0) {
          console.log(`❓ V2: Returning ${criticalQuestions.length} critical questions`);

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

      console.log('✅ Profile sufficient OR questions skipped');
      
    } catch (error) {
      console.error('⚠️ SmartAnalysis failed, continuing safely:', error);
    }
  } else {
    console.log('⏭️ V2: Skipping questions (skipQuestions=true)');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: ANALYZE JOB (DYNAMIC - EXTRACTS FROM ACTUAL TEXT)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔍 Analyzing job posting...');
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);
  console.log(`📊 Detected: ${jobAnalysis.detected_industry}, ${jobAnalysis.company_size}`);

  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: BUILD RAG CONTEXT (OPTIONAL - PREMIUM FEATURE)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let knowledgeContext = '';
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
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: GENERATE COVER LETTER (FULLY DYNAMIC)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const styleInstructions = input.style === 'casual'
    ? 'Conversational yet professional'
    : 'Professional and structured';

  const ageInstruction = input.age
    ? 'OPENING: Start with age and professional identity.'
    : 'OPENING: Start with professional identity.';

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are writing an ATS-optimized cover letter for THIS SPECIFIC job.

**NO HARDCODING - ALL FROM ANALYSIS:**
Industry: {detectedIndustry}
Company: {companyName}
Role: {jobTitle}
Size: {companySize}
Keywords: {keywords}
Skills Needed: {requiredSkills}

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE BASE (PRO Feature)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

**YOUR MISSION:**
1. Match candidate to THIS specific job
2. Use ONLY verified skills from profile
3. Natural ATS keyword integration
4. MAX 350 words
5. NO FABRICATION - only what's in the profile

**LANGUAGE:** {language}
**STYLE:** {styleInstructions}

{format_instructions}`],

    ["human", `Generate cover letter.

**JOB DESCRIPTION:**
{jobDescription}

**DETECTED JOB INFO:**
Industry: {detectedIndustry}
Company: {companyName}
Role: {jobTitle}
Keywords: {keywords}
Skills: {requiredSkills}
Experience: {experienceLevel}

**CANDIDATE PROFILE:**
Name: {name}
Age: {age}
Education: {education}
Experience: {workExperience}
Skills: {skills}

**PERSONALITY:**
Style: {workingStyle}
Problem Solving: {problemSolving}
Energy: {energySources}
Strength: {uniqueStrength}
Learning: {learningStyle}
Team: {teamRole}
Identity: {superpower}
Values: {valuesExample}

**ACHIEVEMENTS:**
Goals: {careerGoals}
Best Project: {bestProjectExample}
Learning: {failureLesson}

**PERSONAL NOTES (TOP PRIORITY):**
{personalNotes}

{ageInstruction}

Return JSON with "fullText" field. Do NOT return "questions" (analysis phase is complete).`]
  ]);

  try {
    const formattedPrompt = await prompt.formatMessages({
      detectedIndustry: jobAnalysis.detected_industry,
      companySize: jobAnalysis.company_size,
      companyName: jobAnalysis.company_name,
      jobTitle: jobAnalysis.job_title,
      keywords: jobAnalysis.keywords.join(", ") || "Not specified",
      requiredSkills: jobAnalysis.required_skills.join(", ") || "Not specified",
      experienceLevel: jobAnalysis.required_experience,
      styleInstructions,
      language: input.language || "Finnish",
      jobDescription: input.jobDescription,
      name: input.name,
      age: input.age ? `${input.age} years` : 'Not specified',
      workExperience: input.workExperience || "Developing experience",
      education: input.education || "Not specified",
      skills: input.skills || "Developing",
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
    if (!jsonMatch) throw new Error('No valid JSON from V2');

    const parsed = await outputParser.parse(jsonMatch[0]);

    // 🛡️ SAFETY: If AI returned questions despite skipQuestions=true, ignore them
    if (input.skipQuestions && parsed.questions && parsed.questions.length > 0) {
      console.warn(`⚠️ AI returned questions despite skipQuestions=true - IGNORING`);
      parsed.questions = [];
    }

    console.log('✅ V2 generation complete');

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
    throw new Error("V2 generation failed");
  }
}

export function generateATSReport(data: { atsData: any }) {
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