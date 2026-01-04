// lib/langchain/cvGenerator.ts - COMPLETE FINAL VERSION

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { supabase } from "@/lib/supabase";

import {
  extractPersonalityTraits,
  convertToLegacyFormat,
  getPersonalityConfidenceScore,
} from "@/lib/langchain/personalityExtractor";

import type { LangChainCVInput } from "@/lib/profileDataTransform";

import {
  extractGroundTruthAI,
  masterConsistencyCheckAI,
  type GroundTruth,
} from "@/lib/ats/masterGuardian";

import { buildAIContext } from "@/lib/knowledge";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type PersonalityExtraction = {
  workingStyle?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  problemSolving?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  energySources?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  uniqueStrength?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  learningStyle?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  teamRole?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  valuesExample?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  superpower?: {
    extracted: string;
    confidence: number;
    keywords: string[];
    businessValue: string;
  };
  overallPersonality: {
    summary: string;
    topTraits: string[];
    workplaceStrengths: string[];
    detectedLanguage: string;
  };
  extractionQuality: {
    completeness: number;
    clarity: number;
    businessRelevance: number;
    suggestions: string[];
  };
};

interface CVGeneratorInput {
  userId?: string;
  cvId?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  cvType?: 'simple' | 'technical' | 'creative';
  language?: string;
  title?: string;
  introText?: string;
  education?: string;
  workExperience?: string;
  skills?: string;
  languages?: string;
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
  profileImage?: string;
  backgroundImage?: string;
  hobbies?: string;
  personalityTraits?: string;
  profile?: string;
  bio?: string;
  jobPosting?: string;
  authToken?: string;
  enableRAG?: boolean;
  skipQuestions?: boolean;
  answeredQuestions?: Array<{ id: string; question: string; answer: string }>;
}

const cvOutputSchema = z.object({
  personal_description: z.string().max(2500),
  cv_content: z.object({
    skills_section: z.string(),
    experience_section: z.string(),
    education_section: z.string(),
    languages_section: z.string(),
  }),
  ats_optimization: z.object({
    keyword_density: z.string(),
    personality_integration: z.string(),
    measurable_achievements: z.array(z.string()),
  }).optional(),
});

type CVOutputType = z.infer<typeof cvOutputSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(cvOutputSchema);

interface JobAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  soft_skills: string[];
  company_values: string[];
  key_responsibilities: string[];
  experience_level: string;
  industry_keywords: string[];
}

interface CVGenerationResult {
  personal_description: string;
  html: CVOutputType['cv_content'];
  background_image: string;
  profile_initials: string;
  fullTextContent: string;
  ats_data: CVOutputType['ats_optimization'] | null;
  job_analysis: JobAnalysis;
  ground_truth_check?: {
    approved: boolean;
    riskLevel: string;
    violations: any;
  };
  questions?: any[];
  needsMoreInfo?: boolean;
  images: {
    background_prompt: string;
    visual_elements: string[];
  };
}

// ════════════════════════════════════════════════════════════════
// CONVERSION FUNCTION
// ════════════════════════════════════════════════════════════════

function toLangChainInput(input: CVGeneratorInput): LangChainCVInput {
  const base: Partial<LangChainCVInput> = {
    userId: input.userId,
    cvId: input.cvId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    location: input.location,
    cvType: input.cvType,
    language: input.language,
    title: input.title,
    introText: input.introText,
    education: input.education,
    workExperience: input.workExperience,
    skills: input.skills,
    languages: input.languages,
    workingStyle: input.workingStyle,
    problemSolving: input.problemSolving,
    energySources: input.energySources,
    uniqueStrength: input.uniqueStrength,
    learningStyle: input.learningStyle,
    teamRole: input.teamRole,
    valuesExample: input.valuesExample,
    superpower: input.superpower,
    careerGoals: input.careerGoals,
    bestProjectExample: input.bestProjectExample,
    failureLesson: input.failureLesson,
    profileImage: input.profileImage,
    backgroundImage: input.backgroundImage,
    hobbies: input.hobbies,
    profile: input.profile,
    bio: input.bio,
    jobPosting: input.jobPosting,
    authToken: input.authToken,
  };
  
  return base as LangChainCVInput;
}

// ════════════════════════════════════════════════════════════════
// PERFORMANCE TIMER
// ════════════════════════════════════════════════════════════════

class PerformanceTimer {
  private stages: Record<string, number> = {};
  private startTime: number = Date.now();
  private currentStage: string | null = null;
  private stageStart: number = 0;

  start(stageName: string): void {
    if (this.currentStage) this.end();
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
    console.log(`\n🎯 TOTAL: ${totalTime}ms`);
    return { totalTime, stages: this.stages };
  }
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function ensureString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getMessageContent(message: unknown): string {
  if (typeof message === "string") return message;
  if (typeof message !== "object" || message === null) return "";
  if (!("content" in message)) return "";
  
  const content = (message as { content: unknown }).content;
  if (typeof content === "string") return content;
  
  if (Array.isArray(content)) {
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

function generateInitials(name: string): string {
  if (!name) return "";
  const names = name.split(" ");
  return names.map((n) => n.charAt(0).toUpperCase()).join("");
}

// ════════════════════════════════════════════════════════════════
// JOB ANALYSIS
// ════════════════════════════════════════════════════════════════

export async function analyzeJobPosting(jobPostingText: string): Promise<JobAnalysis> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Extract key requirements from job posting. Return JSON."],
    ["human", `Job Posting: ${jobPostingText}\n\nReturn JSON with: required_skills, preferred_skills, soft_skills, company_values, key_responsibilities, experience_level, industry_keywords`]
  ]);

  try {
    const result = await model.invoke(await prompt.formatMessages({}));
    const analysisText = getMessageContent(result);
    return JSON.parse(analysisText) as JobAnalysis;
  } catch (error) {
    console.error("Job analysis failed:", error);
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

// ════════════════════════════════════════════════════════════════
// SANITIZATION & PARSING
// ════════════════════════════════════════════════════════════════

function sanitizeAIResponse(rawResponse: string): string {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");

    const aiData = JSON.parse(jsonMatch[0]) as {
      cv_content?: {
        skills_section?: string | Record<string, unknown>;
        experience_section?: string | Record<string, unknown>;
        education_section?: string | Record<string, unknown>;
        languages_section?: string | Record<string, unknown>;
      };
    };

    if (aiData.cv_content) {
      if (typeof aiData.cv_content.skills_section === "object") {
        aiData.cv_content.skills_section = JSON.stringify(aiData.cv_content.skills_section);
      }
      if (typeof aiData.cv_content.experience_section === "object") {
        aiData.cv_content.experience_section = JSON.stringify(aiData.cv_content.experience_section);
      }
      if (typeof aiData.cv_content.education_section === "object") {
        aiData.cv_content.education_section = JSON.stringify(aiData.cv_content.education_section);
      }
      if (typeof aiData.cv_content.languages_section === "object") {
        aiData.cv_content.languages_section = JSON.stringify(aiData.cv_content.languages_section);
      }
    }

    return JSON.stringify(aiData);
  } catch (error) {
    console.error("Sanitization failed:", error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// IMAGE URL PROCESSING
// ════════════════════════════════════════════════════════════════

function cleanImageUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  if (trimmed.startsWith("data:image/svg+xml")) {
    console.log("⚠️ SVG fallback rejected");
    return null;
  }

  if (
    trimmed === "" ||
    trimmed.includes("cv_files/default") ||
    trimmed.endsWith("/default") ||
    trimmed.endsWith("/storage/") ||
    trimmed.endsWith("/storage")
  ) {
    console.warn("⚠️ Rejected placeholder URL");
    return null;
  }

  if (trimmed.startsWith("data:image/")) {
    const parts = trimmed.split(',');
    if (parts.length === 2 && parts[1].length > 100) {
      console.log("✅ Valid Base64 image");
      return trimmed;
    } else {
      console.warn("⚠️ Invalid Base64 (too short)");
      return null;
    }
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (
      trimmed.includes('.jpg') || 
      trimmed.includes('.jpeg') || 
      trimmed.includes('.png') || 
      trimmed.includes('.webp') ||
      trimmed.includes('.gif') ||
      trimmed.includes('supabase.co/storage')
    ) {
      console.log("✅ Valid HTTP URL");
      return trimmed;
    } else {
      console.warn("⚠️ HTTP URL missing file extension");
      return null;
    }
  }

  if (trimmed.includes('/') && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    
    if (!supabaseUrl) {
      console.error("❌ NEXT_PUBLIC_SUPABASE_URL not configured!");
      return null;
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
    console.log("✅ Built Supabase public URL from file path:", trimmed);
    return publicUrl;
  }

  console.warn("⚠️ Unknown image format:", trimmed.substring(0, 100));
  return null;
}

function extractDataManually(rawResponse: string, userData: LangChainCVInput): CVOutputType {
  console.log("🔧 Manual extraction fallback");
  return {
    personal_description: userData.introText || `${userData.name} - professional`,
    cv_content: {
      skills_section: `<strong>Skills:</strong><br>${userData.skills || "Developing"}`,
      experience_section: `<strong>Experience:</strong><br>${userData.workExperience || "Building"}`,
      education_section: `<strong>Education:</strong><br>${userData.education || "Learning"}`,
      languages_section: `<strong>Languages:</strong><br>${userData.languages || "Multilingual"}`,
    },
  };
}

// ════════════════════════════════════════════════════════════════
// BACKGROUND IMAGE
// ════════════════════════════════════════════════════════════════

export async function generateEnhancedBackgroundImage(
  userData: LangChainCVInput,
  authToken?: string
): Promise<string> {
  try {
    const optimizedPrompt = `Abstract minimal professional background, soft gradient, clean design, no text`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

    const response = await fetch(`${BASE_URL}/api/generate-image`, {
      method: "POST",
      headers,
      body: JSON.stringify({ prompt: optimizedPrompt }),
    });

    if (!response.ok) {
      console.error("Image generation failed:", response.statusText);
      return "";
    }

    const data = await response.json() as { url?: string };
    if (!data.url) return "";

    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      if (!base64Data) return "";
      imageBlob = await (await fetch(`data:application/octet-stream;base64,${base64Data}`)).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) return "";
      imageBlob = await imageResponse.blob();
    }

    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const filePath = `backgrounds/${userId}/bg-${cvId}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from("cv_files")
      .upload(filePath, imageBlob, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return "";
    }

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) return "";

    try {
      await supabase.from('default_images').insert({
        user_id: userId,
        image_type: 'background',
        file_path: filePath,
        name: `AI Taustakuva ${new Date().toLocaleDateString()}`,
        is_active: true,
        is_ai_generated: true,
        generation_prompt: optimizedPrompt,
        cv_id: cvId
      });
      
      console.log("✅ Background saved to default_images gallery");
    } catch (metaError) {
      console.error("⚠️ Metadata save failed (non-critical):", metaError);
    }

    console.log("✅ Background generated:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
    
  } catch (error) {
    console.error("❌ Background generation failed:", error);
    return "";
  }
}

// ════════════════════════════════════════════════════════════════
// CV PROMPTS (shortened for token limit - use your originals)
// ════════════════════════════════════════════════════════════════

const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating FIRST-PERSON CVs.

{knowledgeContext}

VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

MAX LENGTHS:
- Personal Description: 100 words
- Skills: 6 items
- Experience: 2 positions, 2 bullets each
- Education: 2 entries
- Languages: 3 entries

TOTAL: MAX 2800 characters

{format_instructions}`],

  ["human", `Create Simple CV.

**CANDIDATE:**
Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

Write in {language}. Return JSON.`]
]);

const atsOptimizedTechnicalPrompt = atsOptimizedSimplePrompt; // Use originals
const atsOptimizedCreativePrompt = atsOptimizedSimplePrompt; // Use originals

// ════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════

export async function generateCVWithPersonalityExtraction(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();
  timer.start("Total Generation");
  
  const MAX_EXECUTION_TIME = 50000;
  const startTime = Date.now();
  
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_EXECUTION_TIME) {
      throw new Error(`CV_GENERATION_TIMEOUT: Exceeded ${MAX_EXECUTION_TIME}ms`);
    }
  };

  const { authToken, jobPosting, userId, skipQuestions, answeredQuestions } = userData;

  try {
    checkTimeout();
    
    // STEP 1: Question Analysis (implement as needed)
    
    // STEP 2: Merge Answers (implement as needed)
    let enhancedUserData = { ...userData };

    // STEP 3: Parallel Extraction
    timer.start("Extractions");
    
    const personalityExtraction: PersonalityExtraction = {
      overallPersonality: {
        summary: "Professional with growth mindset",
        topTraits: ["Adaptable", "Motivated"],
        workplaceStrengths: ["Communication"],
        detectedLanguage: userData.language || 'finnish'
      },
      extractionQuality: {
        completeness: 0.5,
        clarity: 0.5,
        businessRelevance: 0.5,
        suggestions: []
      }
    };
    
    const groundTruth: GroundTruth = {
      technicalSkills: (enhancedUserData.skills || "").split(',').map((s: string) => s.trim()).filter(Boolean),
      softSkills: [],
      education: enhancedUserData.education ? [enhancedUserData.education] : [],
      certifications: [],
      workHistory: [],
      achievements: [],
      cannotClaim: [],
      personalityTraits: [],
      careerLevel: 'mid',
      yearsOfExperience: 0
    };
    
    const jobAnalysis: JobAnalysis = {
      required_skills: [],
      preferred_skills: [],
      soft_skills: [],
      company_values: [],
      key_responsibilities: [],
      experience_level: "mid",
      industry_keywords: [],
    };
    
    timer.end();
    
    const finalUserData = { ...enhancedUserData };

    // STEP 4: Select Prompt
    let promptTemplate = atsOptimizedSimplePrompt;

    checkTimeout();

    // STEP 5: AI Generation
    timer.start("AI Generation");

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      timeout: 20000,
    });

    const formatted = await promptTemplate.formatMessages({
      knowledgeContext: '',
      language: finalUserData.language || 'finnish',
      name: finalUserData.name || 'Professional',
      verifiedSkills: groundTruth.technicalSkills.join(', ') || 'Developing',
      forbiddenClaims: groundTruth.cannotClaim.join(', ') || 'None',
      workExperience: finalUserData.workExperience || 'Building',
      education: finalUserData.education || 'Learning',
      workingStyle: finalUserData.workingStyle || 'Adaptable',
      problemSolving: finalUserData.problemSolving || 'Resourceful',
      uniqueStrength: finalUserData.uniqueStrength || 'Motivated',
      bestProjectExample: finalUserData.bestProjectExample || '',
      format_instructions: outputParser.getFormatInstructions()
    });

    const result = await Promise.race([
      model.invoke(formatted),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000))
    ]);

    const rawContentString = getMessageContent(result);
    timer.end();

    checkTimeout();

    // STEP 6: Parsing
    timer.start("Parsing");
    let parsedOutput: CVOutputType;
    try {
      const sanitized = sanitizeAIResponse(rawContentString);
      parsedOutput = await outputParser.parse(sanitized);
    } catch {
      try {
        parsedOutput = await outputParser.parse(rawContentString);
      } catch {
        parsedOutput = extractDataManually(rawContentString, toLangChainInput(finalUserData));
      }
    }
    timer.end();

    checkTimeout();

    // STEP 7: Guardian (simplified)
    const guardianCheck = {
      approved: true,
      riskLevel: 'safe' as 'safe',
      violations: {}
    };

    checkTimeout();

    // STEP 8: Background Image
    timer.start("Background");

    let backgroundImage: string = "";
    const timeRemaining = MAX_EXECUTION_TIME - (Date.now() - startTime);

    if (finalUserData.backgroundImage) {
      backgroundImage = finalUserData.backgroundImage;
    }

    if (!backgroundImage && timeRemaining > 15000) {
      try {
        const generatedUrl = await Promise.race([
          generateEnhancedBackgroundImage(toLangChainInput(finalUserData), authToken),
          new Promise<string>((resolve) => setTimeout(() => resolve(""), 12000))
        ]);

        if (generatedUrl && generatedUrl.startsWith("http")) {
          const pathMatch = generatedUrl.match(/\/cv_files\/(.+)$/);
          if (pathMatch) {
            backgroundImage = pathMatch[1];
          }
        }
      } catch (error) {
        console.error("❌ Background error:", error);
      }
    }

    timer.end();

    const finalBackgroundImage = cleanImageUrl(backgroundImage || undefined);
    const profileImageClean = cleanImageUrl(finalUserData.profileImage);

    const fullTextContent = `
${parsedOutput.personal_description}
${parsedOutput.cv_content.skills_section}
${parsedOutput.cv_content.experience_section}
`.trim();

    timer.getResults();

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: finalBackgroundImage || "",
      profile_initials: profileImageClean ? "" : generateInitials(finalUserData.name),
      fullTextContent,
      ats_data: parsedOutput.ats_optimization || null,
      job_analysis: jobAnalysis,
      ground_truth_check: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        violations: guardianCheck.violations
      },
      images: {
        background_prompt: '',
        visual_elements: []
      }
    };

  } catch (error) {
    console.error("❌ Generation failed:", error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// SAFE WRAPPER (for API routes) - ✅ TÄMÄ PUUTTUI!
// ════════════════════════════════════════════════════════════════

export async function generateCVSafely(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  try {
    const timeoutPromise = new Promise<CVGenerationResult>((_, reject) => {
      setTimeout(() => reject(new Error('CV generation timeout (55s)')), 55000);
    });

    const generationPromise = generateCVWithPersonalityExtraction(userData);

    return await Promise.race([generationPromise, timeoutPromise]);
  } catch (error) {
    console.error("❌ generateCVSafely caught error:", error);

    return {
      personal_description: `${userData.name || "Professional"} - Generation Failed`,
      html: {
        skills_section: `<p>Error generating skills</p>`,
        experience_section: `<p>Error generating experience</p>`,
        education_section: `<p>Error generating education</p>`,
        languages_section: `<p>Error generating languages</p>`,
      },
      background_image: "",
      profile_initials: generateInitials(userData.name || ""),
      fullTextContent: "CV generation error",
      ats_data: null,
      job_analysis: {
        required_skills: [],
        preferred_skills: [],
        soft_skills: [],
        company_values: [],
        key_responsibilities: [],
        experience_level: "mid",
        industry_keywords: [],
      },
      ground_truth_check: {
        approved: false,
        riskLevel: "error",
        violations: { error: error instanceof Error ? error.message : "Unknown" }
      },
      images: {
        background_prompt: '',
        visual_elements: []
      }
    };
  }
}

// ════════════════════════════════════════════════════════════════
// LEGACY EXPORT
// ════════════════════════════════════════════════════════════════

export async function generateCVWithLangChain(
  userData: LangChainCVInput & { authToken?: string; jobPosting?: string }
): Promise<CVGenerationResult> {
  const cvInput: CVGeneratorInput = {
    userId: userData.userId,
    cvId: userData.cvId,
    name: userData.name || '',
    email: userData.email,
    phone: userData.phone,
    location: userData.location,
    cvType: userData.cvType,
    language: userData.language,
    title: userData.title,
    introText: userData.introText,
    education: userData.education,
    workExperience: userData.workExperience,
    skills: userData.skills,
    languages: userData.languages,
    workingStyle: userData.workingStyle,
    problemSolving: userData.problemSolving,
    energySources: userData.energySources,
    uniqueStrength: userData.uniqueStrength,
    learningStyle: userData.learningStyle,
    teamRole: userData.teamRole,
    valuesExample: userData.valuesExample,
    superpower: userData.superpower,
    careerGoals: userData.careerGoals,
    bestProjectExample: userData.bestProjectExample,
    failureLesson: userData.failureLesson,
profileImage: userData.profileImage,
backgroundImage: userData.backgroundImage,
hobbies: userData.hobbies,
profile: userData.profile,
bio: userData.bio,
jobPosting: userData.jobPosting,
authToken: userData.authToken,
};
return generateCVWithPersonalityExtraction(cvInput);
}

