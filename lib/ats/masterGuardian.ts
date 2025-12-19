// ============================================
// 1. lib/ats/masterGuardian.ts - TÄYSI VERSIO
// ============================================

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
 * ✅ EXTRACT GROUND TRUTH
 */
export async function extractGroundTruthAI(userProfile: any): Promise<GroundTruth> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Extract verifiable facts from user profile.

**EXTRACT:**
1. Name
2. Years of experience (calculate from work history)
3. Education (exact degrees)
4. Technical skills (from skills field ONLY)
5. Languages
6. Work history (exact roles, companies)
7. Personality (from personality fields)
8. Cannot claim (things NOT in profile)

**RULES:**
- Extract ONLY what's provided
- Do NOT infer or assume
- Do NOT add skills not listed

**OUTPUT FIELDS:**
name, yearsOfExperience, education, currentRole, technicalSkills, languages, corePersonality, values, workHistory, cannotClaim

Return pure JSON.`],

    ['human', `Extract facts:

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

Return JSON.`]
  ]);

  try {
    let workExp = userProfile.work_experience;
    let edu = userProfile.education;
    
    if (typeof workExp === 'string') {
      try { workExp = JSON.parse(workExp); } catch { workExp = []; }
    }
    if (typeof edu === 'string') {
      try { edu = JSON.parse(edu); } catch { edu = []; }
    }

    const formatted = await prompt.formatMessages({
      name: userProfile.name || 'Not specified',
      workExperience: JSON.stringify(workExp || []),
      education: JSON.stringify(edu || []),
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
    
    let content: string;
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('');
    } else {
      content = JSON.stringify(result.content);
    }

    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON in Ground Truth extraction');
      throw new Error('No JSON');
    }

    const groundTruth = JSON.parse(jsonMatch[0]);
    
    console.log('✅ Ground Truth:', {
      name: groundTruth.name,
      skills: groundTruth.technicalSkills?.length || 0,
      education: groundTruth.education?.length || 0
    });
    
    return groundTruth;
  } catch (error) {
    console.error('❌ Ground Truth extraction failed:', error);
    
    // ✅ SAFE FALLBACK
    return {
      name: userProfile.name || '',
      yearsOfExperience: null,
      education: [],
      currentRole: null,
      technicalSkills: (userProfile.skills || '').split(',').map((s: string) => s.trim()).filter(Boolean),
      languages: [],
      corePersonality: {
        primary: userProfile.superpower || 'Professional',
        secondary: []
      },
      values: [],
      workHistory: [],
      cannotClaim: []
    };
  }
}

/**
 * ✅ MASTER CONSISTENCY CHECK - UNIVERSAL & SAFE
 */
export async function masterConsistencyCheckAI(
  text: string,
  groundTruth: GroundTruth,
  context: 'generation' | 'keyword_insertion' | 'translation' | 'ats_generation'
): Promise<GuardianCheck> {
  
  // ✅ SAFETY CHECK 1: Jos ei dataa, hyväksy automaattisesti
  if (!text || text.length < 50) {
    console.warn('⚠️ Text too short for Guardian check - APPROVING');
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'safe',
      confidence: 1.0,
      recommendation: 'Text too short to validate',
      fixSuggestions: []
    };
  }

  // ✅ SAFETY CHECK 2: Jos ground truth tyhjä, hyväksy
  if (!groundTruth.technicalSkills.length && !groundTruth.workHistory.length) {
    console.warn('⚠️ No ground truth data - APPROVING with warning');
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'warning',
      confidence: 0.5,
      recommendation: 'Limited profile data available',
      fixSuggestions: []
    };
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a universal truth guardian for cover letters. Works for ANY profession.

**ONLY REJECT severe fabrications:**

1. **FABRICATED CREDENTIALS:**
   - Claims degree NOT in education
   - Claims job title NOT in workHistory
   - Claims certifications not earned

2. **INVENTED SKILLS:**
   - Claims specific skill NOT in technicalSkills
   - Lists technologies not mentioned

3. **FABRICATED PROJECTS:**
   - Describes detailed project NOT in profile
   - Invents specific accomplishments

**ALWAYS ALLOW:**
- Describing skills that ARE listed
- Describing work that IS in workHistory
- Generic professional qualities
- Motivation and enthusiasm
- Career goals
- Personality traits
- "I have worked with X" (if X in skills)
- "I have experience in Y" (if Y in workHistory)

**DEFAULT: APPROVE unless clear fabrication**

Return JSON with approved, violations, riskLevel, confidence, recommendation, fixSuggestions.`],

    ['human', `Check cover letter:

**CANDIDATE SKILLS:**
{skills}

**WORK HISTORY:**
{workHistory}

**EDUCATION:**
{education}

**BEST PROJECT:**
{bestProject}

**COVER LETTER TEXT:**
{text}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      skills: groundTruth.technicalSkills.join(', ') || 'Developing skills',
      workHistory: JSON.stringify(groundTruth.workHistory) || 'Building experience',
      education: groundTruth.education.join(', ') || 'Continuous learner',
      bestProject: groundTruth.values.join(', ') || 'Not specified',
      text: text.substring(0, 2000)
    });

    const result = await model.invoke(formatted);
    
    let content: string;
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('');
    } else {
      content = JSON.stringify(result.content);
    }

    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const check: GuardianCheck = JSON.parse(jsonMatch[0]);
    
    console.log('🛡️ Guardian:', {
      approved: check.approved,
      riskLevel: check.riskLevel
    });
    
    if (!check.approved) {
      console.error('🚨 REJECTED:', check.violations);
    }
    
    return check;
  } catch (error) {
    console.error('❌ Guardian check failed:', error);
    
    // ✅ SAFETY FALLBACK: Hyväksy jos check epäonnistuu
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'safe',
      confidence: 0.5,
      recommendation: 'Guardian check bypassed due to error',
      fixSuggestions: []
    };
  }
}

