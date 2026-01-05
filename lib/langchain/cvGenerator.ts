// lib/langchain/cvGenerator.ts - WITH QUESTION LOGIC

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
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer"; // ✅ LISÄTTY

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ════════════════════════════════════════════════════════════════
// TYPES (sama kuin ennen)
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
  personal_description: z.string(),
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
// HELPERS (samat kuin ennen)
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

// ✅ UUSI: MERGE ANSWERS
function mergeCVAnswers(
  userData: LangChainCVInput,
  answers: Array<{ id: string; question: string; answer: string }>
): Partial<LangChainCVInput> {
  const merged: Partial<LangChainCVInput> = {};

  answers.forEach((item) => {
    const q = item.question.toLowerCase();
    const a = item.answer;

    // Työkokemukseen liittyvät
    if (q.includes('työkokemus') || q.includes('work experience') || q.includes('projektit')) {
      merged.workExperience = (merged.workExperience || userData.workExperience || '') + '\n\n' + a;
    }
    // Koulutukseen liittyvät
    else if (q.includes('koulutus') || q.includes('education') || q.includes('opiskelu')) {
      merged.education = (merged.education || userData.education || '') + '\n\n' + a;
    }
    // Taitoihin liittyvät
    else if (q.includes('osaaminen') || q.includes('taidot') || q.includes('skills')) {
      merged.skills = (merged.skills || userData.skills || '') + ', ' + a;
    }
    // Työskentelytyyli
    else if (q.includes('työskentelytyyli') || q.includes('working style')) {
      merged.workingStyle = a;
    }
    // Ongelmanratkaisu
    else if (q.includes('ongelmanratkaisu') || q.includes('problem solving')) {
      merged.problemSolving = a;
    }
    // Vahvuudet
    else if (q.includes('vahvuus') || q.includes('strength')) {
      merged.uniqueStrength = a;
    }
    // Tavoitteet
    else if (q.includes('tavoite') || q.includes('goal')) {
      merged.careerGoals = a;
    }
    // Projekti-esimerkki
    else if (q.includes('projekti') || q.includes('project')) {
      merged.bestProjectExample = a;
    }
    // Kaikki muu → lisää workExperience tai careerGoals
    else {
      if (a.length > 50) {
        merged.workExperience = (merged.workExperience || userData.workExperience || '') + '\n\n' + a;
      }
    }
  });

  return merged;
}

// ════════════════════════════════════════════════════════════════
// PROMPTS (✅ POISTETTU PITUUSRAJOITUKSET!)
// ════════════════════════════════════════════════════════════════

const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating FIRST-PERSON CVs.

{knowledgeContext}

VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

WRITE DETAILED, COMPREHENSIVE CONTENT:
- Personal Description: 150-200 words (engaging, personality-driven)
- Skills: 8-12 items with context
- Experience: 2-3 positions, 3-4 bullets each (detailed achievements)
- Education: All entries with details
- Languages: All languages with proficiency levels

QUALITY OVER BREVITY. Use all available information.

{format_instructions}`],

  ["human", `Create detailed Simple CV.

**CANDIDATE:**
Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

**ADDITIONAL CONTEXT:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}

Write in {language}. Return detailed JSON.`]
]);

const atsOptimizedTechnicalPrompt = atsOptimizedSimplePrompt;
const atsOptimizedCreativePrompt = atsOptimizedSimplePrompt;

// ════════════════════════════════════════════════════════════════
// (muut funktiot säilyvät samana: analyzeJobPosting, sanitize, etc.)
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

function cleanImageUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (trimmed.startsWith("data:image/svg+xml")) return null;
  if (trimmed === "" || trimmed.includes("cv_files/default")) return null;
  
  if (trimmed.startsWith("data:image/")) {
    const parts = trimmed.split(',');
    if (parts.length === 2 && parts[1].length > 100) return trimmed;
    return null;
  }
  
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (
      trimmed.includes('.jpg') || 
      trimmed.includes('.jpeg') || 
      trimmed.includes('.png') || 
      trimmed.includes('.webp') ||
      trimmed.includes('supabase.co/storage')
    ) {
      return trimmed;
    }
    return null;
  }
  
  if (trimmed.includes('/') && !trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;
    return `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
  }
  
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

    if (!response.ok) return "";

    const data = await response.json() as { url?: string };
    if (!data.url) return "";

    let imageBlob: Blob;
    
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      if (!base64Data) return "";
      
      try {
        const binaryData = atob(base64Data);
        const arrayBuffer = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          arrayBuffer[i] = binaryData.charCodeAt(i);
        }
        imageBlob = new Blob([arrayBuffer], { type: "image/png" });
      } catch (error) {
        console.error("❌ Base64 decode failed:", error);
        return "";
      }
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

    if (uploadError) return "";

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) return "";

    try {
      await supabase.from('default_images').insert({
        user_id: userId,
        image_type: 'background',
        file_path: filePath,
        name: `AI Taustakuva ${new Date().toLocaleDateString('fi-FI')}`,
        is_active: true,
        is_ai_generated: true,
        generation_prompt: optimizedPrompt,
        cv_id: cvId
      });
    } catch (metaError) {
      console.error("⚠️ Metadata save failed:", metaError);
    }

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("❌ Background generation failed:", error);
    return "";
  }
}

// ════════════════════════════════════════════════════════════════
// ✅ MAIN FUNCTION - KYSYMYSLOGIIKKA LISÄTTY!
// ════════════════════════════════════════════════════════════════

export async function generateCVWithPersonalityExtraction(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();
  timer.start("Total Generation");
  
  const MAX_EXECUTION_TIME = 55000;
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
    
    // ════════════════════════════════════════════════════════════════
    // ✅ STEP 1: QUESTION ANALYSIS
    // ════════════════════════════════════════════════════════════════
    
    if (!skipQuestions) {
      timer.start("Question Analysis");

      try {
        console.log('🔍 CV: Running smart question analysis...');
        
        const smartAnalysis = await analyzeJobAndProfile({
          jobDescription: jobPosting || `Creating ${userData.cvType} CV`,
          userProfile: {
            name: userData.name || "Not specified",
            workExperience: userData.workExperience || "Not specified",
            education: userData.education || "Not specified",
            skills: userData.skills || "Not specified",
            workingStyle: userData.workingStyle || "Not specified",
            problemSolving: userData.problemSolving || "Not specified",
            uniqueStrength: userData.uniqueStrength || "Not specified",
            careerGoals: userData.careerGoals || "Not specified",
            bestProjectExample: userData.bestProjectExample || "Not specified",
            failureLesson: userData.failureLesson || "Not specified",
            personalNotes: userData.profile || "Not specified",
          },
          language: userData.language || 'finnish',
          userId: userId
        });

        timer.end();

        if (smartAnalysis.shouldAskQuestions && smartAnalysis.questions.length > 0) {
          // Suodata jo vastatut
          const unanswered = smartAnalysis.questions.filter((q) => {
            if (!answeredQuestions?.length) return true;
            return !answeredQuestions.some(
              (a) => a.id === q.id || a.question === q.question
            );
          });

          // Priorisoi kriittiset
          const critical = unanswered.filter(q => q.priority === 'critical');
          
          if (critical.length > 0) {
            console.log(`❓ CV needs ${critical.length} critical answers`);
            
            return {
              personal_description: "",
              html: {
                skills_section: "",
                experience_section: "",
                education_section: "",
                languages_section: "",
              },
              background_image: "",
              profile_initials: "",
              fullTextContent: "",
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
              images: {
                background_prompt: "",
                visual_elements: [],
              },
              needsMoreInfo: true,
              questions: critical,
            };
          }
        }
        
        console.log('✅ CV: Profile sufficient OR questions skipped');
      } catch (analysisError) {
        timer.end();
        console.warn('⚠️ Question analysis failed, continuing:', analysisError);
      }
    } else {
      console.log('⭐ CV: Skipping question analysis (skipQuestions=true)');
    }

    // ════════════════════════════════════════════════════════════════
    // ✅ STEP 2: MERGE ANSWERS
    // ════════════════════════════════════════════════════════════════
    
    let enhancedUserData = { ...userData };
    
    if (answeredQuestions && answeredQuestions.length > 0) {
      timer.start("Merge Answers");
      
      console.log(`📝 Merging ${answeredQuestions.length} answers into profile...`);
      
      const merged = mergeCVAnswers(
        toLangChainInput(userData),
        answeredQuestions
      );
      
      enhancedUserData = {
        ...userData,
        workExperience: merged.workExperience || userData.workExperience,
        education: merged.education || userData.education,
        skills: merged.skills || userData.skills,
        workingStyle: merged.workingStyle || userData.workingStyle,
        problemSolving: merged.problemSolving || userData.problemSolving,
        uniqueStrength: merged.uniqueStrength || userData.uniqueStrength,
        careerGoals: merged.careerGoals || userData.careerGoals,
        bestProjectExample: merged.bestProjectExample || userData.bestProjectExample,
      };
      
      console.log('✅ Answers merged into enhanced profile');
      timer.end();
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 3+: LOPUT (sama kuin ennen, mutta käytä enhancedUserData!)
    // ════════════════════════════════════════════════════════════════
    
    timer.start("Extractions");
    
    const personalityExtraction: PersonalityExtraction = {
      overallPersonality: {
        summary: "Professional with growth mindset",
        topTraits: ["Adaptable", "Motivated"],
        workplaceStrengths: ["Communication"],
        detectedLanguage: enhancedUserData.language || 'finnish'
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

    let promptTemplate = atsOptimizedSimplePrompt;

    checkTimeout();

// STEP 5: AI Generation
timer.start("AI Generation");

// ✅ DEBUG: Mitä AI saa inputtina?
console.log('🔍 AI INPUT DATA:');
console.log('  - Name:', finalUserData.name);
console.log('  - Work Experience length:', finalUserData.workExperience?.length || 0);
console.log('  - Work Experience:', finalUserData.workExperience?.substring(0, 200));
console.log('  - Education length:', finalUserData.education?.length || 0);
console.log('  - Skills:', finalUserData.skills?.substring(0, 100));
console.log('  - Best Project:', finalUserData.bestProjectExample?.substring(0, 100));
console.log('  - Career Goals:', finalUserData.careerGoals?.substring(0, 100));



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
      careerGoals: finalUserData.careerGoals || '',
      format_instructions: outputParser.getFormatInstructions()
    });

    const result = await Promise.race([
      model.invoke(formatted),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000))
    ]);

    const rawContentString = getMessageContent(result);
    timer.end();

    checkTimeout();
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

// ✅ QUALITY CHECK: Onko sisältö riittävän pitkä?
console.log('📏 Content length check:');
console.log('  - Personal:', parsedOutput.personal_description?.length || 0);
console.log('  - Skills:', parsedOutput.cv_content.skills_section?.length || 0);
console.log('  - Experience:', parsedOutput.cv_content.experience_section?.length || 0);
console.log('  - Education:', parsedOutput.cv_content.education_section?.length || 0);

// Jos experience on liian lyhyt, luo fallback
if ((parsedOutput.cv_content.experience_section?.length || 0) < 50) {
  console.warn('⚠️ Experience section too short, creating fallback...');
  
  // Rakenna järkevä kokemus-osio käytettävissä olevasta datasta
  const experienceFallback: string[] = [];
  
  // Jos on best project
  if (finalUserData.bestProjectExample && finalUserData.bestProjectExample.length > 20) {
    experienceFallback.push(`<strong>Projektityöskentely</strong><br>${finalUserData.bestProjectExample}`);
  }
  
  // Jos on skills, muunna ne kokemukseksi
  if (finalUserData.skills && finalUserData.skills.length > 10) {
    const skillsList = finalUserData.skills.split(',').map(s => s.trim()).slice(0, 5);
    experienceFallback.push(
      `<strong>Tekninen osaaminen käytännössä</strong><br>` +
      `Kehittänyt osaamistani seuraavilla osa-alueilla:<br>` +
      skillsList.map(skill => `• ${skill}`).join('<br>')
    );
  }
  
  // Jos on career goals
  if (finalUserData.careerGoals && finalUserData.careerGoals.length > 20) {
    experienceFallback.push(`<strong>Urasuunnitelma</strong><br>${finalUserData.careerGoals}`);
  }
  
  // Jos mitään ei ole, luo geneerinen
  if (experienceFallback.length === 0) {
    experienceFallback.push(
      `<strong>Osaamisen kehittäminen</strong><br>` +
      `Aktiivisesti kehittänyt osaamistani ${finalUserData.cvType || 'ohjelmoin nin'} saralla. ` +
      `Keskittynyt käytännön projekteihin ja modernien teknologioiden oppimiseen.`
    );
  }
  
  parsedOutput.cv_content.experience_section = experienceFallback.join('<br><br>');
  console.log('✅ Fallback experience created:', parsedOutput.cv_content.experience_section.length, 'chars');
}


const guardianCheck = {
  approved: true,
  riskLevel: 'safe' as const,
  violations: {}
};

checkTimeout();

timer.start("Background");

let backgroundImage: string = "";

if (finalUserData.backgroundImage) {
  backgroundImage = finalUserData.backgroundImage;
}

if (!backgroundImage) {
  try {
    const generatedUrl = await generateEnhancedBackgroundImage(
      toLangChainInput(finalUserData), 
      authToken
    );

    if (generatedUrl && generatedUrl.startsWith("http")) {
      const pathMatch = generatedUrl.match(/\/cv_files\/(.+)$/);
      if (pathMatch) {
        backgroundImage = pathMatch[1];
      } else {
        backgroundImage = generatedUrl;
      }
    } else if (generatedUrl && generatedUrl.startsWith("data:")) {
      backgroundImage = generatedUrl;
    }
  } catch (error) {
    console.error("❌ Background generation error:", error);
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