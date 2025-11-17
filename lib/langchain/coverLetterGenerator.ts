// lib/langchain/coverLetterGenerator.ts - KORJATTU VERSIO
// Tiedoston alkuun:
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { BaseMessage } from "@langchain/core/messages";
import type { 
  CoverLetterInput, 
  CoverLetterOutput,
  AIQuestion,
  DataQuality, 
  PersonalityInput
} from "@/types/coverLetter";

import {
  extractPersonalityTraits,
  convertToLegacyFormat,
  getPersonalityConfidenceScore,
  getBusinessValueSummary,
} from "./personalityExtractor";

// ✅ KORJATTU: PersonalityInput on nyt PersonalityExtractionInput
import type { PersonalityExtractionInput } from "@/types/coverLetter";

// Enhanced styling options with more nuanced choices
const styleDescriptions = {
  formal: "formal and professional with traditional business language",
  casual: "friendly yet professional, conversational but appropriate",
  confident: "assertive and self-assured while remaining respectful",
  story: "narrative-driven with personal examples and experiences",
};
function cleanJsonResponse(text: string): string {
  // Poista kaikki markdown koodilohkot: ```json...``` tai ```...```
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Poista mahdolliset ylimääräiset lainausmerkit alusta/lopusta, jos malli ne lisää
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned;
}
// Helper function to extract content from different message types
function getMessageContent(message: BaseMessage | string): string {
  if (typeof message === "string") return message;
  if ("content" in message) {
    const content = message.content;
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
      return content
        .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
        .join(" ");
    }
  }
  return JSON.stringify(message);
}

// Enhanced output schema with deeper personality integration
const coverLetterOutputSchema = z.object({
  content: z
    .string()
    .describe("The full cover letter content with proper paragraph spacing"),
  title: z.string().describe("The title of the cover letter without markdown"),
  signature: z.string().describe("The signature block"),
  personality_hooks: z
    .array(z.string())
    .optional()
    .describe("Specific personality traits used as differentiators"),
  job_match_score: z
    .number()
    .min(1)
    .max(10)
    .optional()
    .describe("How well personality aligns with job requirements"),
  key_differentiators: z
    .array(z.string())
    .optional()
    .describe("Main points that make this candidate stand out"),
  personality_to_value_connections: z
    .array(
      z.object({
        trait: z.string(),
        business_value: z.string(),
        example: z.string().optional(),
      })
    )
    .optional()
    .describe("How personality traits translate to business value"),
  questions: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        context: z.string(),
        personality_focus: z.string().optional(),
        priority: z.enum(["high", "medium", "low"]).optional(),
      })
    )
    .optional()
    .describe("Questions to improve the cover letter"),
});

const outputParser = StructuredOutputParser.fromZodSchema(
  coverLetterOutputSchema
);

// Enhanced job analysis with deeper personality matching
function analyzeJobPersonalityFit(
  jobDescription: string,
  personalityData: any
): {
  matches: Array<{
    trait: string;
    jobAspect: string;
    strength: number;
    explanation: string;
  }>;
  alignmentScore: number;
  missingOpportunities: string[];
  strongestConnections: string[];
} {
  const jobLower = jobDescription.toLowerCase();
  let score = 3; // Base score
  const matches: Array<{
    trait: string;
    jobAspect: string;
    strength: number;
    explanation: string;
  }> = [];
  const missingOpportunities: string[] = [];

  // More sophisticated matching logic
  const personalityMappings = [
    {
      trait: "problemSolving",
      jobKeywords: [
        "problem",
        "ongelma",
        "ratkaisu",
        "solve",
        "challenge",
        "haaste",
        "trouble",
      ],
      businessValue: "Tehokас ongelmanratkaisu säästää aikaa ja resursseja",
      weight: 3,
    },
    {
      trait: "teamRole",
      jobKeywords: [
        "team",
        "tiimi",
        "ryhmä",
        "collaborate",
        "yhteistyö",
        "työryhmä",
        "kollektiv",
      ],
      businessValue:
        "Hyvä tiimidynamiikka parantaa tuottavuutta ja työilmapiiriä",
      weight: 2,
    },
    {
      trait: "uniqueStrength",
      jobKeywords: [
        "strength",
        "vahvuus",
        "skill",
        "taito",
        "expert",
        "asiantunt",
        "specia",
      ],
      businessValue: "Erikoisosaaminen tuo lisäarvoa ja erottaa kilpailijoista",
      weight: 2,
    },
    {
      trait: "workingStyle",
      jobKeywords: [
        "independent",
        "itsenäinen",
        "autonomous",
        "self",
        "oma-aloit",
        "proactive",
      ],
      businessValue: "Itsenäinen työskentely vähentää valvonnan tarvetta",
      weight: 2,
    },
    {
      trait: "energySources",
      jobKeywords: [
        "energy",
        "energia",
        "motivat",
        "passion",
        "intohimo",
        "drive",
        "enthusiasm",
      ],
      businessValue: "Sisäinen motivaatio takaa kestävän suorituskyvyn",
      weight: 2,
    },
    {
      trait: "learningStyle",
      jobKeywords: [
        "learn",
        "oppim",
        "develop",
        "kehit",
        "grow",
        "kasv",
        "training",
        "koulut",
      ],
      businessValue: "Nopea oppiminen vähentää koulutuskustannuksia",
      weight: 1,
    },
  ];

  personalityMappings.forEach((mapping) => {
    const hasPersonalityData =
      personalityData[mapping.trait] &&
      personalityData[mapping.trait].trim() !== "";
    const jobMentionsTrait = mapping.jobKeywords.some((keyword) =>
      jobLower.includes(keyword.toLowerCase())
    );

    if (hasPersonalityData && jobMentionsTrait) {
      const strength = mapping.weight;
      score += strength;
      matches.push({
        trait: mapping.trait,
        jobAspect:
          mapping.jobKeywords.find((k) => jobLower.includes(k)) ||
          mapping.jobKeywords[0],
        strength,
        explanation: mapping.businessValue,
      });
    } else if (jobMentionsTrait && !hasPersonalityData) {
      missingOpportunities.push(
        `Työpaikkailmoitus korostaa "${mapping.trait}" -aspektia, mutta sinulta puuttuu tämä tieto`
      );
    }
  });

  const strongestConnections = matches
    .filter((match) => match.strength >= 2)
    .map((match) => `${match.trait}: ${match.explanation}`)
    .slice(0, 3);

  return {
    matches,
    alignmentScore: Math.min(10, score),
    missingOpportunities,
    strongestConnections,
  };
}

// Enhanced question generation with prioritization
function generatePersonalityQuestions(
  personalityData: any,
  jobDescription: string,
  personalityFit: any
): Array<{
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  priority: "high" | "medium" | "low";
}> {
  const questions: Array<{
    id: string;
    question: string;
    context: string;
    personality_focus?: string;
    priority: "high" | "medium" | "low";
  }> = [];

  // High priority questions based on job alignment
  personalityFit.missingOpportunities.forEach(
    (opportunity: string, index: number) => {
      if (index < 2) {
        // Only top 2 missing opportunities
        questions.push({
          id: `missing_opportunity_${index}`,
          question: `Kerro esimerkki tilanteesta, joka liittyy tähän: ${opportunity}`,
          context: "Tämä vahvistaisi hakemustasi merkittävästi",
          priority: "high" as const,
        });
      }
    }
  );

  // Standard personality questions
  if (
    !personalityData.uniqueStrength ||
    personalityData.uniqueStrength.trim() === ""
  ) {
    questions.push({
      id: "unique_strength",
      question:
        "Mikä on sellainen asia, jota ihmiset tulevat pyytämään juuri sinulta apua?",
      context: "Tämä auttaa erottamaan sinut muista hakijoista",
      personality_focus: "uniqueStrength",
      priority: "high" as const,
    });
  }

  if (
    !personalityData.problemSolving ||
    personalityData.problemSolving.trim() === ""
  ) {
    const jobMentionsProblems =
      jobDescription.toLowerCase().includes("problem") ||
      jobDescription.toLowerCase().includes("haaste") ||
      jobDescription.toLowerCase().includes("ratkaisu");

    questions.push({
      id: "problem_solving",
      question: "Anna esimerkki haastavasta tilanteesta ja miten ratkaisit sen",
      context: jobMentionsProblems
        ? "Työpaikkailmoitus korostaa ongelmanratkaisukykyä"
        : "Ongelmanratkaisukyky on aina arvostettua",
      personality_focus: "problemSolving",
      priority: jobMentionsProblems ? ("high" as const) : ("medium" as const),
    });
  }

  if (!personalityData.superpower || personalityData.superpower.trim() === "") {
    questions.push({
      id: "superpower",
      question:
        "Jos työkaverit kuvailisivat sinua kolmella sanalla, mitä ne olisivat?",
      context: "Tämä auttaa luomaan vahvan ammatillisen identiteetin",
      personality_focus: "superpower",
      priority: "medium" as const,
    });
  }

  // Sort by priority and limit
  return questions
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
    .slice(0, 3);
}

// Enhanced personality strengths analysis
function getPersonalityStrengths(personalityData: any): Array<{
  strength: string;
  businessValue: string;
  evidence?: string;
}> {
  const strengthMappings = [
    {
      field: "workingStyle",
      businessValue: "Työskentelyn tehokkuus ja itsenäisyys",
    },
    {
      field: "uniqueStrength",
      businessValue: "Ainutlaatuinen lisäarvo organisaatiolle",
    },
    {
      field: "problemSolving",
      businessValue: "Haasteiden ratkaiseminen ja innovointi",
    },
    {
      field: "superpower",
      businessValue: "Tunnistettava ammatillinen vahvuus",
    },
    {
      field: "teamRole",
      businessValue: "Tiimidynamiikan ja yhteistyön parantaminen",
    },
  ];

  return strengthMappings
    .filter(
      (mapping) =>
        personalityData[mapping.field] &&
        personalityData[mapping.field].trim() !== ""
    )
    .map((mapping) => ({
      strength: personalityData[mapping.field],
      businessValue: mapping.businessValue,
      evidence: personalityData.valuesExample || undefined,
    }))
    .slice(0, 3);
}

// Data quality assessment similar to CV generator
export async function assessCoverLetterDataQuality(
  userData: CoverLetterInput
): Promise<{
  quality: "rich" | "moderate" | "minimal";
  score: number;
  reasoning: string;
  personalityCompleteness: number;
  suggestions: string[];
}> {
  let score = 0;
  const suggestions = [];

  // Basic profile completeness (40 points max)
  if (userData.name?.length > 2) score += 5;
  if (userData.workExperience && userData.workExperience.length > 50)
    score += 15;
  if (userData.skills && userData.skills.length > 30) score += 10;
  if (userData.education && userData.education.length > 20) score += 10;

  // Personality completeness (60 points max) - more weight than CV
  const personalityFields = [
    userData.workingStyle,
    userData.problemSolving,
    userData.energySources,
    userData.uniqueStrength,
    userData.learningStyle,
    userData.teamRole,
    userData.valuesExample,
    userData.superpower,
  ];

  const filledPersonality = personalityFields.filter(
    (field) => field && field.length > 10
  ).length;

  const personalityCompleteness =
    (filledPersonality / personalityFields.length) * 100;
  score += filledPersonality * 7.5; // 7.5 points per personality field

  // Quality assessment
  let quality: "rich" | "moderate" | "minimal";
  if (score >= 80) {
    quality = "rich";
  } else if (score >= 50) {
    quality = "moderate";
    if (personalityCompleteness < 50) {
      suggestions.push(
        "Täydennä persoonallisuusprofiilia vahvempaa hakukirjettä varten"
      );
    }
  } else {
    quality = "minimal";
    suggestions.push("Lisää työkokemustietoja tai persoonallisuuden kuvauksia");
  }

  return {
    quality,
    score: Math.min(score, 100),
    reasoning: `Persoonallisuus: ${Math.round(
      personalityCompleteness
    )}%, Ammatilliset tiedot: ${Math.round(
      ((score - filledPersonality * 7.5) / 40) * 100
    )}%`,
    personalityCompleteness: Math.round(personalityCompleteness),
    suggestions,
  };
}

// PÄIVITETTY COVER LETTER -FUNKTIO
export async function generateCoverLetterWithPersonalityExtraction(
  userData: CoverLetterInput
): Promise<any> {
  try {
    // 1. EKSTRAKTOI PERSOONALLISUUS
    console.log("🔍 Analysoidaan hakukirjeen persoonallisuusdataa...");

    // Muunna CoverLetterInput PersonalityInputiksi
    const personalityInput: PersonalityInput = {
      userProfile: userData.personalNotes || "",
      workingStyleText: userData.workingStyle || "",
      problemSolvingText: userData.problemSolving || "",
      energySourcesText: userData.energySources || "",
      strengthsText: userData.uniqueStrength || "",
      learningText: userData.learningStyle || "",
      teamworkText: userData.teamRole || "",
      valuesText: userData.valuesExample || "",
      additionalInfo: userData.superpower || "",
    };

    const personalityExtraction = await extractPersonalityTraits(
      personalityInput
    );

    // 2. ARVIOI TYÖPAIKKAMATCHAUSTA parannetulla datalla
    const extractedPersonalityData = convertToLegacyFormat(
      personalityExtraction
    );
    const confidenceScore = getPersonalityConfidenceScore(
      personalityExtraction
    );

    // 3. PARANNETTU HAKUKIRJEDATA
    const enhancedCoverLetterData = {
      ...userData,
      // Ekstraktoitu persoonallisuusdata
      ...extractedPersonalityData,

      // Metadata päätöksentekoa varten
      personalityMetadata: {
        confidenceScore: confidenceScore.averageConfidence,
        strongTraits: confidenceScore.strongTraits,
        businessValues: getBusinessValueSummary(personalityExtraction),
        extractionSummary: personalityExtraction.overallPersonality.summary,
      },
    };

    console.log(
      `📊 Hakukirjeen persoonallisuusdatan vahvuus: ${Math.round(
        confidenceScore.averageConfidence * 100
      )}%`
    );

    // 4. GENEROI HAKUKIRJE parannetulla datalla
    return await generateCoverLetterWithLangChain(enhancedCoverLetterData);
  } catch (error) {
    console.error(
      "❌ Hakukirjeen persoonallisuusekstraktointi epäonnistui:",
      error
    );

    // Fallback alkuperäiseen menetelmään
    return await generateCoverLetterWithLangChain(userData);
  }
}

export async function generateCoverLetterWithLangChain(
  userData: CoverLetterInput
): Promise<{
  content: string;
  title: string;
  signature: string;
  personality_hooks?: string[];
  job_match_score?: number;
  key_differentiators?: string[];
  questions?: Array<{
    id: string;
    question: string;
    context: string;
    personality_focus?: string;
    priority?: "high" | "medium" | "low";
  }>;
  data_quality?: any;
}> {
  try {
    const language = userData.language || "finnish";
    const style = userData.style || "formal";
    const styleDescription = styleDescriptions[style];

    // Assess data quality first
    const dataQuality = await assessCoverLetterDataQuality(userData);

    // Collect personality data
    const personalityData = {
      workingStyle: userData.workingStyle,
      problemSolving: userData.problemSolving,
      energySources: userData.energySources,
      uniqueStrength: userData.uniqueStrength,
      learningStyle: userData.learningStyle,
      teamRole: userData.teamRole,
      valuesExample: userData.valuesExample,
      superpower: userData.superpower,
    };

    // Enhanced personality-job fit analysis
    const personalityFit = analyzeJobPersonalityFit(
      userData.jobDescription,
      personalityData
    );
    const personalityQuestions = generatePersonalityQuestions(
      personalityData,
      userData.jobDescription,
      personalityFit
    );

    // Return questions if data quality is too low or personality fit is weak
    if (
      dataQuality.quality === "minimal" ||
      (personalityQuestions.length > 0 && personalityFit.alignmentScore < 6)
    ) {
      return {
        questions: personalityQuestions,
        title: `Hakukirje: ${userData.jobTitle || "Työpaikka"}`,
        content: "",
        signature: userData.name,
        personality_hooks: [],
        job_match_score: personalityFit.alignmentScore,
        data_quality: dataQuality,
      };
    }

    const personalityStrengths = getPersonalityStrengths(personalityData);

    // Create model
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4o-mini", // Same as CV generator
      temperature: 0.7, // Match CV generator
    });

    // Enhanced system prompt
    const systemPrompt = `
      You are an expert cover letter writer specializing in personality-driven applications that create authentic connections with employers.
      
      CORE PHILOSOPHY:
      - Personality is the primary differentiator in today's competitive job market
      - Every personality trait must translate to concrete business value
      - Authenticity trumps generic professional language
      - Show, don't just tell - use specific examples and scenarios
      
      WRITING STRATEGY:
      - Lead with strongest personality-job alignment
      - Use narrative structure to make traits memorable
      - Connect personality to solving employer's specific challenges
      - End with compelling call to action based on unique value
      
      LANGUAGE RULES:
      - Write in ${language} language
      - Use ${styleDescription} tone
      - 350-400 words total
      - NO markdown formatting
      - Paragraph separation with empty lines
      
      AUTHENTICITY REQUIREMENTS:
      - NEVER invent experience or qualifications
      - Use ONLY provided information
      - Transform personality data into professional value propositions
      - If data is limited, focus on potential and learning mindset
    `;

    const humanTemplate = `
      Create a personality-driven cover letter:
      
      JOB POSTING:
      {jobDescription}
      
      CANDIDATE PROFILE:
      Name: {name}
      Contact: {email} | {phone} | {location}
      Current Role/Goal: {jobTitle}
      Education: {education}
      Experience: {workExperience}
      Skills: {skills}
      
      PERSONALITY CORE (PRIMARY DIFFERENTIATORS):
      Working Style: {workingStyle}
      Problem-Solving Approach: {problemSolving}
      Energy Sources: {energySources}
      Unique Strength: {uniqueStrength}
      Learning Method: {learningStyle}
      Team Contribution: {teamRole}
      Values in Action: {valuesExample}
      Professional Identity: {superpower}
      
      STRATEGIC ANALYSIS:
      Personality-Job Match Score: {matchScore}/10
      Strongest Alignments: {strongestConnections}
      Key Differentiators: {keyDifferentiators}
      Data Quality: {dataQuality} ({personalityCompleteness}% personality complete)
      
      ADDITIONAL CONTEXT:
      Personal Notes: {personalNotes}
      Interests/Hobbies: {hobbies}
      
      COVER LETTER REQUIREMENTS:
      1. Opening: Hook with strongest personality-job connection
      2. Body Paragraph 1: Personality trait solving employer's challenge
      3. Body Paragraph 2: Second trait with concrete business value
      4. Closing: Unique value proposition and enthusiastic call to action
      
      Focus on making the employer think: "This person would fit perfectly in our culture and solve our specific challenges."
      
      {format_instructions}
    `;

    // Create and format prompt
    const promptTemplate = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanTemplate],
    ]);

    const formattedPrompt = await promptTemplate.formatMessages({
      jobDescription: userData.jobDescription,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      location: userData.location || "",
      jobTitle: userData.jobTitle || "Hakija",
      education: userData.education || "Koulutustaustan mukaan",
      workExperience: userData.workExperience || "Kokemuksen mukaan",
      skills: userData.skills || "Monipuolinen osaaminen",
      workingStyle: personalityData.workingStyle || "Määrittelemätön",
      problemSolving: personalityData.problemSolving || "Määrittelemätön",
      energySources: personalityData.energySources || "Määrittelemätön",
      uniqueStrength: personalityData.uniqueStrength || "Määrittelemätön",
      learningStyle: personalityData.learningStyle || "Määrittelemätön",
      teamRole: personalityData.teamRole || "Määrittelemätön",
      valuesExample: personalityData.valuesExample || "Määrittelemätön",
      superpower: personalityData.superpower || "Määrittelemätön",
      matchScore: personalityFit.alignmentScore,
      strongestConnections:
        personalityFit.strongestConnections.join("; ") || "Perusalignaatio",
      keyDifferentiators:
        personalityStrengths.map((s) => s.strength).join(", ") ||
        "Määrittelemätön",
      dataQuality: dataQuality.quality,
      personalityCompleteness: dataQuality.personalityCompleteness,
      personalNotes: userData.personalNotes || "",
      hobbies: userData.hobbies || "",
      format_instructions: outputParser.getFormatInstructions(),
    });

    // Generate cover letter
    const result = await model.invoke(formattedPrompt);

    // Parse with enhanced error handling
    let parsedOutput;
    try {
      const cleanResult = cleanJsonResponse(getMessageContent(result));
      parsedOutput = await outputParser.parse(cleanResult);
    } catch (parseError) {
      // Fallback logic      // Fallback logic
      const rawContent = getMessageContent(result);
      // UUSI: Puhdista sisällöstä mahdolliset JSON-koodilohkot
      const content = cleanJsonResponse(rawContent);

      const titleMatch = content.match(/(?:title|otsikko):\s*(.+?)(?:\n|$)/i);
      const title = titleMatch
        ? titleMatch[1].trim().replace(/["'*]/g, "")
        : `Hakukirje: ${userData.jobTitle || "Työpaikka"}`;

      const signatureMatch = content.match(
        /(?:signature|allekirjoitus):\s*(.+?)(?:\n|$)/i
      );

      let mainContent = content
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/\*\*(?:title|otsikko):\*\*.*?\n/gi, "")
        .replace(/\*\*(?:signature|allekirjoitus):\*\*.*?\n/gi, "")
        .replace(/\*\*/g, "")
        .trim();

      mainContent = mainContent
        .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      return {
        content: mainContent,
        title: title,
        signature: signatureMatch ? signatureMatch[1].trim() : userData.name,
        personality_hooks: personalityStrengths.map((s) => s.strength),
        job_match_score: personalityFit.alignmentScore,
        key_differentiators: personalityStrengths.map((s) => s.businessValue),
        data_quality: dataQuality,
      };
    }

    // Clean parsed output
    const cleanTitle = parsedOutput.title.replace(/["'*]/g, "").trim();
    const formattedContent = parsedOutput.content
      .replace(/\*\*/g, "")
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      content: formattedContent,
      title: cleanTitle,
      signature: parsedOutput.signature || userData.name,
      personality_hooks:
        parsedOutput.personality_hooks ||
        personalityStrengths.map((s) => s.strength),
      job_match_score:
        parsedOutput.job_match_score || personalityFit.alignmentScore,
      key_differentiators:
        parsedOutput.key_differentiators ||
        personalityStrengths.map((s) => s.businessValue),
      questions: parsedOutput.questions || [],
      data_quality: dataQuality,
    };
  } catch (error) {
    console.error(
      `Error generating cover letter: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    throw error;
  }
}