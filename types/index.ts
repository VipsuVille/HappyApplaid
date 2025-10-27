// types/index.ts

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
}

export interface LanguageItem {
  id: number;
  language: string;
  level: string;
}

// ProfileData interface - päivitetty vastaamaan profiilisivun kysymyksiä
export interface ProfileData {
  // Perustiedot
  name: string;
  email: string;
  phone: string;
  location: string;
  jobTitle: string; // "Tavoitteet työstä" profiilisivulla
  profileImage?: string;  // ← VARMISTA ETTÄ TÄMÄ ON OLEMASSA!

  // Koulutus ja kokemus (säilytetään array-muodossa)
  education: EducationItem[];
  workExperience: WorkExperienceItem[];

  // Syvällisemmät persoonallisuuskysymykset (muokattu ensimmäistä työpaikkaa hakeville)
  workingStyle: string; // "Miten kuvailisit omaa tapaasi työskennellä?"
  problemSolving: string; // "Anna esimerkki haastavasta tilanteesta ja miten ratkaisit sen (voi olla koulu, harrastus, vapaa-aika...)"
  energySources: string; // "Mistä työtehtävistä saat eniten energiaa?"
  uniqueStrength: string; // "Mikä on sellainen asia, jota ihmiset tulevat pyytämään juuri sinulta apua?"
  learningStyle: string; // "Miten opit parhaiten uusia asioita?"
  teamRole: string; // "Millainen rooli sinulla on yleensä ryhmässä?"
  valuesExample: string; // "Anna esimerkki tilanteesta, jossa toimit arvojesi mukaisesti (vapaaehtoinen)"
  superpower: string; // "Jos kuvailisit itseäsi kolmella sanalla työntekijänä, mitä ne olisivat?"

  // Taidot ja kielet
  languages: LanguageItem[];
  skills: string;
}

// Apufunktio: muuntaa ProfileData -> stringit API:tä varten
export const convertProfileToApiFormat = (profileData: ProfileData) => {
  return {
    // Perustiedot
    name: profileData.name,
    email: profileData.email,
    phone: profileData.phone,
    location: profileData.location,
    jobTitle: profileData.jobTitle,

    // Muunna arrayt stringeiksi
    education: formatEducationForApi(profileData.education),
    workExperience: formatWorkExperienceForApi(profileData.workExperience),
    languages: formatLanguagesForApi(profileData.languages),
    skills: profileData.skills,

    // Persoonallisuustiedot (nämä voidaan käyttää sekä CV:ssä että hakukirjeessä)
    workingStyle: profileData.workingStyle,
    problemSolving: profileData.problemSolving,
    energySources: profileData.energySources,
    uniqueStrength: profileData.uniqueStrength,
    learningStyle: profileData.learningStyle,
    teamRole: profileData.teamRole,
    valuesExample: profileData.valuesExample,
    superpower: profileData.superpower,

    // Vanhat kentät yhteensopivuuden vuoksi
    personalityTraits: `${profileData.superpower}; Työskentelyn tapa: ${profileData.workingStyle}`,
    hobbies: "", // Ei kerätä enää erikseen
    age: "", // Ei kerätä enää
  };
};

// Apufunktiot formatointiin
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

// Type for array field names (for type safety in your handlers)
export type ArrayFieldName = "education" | "workExperience" | "languages";

// Type for the different array item types
export type ArrayItemType = EducationItem | WorkExperienceItem | LanguageItem;

// Type for individual field names
export type ProfileFieldName = keyof ProfileData;

// Default items for adding new array items
export interface DefaultItems {
  education: Omit<EducationItem, "id">;
  workExperience: Omit<WorkExperienceItem, "id">;
  languages: Omit<LanguageItem, "id">;
}

// Handler function types
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

// Position types for layout editing (keeping existing ones)
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

// Cover letter interfaces (keeping existing)
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
    // Lisää persoonallisuustiedot AI-dataan
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

// Updated UserFormData to match the new simplified profile structure
export interface UserFormData {
  [key: string]: string | boolean | undefined; // ✅ Lisää boolean

  // Basic info
  name: string;
  email: string;
  phone: string;
  age?: string; // Optional now
  location: string;
  linkedIn?: string;
  language: string;

  // CV presentation fields
  title?: string;
  introText?: string;
  profileImage?: string;
  backgroundImage?: string;

  // Content fields (these will be generated from ProfileData)
  education: string;
  workExperience: string;
  skills: string;
  languages: string;
  hobbies?: string; // Optional now

  // CV generation fields (these come from ProfileData personality questions)
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  personalityTraits?: string; // Computed field

  cvType?: "technical" | "creative" | "simple";
  userId: string;
  cvId: string;

  // Layout fields
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

  // Font size fields
  nameFontSize?: string;
  titleFontSize?: string;
  introFontSize?: string;
  signatureFontSize?: string;
  jobPosting?: string;           // Työpaikkailmoitus (PREMIUM)
  isAtsOptimized?: boolean;      // Onko ATS-optimoitu
  userTier?: "free" | "premium"; // Käyttäjän taso
}

// AI generated data interface (keeping existing)
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
   is_ats_optimized?: boolean;    // Onko ATS-optimoitu
  job_posting?: string;          // Mihin työpaikkaan optimoitu
}

// Conversion function type for transforming ProfileData to UserFormData
export type ProfileToUserFormDataConverter = (
  profileData: ProfileData
) => Partial<UserFormData>;

// Step types for the profile form
export type ProfileStep = "basic" | "experience" | "personality" | "skills";

export interface ProfileStepData {
  id: ProfileStep;
  title: string;
  icon: any; // Lucide React icon component
  description: string;
}

// Remaining interfaces (keeping existing ones that are still relevant)
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
tokens?: number;               // Olemassa oleva
    is_active: boolean;  // ✅ LISÄÄ TÄMÄ
  plan_type: string;   // ✅ LISÄÄ TÄMÄ JOS PUUTTUU
  // ✅ LISÄÄ TÄMÄ:
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

// Utility function to convert ProfileData to UserFormData for CV generation
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

    // Personality traits for AI
    workingStyle: profileData.workingStyle,
    problemSolving: profileData.problemSolving,
    energySources: profileData.energySources,
    uniqueStrength: profileData.uniqueStrength,
    learningStyle: profileData.learningStyle,
    teamRole: profileData.teamRole,
    valuesExample: profileData.valuesExample,
    superpower: profileData.superpower,
    personalityTraits: apiFormat.personalityTraits,

    // Optional fields
    title: profileData.jobTitle,
    language: "finnish", // default
  };
};
