// lib/ats/synonymMatcher.ts - UNIVERSAALI SYNONYM MATCHING

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { escapeTemplateString } from '../utils/escapeTemplate';

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  matchType: 'exact' | 'synonym' | 'related' | 'partial' | 'none';
  foundAs?: string;
  confidence: number;
  reasoning: string;
}

/**
 * ✅ UNIVERSAALI AVAINSANAN LÖYTÄMINEN
 */
export async function findKeywordUniversal(
  keyword: string,
  coverLetterText: string,
  jobDescription?: string,
  language?: string
): Promise<KeywordMatch> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a semantic matching expert across ALL languages and industries.

**YOUR MISSION:**
Determine if a keyword (from job description) is present in cover letter text using semantic understanding.

**MATCHING TYPES:**
1. **EXACT**: Word-for-word match (confidence: 1.0)
2. **SYNONYM**: Different word, same meaning (confidence: 0.9)
3. **RELATED**: Closely related concept (confidence: 0.7)
4. **PARTIAL**: Part of keyword found (confidence: 0.5)
5. **NONE**: Not found (confidence: 0.0)

**CRITICAL RULES - ZERO HARDCODING:**
- Use SEMANTIC understanding, not string matching
- Consider context (job industry, language, professional level)
- Understand technical terms across ALL fields
- Recognize professional paraphrasing in ANY language
- NO predefined synonym lists

**EXAMPLES (adaptive to any field):**
- Job: "problem-solving" → Cover: "I solve challenges" → SYNONYM (0.9)
- Job: "teamwork" → Cover: "collaborative approach" → SYNONYM (0.85)
- Job: "customer service" → Cover: "helping clients" → SYNONYM (0.9)

**OUTPUT:**
{
  "keyword": "original keyword",
  "found": true/false,
  "matchType": "exact|synonym|related|partial|none",
  "foundAs": "actual text in cover letter",
  "confidence": 0.9,
  "reasoning": "Brief explanation"
}

Return JSON only.`],

    ['human', `Find this keyword using semantic AI understanding.

**KEYWORD TO FIND:**
{keyword}

**COVER LETTER TEXT:**
{coverLetterText}

**JOB CONTEXT (optional):**
{jobContext}

**LANGUAGE HINT:**
{languageHint}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
keyword: escapeTemplateString(keyword),
      coverLetterText: escapeTemplateString(coverLetterText.substring(0, 2000)),
      jobContext: escapeTemplateString(jobDescription?.substring(0, 500) || 'Not provided'),
      languageHint: escapeTemplateString(language || 'Auto-detect')
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    const match: KeywordMatch = JSON.parse(jsonMatch[0]);
    
    return match;
  } catch (error) {
    console.error('AI matching failed:', error);
    
    const lowerKeyword = keyword.toLowerCase();
    const lowerText = coverLetterText.toLowerCase();
    
    if (lowerText.includes(lowerKeyword)) {
      return {
        keyword,
        found: true,
        matchType: 'exact',
        foundAs: keyword,
        confidence: 1.0,
        reasoning: 'Fallback: Simple string match'
      };
    }
    
    return {
      keyword,
      found: false,
      matchType: 'none',
      confidence: 0.0,
      reasoning: 'Fallback: Not found'
    };
  }
}

/**
 * ✅ ANALYSOI USEITA AVAINSANOJA
 */
export async function analyzeKeywordsUniversal(
  keywords: string[],
  coverLetterText: string,
  jobDescription?: string,
  language?: string
): Promise<{
  exactMatches: KeywordMatch[];
  synonymMatches: KeywordMatch[];
  relatedMatches: KeywordMatch[];
  partialMatches: KeywordMatch[];
  missing: KeywordMatch[];
  overallScore: number;
  scoreBreakdown: {
    exact: number;
    synonyms: number;
    related: number;
    partial: number;
    missing: number;
  };
}> {
  console.log(`🔍 Analyzing ${keywords.length} keywords with AI...`);
  
  const matches = await Promise.all(
    keywords.map(keyword => 
      findKeywordUniversal(keyword, coverLetterText, jobDescription, language)
    )
  );
  
  // 4. Analysoi matchit TURVALLISESTI
  // Suodatetaan ensin pois mahdolliset epäonnistuneet matchit (null/undefined)
  const safeMatches = (matches || []).filter(m => m !== null && m !== undefined);
  
  const exactMatches = safeMatches.filter(m => m.matchType === 'exact');
  const synonymMatches = safeMatches.filter(m => m.matchType === 'synonym');
  const relatedMatches = safeMatches.filter(m => m.matchType === 'related');
  const partialMatches = safeMatches.filter(m => m.matchType === 'partial');
  const missing = safeMatches.filter(m => m.matchType === 'none');
  
  // Lasketaan pisteet varmistaen, ettei jaeta nollalla
  const totalConfidence = safeMatches.reduce((sum, m) => sum + (m.confidence || 0), 0);
  const overallScore = keywords.length > 0 
    ? Math.round((totalConfidence / keywords.length) * 100)
    : 0;
  
  console.log(`✅ Analysis complete: ${overallScore}% match`);
  
  return {
    exactMatches,
    synonymMatches,
    relatedMatches,
    partialMatches,
    missing,
    overallScore,
    scoreBreakdown: {
      exact: exactMatches.length,
      synonyms: synonymMatches.length,
      related: relatedMatches.length,
      partial: partialMatches.length,
      missing: missing.length
    }
  };
}

/**
 * ✅ USER-FRIENDLY SELITYS
 */
export function explainMatch(
  match: KeywordMatch, 
  language: 'finnish' | 'english' = 'finnish'
): string {
  const templates = {
    finnish: {
      exact: `✅ Täsmällinen: "${match.foundAs}"`,
      synonym: `✓ Synonyymi: "${match.foundAs}" (vastaa "${match.keyword}")`,
      related: `≈ Liittyvä: "${match.foundAs}" (liittyy: "${match.keyword}")`,
      partial: `⚠️ Osittainen: "${match.foundAs}" (lisää: "${match.keyword}")`,
      none: `❌ Ei löydy: "${match.keyword}"`
    },
    english: {
      exact: `✅ Exact match: "${match.foundAs}"`,
      synonym: `✓ Synonym: "${match.foundAs}" (matches "${match.keyword}")`,
      related: `≈ Related: "${match.foundAs}" (relates to "${match.keyword}")`,
      partial: `⚠️ Partial: "${match.foundAs}" (add full "${match.keyword}")`,
      none: `❌ Not found: "${match.keyword}"`
    }
  };
  
  return templates[language][match.matchType];
}