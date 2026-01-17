// lib/langchain/generalCoverLetterGenerator.ts - FINAL CORRECTED

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

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
// TYPES
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
  userId?: string;
}

export interface GeneralCoverLetterResult {
  content: string;
  title: string;
  signature: string;
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

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {

  console.log("🎯 Generating GENERAL cover letter");

  // RAG context (optional)
  let knowledgeContext = "";

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

  // Model
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const styleInstructions =
    input.style === "casual"
      ? "Conversational yet professional"
      : "Professional and confident";

  // Prompt
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
      keyHighlights: parsed.keyHighlights,
    };
  } catch (error) {
    console.error("❌ General cover letter generation failed", error);
    throw error;
  }
}