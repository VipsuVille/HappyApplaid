// lib/ats/masterGuardian.ts - KORJATTU

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export interface GroundTruth {
  name: string;
  yearsOfExperience: number | null;
  education: string[];
  currentRole: string | null;
  technicalSkills: string[];
  languages: string[];
  corePersonality: {
    primary: string;
    secondary: string[];
  };
  values: string[];
  workHistory: Array<{
    role: string;
    duration: string;
    responsibilities: string[];
  }>;
  // ✅ LISÄTTY: Puuttuva kenttä
  cannotClaim: string[];
}

export interface GuardianCheck {
  approved: boolean;
  violations: {
    factual: string[];
    personality: string[];
    skills: string[];
    experience: string[];
    education: string[];
  };
  riskLevel: 'safe' | 'warning' | 'danger';
  confidence: number;
  recommendation: string;
  fixSuggestions: string[];
}

/**
 * ✅ POIMII GROUND TRUTH PROFIILISTA - 100% AI
 */
export async function extractGroundTruthAI(userProfile: any): Promise<GroundTruth> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  // KORJAUS: JSON-esimerkin aaltosulkeet on tuplattu {{ ja }}
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a professional profile analyzer.

**YOUR MISSION:**
Extract IMMUTABLE FACTS from user profile - things that CANNOT be fabricated.

**EXTRACT:**
1. Years of Experience (calculate from work history)
2. Education (degrees, certifications, schools)
3. Technical Skills (concrete skills user has)
4. Languages (spoken/written)
5. Core Personality (from user's own description)
6. Work History (roles, duration, responsibilities)
7. CANNOT CLAIM (skills/experience user DOES NOT have)

**OUTPUT:**
{{
  "name": "User Name",
  "yearsOfExperience": 3,
  "education": ["Bachelor in CS"],
  "currentRole": "Junior Developer",
  "technicalSkills": ["React", "Python"],
  "languages": ["Finnish", "English"],
  "corePersonality": {{
    "primary": "Analytical",
    "secondary": ["Team player"]
  }},
  "values": ["Learning"],
  "workHistory": [
    {{
      "role": "Warehouse Worker",
      "duration": "1 year",
      "responsibilities": ["Inventory"]
    }}
  ],
  "cannotClaim": ["Senior experience", "Management", "PhD"]
}}`],

    ['human', `**USER PROFILE:**
Name: {name}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Team Role: {teamRole}
Superpower: {superpower}

Extract GROUND TRUTH. Return JSON only.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: userProfile.name || 'Not specified',
      workExperience: JSON.stringify(userProfile.work_experience || []),
      education: JSON.stringify(userProfile.education || []),
      skills: userProfile.skills || 'Not specified',
      workingStyle: userProfile.working_style || 'Not specified',
      problemSolving: userProfile.problem_solving || 'Not specified',
      uniqueStrength: userProfile.unique_strength || 'Not specified',
      teamRole: userProfile.team_role || 'Not specified',
      superpower: userProfile.superpower || 'Not specified'
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('AI extraction failed:', error);
    
    // Minimal fallback
    return {
      name: userProfile.name || '',
      yearsOfExperience: null,
      education: [],
      currentRole: null,
      technicalSkills: [],
      languages: [],
      corePersonality: {
        primary: userProfile.superpower || 'Professional',
        secondary: []
      },
      values: [],
      workHistory: [],
      cannotClaim: [] // ✅ LISÄTTY
    };
  }
}

/**
 * ✅ MASTER CONSISTENCY CHECK - 100% AI
 */
export async function masterConsistencyCheckAI(
  text: string,
  groundTruth: GroundTruth,
  context: 'generation' | 'keyword_insertion' | 'translation' | 'ats_generation'
): Promise<GuardianCheck> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  // KORJAUS: JSON-esimerkin aaltosulkeet on tuplattu {{ ja }}
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are THE MASTER GUARDIAN.

**YOUR MISSION:**
Detect ANY deviation from IMMUTABLE FACTS.

**CRITICAL VIOLATIONS (REJECT):**
1. Changed years of experience
2. Invented degrees/certifications
3. Added skills user doesn't have
4. Inflated job titles
5. Changed work history

**OUTPUT:**
{{
  "approved": true/false,
  "violations": {{
    "factual": [],
    "personality": [],
    "skills": [],
    "experience": [],
    "education": []
  }},
  "riskLevel": "safe|warning|danger",
  "confidence": 0.95,
  "recommendation": "Brief in user's language",
  "fixSuggestions": []
}}`],

    ['human', `**GROUND TRUTH:**
Name: {name}
Years: {years}
Education: {education}
Skills: {skills}
Core Personality: {personality}

**TEXT TO CHECK:**
{text}

**CONTEXT:** {context}

Return JSON only.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: groundTruth.name,
      years: groundTruth.yearsOfExperience?.toString() || 'Not specified',
      education: groundTruth.education.join(', ') || 'Not specified',
      skills: groundTruth.technicalSkills.join(', ') || 'Not specified',
      personality: `${groundTruth.corePersonality.primary}`,
      text,
      context
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const check: GuardianCheck = JSON.parse(jsonMatch[0]);
    
    if (!check.approved) {
      console.error('🚨 MASTER GUARDIAN REJECTED:', check.violations);
    }
    
    return check;
  } catch (error) {
    console.error('Master check failed:', error);
    
    return {
      approved: true,
      violations: {
        factual: [],
        personality: [],
        skills: [],
        experience: [],
        education: []
      },
      riskLevel: 'warning',
      confidence: 0.5,
      recommendation: 'Guardian check failed - manual review recommended',
      fixSuggestions: []
    };
  }
}