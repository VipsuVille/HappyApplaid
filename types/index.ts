// types.ts
export enum StatusText {
  UPLOADING = "Valmistellaan tietoja...",
  UPLOADED = "Tiedot vastaanotettu",
  SAVING = "Tallennetaan tietoja...",
  GENERATING = "Generoidaan CV:tä..."
}

export type Status = StatusText;

export interface LoadingStatesProps {
  progress: number | null;
  stage: StatusText | null;
}
// Base user data interface
export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  education: string;
  workExperience: string;
  skills: string;
  languages: string;
  age: string;
  location: string;
  hobbies: string;
  linkedIn?: string;
  language: string;
}

// AI generated data interface
export interface AIData {
  html: {
    skills_section: string;
    experience_section: string;
    education_section: string;
    languages_section: string;
  };
  styles: {
    personal_description_style: string;
    skills_style: string;
    main_container_style: string;
    background_integration_style: string;
  };
  images: string[];
  background: string;
  profile: string;
}

// Database CV record interface
export interface BaseCV {
  id: string;
  user_id: string;
  cv_data: UserFormData;
  ai_data: AIData & {
    pdf_url: string;
    urls_expire_at?: string; // lisätään tämä
  };
  created_at: string;
  pdf_url: string;
}
// Preview data interface
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
}

export interface CVPreviewProps {
  previewData: PreviewData;
  isPaid: boolean;
  previewHtml?: React.ReactNode | null;
}

export interface CVTemplateProps {
  id?: string;
  created_at?: string;
  data: UserFormData;
  isPaid?: boolean;
  aiData?: AIData;
  userData?: UserFormData;
}

export interface SaveCVParams {
  userId: string;
  cvData: UserFormData;
  aiData: AIData;
  authToken: string;  // Add this
}
