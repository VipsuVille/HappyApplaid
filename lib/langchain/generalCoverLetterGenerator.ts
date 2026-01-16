// lib/langchain/generalCoverLetterGenerator.ts - KORJATTU & TURVALLINEN VERSIO

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ───────────────────────────────────────────────────────────────
// SCHEMA
// ───────────────────────────────────────────────────────────────

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

type GeneralCoverLetterOutput = z.infer<typeof generalCoverLetterSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(generalCoverLetterSchema);

// ───────────────────────────────────────────────────────────────
// TYPES
// ───────────────────────────────────────────────────────────────

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
  questions?: any[];
  keyHighlights?: {
    professionalIdentity: string;
    coreStrengths: string[];
    careerGoals: string;
    uniqueValue: string;
  };
}

// ───────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ───────────────────────────────────────────────────────────────

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {

  console.log("🎯 Generating GENERAL cover letter");

  // ─────────────────────────────────────────────────────────────
  // SMART QUESTION ANALYSIS (TURVALLINEN)
  // ─────────────────────────────────────────────────────────────

  if (!input.skipQuestions) {
    try {
      const syntheticJobDescription = `
General application
Target role: ${input.targetRole || "Various roles"}
Industry: ${input.targetIndustry || "Multiple industries"}
      `.trim();

      const smartAnalysis = await analyzeJobAndProfile({
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

      // 🔍 VISIBILITY LOGS (TÄRKEÄ)
      console.log("🧠 SMART ANALYSIS (GENERAL)", {
        shouldAskQuestions: smartAnalysis?.shouldAskQuestions,
        questionsType: typeof smartAnalysis?.questions,
        isArray: Array.isArray(smartAnalysis?.questions),
        questionsValue: smartAnalysis?.questions,
      });

      // ✅ HARD NORMALIZATION (KORJAA BUGISI)
      const safeQuestions = Array.isArray(smartAnalysis?.questions)
        ? smartAnalysis.questions
        : [];

      if (smartAnalysis?.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(
          q => q?.priority === "critical"
        );

        if (criticalQuestions.length > 0) {
          console.log(
            `❓ General: returning ${criticalQuestions.length} critical questions`
          );

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
    } catch (error) {
      console.error(
        "⚠️ General: smart question analysis failed, continuing safely",
        error
      );
    }
  } else {
    console.log("⏭️ General: skipQuestions=true");
  }

  // ─────────────────────────────────────────────────────────────
  // RAG CONTEXT (OPTIONAL)
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
  // PROMPT
  // ─────────────────────────────────────────────────────────────

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are writing a MODERN general professional introduction letter.

${knowledgeContext}

LANGUAGE: {language}
STYLE: {styleInstructions}

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

GOALS:
Career goals: {careerGoals}

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
      careerGoals: input.careerGoals || "Professional growth",
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

    const parsed: GeneralCoverLetterOutput = await outputParser.parse(
      jsonMatch[0]
    );

    return {
      content: parsed.content,
      title: parsed.title,
      signature: input.name,
      questions: [],
      keyHighlights: parsed.keyHighlights,
    };
  } catch (error) {
    console.error("❌ General cover letter generation failed", error);
    throw error;
  }
}
