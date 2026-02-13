// lib/langchain/cvGenerator.ts - KORJATTU: DB-haku + AI-analysointi kysymyksille

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
  masterGuardianValidatorV2,
  type GroundTruth,
} from "@/lib/ats/masterGuardian";

import { buildAIContext } from "@/lib/knowledge";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { FALLBACK_IMAGE } from "../utils";

// ✅ UUDET IMPORTIT
import {
  fetchPreviousResponses,
  convertToAnswerFormat,
  mergeResponsesIntoProfile,
} from "./responseHelper";

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
  profile_image: string;
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
// HELPERS
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

// ✅ ALKUPERÄINEN mergeCVAnswers - PIDETÄÄN TÄSMÄLLEEN SAMANA
// Käytetään kun käyttäjä vastaa kysymysmodaalin kysymyksiin (answeredQuestions)
function mergeCVAnswers(
  userData: LangChainCVInput,
  answers: Array<{ id: string; question: string; answer: string }>
): Partial<LangChainCVInput> {
  const merged: Partial<LangChainCVInput> = {};

  answers.forEach((item) => {
    const q = item.question.toLowerCase();
    const a = item.answer;

    if (q.includes('työkokemus') || q.includes('work experience') || q.includes('projektit') || q.includes('projects')) {
      merged.workExperience = (merged.workExperience || userData.workExperience || '') + '\n\n' + a;
    }
    else if (q.includes('koulutus') || q.includes('education') || q.includes('opiskelu')) {
      merged.education = (merged.education || userData.education || '') + '\n\n' + a;
    }
    else if (q.includes('osaaminen') || q.includes('taidot') || q.includes('skills')) {
      merged.skills = (merged.skills || userData.skills || '') + ', ' + a;
    }
    else if (q.includes('työskentelytyyli') || q.includes('working style')) {
      merged.workingStyle = a;
    }
    else if (q.includes('ongelmanratkaisu') || q.includes('problem solving')) {
      merged.problemSolving = a;
    }
    else if (q.includes('vahvuus') || q.includes('strength')) {
      merged.uniqueStrength = a;
    }
    else if (q.includes('tavoite') || q.includes('goal')) {
      merged.careerGoals = a;
    }
    else if (q.includes('projekti') || q.includes('project')) {
      merged.bestProjectExample = a;
    }
    else {
      if (a.length > 50) {
        merged.workExperience = (merged.workExperience || userData.workExperience || '') + '\n\n' + a;
      }
    }
  });

  return merged;
}

// ════════════════════════════════════════════════════════════════
// PROMPTS - ALKUPERÄISET TÄSMÄLLEEN
// ════════════════════════════════════════════════════════════════

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

const technicalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are creating a PROFESSIONAL, STRUCTURED CV in first person.

{knowledgeContext}

**STYLE: Ammattimainen ja selkeä**
- Listamuotoinen, keypointit esiin
- Kurssit, sertifikaatit, teknologiat
- Mitattavat saavutukset
- Selkeä hierarkia ja struktuuri

**CRITICAL FORMATTING RULES:**

1. **Skills Section** - MUST be structured with HTML categories:
   <h3>Programming Languages</h3>
   <ul>
     <li>Python (5 years)</li>
     <li>JavaScript/TypeScript (3 years)</li>
   </ul>
   <h3>Tools & Frameworks</h3>
   <ul>
     <li>React, Next.js</li>
     <li>Node.js, Express</li>
   </ul>

2. **Experience Section** - MUST be chronological with clear structure:
   <div class="job">
     <h4>Job Title - Company Name</h4>
     <p class="date">Month Year - Month Year (or Present)</p>
     <ul>
       <li>Measurable achievement with numbers</li>
       <li>Technology used and impact</li>
       <li>Problem solved and result</li>
     </ul>
   </div>

3. **Education Section** - Chronological with details:
   <div class="education">
     <h4>Degree Name</h4>
     <p>Institution Name</p>
     <p class="date">Graduation Year</p>
     <p>GPA: X.X/X.X (if good)</p>
     <ul>
       <li>Relevant coursework</li>
       <li>Certifications</li>
     </ul>
   </div>

4. **Languages** - Simple list with proficiency levels:
   <ul>
     <li>Finnish - Native</li>
     <li>English - Fluent (C1)</li>
     <li>Swedish - Basic (A2)</li>
   </ul>

**PERSONAL DESCRIPTION:**
- 100-150 words
- Professional tone
- Highlight measurable achievements
- Focus on technical expertise
- NO flowery language

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

IMPORTANT RULES:
1. Skills MUST be categorized with <h3> headers
2. Experience MUST list each job separately with dates
3. Use bullet points for achievements
4. Include numbers and metrics
5. Be concise and professional
6. No narrative style - pure facts

Write in {language}.`]
]);

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
// CONTEXT BUILDERS - ALKUPERÄISET
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

// ════════════════════════════════════════════════════════════════
// OTHER HELPERS - ALKUPERÄISET
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
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════

export async function generateCVWithPersonalityExtraction(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  console.log('🚀 [CV GEN] STARTED');
  console.log('   - User:', userData.name);
  console.log('   - Type:', userData.cvType);
  console.log('   - Skip Questions:', userData.skipQuestions);
  console.log('   - Answered Questions:', userData.answeredQuestions?.length || 0);
  console.log('   - Language:', userData.language);
  
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

  const { 
    authToken, 
    jobPosting, 
    userId, 
    skipQuestions, 
    answeredQuestions,
    enableRAG
  } = userData;

  try {
    console.log('✅ [CV GEN] Try block entered');
    checkTimeout();
    
    // ════════════════════════════════════════════════════════════════
    // STEP 1: KYSYMYSLOGIIKKA
    //
    // ✅ KORJATTU: Ei kovakoodattuja kysymyksiä.
    // Kysymysanalyysi tapahtuu cvQuestionAnalyzer.ts:ssä (analyzeCVData)
    // ennen kuin tänne tullaan. Jos skipQuestions=true tai on jo
    // vastauksia, generoidaan suoraan.
    // ════════════════════════════════════════════════════════════════
    
    const hasAnswers = answeredQuestions && answeredQuestions.length > 0;
    const shouldSkipQuestions = skipQuestions || hasAnswers;
    
    console.log('🔍 [CV GEN] Question logic:', {
      skipQuestions,
      hasAnswers,
      shouldSkipQuestions,
      answerCount: answeredQuestions?.length || 0
    });

    if (!shouldSkipQuestions) {
      console.log('✅ [CV GEN] No questions needed, proceeding to generation...');
    } else {
      console.log(`✅ [CV GEN] Skipping questions (${hasAnswers ? 'has answers' : 'skipQuestions=true'})`);
    }
    
    // ════════════════════════════════════════════════════════════════
    // STEP 2: MERGE ANSWERS
    //
    // ✅ KORJATTU:
    // 2A – Jos ei uusia vastauksia, hae aiemmat DB:stä
    // 2B – Yhdistä uudet vastaukset (jos tuli kysymysmodaalista)
    // ════════════════════════════════════════════════════════════════

    console.log('📝 [CV GEN] STEP 2: Merge Answers');

    let enhancedUserData = { ...userData };

    // ✅ 2A: Hae aiemmat vastaukset tietokannasta
    // Tehdään AINA kun ei ole uusia vastauksia — riippumatta skipQuestions-arvosta
    if ((!answeredQuestions || answeredQuestions.length === 0) && userId) {
      timer.start("Fetch Previous Answers");
      
      try {
        console.log('🔍 [CV GEN] No new answers — fetching previous from DB...');

        const previousResponses = await fetchPreviousResponses('cv', 'cv_generation');

        if (previousResponses.length > 0) {
          console.log(`   📚 Found ${previousResponses.length} previous responses`);

          const answers = convertToAnswerFormat(previousResponses);
          const merged = mergeResponsesIntoProfile(
            toLangChainInput(userData) as Record<string, any>,
            answers
          );

          enhancedUserData = {
            ...userData,
            workExperience:     merged.workExperience     ?? userData.workExperience,
            education:          merged.education          ?? userData.education,
            skills:             merged.skills             ?? userData.skills,
            workingStyle:       merged.workingStyle       ?? userData.workingStyle,
            problemSolving:     merged.problemSolving     ?? userData.problemSolving,
            uniqueStrength:     merged.uniqueStrength     ?? userData.uniqueStrength,
            careerGoals:        merged.careerGoals        ?? userData.careerGoals,
            bestProjectExample: merged.bestProjectExample ?? userData.bestProjectExample,
          };

          console.log('   ✅ Previous answers merged from DB');
        } else {
          console.log('   ℹ️  No previous responses found');
        }
      } catch (err) {
        console.error('⚠️ DB merge failed (non-fatal):', err);
      } finally {
        timer.end();
      }
    }

    // ✅ 2B: Yhdistä uudet vastaukset kysymysmodaalista
    // Käytetään jo rikastettua dataa pohjana (ei alkuperäistä userData:a)
    if (answeredQuestions && answeredQuestions.length > 0) {
      timer.start("Merge New Answers");
      
      console.log(`   → Merging ${answeredQuestions.length} new answers...`);
      
      const merged = mergeCVAnswers(
        toLangChainInput(enhancedUserData),
        answeredQuestions
      );
      
      enhancedUserData = {
        ...enhancedUserData,
        workExperience:     merged.workExperience     || enhancedUserData.workExperience,
        education:          merged.education          || enhancedUserData.education,
        skills:             merged.skills             || enhancedUserData.skills,
        workingStyle:       merged.workingStyle       || enhancedUserData.workingStyle,
        problemSolving:     merged.problemSolving     || enhancedUserData.problemSolving,
        uniqueStrength:     merged.uniqueStrength     || enhancedUserData.uniqueStrength,
        careerGoals:        merged.careerGoals        || enhancedUserData.careerGoals,
        bestProjectExample: merged.bestProjectExample || enhancedUserData.bestProjectExample,
      };
      
      console.log('   ✅ New answers merged');
      timer.end();
    }

    console.log('✅ [CV GEN] STEP 2 completed');

    // ════════════════════════════════════════════════════════════════
    // STEP 3: SIMPLIFIED EXTRACTIONS - ALKUPERÄINEN
    // ════════════════════════════════════════════════════════════════

    console.log('🔬 [CV GEN] STEP 3: Extractions');
    timer.start("Extractions");

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
    // STEP 4: SELECT PROMPT & BUILD CONTEXT - ALKUPERÄINEN
    // ════════════════════════════════════════════════════════════════

    console.log('🎨 [CV GEN] STEP 4: Prompt Selection');
    timer.start("Prompt Selection");

    let promptTemplate: ChatPromptTemplate;

    switch (finalUserData.cvType) {
      case 'simple':
        promptTemplate = simplePrompt;
        break;
      case 'technical':
        promptTemplate = technicalPrompt;
        break;
      case 'creative':
        promptTemplate = creativePrompt;
        break;
      default:
        promptTemplate = simplePrompt;
    }

    const atsInstructions = buildATSInstructions(jobPosting);
    const jobContext = buildJobContext(jobPosting);

    let knowledgeContext = '';
    if (enableRAG) {
      try {
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
      } catch (error) {
        console.error('RAG failed:', error);
        knowledgeContext = '';
      }
    }

    timer.end();
    console.log('✅ [CV GEN] STEP 4 completed');

    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 5: AI GENERATION - ALKUPERÄINEN
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
    // STEP 6: PARSING - ALKUPERÄINEN
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
    // STEP 7: FINALIZATION - ALKUPERÄINEN
    // ════════════════════════════════════════════════════════════════

    console.log('🏁 [CV GEN] STEP 7: Finalization');

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
        console.error('Background generation error:', error);
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

    console.log('✅ [CV GEN] COMPLETE');

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: finalBackgroundImage || "",
      profile_image: profileImageClean || "",
      profile_initials: userData.profileImage ? "" : generateInitials(userData.name),
      fullTextContent: fullTextContent,
      ats_data: parsedOutput.ats_optimization || null,
      job_analysis: jobAnalysis,
      images: {
        background_prompt: "",
        visual_elements: [],
      },
    };
    
  } catch (error) {
    console.error('❌ [CV GEN] FATAL ERROR:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
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

    return await Promise.race([
      generateCVWithPersonalityExtraction(userData),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('CV generation failed:', error);
    throw error;
  }
}