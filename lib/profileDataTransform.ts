// lib/profileDataTransform.ts - KORJATTU VERSIO
/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ProfileData, UserFormData } from "@/types";

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
  portfolio_links: any[] | null;
  user_references: any[] | null;
  
  skills: string | null;
  technical_skills: string | null;
  soft_skills: string | null;
  hobbies: string | null;
  personality_traits: string | null;
  professional_strengths: string | null;
  personal_values: string | null;
  motivators: string | null;
  work_environment: string | null;
  achievements: string | null;
  awards: string | null;
  
  availability: string | null;
  drivers_license: string | null;
  remote_work: string | null;
  age: string | null;
  linkedin: string | null;
  website: string | null;
  language: string | null;
  
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
  
  created_at?: string;
  updated_at?: string;
}

/**
 * ✅ UI → DATABASE
 */
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
    
    education: uiProfile.education || [],
    work_experience: uiProfile.workExperience || [],
    languages: uiProfile.languages || [],
    
    skills: uiProfile.skills || null,
    
    language: "Suomi",
  };
}

/**
 * ✅ DATABASE → LANGCHAIN
 */
export function transformDBToLangChain(
  dbProfile: DBProfileData,
  cvType: "simple" | "technical" | "creative" = "simple"
): LangChainCVInput {
  
  const educationText = Array.isArray(dbProfile.education)
    ? dbProfile.education
        .filter(edu => edu.school || edu.degree || edu.institution)
        .map(edu => {
          const degree = edu.degree || "";
          const school = edu.school || edu.institution || "";
          const startDate = edu.startDate || edu.year || "";
          const endDate = edu.endDate || "";
          const isOngoing = edu.isOngoing || false;
          
          let formatted = "";
          if (degree && school) {
            formatted = `${degree}, ${school}`;
          } else if (degree) {
            formatted = degree;
          } else if (school) {
            formatted = school;
          }
          
          if (isOngoing && startDate) {
            formatted += ` (${startDate} - Ongoing)`;
          } else if (startDate && endDate) {
            formatted += ` (${startDate} - ${endDate})`;
          } else if (startDate) {
            formatted += ` (${startDate})`;
          }
          
          if (edu.specialization) {
            formatted += ` - ${edu.specialization}`;
          }
          
          return formatted;
        })
        .join("\n")
    : "";

  const workExperienceText = Array.isArray(dbProfile.work_experience)
    ? dbProfile.work_experience
        .filter(work => work.employer || work.company || work.position || work.title)
        .map(work => {
          const position = work.position || work.title || "";
          const employer = work.employer || work.company || "";
          const startDate = work.startDate || "";
          const endDate = work.endDate || "";
          const duration = work.duration || "";
          const description = work.description || "";
          const achievements = work.achievements || "";
          
          let formatted = "";
          if (position && employer) {
            formatted = `${position}, ${employer}`;
          } else if (position) {
            formatted = position;
          } else if (employer) {
            formatted = employer;
          }
          
          if (duration) {
            formatted += ` (${duration})`;
          } else if (startDate && endDate) {
            formatted += ` (${startDate} - ${endDate})`;
          } else if (startDate) {
            formatted += ` (${startDate} - Current)`;
          }
          
          if (description) {
            formatted += `\n${description}`;
          }
          
          if (achievements) {
            formatted += `\nAchievements: ${achievements}`;
          }
          
          return formatted;
        })
        .join("\n\n")
    : "";

  const languagesText = Array.isArray(dbProfile.languages)
    ? dbProfile.languages
        .filter(lang => lang.language)
        .map(lang => {
          const language = lang.language || "";
          const level = lang.level || "Good";
          const speaking = lang.speaking || "";
          const writing = lang.writing || "";
          
          let formatted = `${language}: ${level}`;
          
          if (speaking && writing && speaking !== level) {
            formatted += ` (Speaking: ${speaking}, Writing: ${writing})`;
          }
          
          return formatted;
        })
        .join(", ")
    : "";

  const skillsText = [
    dbProfile.skills,
    dbProfile.technical_skills,
    dbProfile.soft_skills,
  ]
    .filter(Boolean)
    .join(". ");

  const langchainInput: LangChainCVInput = {
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
    
    personalityTraits: dbProfile.superpower 
      ? `${dbProfile.superpower}${dbProfile.working_style ? `; ${dbProfile.working_style}` : ""}`
      : "",
    
    hobbies: dbProfile.hobbies || "",
    age: dbProfile.age || "",
    linkedIn: dbProfile.linkedin || "",
    
    userId: dbProfile.user_id,
    cvId: `cv_${Date.now()}`,
    cvType: cvType,
    language: dbProfile.language || "finnish",
    
    profileImage: dbProfile.profile_image || undefined,
  };

  return langchainInput;
}

// ✅ PÄIVITETTY LangChainCVInput - SISÄLTÄÄ KAIKKI TARVITTAVAT KENTÄT
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

/**
 * ✅ CV-TYYPIN VALIDOINTI
 */
export function validateProfileForCVType(
  langchainInput: LangChainCVInput,
  cvType: "simple" | "technical" | "creative"
): {
  isValid: boolean;
  missingCritical: string[];
  suggestions: string[];
  score: number;
} {
  const missing: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  if (!langchainInput.name || langchainInput.name.length < 2) {
    missing.push("Name");
    suggestions.push("Add your full name");
  } else {
    score += 10;
  }
  
  if (!langchainInput.email || !langchainInput.email.includes("@")) {
    missing.push("Email");
    suggestions.push("Add valid email address");
  } else {
    score += 10;
  }

  if (cvType === "simple") {
    const personalityFields = [
      { field: langchainInput.workingStyle, name: "Working Style", min: 50, points: 12 },
      { field: langchainInput.problemSolving, name: "Problem Solving", min: 80, points: 15 },
      { field: langchainInput.energySources, name: "Energy Sources", min: 40, points: 10 },
      { field: langchainInput.uniqueStrength, name: "Unique Strength", min: 60, points: 13 },
      { field: langchainInput.learningStyle, name: "Learning Style", min: 40, points: 10 },
      { field: langchainInput.teamRole, name: "Team Role", min: 40, points: 10 },
      { field: langchainInput.superpower, name: "Professional Identity", min: 10, points: 10 },
    ];

    personalityFields.forEach(({ field, name, min, points }) => {
      if (!field || field.length < min) {
        missing.push(`${name} (${field?.length || 0}/${min} chars)`);
        suggestions.push(`Complete ${name} (min ${min} chars)`);
      } else {
        score += points;
      }
    });

    if (langchainInput.education && langchainInput.education.length > 20) {
      score += 5;
    }
    
    if (langchainInput.workExperience && langchainInput.workExperience.length > 50) {
      score += 5;
    }
  }

  if (cvType === "technical" || cvType === "creative") {
    if (!langchainInput.workExperience || langchainInput.workExperience.length < 100) {
      missing.push(`Work Experience (${langchainInput.workExperience?.length || 0}/100 chars)`);
      suggestions.push("Add at least one work experience with description (100+ chars total)");
    } else {
      score += 30;
    }

    if (!langchainInput.education || langchainInput.education.length < 20) {
      missing.push(`Education (${langchainInput.education?.length || 0}/20 chars)`);
      suggestions.push("Add at least one education entry");
    } else {
      score += 20;
    }

    if (!langchainInput.skills || langchainInput.skills.length < 50) {
      missing.push(`Skills (${langchainInput.skills?.length || 0}/50 chars)`);
      suggestions.push("List at least 5-10 skills");
    } else {
      score += 20;
    }

    if (!langchainInput.languages || langchainInput.languages.length < 10) {
      suggestions.push("Add language skills (recommended for Professional CV)");
    } else {
      score += 5;
    }

    if (langchainInput.workingStyle && langchainInput.uniqueStrength) {
      score += 10;
    } else {
      suggestions.push("Complete personality questions for better differentiation (optional)");
    }
  }

  const isValid = missing.length === 0;
  const finalScore = Math.min(score, 100);

  return {
    isValid,
    missingCritical: missing,
    suggestions: suggestions,
    score: finalScore,
  };
}

export function calculatePersonalityCompleteness(
  input: LangChainCVInput
): {
  completeness: number;
  filledFields: number;
  totalFields: number;
  missingFields: string[];
} {
  const personalityFields = [
    { name: "workingStyle", value: input.workingStyle, min: 50 },
    { name: "problemSolving", value: input.problemSolving, min: 80 },
    { name: "energySources", value: input.energySources, min: 40 },
    { name: "uniqueStrength", value: input.uniqueStrength, min: 60 },
    { name: "learningStyle", value: input.learningStyle, min: 40 },
    { name: "teamRole", value: input.teamRole, min: 40 },
    { name: "valuesExample", value: input.valuesExample, min: 50 },
    { name: "superpower", value: input.superpower, min: 10 },
  ];

  const filledFields = personalityFields.filter(
    field => field.value && field.value.length >= field.min
  ).length;

  const missingFields = personalityFields
    .filter(field => !field.value || field.value.length < field.min)
    .map(field => field.name);

  return {
    completeness: (filledFields / personalityFields.length) * 100,
    filledFields,
    totalFields: personalityFields.length,
    missingFields,
  };
}