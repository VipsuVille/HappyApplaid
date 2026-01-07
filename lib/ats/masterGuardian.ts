// lib/ats/masterGuardian.ts - TÄYDELLINEN VERSIO (Oppiva)

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { supabaseAdmin } from '@/lib/supabase';

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
  approvedViolations?: {
    skills: string[];
    education: string[];
    experience: string[];
  };
}

// lib/ats/masterGuardian.ts - KORJATTU TYPES

export interface GuardianCheckResult {
  approved: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  violations: {
    fabricatedSkills?: string[];
    fabricatedEducation?: string[];
    fabricatedExperience?: string[];
    [key: string]: any; // ✅ LISÄÄ TÄMÄ - Sallii error-kentän
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
// ✅ HAE KÄYTTÄJÄN AIEMMAT VAHVISTUKSET
// ════════════════════════════════════════════════════════════════

async function getUserValidationHistory(userId: string): Promise<{
  approvedSkills: string[];
  approvedEducation: string[];
  approvedExperience: string[];
  rejectedSkills: string[];
  rejectedEducation: string[];
  rejectedExperience: string[];
}> {
  try {
    const { data: responses } = await supabaseAdmin
      .from('user_responses')
      .select('*')
      .eq('user_id', userId)
      .eq('question_category', 'cv')
      .eq('asked_in_context', 'cv_validation');

    if (!responses || responses.length === 0) {
      return {
        approvedSkills: [],
        approvedEducation: [],
        approvedExperience: [],
        rejectedSkills: [],
        rejectedEducation: [],
        rejectedExperience: []
      };
    }

    const history = {
      approvedSkills: [] as string[],
      approvedEducation: [] as string[],
      approvedExperience: [] as string[],
      rejectedSkills: [] as string[],
      rejectedEducation: [] as string[],
      rejectedExperience: [] as string[]
    };

    for (const response of responses) {
      const metadata = response.metadata || {};
      const decision = metadata.user_decision;
      const type = metadata.violation_type;
      
      if (!type) continue;

      // Hyväksytty tai korjattu → lisää hyväksyttyihin
      if (decision === 'approved' || decision === 'corrected') {
        const content = decision === 'corrected' 
          ? metadata.corrected_content 
          : metadata.original_content;
        
        if (!content) continue;

        if (type === 'skill') {
          history.approvedSkills.push(content);
        } else if (type === 'education') {
          history.approvedEducation.push(content);
        } else if (type === 'experience') {
          history.approvedExperience.push(content);
        }
      } 
      // Hylätty → lisää hylättyihin
      else if (decision === 'rejected') {
        const content = metadata.original_content;
        if (!content) continue;

        if (type === 'skill') {
          history.rejectedSkills.push(content);
        } else if (type === 'education') {
          history.rejectedEducation.push(content);
        } else if (type === 'experience') {
          history.rejectedExperience.push(content);
        }
      }
    }

    console.log('📚 User validation history:', {
      approved: {
        skills: history.approvedSkills.length,
        education: history.approvedEducation.length,
        experience: history.approvedExperience.length
      },
      rejected: {
        skills: history.rejectedSkills.length,
        education: history.rejectedEducation.length,
        experience: history.rejectedExperience.length
      }
    });

    return history;
  } catch (error) {
    console.error('Error fetching validation history:', error);
    return {
      approvedSkills: [],
      approvedEducation: [],
      approvedExperience: [],
      rejectedSkills: [],
      rejectedEducation: [],
      rejectedExperience: []
    };
  }
}

// ════════════════════════════════════════════════════════════════
// EXTRACT GROUND TRUTH
// ════════════════════════════════════════════════════════════════

export async function extractGroundTruthAI(
  userProfile: any,
  userId?: string
): Promise<GroundTruth> {
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
    
    const cleaned = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const groundTruth = JSON.parse(jsonMatch[0]) as GroundTruth;
    
    if (!groundTruth.technicalSkills || !Array.isArray(groundTruth.technicalSkills)) {
      throw new Error('Invalid ground truth structure');
    }
    
    // ✅ LISÄÄ KÄYTTÄJÄN AIEMMAT HYVÄKSYNNÄT
    if (userId) {
      const history = await getUserValidationHistory(userId);
      groundTruth.approvedViolations = {
        skills: history.approvedSkills,
        education: history.approvedEducation,
        experience: history.approvedExperience
      };
      
      // Lisää myös hylätyt "cannotClaim":iin
      groundTruth.cannotClaim = [
        ...groundTruth.cannotClaim,
        ...history.rejectedSkills,
        ...history.rejectedEducation,
        ...history.rejectedExperience
      ];
    }
    
    console.log('✅ Ground Truth extracted:', {
      name: userProfile.name,
      skills: groundTruth.technicalSkills.length,
      education: groundTruth.education.length,
      approved: userId ? groundTruth.approvedViolations : 'N/A',
      careerLevel: groundTruth.careerLevel
    });
    
    return groundTruth;
    
  } catch (error) {
    console.error('❌ Ground Truth extraction failed:', error);
    
    // SAFE FALLBACK
    const fallbackSkills = (userProfile.skills || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    
    const groundTruth: GroundTruth = {
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

    if (userId) {
      const history = await getUserValidationHistory(userId);
      groundTruth.approvedViolations = {
        skills: history.approvedSkills,
        education: history.approvedEducation,
        experience: history.approvedExperience
      };
      groundTruth.cannotClaim = [
        ...history.rejectedSkills,
        ...history.rejectedEducation,
        ...history.rejectedExperience
      ];
    }

    return groundTruth;
  }
}

// ════════════════════════════════════════════════════════════════
// CONSISTENCY CHECK (OPPIVA)
// ════════════════════════════════════════════════════════════════

export async function masterConsistencyCheckAI(
  generatedContent: string,
  groundTruth: GroundTruth | null,
  stage: 'generation' | 'edit'
): Promise<GuardianCheckResult> {
  
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
    yearsOfExperience: groundTruth.yearsOfExperience || 0,
    approvedViolations: groundTruth.approvedViolations
  };

  try {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.1,
    });

    // ✅ RAKENNA KONTEKSTI HYVÄKSYTYISTÄ JA HYLKÄTYISTÄ
    const approvedContext = safeGroundTruth.approvedViolations 
      ? `

**USER HAS PREVIOUSLY APPROVED THESE (✅ SAFE, DO NOT FLAG):**
- Skills: ${safeGroundTruth.approvedViolations.skills.join(', ') || 'None'}
- Education: ${safeGroundTruth.approvedViolations.education.join(', ') || 'None'}
- Experience: ${safeGroundTruth.approvedViolations.experience.join(', ') || 'None'}

IMPORTANT: If content matches approved items above, it is SAFE.
`
      : '';

    const rejectedContext = safeGroundTruth.cannotClaim.length > 0
      ? `

**USER HAS REJECTED THESE (❌ MUST NOT USE):**
${safeGroundTruth.cannotClaim.join(', ')}

CRITICAL: If any of these appear, mark as DANGER violation.
`
      : '';

    const prompt = `You are a CV fact-checker. Check for severe fabrications only.

GROUND TRUTH (verified user data):
- Technical Skills: ${safeGroundTruth.technicalSkills.join(', ') || 'None listed'}
- Education: ${safeGroundTruth.education.join(', ') || 'None listed'}
- Work History: ${safeGroundTruth.workHistory.join('; ') || 'None listed'}
${approvedContext}
${rejectedContext}

GENERATED CV CONTENT:
${generatedContent.substring(0, 2000)}

VALIDATION RULES:
1. ✅ APPROVE if content contains:
   - Skills/education/experience from technicalSkills/education/workHistory lists
   - Skills/education/experience from APPROVED list
   - Generic qualities (motivated, team player, etc.)

2. ❌ REJECT (danger) if content contains:
   - Skills NOT in technicalSkills list AND NOT in approved list
   - Education NOT in education list AND NOT in approved list
   - Work experience NOT in workHistory AND NOT in approved list
   - **ANYTHING from the REJECTED list**

3. ⚠️ WARNING if:
   - Content is vague but not clearly fabricated
   - Minor embellishments that don't change core facts

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
    
    const cleaned = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Guardian response');

    const parsed = JSON.parse(jsonMatch[0]) as GuardianCheckResult;

    // ✅ POST-PROCESSING: Poista violations jotka on jo hyväksytty
    if (parsed.violations && safeGroundTruth.approvedViolations) {
      const { approvedViolations } = safeGroundTruth;
      
      if (parsed.violations.fabricatedSkills) {
        parsed.violations.fabricatedSkills = parsed.violations.fabricatedSkills
          .filter(skill => {
            // Tarkista onko hyväksytty
            const isApproved = approvedViolations.skills.some(
              approved => approved.toLowerCase().includes(skill.toLowerCase())
            );
            // Tarkista onko hylätty
            const isRejected = safeGroundTruth.cannotClaim.some(
              rejected => rejected.toLowerCase().includes(skill.toLowerCase())
            );
            
            // Pidä vain jos ei hyväksytty JA ei hylätty
            return !isApproved && !isRejected;
          });
      }
      
      if (parsed.violations.fabricatedEducation) {
        parsed.violations.fabricatedEducation = parsed.violations.fabricatedEducation
          .filter(edu => {
            const isApproved = approvedViolations.education.some(
              approved => approved.toLowerCase().includes(edu.toLowerCase())
            );
            const isRejected = safeGroundTruth.cannotClaim.some(
              rejected => rejected.toLowerCase().includes(edu.toLowerCase())
            );
            return !isApproved && !isRejected;
          });
      }
      
      if (parsed.violations.fabricatedExperience) {
        parsed.violations.fabricatedExperience = parsed.violations.fabricatedExperience
          .filter(exp => {
            const isApproved = approvedViolations.experience.some(
              approved => approved.toLowerCase().includes(exp.toLowerCase())
            );
            const isRejected = safeGroundTruth.cannotClaim.some(
              rejected => rejected.toLowerCase().includes(exp.toLowerCase())
            );
            return !isApproved && !isRejected;
          });
      }

      // Jos kaikki violations poistuivat, hyväksy
      const hasViolations = 
        (parsed.violations.fabricatedSkills?.length || 0) > 0 ||
        (parsed.violations.fabricatedEducation?.length || 0) > 0 ||
        (parsed.violations.fabricatedExperience?.length || 0) > 0;

      if (!hasViolations && parsed.riskLevel === 'danger') {
        parsed.approved = true;
        parsed.riskLevel = 'safe';
        parsed.recommendation = 'All items were previously approved by user';
        parsed.flags = ['auto_approved_from_history'];
      }
    }

    console.log(`🛡️ Guardian ${stage}:`, {
      approved: parsed.approved,
      risk: parsed.riskLevel,
      violations: Object.values(parsed.violations || {}).flat().length
    });

    return parsed;

  } catch (error) {
    console.error('❌ Guardian check failed:', error);
    
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