// lib/ats/experienceGapAnalyzer.ts - KOKEMUSKUILUN ANALYSOINTI

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

export interface ExperienceGap {
  hasGap: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'critical';
  passLikelihood: number; // 0-100%
  canGenerateLetter: boolean;
  missingExperiences: {
    skill: string;
    required: boolean; // true = MUST have, false = nice to have
    impact: 'critical' | 'important' | 'helpful';
    explanation: string;
  }[];
  recommendations: string[];
  warningMessage: string;
  userFriendlyExplanation: string;
}

export interface ExperienceGapInput {
  jobDescription: string;
  userProfile: {
    workExperience?: string;
    education?: string;
    skills?: string;
    yearsOfExperience?: number;
    careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
    [key: string]: any;
  };
  extractedKeywords?: {
    critical: string[];
    important: string[];
    bonus: string[];
  };
  followUpAnswers?: Record<string, string>; // Lisäkysymysten vastaukset
  language?: string;
}

// ════════════════════════════════════════════════════════════════
// MAIN ANALYZER
// ════════════════════════════════════════════════════════════════

export async function analyzeExperienceGap(
  input: ExperienceGapInput
): Promise<ExperienceGap> {
  console.log('🔍 [ExperienceGap] Analyzing user experience vs job requirements...');

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.1,
  });

  const languageName = (input.language || 'finnish').toLowerCase().includes('fi') 
    ? 'Finnish' 
    : 'English';

  const followUpContext = input.followUpAnswers && Object.keys(input.followUpAnswers).length > 0
    ? `\n\n**ADDITIONAL INFO FROM FOLLOW-UP QUESTIONS:**\n${Object.entries(input.followUpAnswers)
        .map(([q, a]) => `Q: "${q}"\nA: "${a}"`)
        .join('\n\n')}`
    : '';

  const keywordsContext = input.extractedKeywords
    ? `\n\n**EXTRACTED KEYWORDS:**\nCritical: ${input.extractedKeywords.critical.join(', ')}\nImportant: ${input.extractedKeywords.important.join(', ')}\nBonus: ${input.extractedKeywords.bonus.join(', ')}`
    : '';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an expert career advisor analyzing if a candidate has sufficient experience to pass an ATS system for a specific job.

**YOUR MISSION:**
1. Compare job requirements with candidate's actual experience
2. Identify critical experience gaps
3. Predict ATS pass likelihood (0-100%)
4. Determine if we can still generate a cover letter
5. Provide actionable recommendations

**CRITICAL ANALYSIS RULES:**

**SEVERITY LEVELS:**
- **NONE**: Candidate meets all requirements → passLikelihood: 85-100%
- **MINOR**: 1-2 small gaps → passLikelihood: 70-84%
- **MODERATE**: Several gaps but compensable → passLikelihood: 50-69%
- **CRITICAL**: Major gaps, hard to pass → passLikelihood: 0-49%

**PASS LIKELIHOOD CALCULATION:**
- 90-100%: Excellent match, ATS will love this
- 75-89%: Good match, likely to pass
- 60-74%: Moderate match, 50/50 chance
- 40-59%: Poor match, needs significant improvement
- 0-39%: Very poor match, unlikely to pass

**DECISION RULES:**
- passLikelihood >= 60% → canGenerateLetter: true (safe to proceed)
- passLikelihood 40-59% → canGenerateLetter: true (generate with warning)
- passLikelihood < 40% → canGenerateLetter: true (generate but explain gaps)

**ALWAYS GENERATE LETTER** - We never refuse, but we warn user about likelihood.

**OUTPUT LANGUAGE:** ${languageName}

Return JSON with these exact fields:
{{
  "hasGap": boolean,
  "severity": "none" | "minor" | "moderate" | "critical",
  "passLikelihood": number (0-100),
  "canGenerateLetter": boolean (ALWAYS true),
  "missingExperiences": [
    {{
      "skill": "exact skill name from job",
      "required": boolean,
      "impact": "critical" | "important" | "helpful",
      "explanation": "why this matters"
    }}
  ],
  "recommendations": ["actionable advice"],
  "warningMessage": "honest but constructive message",
  "userFriendlyExplanation": "plain language explanation in ${languageName}"
    }}`],

    ['human', `Analyze experience gap for this application.

**JOB DESCRIPTION:**
{jobDescription}

**CANDIDATE PROFILE:**
Name: {name}
Years of Experience: {yearsOfExperience}
Career Level: {careerLevel}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
${keywordsContext}
${followUpContext}

**INSTRUCTIONS:**
1. List ALL missing critical experiences
2. Calculate realistic passLikelihood (0-100%)
3. Provide constructive recommendations
4. Write warning message in ${languageName}
5. Explain gaps in simple ${languageName}

Return ONLY valid JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      jobDescription: input.jobDescription,
      name: input.userProfile.name || 'Candidate',
      yearsOfExperience: input.userProfile.yearsOfExperience?.toString() || '0',
      careerLevel: input.userProfile.careerLevel || 'Not specified',
      workExperience: input.userProfile.workExperience || 'Not specified',
      education: input.userProfile.education || 'Not specified',
      skills: input.userProfile.skills || 'Not specified'
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const cleaned = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in experience gap analysis');
    }

    const analysis: ExperienceGap = JSON.parse(jsonMatch[0]);

    // Varmista että canGenerateLetter on AINA true
    analysis.canGenerateLetter = true;

    console.log(`✅ [ExperienceGap] Analysis complete:`, {
      hasGap: analysis.hasGap,
      severity: analysis.severity,
      passLikelihood: analysis.passLikelihood,
      missingCount: analysis.missingExperiences.length
    });

    return analysis;

  } catch (error) {
    console.error('❌ [ExperienceGap] Analysis failed:', error);

    // SAFE FALLBACK - Aina optimistinen
    return {
      hasGap: false,
      severity: 'minor',
      passLikelihood: 70,
      canGenerateLetter: true,
      missingExperiences: [],
      recommendations: [
        languageName === 'Finnish' 
          ? 'Korosta olemassa olevia vahvuuksiasi'
          : 'Emphasize your existing strengths'
      ],
      warningMessage: languageName === 'Finnish'
        ? 'Kokemuksen analyysi epäonnistui, mutta voimme silti generoida hakukirjeen.'
        : 'Experience analysis failed, but we can still generate your cover letter.',
      userFriendlyExplanation: languageName === 'Finnish'
        ? 'Emme pystyneet analysoimaan kokemustasi täysin, mutta luomme parhaan mahdollisen hakukirjeen profiilisi perusteella.'
        : 'We could not fully analyze your experience, but we will create the best possible cover letter based on your profile.'
    };
  }
}

// ════════════════════════════════════════════════════════════════
// HELPER: BUILD WARNING UI DATA
// ════════════════════════════════════════════════════════════════

export interface WarningUIData {
  showWarning: boolean;
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  missingSkills: {
    name: string;
    importance: string;
    explanation: string;
  }[];
  recommendations: string[];
  canProceed: boolean;
}

export function buildWarningUI(
  gap: ExperienceGap,
  language: 'finnish' | 'english' = 'finnish'
): WarningUIData {
  
  const isFinnish = language === 'finnish';

  // Jos ei aukkoja, ei varoitusta
  if (!gap.hasGap || gap.severity === 'none') {
    return {
      showWarning: false,
      level: 'info',
      title: isFinnish ? 'Profiilisi sopii hyvin!' : 'Great Profile Match!',
      message: isFinnish 
        ? 'Profiilisi vastaa hyvin työpaikan vaatimuksia.'
        : 'Your profile matches the job requirements well.',
      missingSkills: [],
      recommendations: [],
      canProceed: true
    };
  }

  // Määritä varoitustaso
  let level: 'info' | 'warning' | 'critical';
  let title: string;

  if (gap.passLikelihood >= 75) {
    level = 'info';
    title = isFinnish ? '✅ Hyvät mahdollisuudet' : '✅ Good Chances';
  } else if (gap.passLikelihood >= 50) {
    level = 'warning';
    title = isFinnish ? '⚠️ Kohtalaiset mahdollisuudet' : '⚠️ Moderate Chances';
  } else {
    level = 'critical';
    title = isFinnish ? '🔴 Haastavat mahdollisuudet' : '🔴 Challenging Chances';
  }

  return {
    showWarning: true,
    level,
    title,
    message: gap.userFriendlyExplanation,
    missingSkills: gap.missingExperiences.map(exp => ({
      name: exp.skill,
      importance: exp.required 
        ? (isFinnish ? 'Pakollinen' : 'Required')
        : (isFinnish ? 'Suositeltu' : 'Recommended'),
      explanation: exp.explanation
    })),
    recommendations: gap.recommendations,
    canProceed: gap.canGenerateLetter
  };
}

// ════════════════════════════════════════════════════════════════
// HELPER: GET MISSING EXPERIENCE REPORT (for user)
// ════════════════════════════════════════════════════════════════

export function getMissingExperienceReport(
  gap: ExperienceGap,
  language: 'finnish' | 'english' = 'finnish'
): string {
  const isFinnish = language === 'finnish';

  if (!gap.hasGap || gap.missingExperiences.length === 0) {
    return isFinnish
      ? '✅ Profiilisi täyttää kaikki vaatimukset!'
      : '✅ Your profile meets all requirements!';
  }

  const critical = gap.missingExperiences.filter(e => e.impact === 'critical');
  const important = gap.missingExperiences.filter(e => e.impact === 'important');
  const helpful = gap.missingExperiences.filter(e => e.impact === 'helpful');

  let report = isFinnish
    ? `📊 **Kokemuskuilun analyysi** (ATS-läpäisymahdollisuus: ${gap.passLikelihood}%)\n\n`
    : `📊 **Experience Gap Analysis** (ATS Pass Likelihood: ${gap.passLikelihood}%)\n\n`;

  if (critical.length > 0) {
    report += isFinnish
      ? `🔴 **Kriittiset puutteet** (ATS todennäköisesti suodattaa):\n`
      : `🔴 **Critical Gaps** (ATS likely to filter):\n`;
    
    critical.forEach(exp => {
      report += `- ${exp.skill}: ${exp.explanation}\n`;
    });
    report += '\n';
  }

  if (important.length > 0) {
    report += isFinnish
      ? `🟡 **Tärkeät puutteet** (heikentää mahdollisuuksia):\n`
      : `🟡 **Important Gaps** (reduces chances):\n`;
    
    important.forEach(exp => {
      report += `- ${exp.skill}: ${exp.explanation}\n`;
    });
    report += '\n';
  }

  if (helpful.length > 0) {
    report += isFinnish
      ? `🟢 **Bonus-taidot** (parantaisi mahdollisuuksia):\n`
      : `🟢 **Bonus Skills** (would improve chances):\n`;
    
    helpful.forEach(exp => {
      report += `- ${exp.skill}: ${exp.explanation}\n`;
    });
    report += '\n';
  }

  if (gap.recommendations.length > 0) {
    report += isFinnish
      ? `💡 **Suositukset:**\n`
      : `💡 **Recommendations:**\n`;
    
    gap.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });
  }

  return report;
}