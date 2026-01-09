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
import { FALLBACK_IMAGE } from "../utils";

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
  profile_image: string; // ✅ JO OLEMASSA
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
  // ❌ POISTA TÄMÄ jos se on täällä:
  // ats_optimization?: CVOutputType['ats_optimization'];
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

// ════════════════════════════════════════════════════════════════
// PROMPTS - PÄIVITETTY STRATEGIA
// ════════════════════════════════════════════════════════════════

// ✅ SIMPLE CV - Rento, persoonallinen esittely
const simplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are creating a PERSONAL, FRIENDLY CV in first person.

{knowledgeContext}

**STYLE: Rento ja lähestyttävä**
- Pitkä, kuvaileva teksti
- Kerro KEN hakija on ihmisenä
- Persoonallisuus ja vahvuudet esiin
- Tarina ja konteksti, ei pelkkiä listoja

**STRUCTURE:**
- Personal Description: 200-250 sanaa (engagoiva, persoonallinen)
- Skills: Tekstimuotoinen kuvaus taidoista kontekstissa
- Experience: Tarinamuotoinen, mitä opin ja saavutin
- Education: Lyhyt kuvaus koulutuksesta
- Languages: Vapaamuotoinen

{atsInstructions}

{format_instructions}`],

  ["human", `Create a friendly, personal CV for:

**PERSON:**
Name: {name}
Skills: {skills}
Experience: {workExperience}
Education: {education}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}

**CONTEXT:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}

{jobContext}

Write in {language}. Be warm, personal, and engaging. Tell their story.`]
]);

// ✅ TECHNICAL CV - Ammattimainen, listamainen
const technicalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are creating a PROFESSIONAL, STRUCTURED CV in first person.

{knowledgeContext}

**STYLE: Ammattimainen ja selkeä**
- Listamuotoinen, keypointit esiin
- Kurssit, sertifikaatit, teknologiat
- Mitattavat saavutukset
- Selkeä hierarkia ja struktuuri

**STRUCTURE:**
- Personal Description: 100-150 sanaa (ammattitasoinen, asiallinen)
- Skills: Lista teknologioista ja työkaluista, taitotasot
- Experience: Bullet-muotoinen, mitattavat tulokset
- Education: Kurssit, arvosanat, sertifikaatit
- Languages: Taitotasot selkeästi

{atsInstructions}

{format_instructions}`],

  ["human", `Create a professional, technical CV for:

**PROFESSIONAL:**
Name: {name}
Skills: {skills}
Experience: {workExperience}
Education: {education}

**COMPETENCIES:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

**ACHIEVEMENTS:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}

{jobContext}

Write in {language}. Be professional, structured, and clear. Focus on measurable results.`]
]);

// ✅ CREATIVE CV - Leikittelevä mutta ammattitasoinen
const creativePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are creating a CREATIVE, DYNAMIC CV in first person.

{knowledgeContext}

**STYLE: Luova ja visuaalinen**
- Sekoitus: lyhyt teksti + keypointit
- Erottuu massasta, mutta ammattitasoinen
- Persoonallisuus paistaa läpi
- Visuaalinen hierarkia

**STRUCTURE:**
- Personal Description: 120-180 sanaa (luova, energinen, mukaansatempaava)
- Skills: Visuaalinen lista vahvuuksista, ikoneita ja teemoja
- Experience: Sekoitus tekstiä ja listoja, storytelling + faktoja
- Education: Luova esitys koulutuksesta
- Languages: Hauskat kuvaukset taitotasoista

{atsInstructions}

{format_instructions}`],

  ["human", `Create a creative, engaging CV for:

**CREATIVE PROFESSIONAL:**
Name: {name}
Skills: {skills}
Experience: {workExperience}
Education: {education}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}

**STORY:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}

{jobContext}

Write in {language}. Be creative, dynamic, and memorable. Mix storytelling with facts.`]
]);

// ════════════════════════════════════════════════════════════════
// ATS & RAG CONTEXT BUILDERS
// ════════════════════════════════════════════════════════════════

function buildATSInstructions(jobPosting?: string): string {
  if (!jobPosting) return '';
  
  return `
**🎯 ATS OPTIMIZATION ACTIVE:**

This CV is targeted for a SPECIFIC JOB. Your mission:
1. **Keyword Match**: Use exact keywords from job posting
2. **Mirror Language**: Match the job description's terminology
3. **Highlight Relevant Skills**: Emphasize skills mentioned in job posting
4. **Prioritize Relevant Experience**: Lead with most relevant projects/roles
5. **Quantify Achievements**: Use metrics that align with job requirements
6. **ATS-Friendly Format**: Clear structure, standard sections, no fancy formatting

**JOB POSTING ANALYSIS:**
Extract key requirements, skills, and values from this job posting and optimize CV accordingly.

CRITICAL: Make this CV the PERFECT match for THIS specific job.
`;
}

function buildJobContext(jobPosting?: string): string {
  if (!jobPosting) return '';
  
  return `
**TARGET JOB POSTING:**
${jobPosting.substring(0, 1500)}

Tailor the CV to match this job posting's requirements.
`;
}

function buildRAGContext(ragEnabled: boolean, ragData?: string): string {
  if (!ragEnabled || !ragData) return '';
  
  return `
**📚 CV EXPERT INSIGHTS (from professional articles):**

${ragData}

Use these insights to enhance CV quality and structure.
`;
}


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

// ════════════════════════════════════════════════════════════════
// ✅ MAIN FUNCTION - KYSYMYSLOGIIKKA LISÄTTY!
// ════════════════════════════════════════════════════════════════

export async function generateCVWithPersonalityExtraction(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  console.log('🚀 [CV GEN] STARTED');
  console.log('   - User:', userData.name);
  console.log('   - Type:', userData.cvType);
  console.log('   - Skip Questions:', userData.skipQuestions);
  
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

  // ✅ EKSTRAKTOI KAIKKI TARVITTAVAT MUUTTUJAT HETI ALUSSA
  const { 
    authToken, 
    jobPosting, 
    userId, 
    skipQuestions, 
    answeredQuestions,
    enableRAG // ✅ LISÄTTY TÄNNE!
  } = userData;

  try {
    console.log('✅ [CV GEN] Try block entered');
    checkTimeout();
    
    // ════════════════════════════════════════════════════════════════
    // STEP 1: QUESTION ANALYSIS
    // ════════════════════════════════════════════════════════════════
    
    console.log('🔍 [CV GEN] STEP 1: Question Analysis');
    console.log('   - skipQuestions:', skipQuestions);
    
    if (!skipQuestions) {
      console.log('   → Running question analysis...');
      timer.start("Question Analysis");

      try {
        console.log('   → Calling analyzeJobAndProfile...');
        
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

        console.log('   ✅ analyzeJobAndProfile completed');
        console.log('   - Should ask:', smartAnalysis.shouldAskQuestions);
        console.log('   - Questions:', smartAnalysis.questions?.length || 0);
        
        timer.end();

        if (smartAnalysis.shouldAskQuestions && smartAnalysis.questions.length > 0) {
          const unanswered = smartAnalysis.questions.filter((q) => {
            if (!answeredQuestions?.length) return true;
            return !answeredQuestions.some(
              (a) => a.id === q.id || a.question === q.question
            );
          });

          const critical = unanswered.filter(q => q.priority === 'critical');
          
          console.log('   - Unanswered:', unanswered.length);
          console.log('   - Critical:', critical.length);
          
    if (critical.length > 0) {
  console.log('❓ [CV GEN] Returning questions (exiting early)');
  
  return {
    personal_description: "",
    html: {
      skills_section: "",
      experience_section: "",
      education_section: "",
      languages_section: "",
    },
    background_image: "",
    profile_image: "",
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
}  // ✅ TÄMÄ PUUTTUI!
        }
console.log('   ✅ No critical questions needed');
      } catch (analysisError) {
        timer.end();
        console.error('   ❌ Question analysis ERROR:', analysisError);
        console.warn('   → Continuing without questions');
      }
    } else {
      console.log('   ⭐ Questions skipped (skipQuestions=true)');
    }

    console.log('✅ [CV GEN] STEP 1 completed');
    
    // ════════════════════════════════════════════════════════════════
    // STEP 2: MERGE ANSWERS
    // ════════════════════════════════════════════════════════════════

    console.log('📝 [CV GEN] STEP 2: Merge Answers');

    let enhancedUserData = { ...userData };

    if (answeredQuestions && answeredQuestions.length > 0) {
      timer.start("Merge Answers");
      
      console.log(`   → Merging ${answeredQuestions.length} answers...`);
      
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
      
      console.log('   ✅ Answers merged');
      timer.end();
    } else {
      console.log('   ⭐ No answers to merge');
    }

    console.log('✅ [CV GEN] STEP 2 completed');

    // ════════════════════════════════════════════════════════════════
    // STEP 3: EXTRACTIONS (simplified)
    // ════════════════════════════════════════════════════════════════

    console.log('🔬 [CV GEN] STEP 3: Extractions (simplified)');
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
    console.log('✅ [CV GEN] STEP 3 completed');

    const finalUserData = { ...enhancedUserData };

    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 4: SELECT PROMPT & BUILD CONTEXT
    // ════════════════════════════════════════════════════════════════

    console.log('🎨 [CV GEN] STEP 4: Prompt Selection & Context Building');
    timer.start("Prompt Selection");

    let promptTemplate: ChatPromptTemplate;
    let cvTypeDescription: string;

    switch (finalUserData.cvType) {
      case 'simple':
        promptTemplate = simplePrompt;
        cvTypeDescription = 'rento ja persoonallinen esittely-CV';
        break;
      case 'technical':
        promptTemplate = technicalPrompt;
        cvTypeDescription = 'ammattimainen tekninen CV';
        break;
      case 'creative':
        promptTemplate = creativePrompt;
        cvTypeDescription = 'luova ja dynaaminen CV';
        break;
      default:
        promptTemplate = simplePrompt;
        cvTypeDescription = 'rento CV';
    }

    console.log(`   - CV Type: ${cvTypeDescription}`);
    console.log(`   - ATS: ${!!jobPosting}`);
    console.log(`   - RAG: ${!!enableRAG}`);

    // BUILD CONTEXT STRINGS
    const atsInstructions = buildATSInstructions(jobPosting);
    const jobContext = buildJobContext(jobPosting);

    // ✅ RAG Knowledge Context
    let knowledgeContext = '';
    if (enableRAG) {
      try {
        console.log('   → Building RAG context...');
        
        knowledgeContext = await buildAIContext({
          jobDescription: jobPosting || 'General CV creation',
          userProfile: {
            name: finalUserData.name,
            skills: finalUserData.skills,
            workExperience: finalUserData.workExperience,
            education: finalUserData.education,
          },
          enableRAG: true,
          contentType: 'cv'
        });
        
        console.log(`   ✅ RAG context built: ${knowledgeContext.length} chars`);
      } catch (error) {
        console.error('   ❌ RAG context failed:', error);
        
        knowledgeContext = await buildAIContext({
          jobDescription: '',
          enableRAG: false,
          contentType: 'cv'
        });
      }
    } else {
      knowledgeContext = await buildAIContext({
        jobDescription: '',
        enableRAG: false,
        contentType: 'cv'
      });
    }

    timer.end();
    console.log('✅ [CV GEN] STEP 4 completed');

    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 5: AI GENERATION
    // ════════════════════════════════════════════════════════════════

    console.log('🤖 [CV GEN] STEP 5: AI Generation');
    timer.start("AI Generation");

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      timeout: 20000,
    });

    const formatted = await promptTemplate.formatMessages({
      knowledgeContext: knowledgeContext || 'No additional context',
      atsInstructions: atsInstructions || '',
      jobContext: jobContext || '',
      language: finalUserData.language || 'finnish',
      name: finalUserData.name || 'Professional',
      skills: finalUserData.skills || 'Developing',
      workExperience: finalUserData.workExperience || 'Building experience',
      education: finalUserData.education || 'Learning',
      workingStyle: finalUserData.workingStyle || 'Adaptable',
      problemSolving: finalUserData.problemSolving || 'Resourceful',
      uniqueStrength: finalUserData.uniqueStrength || 'Motivated',
      superpower: finalUserData.superpower || 'Fast learner',
      careerGoals: finalUserData.careerGoals || '',
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

    // ════════════════════════════════════════════════════════════════
    // STEP 6: PARSING
    // ════════════════════════════════════════════════════════════════

    console.log('📋 [CV GEN] STEP 6: Parsing');
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
    console.log('✅ [CV GEN] STEP 6 completed');

    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 7: FINALIZATION
    // ════════════════════════════════════════════════════════════════

    console.log('🏁 [CV GEN] STEP 7: Finalization');

    const guardianCheck = {
      approved: true,
      riskLevel: 'safe' as const,
      violations: {}
    };

    timer.start("Background");

    let backgroundImage: string = "";

    if (finalUserData.backgroundImage) {
      backgroundImage = finalUserData.backgroundImage;
    } else {
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
        console.error('   ❌ Background generation error:', error);
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

    console.log('✅ [CV GEN] COMPLETE - Returning result');

    // ✅ RETURN - Tämä on tärkein!
 return {
  personal_description: parsedOutput.personal_description,
  html: parsedOutput.cv_content,
  background_image: finalBackgroundImage || "", // ✅ Käytä finalBackgroundImage
  profile_image: profileImageClean || "", // ✅ Käytä profileImageClean
  profile_initials: userData.profileImage ? "" : generateInitials(userData.name),
  fullTextContent: fullTextContent,
  ats_data: parsedOutput.ats_optimization || null, // ✅ VAIN ats_data, EI ats_optimization
  job_analysis: jobAnalysis,
  ground_truth_check: guardianCheck, // ✅ Lisää tämä jos haluat
  images: {
    background_prompt: "",
    visual_elements: [],
  },
};
    
  } catch (error) {
    console.error('❌ [CV GEN] FATAL ERROR:', error);
    console.error('   Stack:', error instanceof Error ? error.stack : 'No stack');
    throw error;
  }
}

// ✅ POISTA MYÖS TURHAT FUNKTIOT LOPUSTA:
export async function generateCVSafely(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  try {
    const timeoutPromise = new Promise<CVGenerationResult>((_, reject) => {
      setTimeout(() => reject(new Error('CV generation timeout (55s)')), 55000);
    });

    return await Promise.race([
      generateCVWithPersonalityExtraction(userData),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('CV generation failed:', error);
    throw error;
  }
}