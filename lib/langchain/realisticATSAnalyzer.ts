  // lib/langchain/realisticATSAnalyzer.ts

  import { ChatOpenAI } from '@langchain/openai';
  import { ChatPromptTemplate } from '@langchain/core/prompts';
  import { detectLanguageWithAI } from './languageDetector';
  import { analyzeKeywordsUniversal } from '../ats/synonymMatcher';
import { escapeTemplateString } from '../utils/escapeTemplate';

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
   * ✅ TUNNISTA KÄYTTÄÄKÖ ATS:ÄÄ - 100% AI
   * Ei kovakoodattuja indikaattoreita
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
  Determine if company uses Applicant Tracking System (ATS) using AI understanding of:
  - Company size and structure
  - Recruitment patterns
  - Application process indicators
  - Industry norms globally

  **USE AI UNDERSTANDING (NO HARDCODED PATTERNS):**
  - Large companies (500+) usually use ATS
  - Startups and small businesses often don't
  - Application portals suggest ATS
  - Direct email applications suggest human review
  - Industry matters (tech/finance = likely ATS, local retail = unlikely)

  **STRONG ATS INDICATORS:**
  - Mentions of career portals/systems
  - Named ATS platforms (Workday, Greenhouse, etc.)
  - Very structured job descriptions
  - "Apply online only"
  - Multiple similar postings
  - Large corporation

  **NO ATS INDICATORS:**
  - Email applications
  - Direct contact person mentioned
  - Casual/personal tone
  - Small local business
  - "Send CV to..."
  - Creative/informal posting

  **OUTPUT:**
  {
    "usesATS": true/false,
    "confidence": 0.0-1.0,
    "reasoning": "AI reasoning based on context",
    "indicators": {
      "hasATS": ["indicator1", "indicator2"],
      "noATS": ["indicator1"]
    },
    "companySize": "large|medium|small|unknown",
    "recommendation": "Specific advice in job's language"
  }`],

      ['human', `**JOB POSTING:**
  {jobDescription}

  Analyze using AI understanding. Return JSON only.`]
    ]);

    try {
const formatted = await prompt.formatMessages({ 
        jobDescription: escapeTemplateString(jobDescription) 
      });      const result = await model.invoke(formatted);
      const content = typeof result.content === 'string' 
        ? result.content 
        : JSON.stringify(result.content);

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON');

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.error('ATS detection failed:', error);
      
      // Conservative fallback: Assume ATS (safer)
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
   * ✅ EKSTRAKTOI AVAINSANAT - 100% AI
   * Ei kovakoodattuja regex-patternejä
   */
  async function extractKeywordsAI(jobDescription: string): Promise<string[]> {
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4o-mini',
      temperature: 0.0,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ATS keyword extraction expert.

  **YOUR MISSION:**
  Extract CRITICAL keywords that ATS systems scan for. Use AI understanding of:
  - Professional terminology in ANY language
  - Industry-specific jargon
  - Technical requirements
  - Qualifications and certifications

  **EXTRACT:**
  - Technical skills (use AI knowledge of what matters)
  - Certifications/licenses
  - Required experience levels
  - Education requirements
  - Soft skills (if emphasized)
  - Tools/software mentioned

  **CRITICAL RULES:**
  - Use SEMANTIC understanding, not pattern matching
  - Understand context and industry
  - Keep original terminology (don't translate technical terms)
  - Prioritize explicit requirements over nice-to-haves

  **OUTPUT:**
  {
    "keywords": ["keyword1", "keyword2", ...],
    "priority": {
      "critical": ["keyword1"],
      "important": ["keyword2"],
      "optional": ["keyword3"]
    }
  `],

      ['human', `**JOB DESCRIPTION:**
  {jobDescription}

  Extract ATS keywords. Return JSON only.`]
    ]);

    try {
const formatted = await prompt.formatMessages({ 
        jobDescription: escapeTemplateString(jobDescription) 
      });      const result = await model.invoke(formatted);
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
   * ✅ REALISTINEN ATS-ANALYYSI - 100% AI
   */
  export async function analyzeRealisticATSUniversal(
    jobDescription: string,
    coverLetterContent: string
  ): Promise<RealisticATSAnalysis> {
    console.log('🔍 Starting universal ATS analysis...');

    // 1. Tunnista käyttääkö ATS:ää
    const atsDetection = await detectATSUsageAI(jobDescription);
    console.log(`ATS Detection: ${atsDetection.usesATS ? 'YES' : 'NO'} (${Math.round(atsDetection.confidence * 100)}%)`);

    // 2. Tunnista kielet (AI)
    const [jobLang, coverLang] = await Promise.all([
      detectLanguageWithAI(jobDescription),
      detectLanguageWithAI(coverLetterContent)
    ]);

    const languageMismatch = jobLang.language !== coverLang.language;
    console.log(`Languages: Job=${jobLang.language}, Cover=${coverLang.language}`);

    // 3. Ekstraktoi avainsanat (AI)
    const keywords = await extractKeywordsAI(jobDescription);
    console.log(`Extracted ${keywords.length} keywords`);
  // Määritellään, miltä yhden match-objektin pitäisi näyttää
  interface KeywordMatch {
    keyword: string;
    [key: string]: any; // Sallii muutkin kentät, jos niitä on
  }

  // Määritellään koko analyysin vastausrakenne
  interface UniversalAnalysisResult {
    exactMatches: KeywordMatch[];
    synonymMatches: KeywordMatch[];
    relatedMatches: KeywordMatch[];
    missing: KeywordMatch[];
    overallScore: number;
  }
  // 4. Analysoi matchit (AI)
    // HUOM: Lisätty "as UniversalAnalysisResult"
    const analysis = await analyzeKeywordsUniversal(
      keywords,
      coverLetterContent,
      jobDescription,
      coverLang.language
    ) as UniversalAnalysisResult;

    // Nyt TypeScript tietää, että m:llä on ominaisuus .keyword
    const exactMatches = analysis.exactMatches.map(m => m.keyword);
    const synonymMatches = analysis.synonymMatches.map(m => m.keyword);
    const relatedMatches = analysis.relatedMatches.map(m => m.keyword);
    const missingCritical = analysis.missing.map(m => m.keyword);
    // 5. Laske pisteet
    const score = analysis.overallScore;

    // 6. Varoitusviesti
    let warningMessage: string | undefined;
    if (languageMismatch) {
      warningMessage = `⚠️ KRIITTINEN: Työpaikkailmoitus on ${jobLang.language}-kielellä, ` +
        `mutta hakukirjeesi on ${coverLang.language}-kielellä. ` +
        `ATS-järjestelmä EI löydä avainsanoja!`;
    } else if (atsDetection.usesATS && score < 75) {
      warningMessage = `⚠️ Yritys todennäköisesti käyttää ATS:ää (${Math.round(atsDetection.confidence * 100)}%). ` +
        `Lisää nämä avainsanat: ${missingCritical.slice(0, 5).join(', ')}`;
    } else if (!atsDetection.usesATS) {
      warningMessage = `✅ Yritys ei todennäköisesti käytä ATS:ää. ` +
        `Keskity sisällön laatuun avainsanojen sijaan.`;
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