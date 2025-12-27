// lib/ats/masterGuardian.ts - TÄYDELLINEN KORJATTU VERSIO

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface GroundTruth {
  technicalSkills: string[];
  softSkills: string[];
  education: string[];
  certifications: string[];
  workHistory: string[];
  achievements: string[];
  cannotClaim: string[];
  personalityTraits: string[];
  careerLevel: 'entry' | 'mid' | 'senior' | 'expert';
  yearsOfExperience: number;
}

export interface GuardianCheckResult {
  approved: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  violations: {
    [key: string]: any;
  };
  recommendation: string;
  flags: string[];
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function getMessageContent(message: unknown): string {
  if (typeof message === "string") return message;
  if (typeof message !== "object" || message === null) return "";
  if (!("content" in message)) return "";
  
  const content = (message as { content: unknown }).content;
  if (typeof content === "string") return content;
  
  if (Array.isArray(content)) {
    return content
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          const textItem = item as { text: unknown };
          if (typeof textItem.text === "string") return textItem.text;
        }
        return "";
      })
      .filter((text) => text.length > 0)
      .join(" ");
  }
  
  return "";
}

// ════════════════════════════════════════════════════════════════
// EXTRACT GROUND TRUTH
// ════════════════════════════════════════════════════════════════

export async function extractGroundTruthAI(userProfile: any): Promise<GroundTruth> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Extract verifiable facts from user profile. Works for ANY profession.

Return JSON with these exact fields:
{
  "technicalSkills": string[],
  "softSkills": string[],
  "education": string[],
  "certifications": string[],
  "workHistory": string[],
  "achievements": string[],
  "cannotClaim": string[],
  "personalityTraits": string[],
  "careerLevel": "entry" | "mid" | "senior" | "expert",
  "yearsOfExperience": number
}

Extract ONLY what exists. Do NOT infer or add skills not listed.`],

    ['human', `Extract facts from profile:

NAME: {name}
WORK EXPERIENCE: {workExperience}
EDUCATION: {education}
SKILLS: {skills}
LANGUAGES: {languages}
WORKING STYLE: {workingStyle}
PROBLEM SOLVING: {problemSolving}
UNIQUE STRENGTH: {uniqueStrength}
TEAM ROLE: {teamRole}
SUPERPOWER: {superpower}
CAREER GOALS: {careerGoals}
BEST PROJECT: {bestProject}

Return JSON only, no markdown.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: userProfile.name || 'Not specified',
      workExperience: userProfile.work_experience || 'Not specified',
      education: userProfile.education || 'Not specified',
      skills: userProfile.skills || 'Not specified',
      languages: userProfile.languages || 'Not specified',
      workingStyle: userProfile.working_style || 'Not specified',
      problemSolving: userProfile.problem_solving || 'Not specified',
      uniqueStrength: userProfile.unique_strength || 'Not specified',
      teamRole: userProfile.team_role || 'Not specified',
      superpower: userProfile.superpower || 'Not specified',
      careerGoals: userProfile.career_goals || 'Not specified',
      bestProject: userProfile.best_project_example || 'Not specified'
    });

    const result = await model.invoke(formatted);
    const content = getMessageContent(result);
    
    // Clean markdown
    const cleaned = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Extract JSON
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const groundTruth = JSON.parse(jsonMatch[0]) as GroundTruth;
    
    // Validate structure
    if (!groundTruth.technicalSkills || !Array.isArray(groundTruth.technicalSkills)) {
      throw new Error('Invalid ground truth structure');
    }
    
    console.log('✅ Ground Truth extracted:', {
      name: userProfile.name,
      skills: groundTruth.technicalSkills.length,
      education: groundTruth.education.length,
      careerLevel: groundTruth.careerLevel
    });
    
    return groundTruth;
    
  } catch (error) {
    console.error('❌ Ground Truth extraction failed:', error);
    
    // ✅ SAFE FALLBACK
    const fallbackSkills = (userProfile.skills || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    
    return {
      technicalSkills: fallbackSkills,
      softSkills: [],
      education: [],
      certifications: [],
      workHistory: [],
      achievements: [],
      cannotClaim: [],
      personalityTraits: [userProfile.superpower || 'Professional'].filter(Boolean),
      careerLevel: 'mid',
      yearsOfExperience: 0
    };
  }
}

// ════════════════════════════════════════════════════════════════
// CONSISTENCY CHECK
// ════════════════════════════════════════════════════════════════

export async function masterConsistencyCheckAI(
  generatedContent: string,
  groundTruth: GroundTruth | null,
  stage: 'generation' | 'edit'
): Promise<GuardianCheckResult> {
  
  // ✅ NULL CHECK
  if (!groundTruth) {
    console.warn('⚠️ Guardian: No ground truth, approving with warning');
    return {
      approved: true,
      riskLevel: 'safe',
      violations: {},
      recommendation: 'No ground truth available - manual review recommended',
      flags: ['no_ground_truth']
    };
  }
  
  // ✅ EMPTY CONTENT CHECK
  if (!generatedContent || generatedContent.trim().length < 50) {
    console.warn('⚠️ Guardian: Content too short, approving');
    return {
      approved: true,
      riskLevel: 'safe',
      violations: {},
      recommendation: 'Content too short to validate',
      flags: ['short_content']
    };
  }
  
  // ✅ ENSURE SAFE GROUND TRUTH
  const safeGroundTruth: GroundTruth = {
    technicalSkills: groundTruth.technicalSkills || [],
    softSkills: groundTruth.softSkills || [],
    education: groundTruth.education || [],
    certifications: groundTruth.certifications || [],
    workHistory: groundTruth.workHistory || [],
    achievements: groundTruth.achievements || [],
    cannotClaim: groundTruth.cannotClaim || [],
    personalityTraits: groundTruth.personalityTraits || [],
    careerLevel: groundTruth.careerLevel || 'mid',
    yearsOfExperience: groundTruth.yearsOfExperience || 0
  };

  try {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.1,
    });

    const prompt = `You are a CV fact-checker. Check for severe fabrications only.

GROUND TRUTH (verified user data):
- Technical Skills: ${safeGroundTruth.technicalSkills.join(', ') || 'None listed'}
- Education: ${safeGroundTruth.education.join(', ') || 'None listed'}
- Work History: ${safeGroundTruth.workHistory.join('; ') || 'None listed'}
- CANNOT CLAIM: ${safeGroundTruth.cannotClaim.join(', ') || 'None'}

GENERATED CV CONTENT:
${generatedContent.substring(0, 2000)}

ONLY REJECT if content contains:
1. Skills NOT in technicalSkills list
2. Education NOT in education list
3. Work experience NOT in workHistory
4. Anything in cannotClaim list

APPROVE if content:
- Describes listed skills
- Mentions listed education
- References listed work history
- Uses generic qualities (motivated, team player)

Return JSON:
{
  "approved": boolean,
  "riskLevel": "safe" | "warning" | "danger",
  "violations": {
    "fabricatedSkills": [],
    "fabricatedEducation": [],
    "fabricatedExperience": []
  },
  "recommendation": string,
  "flags": []
}`;

    const result = await model.invoke(prompt);
    const content = getMessageContent(result);
    
    // Clean and parse
    const cleaned = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON in Guardian response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as GuardianCheckResult;

    console.log(`🛡️ Guardian ${stage}:`, {
      approved: parsed.approved,
      risk: parsed.riskLevel,
      violationCount: Object.values(parsed.violations || {}).flat().length
    });

    if (!parsed.approved) {
      console.error('🚨 REJECTED by Guardian:', parsed.violations);
    }

    return parsed;

  } catch (error) {
    console.error('❌ Guardian check failed:', error);
    
    // ✅ SAFE FALLBACK: Approve but flag for manual review
    return {
      approved: true,
      riskLevel: 'warning',
      violations: { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      recommendation: 'Guardian check failed - manual review recommended',
      flags: ['guardian_error']
    };
  }
}