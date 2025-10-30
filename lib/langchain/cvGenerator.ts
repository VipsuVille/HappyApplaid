// lib/langchain/cvGenerator.ts - KORJATTU JA TÄYDELLINEN VERSIO
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { mockCVData } from "./mockCVData";
import { FALLBACK_IMAGE, optimizeImagePrompt } from "../utils";
import { supabase } from "@/lib/supabase";
import {
  extractPersonalityTraits,
  convertToLegacyFormat,
  getPersonalityConfidenceScore,
  getBusinessValueSummary,
} from "./personalityExtractor";
import type { LangChainCVInput } from "@/lib/profileDataTransform";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const cvOutputSchema = z.object({
  personal_description: z
    .string()
    .max(2500)
    .describe("Personal description optimized for ATS and human readers"),
  cv_content: z.object({
    skills_section: z
      .string()
      .describe("Skills section with keyword optimization"),
    experience_section: z
      .string()
      .describe("Experience with metrics and achievements"),
    education_section: z
      .string()
      .describe("Education with relevant credentials"),
    languages_section: z
      .string()
      .describe("Languages with professional context"),
  }),
  ats_optimization: z
    .object({
      keyword_density: z.string().describe("Primary keywords incorporated"),
      personality_integration: z
        .string()
        .describe("How personality differentiates candidate"),
      measurable_achievements: z
        .array(z.string())
        .describe("Quantified results created"),
    })
    .optional(),
});

type CVOutputType = z.infer<typeof cvOutputSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(cvOutputSchema);

// MESSAGE CONTENT EXTRACTION - KORJATTU FUNKTIO
interface TextContentPart {
  type: "text";
  text: string;
}

interface BaseMessage {
  content: string | TextContentPart[] | any[];
}

function getMessageContent(message: BaseMessage | string): string {
  if (typeof message === "string") {
    return message;
  }
  if ("content" in message) {
    const content = message.content;
    if (typeof content === "string") {
      return content;
    }
    if (Array.isArray(content)) {
      const jsonTextPart = content.find((item) => {
        if (
          typeof item === "object" &&
          item !== null &&
          "text" in item &&
          "type" in item
        ) {
          const textPart = item as TextContentPart;
          if (textPart.type === "text" && typeof textPart.text === "string") {
            const textContent = textPart.text.trim();
            return textContent.startsWith("{") && textContent.endsWith("}");
          }
        }
        if (typeof item === "object" && item !== null && "text" in item) {
          const textItem = item as { text: unknown };
          if (typeof textItem.text === "string") {
            const textContent = textItem.text.trim();
            return textContent.startsWith("{") && textContent.endsWith("}");
          }
        }
        if (typeof item === "string") {
          const textContent = item.trim();
          return textContent.startsWith("{") && textContent.endsWith("}");
        }
        return false;
      });

      if (jsonTextPart) {
        if (typeof jsonTextPart === "string") {
          return jsonTextPart;
        }
        if (typeof jsonTextPart === "object" && jsonTextPart !== null) {
          if ("text" in jsonTextPart && "type" in jsonTextPart) {
            const textPart = jsonTextPart as TextContentPart;
            if (textPart.type === "text") {
              return textPart.text;
            }
          }
          if ("text" in jsonTextPart) {
            const textItem = jsonTextPart as { text: string };
            return textItem.text;
          }
        }
      }

      return content
        .filter((item): item is string | { text: string } => {
          if (typeof item === "string") return true;
          if (typeof item === "object" && item !== null && "text" in item) {
            return typeof (item as { text: unknown }).text === "string";
          }
          return false;
        })
        .map((item) => (typeof item === "string" ? item : item.text))
        .join(" ");
    }
  }
  return "";
}

// AI MODELS
const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini",
  temperature: 0.7,
});

const assessmentModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: "gpt-4o-mini",
  temperature: 0.1,
  maxTokens: 200,
});

// PÄIVITETTY GENERATECV-FUNKTIO PERSONALLISUUSEKSTRAKTIolla
export async function generateCVWithPersonalityExtraction(
  userData: any
): Promise<any> {
  const { authToken, jobPostingData, ...restUserData } = userData;

  try {
    // 1. EKSTRAKTOI PERSOONALLISUUSPIIRTEET vapaamuotoisesta tekstistä
    console.log("🔍 Analysoidaan persoonallisuusdataa...");

    const personalityExtraction = await extractPersonalityTraits({
      userProfile: userData.profile || userData.bio || "",
      workingStyleText:
        userData.workingStyleDescription || userData.workingStyle || "",
      problemSolvingText:
        userData.problemSolvingExample || userData.problemSolving || "",
      energySourcesText:
        userData.energyDescription || userData.energySources || "",
      strengthsText:
        userData.strengthsDescription || userData.uniqueStrength || "",
      learningText:
        userData.learningDescription || userData.learningStyle || "",
      teamworkText: userData.teamworkDescription || userData.teamRole || "",
      valuesText: userData.valuesDescription || userData.valuesExample || "",
      additionalInfo: userData.additionalNotes || userData.superpower || "",
    });

    // 2. MUUNNA STRUKTUROITU DATA takaisin vanhaan formaattiin
    const extractedPersonalityData = convertToLegacyFormat(
      personalityExtraction
    );

    // 3. ARVIOI DATAN LAATUA
    const confidenceScore = getPersonalityConfidenceScore(
      personalityExtraction
    );
    console.log(
      `📊 Persoonallisuusdatan luotettavuus: ${Math.round(
        confidenceScore.averageConfidence * 100
      )}%`
    );

    // 4. YHDISTÄ EKSTRAKTOITU DATA alkuperäiseen dataan
    const enhancedUserData = {
      ...restUserData,
      // Käytä ekstraktoitua dataa jos se on luotettavampaa
      workingStyle:
        extractedPersonalityData.workingStyle ||
        restUserData.workingStyle ||
        "",
      problemSolving:
        extractedPersonalityData.problemSolving ||
        restUserData.problemSolving ||
        "",
      energySources:
        extractedPersonalityData.energySources ||
        restUserData.energySources ||
        "",
      uniqueStrength:
        extractedPersonalityData.uniqueStrength ||
        restUserData.uniqueStrength ||
        "",
      learningStyle:
        extractedPersonalityData.learningStyle ||
        restUserData.learningStyle ||
        "",
      teamRole:
        extractedPersonalityData.teamRole || restUserData.teamRole || "",
      valuesExample:
        extractedPersonalityData.valuesExample ||
        restUserData.valuesExample ||
        "",
      superpower:
        extractedPersonalityData.superpower || restUserData.superpower || "",

      // Lisää metadata
      personalityMetadata: {
        extractionQuality: personalityExtraction.extractionQuality,
        confidenceScore: confidenceScore,
        businessValues: getBusinessValueSummary(personalityExtraction),
        topTraits: personalityExtraction.overallPersonality.topTraits,
      },
    };


    // 6. JATKA TAVALLISEEN CV-GENEROINTIIN parannetulla datalla
    console.log("🚀 Generoidaan CV parannetulla persoonallisuusdatalla...");

    return await generateCVWithLangChain({
      ...enhancedUserData,
      authToken,
      jobPostingData,
    });
  } catch (error) {
    console.error(
      "❌ Persoonallisuusekstraktointi epäonnistui, käytetään alkuperäistä dataa:",
      error
    );

    // Fallback: käytä alkuperäistä generointimenetelmää
    return await generateCVWithLangChain(userData);
  }
}

// PARANNETTU TAUSTAKUVAN GENEROINTIFUNKTIO
export async function generateEnhancedBackgroundImageWithExtraction(
  userData: any,
  authToken?: string
): Promise<string> {
  try {
    // 1. EKSTRAKTOI PERSOONALLISUUS kuvaa varten
    const personalityExtraction = await extractPersonalityTraits({
      userProfile: userData.profile || "",
      workingStyleText: userData.workingStyle || "",
      energySourcesText: userData.energySources || "",
      strengthsText: userData.uniqueStrength || "",
      teamworkText: userData.teamRole || "",
      additionalInfo: userData.superpower || "",
    });

    // 2. KÄYTÄ EKSTRAKTOITUA DATAA kuvapromptin luontiin
    const imagePromptData = {
      workingStyle: personalityExtraction.workingStyle?.extracted || "",
      energySources: personalityExtraction.energySources?.extracted || "",
      uniqueStrength: personalityExtraction.uniqueStrength?.extracted || "",
      teamRole: personalityExtraction.teamRole?.extracted || "",
      superpower: personalityExtraction.superpower?.extracted || "",
      jobTitle: userData.jobTitle || "",

      // Lisää visuaalisia vihjeitä
      personalitySummary: personalityExtraction.overallPersonality.summary,
      topTraits: personalityExtraction.overallPersonality.topTraits,
      businessValues: getBusinessValueSummary(personalityExtraction),
    };

    console.log(
      "🎨 Generoidaan taustakuva ekstraktoidun persoonallisuuden pohjalta..."
    );

    // Käytä parannettua kuvaprompttia
    const backgroundPrompt = await createEnhancedVisualPrompt(imagePromptData);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE_URL}/api/generate-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: backgroundPrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Image API responded with ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error("No URL in image generation response");
    }

    // Convert and upload to Supabase
    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      imageBlob = await (
        await fetch(`data:application/octet-stream;base64,${base64Data}`)
      ).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      imageBlob = await imageResponse.blob();
    }

    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const filePath = `backgrounds/${userId}/background-${cvId}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, imageBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Failed to upload image to Supabase Storage:", uploadError);
      return FALLBACK_IMAGE;
    }

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error(
      "❌ Taustakuvan persoonallisuusekstraktointi epäonnistui:",
      error
    );
    return await generateEnhancedBackgroundImage(userData, authToken);
  }
}

// APUFUNKTIO PARANNETTUUN KUVAPROMPTTIIN
async function createEnhancedVisualPrompt(
  personalityData: any
): Promise<string> {
  const visualPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Olet visuaalinen suunnittelija, joka muuntaa persoonallisuuspiirteet abstrakkteiksi, ATS-yhteensopiviksi CV-taustaelementeiksi.
      
      SUUNNITTELUPERIAATTEET:
      - Abstrakti, ei-häiritsevä estetiikka
      - Väriharmonia persoonallisuuden mukaan
      - Professionaalinen, mutta persoonallinen
      - Skalautuvuus eri dokumenttikooissa`,
    ],
    [
      "human",
      `Luo visuaalinen kuvaus CV:n taustakuvalle:
      
      PERSOONALLISUUSPROFIILI:
      Työtyyli: {workingStyle}
      Energianlähteet: {energySources}
      Vahvuus: {uniqueStrength}
      Tiimirooli: {teamRole}
      Ammatillinen identiteetti: {superpower}
      
      KONTEKSTI:
      Tavoitetyö: {jobTitle}
      Persoonallisuuden yhteenveto: {personalitySummary}
      Keskeiset piirteet: {topTraits}
      
      Luo abstrakti, professionaalinen taustakuvan kuvaus joka:
      - Heijastaa persoonallisuutta värien ja muotojen kautta
      - Ei häiritse CV:n tekstiä
      - Sopii ATS-järjestelmiin
      - Luo positiivisen ensivaikutelman`,
    ],
  ]);

  const result = await model.invoke(
    await visualPrompt.formatMessages({
      workingStyle: personalityData.workingStyle || "",
      energySources: personalityData.energySources || "",
      uniqueStrength: personalityData.uniqueStrength || "",
      teamRole: personalityData.teamRole || "",
      superpower: personalityData.superpower || "",
      jobTitle: personalityData.jobTitle || "",
      personalitySummary: personalityData.personalitySummary || "",
      topTraits: personalityData.topTraits?.join(", ") || "",
    })
  );

  return getMessageContent(result);
}

// AI-POHJAINEN DATA SUFFICIENCY ASSESSOR
// Korjattu AI-pohjainen data sufficiency assessor
const dataAssessmentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a CV quality assessor. Analyze user data to determine if it's sufficient for creating a quality CV.

ASSESSMENT CRITERIA:
- RICH: Excellent data quality, can create compelling CV
- MODERATE: Decent data, CV will be good but could be better  
- MINIMAL: Basic data, CV will be very basic or potentially weak

FOR SIMPLE CV TYPE: Personality data is MOST IMPORTANT - weight it heavily in assessment.
FOR OTHER CV TYPES: Focus on professional experience and skills.

Return ONLY valid JSON in this exact format:
{{
  "quality": "rich or moderate or minimal",
  "score": number_from_0_to_100,
  "reasoning": "Brief explanation of assessment",
  "missing_critical": ["array", "of", "critical", "missing", "elements"],
  "suggestions": ["array", "of", "specific", "improvement", "suggestions"]
}}`,
  ],
  [
    "human",
    `ASSESS THIS USER DATA FOR CV GENERATION:

CV Type: {cvType}
Name: {name}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages: {languages}

PERSONALITY DATA (Critical for Simple CV):
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Energy Sources: {energySources}
Unique Strength: {uniqueStrength}
Learning Style: {learningStyle}
Team Role: {teamRole}
Values Example: {valuesExample}
Superpower: {superpower}

ASSESSMENT FOCUS:
- For Simple CV: Prioritize personality completeness and depth
- For Technical/Creative CV: Prioritize professional experience and skills
- Consider what type of compelling CV can be created with this data
- Identify what would make the biggest impact if added

Analyze and return quality assessment as valid JSON.`,
  ],
]);

export async function assessDataQualityWithAI(userData: any): Promise<{
  quality: "rich" | "moderate" | "minimal";
  score: number;
  reasoning: string;
  missingCritical: string[];
  suggestions: string[];
}> {
  try {
    const formattedPrompt = await dataAssessmentPrompt.formatMessages({
      cvType: userData.cvType || "simple",
      name: userData.name || "Not provided",
      workExperience: userData.workExperience || "Not provided",
      education: userData.education || "Not provided",
      skills: userData.skills || "Not provided",
      languages: userData.languages || "Not provided",
      workingStyle: userData.workingStyle || "Not provided",
      problemSolving: userData.problemSolving || "Not provided",
      energySources: userData.energySources || "Not provided",
      uniqueStrength: userData.uniqueStrength || "Not provided",
      learningStyle: userData.learningStyle || "Not provided",
      teamRole: userData.teamRole || "Not provided",
      valuesExample: userData.valuesExample || "Not provided",
      superpower: userData.superpower || "Not provided",
    });

    const result = await assessmentModel.invoke(formattedPrompt);
    const responseText = getMessageContent(result);

    console.log("Raw AI assessment response length:", responseText.length);

    // YKSINKERTAINEN RATKAISU: Puhdista kontrollimerkit
    const cleanedResponse = responseText
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Poista kontrollimerkit
      .replace(/\n/g, " ") // Korvaa rivinvaihdot välilyönneillä
      .replace(/\r/g, "") // Poista carriage return
      .replace(/\t/g, " ") // Korvaa tabit välilyönneillä
      .trim();

    console.log("Cleaned response preview:", cleanedResponse.substring(0, 300));

    // Yritä parsintaa puhdistetulla datalla
    const assessment = JSON.parse(cleanedResponse);

    // Validoi vastaus
    const validatedAssessment = {
      quality: ["rich", "moderate", "minimal"].includes(assessment.quality)
        ? assessment.quality
        : "minimal",
      score:
        typeof assessment.score === "number" &&
        assessment.score >= 0 &&
        assessment.score <= 100
          ? assessment.score
          : 30,
      reasoning:
        typeof assessment.reasoning === "string"
          ? assessment.reasoning
          : "Assessment completed",
      missingCritical: Array.isArray(assessment.missing_critical)
        ? assessment.missing_critical
        : [],
      suggestions: Array.isArray(assessment.suggestions)
        ? assessment.suggestions
        : ["Add more detailed information"],
    };

    console.log("Assessment successful:", validatedAssessment.quality);
    return validatedAssessment;
  } catch (error) {
    console.error("AI assessment failed:", error);

    // FALLBACK: Yksinkertainen paikallinen arviointi
    const hasPersonality = !!(
      userData.workingStyle ||
      userData.uniqueStrength ||
      userData.problemSolving
    );
    const hasExperience = !!(
      userData.workExperience && userData.workExperience.length > 20
    );
    const hasSkills = !!(userData.skills && userData.skills.length > 20);

    let score = 0;
    let quality: "rich" | "moderate" | "minimal" = "minimal";

    if (userData.name) score += 10;
    if (hasExperience) score += 30;
    if (hasSkills) score += 20;
    if (hasPersonality) score += 40;

    if (score >= 70) quality = "rich";
    else if (score >= 40) quality = "moderate";

    return {
      quality,
      score,
      reasoning: `Simple local assessment. Score: ${score}/100`,
      missingCritical: [
        ...(!hasExperience ? ["Work experience details"] : []),
        ...(!hasSkills ? ["Skills description"] : []),
        ...(!hasPersonality ? ["Personality traits"] : []),
      ],
      suggestions: [
        "Add detailed work experience with achievements",
        "Expand skills section with specific abilities",
        "Complete personality sections for better CV",
      ],
    };
  }
}

// Uusi funktio keskeneräisen JSON:n korjaamiseen
function fixIncompleteJson(responseText: string): string | null {
  try {
    // Etsi JSON:n alku
    const startIndex = responseText.indexOf("{");
    if (startIndex === -1) return null;

    // Ota kaikki { merkistä eteenpäin
    let jsonStr = responseText.substring(startIndex);

    // Laske aaltosulkeiden tasapaino
    let braceCount = 0;
    let lastValidIndex = -1;

    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (char === "{") {
        braceCount++;
      } else if (char === "}") {
        braceCount--;
        if (braceCount === 0) {
          lastValidIndex = i;
          break;
        }
      }
    }

    // Jos löydettiin täydellinen JSON
    if (lastValidIndex !== -1) {
      return jsonStr.substring(0, lastValidIndex + 1);
    }

    // Jos JSON on keskeneräinen, yritä korjata
    console.log("Attempting to fix incomplete JSON...");

    // Poista viimeinen epätäydellinen rivi
    const lines = jsonStr.split("\n");
    let fixedLines = [];
    let inArray = false;
    let arrayDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Seuraa array-tasoja
      const openBrackets = (line.match(/\[/g) || []).length;
      const closeBrackets = (line.match(/\]/g) || []).length;
      arrayDepth += openBrackets - closeBrackets;
      inArray = arrayDepth > 0;

      // Jos rivi näyttää keskeneräiseltä (ei päivity lainausmerkeillä tai sulkeilla)
      if (
        line &&
        !line.endsWith(",") &&
        !line.endsWith('"') &&
        !line.endsWith("]") &&
        !line.endsWith("}") &&
        inArray
      ) {
        // Lisää puuttuvat lainausmerkit ja pilkku
        if (!line.startsWith('"')) {
          fixedLines.push('    "' + line + '"');
        } else {
          fixedLines.push(line + '"');
        }

        // Sulje array ja objekti
        fixedLines.push("  ]");
        fixedLines.push("}");
        break;
      } else {
        fixedLines.push(lines[i]);
      }
    }

    const fixedJson = fixedLines.join("\n");
    console.log(
      "Attempting to parse fixed JSON:",
      fixedJson.substring(0, 200) + "..."
    );

    return fixedJson;
  } catch (error) {
    console.error("Error fixing incomplete JSON:", error);
    return null;
  }
}

// Parannettu validointifunktio
function validateAssessmentResponse(assessment: any) {
  const validQualities = ["rich", "moderate", "minimal"];

  return {
    quality: validQualities.includes(assessment.quality)
      ? assessment.quality
      : "minimal",
    score:
      typeof assessment.score === "number" &&
      assessment.score >= 0 &&
      assessment.score <= 100
        ? assessment.score
        : 30,
    reasoning:
      typeof assessment.reasoning === "string"
        ? assessment.reasoning
        : "Assessment completed with basic analysis",
    missingCritical: Array.isArray(assessment.missing_critical)
      ? assessment.missing_critical
      : Array.isArray(assessment.missingCritical)
      ? assessment.missingCritical
      : [],
    suggestions: Array.isArray(assessment.suggestions)
      ? assessment.suggestions
      : ["Add more detailed information for better CV quality"],
  };
}

// Fallback funktiot (samat kuin aiemmin)
function getFallbackMissingCritical(userData: any): string[] {
  const missing = [];

  if (!userData.workExperience || userData.workExperience.length < 20) {
    missing.push("Detailed work experience");
  }
  if (!userData.skills || userData.skills.length < 20) {
    missing.push("Comprehensive skills list");
  }
  if (userData.cvType === "simple" && !userData.workingStyle) {
    missing.push("Working style description");
  }
  if (userData.cvType === "simple" && !userData.uniqueStrength) {
    missing.push("Unique strengths");
  }

  return missing;
}

function getFallbackSuggestions(userData: any): string[] {
  const suggestions = [];

  if (!userData.workExperience || userData.workExperience.length < 50) {
    suggestions.push(
      "Add more detailed work experience with specific achievements"
    );
  }
  if (!userData.skills || userData.skills.length < 30) {
    suggestions.push(
      "Expand skills section with both technical and soft skills"
    );
  }
  if (
    userData.cvType === "simple" &&
    (!userData.workingStyle || !userData.uniqueStrength)
  ) {
    suggestions.push("Complete personality sections for Simple CV type");
  }
  if (!userData.education || userData.education.length < 20) {
    suggestions.push("Add educational background and certifications");
  }

  return suggestions;
}

// Fallback funktio AI-virheen varalta
function calculateBasicScore(userData: any): number {
  let score = 0;

  if (userData.name?.length > 2) score += 10;
  if (userData.workExperience?.length > 50) score += 20;
  if (userData.skills?.length > 30) score += 15;
  if (userData.education?.length > 20) score += 10;

  // Simple CV:lle persoonallisuus painaa enemmän
  if (userData.cvType === "simple") {
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
      (field) => field?.length > 10
    ).length;
    score += filledPersonality * 7; // 7 pistettä per täytetty persoonallisuuskenttä
  }

  return Math.min(score, 100);
}

// JOB POSTING ANALYZER
export async function analyzeJobPosting(jobPostingText: string): Promise<any> {
  const analysisPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an ATS and recruitment specialist. Extract key optimization data from job postings.",
    ],
    {
      role: "human",
      content: `
        Analyze this job posting and extract structured data:
        
        JOB POSTING:
        ${jobPostingText}
        
        Extract and return JSON:
        {
          "required_skills": ["exact technical terms"],
          "preferred_skills": ["nice-to-have terms"], 
          "soft_skills": ["leadership", "communication", etc.],
          "company_values": ["innovation", "collaboration", etc.],
          "key_responsibilities": ["main job duties"],
          "experience_level": "entry/mid/senior",
          "industry_keywords": ["domain-specific terms"]
        }
      `,
    },
  ]);

  try {
    const result = await model.invoke(await analysisPrompt.formatMessages({}));
    const analysisText = getMessageContent(result);
    return JSON.parse(analysisText);
  } catch (error) {
    console.error("Job posting analysis failed:", error);
    return {
      required_skills: [],
      preferred_skills: [],
      soft_skills: [],
      company_values: [],
      key_responsibilities: [],
      experience_level: "mid",
      industry_keywords: [],
    };
  }
}

// SIMPLE CV PROMPT - KORJATTU JA PARANNETTU
const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a CV writer who creates honest, engaging resumes using ONLY factual information provided. 

CORE PRINCIPLES:
- FACTUAL ACCURACY: Use only provided information, never invent details
- ADAPTIVE APPROACH: Create compelling content regardless of data amount
- PERSONALITY FOCUS: For Simple CV, emphasize character and potential over experience
- REALISTIC EXPECTATIONS: Work with available data, don't fabricate

CONTENT STRATEGY BY DATA AVAILABILITY:
- RICH DATA: Create comprehensive sections with detailed descriptions
- MODERATE DATA: Focus on strengths, use personality to fill narrative gaps
- MINIMAL DATA: Emphasize potential, learning ability, and character traits`,
  ],
  {
    role: "human",
    content: `
===== AVAILABLE USER DATA =====
Name: {name}
Contact: {phone} | {email} | {location}
Job Title/Goal: {jobTitle}

EXPERIENCE DATA:
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages: {languages}

PERSONALITY DATA (for authentic voice):
Work Style: {workingStyle}
Problem-Solving: {problemSolving}
Energy Sources: {energySources}
Unique Strength: {uniqueStrength}
Learning Style: {learningStyle}
Team Role: {teamRole}
Values Example: {valuesExample}
Personal Identity: {superpower}

ADDITIONAL CONTEXT:
Hobbies/Interests: {hobbies}
Personality Traits: {personalityTraits}

===== ADAPTIVE CONTENT CREATION =====

**SECTION ADAPTATION:**

1. PERSONAL_DESCRIPTION (1500-2500 characters):
   RICH DATA: Comprehensive professional story with achievements  
   MODERATE DATA: Focus on strengths and career direction
   MINIMAL DATA: Emphasize character, learning potential, and goals
   
   - Start with strongest available element (experience/education/personality)
   - Use personality data to show professional approach
   - Connect to career goals using available information
   - Show authenticity - never claim fictional achievements

2. SKILLS_SECTION:
   - List ONLY skills user provided
   - Group logically (Technical, Professional, Personal)
   - Use personality context to explain HOW they use skills
   - If skills minimal: focus on learning approach and potential

3. EXPERIENCE_SECTION:
   WITH EXPERIENCE: Detailed role descriptions with personality insights
   WITHOUT EXPERIENCE: Focus on education projects, volunteer work, personal projects
   MINIMAL DATA: Emphasize transferable skills from any context (studies, hobbies, life)

4. EDUCATION_SECTION:
   - Use all provided education information
   - Connect learning style to academic approach
   - Show continuous development mindset
   - If education minimal: emphasize self-directed learning

===== OUTPUT FORMAT =====
{{
  "personal_description": "Adaptive professional summary (1500-2500 chars) using available data",
  "cv_content": {{
    "skills_section": "User's actual skills with personality context as HTML string",
    "experience_section": "Honest experience/education focus with growth narrative as HTML string",
    "education_section": "Complete educational background with learning approach as HTML string",
    "languages_section": "All provided languages with authentic context as HTML string"
  }},
  "ats_optimization": {{
    "keyword_density": "Keywords naturally integrated throughout extended content: [list]",
    "personality_integration": "Comprehensive personality differentiation: [detailed advantages]",
    "measurable_achievements": ["Detailed quantified results with context"]
  }}
}}

REMEMBER: Authenticity and potential are more valuable than fictional achievements.

Language: {language}
    `,
  },
]);

// TECHNICAL CV PROMPT
const atsOptimizedTechnicalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `CONTEXT: You are an ATS optimization specialist creating personality-driven technical CVs that rank highest in automated screening systems while compelling human recruiters.

CORE STRATEGY:
- BEAT ATS: Precise keyword matching, standard formatting, quantified achievements
- WIN HUMANS: Authentic personality integration, memorable differentiators
- PROVE VALUE: Concrete metrics that show business impact

ATS OPTIMIZATION PRIORITIES:
1. Exact keyword matches from job requirements
2. Industry-standard terminology and section headers
3. Quantified achievements with specific metrics
4. Natural keyword density (2-3% per section)
5. Professional formatting that parsers can read`,
  ],
  {
    role: "human",
    content: `
===== JOB TARGETING DATA =====
Target Role: {jobTitle}
Required Skills: {requiredSkills}
Industry Keywords: {industryKeywords}
Experience Level: {experienceLevel}

===== APPLICANT DATA =====
Name: {name} | Location: {location} | Phone: {phone} | Email: {email}

FOUNDATION:
Education: {education}
Work Experience: {workExperience}
Skills: {skills}
Languages: {languages}

===== PERSONALITY PROFILE (DIFFERENTIATION ENGINE) =====
Working Style: {workingStyle}
Problem-Solving Method: {problemSolving}
Energy Sources: {energySources}
Unique Strength: {uniqueStrength}
Learning Approach: {learningStyle}
Team Role: {teamRole}
Values in Action: {valuesExample}
Professional Identity: {superpower}

===== OUTPUT FORMAT =====
{{
  "personal_description": "ATS-optimized technical summary with personality hooks (max 2500 chars)",
  "cv_content": {{
    "skills_section": "Keyword-rich technical skills with personality context as HTML string",
    "experience_section": "Achievement-focused experience with personality-derived metrics as HTML string", 
    "education_section": "Standard format education with learning style integration as HTML string",
    "languages_section": "Professional languages format as HTML string"
  }},
  "ats_optimization": {{
    "keyword_density": "Primary technical keywords successfully integrated: [list]",
    "personality_integration": "Technical differentiators: [how personality creates competitive advantage]",
    "measurable_achievements": ["Specific quantified technical results"]
  }}
}}

Language: {language}
    `,
  },
]);

// CREATIVE CV PROMPT
const atsOptimizedCreativePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `CONTEXT: You are a creative CV strategist who creates memorable, ATS-compliant resumes that pass automated screening AND make human recruiters say "I need to interview this person."

BALANCE CHALLENGE: 
- TECHNICAL: Must pass ATS keyword screening
- CREATIVE: Must stand out from hundreds of similar profiles
- AUTHENTIC: Must reflect genuine personality

CREATIVE STRATEGY: Use storytelling and personality to make keyword-rich content memorable and engaging.`,
  ],
  {
    role: "human",
    content: `
===== TARGET JOB ANALYSIS =====
Role: {jobTitle}
Key Requirements: {requiredSkills}
Company Culture Indicators: {companyValues}
Industry: {industryKeywords}

===== APPLICANT PERSONALITY CORE =====
Name: {name} | Contact: {phone}, {email} | Location: {location}

PERSONALITY ESSENCE:
Working Style: {workingStyle}
Problem-Solving Magic: {problemSolving}
What Energizes Them: {energySources}
Their Superpower: {uniqueStrength}
Learning Method: {learningStyle}
Team Dynamic: {teamRole}
Values in Practice: {valuesExample}
Colleague's 3-Word Description: {superpower}

FOUNDATION DATA:
Education: {education}
Experience: {workExperience}
Skills: {skills}
Languages: {languages}

===== OUTPUT FORMAT =====
{{
  "personal_description": "Hook-driven creative summary with strategic keywords (max 2500 chars)",
  "cv_content": {{
    "skills_section": "Story-enhanced skills with keyword integration as HTML string",
    "experience_section": "Impact-narrative experience with personality-driven metrics as HTML string",
    "education_section": "Learning-focused education section as HTML string",
    "languages_section": "Cultural adaptability emphasis as HTML string"
  }},
  "ats_optimization": {{
    "keyword_density": "Creative keyword integration achieved: [examples]",
    "personality_integration": "Memorable differentiators: [specific personality advantages]", 
    "measurable_achievements": ["Personality-derived quantified results"]
  }}
}}

Language: {language}
    `,
  },
]);

// ENHANCED BACKGROUND PROMPT
const enhancedBackgroundPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a professional visual designer specializing in abstract, ATS-compatible CV backgrounds that subtly reflect personality while maintaining corporate professionalism.

DESIGN CONSTRAINTS:
- Must work with ATS text overlay (no interference)
- Professional color psychology
- Minimal, sophisticated aesthetic
- Personality-inspired but never literal`,
  ],
  {
    role: "human",
    content: `
PERSONALITY VISUAL TRANSLATION:
Working Style: {workingStyle}
Energy Sources: {energySources}  
Unique Strength: {uniqueStrength}
Team Role: {teamRole}
Professional Identity: {superpower}

TARGET ROLE CONTEXT: {jobTitle}

===== DESIGN BRIEF =====
Create an abstract background description that:
- Reflects personality through color psychology and composition
- Maintains ATS compatibility (subtle, text-friendly)
- Uses professional design principles
- Scales well across different document sizes

Generate a detailed visual description for AI image generation.
    `,
  },
]);

// HELPER FUNCTIONS
function generateInitials(name: string): string {
  if (!name) return "";
  const names = name.split(" ");
  const initials = names.map((name) => name.charAt(0).toUpperCase()).join("");
  return initials;
}

// ROBUSTTI PARSING-FUNKTIOT
function sanitizeAIResponse(rawResponse: string): string {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const aiData = JSON.parse(jsonMatch[0]);

    if (aiData.cv_content) {
      // Skills section korjaus
      if (typeof aiData.cv_content.skills_section === "object") {
        aiData.cv_content.skills_section = convertSkillsObjectToString(
          aiData.cv_content.skills_section
        );
      }

      // Experience section korjaus
      if (typeof aiData.cv_content.experience_section === "object") {
        aiData.cv_content.experience_section = convertExperienceObjectToString(
          aiData.cv_content.experience_section
        );
      }

      // Education section korjaus
      if (typeof aiData.cv_content.education_section === "object") {
        aiData.cv_content.education_section = convertEducationObjectToString(
          aiData.cv_content.education_section
        );
      }

      // Languages section korjaus
      if (typeof aiData.cv_content.languages_section === "object") {
        aiData.cv_content.languages_section = convertLanguagesObjectToString(
          aiData.cv_content.languages_section
        );
      }
    }

    return JSON.stringify(aiData);
  } catch (error) {
    console.error("Failed to sanitize AI response:", error);
    throw error;
  }
}

// Apufunktiot objektien muuntamiseen stringeiksi
function convertSkillsObjectToString(skillsObj: any): string {
  let result = "";

  if (skillsObj.Technical || skillsObj.technical) {
    const technical = skillsObj.Technical || skillsObj.technical;
    result += `<strong>Technical Skills:</strong><br>${technical}<br><br>`;
  }

  if (skillsObj.Professional || skillsObj.professional) {
    const professional = skillsObj.Professional || skillsObj.professional;
    result += `<strong>Professional Skills:</strong><br>${professional}<br><br>`;
  }

  if (skillsObj.Soft || skillsObj.soft) {
    const soft = skillsObj.Soft || skillsObj.soft;
    result += `<strong>Soft Skills:</strong><br>${soft}<br><br>`;
  }

  if (skillsObj.Languages || skillsObj.languages) {
    const languages = skillsObj.Languages || skillsObj.languages;
    result += `<strong>Languages:</strong><br>${languages}`;
  }

  // Jos objektilla on muita kenttiä, yhdistä ne
  Object.entries(skillsObj).forEach(([key, value]) => {
    if (
      ![
        "Technical",
        "Professional",
        "Soft",
        "Languages",
        "technical",
        "professional",
        "soft",
        "languages",
      ].includes(key)
    ) {
      result += `<strong>${key}:</strong><br>${value}<br><br>`;
    }
  });

  return result.trim() || JSON.stringify(skillsObj);
}

function convertExperienceObjectToString(expObj: any): string {
  if (typeof expObj === "string") return expObj;

  if (Array.isArray(expObj)) {
    return expObj
      .map((exp) => {
        if (typeof exp === "string") return exp;
        return `<strong>${
          exp.title || exp.position || "Position"
        }</strong> at ${exp.company || "Company"}<br>${
          exp.description || exp.details || ""
        }`;
      })
      .join("<br><br>");
  }

  if (expObj.title || expObj.position || expObj.company) {
    return `<strong>${
      expObj.title || expObj.position || "Position"
    }</strong> at ${expObj.company || "Company"}<br>${
      expObj.description || expObj.details || ""
    }`;
  }

  return JSON.stringify(expObj);
}

function convertEducationObjectToString(eduObj: any): string {
  if (typeof eduObj === "string") return eduObj;

  if (Array.isArray(eduObj)) {
    return eduObj
      .map((edu) => {
        if (typeof edu === "string") return edu;
        return `<strong>${edu.degree || edu.title || "Degree"}</strong><br>${
          edu.institution || edu.school || "Institution"
        }<br>${edu.year || edu.graduation || ""}`;
      })
      .join("<br><br>");
  }

  if (eduObj.degree || eduObj.institution || eduObj.school) {
    return `<strong>${eduObj.degree || eduObj.title || "Degree"}</strong><br>${
      eduObj.institution || eduObj.school || "Institution"
    }<br>${eduObj.year || eduObj.graduation || ""}`;
  }

  return JSON.stringify(eduObj);
}

function convertLanguagesObjectToString(langObj: any): string {
  if (typeof langObj === "string") return langObj;

  if (Array.isArray(langObj)) {
    return langObj
      .map((lang) => {
        if (typeof lang === "string") return lang;
        return `${lang.language || lang.name} (${
          lang.level || lang.proficiency || "fluent"
        })`;
      })
      .join(", ");
  }

  const languages = Object.entries(langObj).map(
    ([lang, level]) => `${lang} (${level})`
  );
  return languages.join(", ") || JSON.stringify(langObj);
}

function extractDataManually(rawResponse: string, userData: any): any {
  console.log("🔧 Manual extraction initiated");

  return {
    personal_description:
      userData.introText ||
      `${userData.name} - ammattilainen ${userData.jobTitle || "alallaan"}`,
    cv_content: {
      skills_section: `<strong>Osaaminen:</strong><br>${
        userData.skills || "Monipuolinen osaaminen"
      }`,
      experience_section: `<strong>Työkokemus:</strong><br>${
        userData.workExperience || "Relevanttia työkokemusta"
      }`,
      education_section: `<strong>Koulutus:</strong><br>${
        userData.education || "Asianmukainen koulutus"
      }`,
      languages_section: `<strong>Kielet:</strong><br>${
        userData.languages || "Suomi, Englanti"
      }`,
    },
    ats_optimization: {
      keyword_density: "Manual extraction - keywords preserved from user input",
      personality_integration:
        "Fallback generation - basic structure maintained",
      measurable_achievements: [
        "Reliable system performance",
        "Consistent delivery",
      ],
    },
  };
}

// MAIN GENERATION FUNCTION

// Sitten muuta generateCVWithLangChain funktion alku näin:
// lib/langchain/cvGenerator.ts - KORJATTU generateCVWithLangChain

// Päivitä generateCVWithLangChain käyttämään LangChainCVInput tyyppiä:
// lib/langchain/cvGenerator.ts - generateCVWithLangChain TÄYDELLINEN VERSIO

export async function generateCVWithLangChain(userData: LangChainCVInput): Promise<any> {
  // Mock data check
 /* if (process.env.NODE_ENV === "test" || process.env.USE_MOCK_DATA === "true") {
    console.log("Using mock data for CV generation");
    return {
      personal_description: mockCVData.simple.ai_data.profile,
      html: mockCVData.simple.ai_data.html,
      background_image: mockCVData.simple.ai_data.background_image,
      profile_initials: mockCVData.simple.ai_data.profile_initials,
      fullTextContent:
        mockCVData.simple.ai_data.profile +
        "\n" +
        Object.values(mockCVData.simple.ai_data.html).join("\n"),
      images: { background_prompt: "", visual_elements: [] },
    };
  }*/

  try {
    console.log("Starting AI-powered CV generation...");
    console.log("Input data summary:", {
      cvType: userData.cvType,
      hasName: !!userData.name,
      hasEducation: !!userData.education,
      hasWorkExperience: !!userData.workExperience,
      hasPersonality: !!(userData.workingStyle || userData.uniqueStrength),
      hasJobPosting: !!(userData as any).jobPosting, // ✅ Tarkista job posting
      jobPostingLength: ((userData as any).jobPosting as string)?.length || 0,
    });

    // ========================================
    // JOB POSTING ANALYYSI (PREMIUM)
    // ========================================
    let jobAnalysis = {
      required_skills: [] as string[],
      preferred_skills: [] as string[],
      soft_skills: [] as string[],
      company_values: [] as string[],
      key_responsibilities: [] as string[],
      experience_level: "mid" as string,
      industry_keywords: [] as string[],
    };

    // ✅ AKTIVOI JOB POSTING ANALYYSI jos annettu
    const jobPosting = (userData as any).jobPosting as string | undefined;
    
    if (jobPosting && jobPosting.length > 50) {
      console.log("🎯 Analyzing job posting for ATS optimization...");
      console.log("Job posting length:", jobPosting.length);
      
      try {
        jobAnalysis = await analyzeJobPosting(jobPosting);
        
        console.log("✅ Job analysis complete:", {
          required_skills: jobAnalysis.required_skills.length,
          preferred_skills: jobAnalysis.preferred_skills.length,
          soft_skills: jobAnalysis.soft_skills.length,
          company_values: jobAnalysis.company_values.length,
          experience_level: jobAnalysis.experience_level,
          industry_keywords: jobAnalysis.industry_keywords.length,
        });
        
        // Jos analyysi epäonnistuu mutta jatkaa, logita
        if (jobAnalysis.required_skills.length === 0 && 
            jobAnalysis.industry_keywords.length === 0) {
          console.warn("⚠️ Job posting analysis returned empty results");
        }
      } catch (error) {
        console.error("❌ Job posting analysis failed:", error);
        // Jatka ilman ATS-optimointia
        console.log("Continuing with generic CV (no ATS optimization)");
      }
    } else if (jobPosting) {
      console.log("⚠️ Job posting too short for analysis (< 50 chars)");
    } else {
      console.log("ℹ️ No job posting provided - creating generic CV");
    }

    // ========================================
    // VALITSE PROMPT CV-TYYPIN MUKAAN
    // ========================================
    let promptTemplate;
    switch (userData.cvType) {
      case "technical":
        promptTemplate = atsOptimizedTechnicalPrompt;
        break;
      case "creative":
        promptTemplate = atsOptimizedCreativePrompt;
        break;
      default:
        promptTemplate = atsOptimizedSimplePrompt;
        break;
    }

    console.log(`📝 Using prompt template: ${userData.cvType}`);

    // ========================================
    // FORMATOI PROMPT
    // ========================================
    const formattedPrompt = await promptTemplate.formatMessages({
      // Basic data
      name: userData.name || "",
      location: userData.location || "",
      phone: userData.phone || "",
      email: userData.email || "",
      jobTitle: userData.title || "",
      education: userData.education || "",
      workExperience: userData.workExperience || "",
      skills: userData.skills || "",
      languages: userData.languages || "",

      // Personality profile
      workingStyle: userData.workingStyle || "",
      problemSolving: userData.problemSolving || "",
      energySources: userData.energySources || "",
      uniqueStrength: userData.uniqueStrength || "",
      learningStyle: userData.learningStyle || "",
      teamRole: userData.teamRole || "",
      valuesExample: userData.valuesExample || "",
      superpower: userData.superpower || "",

      // Additional fields
      hobbies: userData.hobbies || "",
      personalityTraits: userData.personalityTraits || "",

      // ✅ ATS OPTIMIZATION DATA (käytetään vain jos job posting annettu)
      requiredSkills: jobAnalysis.required_skills.join(", "),
      industryKeywords: jobAnalysis.industry_keywords.join(", "),
      companyValues: jobAnalysis.company_values.join(", "),
      experienceLevel: jobAnalysis.experience_level,

      language: userData.language || "finnish",
    });

    console.log("🤖 Generating CV content...");
    if (jobAnalysis.required_skills.length > 0 || jobAnalysis.industry_keywords.length > 0) {
      console.log("🎯 ATS Keywords to integrate:", {
        required: jobAnalysis.required_skills.slice(0, 5).join(", "),
        industry: jobAnalysis.industry_keywords.slice(0, 5).join(", "),
      });
    }

    // ========================================
    // AI-GENEROINTI
    // ========================================
    const cvResult = await model.invoke(formattedPrompt);
    const rawContentString = getMessageContent(cvResult);

    console.log("=== AI Response Debug ===");
    console.log("Raw response length:", rawContentString.length);
    console.log("Response preview:", rawContentString.substring(0, 150) + "...");

    // ========================================
    // ROBUSTTI PARSING
    // ========================================
    let parsedOutput;
    try {
      const sanitizedResponse = sanitizeAIResponse(rawContentString);
      parsedOutput = await outputParser.parse(sanitizedResponse);
      console.log("✅ Successfully parsed after sanitization");
    } catch (sanitizeError) {
      console.error("❌ Sanitization failed, trying direct parse:", sanitizeError);

      try {
        parsedOutput = await outputParser.parse(rawContentString);
        console.log("✅ Direct parse succeeded");
      } catch (directParseError) {
        console.error("❌ Direct parse also failed:", directParseError);

        const fallbackData = extractDataManually(rawContentString, userData);
        parsedOutput = fallbackData;
        console.log("⚠️ Using manual extraction fallback");
      }
    }

    // ========================================
    // GENEROI TAUSTAKUVA
    // ========================================
    let backgroundImage = "";
    if (!userData.backgroundImage) {
      backgroundImage = await generateEnhancedBackgroundImage(
        userData,
        (userData as any).authToken
      );
    } else {
      backgroundImage = userData.backgroundImage;
    }

    // ========================================
    // KOOSTA LOPULLINEN VASTAUS
    // ========================================
    const fullTextContent = `
${parsedOutput.personal_description || ""}

## Technical Skills
${parsedOutput.cv_content.skills_section || ""}

## Professional Experience  
${parsedOutput.cv_content.experience_section || ""}

## Education
${parsedOutput.cv_content.education_section || ""}

## Languages
${parsedOutput.cv_content.languages_section || ""}

## ATS Optimization Summary
Keywords: ${jobAnalysis.required_skills.join(", ")}
Personality Differentiators: ${
      parsedOutput.ats_optimization?.personality_integration || ""
    }
    `.trim();

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: backgroundImage || FALLBACK_IMAGE,
      profile_initials: userData.profileImage
        ? ""
        : generateInitials(userData.name),
      fullTextContent: fullTextContent,
      ats_data: parsedOutput.ats_optimization || null,
      job_analysis: jobAnalysis,
      images: {
        background_prompt: "",
        visual_elements: [],
      },
    };
  } catch (error) {
    console.error("❌ CV generation failed:", error);
    throw error;
  }
}

// Muut funktiot (generateEnhancedBackgroundImage, sanitizeAIResponse, jne.) pysyvät samoina

// ENHANCED BACKGROUND IMAGE GENERATION
export async function generateEnhancedBackgroundImage(
  userData: any,
  authToken?: string
): Promise<string> {
  try {
    const backgroundPrompt = await enhancedBackgroundPrompt.formatMessages({
      workingStyle: userData.workingStyle || "",
      energySources: userData.energySources || "",
      uniqueStrength: userData.uniqueStrength || "",
      teamRole: userData.teamRole || "",
      superpower: userData.superpower || "",
      jobTitle: userData.jobTitle || "",
    });

    const promptResult = await model.invoke(backgroundPrompt);
    const promptString = getMessageContent(promptResult);
    const optimizedPrompt = optimizeImagePrompt(promptString);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${BASE_URL}/api/generate-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: optimizedPrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Image API responded with ${response.status}: ${errorText}`
      );
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error("No URL in image generation response");
    }

    // Convert and upload to Supabase
    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      imageBlob = await (
        await fetch(`data:application/octet-stream;base64,${base64Data}`)
      ).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }
      imageBlob = await imageResponse.blob();
    }

    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const filePath = `backgrounds/${userId}/background-${cvId}.png`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, imageBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Failed to upload image to Supabase Storage:", uploadError);
      return FALLBACK_IMAGE;
    }

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Enhanced background image generation failed:", error);
    return FALLBACK_IMAGE;
  }
}
