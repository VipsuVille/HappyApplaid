// lib/langchain/personalityExtractor.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// YKSINKERTAINEN, KIELIAGNOSTINEN SKEEMA
const personalityExtractionSchema = z.object({
  workingStyle: z
    .object({
      extracted: z.string().describe("User's working style summarized"),
      confidence: z.number().min(0).max(1).describe("Confidence level 0-1"),
      keywords: z
        .array(z.string())
        .describe("Keywords that led to this interpretation"),
      businessValue: z.string().describe("How this creates business value"),
    })
    .optional(),

  problemSolving: z
    .object({
      extracted: z.string().describe("Problem-solving approach"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  energySources: z
    .object({
      extracted: z.string().describe("What energizes them at work"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  uniqueStrength: z
    .object({
      extracted: z.string().describe("Unique professional strength"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  learningStyle: z
    .object({
      extracted: z.string().describe("Learning approach"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  teamRole: z
    .object({
      extracted: z.string().describe("Role in team dynamics"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  valuesExample: z
    .object({
      extracted: z.string().describe("How values manifest in work"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  superpower: z
    .object({
      extracted: z.string().describe("Professional superpower/identifier"),
      confidence: z.number().min(0).max(1),
      keywords: z.array(z.string()),
      businessValue: z.string(),
    })
    .optional(),

  overallPersonality: z.object({
    summary: z.string().describe("Overall personality summary"),
    topTraits: z.array(z.string()).max(3).describe("Top 3 personality traits"),
    workplaceStrengths: z.array(z.string()).describe("Key workplace strengths"),
    detectedLanguage: z.string().describe("Primary language detected in input"),
  }),

  extractionQuality: z.object({
    completeness: z.number().min(0).max(1).describe("How complete the data is"),
    clarity: z.number().min(0).max(1).describe("How clear the data is"),
    businessRelevance: z.number().min(0).max(1).describe("Business relevance"),
    suggestions: z.array(z.string()).describe("Suggestions for improvement"),
  }),
});

type PersonalityExtraction = z.infer<typeof personalityExtractionSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(
  personalityExtractionSchema
);

// YKSINKERTAINEN, KIELIAGNOSTINEN PROMPT
const universalPersonalityPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a multilingual psychologist and HR specialist who analyzes personality traits from free-form text in ANY language.

CORE PRINCIPLES:
- Automatically detect and work with the input language
- Respond in the SAME language as the user's input
- Extract 8 key workplace personality traits
- Convert personality traits into concrete business value
- Assess confidence based on evidence strength in the text
- Provide actionable insights for workplace success

PERSONALITY TRAITS TO EXTRACT:
1. workingStyle: How they prefer to work (independent, collaborative, structured...)
2. problemSolving: Their approach to solving challenges
3. energySources: What motivates and energizes them at work
4. uniqueStrength: Their distinctive professional advantage
5. learningStyle: How they learn and develop skills best
6. teamRole: Their natural role in team dynamics
7. valuesExample: How their values show up in work situations
8. superpower: Their most recognizable professional trait

ANALYSIS REQUIREMENTS:
- Use ONLY information explicitly provided in the text
- Confidence below 0.3 means insufficient evidence - don't guess
- Extract specific keywords that support your interpretation
- Convert each trait into tangible business value
- Respond in the same language as the user's primary input
- Be concise but specific in extractions

Return structured JSON response.`,
  ],
  [
    "human",
    `Analyze the following user responses and extract personality traits. 
    
IMPORTANT: Respond in the SAME language as the user's primary language in their responses.

USER PROFILE DESCRIPTION:
{userProfile}

WORKING STYLE RESPONSE:
{workingStyleText}

PROBLEM-SOLVING RESPONSE:
{problemSolvingText}

ENERGY SOURCES RESPONSE:
{energySourcesText}

STRENGTHS RESPONSE:
{strengthsText}

LEARNING RESPONSE:
{learningText}

TEAMWORK RESPONSE:
{teamworkText}

VALUES RESPONSE:
{valuesText}

ADDITIONAL INFORMATION:
{additionalInfo}

{format_instructions}`,
  ],
]);

// PÄÄFUNKTIO - YKSINKERTAINEN JA TEHOKAS
export async function extractPersonalityTraits(
  input: PersonalityInput
): Promise<PersonalityExtraction> {
  const personalityModel = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  try {
    console.log("Analyzing personality traits (language-agnostic)...");

    const formattedPrompt = await universalPersonalityPrompt.formatMessages({
      userProfile: input.userProfile || "Not provided",
      workingStyleText: input.workingStyleText || "Not provided",
      problemSolvingText: input.problemSolvingText || "Not provided",
      energySourcesText: input.energySourcesText || "Not provided",
      strengthsText: input.strengthsText || "Not provided",
      learningText: input.learningText || "Not provided",
      teamworkText: input.teamworkText || "Not provided",
      valuesText: input.valuesText || "Not provided",
      additionalInfo: input.additionalInfo || "Not provided",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await personalityModel.invoke(formattedPrompt);
    const responseText = getMessageContent(result);

    const extraction = await outputParser.parse(responseText);

    console.log(
      `Personality extraction completed. Language: ${extraction.overallPersonality.detectedLanguage}`
    );
    console.log(
      `Data completeness: ${Math.round(
        extraction.extractionQuality.completeness * 100
      )}%`
    );

    return extraction;
  } catch (error) {
    console.error("Personality extraction failed:", error);

    // Simple fallback without language detection complexity
    return createSimpleFallback(input);
  }
}

// YKSINKERTAINEN FALLBACK
function createSimpleFallback(input: PersonalityInput): PersonalityExtraction {
  const allText = Object.values(input).join(" ");
  const traits = extractBasicKeywords(allText);

  return {
    overallPersonality: {
      summary: "Basic analysis based on available text",
      topTraits: traits.slice(0, 3),
      workplaceStrengths: ["Communication", "Adaptability", "Motivation"],
      detectedLanguage: "unknown",
    },
    extractionQuality: {
      completeness: 0.3,
      clarity: 0.4,
      businessRelevance: 0.5,
      suggestions: [
        "Provide more detailed examples of your work style",
        "Share specific situations that demonstrate your strengths",
        "Describe concrete examples of your problem-solving approach",
      ],
    },
  };
}

// AVAINSANOJEN TUNNISTUS (MONIKIELINEN)
function extractBasicKeywords(text: string): string[] {
  const traits = [];
  const lowerText = text.toLowerCase();

  // Itsenäisyys (useita kieliä)
  if (
    lowerText.match(
      /(independent|itsenäinen|självständig|independiente|indépendant)/
    )
  ) {
    traits.push("Independent");
  }

  // Tiimityö
  if (
    lowerText.match(/(team|tiimi|lag|equipo|équipe|collaborative|yhteistyö)/)
  ) {
    traits.push("Team-oriented");
  }

  // Ongelmanratkaisu
  if (
    lowerText.match(/(problem|ongelma|problema|problème|solve|ratkai|lösa)/)
  ) {
    traits.push("Problem-solver");
  }

  // Oppiminen
  if (lowerText.match(/(learn|oppi|lära|aprend|apprend|develop|kehit)/)) {
    traits.push("Learning-focused");
  }

  // Luovuus
  if (
    lowerText.match(/(creative|luova|kreativ|creativo|créatif|idea|innovation)/)
  ) {
    traits.push("Creative");
  }

  return traits.length > 0
    ? traits
    : ["Motivated", "Professional", "Adaptable"];
}

// Helper-funktiot
function getMessageContent(message: any): string {
  if (typeof message === "string") return message;
  if ("content" in message && typeof message.content === "string") {
    return message.content;
  }
  return JSON.stringify(message);
}

export interface PersonalityInput {
  userProfile?: string;
  workingStyleText?: string;
  problemSolvingText?: string;
  energySourcesText?: string;
  strengthsText?: string;
  learningText?: string;
  teamworkText?: string;
  valuesText?: string;
  additionalInfo?: string;
}

// LEGACY-YHTEENSOPIVUUS (sama kuin ennen)
export function convertToLegacyFormat(extraction: PersonalityExtraction): {
  workingStyle: string;
  problemSolving: string;
  energySources: string;
  uniqueStrength: string;
  learningStyle: string;
  teamRole: string;
  valuesExample: string;
  superpower: string;
} {
  return {
    workingStyle: extraction.workingStyle?.extracted || "",
    problemSolving: extraction.problemSolving?.extracted || "",
    energySources: extraction.energySources?.extracted || "",
    uniqueStrength: extraction.uniqueStrength?.extracted || "",
    learningStyle: extraction.learningStyle?.extracted || "",
    teamRole: extraction.teamRole?.extracted || "",
    valuesExample: extraction.valuesExample?.extracted || "",
    superpower: extraction.superpower?.extracted || "",
  };
}

// PUUTTUVAT FUNKTIOT
export function getBusinessValueSummary(
  extraction: PersonalityExtraction
): string[] {
  const values = [];

  if (extraction.workingStyle?.businessValue)
    values.push(extraction.workingStyle.businessValue);
  if (extraction.problemSolving?.businessValue)
    values.push(extraction.problemSolving.businessValue);
  if (extraction.uniqueStrength?.businessValue)
    values.push(extraction.uniqueStrength.businessValue);
  if (extraction.teamRole?.businessValue)
    values.push(extraction.teamRole.businessValue);

  return values;
}

export function getPersonalityConfidenceScore(
  extraction: PersonalityExtraction
): {
  averageConfidence: number;
  strongTraits: string[];
  weakTraits: string[];
  overallQuality: string;
} {
  const traits = [
    extraction.workingStyle,
    extraction.problemSolving,
    extraction.energySources,
    extraction.uniqueStrength,
    extraction.learningStyle,
    extraction.teamRole,
    extraction.valuesExample,
    extraction.superpower,
  ].filter(Boolean);

  const confidences = traits.map((trait) => trait!.confidence);
  const averageConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0;

  const strongTraits = traits
    .filter((trait) => trait!.confidence >= 0.7)
    .map((trait) => trait!.extracted);
  const weakTraits = traits
    .filter((trait) => trait!.confidence < 0.4)
    .map((trait) => trait!.extracted);

  let overallQuality = "minimal";
  if (averageConfidence >= 0.7) overallQuality = "rich";
  else if (averageConfidence >= 0.5) overallQuality = "moderate";

  return {
    averageConfidence,
    strongTraits,
    weakTraits,
    overallQuality,
  };
}
