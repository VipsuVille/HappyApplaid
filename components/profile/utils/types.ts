// app/profile/utils/types.ts

export type Education = { 
    id: string; 
    institution: string; 
    degree: string; 
    startDate: string; 
    endDate: string; 
    grades?: string; 
    specialization?: string; 
    thesis?: string 
  };
  
  export type WorkExperience = { 
    id: string; 
    employer: string; 
    title: string; 
    startDate: string; 
    endDate: string; 
    description: string; 
    achievements?: string 
  };
  
  export type Certificate = { 
    id: string; 
    name: string; 
    issuer: string; 
    validUntil: string; 
    description?: string 
  };
  
  export type Language = { 
    id: string; 
    language: string; 
    level: string; 
    speaking: string; 
    writing: string 
  };
  
  export type Portfolio = { 
    id: string; 
    title: string; 
    url: string; 
    description?: string 
  };
  
  export type Reference = { 
    id: string; 
    name: string; 
    title: string; 
    company: string; 
    contact: string; 
    relationship: string 
  };
  
  export type ProfileData = {
    name: string; 
    email: string; 
    phone: string; 
    location: string; 
    profileImage?: string;
    jobTitle: string; 
    profileSummary: string; 
    availability: string; 
    driversLicense: string; 
    remoteWork: string;
    education: Education[]; 
    workExperience: WorkExperience[]; 
    certificates: Certificate[]; 
    languages: Language[];
    skills: string; 
    technicalSkills: string; 
    softSkills: string; 
    hobbies: string; 
    personalityTraits: string;
    professionalStrengths: string; 
    personalValues: string; 
    motivators: string; 
    workEnvironment: string;
    portfolioLinks: Portfolio[]; 
    achievements: string; 
    awards: string; 
    age: string;
    linkedIn: string; 
    website: string; 
    references: Reference[]; 
    language: string;
  };
  
  export type RequiredFields = {
    name: string;
    email: string;
    phone: string;
    location: string;
    jobTitle: string;
    profileSummary: string;
    languages: Language[];
  };
  
  export type WizardStep = {
    id: string;
    title: string;
  };
  
  export interface TooltipHelpProps {
    id: string;
    text: string;
  }
  
  export interface FormNavButtonsProps {
    saveOnNext?: boolean;
    currentStep: string;
    onPrev: () => void;
    onNext: () => void;
    onSubmit: () => void;
    saving?: boolean;
  }
  