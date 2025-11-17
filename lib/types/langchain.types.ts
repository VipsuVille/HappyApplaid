// lib/types/langchain.types.ts (TÄYDENNÄ TÄMÄ)
export interface PersonalityData {
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
}

export interface JobAnalysis {
  required_skills: string[];
  preferred_skills: string[];
  soft_skills: string[];
  company_values: string[];
  key_responsibilities: string[];
  experience_level: string;
  industry_keywords: string[];
}
// ✅ LISÄÄ BACKWARD COMPATIBILITY
export type PersonalityInput = PersonalityExtractionInput;
// ✅ LISÄÄ NÄMÄ:
export interface PersonalityExtractionInput {
  userProfile: string;
  workingStyleText: string;
  problemSolvingText: string;
  energySourcesText: string;
  strengthsText: string;
  learningText: string;
  teamworkText: string;
  valuesText: string;
  additionalInfo: string;
}