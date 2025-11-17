// lib/ats/smartStopwords.ts - ÄLYKÄS STOP WORDS (3 menetelmää)

/**
 * ✅ RATKAISU 1: AI PÄÄTTÄÄ (Paras mutta hitain)
 */
export async function filterKeywordsWithAI(
  keywords: string[],
  jobDescription: string
): Promise<{
  meaningful: string[];
  filtered: string[];
}> {
  const { ChatOpenAI } = await import('@langchain/openai');
  const { ChatPromptTemplate } = await import('@langchain/core/prompts');
  
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0, // Zero creativity
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an ATS keyword validator.

Your task: Filter out MEANINGLESS keywords that ATS systems would NEVER scan for.

KEEP (meaningful):
- Technical skills: "React", "Python", "Excel", "Photoshop"
- Certifications: "AWS Certified", "PMP", "BLS"
- Domain expertise: "customer service", "project management"
- Specific qualifications: "3+ years", "Bachelor's degree"
- Action skills: "problem-solving", "leadership", "communication"

REMOVE (meaningless):
- Articles: "the", "a", "an"
- Conjunctions: "and", "or", "but"
- Pronouns: "you", "we", "they"
- Generic verbs: "is", "are", "will", "should", "can"
- Filler words: "maybe", "perhaps", "just", "very"
- One-letter words or numbers alone: "a", "1", "2"

Return JSON:
{
  "meaningful": ["keyword1", "keyword2", ...],
  "filtered": ["and", "the", ...]
}`],
    ['human', `Job description context:
{jobDescription}

Keywords to validate:
{keywords}

Which are meaningful for ATS? Return JSON only.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      jobDescription: jobDescription.substring(0, 500), // Context only
      keywords: keywords.join(', ')
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('AI filter failed, using fallback:', error);
    // Fallback to heuristic
    return filterKeywordsHeuristic(keywords);
  }
}

/**
 * ✅ RATKAISU 2: HEURISTINEN + POS TAGGING (Nopea ja hyvä)
 */
export function filterKeywordsHeuristic(keywords: string[]): {
  meaningful: string[];
  filtered: string[];
} {
  const meaningful: string[] = [];
  const filtered: string[] = [];

  // Baseline stop words (vain kaikkein yleisin 50 sanaa)
  const basicStopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'is', 'are', 'was', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can',
    'shall', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'them', 'their',
    'this', 'that', 'these', 'those'
  ]);

  keywords.forEach(keyword => {
    const lower = keyword.toLowerCase().trim();
    
    // 1. Liian lyhyt (< 2 merkkiä)
    if (lower.length < 2) {
      filtered.push(keyword);
      return;
    }
    
    // 2. Pelkkä numero
    if (/^\d+$/.test(lower)) {
      filtered.push(keyword);
      return;
    }
    
    // 3. Basic stop word
    if (basicStopWords.has(lower)) {
      filtered.push(keyword);
      return;
    }
    
    // 4. ✅ TEKNINEN TERMI → AINA PIDÄ
    if (isTechnicalTerm(keyword)) {
      meaningful.push(keyword);
      return;
    }
    
    // 5. ✅ SISÄLTÄÄ ISOJA KIRJAIMIA KESKELLÄ → TODENNÄKÖISESTI TÄRKEÄ
    // Esim: "PowerPoint", "JavaScript", "LinkedIn"
    if (/[a-z][A-Z]/.test(keyword)) {
      meaningful.push(keyword);
      return;
    }
    
    // 6. ✅ SISÄLTÄÄ PISTEITÄ/VIIVOJA → TEKNINEN
    // Esim: "Node.js", "C++", "MS-Office"
    if (/[.\-+#]/.test(keyword)) {
      meaningful.push(keyword);
      return;
    }
    
    // 7. ✅ FRAASI (2+ sanaa) → TODENNÄKÖISESTI TÄRKEÄ
    // Esim: "customer service", "problem solving"
    if (keyword.split(/\s+/).length >= 2) {
      // Tarkista ettei OLE pelkkiä stop words
      const words = keyword.toLowerCase().split(/\s+/);
      const meaningfulWords = words.filter(w => !basicStopWords.has(w));
      
      if (meaningfulWords.length > 0) {
        meaningful.push(keyword);
      } else {
        filtered.push(keyword);
      }
      return;
    }
    
    // 8. ✅ PITUUS 3+ MERKKIÄ JA EI STOP WORD → PIDÄ
    if (lower.length >= 3) {
      meaningful.push(keyword);
      return;
    }
    
    // 9. Muuten suodata
    filtered.push(keyword);
  });

  return { meaningful, filtered };
}

function isTechnicalTerm(word: string): boolean {
  const technicalPatterns = [
    // Ohjelmointi
    /^(React|Vue|Angular|Python|Java|JavaScript|TypeScript|C\+\+|C#|PHP|Ruby|Swift|Kotlin|Go|Rust|Scala)$/i,
    // Teknologiat
    /^(Node\.?js|Docker|Kubernetes|AWS|Azure|GCP|SQL|MongoDB|PostgreSQL|Redis|GraphQL|REST|API|Git|CI\/CD|DevOps)$/i,
    // Design
    /^(Photoshop|Illustrator|Figma|Sketch|InDesign|XD|Blender|Maya|AutoCAD|SolidWorks|Premiere|After Effects)$/i,
    // Business
    /^(Excel|PowerPoint|Word|Outlook|Salesforce|SAP|Oracle|HubSpot|Zendesk|Jira|Confluence|Slack|Teams)$/i,
    // Sertifikaatit
    /^(AWS|Azure|Google|CCNA|CISSP|PMP|ITIL|Six Sigma|CPA|CFA|SHRM|PHR|Certified)$/i,
  ];

  return technicalPatterns.some(pattern => pattern.test(word));
}

/**
 * ✅ RATKAISU 3: TF-IDF SCORING (Tilastollinen, paras tarkkuus)
 * Avainsana on tärkeä JOS se esiintyy usein JOB DESCRIPTION:ssa
 * MUTTA harvoin yleisessä kielessä
 */
export function filterKeywordsWithTFIDF(
  keywords: string[],
  jobDescription: string
): {
  meaningful: string[];
  filtered: string[];
  scores: Map<string, number>;
} {
  const meaningful: string[] = [];
  const filtered: string[] = [];
  const scores = new Map<string, number>();

  // Laske TF (Term Frequency) job description:sta
  const jobWords = jobDescription.toLowerCase().split(/\s+/);
  const jobWordCount = jobWords.length;
  
  const termFrequency = new Map<string, number>();
  jobWords.forEach(word => {
    termFrequency.set(word, (termFrequency.get(word) || 0) + 1);
  });

  // IDF (Inverse Document Frequency) arvot yleiselle kielelle
  // Mitä KORKEAMPI luku, sitä harvinaisempi sana → todennäköisesti tärkeä
  const idfScores: Record<string, number> = {
    // Hyvin yleiset (matala IDF)
    'the': 0.1, 'and': 0.1, 'is': 0.1, 'to': 0.1, 'a': 0.1,
    'in': 0.2, 'for': 0.2, 'with': 0.2, 'on': 0.2,
    
    // Kohtalaiset (keskitaso IDF)
    'work': 0.5, 'experience': 0.5, 'skills': 0.6, 'team': 0.6,
    
    // Spesifit termit (korkea IDF) - oletusarvo kaikille tuntemattomille
    // "Excel", "React", jne. saavat 1.0 (maksimi)
  };

  keywords.forEach(keyword => {
    const lower = keyword.toLowerCase();
    
    // TF: Kuinka usein esiintyy job description:ssa
    const tf = (termFrequency.get(lower) || 0) / jobWordCount;
    
    // IDF: Kuinka harvinainen yleisessä kielessä
    const idf = idfScores[lower] || 1.0; // Tuntematon = tärkeä
    
    // TF-IDF score
    const tfidf = tf * idf;
    scores.set(keyword, tfidf);
    
    // Jos TF-IDF > 0.001 → Tärkeä
    if (tfidf > 0.001 || isTechnicalTerm(keyword)) {
      meaningful.push(keyword);
    } else {
      filtered.push(keyword);
    }
  });

  return { meaningful, filtered, scores };
}

/**
 * ✅ PÄÄMENETELMÄ: YHDISTÄ KAIKKI (HYBRID)
 */
export async function smartFilterKeywords(
  keywords: string[],
  jobDescription: string,
  mode: 'fast' | 'balanced' | 'accurate' = 'balanced'
): Promise<{
  meaningful: string[];
  filtered: string[];
  method: string;
}> {
  switch (mode) {
    case 'fast':
      // Pelkkä heuristiikka (< 10ms)
      const fast = filterKeywordsHeuristic(keywords);
      return { ...fast, method: 'heuristic' };
    
    case 'accurate':
      // AI-pohjainen (500-1000ms)
      const accurate = await filterKeywordsWithAI(keywords, jobDescription);
      return { ...accurate, method: 'ai' };
    
    case 'balanced':
    default:
      // Hybrid: TF-IDF + heuristiikka (50-100ms)
      const tfidf = filterKeywordsWithTFIDF(keywords, jobDescription);
      const heuristic = filterKeywordsHeuristic(tfidf.meaningful);
      
      return {
        meaningful: heuristic.meaningful,
        filtered: [...tfidf.filtered, ...heuristic.filtered],
        method: 'tfidf+heuristic'
      };
  }
}

/**
 * ✅ TESTIFUNKTIO
 */
export async function testSmartFiltering() {
  const keywords = [
    "React",              // ✅ Tekninen
    "and",                // ❌ Stop word
    "customer service",   // ✅ Fraasi
    "the",                // ❌ Stop word
    "problem-solving",    // ✅ Tärkeä taito
    "is",                 // ❌ Stop word
    "3+ years",           // ✅ Kvalifikaatio
    "maybe",              // ❌ Filler
    "Excel",              // ✅ Tekninen
    "Node.js",            // ✅ Tekninen (piste mukana)
  ];

  const jobDescription = `
    We are looking for a React developer with 3+ years of experience.
    You should have excellent customer service and problem-solving skills.
    Experience with Excel and Node.js is a plus.
  `;

  console.log('🧪 Testing Smart Filtering:\n');

  // Test 1: Fast (Heuristic)
  console.log('1. FAST (Heuristic):');
  const fast = await smartFilterKeywords(keywords, jobDescription, 'fast');
  console.log('✅ Meaningful:', fast.meaningful);
  console.log('❌ Filtered:', fast.filtered);
  console.log(`Time: ~10ms\n`);

  // Test 2: Balanced (TF-IDF + Heuristic)
  console.log('2. BALANCED (TF-IDF + Heuristic):');
  const balanced = await smartFilterKeywords(keywords, jobDescription, 'balanced');
  console.log('✅ Meaningful:', balanced.meaningful);
  console.log('❌ Filtered:', balanced.filtered);
  console.log(`Time: ~50ms\n`);

  // Test 3: Accurate (AI)
  console.log('3. ACCURATE (AI):');
  const accurate = await smartFilterKeywords(keywords, jobDescription, 'accurate');
  console.log('✅ Meaningful:', accurate.meaningful);
  console.log('❌ Filtered:', accurate.filtered);
  console.log(`Time: ~800ms\n`);

  return { fast, balanced, accurate };
}

// testSmartFiltering();