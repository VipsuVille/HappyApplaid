// types/index.ts - TÄYDELLINEN VERSIO

export enum StatusText {
  UPLOADING = "Valmistellaan tietoja...",
  UPLOADED = "Tiedot vastaanotettu",
  SAVING = "Tallennetaan tietoja...",
  GENERATING = "Generoidaan CV:tä...",
  GENERATING_LETTER = "Generoidaan hakukirjettä...",
  SAVING_LETTER = "Tallennetaan hakukirjettä...",
}

export type Status = StatusText;

export interface LoadingStatesProps {
  progress: number | null;
  stage: StatusText | null;
}

// Simplified profile data interfaces
export interface EducationItem {
  id: number;
  school: string;
  degree: string;
  year: string;
  isOngoing: boolean;
}

export interface WorkExperienceItem {
  id: number;
  company: string;
  position: string;
  duration: string;
  description: string;
  value: string;
  achievements: string;
}

export interface LanguageItem {
  id: number;
  language: string;
  level: string;
}

// ProfileData interface - TÄYDELLINEN
export interface ProfileData {
  // Perustiedot
  name: string;
  email: string;
  phone: string;
  location: string;
  jobTitle: string;
  profileImage?: string;

  // Koulutus ja kokemus
  education: EducationItem[];
  workExperience: WorkExperienceItem[];

  // Story-pohjaiset kentät (universaalit)
  careerGoals: string;
  bestProjectExample: string;
  failureLesson: string;

  // Persoonallisuuskysymykset (universaalit)
  workingStyle: string;
  problemSolving: string;
  energySources: string;
  uniqueStrength: string;
  learningStyle: string;
  teamRole: string;
  valuesExample: string;
  superpower: string;

  // Taidot ja kielet
  languages: LanguageItem[];
  skills: string;
}

// Apufunktio: muuntaa ProfileData -> API-muotoon
export const convertProfileToApiFormat = (profileData: ProfileData) => {
  return {
    name: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    jobTitle: profileData.jobTitle,

    education: formatEducationForApi(profileData.education),
    workExperience: formatWorkExperienceForApi(profileData.workExperience),
    languages: formatLanguagesForApi(profileData.languages),
    skills: profileData.skills,

    workingStyle: profileData.workingStyle,
    problemSolving: profileData.problemSolving,
    energySources: profileData.energySources,
    uniqueStrength: profileData.uniqueStrength,
    learningStyle: profileData.learningStyle,
    teamRole: profileData.teamRole,
    valuesExample: profileData.valuesExample,
    superpower: profileData.superpower,

    careerGoals: profileData.careerGoals,
    bestProjectExample: profileData.bestProjectExample,
    failureLesson: profileData.failureLesson,

    personalityTraits: `${profileData.superpower}; ${profileData.workingStyle}`,
    hobbies: "",
    age: "",
  };
};

const formatEducationForApi = (education: EducationItem[]): string => {
  return education
    .filter((edu) => edu.school && edu.degree)
    .map((edu) => {
      const period = edu.isOngoing ? `${edu.year} - Kesken` : edu.year;
      return `${edu.degree}, ${edu.school}${period ? ` (${period})` : ""}`;
    })
    .join("\n");
};

const formatWorkExperienceForApi = (
  workExperience: WorkExperienceItem[]
): string => {
  return workExperience
    .filter((work) => work.company || work.position)
    .map((work) => {
      let formatted = "";
      if (work.position && work.company) {
        formatted = `${work.position}, ${work.company}`;
      } else if (work.position) {
        formatted = work.position;
      } else if (work.company) {
        formatted = work.company;
      }

      if (work.duration) {
        formatted += ` (${work.duration})`;
      }

      if (work.description) {
        formatted += `\n${work.description}`;
      }

      return formatted;
    })
    .join("\n\n");
};

const formatLanguagesForApi = (languages: LanguageItem[]): string => {
  return languages
    .filter((lang) => lang.language)
    .map((lang) => `${lang.language}: ${lang.level}`)
    .join(", ");
};

export type ArrayFieldName = "education" | "workExperience" | "languages";
export type ArrayItemType = EducationItem | WorkExperienceItem | LanguageItem;
export type ProfileFieldName = keyof ProfileData;

export interface DefaultItems {
  education: Omit<EducationItem, "id">;
  workExperience: Omit<WorkExperienceItem, "id">;
  languages: Omit<LanguageItem, "id">;
}

export type HandleInputChangeType = (
  field: ProfileFieldName,
  value: string
) => void;

export type HandleArrayItemChangeType = (
  arrayName: ArrayFieldName,
  id: number,
  field: string,
  value: string | boolean
) => void;

export type AddArrayItemType = (
  arrayName: ArrayFieldName,
  defaultItem: any
) => void;

export type RemoveArrayItemType = (
  arrayName: ArrayFieldName,
  id: number
) => void;

export interface Position {
  x: number;
  y: number;
}

export interface ProfilePosition {
  top: number;
  right: number;
  width: number;
  height: number;
}

export interface ImagePosition {
  x: number;
  y: number;
}

export interface BlueBarItem {
  id: "phone" | "email" | "age";
  content: string;
  icon: string | JSX.Element;
  position: number;
}

export interface CoverLetter {
  id?: string;
  user_id: string;
  title: string;
  content: {
    body: string;
    signature?: string;
    contact?: {
      name: string;
      email: string;
      phone: string;
      address?: string;
    };
  };
  ai_data: {
    generation_details: {
      model: string;
      temperature: number;
      timestamp: string;
    };
    html?: {
      content: string;
    };
    personality_used?: {
      workingStyle: string;
      uniqueStrength: string;
      energySources: string;
      teamRole: string;
    };
  };
  is_mock: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GeneratedCoverLetter {
  title: string;
  content: string;
  signature?: string;
}

export interface CoverLetterResponse {
  id: string;
  title: string;
  content: {
    body: string;
    signature: string;
  };
  created_at: string;
}

export interface UserFormData {
  [key: string]: string | boolean | undefined;

  name: string;
  email: string;
  phone: string;
  age?: string;
  location: string;
  linkedIn?: string;
  language: string;

  title?: string;
  introText?: string;
  profileImage?: string;
  backgroundImage?: string;

  education: string;
  workExperience: string;
  skills: string;
  languages: string;
  hobbies?: string;

  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;

  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  personalityTraits?: string;

  cvType?: "technical" | "creative" | "simple";
  userId: string;
  cvId: string;

  bgHeight?: string;
  blueBarHeight?: string;
  profilePosition?: string;
  namePosition?: string;
  titlePosition?: string;
  introTextPosition?: string;
  signaturePosition?: string;
  imagePosition?: string;
  infoBarItemsPosition?: string;
  signature?: string;

  nameFontSize?: string;
  titleFontSize?: string;
  introFontSize?: string;
  signatureFontSize?: string;
  
  jobPosting?: string;
  isAtsOptimized?: boolean;
  userTier?: "free" | "premium";
}

export interface AIData {
  html: {
    skills_section: string;
    experience_section: string;
    education_section: string;
    languages_section: string;
  };
  styles?: string;
  images?: {
    background_prompt: string;
    visual_elements: string[];
  };
  background_image?: string;
  background_image_url?: string | null;
  profile?: string;
  profile_image?: string;
  profile_initials?: string;
  personal_description?: string;
  fullTextContent?: string;
  cvType?: "technical" | "creative" | "simple";
}

export interface CVContent {
  cv_data: UserFormData;
  ai_data: AIData & {
    urls_expire_at?: string;
  };
}

export interface BaseCV {
  id: string;
  user_id: string;
  title: string;
  content: CVContent;
  is_public: boolean;
  is_mock: boolean;
  created_at: string;
  is_ats_optimized?: boolean;
  job_posting?: string;
}

export type ProfileToUserFormDataConverter = (
  profileData: ProfileData
) => Partial<UserFormData>;

export type ProfileStep = "basic" | "experience" | "personality" | "skills";

export interface ProfileStepData {
  id: ProfileStep;
  title: string;
  icon: any;
  description: string;
}

export interface PreviewData {
  name: string;
  email: string;
  phone: string;
  education: string;
  workExperience: string;
  skills: string;
  languages: string;
}

export interface SectionProps {
  title: string;
  content: string;
  isEditing?: boolean;
  onChange?: (content: string) => void;
}

export type EditMode = "content" | "images" | "layout";

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  tokens?: number;
  is_active: boolean;
  plan_type: string;
}

export interface DefaultImages {
  profileImages: string[];
  backgroundImages: string[];
}

export interface DefaultImage {
  id: string;
  name: string;
  file_path: string;
  image_type: "profile" | "background";
  signedUrl?: string;
}

export type ImageField = "profileImage" | "backgroundImage";

export interface CVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  // Käytetään 'any' arvolle jotta se tukee string/boolean/undefined tyyppejä UserFormData:ssa
  onContentChange?: (field: keyof UserFormData, value: any) => void; 
}

export const profileToUserFormData = (
  profileData: ProfileData
): Partial<UserFormData> => {
  const apiFormat = convertProfileToApiFormat(profileData);

  return {
    name: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    education: apiFormat.education,
    workExperience: apiFormat.workExperience,
    skills: profileData.skills,
    languages: apiFormat.languages,

    workingStyle: profileData.workingStyle,
    problemSolving: profileData.problemSolving,
    energySources: profileData.energySources,
    uniqueStrength: profileData.uniqueStrength,
    learningStyle: profileData.learningStyle,
    teamRole: profileData.teamRole,
    valuesExample: profileData.valuesExample,
    superpower: profileData.superpower,
    
    careerGoals: profileData.careerGoals,
    bestProjectExample: profileData.bestProjectExample,
    failureLesson: profileData.failureLesson,
    
    personalityTraits: apiFormat.personalityTraits,

    title: profileData.jobTitle,
    language: "finnish",
  };
};