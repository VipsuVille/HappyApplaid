/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProfileData, UserFormData } from "@/types";

/* ======================================================
   LANGCHAIN INPUT TYPE (⬅ SIIRRETTY YLÖS – KRITTINEN KORJAUS)
====================================================== */

export type LangChainCVInput = UserFormData & {
  userId?: string;
  cvId?: string;
  cvType?: "simple" | "technical" | "creative";
  language?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  authToken?: string;
  jobPosting?: string;
  backgroundImage?: string;
  answersSkills?: string;
  answersCertifications?: string;
  bio?: string;
  profile?: string;
};

/* ======================================================
   DATABASE PROFILE TYPE
====================================================== */

export interface DBProfileData {
  user_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  job_title: string | null;
  profile_summary: string | null;
  profile_image: string | null;

  education: any[] | null;
  work_experience: any[] | null;
  certificates: any[] | null;
  languages: any[] | null;

  skills: string | null;
  technical_skills: string | null;
  soft_skills: string | null;

  working_style: string | null;
  problem_solving: string | null;
  energy_sources: string | null;
  unique_strength: string | null;
  learning_style: string | null;
  team_role: string | null;
  values_example: string | null;
  superpower: string | null;

  career_goals: string | null;
  best_project_example: string | null;
  failure_lesson: string | null;

  // ✅ LISÄÄ PUUTTUVAT KENTÄT PROFIILISIVULTA
  ideal_work_environment?: string | null;
  feedback_example?: string | null;
  workplace_frustration?: string | null;
  proud_moment?: string | null;
  what_if_money?: string | null;

  hobbies: string | null;
  age: string | null;
  linkedin: string | null;
  website: string | null;

  language: string | null;
}

/* ======================================================
   UI → DATABASE
====================================================== */

export function transformUIToDB(
  uiProfile: ProfileData,
  userId: string
): Partial<DBProfileData> {
  return {
    user_id: userId,
    name: uiProfile.name || null,
    email: uiProfile.email || null,
    phone: uiProfile.phone || null,
    location: uiProfile.location || null,
    job_title: uiProfile.jobTitle || null,
    profile_image: uiProfile.profileImage || null,

    working_style: uiProfile.workingStyle || null,
    problem_solving: uiProfile.problemSolving || null,
    energy_sources: uiProfile.energySources || null,
    unique_strength: uiProfile.uniqueStrength || null,
    learning_style: uiProfile.learningStyle || null,
    team_role: uiProfile.teamRole || null,
    values_example: uiProfile.valuesExample || null,
    superpower: uiProfile.superpower || null,

    career_goals: uiProfile.careerGoals || null,
    best_project_example: uiProfile.bestProjectExample || null,
    failure_lesson: uiProfile.failureLesson || null,

    // ✅ LISÄÄ PUUTTUVAT KENTÄT (profiilisivulta)
    ideal_work_environment: (uiProfile as any).idealWorkEnvironment || null,
    feedback_example: (uiProfile as any).feedbackExample || null,
    workplace_frustration: (uiProfile as any).workplaceFrustration || null,
    proud_moment: (uiProfile as any).proudMoment || null,
    what_if_money: (uiProfile as any).whatIfMoney || null,

    education: uiProfile.education || [],
    work_experience: uiProfile.workExperience || [],
    languages: uiProfile.languages || [],

    skills: Array.isArray(uiProfile.skills) 
  ? JSON.stringify(uiProfile.skills) 
  : uiProfile.skills || null,

    // ✅ NORMALISOITU
    language: "finnish",
  };
}

/* ======================================================
   DATABASE → LANGCHAIN (KORJATTU)
====================================================== */

export function transformDBToLangChain(
  dbProfile: DBProfileData,
  cvType: "simple" | "technical" | "creative" = "simple"
): LangChainCVInput {
  const educationText = Array.isArray(dbProfile.education)
    ? dbProfile.education
        .filter(e => e?.school || e?.degree || e?.institution)
        .map(e => {
          const degree = e.degree || "";
          const school = e.school || e.institution || "";
          return [degree, school].filter(Boolean).join(", ");
        })
        .join("\n")
    : "";

  const workExperienceText = Array.isArray(dbProfile.work_experience)
    ? dbProfile.work_experience
        .filter(w => w?.position || w?.company)
        .map(w => {
          const title = w.position || w.title || "";
          const company = w.company || w.employer || "";
          const desc = w.description || "";
          return `${title}${company ? ", " + company : ""}\n${desc}`.trim();
        })
        .join("\n\n")
    : "";

  const languagesText = Array.isArray(dbProfile.languages)
    ? dbProfile.languages
        .filter(l => l?.language)
        .map(l => `${l.language}${l.level ? ` (${l.level})` : ""}`)
        .join(", ")
    : "";

  const skillsText = [
    dbProfile.skills,
    dbProfile.technical_skills,
    dbProfile.soft_skills,
  ]
    .filter(Boolean)
    .join(". ");

  // ✅ MUUNNA PROFILE_IMAGE TÄYDEKSI URL:KSI
  let profileImageUrl: string | undefined = undefined;
  
  if (dbProfile.profile_image) {
    if (dbProfile.profile_image.startsWith('http')) {
      // Jo täysi URL
      profileImageUrl = dbProfile.profile_image;
    } else if (dbProfile.profile_image.startsWith('data:image')) {
      // Base64 (legacy)
      profileImageUrl = dbProfile.profile_image;
    } else {
      // File path → rakennetaan URL
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (supabaseUrl) {
        profileImageUrl = `${supabaseUrl}/storage/v1/object/public/cv_files/${dbProfile.profile_image}`;
      }
    }
  }

  return {
    userId: dbProfile.user_id,
    cvId: `cv_${Date.now()}`,
    cvType,
    language: dbProfile.language || "finnish",

    name: dbProfile.name || "",
    email: dbProfile.email || "",
    phone: dbProfile.phone || "",
    location: dbProfile.location || "",
    title: dbProfile.job_title || "",
    introText: dbProfile.profile_summary || "",

    education: educationText,
    workExperience: workExperienceText,
    skills: skillsText,
    languages: languagesText,

    workingStyle: dbProfile.working_style || "",
    problemSolving: dbProfile.problem_solving || "",
    energySources: dbProfile.energy_sources || "",
    uniqueStrength: dbProfile.unique_strength || "",
    learningStyle: dbProfile.learning_style || "",
    teamRole: dbProfile.team_role || "",
    valuesExample: dbProfile.values_example || "",
    superpower: dbProfile.superpower || "",

    careerGoals: dbProfile.career_goals || "",
    bestProjectExample: dbProfile.best_project_example || "",
    failureLesson: dbProfile.failure_lesson || "",

    hobbies: dbProfile.hobbies || "",
    age: dbProfile.age || "",
    linkedIn: dbProfile.linkedin || "",

    // ✅ KÄYTÄ TÄYTTÄ URL:IA
    profileImage: profileImageUrl,
  };
}

/* ======================================================
   VALIDATION
====================================================== */

export function validateProfileForCVType(
  input: LangChainCVInput,
  cvType: "simple" | "technical" | "creative"
) {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!input.name || input.name.length < 2) missing.push("Name");
  else score += 10;

  if (!input.email || !input.email.includes("@")) missing.push("Email");
  else score += 10;

  if (cvType !== "simple") {
    if (!input.workExperience || input.workExperience.length < 100)
      missing.push("Work Experience");

    if (!input.education || input.education.length < 20)
      missing.push("Education");

    if (!input.skills || input.skills.length < 50)
      missing.push("Skills");
  }

  return {
    isValid: missing.length === 0,
    missingCritical: missing,
    suggestions,
    score: Math.min(score, 100),
  };
}