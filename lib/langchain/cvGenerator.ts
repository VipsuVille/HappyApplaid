// lib/langchain/cvGenerator.ts - TÄYDELLINEN + ANSWERS INTEGRATION
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
type ExtendedLangChainCVInput = LangChainCVInput & {
  userId?: string;
  cvId?: string;
  jobPosting?: string;
  authToken?: string;
  answersSkills?: string;
  answersCertifications?: string;
};

function ensureString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

// =====================================
// ✅ ANSWERS INTEGRATION
// =====================================

interface PreviousResponse {
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

/**
 * ✅ HAE AIEMMAT VASTAUKSET KÄYTTÄJÄLTÄ
 */
async function getPreviousResponses(userId: string): Promise<PreviousResponse[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/user-responses`,
      { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) {
      console.warn('Failed to fetch previous responses:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    return (data.responses || []).map((r: any) => ({
      question: r.question_text,
      answer: r.answer,
      category: r.question_category,
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error fetching previous responses:', error);
    return [];
  }
}

/**
 * ✅ POIMII TAITOJA VASTAUKSESTA (REGEX-VERSIO)
 * 
 * Kustannus: 0 tokeneita
 * Nopeus: Instant
 * Tarkkuus: ~70%
 */
function extractSkillsFromAnswer(answer: string): string[] {
  const skills: string[] = [];
  const lowerAnswer = answer.toLowerCase();
  
  // Suomen kieli
  const finnishPatterns = [
    /osaan\s+([^,\.!\?]+)/gi,
    /minulla on\s+([^,\.!\?]+)/gi,
    /hallitsen\s+([^,\.!\?]+)/gi,
    /olen\s+([^,\.!\?]+?)\s*(?:koulutus|sertifikaatti|tutkinto)/gi,
    /(?:koulutus|sertifikaatti|tutkinto)\s+([^,\.!\?]+)/gi,
    /käytän\s+([^,\.!\?]+)/gi,
    /kokemusta\s+([^,\.!\?]+)/gi,
  ];
  
  // Englanti
  const englishPatterns = [
    /I\s+(?:can|know)\s+([^,\.!\?]+)/gi,
    /I\s+have\s+(?:experience|certification|training|knowledge)\s+(?:in|with)\s+([^,\.!\?]+)/gi,
    /I'm\s+(?:certified|trained)\s+in\s+([^,\.!\?]+)/gi,
    /I\s+use\s+([^,\.!\?]+)/gi,
    /proficient\s+(?:in|with)\s+([^,\.!\?]+)/gi,
  ];
  
  const allPatterns = [...finnishPatterns, ...englishPatterns];
  
  allPatterns.forEach(pattern => {
    const matches = answer.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const skill = match[1]
          .trim()
          .replace(/^(ja|and|sekä|että)\s+/i, '')
          .replace(/\s+(vuotta|vuoden|years?|vuodesta)\s*$/i, '');
        
        if (skill.length > 2 && skill.length < 100) {
          skills.push(skill);
        }
      }
    }
  });
  
  return [...new Set(skills)]; // Poista duplikaatit
}

/**
 * ✅ POIMII SERTIFIKAATIT JA KOULUTUKSET
 */
function extractCertificationsFromAnswer(answer: string): string[] {
  const certifications: string[] = [];
  
  const patterns = [
    /(?:sertifikaatti|certificate|certification|tutkinto|koulutus|training|degree)\s*:?\s*([^,\.!\?\n]+)/gi,
    /([^,\.!\?\n]+?)\s*(?:sertifikaatti|certificate|certification|tutkinto|koulutus)/gi,
  ];
  
  patterns.forEach(pattern => {
    const matches = answer.matchAll(pattern);
    for (const match of matches) {
      if (match[1]) {
        const cert = match[1].trim();
        if (cert.length > 3 && cert.length < 100) {
          certifications.push(cert);
        }
      }
    }
  });
  
  return [...new Set(certifications)];
}

/**
 * ✅ ANALYSOI KAIKKI VASTAUKSET JA RAKENNA SKILLS-KONTEKSTI
 */
async function buildSkillsFromAnswers(userId: string): Promise<{
  skills: string[];
  certifications: string[];
  rawContext: string;
}> {
  console.log('📚 Fetching user answers for CV skill extraction...');
  
  const previousResponses = await getPreviousResponses(userId);
  
  if (previousResponses.length === 0) {
    console.log('   No previous answers found');
    return { skills: [], certifications: [], rawContext: '' };
  }
  
  console.log(`   Found ${previousResponses.length} answers`);
  
  let allSkills: string[] = [];
  let allCertifications: string[] = [];
  let rawContext = '';
  
  previousResponses.forEach(r => {
    // Poimii taitoja
    const skills = extractSkillsFromAnswer(r.answer);
    allSkills = [...allSkills, ...skills];
    
    // Poimii sertifikaatteja
    const certs = extractCertificationsFromAnswer(r.answer);
    allCertifications = [...allCertifications, ...certs];
    
    // Rakenna raw context (voidaan lisätä promptiin)
    rawContext += `${r.question}\n${r.answer}\n\n`;
  });
  
  // Poista duplikaatit
  allSkills = [...new Set(allSkills)];
  allCertifications = [...new Set(allCertifications)];
  
  console.log(`✅ Extracted from answers:`);
  console.log(`   Skills: ${allSkills.length} (${allSkills.slice(0, 5).join(', ')}...)`);
  console.log(`   Certifications: ${allCertifications.length} (${allCertifications.slice(0, 3).join(', ')}...)`);
  
  return {
    skills: allSkills,
    certifications: allCertifications,
    rawContext: rawContext.trim()
  };
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
  if (typeof message === "string") return message;
  if (typeof message !== "object" || message === null) return "";
  if (!("content" in message)) return "";
  
  const content = (message as { content: unknown }).content;
  
  if (typeof content === "string") return content;
  
  if (Array.isArray(content)) {
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

    if (jsonTextPart) {
      if (typeof jsonTextPart === "string") return jsonTextPart;
      if (typeof jsonTextPart === "object" && "text" in jsonTextPart) {
        const textItem = jsonTextPart as { text: unknown };
        if (typeof textItem.text === "string") return textItem.text;
      }
    }

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
// PROMPT TEMPLATES (UPDATED WITH ANSWERS)
// =====================================
const atsOptimizedSimplePrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a CV content writer who creates FIRST-PERSON professional descriptions.

CRITICAL RULES:
- Write in FIRST PERSON: "I am..." NOT "Candidate is..." or "Name is..."
- NEVER use placeholder names like [Name], [Candidate], or any third-person references
- Focus on PERSONALITY and POTENTIAL over credentials
- Be HONEST - use only provided information
- Create compelling narrative from available data

VOICE:
- Authentic and personal ("I bring...")
- Confident but humble ("I've developed...")
- Future-focused ("I aim to...")

OUTPUT LANGUAGE: Generate all content in {language} (e.g., Finnish, English)`,
  ],
  [
    "human",
    `Create a compelling CV content for a person with these characteristics:

=== PROFESSIONAL PROFILE ===
Target Role: {jobTitle}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages: {languages}

=== ✅ ADDITIONAL SKILLS FROM USER ANSWERS ===
Extracted Skills: {answersSkills}
Certifications: {answersCertifications}

=== PERSONALITY (Write from this person's perspective) ===
Working Style: {workingStyle}
Problem-Solving Approach: {problemSolving}
What Energizes Me: {energySources}
My Unique Strength: {uniqueStrength}
How I Learn: {learningStyle}
My Role in Teams: {teamRole}
What I Value: {valuesExample}
My Professional Identity: {superpower}

=== CONTEXT ===
Additional Interests: {hobbies}
Character Traits: {personalityTraits}

=== REQUIRED OUTPUT FORMAT ===
{{
  "personal_description": "First-person professional summary (1500-2500 chars). Start with 'I am...' or 'As a...' Write in {language}",
  "cv_content": {{
    "skills_section": "First-person skills description in HTML. Include skills from both profile AND answers. Use 'I have expertise in...' Write in {language}",
    "experience_section": "First-person experience narrative in HTML. Use 'I have worked...' or 'My experience includes...' Write in {language}",
    "education_section": "First-person education background in HTML. Include certifications from answers. Use 'I studied...' or 'I hold...' Write in {language}",
    "languages_section": "First-person language skills in HTML. Use 'I speak...' or 'I am fluent in...' Write in {language}"
  }},
  "ats_optimization": {{
    "keyword_density": "Key skills integrated naturally throughout (list in {language})",
    "personality_integration": "How personality differentiates this candidate (in {language})",
    "measurable_achievements": ["Quantified results and accomplishments (in {language})"]
  }}
}}

IMPORTANT: 
- ALL content must be in {language}
- Use first-person perspective throughout
- INTEGRATE skills and certifications from user answers seamlessly
- Never mention placeholder names or third-person references
- Write as if YOU are this person describing yourself`,
  ],
]);

// (atsOptimizedTechnicalPrompt ja atsOptimizedCreativePrompt samalla tavalla - lisää answersSkills ja answersCertifications)

// =====================================
// MAIN: GENERATE CV WITH ANSWERS
// =====================================
// lib/langchain/cvGenerator.ts - TYYPPIKORJAUS

// ... (kaikki muu koodi sama)
 
export async function generateCVWithPersonalityExtraction(
  userData: ExtendedLangChainCVInput // ✅ Käytä laajennettua tyyppiä0
): Promise<CVGenerationResult> {
  const timer = new PerformanceTimer();
  timer.start("Total Generation");

  const { authToken, jobPosting, userId, ...restUserData } = userData;

  try {
    // ⚡ STAGE 1: PARALLEL EXTRACTION (+ ANSWERS)
    timer.start("Personality + Job Analysis + Answers");
    
    const [personalityExtraction, jobAnalysis, answersData] = await Promise.all([
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
          }),
      userId ? buildSkillsFromAnswers(userId) : Promise.resolve({ skills: [], certifications: [], rawContext: '' })
    ]);
    
    timer.end();

    // ⚡ STAGE 2: DATA TRANSFORMATION
    timer.start("Data Transformation");
    
    const extractedPersonalityData = convertToLegacyFormat(personalityExtraction);
    const confidenceScore = getPersonalityConfidenceScore(personalityExtraction);
    
    console.log(`📊 Personality confidence: ${Math.round(confidenceScore.averageConfidence * 100)}%`);

    // ✅ YHDISTÄ SKILLS PROFIILISTA + ANSWERSISTA
    const combinedSkills = [
      restUserData.skills || '',
      answersData.skills.join(', ')
    ].filter(Boolean).join(', ');

    const combinedEducation = [
      restUserData.education || '',
      answersData.certifications.length > 0 ? `\n\nSertifikaatit: ${answersData.certifications.join(', ')}` : ''
    ].filter(Boolean).join('');

    console.log(`✅ Enhanced with answers:`);
    console.log(`   Total skills: ${combinedSkills.split(',').length}`);
    console.log(`   Certifications: ${answersData.certifications.length}`);

    // ✅ KORJAUS: Rakenna ExtendedLangChainCVInput oikein
    const enhancedUserData: ExtendedLangChainCVInput = {
      ...restUserData,
      userId: userId, // ✅ Nyt tyyppi tukee tätä
      skills: combinedSkills,
      education: combinedEducation,
      workingStyle: extractedPersonalityData.workingStyle || restUserData.workingStyle || "",
      problemSolving: extractedPersonalityData.problemSolving || restUserData.problemSolving || "",
      energySources: extractedPersonalityData.energySources || restUserData.energySources || "",
      uniqueStrength: extractedPersonalityData.uniqueStrength || restUserData.uniqueStrength || "",
      learningStyle: extractedPersonalityData.learningStyle || restUserData.learningStyle || "",
      teamRole: extractedPersonalityData.teamRole || restUserData.teamRole || "",
      valuesExample: extractedPersonalityData.valuesExample || restUserData.valuesExample || "",
      superpower: extractedPersonalityData.superpower || restUserData.superpower || "",
      
      // ✅ LISÄÄ ANSWERS-KONTEKSTI
      answersSkills: answersData.skills.join(', '),
      answersCertifications: answersData.certifications.join(', '),
    };
    
    timer.end();

    // ⚡ STAGE 3: GENERATE CV
    console.log("🚀 Generating CV content with answers integration...");
    const result = await generateCVWithLangChain(enhancedUserData);

    timer.getResults();

    return result;
  } catch (error) {
    console.error("❌ CV generation failed:", error);
    // ✅ KORJAUS: Palauta oikea virhe JSON-muodossa
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "CV generation failed with unknown error"
    );
  }
}
// =====================================
// MAIN: GENERATE CV WITH LANGCHAIN
// =====================================
export async function generateCVWithLangChain(
  userData: LangChainCVInput & { authToken?: string; jobPosting?: string; answersSkills?: string; answersCertifications?: string }
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
    let promptTemplate: ChatPromptTemplate = atsOptimizedSimplePrompt; // Default

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
      valuesExample: userData.valuesExample,
      
      superpower: userData.superpower || "",
      hobbies: userData.hobbies || "",
      personalityTraits: userData.personalityTraits || "",
      // ✅ ANSWERS INTEGRATION
      answersSkills: userData.answersSkills || "No additional skills from answers",
      answersCertifications: userData.answersCertifications || "No certifications from answers",
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
// lib/langchain/cvGenerator.ts - LISÄÄ METADATA TRACKING

// lib/langchain/cvGenerator.ts - LISÄÄ METADATA TRACKING

export async function generateEnhancedBackgroundImage(
  userData: LangChainCVInput,
  authToken?: string
): Promise<string> {
  try {
    const personalityKeywords = [
      userData.workingStyle?.toLowerCase().includes('metikuloos') ? 'structured' : '',
      userData.workingStyle?.toLowerCase().includes('luova') ? 'creative' : '',
      userData.energySources?.toLowerCase().includes('analyyttinen') ? 'analytical' : '',
      userData.energySources?.toLowerCase().includes('tiimi') ? 'collaborative' : '',
      userData.uniqueStrength?.toLowerCase().includes('innovatiiv') ? 'innovative' : '',
    ].filter(Boolean).join(' ');

    const optimizedPrompt = `
Abstract minimal professional background, 
soft gradient, ${personalityKeywords || 'balanced'} aesthetic,
clean geometric shapes, no text, no numbers, no icons, no people,
single sophisticated color palette, ultra minimal design,
suitable for CV background
    `.trim();

    console.log(`🎨 Generating minimal background: "${optimizedPrompt.substring(0, 80)}..."`);

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
      console.error(`Image API error ${response.status}: ${errorText}`);
      return FALLBACK_IMAGE;
    }

    const data = await response.json() as { url?: string };
    if (!data.url) {
      console.error("No URL in image response");
      return FALLBACK_IMAGE;
    }

    let imageBlob: Blob;
    if (data.url.startsWith("data:")) {
      const base64Data = data.url.split(",")[1];
      if (!base64Data) {
        console.error("Invalid base64 data");
        return FALLBACK_IMAGE;
      }
      imageBlob = await (
        await fetch(`data:application/octet-stream;base64,${base64Data}`)
      ).blob();
    } else {
      const imageResponse = await fetch(data.url);
      if (!imageResponse.ok) {
        console.error(`Failed to fetch image: ${imageResponse.statusText}`);
        return FALLBACK_IMAGE;
      }
      imageBlob = await imageResponse.blob();
    }

    const userId = userData.userId || "anonymous";
    const cvId = userData.cvId || `cv_${Date.now()}`;
    const timestamp = Date.now();
    const filePath = `backgrounds/${userId}/background-${cvId}-${timestamp}.png`;

    // ✅ UPLOAD IMAGE
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

    // ✅ GET PUBLIC URL
    const { data: publicUrlData } = supabase.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    if (!publicUrlData?.publicUrl) {
      console.error("Failed to get public URL");
      return FALLBACK_IMAGE;
    }

    // ✅ NEW: TALLENNA METADATA default_images-tauluun
    try {
      await supabase.from('default_images').insert({
        user_id: userId,
        image_type: 'background',
        file_path: filePath,
        name: `Generated ${new Date().toLocaleDateString()}`,
        is_active: true,
        is_ai_generated: true, // Lisää tämä kenttä tauluun
        generation_prompt: optimizedPrompt.substring(0, 500), // Tallenna prompt referenssiksi
        cv_id: cvId // Linkki CV:hen
      });
      
      console.log(`✅ Image metadata saved to default_images`);
    } catch (metaError) {
      console.error("⚠️ Failed to save image metadata:", metaError);
      // Ei kaada prosessia, kuva on jo tallessa
    }

    console.log(`✅ Background image uploaded: ${publicUrlData.publicUrl}`);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error("❌ Background image generation failed:", error);
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
      if (typeof aiData.cv_content.skills_section === "object") {
        aiData.cv_content.skills_section = convertSkillsObjectToString(
          aiData.cv_content.skills_section
        );
      }

      if (typeof aiData.cv_content.experience_section === "object") {
        aiData.cv_content.experience_section = convertExperienceObjectToString(
          aiData.cv_content.experience_section
        );
      }

      if (typeof aiData.cv_content.education_section === "object") {
        aiData.cv_content.education_section = convertEducationObjectToString(
          aiData.cv_content.education_section
        );
      }

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

  return JSON.stringify(eduRecord);
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

// ✅ EXPORT ALL FUNCTIONS
export {
  getPreviousResponses,
  extractSkillsFromAnswer,
  extractCertificationsFromAnswer,
  buildSkillsFromAnswers
};