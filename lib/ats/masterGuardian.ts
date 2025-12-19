// lib/ats/masterGuardian.ts - TEMPLATE ESCAPING KORJATTU

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
 * ✅ POIMII GROUND TRUTH PROFIILISTA
 */
export async function extractGroundTruthAI(userProfile: any): Promise<GroundTruth> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  // ✅ KORJAUS: Ei JSON-esimerkkejä promptissa (aiheuttaa LangChain template virheen)
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a STRICT fact extractor. Your mission is CRITICAL for preventing AI hallucinations.

**MISSION:**
Extract ONLY verifiable facts from user profile. These are IMMUTABLE TRUTHS that cannot be fabricated.

**WHAT TO EXTRACT:**
1. Years of Experience (calculate from work_experience array)
2. Education (exact degrees, schools from education array)
3. Technical Skills (from skills field - nothing else!)
4. Languages (from languages array)
5. Work History (EXACT roles, companies, durations from work_experience)
6. Core Personality (from personality fields ONLY)
7. CANNOT CLAIM (skills/experience NOT in profile)

**CRITICAL RULES:**
- Extract ONLY from provided fields
- Do NOT infer or assume
- Do NOT add skills not explicitly listed
- Calculate years from work history dates
- Mark cannotClaim: things NOT in profile

**OUTPUT FIELDS REQUIRED:**
- name: string
- yearsOfExperience: number or null
- education: array of strings
- currentRole: string or null
- technicalSkills: array of strings (ONLY from skills field)
- languages: array of strings
- corePersonality: object with primary string and secondary array
- values: array of strings
- workHistory: array of objects with role, duration, responsibilities
- cannotClaim: array of strings (things NOT in profile)

Return pure JSON only. No markdown, no backticks.`],

    ['human', `Extract GROUND TRUTH from this profile:

**NAME:** {name}
**WORK EXPERIENCE:** {workExperience}
**EDUCATION:** {education}
**SKILLS:** {skills}
**LANGUAGES:** {languages}
**WORKING STYLE:** {workingStyle}
**PROBLEM SOLVING:** {problemSolving}
**UNIQUE STRENGTH:** {uniqueStrength}
**TEAM ROLE:** {teamRole}
**SUPERPOWER:** {superpower}
**CAREER GOALS:** {careerGoals}
**BEST PROJECT:** {bestProject}

Extract facts. Return pure JSON with all required fields.`]
  ]);

  try {
    // Parse work_experience and education if they're JSON strings
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

    // Poista markdown
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in Ground Truth extraction');
      throw new Error('No JSON');
    }

    const groundTruth = JSON.parse(jsonMatch[0]);
    
    console.log('✅ Ground Truth extracted:', {
      name: groundTruth.name,
      skills: groundTruth.technicalSkills?.length || 0,
      education: groundTruth.education?.length || 0,
      cannotClaim: groundTruth.cannotClaim?.length || 0
    });
    
    return groundTruth;
  } catch (error) {
    console.error('❌ AI extraction failed:', error);
    
    // Minimal fallback
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
 * ✅ MASTER CONSISTENCY CHECK
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

  // ✅ KORJAUS: Ei JSON-esimerkkejä promptissa
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are THE MASTER GUARDIAN preventing AI hallucinations.

**MISSION:**
Detect ANY deviation from verified facts. REJECT if ANY fabrication found.

**CRITICAL VIOLATIONS (MUST REJECT):**
1. Skills NOT in technicalSkills list
2. Experience NOT in workHistory
3. Education NOT in education list
4. Years changed
5. Job titles inflated
6. Projects NOT mentioned in profile
7. Technologies NOT in skills list

**RULES:**
- If text mentions skill NOT in ground truth → REJECT
- If text mentions project NOT in ground truth → REJECT
- If text claims experience NOT verifiable → REJECT
- Be STRICT - better safe than fabricated

**OUTPUT FIELDS REQUIRED:**
- approved: boolean
- violations: object with arrays for factual, skills, experience, education, personality
- riskLevel: string (safe, warning, or danger)
- confidence: number (0 to 1)
- recommendation: string in user's language
- fixSuggestions: array of strings with specific fixes

Return pure JSON only. No markdown, no backticks.`],

    ['human', `Check this text against GROUND TRUTH:

**GROUND TRUTH:**
Name: {name}
Years: {years}
Education: {education}
Skills: {skills}
Work History: {workHistory}
CANNOT CLAIM: {cannotClaim}

**TEXT TO CHECK:**
{text}

**CONTEXT:** {context}

STRICT check. Reject if ANY fabrication. Return pure JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: groundTruth.name,
      years: groundTruth.yearsOfExperience?.toString() || 'Not specified',
      education: groundTruth.education.join(', ') || 'None',
      skills: groundTruth.technicalSkills.join(', ') || 'None',
      workHistory: JSON.stringify(groundTruth.workHistory),
      cannotClaim: groundTruth.cannotClaim.join(', ') || 'None',
      text: text.substring(0, 2000), // Limit text length
      context
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

    // Poista markdown
    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const check: GuardianCheck = JSON.parse(jsonMatch[0]);
    
    if (!check.approved) {
      console.error('🚨 MASTER GUARDIAN REJECTED:', {
        violations: check.violations,
        riskLevel: check.riskLevel
      });
    } else {
      console.log('✅ Guardian approved:', check.riskLevel);
    }
    
    return check;
  } catch (error) {
    console.error('❌ Master check failed:', error);
    
    // Safe fallback - approve but warn
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
      fixSuggestions: ['Verify all claims manually']
    };
  }
}