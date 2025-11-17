// lib/ats/synonymMatcher.ts - MONIKIELINEN SYNONYYMIEN MATCHING

/**
 * ✅ ATS-järjestelmät ymmärtävät usein synonyymejä
 * Tämä auttaa käyttäjää ymmärtämään mitä avainsanoja hakukirjeessä JO ON
 */

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  exactMatch?: string;        // "React" löytyi sellaisenaan
  synonymMatch?: string;      // "ongelmanratkaisu" → "problem-solving"
  partialMatch?: string;      // "tiimityö" sisältää "tiimi"
  confidence: number;         // 0-1
}

/**
 * SYNONYYMISANAKIRJA (monikielinen)
 */
const SYNONYM_DATABASE: Record<string, string[]> = {
  // Problem solving
  'problem-solving': [
    'ongelmanratkaisu', 'ongelmanratkaisutaidot', 'ratkaise ongelmia',
    'problemlösning', 'lösa problem',
    'ratkaista haasteita', 'haasteiden ratkaisu'
  ],
  'problem solving': [
    'ongelmanratkaisu', 'ongelmien ratkaisu',
    'problemlösning'
  ],
  
  // Teamwork
  'teamwork': [
    'tiimityö', 'tiimityötaidot', 'ryhmätyö', 'yhteistyö',
    'lagarbete', 'samarbete',
    'tiimin jäsen', 'tiimissä toimiminen'
  ],
  'team collaboration': [
    'tiimityö', 'yhteistyö tiimissä',
    'lagsamarbete'
  ],
  
  // Leadership
  'leadership': [
    'johtaminen', 'johtamistaidot', 'johtajuus',
    'ledarskap', 'ledning'
  ],
  'lead': [
    'johtaa', 'vetää', 'vastuussa',
    'leda', 'ansvara'
  ],
  
  // Communication
  'communication': [
    'viestintä', 'kommunikaatio', 'viestintätaidot',
    'kommunikation', 'kommunicera'
  ],
  'customer service': [
    'asiakaspalvelu', 'asiakaspalvelutaidot',
    'kundservice', 'kundtjänst'
  ],
  
  // Technical
  'React': ['React.js', 'ReactJS', 'React-kehitys'],
  'Python': ['Python-ohjelmointi', 'Python-kieli'],
  'Excel': ['Excel-ohjelma', 'Microsoft Excel', 'Excelin käyttö'],
  'CRM': ['CRM-järjestelmä', 'CRM-järjestelmät', 'asiakkuudenhallinta'],
  
  // Experience levels
  'experience': [
    'kokemus', 'kokemusta', 'työkokemus',
    'erfarenhet', 'erfaring'
  ],
  '3+ years': [
    '3 vuotta', 'kolmen vuoden', 'yli 3 vuotta',
    '3 år', 'över 3 år'
  ],
  
  // Education
  "Bachelor's degree": [
    'kandidaatin tutkinto', 'AMK-tutkinto', 'alempi korkeakoulututkinto',
    'kandidatexamen'
  ],
  "Master's degree": [
    'maisterin tutkinto', 'ylempi korkeakoulututkinto',
    'magisterexamen', 'masterexamen'
  ],
};

/**
 * ✅ ETSI AVAINSANA TEKSTISTÄ (mukaan lukien synonyymit)
 */
export function findKeywordInText(
  keyword: string,
  text: string,
  language: 'english' | 'finnish' | 'swedish' = 'english'
): KeywordMatch {
  const lowerKeyword = keyword.toLowerCase();
  const lowerText = text.toLowerCase();
  
  // 1. TÄSMÄLLINEN MATCH
  if (lowerText.includes(lowerKeyword)) {
    return {
      keyword,
      found: true,
      exactMatch: keyword,
      confidence: 1.0
    };
  }
  
  // 2. SYNONYYMI MATCH
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
  
  // 3. OSITTAINEN MATCH (esim. "team" löytyy "teamwork"-sanasta)
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
  
  // 4. EI LÖYDY
  return {
    keyword,
    found: false,
    confidence: 0
  };
}

/**
 * ✅ ANALYSOI KAIKKI AVAINSANAT
 */
export function analyzeKeywords(
  keywords: string[],
  coverLetterText: string,
  language: 'english' | 'finnish' | 'swedish' = 'english'
): {
  exactMatches: KeywordMatch[];
  synonymMatches: KeywordMatch[];
  partialMatches: KeywordMatch[];
  missing: KeywordMatch[];
  overallScore: number;
} {
  const results = keywords.map(kw => findKeywordInText(kw, coverLetterText, language));
  
  const exactMatches = results.filter(r => r.exactMatch);
  const synonymMatches = results.filter(r => r.synonymMatch);
  const partialMatches = results.filter(r => r.partialMatch);
  const missing = results.filter(r => !r.found);
  
  // Laske kokonaispisteet (painotettu)
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

/**
 * ✅ KÄYTTÄJÄYSTÄVÄLLINEN SELITYS
 */
export function explainMatch(match: KeywordMatch, language: 'finnish' | 'english' = 'finnish'): string {
  if (match.exactMatch) {
    return language === 'finnish' 
      ? `✅ Löytyy täsmälleen: "${match.exactMatch}"`
      : `✅ Exact match: "${match.exactMatch}"`;
  }
  
  if (match.synonymMatch) {
    return language === 'finnish'
      ? `✓ Synonyymi löytyy: "${match.synonymMatch}" (vastaa "${match.keyword}")`
      : `✓ Synonym found: "${match.synonymMatch}" (matches "${match.keyword}")`;
  }
  
  if (match.partialMatch) {
    return language === 'finnish'
      ? `⚠️ Osittainen: "${match.partialMatch}" (lisää koko termi "${match.keyword}")`
      : `⚠️ Partial: "${match.partialMatch}" (add full term "${match.keyword}")`;
  }
  
  return language === 'finnish'
    ? `❌ Ei löydy: "${match.keyword}"`
    : `❌ Not found: "${match.keyword}"`;
}

/**
 * ✅ TESTIFUNKTIO
 */
export function testSynonymMatching() {
  const coverLetter = `
    Olen kokenut asiakaspalvelija jolla on vahvat ongelmanratkaisutaidot.
    Työskentelen mielellään tiimissä ja osaan käyttää CRM-järjestelmiä.
    Minulla on 3 vuoden työkokemus ja kandidaatin tutkinto.
  `;
  
  const keywords = [
    'customer service',
    'problem-solving',
    'teamwork',
    'CRM',
    '3+ years',
    "Bachelor's degree",
    'React',  // Ei löydy
  ];
  
  console.log('🧪 Testing synonym matching:\n');
  
  const results = analyzeKeywords(keywords, coverLetter, 'finnish');
  
  console.log(`📊 Overall Score: ${results.overallScore}%\n`);
  
  console.log('✅ Exact matches:', results.exactMatches.length);
  results.exactMatches.forEach(m => console.log(`  - ${explainMatch(m)}`));
  
  console.log('\n✓ Synonym matches:', results.synonymMatches.length);
  results.synonymMatches.forEach(m => console.log(`  - ${explainMatch(m)}`));
  
  console.log('\n⚠️ Partial matches:', results.partialMatches.length);
  results.partialMatches.forEach(m => console.log(`  - ${explainMatch(m)}`));
  
  console.log('\n❌ Missing:', results.missing.length);
  results.missing.forEach(m => console.log(`  - ${explainMatch(m)}`));
  
  return results;
}

// testSynonymMatching();