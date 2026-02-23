// lib/langchain/smartQuestionAnalyzer.ts
// CONSERVATIVE + FULL PROFILE AWARENESS
// Reads ALL profile data passed in — never asks if profile is rich enough.
// user_responses table = only for deduplication (don't ask same Q twice).

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import crypto from "crypto";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface SmartQuestion {
  id: string;
  question: string;
  why: string;
  jobRequirement: string;
  currentUserData: string;
  priority: "critical" | "important" | "helpful";
  helpText?: string;
}

export interface QuestionAnalysisResult {
  shouldAskQuestions: boolean;
  canGenerateWithoutQuestions: boolean;
  confidence: number;
  questions: SmartQuestion[];
  reasoning: string;
}

// Full profile — everything from profile page
// Personal fields (name/email/phone/location) are stripped before AI
export interface FullUserProfile {
  // Personal (NEVER sent to AI)
  name?: string;
  email?: string;
  phone?: string;
  location?: string;

  // Work experience
  workExperience?: string | WorkExperienceItem[];

  // Education
  education?: string | EducationItem[];

  // Skills
  skills?: string | SkillItem[];

  // Languages
  languages?: string | LanguageItem[];

  // Personality
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;

  // Stories & goals
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  personalNotes?: string;

  // Bonus (profile page extras)
  idealWorkEnvironment?: string;
  feedbackExample?: string;
  workplaceFrustration?: string;
  proudMoment?: string;
  whatIfMoney?: string;

  // Allow extra keys from legacy callers
  [key: string]: any;
}

interface WorkExperienceItem {
  id?: number;
  company?: string;
  position?: string;
  duration?: string;
  description?: string;
  isCurrent?: boolean;
  biggestAchievement?: string;
  whatYouLearned?: string;
  howYourStrengthShowed?: string;
  teamSize?: number;
  toolsUsed?: string;
  metrics?: string;
}

interface EducationItem {
  id?: number;
  school?: string;
  degree?: string;
  year?: string;
  isOngoing?: boolean;
  specialization?: string;
  favoriteSubjects?: string;
  thesisOrProject?: string;
  whyThisField?: string;
  proudestMoment?: string;
}

interface SkillItem {
  id?: number;
  name?: string;
  proficiency?: number;
  yearsUsed?: number;
  concreteExample?: string;
  impact?: string;
}

interface LanguageItem {
  id?: number;
  language?: string;
  speaking?: number;
  writing?: number;
  reading?: number;
  whereUsed?: string;
  certification?: string;
}

interface PreviousResponse {
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function generateQuestionId(questionText: string): string {
  return crypto
    .createHash("sha256")
    .update(questionText.toLowerCase().trim())
    .digest("hex")
    .substring(0, 16);
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

export function hasExistingAnswer(
  questionText: string,
  previousResponses: PreviousResponse[]
): { found: boolean; answer?: string; similarity?: number } {
  if (!Array.isArray(previousResponses) || previousResponses.length === 0) {
    return { found: false };
  }
  const questionId = generateQuestionId(questionText);
  for (const response of previousResponses) {
    const existingId = generateQuestionId(response.question);
    if (existingId === questionId) {
      return { found: true, answer: response.answer, similarity: 1.0 };
    }
    const similarity = calculateSimilarity(questionText, response.question);
    if (similarity > 0.85) {
      return { found: true, answer: response.answer, similarity };
    }
  }
  return { found: false };
}

// ═══════════════════════════════════════════════════════════════
// PREVIOUS RESPONSES FETCH (deduplication only)
// ═══════════════════════════════════════════════════════════════

export async function getPreviousResponses(
  userId: string,
  category?: string
): Promise<PreviousResponse[]> {
  if (!userId) return [];

  try {
    const params = new URLSearchParams();
    if (category) params.append("category", category);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `${baseUrl}/api/user-responses?${params.toString()}`,
      {
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn("[ANALYZER] Failed to fetch previous responses:", response.status);
      return [];
    }

    const data = await response.json();
    const responses = Array.isArray(data.responses) ? data.responses : [];

    return responses.map((r: any) => ({
      question: r.question_text || "",
      answer: r.answer || "",
      category: r.question_category || "",
      created_at: r.created_at || "",
    }));
  } catch (error) {
    console.error("[ANALYZER] getPreviousResponses error:", error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// PROFILE SERIALIZERS
// Convert structured arrays from profile page into readable text.
// Personal info is never included.
// ═══════════════════════════════════════════════════════════════

function serializeWorkExperience(raw: string | WorkExperienceItem[] | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "[]" || t === "null") return "";
    if (!t.startsWith("[")) return t;
    try { raw = JSON.parse(t) as WorkExperienceItem[]; } catch { return t; }
  }
  if (!Array.isArray(raw) || raw.length === 0) return "";
  return raw.map((job) => {
    const parts: string[] = [];
    if (job.position && job.company) parts.push(`${job.position} — ${job.company}`);
    else if (job.position) parts.push(job.position);
    else if (job.company) parts.push(job.company);
    if (job.duration) parts.push(`Period: ${job.duration}`);
    if (job.isCurrent) parts.push("(Current role)");
    if (job.description) parts.push(job.description);
    if (job.biggestAchievement) parts.push(`Achievement: ${job.biggestAchievement}`);
    if (job.whatYouLearned) parts.push(`Learned: ${job.whatYouLearned}`);
    if (job.toolsUsed) parts.push(`Tools: ${job.toolsUsed}`);
    if (job.metrics) parts.push(`Results: ${job.metrics}`);
    if (job.howYourStrengthShowed) parts.push(`Strength shown: ${job.howYourStrengthShowed}`);
    return parts.filter(Boolean).join("\n");
  }).filter(Boolean).join("\n\n");
}

function serializeEducation(raw: string | EducationItem[] | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "[]" || t === "null") return "";
    if (!t.startsWith("[")) return t;
    try { raw = JSON.parse(t) as EducationItem[]; } catch { return t; }
  }
  if (!Array.isArray(raw) || raw.length === 0) return "";
  return raw.map((edu) => {
    const parts: string[] = [];
    if (edu.degree && edu.school) parts.push(`${edu.degree} — ${edu.school}`);
    else if (edu.degree) parts.push(edu.degree);
    else if (edu.school) parts.push(edu.school);
    if (edu.year) parts.push(`Year: ${edu.year}`);
    if (edu.isOngoing) parts.push("(Ongoing)");
    if (edu.specialization) parts.push(`Specialization: ${edu.specialization}`);
    if (edu.favoriteSubjects) parts.push(`Strong subjects: ${edu.favoriteSubjects}`);
    if (edu.whyThisField) parts.push(`Motivation: ${edu.whyThisField}`);
    if (edu.proudestMoment) parts.push(`Proudest: ${edu.proudestMoment}`);
    if (edu.thesisOrProject) parts.push(`Thesis: ${edu.thesisOrProject}`);
    return parts.filter(Boolean).join("\n");
  }).filter(Boolean).join("\n\n");
}

function serializeSkills(raw: string | SkillItem[] | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "[]" || t === "null") return "";
    if (!t.startsWith("[")) return t;
    try { raw = JSON.parse(t) as SkillItem[]; } catch { return t; }
  }
  if (!Array.isArray(raw) || raw.length === 0) return "";
  const levels = ["", "Basic", "Good", "Strong", "Excellent", "Expert"];
  return raw.map((s) => {
    const parts: string[] = [];
    if (s.name) {
      const level = levels[s.proficiency || 3] || "";
      parts.push(`${s.name}${level ? ` (${level})` : ""}`);
    }
    if (s.yearsUsed) parts.push(`${s.yearsUsed}y`);
    if (s.concreteExample) parts.push(`Example: ${s.concreteExample}`);
    if (s.impact) parts.push(`Impact: ${s.impact}`);
    return parts.filter(Boolean).join(" — ");
  }).filter(Boolean).join("\n");
}

function serializeLanguages(raw: string | LanguageItem[] | undefined): string {
  if (!raw) return "";
  if (typeof raw === "string") {
    const t = raw.trim();
    if (!t || t === "[]" || t === "null") return "";
    if (!t.startsWith("[")) return t;
    try { raw = JSON.parse(t) as LanguageItem[]; } catch { return t; }
  }
  if (!Array.isArray(raw) || raw.length === 0) return "";
  const levels = ["", "Basic", "Intermediate", "Good", "Excellent", "Native"];
  return raw.map((l) => {
    const parts: string[] = [];
    if (l.language) {
      parts.push(`${l.language} — Speaking: ${levels[l.speaking || 3] || ""}`);
    }
    if (l.whereUsed) parts.push(`Used: ${l.whereUsed}`);
    if (l.certification) parts.push(`Cert: ${l.certification}`);
    return parts.filter(Boolean).join(", ");
  }).filter(Boolean).join("\n");
}

// ═══════════════════════════════════════════════════════════════
// ANONYMIZE & SERIALIZE FULL PROFILE
// ═══════════════════════════════════════════════════════════════

interface AnonymizedProfile {
  workExperience: string;
  education: string;
  skills: string;
  languages: string;
  workingStyle: string;
  problemSolving: string;
  energySources: string;
  uniqueStrength: string;
  learningStyle: string;
  teamRole: string;
  valuesExample: string;
  superpower: string;
  careerGoals: string;
  bestProjectExample: string;
  failureLesson: string;
  personalNotes: string;
  idealWorkEnvironment: string;
  feedbackExample: string;
  workplaceFrustration: string;
  proudMoment: string;
  whatIfMoney: string;
}

function anonymizeProfile(profile: FullUserProfile): AnonymizedProfile {
  return {
    workExperience:       serializeWorkExperience(profile.workExperience),
    education:            serializeEducation(profile.education),
    skills:               serializeSkills(profile.skills),
    languages:            serializeLanguages(profile.languages),
    workingStyle:         profile.workingStyle?.trim() || "",
    problemSolving:       profile.problemSolving?.trim() || "",
    energySources:        profile.energySources?.trim() || "",
    uniqueStrength:       profile.uniqueStrength?.trim() || "",
    learningStyle:        profile.learningStyle?.trim() || "",
    teamRole:             profile.teamRole?.trim() || "",
    valuesExample:        profile.valuesExample?.trim() || "",
    superpower:           profile.superpower?.trim() || "",
    careerGoals:          profile.careerGoals?.trim() || "",
    bestProjectExample:   profile.bestProjectExample?.trim() || "",
    failureLesson:        profile.failureLesson?.trim() || "",
    personalNotes:        profile.personalNotes?.trim() || "",
    idealWorkEnvironment: profile.idealWorkEnvironment?.trim() || "",
    feedbackExample:      profile.feedbackExample?.trim() || "",
    workplaceFrustration: profile.workplaceFrustration?.trim() || "",
    proudMoment:          profile.proudMoment?.trim() || "",
    whatIfMoney:          profile.whatIfMoney?.trim() || "",
  };
}

// ═══════════════════════════════════════════════════════════════
// COMPLETENESS SCORE — weighted 0-100
// ═══════════════════════════════════════════════════════════════

function hasRealContent(value: string): boolean {
  return value.trim().length >= 10;
}

function scoreProfile(p: AnonymizedProfile): { score: number; emptyImportant: string[] } {
  const fields = [
    { name: "workExperience",    value: p.workExperience,    weight: 25 },
    { name: "skills",            value: p.skills,            weight: 20 },
    { name: "education",         value: p.education,         weight: 10 },
    { name: "uniqueStrength",    value: p.uniqueStrength,    weight: 10 },
    { name: "workingStyle",      value: p.workingStyle,      weight:  7 },
    { name: "problemSolving",    value: p.problemSolving,    weight:  7 },
    { name: "bestProjectExample",value: p.bestProjectExample,weight:  6 },
    { name: "careerGoals",       value: p.careerGoals,       weight:  5 },
    { name: "superpower",        value: p.superpower,        weight:  4 },
    { name: "teamRole",          value: p.teamRole,          weight:  3 },
    { name: "learningStyle",     value: p.learningStyle,     weight:  3 },
  ];

  let score = 0;
  const emptyImportant: string[] = [];

  for (const f of fields) {
    if (hasRealContent(f.value)) {
      score += f.weight;
    } else if (f.weight >= 10) {
      emptyImportant.push(f.name);
    }
  }

  return { score, emptyImportant };
}

// ═══════════════════════════════════════════════════════════════
// BUILD PROFILE TEXT FOR AI
// ═══════════════════════════════════════════════════════════════

function buildProfileText(p: AnonymizedProfile): string {
  const sections: string[] = [];
  if (p.workExperience)       sections.push(`**Work Experience:**\n${p.workExperience}`);
  if (p.education)             sections.push(`**Education:**\n${p.education}`);
  if (p.skills)                sections.push(`**Skills:**\n${p.skills}`);
  if (p.languages)             sections.push(`**Languages:**\n${p.languages}`);
  if (p.workingStyle)          sections.push(`**Working Style:** ${p.workingStyle}`);
  if (p.problemSolving)        sections.push(`**Problem Solving:** ${p.problemSolving}`);
  if (p.energySources)         sections.push(`**Energy Sources:** ${p.energySources}`);
  if (p.uniqueStrength)        sections.push(`**Unique Strength:** ${p.uniqueStrength}`);
  if (p.learningStyle)         sections.push(`**Learning Style:** ${p.learningStyle}`);
  if (p.teamRole)              sections.push(`**Team Role:** ${p.teamRole}`);
  if (p.superpower)            sections.push(`**Superpower:** ${p.superpower}`);
  if (p.careerGoals)           sections.push(`**Career Goals:** ${p.careerGoals}`);
  if (p.bestProjectExample)    sections.push(`**Best Project:** ${p.bestProjectExample}`);
  if (p.failureLesson)         sections.push(`**Failure Lesson:** ${p.failureLesson}`);
  if (p.idealWorkEnvironment)  sections.push(`**Ideal Work Environment:** ${p.idealWorkEnvironment}`);
  if (p.feedbackExample)       sections.push(`**Feedback Example:** ${p.feedbackExample}`);
  if (p.workplaceFrustration)  sections.push(`**Values (frustration):** ${p.workplaceFrustration}`);
  if (p.proudMoment)           sections.push(`**Proud Moment:** ${p.proudMoment}`);
  if (p.whatIfMoney)           sections.push(`**True Motivation:** ${p.whatIfMoney}`);
  if (p.valuesExample)         sections.push(`**Values Example:** ${p.valuesExample}`);
  if (p.personalNotes)         sections.push(`**Personal Notes:** ${p.personalNotes}`);
  return sections.join("\n\n") || "No profile data provided.";
}

// ═══════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ═══════════════════════════════════════════════════════════════

export async function analyzeJobAndProfile(input: {
  jobDescription: string;
  userProfile: FullUserProfile;
  language: string;
  userId?: string;
}): Promise<QuestionAnalysisResult> {

  // 1. Anonymize & serialize
  const anonProfile = anonymizeProfile(input.userProfile);

  // 2. Local completeness check
  const { score, emptyImportant } = scoreProfile(anonProfile);
  console.log(`📊 [ANALYZER] Profile score: ${score}/100`);
  console.log(`   Empty important: ${emptyImportant.join(", ") || "none"}`);

  // 3. Skip AI if rich enough
  if (score >= 40) {
    console.log(`✅ [ANALYZER] Score ${score} >= 40 — no questions needed`);
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: score,
      questions: [],
      reasoning: `Profile complete enough (${score}/100).`,
    };
  }

  console.log(`⚠️ [ANALYZER] Score ${score} < 40 — running AI check`);

  // 4. Fetch previous responses for deduplication
  let previousResponses: PreviousResponse[] = [];
  if (input.userId) {
    try {
      previousResponses = await getPreviousResponses(input.userId);
      console.log(`📚 [ANALYZER] ${previousResponses.length} previous responses for dedup`);
    } catch {
      previousResponses = [];
    }
  }

  // 5. Build AI context
  const historyContext =
    previousResponses.length > 0
      ? `**ALREADY ANSWERED — DO NOT ASK AGAIN:**\n${previousResponses
          .map((r) => `Q: "${r.question}"\nA: "${r.answer}"`)
          .join("\n\n")}\n\nOmit any similar questions.`
      : "No previous answers.";

  const profileText = buildProfileText(anonProfile);
  const emptyNote =
    emptyImportant.length > 0
      ? `\nFields with no data: ${emptyImportant.join(", ")}`
      : "";

  // 6. AI call
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You decide if more info is needed before writing a cover letter or CV.

DEFAULT: Return shouldAskQuestions: false.
Only return true if info is COMPLETELY absent AND its absence would make the output embarrassingly generic.

Rules:
- If ANY meaningful work experience OR skills OR personality data exists → shouldAskQuestions: false
- Never ask about personal info (name, email, phone, location)
- Never ask about things already present in the profile
- Max 2 questions, can be 0
- "critical" = completely missing AND critical for output quality

${historyContext}

Return ONLY JSON:
{
  "shouldAskQuestions": true/false,
  "canGenerateWithoutQuestions": true/false,
  "confidence": 0-100,
  "reasoning": "one sentence",
  "questions": [
    {
      "id": "snake_case_id",
      "question": "In {language}",
      "why": "In {language}",
      "jobRequirement": "Which requirement",
      "currentUserData": "What exists or 'Nothing'",
      "priority": "critical",
      "helpText": "Optional hint"
    }
  ]
}`],
    ["human", `Language: {language}

JOB:
{jobDescription}

PROFILE (anonymized):
{profileText}
{emptyNote}

Decision: can we generate with what we have?`],
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language,
      jobDescription: input.jobDescription.substring(0, 3000),
      profileText,
      emptyNote,
    });

    const result = await model.invoke(formatted);
    const content =
      typeof result.content === "string" ? result.content : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const analysis: QuestionAnalysisResult = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(analysis.questions)) analysis.questions = [];
    if (analysis.questions.length > 2) {
      analysis.questions = analysis.questions.slice(0, 2);
    }

    // Dedup
    if (analysis.questions.length > 0 && previousResponses.length > 0) {
      const before = analysis.questions.length;
      analysis.questions = analysis.questions.filter((q) => {
        const existing = hasExistingAnswer(q.question, previousResponses);
        if (existing.found) {
          console.log(`⏭️ [ANALYZER] Skipping answered: "${q.question}"`);
          return false;
        }
        return true;
      });
      if (analysis.questions.length < before) {
        console.log(`📝 [ANALYZER] After dedup: ${before} → ${analysis.questions.length}`);
      }
    }

    if (analysis.questions.length === 0) {
      analysis.shouldAskQuestions = false;
      analysis.canGenerateWithoutQuestions = true;
    }

    console.log(`🤔 [ANALYZER] shouldAsk=${analysis.shouldAskQuestions}, questions=${analysis.questions.length}`);
    console.log(`   Reasoning: ${analysis.reasoning}`);

    return analysis;
  } catch (error) {
    console.error("❌ [ANALYZER] Failed:", error);
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: 60,
      questions: [],
      reasoning: "Analysis failed — proceeding with available data",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MERGE HELPER
// ═══════════════════════════════════════════════════════════════

export function mergeAnswersToProfile(
  originalProfile: any,
  questionAnswers: Record<string, string>
): any {
  const enhanced = { ...originalProfile };
  const answers = Object.entries(questionAnswers)
    .filter(([_, answer]) => answer.trim())
    .map(([_, answer]) => answer)
    .join("\n\n");
  if (answers) {
    enhanced.personalNotes = enhanced.personalNotes
      ? `${enhanced.personalNotes}\n\n--- Lisätietoja ---\n${answers}`
      : answers;
  }
  return enhanced;
}