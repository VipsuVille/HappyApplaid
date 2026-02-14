// lib/langchain/cvGenerator.ts - TRUTH-ABSOLUTE + SAVED RESPONSES + V2-STYLE PROMPTS

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase";

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

import {
  convertToAnswerFormat,
  mergeResponsesIntoProfile,
  type AnswerEntry,
} from "@/lib/langchain/responseHelper";

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const BASE_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

type PersonalityExtraction = {
  workingStyle?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  problemSolving?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  energySources?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  uniqueStrength?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  learningStyle?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  teamRole?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  valuesExample?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  superpower?: { extracted: string; confidence: number; keywords: string[]; businessValue: string };
  overallPersonality: { summary: string; topTraits: string[]; workplaceStrengths: string[]; detectedLanguage: string };
  extractionQuality: { completeness: number; clarity: number; businessRelevance: number; suggestions: string[] };
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
  ground_truth_check?: { approved: boolean; riskLevel: string; violations: any };
  questions?: any[];
  needsMoreInfo?: boolean;
  images: { background_prompt: string; visual_elements: string[] };
}

// ════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ════════════════════════════════════════════════════════════════

function toLangChainInput(input: CVGeneratorInput): LangChainCVInput {
  return {
    userId: input.userId, cvId: input.cvId, name: input.name, email: input.email,
    phone: input.phone, location: input.location, cvType: input.cvType,
    language: input.language, title: input.title, introText: input.introText,
    education: input.education, workExperience: input.workExperience,
    skills: input.skills, languages: input.languages, workingStyle: input.workingStyle,
    problemSolving: input.problemSolving, energySources: input.energySources,
    uniqueStrength: input.uniqueStrength, learningStyle: input.learningStyle,
    teamRole: input.teamRole, valuesExample: input.valuesExample,
    superpower: input.superpower, careerGoals: input.careerGoals,
    bestProjectExample: input.bestProjectExample, failureLesson: input.failureLesson,
    profileImage: input.profileImage, backgroundImage: input.backgroundImage,
    hobbies: input.hobbies, profile: input.profile, bio: input.bio,
    jobPosting: input.jobPosting, authToken: input.authToken,
  } as LangChainCVInput;
}

class PerformanceTimer {
  private stages: Record<string, number> = {};
  private startTime = Date.now();
  private currentStage: string | null = null;
  private stageStart = 0;

  start(s: string) {
    if (this.currentStage) this.end();
    this.currentStage = s;
    this.stageStart = Date.now();
    console.time(`⏱️  ${s}`);
  }

  end() {
    if (!this.currentStage) return;
    this.stages[this.currentStage] = Date.now() - this.stageStart;
    console.timeEnd(`⏱️  ${this.currentStage}`);
    this.currentStage = null;
  }

  getResults() {
    if (this.currentStage) this.end();
    const t = Date.now() - this.startTime;
    console.log(`\n🎯 TOTAL: ${t}ms`);
    return { totalTime: t, stages: this.stages };
  }
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
          const t = item as { text: unknown };
          if (typeof t.text === "string") return t.text;
        }
        return "";
      })
      .filter((t) => t.length > 0)
      .join(" ");
  }
  return "";
}

function generateInitials(name: string): string {
  if (!name) return "";
  return name.split(" ").map((n) => n.charAt(0).toUpperCase()).join("");
}

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
    } else if (q.includes('koulutus') || q.includes('education') || q.includes('opiskelu')) {
      merged.education = (merged.education || userData.education || '') + '\n\n' + a;
    } else if (q.includes('osaaminen') || q.includes('taidot') || q.includes('skills')) {
      merged.skills = (merged.skills || userData.skills || '') + ', ' + a;
    } else if (q.includes('työskentelytyyli') || q.includes('working style')) {
      merged.workingStyle = a;
    } else if (q.includes('ongelmanratkaisu') || q.includes('problem solving')) {
      merged.problemSolving = a;
    } else if (q.includes('vahvuus') || q.includes('strength')) {
      merged.uniqueStrength = a;
    } else if (q.includes('tavoite') || q.includes('goal')) {
      merged.careerGoals = a;
    } else if (q.includes('projekti') || q.includes('project')) {
      merged.bestProjectExample = a;
    } else {
      if (a.length > 50) {
        merged.workExperience = (merged.workExperience || userData.workExperience || '') + '\n\n' + a;
      }
    }
  });
  return merged;
}

// ════════════════════════════════════════════════════════════════
// SAVED RESPONSES — Direct DB, merge via responseHelper
// ════════════════════════════════════════════════════════════════

/**
 * Infer a responseHelper-compatible category from the question text.
 *
 * The DB's question_category field often contains values like
 * 'cv_generation', 'work_experience_detail', or '' which don't
 * match responseHelper's bucket names (experience, education, skill, etc.).
 *
 * This function looks at BOTH the stored category AND the question text
 * to produce a category that responseHelper can route correctly.
 */
function inferCategory(dbCategory: string, questionText: string): string {
  const cat = (dbCategory || '').toLowerCase();
  const q = (questionText || '').toLowerCase();

  // 1. If DB category already matches responseHelper buckets → use it
  if (cat.includes('experience') || cat.includes('work')) return 'experience';
  if (cat.includes('education')) return 'education';
  if (cat.includes('skill')) return 'skills';
  if (cat.includes('personality') || cat.includes('strength') || cat.includes('working_style')) return 'personality';
  if (cat.includes('achievement') || cat.includes('project')) return 'achievements';

  // 2. DB category doesn't match → infer from question text
  // Work experience
  if (q.includes('työkokemus') || q.includes('work experience') ||
      q.includes('projektit') || q.includes('projects') ||
      q.includes('mitä olet tehnyt') || q.includes('what have you done') ||
      q.includes('työhistoria') || q.includes('work history') ||
      q.includes('tehtävä') || q.includes('responsibilities') ||
      q.includes('työssä') || q.includes('at work')) {
    return 'experience';
  }

  // Education
  if (q.includes('koulutus') || q.includes('education') ||
      q.includes('tutkinto') || q.includes('degree') ||
      q.includes('opiskelu') || q.includes('study') ||
      q.includes('kurssi') || q.includes('course') ||
      q.includes('oppilaitos') || q.includes('institution')) {
    return 'education';
  }

  // Skills
  if (q.includes('taido') || q.includes('osaamis') || q.includes('skill') ||
      q.includes('teknolog') || q.includes('technolog') ||
      q.includes('ohjelmoint') || q.includes('programming') ||
      q.includes('työkalu') || q.includes('tool') ||
      q.includes('listaa') || q.includes('list your')) {
    return 'skills';
  }

  // Personality / strength
  if (q.includes('vahvuu') || q.includes('strength') ||
      q.includes('persoonall') || q.includes('personalit') ||
      q.includes('työskentelytyyli') || q.includes('working style') ||
      q.includes('ongelmanratkaisu') || q.includes('problem solving') ||
      q.includes('supervoima') || q.includes('superpower')) {
    return 'personality';
  }

  // Projects / achievements
  if (q.includes('paras projekti') || q.includes('best project') ||
      q.includes('saavutus') || q.includes('achievement') ||
      q.includes('ylpein') || q.includes('proudest')) {
    return 'achievements';
  }

  // Fallback: if answer is long enough, treat as experience
  return 'other';
}

async function fetchSavedResponsesFromDB(userId: string): Promise<AnswerEntry[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_responses')
      .select('id, question_text, answer, question_category')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('❌ DB fetch saved responses failed:', error);
      return [];
    }
    if (!data || data.length === 0) {
      console.log('ℹ️ [CV GEN] No saved responses in DB');
      return [];
    }

    console.log(`📚 [CV GEN] Fetched ${data.length} saved responses from DB`);

    // Map DB rows to AnswerEntry with INFERRED categories
    const entries = data.map((r) => {
      const inferredCategory = inferCategory(r.question_category, r.question_text);
      if (inferredCategory !== (r.question_category || '').toLowerCase()) {
        console.log(`   🔄 Re-categorized: "${r.question_text?.substring(0, 40)}..." → ${inferredCategory} (was: ${r.question_category || 'empty'})`);
      }
      return {
        id: r.id,
        question: r.question_text,
        answer: r.answer,
        category: inferredCategory,
      };
    });

    // Log category distribution
    const catCounts: Record<string, number> = {};
    entries.forEach(e => { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
    console.log('   📊 Category distribution:', catCounts);

    return entries;
  } catch (err) {
    console.error('❌ fetchSavedResponsesFromDB error:', err);
    return [];
  }
}

async function enrichWithSavedResponses(
  userData: CVGeneratorInput
): Promise<CVGeneratorInput> {
  if (!userData.userId) {
    console.log('⚠️ No userId — skipping saved response fetch');
    return userData;
  }

  const answerEntries = await fetchSavedResponsesFromDB(userData.userId);
  if (answerEntries.length === 0) return userData;

  const profileObj: Record<string, any> = {
    workExperience: userData.workExperience || '',
    education: userData.education || '',
    skills: userData.skills || '',
    uniqueStrength: userData.uniqueStrength || '',
    bestProjectExample: userData.bestProjectExample || '',
    workingStyle: userData.workingStyle || '',
    problemSolving: userData.problemSolving || '',
    careerGoals: userData.careerGoals || '',
    failureLesson: userData.failureLesson || '',
    hobbies: userData.hobbies || '',
    languages: userData.languages || '',
    additionalContext: '',
  };

  const merged = mergeResponsesIntoProfile(profileObj, answerEntries);

  return {
    ...userData,
    workExperience: merged.workExperience || userData.workExperience,
    education: merged.education || userData.education,
    skills: merged.skills || userData.skills,
    uniqueStrength: merged.uniqueStrength || userData.uniqueStrength,
    bestProjectExample: merged.bestProjectExample || userData.bestProjectExample,
    workingStyle: merged.workingStyle || userData.workingStyle,
    problemSolving: merged.problemSolving || userData.problemSolving,
    careerGoals: merged.careerGoals || userData.careerGoals,
    failureLesson: merged.failureLesson || userData.failureLesson,
    hobbies: merged.hobbies || userData.hobbies,
    languages: merged.languages || userData.languages,
  };
}

// ════════════════════════════════════════════════════════════════
// PROMPTS — V2-STYLE: Truth-absolute, ask-don't-guess
// ════════════════════════════════════════════════════════════════

// Shared truth rules (same philosophy as V2 cover letter)
const TRUTH_RULES = `
# ════════════════════════════════════════════════════════════════
# ABSOLUTE TRUTH RULES — VIOLATION = FAILURE
# ════════════════════════════════════════════════════════════════

You write CVs, not fiction. Present the person's ACTUAL background.

Read the profile data. Write naturally and professionally. Stay truthful.

1. ONLY write facts that appear in the input data.
2. NEVER invent, guess, or assume:
   - Technologies, tools, or frameworks not listed by the user
   - Numbers, percentages, metrics (e.g. "improved X by 30%")
   - Job titles, company names, or durations not provided
   - Certifications, degrees, or courses not listed
   - Team sizes, budgets, or project scales
   - Achievements or results the user did not describe
3. If user says "I built a CV generator":
   ✅ Say "Developed a CV and cover letter generator application"
   ❌ Do NOT add: "using Python and React" (not stated)
   ❌ Do NOT add: "improving engagement by 30%" (not stated)
   ❌ Do NOT add: "for 500 users" (not stated)
4. Missing info? Two options:
   a) OMIT the detail entirely
   b) Use honest phrases: "Developing skills in...", "Interested in..."
   NEVER claim experience that doesn't exist.
5. Shorter + honest is ALWAYS better than longer + fabricated.
6. You may rephrase and improve WORDING. You may NOT add NEW FACTS.

# ════════════════════════════════════════════════════════════════
# PRIVACY: NO PERSONAL INFO IN PROMPT
# ════════════════════════════════════════════════════════════════

❌ The template handles: name, email, phone, address
✅ Focus on: skills, experience, personality, goals
`;

const simplePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You create a PERSONAL, FRIENDLY CV in first person.

{knowledgeContext}

**STYLE:** Warm, narrative, descriptive. Tell who this person IS.
- Personal description: 150–250 words, engaging
- Skills: Text-based, in context (not just a list)
- Experience: Story-driven — what they did, what they learned
- Education: Brief
- Languages: Freeform

**LENGTH:** 300–400 words total. Shorter if data is limited.

${TRUTH_RULES}

{atsInstructions}

{format_instructions}`],
  ["human", `Create a friendly, personal CV based ONLY on this data:

**PROFILE (ANONYMIZED):**
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

Write in {language}. Be warm and personal.
Every single fact must come from the data above. Do NOT invent anything.`]
]);

const technicalPrompt = ChatPromptTemplate.fromMessages([
  ["system", `You create a PROFESSIONAL, STRUCTURED CV in first person.

{knowledgeContext}

**STYLE:** List-based, key points. ONLY user-provided technologies/tools.

**FORMATTING:**
1. Skills: <h3>Category</h3><ul><li>Skill</li></ul> — ONLY listed skills
2. Experience: <div class="job"><h4>Title - Company</h4><p class="date">Period</p><ul><li>What they did</li></ul></div> — ONLY described roles
3. Education: <div class="education"><h4>Degree</h4><p>Institution</p><p class="date">Year</p></div>
4. Languages: <ul><li>Language - Level</li></ul>

**Personal Description:** 100–150 words. Professional. NO invented metrics.
**LENGTH:** 300–400 words. Shorter if data limited.

${TRUTH_RULES}

{atsInstructions}

{format_instructions}`],
  ["human", `Create a professional, technical CV based ONLY on this data:

**PROFILE (ANONYMIZED):**
Skills: {skills}
Experience: {workExperience}
Education: {education}

**COMPETENCIES:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

**CONTEXT:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}

{jobContext}

RULES: Only skills from input. Only jobs from input. Numbers only if user provided.
Write in {language}.`]
]);

const creativePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You create a CREATIVE, DYNAMIC CV in first person.

{knowledgeContext}

**STYLE:** Short text + key points. Stands out. Personality shines.
Creative PRESENTATION is fine. Invented FACTS are not.

**STRUCTURE:**
- Personal Description: 120–180 words (energetic)
- Skills: Visual list
- Experience: Storytelling + facts
- Education: Creative presentation
- Languages: Fun descriptions

**LENGTH:** 300–400 words. Shorter if data limited.

${TRUTH_RULES}

{atsInstructions}

{format_instructions}`],
  ["human", `Create a creative CV based ONLY on this data:

**PROFILE (ANONYMIZED):**
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

Write in {language}. Creative presentation, factual content.
Every fact from data above. Creative ≠ fictional.`]
]);

// ════════════════════════════════════════════════════════════════
// CONTEXT BUILDERS
// ════════════════════════════════════════════════════════════════

function buildATSInstructions(jobPosting?: string): string {
  if (!jobPosting) return '';
  return `
**🎯 ATS OPTIMIZATION:**
1. Use exact keywords from job posting — ONLY for skills the user actually has
2. If job requires "Docker" but user never mentioned it → do NOT add it
   You may write "Interested in expanding into containerization"
   NEVER write "Experienced with Docker"
3. NEVER inflate experience levels to match job requirements
`;
}

function buildJobContext(jobPosting?: string): string {
  if (!jobPosting) return '';
  return `**TARGET JOB POSTING:**\n${jobPosting.substring(0, 1500)}\n\nTailor using ONLY the user's actual data.`;
}

// ════════════════════════════════════════════════════════════════
// OTHER HELPERS
// ════════════════════════════════════════════════════════════════

export async function analyzeJobPosting(jobPostingText: string): Promise<JobAnalysis> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "Extract key requirements from job posting. Return JSON."],
    ["human", `Job Posting: ${jobPostingText}\n\nReturn JSON with: required_skills, preferred_skills, soft_skills, company_values, key_responsibilities, experience_level, industry_keywords`],
  ]);
  try {
    const result = await model.invoke(await prompt.formatMessages({}));
    return JSON.parse(getMessageContent(result)) as JobAnalysis;
  } catch {
    return { required_skills: [], preferred_skills: [], soft_skills: [], company_values: [], key_responsibilities: [], experience_level: "mid", industry_keywords: [] };
  }
}

function sanitizeAIResponse(rawResponse: string): string {
  try {
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found");
    const aiData = JSON.parse(jsonMatch[0]) as { cv_content?: Record<string, any> };
    if (aiData.cv_content) {
      for (const key of ['skills_section', 'experience_section', 'education_section', 'languages_section']) {
        if (typeof aiData.cv_content[key] === "object") aiData.cv_content[key] = JSON.stringify(aiData.cv_content[key]);
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
  if (trimmed.startsWith("data:image/svg+xml") || trimmed === "" || trimmed.includes("cv_files/default")) return null;
  if (trimmed.startsWith("data:image/")) {
    const parts = trimmed.split(',');
    if (parts.length === 2 && parts[1].length > 100) return trimmed;
    return null;
  }
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    if (trimmed.includes('.jpg') || trimmed.includes('.jpeg') || trimmed.includes('.png') || trimmed.includes('.webp') || trimmed.includes('supabase.co/storage')) return trimmed;
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
      skills_section: `<strong>Skills:</strong><br>${userData.skills || "Not specified"}`,
      experience_section: `<strong>Experience:</strong><br>${userData.workExperience || "Not specified"}`,
      education_section: `<strong>Education:</strong><br>${userData.education || "Not specified"}`,
      languages_section: `<strong>Languages:</strong><br>${userData.languages || "Not specified"}`,
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

    const data = (await response.json()) as { url?: string };
    if (!data.url) return "";

    let imageBlob: Blob;

    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      if (!base64Data) return "";
      try {
        const bin = atob(base64Data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        imageBlob = new Blob([arr], { type: "image/png" });
      } catch {
        return "";
      }
    } else {
      const imgRes = await fetch(data.url);
      if (!imgRes.ok) return "";
      imageBlob = await imgRes.blob();
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

    const { data: publicUrlData } = supabase.storage.from("cv_files").getPublicUrl(filePath);
    if (!publicUrlData?.publicUrl) return "";

    try {
      await supabase.from("default_images").insert({
        user_id: userId,
        image_type: "background",
        file_path: filePath,
        name: `AI Taustakuva ${new Date().toLocaleDateString("fi-FI")}`,
        is_active: true,
        is_ai_generated: true,
        generation_prompt: optimizedPrompt,
        cv_id: cvId,
      });
    } catch {}

    return publicUrlData.publicUrl;
  } catch {
    return "";
  }
}

// ════════════════════════════════════════════════════════════════
// ✅ MAIN FUNCTION
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
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      throw new Error(`CV_GENERATION_TIMEOUT: Exceeded ${MAX_EXECUTION_TIME}ms`);
    }
  };

  const { authToken, jobPosting, userId, skipQuestions, answeredQuestions, enableRAG } = userData;

  try {
    console.log('✅ [CV GEN] Try block entered');
    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 1: FETCH & MERGE SAVED RESPONSES (ALWAYS runs first)
    //
    // Direct DB query via supabaseAdmin — no HTTP round-trip.
    // Merge via responseHelper.ts (category-based, language-agnostic).
    //
    // This means: if user answered "Tell me about your work experience"
    // last time → that answer is now in enrichedUserData.workExperience
    // → the question will NOT be asked again.
    // ════════════════════════════════════════════════════════════════

    console.log('📚 [CV GEN] STEP 1: Enriching with saved responses...');
    console.log(`   userId for fetch: "${userData.userId || 'MISSING'}"`);
    timer.start("Fetch & Merge Saved Responses");

    let enrichedUserData: CVGeneratorInput;
    let savedResponseCount = 0;
    try {
      enrichedUserData = await enrichWithSavedResponses(userData);
      // Check if anything actually changed
      const changed = enrichedUserData.workExperience !== userData.workExperience ||
                      enrichedUserData.skills !== userData.skills ||
                      enrichedUserData.education !== userData.education;
      console.log(`✅ [CV GEN] Enrichment result: ${changed ? 'DATA MERGED' : 'NO CHANGE (responses may be empty or already in profile)'}`);
      console.log(`   workExperience: ${userData.workExperience?.length || 0} → ${enrichedUserData.workExperience?.length || 0} chars`);
      console.log(`   skills: "${userData.skills?.substring(0, 50)}" → "${enrichedUserData.skills?.substring(0, 50)}"`);
      console.log(`   education: ${userData.education?.length || 0} → ${enrichedUserData.education?.length || 0} chars`);
    } catch (fetchError) {
      console.error('⚠️ Saved response fetch FAILED:', fetchError);
      console.error('   Continuing without saved responses');
      enrichedUserData = { ...userData };
    }

    timer.end();

    // ════════════════════════════════════════════════════════════════
    // STEP 1.5: QUESTION LOGIC
    //
    // Checks run against ENRICHED data (includes saved responses).
    // If user already answered → field is populated → no question.
    // ════════════════════════════════════════════════════════════════

    const hasAnswers = answeredQuestions && answeredQuestions.length > 0;
    const shouldSkipQuestions = skipQuestions || hasAnswers;

    console.log('🔍 [CV GEN] Question logic:', {
      skipQuestions,
      hasAnswers,
      shouldSkipQuestions,
      answerCount: answeredQuestions?.length || 0,
    });

    if (!shouldSkipQuestions) {
      console.log('🔍 [CV GEN] Checking completeness (AFTER saved response merge)...');

      // ════════════════════════════════════════════════════════════════
      // DYNAMIC PROFILE COMPLETENESS CHECK
      //
      // NOT hardcoded to any profession, age, or background.
      // Works for: nurse, programmer, student, retiree, career changer.
      //
      // Logic: We score how much REAL content the profile has.
      // If total content is too thin → ask targeted questions.
      // If enough content exists → proceed to generation.
      // ════════════════════════════════════════════════════════════════

      const forcedQuestions: any[] = [];
      const isFinnish = enrichedUserData.language === 'finnish';

      /** Check if a field has real, non-empty content */
      const hasContent = (field: string | undefined | null): boolean => {
        if (!field) return false;
        const trimmed = field.trim();
        if (trimmed === '' || trimmed === '[]' || trimmed === '{}' || trimmed === '[{}]' || trimmed === 'null' || trimmed === 'undefined') return false;
        // JSON arrays: check if they have actual items
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed) && parsed.length === 0) return false;
            if (Array.isArray(parsed) && parsed.length > 0) return true;
          } catch {
            // Not valid JSON — treat as plain text
          }
        }
        // Plain text: at least 10 chars of real content
        return trimmed.length >= 10;
      };

      // Collect all content fields (not just hardcoded 4 fields)
      const contentFields: { name: string; value: string | undefined; weight: number }[] = [
        { name: 'workExperience', value: enrichedUserData.workExperience, weight: 3 },
        { name: 'skills', value: enrichedUserData.skills, weight: 3 },
        { name: 'education', value: enrichedUserData.education, weight: 2 },
        { name: 'bestProjectExample', value: enrichedUserData.bestProjectExample, weight: 1 },
        { name: 'workingStyle', value: enrichedUserData.workingStyle, weight: 1 },
        { name: 'problemSolving', value: enrichedUserData.problemSolving, weight: 1 },
        { name: 'uniqueStrength', value: enrichedUserData.uniqueStrength, weight: 1 },
        { name: 'careerGoals', value: enrichedUserData.careerGoals, weight: 1 },
        { name: 'superpower', value: enrichedUserData.superpower, weight: 1 },
        { name: 'hobbies', value: enrichedUserData.hobbies, weight: 0.5 },
        { name: 'failureLesson', value: enrichedUserData.failureLesson, weight: 0.5 },
      ];

      const filledFields = contentFields.filter(f => hasContent(f.value));
      const totalWeight = contentFields.reduce((sum, f) => sum + f.weight, 0);
      const filledWeight = filledFields.reduce((sum, f) => sum + f.weight, 0);
      const completenessScore = filledWeight / totalWeight;

      console.log('📊 [CV GEN] Profile completeness check:');
      console.log(`   Filled: ${filledFields.length}/${contentFields.length} fields`);
      console.log(`   Score: ${(completenessScore * 100).toFixed(0)}% (weighted)`);
      contentFields.forEach(f => {
        const has = hasContent(f.value);
        const preview = f.value ? f.value.substring(0, 60).replace(/\n/g, ' ') : 'EMPTY';
        console.log(`   ${has ? '✅' : '❌'} ${f.name} (w:${f.weight}): "${preview}${(f.value?.length || 0) > 60 ? '...' : ''}"`);
      });

      // ═══════════════════════════════════════════════════
      // QUESTION LOGIC:
      // - If score >= 40% → enough to generate a CV (even if basic)
      // - If score < 40% → ask about the MOST IMPORTANT missing fields
      // - NEVER ask more than 2 questions at a time
      // - NEVER ask about something the user already provided
      // ═══════════════════════════════════════════════════

      const MIN_COMPLETENESS = 0.40; // 40% weighted = enough for a basic CV

      if (completenessScore < MIN_COMPLETENESS) {
        console.log(`⚠️ [CV GEN] Score ${(completenessScore * 100).toFixed(0)}% < ${MIN_COMPLETENESS * 100}% threshold`);

        // Find the most important MISSING fields (sorted by weight descending)
        const missingFields = contentFields
          .filter(f => !hasContent(f.value) && f.weight >= 2) // Only ask about important fields
          .sort((a, b) => b.weight - a.weight);

        // Generate questions for top 2 missing fields (max)
        const questionMap: Record<string, { fi: string; en: string; why_fi: string; why_en: string }> = {
          workExperience: {
            fi: 'Kerro työkokemuksestasi, työharjoitteluistasi tai projekteistasi — mitä tahansa olet tehnyt.',
            en: 'Tell me about your work experience, internships, or projects — anything you have done.',
            why_fi: 'Kokemus on CV:n tärkein osa',
            why_en: 'Experience is the most important part of a CV',
          },
          skills: {
            fi: 'Mitkä ovat vahvuutesi ja taitosi? (esim. teknologiat, kielet, sertifikaatit, kädentaidot, ihmissuhdetaidot — mitä tahansa)',
            en: 'What are your strengths and skills? (e.g. technologies, languages, certifications, crafts, people skills — anything)',
            why_fi: 'Taidot kertovat työnantajalle mitä osaat',
            why_en: 'Skills tell employers what you can do',
          },
          education: {
            fi: 'Kerro koulutuksestasi — tutkinnot, kurssit, tai muu opiskelu',
            en: 'Tell me about your education — degrees, courses, or other studies',
            why_fi: 'Koulutus on olennainen osa CV:tä',
            why_en: 'Education is an essential part of a CV',
          },
        };

        for (const field of missingFields.slice(0, 2)) {
          const qData = questionMap[field.name];
          if (qData) {
            forcedQuestions.push({
              id: `${field.name}_detail`,
              question: isFinnish ? qData.fi : qData.en,
              why: isFinnish ? qData.why_fi : qData.why_en,
              jobRequirement: field.name,
              currentUserData: field.value || 'Not specified',
              priority: field.weight >= 3 ? 'critical' as const : 'important' as const,
            });
          }
        }
      } else {
        console.log(`✅ [CV GEN] Score ${(completenessScore * 100).toFixed(0)}% ≥ ${MIN_COMPLETENESS * 100}% — enough to generate`);
      }

      if (forcedQuestions.length > 0) {
        console.log(`❓ [CV GEN] Profile still incomplete! Returning ${forcedQuestions.length} questions`);
        console.log(`   Questions: ${forcedQuestions.map(q => q.id).join(', ')}`);
        return {
          personal_description: '',
          html: { skills_section: '', experience_section: '', education_section: '', languages_section: '' },
          background_image: '',
          profile_image: '',
          profile_initials: '',
          fullTextContent: '',
          ats_data: null,
          job_analysis: { required_skills: [], preferred_skills: [], soft_skills: [], company_values: [], key_responsibilities: [], experience_level: 'mid', industry_keywords: [] },
          images: { background_prompt: '', visual_elements: [] },
          needsMoreInfo: true,
          questions: forcedQuestions,
        };
      }

      console.log('✅ [CV GEN] Profile complete enough, proceeding...');
    } else {
      console.log(`✅ [CV GEN] Skipping questions (${hasAnswers ? 'has answers' : 'skipQuestions=true'})`);
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 2: MERGE CURRENT-SESSION ANSWERS (on top of saved)
    // ════════════════════════════════════════════════════════════════

    console.log('📝 [CV GEN] STEP 2: Merge Current-Session Answers');
    let enhancedUserData = { ...enrichedUserData };

    if (answeredQuestions && answeredQuestions.length > 0) {
      timer.start("Merge Answers");
      console.log(`   → Merging ${answeredQuestions.length} current-session answers...`);

      const merged = mergeCVAnswers(toLangChainInput(enrichedUserData), answeredQuestions);
      enhancedUserData = {
        ...enrichedUserData,
        workExperience: merged.workExperience || enrichedUserData.workExperience,
        education: merged.education || enrichedUserData.education,
        skills: merged.skills || enrichedUserData.skills,
        workingStyle: merged.workingStyle || enrichedUserData.workingStyle,
        problemSolving: merged.problemSolving || enrichedUserData.problemSolving,
        uniqueStrength: merged.uniqueStrength || enrichedUserData.uniqueStrength,
        careerGoals: merged.careerGoals || enrichedUserData.careerGoals,
        bestProjectExample: merged.bestProjectExample || enrichedUserData.bestProjectExample,
      };

      console.log('   ✅ Merged');
      timer.end();
    }

    // ════════════════════════════════════════════════════════════════
    // STEP 3: EXTRACTIONS
    // ════════════════════════════════════════════════════════════════

    timer.start("Extractions");
    const jobAnalysis: JobAnalysis = {
      required_skills: [],
      preferred_skills: [],
      soft_skills: [],
      company_values: [],
      key_responsibilities: [],
      experience_level: 'mid',
      industry_keywords: [],
    };
    timer.end();

    const finalUserData = { ...enhancedUserData };
    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 4: SELECT PROMPT & BUILD CONTEXT
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
          contentType: 'cv',
        });
      } catch {
        knowledgeContext = '';
      }
    }

    timer.end();
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
      skills: finalUserData.skills || 'Not specified',
      workExperience: finalUserData.workExperience || 'Not specified',
      education: finalUserData.education || 'Not specified',
      workingStyle: finalUserData.workingStyle || 'Not specified',
      problemSolving: finalUserData.problemSolving || 'Not specified',
      uniqueStrength: finalUserData.uniqueStrength || 'Not specified',
      superpower: finalUserData.superpower || 'Not specified',
      careerGoals: finalUserData.careerGoals || '',
      bestProjectExample: finalUserData.bestProjectExample || '',
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await Promise.race([
      model.invoke(formatted),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 20000)),
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
      parsedOutput = await outputParser.parse(sanitizeAIResponse(rawContentString));
    } catch {
      try {
        parsedOutput = await outputParser.parse(rawContentString);
      } catch {
        parsedOutput = extractDataManually(rawContentString, toLangChainInput(finalUserData));
      }
    }

    timer.end();
    checkTimeout();

    // ════════════════════════════════════════════════════════════════
    // STEP 7: FINALIZATION
    // ════════════════════════════════════════════════════════════════

    console.log('🏁 [CV GEN] STEP 7: Finalization');
    timer.start("Background");

    let backgroundImage = '';
    if (finalUserData.backgroundImage) {
      backgroundImage = finalUserData.backgroundImage;
    } else {
      try {
        const generatedUrl = await generateEnhancedBackgroundImage(
          toLangChainInput(finalUserData),
          authToken
        );
        if (generatedUrl && generatedUrl.startsWith('http')) {
          const pathMatch = generatedUrl.match(/\/cv_files\/(.+)$/);
          backgroundImage = pathMatch ? pathMatch[1] : generatedUrl;
        } else if (generatedUrl && generatedUrl.startsWith('data:')) {
          backgroundImage = generatedUrl;
        }
      } catch {}
    }

    timer.end();

    const finalBackgroundImage = cleanImageUrl(backgroundImage || undefined);
    const profileImageClean = cleanImageUrl(finalUserData.profileImage);

    const fullTextContent = `${parsedOutput.personal_description}\n${parsedOutput.cv_content.skills_section}\n${parsedOutput.cv_content.experience_section}`.trim();

    timer.getResults();
    console.log('✅ [CV GEN] COMPLETE');

    return {
      personal_description: parsedOutput.personal_description,
      html: parsedOutput.cv_content,
      background_image: finalBackgroundImage || '',
      profile_image: profileImageClean || '',
      profile_initials: userData.profileImage ? '' : generateInitials(userData.name),
      fullTextContent,
      ats_data: parsedOutput.ats_optimization || null,
      job_analysis: jobAnalysis,
      images: { background_prompt: '', visual_elements: [] },
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
    return await Promise.race([
      generateCVWithPersonalityExtraction(userData),
      new Promise<CVGenerationResult>((_, reject) =>
        setTimeout(() => reject(new Error('CV generation timeout (55s)')), 55000)
      ),
    ]);
  } catch (error) {
    console.error('CV generation failed:', error);
    throw error;
  }
}