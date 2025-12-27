// lib/langchain/cvGenerator.ts - COMPLETE FIXED VERSION
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
  type GroundTruth 
} from "@/lib/ats/masterGuardian";
import { buildAIContext } from "@/lib/knowledge";
import { analyzeCVData, mergeCVAnswers } from "@/lib/langchain/cvQuestionAnalyzer";

// ✅ FALLBACK IMAGE - määritellään tässä jos ei ole muualla
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600'%3E%3Crect fill='%23f0f0f0' width='800' height='600'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='24' fill='%23999' text-anchor='middle' dy='.3em'%3EBackground Image%3C/text%3E%3C/svg%3E";

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CVGeneratorInput {
  // Identity
  userId?: string;
  cvId?: string;
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // CV Settings
  cvType?: 'simple' | 'technical' | 'creative';
  language?: string;
  title?: string;
  introText?: string;
  
  // Professional Info
  education?: string;
  workExperience?: string;
  skills?: string;
  languages?: string;
  
  // Personality
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  
  // Additional
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  profileImage?: string;
  backgroundImage?: string;
  hobbies?: string;
  personalityTraits?: string;
  profile?: string;
  bio?: string;
  
  // Extended fields
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
    // Identity
    userId: input.userId,
    cvId: input.cvId,
    name: input.name,
    email: input.email,
    phone: input.phone,
    location: input.location,
    
    // CV Settings
    cvType: input.cvType,
    language: input.language,
    title: input.title,
    introText: input.introText,
    
    // Professional (strings, not arrays)
    education: input.education,
    workExperience: input.workExperience,
    skills: input.skills,
    languages: input.languages,
    
    // Personality
    workingStyle: input.workingStyle,
    problemSolving: input.problemSolving,
    energySources: input.energySources,
    uniqueStrength: input.uniqueStrength,
    learningStyle: input.learningStyle,
    teamRole: input.teamRole,
    valuesExample: input.valuesExample,
    superpower: input.superpower,
    
    // Additional
    careerGoals: input.careerGoals,
    bestProjectExample: input.bestProjectExample,
    failureLesson: input.failureLesson,
    profileImage: input.profileImage,
    backgroundImage: input.backgroundImage,
    hobbies: input.hobbies,
    profile: input.profile,
    bio: input.bio,
    
    // Extended
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

const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating FIRST-PERSON CVs for ALL backgrounds.

${'{knowledgeContext}'}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# RULES
✅ Write in first person ("I am...")
✅ Use ONLY verified skills
✅ Focus on personality and potential for Simple CV
✅ If limited experience, emphasize learning
❌ NEVER invent skills

LANGUAGE: {language}

{format_instructions}`],

  ["human", `Create Simple CV (personality-focused).

Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}

PERSONALITY:
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

Write in {language}. Return JSON.`]
]);

const atsOptimizedTechnicalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating TECHNICAL CVs.

${'{knowledgeContext}'}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# RULES FOR TECHNICAL CV
✅ Focus on technical skills and projects
✅ Emphasize measurable achievements
✅ Include specific technologies
✅ Use industry-standard terminology
❌ NEVER fabricate technical experience

LANGUAGE: {language}

{format_instructions}`],

  ["human", `Create Technical CV.

Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Education: {education}
Best Project: {bestProjectExample}

Write in {language}. Return JSON.`]
]);

const atsOptimizedCreativePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are a CV writer creating CREATIVE CVs.

${'{knowledgeContext}'}

# GROUND TRUTH
VERIFIED SKILLS: {verifiedSkills}
FORBIDDEN CLAIMS: {forbiddenClaims}

# RULES FOR CREATIVE CV
✅ Showcase creative projects and portfolio
✅ Emphasize design thinking and innovation
✅ Highlight collaborative work
✅ Show creative problem-solving
❌ NEVER invent portfolio pieces

LANGUAGE: {language}

{format_instructions}`],

  ["human", `Create Creative CV.

Name: {name}
Skills: {verifiedSkills}
Experience: {workExperience}
Best Project: {bestProjectExample}

Write in {language}. Return JSON.`]
]);

// ════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════

export async function generateCVWithPersonalityExtraction(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();
  timer.start("Total Generation");

  const { authToken, jobPosting, userId, skipQuestions, answeredQuestions } = userData;

  try {
    // ═══════════════════════════════════════════════════════════
    // STEP 1: KYSYMYSANALYYSI
    // ═══════════════════════════════════════════════════════════
    
    if (!skipQuestions) {
      timer.start("Question Analysis");
      
      const analysis = await analyzeCVData({
        userData: toLangChainInput(userData),
        cvType: userData.cvType || 'simple',
        language: userData.language || 'finnish',
        userId: userId
      });
      
      timer.end();
      
      if (analysis.shouldAskQuestions && analysis.questions.length > 0) {
        console.log(`❓ Need ${analysis.questions.length} answers`);
        
        return {
          personal_description: '',
          html: {
            skills_section: '',
            experience_section: '',
            education_section: '',
            languages_section: ''
          },
          background_image: '',
          profile_initials: '',
          fullTextContent: '',
          ats_data: null,
          job_analysis: {
            required_skills: [],
            preferred_skills: [],
            soft_skills: [],
            company_values: [],
            key_responsibilities: [],
            experience_level: 'mid',
            industry_keywords: []
          },
          images: {
            background_prompt: '',
            visual_elements: []
          },
          needsMoreInfo: true,
          questions: analysis.questions
        };
      }
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 2: YHDISTÄ VASTAUKSET
    // ═══════════════════════════════════════════════════════════
    
    let enhancedUserData = { ...userData };
    
    if (answeredQuestions && answeredQuestions.length > 0) {
      timer.start("Merge Answers");
      
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
      
      timer.end();
    }
    
    // ═══════════════════════════════════════════════════════════
    // STEP 3: PARALLEL EXTRACTION
    // ═══════════════════════════════════════════════════════════
    
    timer.start("Personality + Ground Truth + Job + RAG");
    
    const [personalityExtraction, groundTruth, jobAnalysis, knowledgeContext] = await Promise.all([
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
          }),
      userData.enableRAG ? buildAIContext({
        jobDescription: jobPosting || `Creating ${userData.cvType} CV`,
        userProfile: {
          workExperience: enhancedUserData.workExperience || "",
          education: enhancedUserData.education || "",
          skills: enhancedUserData.skills || "",
          workingStyle: enhancedUserData.workingStyle || "",
        },
        enableRAG: true,
        contentType: 'cv'
      }) : Promise.resolve('')
    ]);
    
    timer.end();
    
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
    
    // ═══════════════════════════════════════════════════════════
    // STEP 4: SELECT PROMPT TEMPLATE
    // ═══════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════
    // STEP 5: AI GENERATION
    // ═══════════════════════════════════════════════════════════
    
    timer.start("AI Generation");
    
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
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
    
    const result = await model.invoke(formatted);
    const rawContentString = getMessageContent(result);
    timer.end();
    
    // ═══════════════════════════════════════════════════════════
    // STEP 6: PARSING
    // ═══════════════════════════════════════════════════════════
    
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
    
    // ═══════════════════════════════════════════════════════════
    // STEP 7: GUARDIAN CHECK
    // ═══════════════════════════════════════════════════════════
    
    timer.start("Guardian");
    
    const fullContent = `
${parsedOutput.personal_description}
${parsedOutput.cv_content.skills_section}
${parsedOutput.cv_content.experience_section}
    `.trim();
    
    const guardianCheck = await masterConsistencyCheckAI(
      fullContent,
      groundTruth,
      'generation'
    );
    
    timer.end();
    
    if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
      throw new Error(`Guardian rejected: ${guardianCheck.recommendation}`);
    }
    
    console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);
    
    // ═══════════════════════════════════════════════════════════
    // STEP 8: BACKGROUND IMAGE
    // ═══════════════════════════════════════════════════════════
    
    timer.start("Background");
    let backgroundImage = "";
    if (!finalUserData.backgroundImage) {
      backgroundImage = await generateEnhancedBackgroundImage(
        toLangChainInput(finalUserData),
        authToken
      );
    } else {
      backgroundImage = finalUserData.backgroundImage;
    }
    timer.end();
    
    // ═══════════════════════════════════════════════════════════
    // FINAL ASSEMBLY
    // ═══════════════════════════════════════════════════════════
    
    const fullTextContent = `
${parsedOutput.personal_description}

## Skills
${parsedOutput.cv_content.skills_section}

## Experience
${parsedOutput.cv_content.experience_section}

## Education
${parsedOutput.cv_content.education_section}

## Languages
${parsedOutput.cv_content.languages_section}
    `.trim();

    timer.getResults();

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: backgroundImage || FALLBACK_IMAGE,
      profile_initials: finalUserData.profileImage ? "" : generateInitials(finalUserData.name),
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
// SAFE WRAPPER (for API routes) - WITH TIMEOUT
// ════════════════════════════════════════════════════════════════

export async function generateCVSafely(
  userData: CVGeneratorInput
): Promise<CVGenerationResult> {
  try {
    // ✅ TIMEOUT PROTECTION: 55 sekuntia (Vercel timeout on 60s)
    const timeoutPromise = new Promise<CVGenerationResult>((_, reject) => {
      setTimeout(() => reject(new Error('CV generation timeout (55s)')), 55000);
    });
    
    const generationPromise = generateCVWithPersonalityExtraction(userData);
    
    // Race: kumpaa valmistuu ensin
    return await Promise.race([generationPromise, timeoutPromise]);
    
  } catch (error) {
    console.error("❌ generateCVSafely caught error:", error);
    
    // Return minimal fallback result instead of throwing
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