// app/profile/utils/validation.ts
import { ProfileData, RequiredFields } from './types';

export const validateRequiredFields = (data: ProfileData): boolean => {
  const required: (keyof RequiredFields)[] = [
    'name', 'email', 'phone', 'location', 'jobTitle', 
    'profileSummary', 'languages'
  ];

  return required.every(field => {
    const value = data[field];
    
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    
    return !!value && String(value).trim() !== '';
  });
};

export const getMissingFields = (data: ProfileData): string[] => {
  const missing: string[] = [];
  const required: (keyof RequiredFields)[] = [
    'name', 'email', 'phone', 'location', 'jobTitle', 
    'profileSummary', 'languages'
  ];

  required.forEach(field => {
    const value = data[field];
    
    if (Array.isArray(value)) {
      if (value.length === 0) missing.push(field);
    } else if (!value || String(value).trim() === '') {
      missing.push(field);
    }
  });

  return missing;
};

export const calculateCompletion = (data: Partial<ProfileData>): number => {
  const requiredFields = ['name', 'email', 'phone', 'location', 'jobTitle', 'profileSummary', 'education', 'workExperience', 'skills', 'languages'];
  const filledFields = requiredFields.filter(field => {
    const value = data[field as keyof ProfileData];
    return Array.isArray(value) ? (value || []).length > 0 : value && String(value).trim() !== '';
  }).length;
  
  return Math.round((filledFields / requiredFields.length) * 100);
};
