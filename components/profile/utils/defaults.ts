// app/profile/utils/defaults.ts
import { Education, WorkExperience, Certificate, Language, Portfolio, Reference, ProfileData } from './types';

export const DEFAULT_EDUCATION: Education = { 
  id: crypto.randomUUID(), 
  institution: '', 
  degree: '', 
  startDate: '', 
  endDate: '' 
};

export const DEFAULT_WORK_EXPERIENCE: WorkExperience = { 
  id: crypto.randomUUID(), 
  employer: '', 
  title: '', 
  startDate: '', 
  endDate: '', 
  description: '' 
};

export const DEFAULT_CERTIFICATE: Certificate = { 
  id: crypto.randomUUID(), 
  name: '', 
  issuer: '', 
  validUntil: '' 
};

export const DEFAULT_LANGUAGE: Language = { 
  id: crypto.randomUUID(), 
  language: '', 
  level: 'Hyvä', 
  speaking: 'Hyvä', 
  writing: 'Hyvä' 
};

export const DEFAULT_PORTFOLIO: Portfolio = { 
  id: crypto.randomUUID(), 
  title: '', 
  url: '' 
};

export const DEFAULT_REFERENCE: Reference = { 
  id: crypto.randomUUID(), 
  name: '', 
  title: '', 
  company: '', 
  contact: '', 
  relationship: '' 
};

export const DEFAULT_PROFILE_DATA: ProfileData = {
  name: '', 
  email: '', 
  phone: '', 
  location: '', 
  jobTitle: '', 
  profileSummary: '', 
  availability: '', 
  driversLicense: '', 
  remoteWork: 'Ei', 
  education: [], 
  workExperience: [], 
  certificates: [], 
  languages: [], 
  skills: '', 
  technicalSkills: '', 
  softSkills: '', 
  hobbies: '', 
  personalityTraits: '', 
  professionalStrengths: '', 
  personalValues: '', 
  motivators: '', 
  workEnvironment: '', 
  portfolioLinks: [], 
  achievements: '', 
  awards: '', 
  age: '', 
  linkedIn: '', 
  website: '', 
  references: [], 
  language: 'Suomi',
  profileImage: ''
};
export const initialProfileData = DEFAULT_PROFILE_DATA;