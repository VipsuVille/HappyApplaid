// lib/langchain/cvGenerator.ts - PRODUCTION READY VERSION
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
import { analyzeCVData, mergeCVAnswers } from "@/lib/langchain/cvQuestionAnalyzer";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23f0f0f0' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23999' text-anchor='middle' dy='.3em'%3EBackground Image%3C/text%3E%3C/svg%3E";

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
function cleanImageUrl(url?: string): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();

  // ❌ Estä placeholderit ja defaultit
  if (
    trimmed === "" ||
    trimmed.includes("cv_files/default") ||
    trimmed.endsWith("/default")
  ) {
    return null;
  }

  // ✅ Salli data:image
  if (trimmed.startsWith("data:image/")) return trimmed;

  // ✅ Salli https kuvat
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
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

    if (!response.ok) return FALLBACK_IMAGE;

    const data = await response.json() as { url?: string };
    if (!data.url) return FALLBACK_IMAGE;

    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      if (!base64Data) return FALLBACK_IMAGE;
      imageBlob = await (await fetch(`data:application/octet-stream;base64,${base64Data}`)).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) return FALLBACK_IMAGE;
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

    if (uploadError) return FALLBACK_IMAGE;

    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) return FALLBACK_IMAGE;

    try {
      await supabase.from('default_images').insert({
        user_id: userId,
        image_type: 'background',
        file_path: filePath,
        name: `Generated ${new Date().toLocaleDateString()}`,
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
    return FALLBACK_IMAGE;
  }
}

// ════════════════════════════════════════════════════════════════
// CV PROMPTS
// ════════════════════════════════════════════════════════════════

// lib/langchain/cvGenerator.ts - SIMPLE CV PROMPT (A4-OPTIMIZED)

const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating FIRST-PERSON CVs for ALL backgrounds.

{knowledgeContext}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# ═══════════════════════════════════════════════════════════════
# CRITICAL: A4 PAGE CONSTRAINT (MUST FIT ONE PAGE)
# ═══════════════════════════════════════════════════════════════

**MANDATORY LENGTH LIMITS:**

1. **Personal Description:** MAX 100 words (450 characters)
   - 2-3 sentences ONLY
   - Focus: Core value + key strength
   - Example: "I am a [role] with [X] experience in [field]. Known for [strength], I excel at [skill]. Seeking to [goal]."

2. **Skills Section:** MAX 6 skills
   - Format: "• Skill name"
   - NO descriptions, NO proficiency bars
   - 1 line per skill
   - Example:
     • React & TypeScript
     • Project Management
     • Data Analysis

3. **Experience Section:** MAX 2 positions
   - Each position: Title, Company, Duration (1 line)
   - MAX 2 bullet points per position
   - Each bullet: 1 line, max 70 characters
   - Example:
     Software Developer, Tech Corp (2020-2023)
     • Built 3 web applications serving 10k+ users
     • Improved page load time by 40%

4. **Education Section:** MAX 2 entries
   - Format: Degree, School, Year
   - 1 line per entry, NO descriptions
   - Example:
     • B.Sc. Computer Science, Helsinki University, 2020

5. **Languages Section:** MAX 3 languages
   - Format: "Language: Level"
   - Example:
     • Finnish: Native
     • English: Fluent
     • Swedish: Intermediate

**TOTAL CV LENGTH:** MAX 2800 characters (incl. HTML tags)

**WHY THIS MATTERS:**
- CVs must fit ONE A4 page when printed
- Recruiters spend 6 seconds scanning CVs
- Concise = Professional = Readable

# ═══════════════════════════════════════════════════════════════

# RULES
✅ Write in first person ("I am...", "I have...")
✅ Use ONLY verified skills from {verifiedSkills}
✅ Focus on personality and potential
✅ If limited experience, emphasize learning + attitude
✅ Keep it SHORT and IMPACTFUL
❌ NEVER invent skills not in {verifiedSkills}
❌ NEVER exceed length limits above
❌ NEVER use placeholder text like [Your details here]

LANGUAGE: {language}
TONE: Professional but personable

{format_instructions}`],

  ["human", `Create Simple CV (personality-focused, A4-optimized).

**CANDIDATE:**
Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

**CRITICAL INSTRUCTIONS:**
1. Keep personal description under 100 words
2. Max 6 skills, max 2 jobs, max 2 education entries
3. MUST fit ONE A4 page (2800 chars total)
4. Write in {language}

Return JSON with cv_content sections. Be concise!`]
]);

// lib/langchain/cvGenerator.ts - TECHNICAL CV PROMPT (A4-OPTIMIZED)

const atsOptimizedTechnicalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating TECHNICAL CVs.

{knowledgeContext}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# ═══════════════════════════════════════════════════════════════
# CRITICAL: A4 PAGE CONSTRAINT (TECHNICAL VERSION)
# ═══════════════════════════════════════════════════════════════

**MANDATORY LENGTH LIMITS (Technical CVs get slightly more space):**

1. **Personal Description:** MAX 120 words (500 characters)
   - 3 sentences: Role + Technical Focus + Achievement
   - Example: "Software engineer with 3 years in full-stack development. Specialized in React, Node.js, and cloud architecture. Built scalable systems serving 100k+ users."

2. **Skills Section:** MAX 10 technical skills
   - Format: "• Technology/Framework"
   - Group by category if needed
   - Example:
     Frontend: React, TypeScript, Next.js
     Backend: Node.js, PostgreSQL, REST APIs
     Tools: Git, Docker, AWS

3. **Experience Section:** MAX 3 positions
   - Each position: Title, Company, Duration (1 line)
   - MAX 3 bullet points per position
   - Each bullet: Include metrics/numbers
   - Example:
     Senior Developer, TechCorp (2021-2024)
     • Led migration to microservices (reduced latency 60%)
     • Built CI/CD pipeline (deploy time: 2h → 15min)
     • Mentored 3 junior developers

4. **Education Section:** MAX 2 entries
   - Include relevant coursework if space allows
   - Example:
     • M.Sc. Computer Science, Aalto, 2020
       Focus: Machine Learning, Algorithms

5. **Languages Section:** MAX 3 languages
   - Format: "Language: Level"

**TOTAL CV LENGTH:** MAX 3500 characters

# ═══════════════════════════════════════════════════════════════

# RULES FOR TECHNICAL CV
✅ Focus on technical skills and measurable achievements
✅ Include specific technologies from {verifiedSkills}
✅ Use numbers/metrics wherever possible
✅ Emphasize technical problem-solving
✅ Mention frameworks, tools, methodologies
❌ NEVER fabricate technical experience
❌ NEVER claim skills not in {verifiedSkills}
❌ NEVER exceed length limits

LANGUAGE: {language}
TONE: Technical but clear

{format_instructions}`],

  ["human", `Create Technical CV (A4-optimized).

**CANDIDATE:**
Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}
Best Project: {bestProjectExample}

**CRITICAL:**
- Max 120 words for description
- Max 10 technical skills
- Max 3 jobs with metrics
- MUST fit ONE A4 page (3500 chars)
- Language: {language}

Return JSON. Be technical but concise!`]
]);

// lib/langchain/cvGenerator.ts - CREATIVE CV PROMPT (A4-OPTIMIZED)

const atsOptimizedCreativePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating CREATIVE CVs.

{knowledgeContext}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# ═══════════════════════════════════════════════════════════════
# CRITICAL: A4 PAGE CONSTRAINT (CREATIVE VERSION)
# ═══════════════════════════════════════════════════════════════

**MANDATORY LENGTH LIMITS (Creative CVs get expressive space):**

1. **Personal Description:** MAX 140 words (600 characters)
   - 3-4 sentences: Creative identity + Approach + Impact
   - More personality, still professional
   - Example: "Creative designer with a passion for user-centered experiences. I blend aesthetics with functionality to craft interfaces that delight and perform. Known for transforming complex problems into elegant solutions."

2. **Skills Section:** MAX 8 creative competencies
   - Mix: Tools + Soft Skills + Methods
   - Format: "• Competency"
   - Example:
     • UI/UX Design (Figma, Adobe XD)
     • Visual Storytelling
     • User Research & Testing
     • Design Systems

3. **Experience Section:** MAX 3 projects/positions
   - Each: Title, Context, Duration
   - MAX 3 bullets: Focus on creative process + outcome
   - Example:
     Lead Designer, StartupX (2022-2024)
     • Redesigned mobile app (user satisfaction: 3.2→4.6★)
     • Created design system used by 5 teams
     • Led workshops with 20+ stakeholders

4. **Education Section:** MAX 2 entries
   - Include creative certifications if relevant
   - Example:
     • B.A. Graphic Design, Aalto, 2020
     • Google UX Design Certificate, 2021

5. **Languages Section:** MAX 3 languages

**TOTAL CV LENGTH:** MAX 3500 characters

**CREATIVE CV TONE:**
- Show personality through language
- Emphasize creative thinking + collaboration
- Include impact (not just tasks)

# ═══════════════════════════════════════════════════════════════

# RULES FOR CREATIVE CV
✅ Showcase creative projects and portfolio highlights
✅ Emphasize design thinking and innovation
✅ Highlight collaborative work and impact
✅ Show creative problem-solving process
✅ Use verified skills from {verifiedSkills}
❌ NEVER invent portfolio pieces
❌ NEVER claim skills not verified
❌ NEVER exceed length limits

LANGUAGE: {language}
TONE: Creative yet professional

{format_instructions}`],

  ["human", `Create Creative CV (A4-optimized).

**CANDIDATE:**
Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Best Project: {bestProjectExample}

**CRITICAL:**
- Max 140 words for description (show personality!)
- Max 8 creative competencies
- Max 3 projects with impact
- MUST fit ONE A4 page (3500 chars)
- Language: {language}

Return JSON. Be creative but concise!`]
]);

// ════════════════════════════════════════════════════════════════
// MAIN FUNCTION WITH TIMEOUT PROTECTION
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
      throw new Error(`CV_GENERATION_TIMEOUT: Exceeded ${MAX_EXECUTION_TIME}ms (${elapsed}ms elapsed)`);
    }
  };

  const { authToken, jobPosting, userId, skipQuestions, answeredQuestions } = userData;

  try {
    checkTimeout();
    
    // ════════════════════════════════════════════════════════════════
    // STEP 1: QUESTION ANALYSIS (FIXED & ENHANCED)
    // ════════════════════════════════════════════════════════════════
    
   if (!skipQuestions) {
  timer.start("Question Analysis");

  try {
    // ✅ VAIHDA analyzeCVData() → analyzeJobAndProfile()
    const analysis = await Promise.race([
      analyzeJobAndProfile({
        jobDescription: jobPosting || `Creating ${userData.cvType || 'simple'} CV`,
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
          personalNotes: userData.personalityTraits || "Not specified",
        },
        language: userData.language || "finnish",
        userId: userId, // ✅ Historiapohjainen filtteröinti
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Question analysis timeout")), 5000)
      ),
    ]);

    timer.end();

    // ✅ SAMA LOGIIKKA KUIN COVER LETTERISSA
    if (analysis.shouldAskQuestions && analysis.questions.length > 0) {
      const critical = analysis.questions.filter(
        (q) => q.priority === "critical"
      );

      console.log(
        `❓ CV Questions: total=${analysis.questions.length}, critical=${critical.length}`
      );

      if (critical.length > 0) {
        timer.end(); // ✅ Sulje timer ennen paluuta
        
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
          questions: critical, // ✅ PALAUTA KYSYMYKSET
        };
      }
    }
  } catch (analysisError) {
    timer.end();
    console.warn(
      "⚠️ Question analysis failed/timeout, continuing without questions:",
      analysisError
    );
  }
}

// ════════════════════════════════════════════════════════════════
// STEP 2: MERGE ANSWERS (YKSINKERTAISTETTU)
// ════════════════════════════════════════════════════════════════

let enhancedUserData = { ...userData };

if (answeredQuestions && answeredQuestions.length > 0) {
  timer.start("Merge Answers");
  
  console.log(`📝 CV: Integrating ${answeredQuestions.length} answers`);
  
  // ✅ YKSINKERTAINEN MERGE (sama kuin Cover Letter V2)
  answeredQuestions.forEach((item: any) => {
    const question = item.question.toLowerCase();
    const answer = item.answer;
    
    // ✅ MATCH VASTAUS KENTTÄÄN
    if (question.includes('työkokemus') || question.includes('experience')) {
      enhancedUserData.workExperience = 
        `${enhancedUserData.workExperience || ''}\n\n${answer}`.trim();
    } else if (question.includes('koulutus') || question.includes('education')) {
      enhancedUserData.education = 
        `${enhancedUserData.education || ''}\n\n${answer}`.trim();
    } else if (question.includes('taito') || question.includes('skill')) {
      enhancedUserData.skills = 
        `${enhancedUserData.skills || ''}, ${answer}`.trim();
    } else if (question.includes('projekti') || question.includes('project')) {
      enhancedUserData.bestProjectExample = answer;
    } else if (question.includes('vahvuus') || question.includes('strength')) {
      enhancedUserData.uniqueStrength = answer;
    } else if (question.includes('tavoite') || question.includes('goal')) {
      enhancedUserData.careerGoals = answer;
    }
    // ✅ Voit lisätä lisää matcheja tarvittaessa
  });
  
  timer.end();
  console.log('✅ CV: Answers merged successfully');
}

    // ════════════════════════════════════════════════════════════════
    // STEP 3: PARALLEL EXTRACTION
    // ════════════════════════════════════════════════════════════════
    
    timer.start("Personality + Ground Truth + Job + RAG");
    
    const [personalityResult, groundTruthResult, jobAnalysisResult, ragResult] = await Promise.allSettled([
      Promise.race([
        extractPersonalityTraits({
          userProfile: ensureString(enhancedUserData.profile) || "",
          workingStyleText: ensureString(enhancedUserData.workingStyle),
          problemSolvingText: ensureString(enhancedUserData.problemSolving),
          energySourcesText: ensureString(enhancedUserData.energySources),
          strengthsText: ensureString(enhancedUserData.uniqueStrength),
          learningText: ensureString(enhancedUserData.learningStyle),
          teamworkText: ensureString(enhancedUserData.teamRole),
          valuesText: ensureString(enhancedUserData.valuesExample),
          additionalInfo: ensureString(enhancedUserData.superpower),
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Personality timeout')), 15000))
      ]),
      
      Promise.race([
        extractGroundTruthAI({
          name: enhancedUserData.name,
          work_experience: enhancedUserData.workExperience,
          education: enhancedUserData.education,
          skills: enhancedUserData.skills,
          languages: enhancedUserData.languages,
          working_style: enhancedUserData.workingStyle,
          problem_solving: enhancedUserData.problemSolving,
          unique_strength: enhancedUserData.uniqueStrength,
          team_role: enhancedUserData.teamRole,
          superpower: enhancedUserData.superpower,
          career_goals: enhancedUserData.careerGoals,
          best_project_example: enhancedUserData.bestProjectExample
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Ground truth timeout')), 15000))
      ]),
      
      jobPosting && jobPosting.length > 50
        ? Promise.race([
            analyzeJobPosting(jobPosting),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Job analysis timeout')), 10000))
          ])
        : Promise.resolve({
            required_skills: [],
            preferred_skills: [],
            soft_skills: [],
            company_values: [],
            key_responsibilities: [],
            experience_level: "mid" as const,
            industry_keywords: [],
          }),
      
      userData.enableRAG 
        ? Promise.race([
            buildAIContext({
              jobDescription: jobPosting || `Creating ${userData.cvType} CV`,
              userProfile: {
                workExperience: enhancedUserData.workExperience || "",
                education: enhancedUserData.education || "",
                skills: enhancedUserData.skills || "",
                workingStyle: enhancedUserData.workingStyle || "",
              },
              enableRAG: true,
              contentType: 'cv'
            }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('RAG timeout')), 10000))
          ])
        : Promise.resolve('')
    ]);
    
    timer.end();
    
    // ✅ HANDLE RESULTS WITH PROPER TYPE CASTING
    const personalityExtraction: PersonalityExtraction = personalityResult.status === 'fulfilled' 
      ? (personalityResult.value as PersonalityExtraction)
      : {
          overallPersonality: {
            summary: "Professional with growth mindset",
            topTraits: ["Adaptable", "Motivated", "Professional"],
            workplaceStrengths: ["Communication", "Problem-solving"],
            detectedLanguage: userData.language || 'finnish'
          },
          extractionQuality: {
            completeness: 0.3,
            clarity: 0.4,
            businessRelevance: 0.5,
            suggestions: []
          }
        };
    
    if (personalityResult.status === 'rejected') {
      console.warn('⚠️ Personality extraction failed:', personalityResult.reason);
    }
    
    const groundTruth: GroundTruth = groundTruthResult.status === 'fulfilled'
      ? (groundTruthResult.value as GroundTruth)
      : {
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
    
    if (groundTruthResult.status === 'rejected') {
      console.warn('⚠️ Ground truth extraction failed:', groundTruthResult.reason);
    }
    
    const jobAnalysis: JobAnalysis = jobAnalysisResult.status === 'fulfilled' 
      ? (jobAnalysisResult.value as JobAnalysis)
      : {
          required_skills: [],
          preferred_skills: [],
          soft_skills: [],
          company_values: [],
          key_responsibilities: [],
          experience_level: "mid",
          industry_keywords: [],
        };
    
    if (jobAnalysisResult.status === 'rejected') {
      console.warn('⚠️ Job analysis failed:', jobAnalysisResult.reason);
    }
    
    const knowledgeContext: string = ragResult.status === 'fulfilled' 
      ? (ragResult.value as string) 
      : '';
    
    if (ragResult.status === 'rejected') {
      console.warn('⚠️ RAG context failed:', ragResult.reason);
    }
    
    checkTimeout();
    
    const extractedPersonalityData = convertToLegacyFormat(personalityExtraction);
    const confidenceScore = getPersonalityConfidenceScore(personalityExtraction);
    
    console.log(`📊 Personality: ${Math.round(confidenceScore.averageConfidence * 100)}%`);
    console.log(`🛡️ Ground Truth: ${groundTruth.technicalSkills.length} skills`);
    
    const finalUserData = {
      ...enhancedUserData,
      workingStyle: extractedPersonalityData.workingStyle || enhancedUserData.workingStyle || "",
      problemSolving: extractedPersonalityData.problemSolving || enhancedUserData.problemSolving || "",
      uniqueStrength: extractedPersonalityData.uniqueStrength || enhancedUserData.uniqueStrength || "",
      teamRole: extractedPersonalityData.teamRole || enhancedUserData.teamRole || "",
      superpower: extractedPersonalityData.superpower || enhancedUserData.superpower || "",
};

// ════════════════════════════════════════════════════════════════
// STEP 4: SELECT PROMPT TEMPLATE
// ════════════════════════════════════════════════════════════════

let promptTemplate: ChatPromptTemplate;

switch (finalUserData.cvType) {
  case 'technical':
    promptTemplate = atsOptimizedTechnicalPrompt;
    break;
  case 'creative':
    promptTemplate = atsOptimizedCreativePrompt;
    break;
  default:
    promptTemplate = atsOptimizedSimplePrompt;
}

checkTimeout();

// ════════════════════════════════════════════════════════════════
// STEP 5: AI GENERATION
// ════════════════════════════════════════════════════════════════

timer.start("AI Generation");

const model = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY!,
  modelName: "gpt-4o-mini",
  temperature: 0.7,
  timeout: 20000,
});

const formatted = await promptTemplate.formatMessages({
  knowledgeContext: knowledgeContext || '',
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
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI generation timeout')), 20000))
]);

const rawContentString = getMessageContent(result);
timer.end();

checkTimeout();

// ════════════════════════════════════════════════════════════════
// STEP 6: PARSING
// ════════════════════════════════════════════════════════════════

timer.start("Parsing");
let parsedOutput: CVOutputType;
try {
  const sanitized = sanitizeAIResponse(rawContentString);
  parsedOutput = await outputParser.parse(sanitized);
} catch {
  try {
    parsedOutput = await outputParser.parse(rawContentString);
  } catch {
    parsedOutput = extractDataManually(
      rawContentString, 
      toLangChainInput(finalUserData)
    );
  }
}
timer.end();

checkTimeout();

// ════════════════════════════════════════════════════════════════
// STEP 7: GUARDIAN CHECK
// ════════════════════════════════════════════════════════════════

timer.start("Guardian");

const fullContent = `${parsedOutput.personal_description}
${parsedOutput.cv_content.skills_section}
${parsedOutput.cv_content.experience_section}
`.trim();

let guardianCheck: {
  approved: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  violations: any;
  recommendation?: string;
};

try {
  guardianCheck = await Promise.race([
    masterConsistencyCheckAI(fullContent, groundTruth, 'generation'),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Guardian timeout')), 10000))
  ]);
} catch (guardianError) {
  console.warn('⚠️ Guardian check timeout, using permissive fallback:', guardianError);
  guardianCheck = {
    approved: true,
    riskLevel: 'warning',
    violations: {},
    recommendation: 'Guardian check timed out, approved with caution'
  };
}

timer.end();

if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
  throw new Error(`Guardian rejected: ${guardianCheck.recommendation}`);
}

console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);

checkTimeout();

// ════════════════════════════════════════════════════════════════
// STEP 8: BACKGROUND IMAGE
// ════════════════════════════════════════════════════════════════
timer.start("Background");

let backgroundImage: string | null =
  cleanImageUrl(finalUserData.backgroundImage);

const timeRemaining = MAX_EXECUTION_TIME - (Date.now() - startTime);

if (!backgroundImage) {
  if (timeRemaining > 15000) {
    try {
      backgroundImage = await Promise.race([
        generateEnhancedBackgroundImage(
          toLangChainInput(finalUserData),
          authToken
        ),
        new Promise<string>((resolve) =>
          setTimeout(() => resolve(FALLBACK_IMAGE), 12000)
        ),
      ]);
    } catch {
      backgroundImage = FALLBACK_IMAGE;
    }
  } else {
    backgroundImage = FALLBACK_IMAGE;
  }
}

timer.end();

// ════════════════════════════════════════════════════════════════
// FINAL ASSEMBLY
// ════════════════════════════════════════════════════════════════

const fullTextContent = `
${parsedOutput.personal_description}
Skills
${parsedOutput.cv_content.skills_section}
Experience
${parsedOutput.cv_content.experience_section}
Education
${parsedOutput.cv_content.education_section}
Languages
${parsedOutput.cv_content.languages_section}
`.trim();

timer.getResults();
const profileImageClean = cleanImageUrl(finalUserData.profileImage);

const finalBackgroundImage =
  cleanImageUrl(backgroundImage) || FALLBACK_IMAGE;

return {
  personal_description: parsedOutput.personal_description,
  html: parsedOutput.cv_content,
  background_image: finalBackgroundImage,
  profile_initials: profileImageClean
  ? ""
  : generateInitials(finalUserData.name),

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
if (error instanceof Error && error.message.startsWith('CV_GENERATION_TIMEOUT')) {
console.error('❌ CV generation timed out:', error.message);
throw new Error('CV_GENERATION_TIMEOUT: Process took too long. Try simplifying your request or disabling RAG.');
}
console.error("❌ Generation failed:", error);
throw error;
}
}
// ════════════════════════════════════════════════════════════════
// SAFE WRAPPER (for API routes)
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
  personal_description: `${userData.name || "Professional"} - CV Generation Failed`,
  html: {
    skills_section: `<p>Error generating skills section</p>`,
    experience_section: `<p>Error generating experience section</p>`,
    education_section: `<p>Error generating education section</p>`,
    languages_section: `<p>Error generating languages section</p>`,
  },
  background_image: FALLBACK_IMAGE,
  profile_initials: generateInitials(userData.name || ""),
  fullTextContent: "CV generation encountered an error",
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
    violations: { error: error instanceof Error ? error.message : "Unknown error" }
  },
  images: {
    background_prompt: '',
    visual_elements: []
  }
};

}
}
// ════════════════════════════════════════════════════════════════
// LEGACY EXPORT (backward compatibility)
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

