import type { BaseCV, PreviewData, UserFormData } from '@/types';

export const createPreviewData = (data: BaseCV): PreviewData => {
  return {
    name: data.cv_data.name,
    email: data.cv_data.email,
    phone: data.cv_data.phone,
    education: data.cv_data.education,
    workExperience: data.cv_data.workExperience,
    skills: data.cv_data.skills,
    languages: data.cv_data.languages
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