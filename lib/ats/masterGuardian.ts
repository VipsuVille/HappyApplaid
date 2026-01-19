// lib/ats/masterGuardian.ts - OPPIVA VERSIO
const _REBUILD_FORCE = "REBUILD_001";
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

export interface GuardianCheckResult {
  approved: boolean;
  riskLevel: 'safe' | 'warning' | 'danger';
  violations: {
    fabricatedSkills?: string[];
    fabricatedEducation?: string[];
    fabricatedExperience?: string[];
    [key: string]: any; // ✅ LISÄÄ TÄMÄ RIVI
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

  // ✅ KORJATTU PROMPT (ei puuttuvia muuttujia)
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

Extract ONLY what exists. Do NOT infer or add skills not listed.
Return JSON only, no markdown.`],

    ['human', `Extract facts from this profile:

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

Return ONLY valid JSON with all required fields.`]
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
    
    // ✅ PARANNETTU FALLBACK
    const fallbackSkills = (userProfile.skills || '')
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    
    const groundTruth: GroundTruth = {
      technicalSkills: fallbackSkills,
      softSkills: [],
      education: userProfile.education ? [userProfile.education] : [],
      certifications: [],
      workHistory: userProfile.work_experience ? [userProfile.work_experience] : [],
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

export async function masterGuardianValidatorV2(
  generatedContent: string,
  groundTruth: GroundTruth | null,
  stage: 'generation' | 'edit'
): Promise<GuardianCheckResult> {
  
  // 1. Perustarkistukset
  if (!groundTruth) {
    return {
      approved: true,
      riskLevel: 'safe',
      violations: { fabricatedSkills: [], fabricatedEducation: [], fabricatedExperience: [] },
      recommendation: 'No ground truth available',
      flags: ['no_ground_truth']
    };
  }

  // 2. Alustetaan Ground Truth turvallisesti (Double-check)
  const safeApproved = {
    skills: Array.isArray(groundTruth.approvedViolations?.skills) ? groundTruth.approvedViolations.skills : [],
    education: Array.isArray(groundTruth.approvedViolations?.education) ? groundTruth.approvedViolations.education : [],
    experience: Array.isArray(groundTruth.approvedViolations?.experience) ? groundTruth.approvedViolations.experience : []
  };

  try {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.1,
    });

    const prompt = `You are a CV fact-checker. 
    Compare the CONTENT to the GROUND TRUTH.
    GROUND TRUTH: ${JSON.stringify(groundTruth)}
    CONTENT: ${generatedContent.substring(0, 2000)}
    
    Return ONLY JSON:
    {
      "approved": boolean,
      "riskLevel": "safe" | "warning" | "danger",
      "violations": {
        "fabricatedSkills": ["skill1"],
        "fabricatedEducation": ["edu1"],
        "fabricatedExperience": ["exp1"]
      },
      "recommendation": "string"
    }`;

    const result = await model.invoke(prompt);
    const content = getMessageContent(result);
    const cleaned = content.replace(/```json\s*|```/g, '').trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error('No JSON found');
    let parsed = JSON.parse(jsonMatch[0]);

    // 3. 🔥 ULTRA-TURVALLINEN FILTROINTI (Tämä kohta kaatoi koodin)
    // Luodaan vakiot joissa on varmasti taulukot, oli AI:n vastaus mitä vain
    const rawV = parsed.violations || {};
    const rawSkills = Array.isArray(rawV.fabricatedSkills) ? rawV.fabricatedSkills : [];
    const rawEdu = Array.isArray(rawV.fabricatedEducation) ? rawV.fabricatedEducation : [];
    const rawExp = Array.isArray(rawV.fabricatedExperience) ? rawV.fabricatedExperience : [];

    // Suodatetaan pois jo aiemmin hyväksytyt asiat
    parsed.violations = {
      fabricatedSkills: rawSkills.filter((s: any) => 
        typeof s === 'string' && !safeApproved.skills.some(a => a?.toLowerCase() === s.toLowerCase())
      ),
      fabricatedEducation: rawEdu.filter((e: any) => 
        typeof e === 'string' && !safeApproved.education.some(a => a?.toLowerCase() === e.toLowerCase())
      ),
      fabricatedExperience: rawExp.filter((ex: any) => 
        typeof ex === 'string' && !safeApproved.experience.some(a => a?.toLowerCase() === ex.toLowerCase())
      )
    };

    // 4. Varmistetaan että flags on olemassa
    parsed.flags = Array.isArray(parsed.flags) ? parsed.flags : [];

    return parsed;

  } catch (error) {
    console.error('❌ Guardian failure:', error);
    return {
      approved: true,
      riskLevel: 'warning',
      violations: { fabricatedSkills: [], fabricatedEducation: [], fabricatedExperience: [] },
      recommendation: 'Validation skipped due to technical error',
      flags: ['guardian_error']
    };
  }
}