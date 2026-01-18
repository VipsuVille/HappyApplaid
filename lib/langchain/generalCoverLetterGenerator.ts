// lib/langchain/generalCoverLetterGenerator.ts
// 🔥 FORCE NEW CHUNK HASH - V20250119_0005
const FORCE_REBUILD = 'v20250119_0005';

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";
import { BUILD_ID } from '@/lib/buildId';

const VERSION = `SAFE-GENERAL-V5-${BUILD_ID}`;
console.log(`🚀 LOADING GENERATOR: ${VERSION}`);

// ═══════════════════════════════════════════════════════════════
// SCHEMA & TYPES
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

export interface GeneralCoverLetterInput {
  name: string;
  email: string;
  phone: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  careerGoals?: string;
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

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ═══════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  console.log(`🚀 Executing ${VERSION}`);

  // 1. SMART QUESTION ANALYSIS (SAFE WRAPPER)
  if (!input.skipQuestions) {
    try {
      const { analyzeJobAndProfile } = await import("./smartQuestionAnalyzer");
      
      const syntheticJobDescription = `General application for ${input.targetRole || "professional roles"} in ${input.targetIndustry || "various industries"}`;

      const rawAnalysis = await analyzeJobAndProfile({
        jobDescription: syntheticJobDescription,
        userProfile: {
          name: input.name,
          workExperience: input.workExperience || "",
          education: input.education || "",
          skills: input.skills || "",
        },
        language: input.language || "finnish",
        userId: input.userId,
      });

      // 🛡️ Varmistetaan että questions on AINA taulukko, vaikka importattu koodi palauttaisi mitä
      const safeQuestions = Array.isArray(rawAnalysis?.questions) ? rawAnalysis.questions : [];
      const shouldAsk = rawAnalysis?.shouldAskQuestions === true;

      if (shouldAsk && safeQuestions.length > 0) {
        // Nyt .filter() on turvallinen koska safeQuestions on taulukko
        const criticalQuestions = safeQuestions.filter(q => q && q.priority === "critical");

        if (criticalQuestions.length > 0) {
          console.log(`❓ Returning ${criticalQuestions.length} critical questions`);
          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            questions: criticalQuestions,
          };
        }
      }
    } catch (error) {
      console.error('⚠️ SmartAnalysis safe-skip due to error:', error);
      // Jos analyysi epäonnistuu, ei kaadeta koko prosessia vaan jatketaan generointiin
    }
  }

  // 2. KNOWLEDGE CONTEXT (RAG)
  let knowledgeContext = "";
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: "General introduction",
        userProfile: input,
        enableRAG: true,
        contentType: "cover_letter",
      });
    } catch (e) {
      console.warn("RAG failed, skipping");
    }
  }

  // 3. GENERATION
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Kirjoita ammattimainen ja vakuuttava avoin hakukirje. ${knowledgeContext}`],
    ["human", `Nimi: {name}\nKokemus: {workExperience}\nKoulutus: {education}\nOsaaminen: {skills}\nTavoite: {targetRole}\n\n{format_instructions}`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: input.name,
      workExperience: input.workExperience || "Työkokemusta",
      education: input.education || "Koulutustausta",
      skills: input.skills || "Eri taitoja",
      targetRole: input.targetRole || "sopiva rooli",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    const parsed = await outputParser.parse(result.content as string);

    return {
      content: parsed.content,
      title: parsed.title,
      signature: input.name,
      questions: [],
      keyHighlights: parsed.keyHighlights,
    };
  } catch (error) {
    console.error("❌ Generation failed", error);
    throw error;
  }
}