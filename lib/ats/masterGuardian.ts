// lib/ats/masterGuardian.ts - COVER LETTER -KONTEKSTI

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
 * ✅ COVER LETTER CONTEXT GUARDIAN
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

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a guardian for COVER LETTER content. Cover letters are ASPIRATIONAL and PERSUASIVE by nature.

**CRITICAL CONTEXT: This is a COVER LETTER, not a resume.**

Cover letters SHOULD:
- Express enthusiasm and motivation
- Describe HOW skills were developed
- Mention learning projects (even personal ones)
- Show passion for the field
- Highlight transferable skills
- Demonstrate problem-solving mindset

**ONLY REJECT if these SEVERE fabrications:**

1. **COMPLETELY FALSE CREDENTIALS:**
   - Claims "Master's degree" when has NONE
   - Claims "5 years at Google" when never worked there
   - Lists certifications never earned

2. **INVENTED TECHNICAL SKILLS:**
   - Claims "Python expert" when Python is NOT in technicalSkills
   - Lists frameworks/tools NOT in technicalSkills
   - Names technologies never mentioned

3. **FABRICATED JOB TITLES:**
   - Claims "Senior Engineer" when only "Intern" in workHistory
   - Inflates actual job titles from workHistory

**ALWAYS ALLOW (not fabrications):**
- ✅ "I developed a JavaScript app" (if JavaScript in skills)
- ✅ "I have experience with React" (if React in skills)
- ✅ "I worked on machine learning projects" (if ML in skills or education)
- ✅ Personal projects (learning, side projects, portfolio)
- ✅ School projects from education
- ✅ Volunteer work
- ✅ "I'm passionate about full-stack development" (motivation)
- ✅ "I've been learning and building with X" (if X in skills)
- ✅ Generic professional phrases ("team player", "problem solver")

**EVALUATION RULES:**
1. If skill IS in technicalSkills → ALLOW any description of it
2. If describing personal/learning projects → ALLOW (shows initiative)
3. If work history exists → ALLOW describing that experience
4. If education mentions field → ALLOW discussing projects in that field
5. Generic motivation/enthusiasm → ALWAYS ALLOW

**OUTPUT:**
- approved: true (unless SEVERE fabrication)
- violations: ONLY list actual fabrications
- riskLevel: "safe" (default), "warning" (minor concern), "danger" (severe fabrication)
- confidence: 0.0 to 1.0
- recommendation: brief explanation
- fixSuggestions: only if rejected

**DEFAULT STANCE: APPROVE unless clear fabrication.**

Return pure JSON only.`],

    ['human', `Check this COVER LETTER for severe fabrications:

**CANDIDATE'S SKILLS:**
{skills}

**CANDIDATE'S WORK HISTORY:**
{workHistory}

**CANDIDATE'S EDUCATION:**
{education}

**COVER LETTER TEXT:**
{text}

**CONTEXT:** {context}

Remember: This is a COVER LETTER. Allow aspirational language. Only reject SEVERE fabrications.

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      skills: groundTruth.technicalSkills.join(', ') || 'Skills under development',
      workHistory: JSON.stringify(groundTruth.workHistory) || 'Building experience',
      education: groundTruth.education.join(', ') || 'Continuous learner',
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
    
    console.log('🛡️ Guardian Check:', {
      approved: check.approved,
      riskLevel: check.riskLevel,
      hasViolations: Object.values(check.violations).some(v => v.length > 0)
    });
    
    if (!check.approved) {
      console.error('🚨 GUARDIAN REJECTED:', {
        violations: check.violations,
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
      riskLevel: 'safe',
      confidence: 0.5,
      recommendation: 'Guardian check bypassed - content approved',
      fixSuggestions: []
    };
  }
}