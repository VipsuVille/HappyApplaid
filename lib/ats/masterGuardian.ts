// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIEDOSTO 1: lib/ats/masterGuardian.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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
  cannotClaim: string[];
}

export interface GuardianCheck {
  approved: boolean;
  violations: {
    factual: string[];
    personality: string[];
    tone: string[];
    skills: string[];
    contradiction: string[];
  };
  riskLevel: 'safe' | 'warning' | 'danger';
  recommendation: string;
  fixSuggestions: string[];
}

/**
 * ✅ POIMII GROUND TRUTH (IMMUTABLE FACTS)
 */
export function extractGroundTruth(userProfile: any): GroundTruth {
  // Laske työkokemus vuosissa
  let yearsOfExperience: number | null = null;
  if (Array.isArray(userProfile.work_experience)) {
    const totalMonths = userProfile.work_experience.reduce((sum: number, work: any) => {
      if (work.duration) {
        const match = work.duration.match(/(\d+)\s*(vuotta|year|år)/);
        if (match) return sum + parseInt(match[1]) * 12;
      }
      return sum;
    }, 0);
    yearsOfExperience = Math.floor(totalMonths / 12);
  }

  // Ydin-persoonallisuus
  const corePersonality = {
    primary: userProfile.superpower || userProfile.unique_strength || 'Motivoitunut ammattilainen',
    secondary: [
      userProfile.working_style,
      userProfile.team_role,
      userProfile.problem_solving
    ].filter(Boolean).map((p: string) => p.split('.')[0].trim())
  };

  // Tekniset taidot
  const technicalSkills = (userProfile.skills || '')
    .split(/[,;]/)
    .map((s: string) => s.trim())
    .filter(Boolean);

  return {
    name: userProfile.name || '',
    yearsOfExperience,
    education: Array.isArray(userProfile.education) 
      ? userProfile.education.map((e: any) => e.degree || e.school).filter(Boolean)
      : [],
    currentRole: userProfile.job_title || null,
    technicalSkills,
    languages: Array.isArray(userProfile.languages)
      ? userProfile.languages.map((l: any) => l.language).filter(Boolean)
      : [],
    corePersonality,
    values: [
      userProfile.values_example,
      userProfile.energy_sources
    ].filter(Boolean),
    cannotClaim: determineCannotClaim(userProfile)
  };
}

function determineCannotClaim(profile: any): string[] {
  const cannotClaim: string[] = [];
  
  // Johtaminen
  const hasLeadership = (profile.work_experience || []).some((w: any) => 
    /johtaja|manager|lead|chief|director/i.test(w.position || w.title || '')
  );
  if (!hasLeadership) {
    cannotClaim.push('johtamiskokemus', 'esimiestyö', 'tiimin johtaminen', 'management', 'leadership');
  }
  
  // Ohjelmointi
  const hasTech = (profile.skills || '').match(/python|javascript|react|java|c\+\+|programming|coding/i);
  if (!hasTech) {
    cannotClaim.push('ohjelmointi', 'koodaus', 'software development', 'programming');
  }
  
  // Design
  const hasDesign = (profile.skills || '').match(/photoshop|illustrator|figma|design|graafi/i);
  if (!hasDesign) {
    cannotClaim.push('graafinen suunnittelu', 'UI/UX design', 'brändäys', 'graphic design');
  }
  
  return cannotClaim;
}

/**
 * ✅ MASTER CONSISTENCY CHECK
 */
export async function masterConsistencyCheck(
  text: string,
  groundTruth: GroundTruth,
  context: 'generation' | 'keyword_insertion' | 'translation'
): Promise<GuardianCheck> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are THE MASTER GUARDIAN - the final authority on consistency.

GROUND TRUTH IS IMMUTABLE. Detect ANY deviation.

CRITICAL VIOLATIONS (REJECT):
1. FACTUAL HALLUCINATIONS:
   - Years changed (2 → 5)
   - Degrees invented
   - Skills added not in list
   - Job titles inflated
   
2. PERSONALITY CONTRADICTIONS:
   - Core changed (empathetic → analytical)
   - Values contradict
   
3. FORBIDDEN CLAIMS:
   - Claiming skills in cannotClaim list

MINOR ISSUES (WARNING):
- Tone shifted slightly
- Emphasis changed but facts intact

Return JSON:
{
  "approved": true/false,
  "violations": {
    "factual": ["violation 1", ...],
    "personality": [...],
    "tone": [...],
    "skills": [...],
    "contradiction": [...]
  },
  "riskLevel": "safe|warning|danger",
  "recommendation": "brief in Finnish",
  "fixSuggestions": ["how to fix 1", ...]
}`],
    
    ['human', `GROUND TRUTH:
Name: {name}
Years: {years}
Education: {education}
Skills: {skills}
Core Personality: {personality}
CANNOT CLAIM: {cannotClaim}

TEXT:
{text}

Context: {context}

Detect violations. JSON only.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: groundTruth.name,
      years: groundTruth.yearsOfExperience?.toString() || 'Not specified',
      education: groundTruth.education.join(', ') || 'Not specified',
      skills: groundTruth.technicalSkills.join(', ') || 'Not specified',
      personality: `${groundTruth.corePersonality.primary}; ${groundTruth.corePersonality.secondary.join(', ')}`,
      cannotClaim: groundTruth.cannotClaim.join(', ') || 'None',
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
    return fallbackCheck(text, groundTruth);
  }
}

function fallbackCheck(text: string, groundTruth: GroundTruth): GuardianCheck {
  const violations: GuardianCheck['violations'] = {
    factual: [],
    personality: [],
    tone: [],
    skills: [],
    contradiction: []
  };

  const lowerText = text.toLowerCase();

  // Tarkista kielletyt
  groundTruth.cannotClaim.forEach(forbidden => {
    if (lowerText.includes(forbidden.toLowerCase())) {
      violations.skills.push(`Väittää: "${forbidden}"`);
    }
  });

  // Tarkista kokemusvuodet
  if (groundTruth.yearsOfExperience !== null) {
    const yearsInText = text.match(/(\d+)\s*(vuotta|year)/gi);
    if (yearsInText) {
      yearsInText.forEach(match => {
        const num = parseInt(match);
        if (num > groundTruth.yearsOfExperience! + 1) {
          violations.factual.push(`Väittää ${num}v (todell. ${groundTruth.yearsOfExperience}v)`);
        }
      });
    }
  }

  const totalViolations = Object.values(violations).flat().length;
  
  return {
    approved: totalViolations === 0,
    violations,
    riskLevel: totalViolations === 0 ? 'safe' : totalViolations <= 2 ? 'warning' : 'danger',
    recommendation: totalViolations === 0 ? 'OK' : 'Ongelmia havaittu',
    fixSuggestions: totalViolations > 0 ? ['Tarkista rikkomukset'] : []
  };
}


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIEDOSTO 2: lib/ats/smartStopwords.ts (JO LUOTU YLLÄ)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Käytä yllä olevaa smartStopwords.ts -koodia


// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIEDOSTO 3: lib/ats/synonymMatcher.ts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  exactMatch?: string;
  synonymMatch?: string;
  partialMatch?: string;
  confidence: number;
}

const SYNONYM_DATABASE: Record<string, string[]> = {
  'problem-solving': ['ongelmanratkaisu', 'ongelmanratkaisutaidot', 'problemlösning'],
  'teamwork': ['tiimityö', 'tiimityötaidot', 'ryhmätyö', 'yhteistyö', 'lagarbete'],
  'leadership': ['johtaminen', 'johtamistaidot', 'johtajuus', 'ledarskap'],
  'communication': ['viestintä', 'kommunikaatio', 'viestintätaidot', 'kommunikation'],
  'customer service': ['asiakaspalvelu', 'asiakaspalvelutaidot', 'kundservice'],
  'Excel': ['Excel-ohjelma', 'Microsoft Excel', 'Excelin käyttö'],
  'CRM': ['CRM-järjestelmä', 'CRM-järjestelmät', 'asiakkuudenhallinta'],
};

export function findKeywordInText(
  keyword: string,
  text: string
): KeywordMatch {
  const lowerKeyword = keyword.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // 1. Täsmällinen
  if (lowerText.includes(lowerKeyword)) {
    return {
      keyword,
      found: true,
      exactMatch: keyword,
      confidence: 1.0
    };
  }
  
  // 2. Synonyymi
  const synonyms = SYNONYM_DATABASE[lowerKeyword] || [];
  for (const synonym of synonyms) {
    if (lowerText.includes(synonym.toLowerCase())) {
      return {
        keyword,
        found: true,
        synonymMatch: synonym,
        confidence: 0.85
      };
    }
  }
  
  // 3. Osittainen
  const keywordWords = lowerKeyword.split(/[\s-]+/);
  for (const word of keywordWords) {
    if (word.length >= 4 && lowerText.includes(word)) {
      return {
        keyword,
        found: true,
        partialMatch: word,
        confidence: 0.5
      };
    }
  }
  
  return {
    keyword,
    found: false,
    confidence: 0
  };
}

export function analyzeKeywords(
  keywords: string[],
  coverLetterText: string
): {
  exactMatches: KeywordMatch[];
  synonymMatches: KeywordMatch[];
  partialMatches: KeywordMatch[];
  missing: KeywordMatch[];
  overallScore: number;
} {
  const results = keywords.map(kw => findKeywordInText(kw, coverLetterText));
  
  const exactMatches = results.filter(r => r.exactMatch);
  const synonymMatches = results.filter(r => r.synonymMatch);
  const partialMatches = results.filter(r => r.partialMatch);
  const missing = results.filter(r => !r.found);
  
  const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
  const overallScore = results.length > 0 
    ? Math.round((totalConfidence / results.length) * 100)
    : 0;
  
  return {
    exactMatches,
    synonymMatches,
    partialMatches,
    missing,
    overallScore
  };
}