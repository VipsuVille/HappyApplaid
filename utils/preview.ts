import type { BaseCV, PreviewData, UserFormData } from '@/types';

export const createPreviewData = (data: PreviewData): PreviewData => {
  return {
    name: data.name,
    email: data.email,
    phone: data.phone,
    education: data.education,
    workExperience: data.workExperience,
    skills: data.skills,
    languages: data.languages
  };
};

export const initialFormData: UserFormData = {
  name: '',
  email: '',
  phone: '',
  location: '',
  education: '',
  workExperience: '',
  skills: '',
  hobbies: '',
  languages: '',
  personalityTraits: '',
  age: '',
  linkedIn: '',
  language: 'Suomi',
  userId: '',
  cvId: '',
  cvType: 'simple'
};