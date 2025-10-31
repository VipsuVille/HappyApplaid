// lib/langchain/cvGenerator.ts - TÄYDELLINEN OPTIMOITU VERSIO
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
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
function ensureString(value: unknown): string {
  return typeof value === "string" ? value : "";
}
// =====================================
// TYPES & SCHEMAS
// =====================================
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

interface TextContentPart {
  type: "text";
  text: string;
}

interface BaseMessage {
  content: string | TextContentPart[] | Array<string | TextContentPart | { text: string }>;
}

interface JobAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  soft_skills: string[];
  company_values: string[];
  key_responsibilities: string[];
  experience_level: string;
  industry_keywords: string[];
}

interface PersonalityExtraction {
  workingStyle: { extracted: string; confidence: number };
  problemSolving: { extracted: string; confidence: number };
  energySources: { extracted: string; confidence: number };
  uniqueStrength: { extracted: string; confidence: number };
  learningStyle: { extracted: string; confidence: number };
  teamRole: { extracted: string; confidence: number };
  valuesExample: { extracted: string; confidence: number };
  superpower: { extracted: string; confidence: number };
  overallPersonality: {
    summary: string;
    topTraits: string[];
  };
  extractionQuality: {
    dataCompleteness: number;
    clarityScore: number;
    actionabilityScore: number;
  };
}

interface ConfidenceScore {
  averageConfidence: number;
  strongFields: string[];
  weakFields: string[];
  recommendation: string;
}

interface AIData {
  html: {
    skills_section: string;
    experience_section: string;
    education_section: string;
    languages_section: string;
  };
  styles?: string;
  images?: {
    background_prompt: string;
    visual_elements: string[];
  };
  background_image?: string;
  background_image_url?: string | null;
  profile?: string;
  profile_image?: string;
  profile_initials?: string;
  personal_description?: string;
  fullTextContent?: string;
  cvType?: "technical" | "creative" | "simple";
}

interface CVGenerationResult {
  personal_description: string;
  html: CVOutputType['cv_content'];
  background_image: string;
  profile_initials: string;
  fullTextContent: string;
  ats_data: CVOutputType['ats_optimization'] | null;
  job_analysis: JobAnalysis;
  images: {
    background_prompt: string;
    visual_elements: string[];
  };
}

// =====================================
// AI MODELS
// =====================================
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

const outputParser = StructuredOutputParser.fromZodSchema(cvOutputSchema);

// =====================================
// PERFORMANCE TIMER CLASS
// =====================================
class PerformanceTimer {
  private stages: Record<string, number> = {};
  private startTime: number = Date.now();
  private currentStage: string | null = null;
  private stageStart: number = 0;

  start(stageName: string): void {
    if (this.currentStage) {
      this.end();
    }
    this.currentStage = stageName;
    this.stageStart = Date.now();
    console.time(`⏱️  ${stageName}`);
  }

  end(): void {
    if (!this.currentStage) return;
    
    const duration = Date.now() - this.stageStart;
    this.stages[this.currentStage] = duration;
    console.timeEnd(`⏱️  ${this.currentStage}`);
    this.currentStage = null;
  }

  getResults(): { totalTime: number; stages: Record<string, number> } {
    if (this.currentStage) this.end();
    
    const totalTime = Date.now() - this.startTime;
    console.log(`\n🎯 TOTAL: ${totalTime}ms (${(totalTime / 1000).toFixed(2)}s)`);
    console.log("📊 Breakdown:");
    Object.entries(this.stages).forEach(([stage, time]) => {
      console.log(`   ${stage}: ${time}ms (${((time / totalTime) * 100).toFixed(1)}%)`);
    });
    
    return { totalTime, stages: this.stages };
  }
}

// =====================================
// MESSAGE CONTENT EXTRACTION
// =====================================
function getMessageContent(message: unknown): string {
  // Jos on string, palauta suoraan
  if (typeof message === "string") return message;
  
  // Tarkista onko message-objekti
  if (typeof message !== "object" || message === null) return "";
  
  // Tarkista onko content-kenttä olemassa
  if (!("content" in message)) return "";
  
  const content = (message as { content: unknown }).content;
  
  // Jos content on string, palauta se
  if (typeof content === "string") return content;
  
  // Jos content on array, käsittele se
  if (Array.isArray(content)) {
    // Etsi ensimmäinen JSON-objekti (priorisoi strukturoitu data)
    const jsonTextPart = content.find((item: unknown) => {
      if (typeof item === "string") {
        const trimmed = item.trim();
        return trimmed.startsWith("{") && trimmed.endsWith("}");
      }
      if (typeof item === "object" && item !== null && "text" in item) {
        const textItem = item as { text: unknown };
        if (typeof textItem.text === "string") {
          const trimmed = textItem.text.trim();
          return trimmed.startsWith("{") && trimmed.endsWith("}");
        }
      }
      return false;
    });

    // Jos löytyi JSON-objekti, palauta se
    if (jsonTextPart) {
      if (typeof jsonTextPart === "string") return jsonTextPart;
      if (typeof jsonTextPart === "object" && "text" in jsonTextPart) {
        const textItem = jsonTextPart as { text: unknown };
        if (typeof textItem.text === "string") return textItem.text;
      }
    }

    // Muuten yhdistä kaikki tekstit
    return content
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          const textItem = item as { text: unknown };
          if (typeof textItem.text === "string") return textItem.text;
        }
        return "";
      })
      .filter((text) => text.length > 0)
      .join(" ");
  }
  
  return "";
}
// =====================================
// LISÄÄ NÄMÄ FUNKTIOT (jos niitä käytetään muualla)
// =====================================

// 1. Mock data checker (jos testit käyttävät)
export async function shouldUseMockData(): Promise<boolean> {
  return process.env.NODE_ENV === "test" || process.env.USE_MOCK_DATA === "true";
}

// 2. Enhanced background with personality extraction (jos haluat)
export async function generateEnhancedBackgroundImageWithExtraction(
  userData: LangChainCVInput,
  authToken?: string
): Promise<string> {
  try {
    const personalityExtraction = await extractPersonalityTraits({
      userProfile: ensureString(userData.profile) || ensureString(userData.bio),
      workingStyleText: ensureString(userData.workingStyle),
      energySourcesText: ensureString(userData.energySources),
      strengthsText: ensureString(userData.uniqueStrength),
      teamworkText: ensureString(userData.teamRole),
      additionalInfo: ensureString(userData.superpower),
    });

    const imagePromptData = {
      workingStyle: personalityExtraction.workingStyle?.extracted || "",
      energySources: personalityExtraction.energySources?.extracted || "",
      uniqueStrength: personalityExtraction.uniqueStrength?.extracted || "",
      teamRole: personalityExtraction.teamRole?.extracted || "",
      superpower: personalityExtraction.superpower?.extracted || "",
      jobTitle: userData.title || "",
      personalitySummary: personalityExtraction.overallPersonality.summary,
      topTraits: personalityExtraction.overallPersonality.topTraits,
      businessValues: getBusinessValueSummary(personalityExtraction),
    };

    console.log("🎨 Generating background with personality...");

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
      throw new Error(`Image API error: ${response.status}`);
    }

    const data = await response.json() as { url?: string };
    if (!data.url) {
      throw new Error("No URL in response");
    }

    // Upload to Supabase
    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      imageBlob = await (await fetch(`data:application/octet-stream;base64,${base64Data}`)).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) throw new Error("Failed to fetch image");
      imageBlob = await imageResponse.blob();
    }

    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const filePath = `backgrounds/${userId}/background-${cvId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, imageBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Supabase upload failed:", uploadError);
      return FALLBACK_IMAGE;
    }

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("❌ Background extraction failed:", error);
    return await generateEnhancedBackgroundImage(userData, authToken);
  }
}

// 3. Enhanced visual prompt creator (helper for above)
async function createEnhancedVisualPrompt(personalityData: {
  workingStyle: string;
  energySources: string;
  uniqueStrength: string;
  teamRole: string;
  superpower: string;
  jobTitle: string;
  personalitySummary: string;
  topTraits: string[];
  businessValues: string[];
}): Promise<string> {
  const visualPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `You are a visual designer translating personality into abstract CV backgrounds.
      
DESIGN PRINCIPLES:
- Abstract, non-distracting
- Professional color psychology
- ATS-compatible
- Personality-inspired but subtle`,
    ],
    [
      "human",
      `Create visual description for CV background:
      
PERSONALITY:
Working Style: {workingStyle}
Energy Sources: {energySources}
Strength: {uniqueStrength}
Team Role: {teamRole}
Identity: {superpower}

CONTEXT:
Job: {jobTitle}
Summary: {personalitySummary}
Traits: {topTraits}

Create abstract, professional background description for AI image generation.`,
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

// =====================================
// TARKISTA TYYPIT (varmista että nämä ovat olemassa)
// =====================================

// Jos saat "Cannot find name 'TextContentPart'" virheen, lisää:
interface TextContentPart {
  type: "text";
  text: string;
}

// Jos saat "Cannot find name 'BaseMessage'" virheen:
// - Älä lisää uutta BaseMessage interfacea
// - Käytä vain unknown-tyyppiä getMessageContent:ssa
// - LangChain hoitaa omat tyyppinsä

// =====================================
// JOB POSTING ANALYZER
// =====================================
export async function analyzeJobPosting(jobPostingText: string): Promise<JobAnalysis> {
  const analysisPrompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      "You are an ATS and recruitment specialist. Extract key optimization data from job postings.",
    ],
    [
      "human",
      `Analyze this job posting and extract structured data:
        
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
      }`,
    ],
  ]);

  try {
    const result = await model.invoke(await analysisPrompt.formatMessages({}));
    const analysisText = getMessageContent(result);
    return JSON.parse(analysisText) as JobAnalysis;
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

// =====================================
// DATA QUALITY ASSESSOR
// =====================================
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
{
  "quality": "rich or moderate or minimal",
  "score": number_from_0_to_100,
  "reasoning": "Brief explanation of assessment",
  "missing_critical": ["array", "of", "critical", "missing", "elements"],
  "suggestions": ["array", "of", "specific", "improvement", "suggestions"]
}`,
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

export async function assessDataQualityWithAI(userData: LangChainCVInput): Promise<{
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

    const cleanedResponse = responseText
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
      .replace(/\n/g, " ")
      .replace(/\r/g, "")
      .replace(/\t/g, " ")
      .trim();

    const assessment = JSON.parse(cleanedResponse) as {
      quality: string;
      score: number;
      reasoning: string;
      missing_critical: string[];
      suggestions: string[];
    };

    const validatedAssessment = {
      quality: (["rich", "moderate", "minimal"].includes(assessment.quality)
        ? assessment.quality
        : "minimal") as "rich" | "moderate" | "minimal",
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

    return validatedAssessment;
  } catch (error) {
    console.error("AI assessment failed:", error);

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

// =====================================
// PROMPT TEMPLATES
// =====================================
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

Language: {language}
    `,
  },
]);

const atsOptimizedTechnicalPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `CONTEXT: You are an ATS optimization specialist creating personality-driven technical CVs.

ATS OPTIMIZATION PRIORITIES:
1. Exact keyword matches from job requirements
2. Industry-standard terminology
3. Quantified achievements with metrics
4. Natural keyword density (2-3% per section)
5. Professional formatting`,
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

===== PERSONALITY PROFILE =====
Working Style: {workingStyle}
Problem-Solving: {problemSolving}
Energy Sources: {energySources}
Unique Strength: {uniqueStrength}
Learning: {learningStyle}
Team Role: {teamRole}
Values: {valuesExample}
Identity: {superpower}

===== OUTPUT FORMAT =====
{{
  "personal_description": "ATS-optimized technical summary with personality hooks (max 2500 chars)",
  "cv_content": {{
    "skills_section": "Keyword-rich technical skills with personality context as HTML",
    "experience_section": "Achievement-focused experience as HTML", 
    "education_section": "Standard format education as HTML",
    "languages_section": "Professional languages as HTML"
  }},
  "ats_optimization": {{
    "keyword_density": "Primary technical keywords: [list]",
    "personality_integration": "Technical differentiators: [advantages]",
    "measurable_achievements": ["Quantified technical results"]
  }}
}}

Language: {language}
    `,
  },
]);

const atsOptimizedCreativePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `CONTEXT: You are a creative CV strategist creating memorable, ATS-compliant resumes.

BALANCE CHALLENGE: 
- TECHNICAL: Must pass ATS keyword screening
- CREATIVE: Must stand out from hundreds
- AUTHENTIC: Must reflect genuine personality`,
  ],
  {
    role: "human",
    content: `
===== TARGET JOB =====
Role: {jobTitle}
Requirements: {requiredSkills}
Culture: {companyValues}
Industry: {industryKeywords}

===== APPLICANT CORE =====
Name: {name} | Contact: {phone}, {email} | Location: {location}

PERSONALITY:
Working Style: {workingStyle}
Problem-Solving: {problemSolving}
Energy: {energySources}
Superpower: {uniqueStrength}
Learning: {learningStyle}
Team: {teamRole}
Values: {valuesExample}
Identity: {superpower}

FOUNDATION:
Education: {education}
Experience: {workExperience}
Skills: {skills}
Languages: {languages}

===== OUTPUT FORMAT =====
{{
  "personal_description": "Hook-driven creative summary (max 2500 chars)",
  "cv_content": {{
    "skills_section": "Story-enhanced skills as HTML",
    "experience_section": "Impact-narrative experience as HTML",
    "education_section": "Learning-focused education as HTML",
    "languages_section": "Cultural adaptability as HTML"
  }},
  "ats_optimization": {{
    "keyword_density": "Creative keyword integration: [examples]",
    "personality_integration": "Memorable differentiators: [advantages]", 
    "measurable_achievements": ["Personality-derived results"]
  }}
}}

Language: {language}
    `,
  },
]);

// =====================================
// MAIN: GENERATE CV WITH PERSONALITY EXTRACTION
// =====================================

// =====================================
// KORJATTU generateCVWithPersonalityExtraction
// =====================================

export async function generateCVWithPersonalityExtraction(
  userData: LangChainCVInput & { authToken?: string; jobPosting?: string }
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();
  timer.start("Total Generation");

  const { authToken, jobPosting, ...restUserData } = userData;

  try {
    // ⚡ STAGE 1: PARALLEL EXTRACTION
    timer.start("Personality + Job Analysis");
    
    const [personalityExtraction, jobAnalysis] = await Promise.all([
      extractPersonalityTraits({
        userProfile: ensureString(userData.profile) || ensureString(userData.bio) || "",
        workingStyleText: ensureString(userData.workingStyle),
        problemSolvingText: ensureString(userData.problemSolving),
        energySourcesText: ensureString(userData.energySources),
        strengthsText: ensureString(userData.uniqueStrength),
        learningText: ensureString(userData.learningStyle),
        teamworkText: ensureString(userData.teamRole),
        valuesText: ensureString(userData.valuesExample),
        additionalInfo: ensureString(userData.superpower),
      }),
      jobPosting && jobPosting.length > 50
        ? analyzeJobPosting(jobPosting)
        : Promise.resolve<JobAnalysis>({
            required_skills: [],
            preferred_skills: [],
            soft_skills: [],
            company_values: [],
            key_responsibilities: [],
            experience_level: "mid",
            industry_keywords: [],
          })
    ]);
    
    timer.end(); // ✅ Sulje tämä stage

    // ⚡ STAGE 2: DATA TRANSFORMATION
    timer.start("Data Transformation");
    
    const extractedPersonalityData = convertToLegacyFormat(personalityExtraction);
    const confidenceScore = getPersonalityConfidenceScore(personalityExtraction);
    
    console.log(`📊 Personality confidence: ${Math.round(confidenceScore.averageConfidence * 100)}%`);

    const enhancedUserData: LangChainCVInput = {
      ...restUserData,
      workingStyle: extractedPersonalityData.workingStyle || restUserData.workingStyle || "",
      problemSolving: extractedPersonalityData.problemSolving || restUserData.problemSolving || "",
      energySources: extractedPersonalityData.energySources || restUserData.energySources || "",
      uniqueStrength: extractedPersonalityData.uniqueStrength || restUserData.uniqueStrength || "",
      learningStyle: extractedPersonalityData.learningStyle || restUserData.learningStyle || "",
      teamRole: extractedPersonalityData.teamRole || restUserData.teamRole || "",
      valuesExample: extractedPersonalityData.valuesExample || restUserData.valuesExample || "",
      superpower: extractedPersonalityData.superpower || restUserData.superpower || "",
    };
    
    timer.end(); // ✅ Sulje tämä stage

    // ⚡ STAGE 3: GENERATE CV (TÄMÄ PUUTTUI!)
    console.log("🚀 Generating CV content...");
    const result = await generateCVWithLangChain({
      ...enhancedUserData,
      authToken,
      jobPosting,
    });

    // ✅ Nyt result on määritelty!
    timer.getResults();

    return result;
  } catch (error) {
    console.error("❌ CV generation failed:", error);
    throw error;
  }
}
// =====================================
// MAIN: GENERATE CV WITH LANGCHAIN
// =====================================
export async function generateCVWithLangChain(
  userData: LangChainCVInput & { authToken?: string; jobPosting?: string }
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();

  try {
    // STAGE 1: JOB POSTING ANALYSIS
    timer.start("Job Analysis");
    let jobAnalysis: JobAnalysis = {
      required_skills: [],
      preferred_skills: [],
      soft_skills: [],
      company_values: [],
      key_responsibilities: [],
      experience_level: "mid",
      industry_keywords: [],
    };

    if (userData.jobPosting && userData.jobPosting.length > 50) {
      console.log("🎯 Analyzing job posting...");
      jobAnalysis = await analyzeJobPosting(userData.jobPosting);
    }
    timer.end();

    // STAGE 2: SELECT PROMPT
    timer.start("Prompt Selection & Formatting");
    let promptTemplate: ChatPromptTemplate;
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

    const formattedPrompt = await promptTemplate.formatMessages({
      name: userData.name || "",
      location: userData.location || "",
      phone: userData.phone || "",
      email: userData.email || "",
      jobTitle: userData.title || "",
      education: userData.education || "",
      workExperience: userData.workExperience || "",
      skills: userData.skills || "",
      languages: userData.languages || "",
      workingStyle: userData.workingStyle || "",
      problemSolving: userData.problemSolving || "",
      energySources: userData.energySources || "",
      uniqueStrength: userData.uniqueStrength || "",
      learningStyle: userData.learningStyle || "",
      teamRole: userData.teamRole || "",
      valuesExample: userData.valuesExample || "",
      superpower: userData.superpower || "",
      hobbies: userData.hobbies || "",
      personalityTraits: userData.personalityTraits || "",
      requiredSkills: jobAnalysis.required_skills.join(", "),
      industryKeywords: jobAnalysis.industry_keywords.join(", "),
      companyValues: jobAnalysis.company_values.join(", "),
      experienceLevel: jobAnalysis.experience_level,
      language: userData.language || "finnish",
    });
    timer.end();

    // STAGE 3: AI GENERATION
    timer.start("AI CV Generation");
    const cvResult = await model.invoke(formattedPrompt);
    const rawContentString = getMessageContent(cvResult);
    timer.end();

    // STAGE 4: PARSING
    timer.start("Output Parsing");
    let parsedOutput: CVOutputType;
    try {
      const sanitizedResponse = sanitizeAIResponse(rawContentString);
      parsedOutput = await outputParser.parse(sanitizedResponse);
    } catch (sanitizeError) {
      console.error("❌ Sanitization failed, trying direct parse");
      try {
        parsedOutput = await outputParser.parse(rawContentString);
      } catch (directParseError) {
        console.error("❌ Direct parse failed, using fallback");
        parsedOutput = extractDataManually(rawContentString, userData);
      }
    }
    timer.end();

    // STAGE 5: BACKGROUND IMAGE
    timer.start("Background Image");
    let backgroundImage = "";
    if (!userData.backgroundImage) {
      backgroundImage = await generateEnhancedBackgroundImage(userData, userData.authToken);
    } else {
      backgroundImage = userData.backgroundImage;
    }
    timer.end();

    // STAGE 6: FINAL ASSEMBLY
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

## ATS Optimization
Keywords: ${jobAnalysis.required_skills.join(", ")}
Personality: ${parsedOutput.ats_optimization?.personality_integration || ""}
    `.trim();

    timer.getResults();

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: backgroundImage || FALLBACK_IMAGE,
      profile_initials: userData.profileImage ? "" : generateInitials(userData.name),
      fullTextContent,
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

// =====================================
// BACKGROUND IMAGE GENERATION
// =====================================
export async function generateEnhancedBackgroundImage(
  userData: LangChainCVInput,
  authToken?: string
): Promise<string> {
  try {
    const optimizedPrompt = `Abstract professional background for ${userData.title || "professional"} CV, subtle gradient, minimal design, ATS-compatible`;

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
      throw new Error(`Image API error ${response.status}: ${errorText}`);
    }

    const data = await response.json() as { url?: string };
    if (!data.url) {
      throw new Error("No URL in image response");
    }

    // Convert to blob
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

    // Upload to Supabase
    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const filePath = `backgrounds/${userId}/background-${cvId}.png`;

    const { error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, imageBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Supabase upload failed:", uploadError);
      return FALLBACK_IMAGE;
    }

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Background image generation failed:", error);
    return FALLBACK_IMAGE;
  }
}

// =====================================
// UTILITY FUNCTIONS
// =====================================
function generateInitials(name: string): string {
  if (!name) return "";
  const names = name.split(" ");
  return names.map((n) => n.charAt(0).toUpperCase()).join("");
}

function sanitizeAIResponse(rawResponse: string): string {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const aiData = JSON.parse(jsonMatch[0]) as {
      cv_content?: {
        skills_section?: string | Record<string, unknown>;
        experience_section?: string | Record<string, unknown>;
        education_section?: string | Record<string, unknown>;
        languages_section?: string | Record<string, unknown>;
      };
    };

    if (aiData.cv_content) {
      // Skills section
      if (typeof aiData.cv_content.skills_section === "object") {
        aiData.cv_content.skills_section = convertSkillsObjectToString(
          aiData.cv_content.skills_section
        );
      }

      // Experience section
      if (typeof aiData.cv_content.experience_section === "object") {
        aiData.cv_content.experience_section = convertExperienceObjectToString(
          aiData.cv_content.experience_section
        );
      }

      // Education section
      if (typeof aiData.cv_content.education_section === "object") {
        aiData.cv_content.education_section = convertEducationObjectToString(
          aiData.cv_content.education_section
        );
      }

      // Languages section
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

// Helper converters
function convertSkillsObjectToString(skillsObj: Record<string, unknown>): string {
  let result = "";

  const categories = ['Technical', 'technical', 'Professional', 'professional', 'Soft', 'soft', 'Languages', 'languages'];
  
  for (const key of categories) {
    if (key in skillsObj) {
      const value = skillsObj[key];
      if (typeof value === 'string') {
        const label = key.charAt(0).toUpperCase() + key.slice(1);
        result += `<strong>${label} Skills:</strong><br>${value}<br><br>`;
      }
    }
  }

  // Add any other fields not covered
  Object.entries(skillsObj).forEach(([key, value]) => {
    if (!categories.includes(key) && typeof value === 'string') {
      result += `<strong>${key}:</strong><br>${value}<br><br>`;
    }
  });

  return result.trim() || JSON.stringify(skillsObj);
}

function convertExperienceObjectToString(expObj: Record<string, unknown> | Record<string, unknown>[]): string {
  if (typeof expObj === "string") return expObj;

  if (Array.isArray(expObj)) {
    return expObj
      .map((exp) => {
        if (typeof exp === "string") return exp;
        
        const expRecord = exp as Record<string, unknown>;
        const title = (expRecord.title || expRecord.position || "Position") as string;
        const company = (expRecord.company || "Company") as string;
        const description = (expRecord.description || expRecord.details || "") as string;
        
        return `<strong>${title}</strong> at ${company}<br>${description}`;
      })
      .join("<br><br>");
  }

  const expRecord = expObj as Record<string, unknown>;
  if (expRecord.title || expRecord.position || expRecord.company) {
    const title = (expRecord.title || expRecord.position || "Position") as string;
    const company = (expRecord.company || "Company") as string;
    const description = (expRecord.description || expRecord.details || "") as string;
    
    return `<strong>${title}</strong> at ${company}<br>${description}`;
  }

  return JSON.stringify(expObj);
}

function convertEducationObjectToString(eduObj: Record<string, unknown> | Record<string, unknown>[]): string {
  if (typeof eduObj === "string") return eduObj;

  if (Array.isArray(eduObj)) {
    return eduObj
      .map((edu) => {
        if (typeof edu === "string") return edu;
        
        const eduRecord = edu as Record<string, unknown>;
        const degree = (eduRecord.degree || eduRecord.title || "Degree") as string;
        const institution = (eduRecord.institution || eduRecord.school || "Institution") as string;
        const year = (eduRecord.year || eduRecord.graduation || "") as string;
        
        return `<strong>${degree}</strong><br>${institution}<br>${year}`;
      })
      .join("<br><br>");
  }

  const eduRecord = eduObj as Record<string, unknown>;
  if (eduRecord.degree || eduRecord.institution || eduRecord.school) {
    const degree = (eduRecord.degree || eduRecord.title || "Degree") as string;
    const institution = (eduRecord.institution || eduRecord.school || "Institution") as string;
    const year = (eduRecord.year || eduRecord.graduation || "") as string;
    
    return `<strong>${degree}</strong><br>${institution}<br>${year}`;
  }

  return JSON.stringify(eduObj);
}

function convertLanguagesObjectToString(langObj: Record<string, unknown> | Record<string, unknown>[]): string {
  if (typeof langObj === "string") return langObj;

  if (Array.isArray(langObj)) {
    return langObj
      .map((lang) => {
        if (typeof lang === "string") return lang;
        
        const langRecord = lang as Record<string, unknown>;
        const language = (langRecord.language || langRecord.name || "") as string;
        const level = (langRecord.level || langRecord.proficiency || "fluent") as string;
        
        return `${language} (${level})`;
      })
      .join(", ");
  }

  const languages = Object.entries(langObj).map(
    ([lang, level]) => `${lang} (${level})`
  );
  return languages.join(", ") || JSON.stringify(langObj);
}

function extractDataManually(rawResponse: string, userData: LangChainCVInput): CVOutputType {
  console.log("🔧 Manual extraction fallback");

  return {
    personal_description:
      userData.introText ||
      `${userData.name} - professional in ${userData.title || "their field"}`,
    cv_content: {
      skills_section: `<strong>Skills:</strong><br>${
        userData.skills || "Versatile skill set"
      }`,
      experience_section: `<strong>Experience:</strong><br>${
        userData.workExperience || "Relevant work experience"
      }`,
      education_section: `<strong>Education:</strong><br>${
        userData.education || "Appropriate educational background"
      }`,
      languages_section: `<strong>Languages:</strong><br>${
        userData.languages || "Finnish, English"
      }`,
    },
    ats_optimization: {
      keyword_density: "Manual extraction - keywords from user input",
      personality_integration: "Fallback generation - basic structure maintained",
      measurable_achievements: [
        "Reliable performance",
        "Consistent delivery",
      ],
    },
  };
}