// types/coverLetter.ts - COVER LETTER GENERAATTOREIDEN TYYPIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Importit olemassa olevista types-tiedostoista
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ✅ Käytä olemassa olevia tyyppejä
export type { CoverLetterData } from './ats';
export type { 
  PersonalityData, 
  PersonalityExtractionInput 
} from '../lib/types/langchain.types';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// COVER LETTER GENERATOR INPUT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * V1 Generator Input (Ei-ATS, kevyt versio)
 * Käytetään: lib/langchain/coverLetterGenerator.ts
 * API: /api/generate-cover-letter
 */
export interface CoverLetterInput {
  // Pakolliset
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  
  // Vapaaehtoiset profiilit
  location?: string;
  jobTitle?: string;
  education?: string;
  workExperience?: string;
  skills?: string;
  personalNotes?: string;
  
  // Asetukset
  language?: string;
  style?: 'formal' | 'casual';
  
  // Persoonallisuus (sama kuin PersonalityData)
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  
  // Lisäkonteksti
  hobbies?: string;
  personalityTraits?: string;
  motivations?: string;
  
  // ✅ Master Guardian varten
  groundTruthWarning?: string;
}

/**
 * V2 Generator Input (ATS-optimoitu, täysi versio)
 * Käytetään: lib/langchain/coverLetterGeneratorV2.ts
 * API: /api/generate-cover-letter-v2
 */
export interface ATSCoverLetterInput extends CoverLetterInput {
  atsOptimization?: boolean;
  targetKeywords?: string[];
  compensationStrategy?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GENERATOR OUTPUT TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface AIQuestion {
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface DataQuality {
  quality: 'rich' | 'moderate' | 'minimal';
  score: number;
  reasoning: string;
  personalityCompleteness: number;
  suggestions: string[];
}

/**
 * V1 Generator Output
 */
export interface CoverLetterOutput {
  content: string;
  title: string;
  signature: string;
  personality_hooks?: string[];
  job_match_score?: number;
  key_differentiators?: string[];
  questions?: AIQuestion[];
  data_quality?: DataQuality;
}

/**
 * V2 Generator Output (3-osainen ATS-optimoitu)
 */
export interface ATSCoverLetterOutput {
  introduction: {
    opening_hook: string;
    personality_summary: string;
    unique_value: string;
  };
  expertise: {
    relevant_experience: string;
    skills_match: string;
    achievements: string;
    gap_compensation?: string;
  };
  motivation: {
    why_this_job: string;
    career_goals: string;
    call_to_action: string;
  };
  ats_data: {
    matched_keywords: string[];
    missing_experience: boolean;
    compensation_strategy?: string;
    readability_score: number;
  };
  jobAnalysis?: any;
  hasWorkExperience?: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API REQUEST/RESPONSE TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GenerateCoverLetterRequest {
  userId: string;
  jobDescription: string;
  personalNotes?: string;
  profileData?: any; // From types/index.ts ProfileData
  language?: string;
  style?: 'formal' | 'casual';
}

export interface GenerateCoverLetterResponse {
  success: boolean;
  coverLetterId?: string;
  title?: string;
  questions?: AIQuestion[];
  personality_insights?: {
    job_match_score: number;
    personality_hooks: string[];
    key_differentiators: string[];
  };
  guardianCheck?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    hasWarnings: boolean;
  };
  ats_report?: any; // From types/ats.ts
  error?: string;
  message?: string;
  violations?: any;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILITY TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type CoverLetterLanguage = 'finnish' | 'english' | 'swedish' | string;
export type CoverLetterStyle = 'formal' | 'casual' | 'confident' | 'story';

// Backward compatibility
export type { PersonalityInput } from '../lib/types/langchain.types';