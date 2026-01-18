// lib/langchain/generalCoverLetterGenerator.ts - FINAL CORRECTED

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";
const GENERATOR_VERSION = '2025-01-17-V4-FIXED';
console.log(`🔍 GENERAL VERSION: ${GENERATOR_VERSION}`);
// ═══════════════════════════════════════════════════════════════
// SCHEMA
// ═══════════════════════════════════════════════════════════════

const generalCoverLetterSchema = z.object({
  content: z.string(),
  title: z.string(),
  keyHighlights: z.object({
    professionalIdentity: z.string(),
    coreStrengths: z.array(z.string()),
    careerGoals: z.string(),
    uniqueValue: z.string(),
  }).optional(),
});

const outputParser = StructuredOutputParser.fromZodSchema(generalCoverLetterSchema);

// ═══════════════════════════════════════════════════════════════
// TYPES (KORJATTU - SISÄLTÄÄ KAIKKI KENTÄT)
// ═══════════════════════════════════════════════════════════════

export interface GeneralCoverLetterInput {
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  workExperience?: string;
  education?: string;
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
  targetIndustry?: string;
  targetRole?: string;
  language?: string;
  style?: "formal" | "casual";
  
  // ✅ LISÄTTY PUUTTUVAT KENTÄT:
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  userId?: string;
  skipQuestions?: boolean;
}

export interface GeneralCoverLetterResult {
  content: string;
  title: string;
  signature: string;
  questions?: any[]; // ✅ LISÄTTY: SmartAnalysis voi palauttaa kysymyksiä
  keyHighlights?: {
    professionalIdentity: string;
    coreStrengths: string[];
    careerGoals: string;
    uniqueValue: string;
  };
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════
import { BUILD_ID } from '@/lib/buildId';

const VERSION = `NUCLEAR-${BUILD_ID}-GENERAL`;
console.log(`🔥 GENERAL VERSION: ${VERSION}`);

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  console.log(`🚀 Starting ${VERSION}`);

  console.log("🎯 Generating GENERAL cover letter");

  // ─────────────────────────────────────────────────────────────
  // SMART QUESTION ANALYSIS (PREVENTS HALLUCINATIONS)
  // ─────────────────────────────────────────────────────────────
  if (!input.skipQuestions) {
    console.log('🧠 Running smart analysis for general letter...');
    
    try {
      const { analyzeJobAndProfile } = await import("./smartQuestionAnalyzer");
      
      const syntheticJobDescription = `
General application
Target role: ${input.targetRole || "Various roles"}
Industry: ${input.targetIndustry || "Multiple industries"}
      `.trim();

      // 🛡️ DEFENSIVE WRAPPER
      let smartAnalysis;
      try {
        const rawAnalysis = await analyzeJobAndProfile({
          jobDescription: syntheticJobDescription,
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
          },
          language: input.language || "finnish",
          userId: input.userId,
        });

        // 🛡️ NORMALIZE - CRITICAL FIX
        smartAnalysis = {
          shouldAskQuestions: rawAnalysis?.shouldAskQuestions ?? false,
          canGenerateWithoutQuestions: rawAnalysis?.canGenerateWithoutQuestions ?? true,
          confidence: rawAnalysis?.confidence ?? 70,
          questions: Array.isArray(rawAnalysis?.questions) ? rawAnalysis.questions : [], // ✅ TURVATTU
          reasoning: rawAnalysis?.reasoning ?? 'Analysis completed'
        };
      } catch (error) {
        console.error('⚠️ General SmartAnalysis failed:', error);
        smartAnalysis = {
          shouldAskQuestions: false,
          canGenerateWithoutQuestions: true,
          confidence: 70,
          questions: [], // ✅ AINA ARRAY
          reasoning: 'Analysis failed'
        };
      }

      // ✅ NYT TÄMÄ ON AINA ARRAY - EI VOI CRASHATA
      const safeQuestions = smartAnalysis.questions;

      console.log('🧠 General SmartAnalysis:', {
        shouldAsk: smartAnalysis.shouldAskQuestions,
        questionsCount: safeQuestions.length, // ✅ SAFE
        confidence: smartAnalysis.confidence
      });

      // ✅ TURVATTU FILTER
      if (smartAnalysis.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(
          q => q && q.priority === "critical"
        );

        if (criticalQuestions.length > 0) {
          console.log(`❓ General: Returning ${criticalQuestions.length} critical questions`);

          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            questions: criticalQuestions,
            keyHighlights: {
              professionalIdentity: "",
              coreStrengths: [],
              careerGoals: "",
              uniqueValue: "",
            },
          };
        }
      }

      console.log('✅ General: Profile sufficient');
      
    } catch (error) {
      console.error('⚠️ General: SmartAnalysis failed, continuing safely:', error);
    }
  } else {
    console.log('⏭️ General: Skipping questions (skipQuestions=true)');
  }
  // ─────────────────────────────────────────────────────────────
  // RAG CONTEXT (OPTIONAL - ONLY IF ENABLED)
  // ─────────────────────────────────────────────────────────────

  let knowledgeContext = "";

  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: `General introduction for ${input.targetRole || "professional roles"}`,
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
        contentType: "cover_letter",
      });

      console.log("📚 RAG context loaded");
    } catch (error) {
      console.warn("⚠️ RAG failed, continuing without it", error);
    }
  } else {
    console.log("📋 RAG disabled for this tier");
  }

  // ─────────────────────────────────────────────────────────────
  // MODEL
  // ─────────────────────────────────────────────────────────────

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const styleInstructions =
    input.style === "casual"
      ? "Conversational yet professional"
      : "Professional and confident";

  // ─────────────────────────────────────────────────────────────
  // PROMPT (FULLY DYNAMIC)
  // ─────────────────────────────────────────────────────────────

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are writing a MODERN general professional introduction letter.

${knowledgeContext ? `**EXPERT KNOWLEDGE:**\n${knowledgeContext}\n` : ''}

${input.allowedSkills && input.allowedSkills.length > 0 ? `
**VERIFIED SKILLS (USE ONLY THESE):**
${input.allowedSkills.join(", ")}
` : ''}

${input.forbiddenClaims && input.forbiddenClaims.length > 0 ? `
**FORBIDDEN CLAIMS (NEVER MENTION):**
${input.forbiddenClaims.join(", ")}
` : ''}

LANGUAGE: {language}
STYLE: {styleInstructions}

**CRITICAL RULES:**
- NO FABRICATION - use only verified information
- NO HARDCODING - adapt to each person
- Be authentic and genuine

{format_instructions}`,
    ],
    [
      "human",
      `CANDIDATE:
Name: {name}

BACKGROUND:
Experience: {workExperience}
Education: {education}
Skills: {skills}

PERSONALITY:
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

GOALS:
Career goals: {careerGoals}
Target role: {targetRole}
Target industry: {targetIndustry}

Return JSON with fields: content, title, keyHighlights.`,
    ],
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language || "finnish",
      styleInstructions,
      name: input.name,
      workExperience: input.workExperience || "Developing experience",
      education: input.education || "Relevant background",
      skills: input.skills || "Versatile skills",
      workingStyle: input.workingStyle || "Adaptable",
      problemSolving: input.problemSolving || "Analytical",
      uniqueStrength: input.uniqueStrength || "Committed",
      careerGoals: input.careerGoals || "Professional growth",
      targetRole: input.targetRole || "various roles",
      targetIndustry: input.targetIndustry || "multiple industries",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    const rawContent =
      typeof result.content === "string"
        ? result.content
        : JSON.stringify(result.content);

    const clean = rawContent.replace(/```json|```/g, "").trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON returned by model");

    const parsed = await outputParser.parse(jsonMatch[0]);

    console.log('✅ General cover letter generated');

    return {
      content: parsed.content,
      title: parsed.title,
      signature: input.name,
      questions: [], // ✅ LISÄTTY: Ei kysymyksiä kun generointi onnistuu
      keyHighlights: parsed.keyHighlights,
    };
  } catch (error) {
    console.error("❌ General cover letter generation failed", error);
    throw error;
  }
}