// ════════════════════════════════════════════════════════════════
// TIEDOSTO 1: lib/ats/masterGuardian.ts
// KOPIOI TÄMÄ KOKONAAN → lib/ats/masterGuardian.ts
// ════════════════════════════════════════════════════════════════

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

export async function extractGroundTruthAI(userProfile: any): Promise<GroundTruth> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Extract verifiable facts from user profile. Works for ANY profession.

**EXTRACT ONLY:**
1. Name
2. Years of experience (from work history)
3. Education (exact degrees)
4. Technical/professional skills (from skills field)
5. Languages
6. Work history (roles, companies)
7. Personality traits (from profile)
8. Cannot claim (NOT in profile)

**RULES:**
- Extract ONLY what exists
- Do NOT infer
- Do NOT add skills not listed

Return pure JSON with fields: name, yearsOfExperience, education, currentRole, technicalSkills, languages, corePersonality, values, workHistory, cannotClaim`],

    ['human', `Extract facts:

NAME: {name}
WORK: {workExperience}
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
      console.error('❌ No JSON in Ground Truth');
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
    console.error('❌ Ground Truth failed:', error);
    
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

export async function masterConsistencyCheckAI(
  text: string,
  groundTruth: GroundTruth,
  context: 'generation' | 'keyword_insertion' | 'translation' | 'ats_generation'
): Promise<GuardianCheck> {
  
  if (!text || text.length < 50) {
    console.warn('⚠️ Text too short - APPROVING');
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'safe',
      confidence: 1.0,
      recommendation: 'Text too short to validate',
      fixSuggestions: []
    };
  }

  if (!groundTruth.technicalSkills.length && !groundTruth.workHistory.length) {
    console.warn('⚠️ No ground truth - APPROVING with warning');
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'warning',
      confidence: 0.5,
      recommendation: 'Limited profile data',
      fixSuggestions: []
    };
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Universal truth guardian for cover letters. Works for ANY profession.

**ONLY REJECT severe fabrications:**

1. **FALSE CREDENTIALS:** Claims degree/certification NOT in profile
2. **INVENTED SKILLS:** Claims specific skill NOT in technicalSkills
3. **FABRICATED PROJECTS:** Describes detailed project NOT in profile
4. **FALSE JOB TITLES:** Claims title NOT in workHistory

**ALWAYS ALLOW:**
- Describing skills that ARE listed
- Describing work that IS in workHistory
- Generic qualities (team player, motivated)
- Enthusiasm and motivation
- Career goals
- "I have experience with X" (if X in skills)
- "I worked on Y" (if Y in workHistory)

**DEFAULT: APPROVE unless clear fabrication**

Return JSON: approved, violations, riskLevel, confidence, recommendation, fixSuggestions`],

    ['human', `Check cover letter for fabrications:

**CANDIDATE SKILLS:**
{skills}

**WORK HISTORY:**
{workHistory}

**EDUCATION:**
{education}

**BEST PROJECT:**
{bestProject}

**COVER LETTER:**
{text}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      skills: groundTruth.technicalSkills.join(', ') || 'Developing',
      workHistory: JSON.stringify(groundTruth.workHistory) || 'Building experience',
      education: groundTruth.education.join(', ') || 'Learner',
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
    console.error('❌ Guardian failed:', error);
    
    return {
      approved: true,
      violations: { factual: [], personality: [], skills: [], experience: [], education: [] },
      riskLevel: 'safe',
      confidence: 0.5,
      recommendation: 'Guardian bypassed due to error',
      fixSuggestions: []
    };
  }
}
