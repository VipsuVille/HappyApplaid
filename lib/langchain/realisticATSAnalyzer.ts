// lib/langchain/realisticATSAnalyzer.ts - KORJATTU

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { detectLanguageWithAI } from './languageDetector';
import { analyzeKeywordsUniversal } from '../ats/synonymMatcher';

export interface ATSDetection {
  usesATS: boolean;
  confidence: number;
  reasoning: string;
  indicators: {
    hasATS: string[];
    noATS: string[];
  };
  companySize: 'large' | 'medium' | 'small' | 'unknown';
  recommendation: string;
}

export interface RealisticATSAnalysis {
  exactMatches: string[];
  synonymMatches: string[];
  relatedMatches: string[];
  missingCritical: string[];
  languageMismatch: boolean;
  jobLanguage: string;
  coverLetterLanguage: string;
  warningMessage?: string;
  score: number;
  atsDetection: ATSDetection;
}

/**
 * ✅ KORJATTU: Escapetus vain jos tarvitaan
 */
export async function detectATSUsageAI(jobDescription: string): Promise<ATSDetection> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an HR technology expert analyzing job postings to detect ATS usage.

**YOUR MISSION:**
Determine if company uses Applicant Tracking System (ATS).

**OUTPUT:**
{{
  "usesATS": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "AI reasoning",
  "indicators": {{
    "hasATS": ["indicator1"],
    "noATS": ["indicator1"]
  }},
  "companySize": "large|medium|small|unknown",
  "recommendation": "Advice"
}}`],

    ['human', `**JOB POSTING:**
{jobDescription}

Return JSON only.`]
  ]);

  try {
    // ✅ ÄLÄ ESCAPETA! LangChain hoitaa sen automaattisesti
    const formatted = await prompt.formatMessages({ 
      jobDescription: jobDescription 
    });
    
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('ATS detection failed:', error);
    
    return {
      usesATS: true,
      confidence: 0.5,
      reasoning: 'Could not determine - assuming ATS for safety',
      indicators: { hasATS: [], noATS: [] },
      companySize: 'unknown',
      recommendation: 'Optimize for ATS to be safe'
    };
  }
}

/**
 * ✅ KORJATTU: Escapetus vain jos tarvitaan
 */
async function extractKeywordsAI(jobDescription: string): Promise<string[]> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Extract ATS keywords using AI understanding.

**OUTPUT:**
{{
  "keywords": ["keyword1", "keyword2"],
  "priority": {{
    "critical": ["keyword1"],
    "important": ["keyword2"],
    "optional": ["keyword3"]
  }}
}}`],

    ['human', `**JOB DESCRIPTION:**
{jobDescription}

Return JSON only.`]
  ]);

  try {
    // ✅ ÄLÄ ESCAPETA
    const formatted = await prompt.formatMessages({ 
      jobDescription: jobDescription 
    });
    
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.keywords || [];
  } catch (error) {
    console.error('Keyword extraction failed:', error);
    return [];
  }
}

/**
 * ✅ PÄÄFUNKTIO - KORJATTU
 */
export async function analyzeRealisticATSUniversal(
  jobDescription: string,
  coverLetterContent: string
): Promise<RealisticATSAnalysis> {
  console.log('🔍 Starting universal ATS analysis...');

  // 1. Tunnista käyttääkö ATS:ää
  const atsDetection = await detectATSUsageAI(jobDescription);
  console.log(`ATS Detection: ${atsDetection.usesATS ? 'YES' : 'NO'} (${Math.round(atsDetection.confidence * 100)}%)`);

  // 2. Tunnista kielet
  const [jobLang, coverLang] = await Promise.all([
    detectLanguageWithAI(jobDescription),
    detectLanguageWithAI(coverLetterContent)
  ]);

  const languageMismatch = jobLang.language !== coverLang.language;

  // 3. Ekstraktoi avainsanat
  const keywords = await extractKeywordsAI(jobDescription);
  console.log(`Extracted ${keywords.length} keywords`);

  interface KeywordMatch {
    keyword: string;
    [key: string]: any;
  }

  interface UniversalAnalysisResult {
    exactMatches: KeywordMatch[];
    synonymMatches: KeywordMatch[];
    relatedMatches: KeywordMatch[];
    missing: KeywordMatch[];
    overallScore: number;
  }

  // 4. Analysoi matchit
  const analysis = await analyzeKeywordsUniversal(
    keywords,
    coverLetterContent,
    jobDescription,
    coverLang.language
  ) as UniversalAnalysisResult;

  const exactMatches = analysis.exactMatches.map(m => m.keyword);
  const synonymMatches = analysis.synonymMatches.map(m => m.keyword);
  const relatedMatches = analysis.relatedMatches.map(m => m.keyword);
  const missingCritical = analysis.missing.map(m => m.keyword);

  const score = analysis.overallScore;

  // 5. Varoitusviesti
  let warningMessage: string | undefined;
  if (languageMismatch) {
    warningMessage = `⚠️ KRIITTINEN: Työpaikkailmoitus on ${jobLang.language}-kielellä, mutta hakukirjeesi on ${coverLang.language}-kielellä.`;
  } else if (atsDetection.usesATS && score < 75) {
    warningMessage = `⚠️ Yritys todennäköisesti käyttää ATS:ää. Lisää näitä: ${missingCritical.slice(0, 5).join(', ')}`;
  } else if (!atsDetection.usesATS) {
    warningMessage = `✅ Yritys ei todennäköisesti käytä ATS:ää.`;
  }

  console.log(`✅ ATS Analysis complete: ${score}% match`);

  return {
    exactMatches,
    synonymMatches,
    relatedMatches,
    missingCritical,
    languageMismatch,
    jobLanguage: jobLang.language,
    coverLetterLanguage: coverLang.language,
    warningMessage,
    score,
    atsDetection
  };
}