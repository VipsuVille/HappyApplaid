// lib/langchain/realisticATSAnalyzer.ts
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

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
  missingCritical: string[];
  languageMismatch: boolean;
  jobLanguage: string;
  coverLetterLanguage: string;
  warningMessage?: string;
  score: number;
  atsDetection: ATSDetection;
}

/**
 * ✅ TUNNISTA KÄYTTÄÄKÖ YRITYS ATS:ÄÄ
 */
export async function detectATSUsage(jobDescription: string): Promise<ATSDetection> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an HR technology expert who analyzes job postings to detect ATS usage.

ATS (Applicant Tracking System) indicators:

STRONG ATS INDICATORS:
- "Apply through our portal/system/website"
- "Upload your resume to our career page"
- Mentions of Workday, Greenhouse, Lever, BambooHR, Taleo
- Very structured job description (bullet points, clear sections)
- "No phone calls/emails - apply online only"
- Large company (500+ employees)
- Multiple similar job postings
- "Keywords: React, Python, Docker" listed explicitly

NO ATS / HUMAN REVIEW INDICATORS:
- "Send CV to email@company.com"
- "Contact [Name] directly"
- Small company (<50 employees)
- Startup
- Personal/casual tone
- "We read every application personally"
- Local small business
- Creative/informal job description

Return JSON:
{
  "usesATS": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "indicators": {
    "hasATS": ["indicator1", "indicator2"],
    "noATS": ["indicator1"]
  },
  "companySize": "large|medium|small|unknown",
  "recommendation": "Specific advice"
}`],
    ["human", `Analyze this job posting for ATS usage:

{jobDescription}

Return JSON only.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({ jobDescription });
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('ATS detection failed:', error);
    return {
      usesATS: true, // Oletuksena että käyttää (safer)
      confidence: 0.5,
      reasoning: 'Could not determine',
      indicators: { hasATS: [], noATS: [] },
      companySize: 'unknown',
      recommendation: 'Optimize for ATS to be safe'
    };
  }
}

/**
 * ✅ REALISTINEN ATS-ANALYYSI (exact matching)
 */
export async function analyzeRealisticATS(
  jobDescription: string,
  coverLetterContent: string
): Promise<RealisticATSAnalysis> {
  
  // 1. Tunnista käyttääkö ATS:ää
  const atsDetection = await detectATSUsage(jobDescription);

  // 2. Tunnista kielet
  const jobLang = detectLanguageSimple(jobDescription);
  const coverLang = detectLanguageSimple(coverLetterContent);
  const languageMismatch = jobLang !== coverLang;

  // 3. Ekstraktoi avainsanat (täsmälliset)
  const keywords = extractExactKeywords(jobDescription);

  // 4. Tarkista täsmälliset matchit (case-insensitive)
  const coverLower = coverLetterContent.toLowerCase();
  const exactMatches: string[] = [];
  const missingCritical: string[] = [];

  keywords.forEach(keyword => {
    if (coverLower.includes(keyword.toLowerCase())) {
      exactMatches.push(keyword);
    } else {
      missingCritical.push(keyword);
    }
  });

  // 5. Laske pisteet
  const score = keywords.length > 0 
    ? Math.round((exactMatches.length / keywords.length) * 100)
    : 100;

  // 6. Varoitusviesti
  let warningMessage: string | undefined;
  if (languageMismatch) {
    warningMessage = `⚠️ KRIITTINEN: Työpaikkailmoitus on ${jobLang}-kielellä, ` +
      `mutta hakukirjeesi on ${coverLang}-kielellä. ` +
      `ATS-järjestelmä EI löydä avainsanoja! Kirjoita hakukirje ${jobLang}-kielellä.`;
  } else if (atsDetection.usesATS && score < 75) {
    warningMessage = `⚠️ Yritys todennäköisesti käyttää ATS-järjestelmää (${Math.round(atsDetection.confidence * 100)}% varmuus). ` +
      `Sinun pitää lisätä nämä TÄSMÄLLISET avainsanat: ${missingCritical.slice(0, 5).join(', ')}`;
  } else if (!atsDetection.usesATS) {
    warningMessage = `✅ Yritys ei todennäköisesti käytä ATS:ää (ihminen lukee hakemuksen). ` +
      `Voit keskittyä sisällön laatuun avainsanojen sijaan.`;
  }

  return {
    exactMatches,
    missingCritical,
    languageMismatch,
    jobLanguage: jobLang,
    coverLetterLanguage: coverLang,
    warningMessage,
    score,
    atsDetection
  };
}

// Helper: Yksinkertainen kielentunnistus
function detectLanguageSimple(text: string): string {
  const sample = text.toLowerCase().substring(0, 500);
  
  const finnishWords = ['ja', 'on', 'että', 'olla', 'kanssa', 'mutta', 'kuin', 'tämä'];
  const englishWords = ['the', 'and', 'to', 'of', 'in', 'for', 'with', 'is', 'that'];
  const swedishWords = ['och', 'är', 'att', 'för', 'med', 'som', 'på', 'det'];
  
  const finnishCount = finnishWords.filter(w => sample.includes(` ${w} `)).length;
  const englishCount = englishWords.filter(w => sample.includes(` ${w} `)).length;
  const swedishCount = swedishWords.filter(w => sample.includes(` ${w} `)).length;
  
  if (finnishCount > englishCount && finnishCount > swedishCount) return 'suomi';
  if (englishCount > finnishCount && englishCount > swedishCount) return 'englanti';
  if (swedishCount > finnishCount && swedishCount > englishCount) return 'ruotsi';
  
  return 'tuntematon';
}

// Helper: Ekstraktoi TÄSMÄLLISET avainsanat
function extractExactKeywords(jobDescription: string): string[] {
  const keywords: string[] = [];
  
  // Tekniset termit (React, Python, etc.)
  const techTerms = jobDescription.match(/\b(React|Python|JavaScript|TypeScript|Node\.?js|Docker|Kubernetes|AWS|Azure|Git|SQL|MongoDB|PostgreSQL|Java|C\+\+|C#|Ruby|PHP|Swift|Kotlin|Go|Rust)\b/gi);
  if (techTerms) keywords.push(...techTerms);
  
  // Fraasit lainausmerkeissä tai lihavoituna
  const quotedPhrases = jobDescription.match(/"([^"]+)"/g);
  if (quotedPhrases) {
    keywords.push(...quotedPhrases.map(p => p.replace(/"/g, '')));
  }
  
  // Bullet pointit (todennäköisesti tärkeitä)
  const bullets = jobDescription.match(/[-•]\s*([^\n]+)/g);
  if (bullets) {
    bullets.forEach(bullet => {
      const cleaned = bullet.replace(/[-•]\s*/, '').trim();
      if (cleaned.length > 5 && cleaned.length < 50) {
        keywords.push(cleaned);
      }
    });
  }
  
  // Poista duplikaatit
  return [...new Set(keywords)];
}
