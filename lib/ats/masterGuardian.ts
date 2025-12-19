// lib/ats/masterGuardian.ts - BALANSOITU VERSIO

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
 * ✅ BALANSOITU GUARDIAN - Estää valehtelun, sallii normaalin kielen
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

  // ✅ BALANSOITU PROMPT: Estä valehtelun, salli normaali kieli
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a BALANCED guardian preventing fabrications while allowing natural language.

**CRITICAL: ONLY flag SEVERE violations:**

**ALWAYS REJECT (danger level):**
1. Made-up technical skills (e.g., claiming "Python expert" when not in profile)
2. Fabricated job titles (e.g., "Senior Developer" when only "Junior" in profile)
3. False educational credentials (claiming degrees not earned)
4. Invented years of experience (claiming 5+ years with only 1 year)
5. Completely fabricated projects or companies

**ALLOW (not violations):**
- Natural language descriptions of REAL skills
- Personality traits from profile expressed differently
- Soft skills inferred from work history (teamwork, communication)
- Enthusiasm and motivation (if genuine to personality)
- Standard cover letter phrases ("excited to apply", "would be great fit")
- Describing HOW real skills were used
- Career goals and aspirations from profile

**EXAMPLES OF WHAT TO ALLOW:**
- Profile has "React" → Text says "experienced with React" ✅
- Profile has "teamwork" value → Text mentions "collaborative mindset" ✅
- Profile shows work history → Text mentions "professional experience" ✅
- Profile mentions problem-solving → Text says "analytical approach" ✅

**EXAMPLES OF WHAT TO REJECT:**
- Profile has NO "Python" → Text claims "Python expertise" ❌
- Profile shows 1 year work → Text claims "5+ years experience" ❌
- Profile has NO degree → Text claims "Master's degree" ❌
- Profile lists "Junior Dev" → Text claims "Senior Architect" ❌

**OUTPUT FIELDS:**
- approved: boolean (false only if SEVERE fabrication)
- violations: object with specific arrays
- riskLevel: "safe" (no issues), "warning" (minor concern), "danger" (fabrication)
- confidence: 0.0 to 1.0
- recommendation: brief explanation
- fixSuggestions: specific fixes if rejected

**IMPORTANT:** Set riskLevel="danger" ONLY for actual fabrications. Normal cover letter language should be "safe" or "warning" at most.

Return pure JSON only.`],

    ['human', `Check this text for FABRICATIONS:

**VERIFIED FACTS (Ground Truth):**
Name: {name}
Years Experience: {years}
Education: {education}
Technical Skills: {skills}
Work History: {workHistory}
CANNOT CLAIM: {cannotClaim}

**TEXT TO CHECK:**
{text}

**CONTEXT:** {context}

Flag ONLY severe fabrications. Return JSON with approved true/false.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: groundTruth.name,
      years: groundTruth.yearsOfExperience?.toString() || 'Not specified',
      education: groundTruth.education.join(', ') || 'None listed',
      skills: groundTruth.technicalSkills.join(', ') || 'None listed',
      workHistory: JSON.stringify(groundTruth.workHistory),
      cannotClaim: groundTruth.cannotClaim.join(', ') || 'None',
      text: text.substring(0, 2000),
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

    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const check: GuardianCheck = JSON.parse(jsonMatch[0]);
    
    // ✅ LOG AINA TULOKSET
    console.log('🛡️ Guardian Check:', {
      approved: check.approved,
      riskLevel: check.riskLevel,
      violationsCount: Object.values(check.violations).flat().length,
      confidence: check.confidence
    });
    
    if (!check.approved) {
      console.error('🚨 GUARDIAN REJECTED:', {
        violations: check.violations,
        riskLevel: check.riskLevel,
        recommendation: check.recommendation
      });
    }
    
    return check;
  } catch (error) {
    console.error('❌ Master check failed:', error);
    
    // ✅ FALLBACK: Hyväksy jos check epäonnistuu
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
      recommendation: 'Guardian check failed - content passed through',
      fixSuggestions: []
    };
  }
}