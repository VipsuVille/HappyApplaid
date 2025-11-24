// lib/ats/smartStopwords.ts - UNIVERSAALI STOPWORD SUODATUS

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

/**
 * ✅ UNIVERSAALI AVAINSANOJEN SUODATUS - JOB-FIRST
 */
export async function filterKeywordsUniversal(
  keywords: string[],
  jobDescription: string,
  language?: string
): Promise<{
  meaningful: string[];
  filtered: string[];
  reasoning: Record<string, string>;
  detectedLanguage: string;
  detectedIndustry: string;
}> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a universal ATS keyword validator. Each job posting is UNIQUE from a DIFFERENT industry.

**YOUR MISSION:**
Filter keywords to find ONLY those that ATS systems would scan for THIS SPECIFIC JOB.

**STEP 1: ANALYZE THIS JOB**
What industry is this? What role level? What matters in THIS field?

**STEP 2: FILTER FOR THIS CONTEXT**
Keep only keywords relevant to THIS job's ATS system.

**CRITICAL RULES - ZERO HARDCODING:**
- DO NOT use predefined stopword lists
- DO NOT assume industry patterns (tech ≠ always coding)
- DO NOT assume language patterns
- USE semantic understanding of what matters for THIS role

**KEEP (ATS-relevant for THIS job):**
- Technical/professional terms THIS field values
- Certifications/licenses THIS industry needs
- Skills/expertise THIS role requires
- Qualifications THIS job mentions
- Industry-specific jargon for THIS field

**REMOVE (ATS-irrelevant universally):**
- Articles/pronouns/conjunctions (ANY language)
- Generic verbs without professional context
- Filler words
- Single characters or meaningless strings
- Common words with no value for THIS job

**NO PATTERN MATCHING:**
- Use semantic AI understanding
- Understand context of THIS job
- Recognize professional terminology through knowledge

**OUTPUT:**
{
  "meaningful": ["keyword1 relevant to THIS job", "keyword2"],
  "filtered": ["and", "the"],
  "reasoning": {
    "keyword1": "Why kept for THIS job",
    "the": "Generic article, no ATS value"
  },
  "detectedLanguage": "language",
  "detectedIndustry": "industry from THIS job"
}

Return JSON only.`],

    ['human', `Filter keywords for THIS SPECIFIC JOB using AI understanding.

**THIS JOB:**
{jobDescription}

**KEYWORDS TO VALIDATE:**
{keywords}

**LANGUAGE HINT:**
{languageHint}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      jobDescription: jobDescription.substring(0, 1500),
      keywords: keywords.join(', '),
      languageHint: language || 'Auto-detect'
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ AI filtered for ${parsed.detectedIndustry}:`);
    console.log(`   Language: ${parsed.detectedLanguage}`);
    console.log(`   Meaningful: ${parsed.meaningful.length}`);
    console.log(`   Filtered: ${parsed.filtered.length}`);
    
    return parsed;
  } catch (error) {
    console.error('AI filtering failed:', error);
    
    return {
      meaningful: keywords.filter(k => k.length >= 3),
      filtered: keywords.filter(k => k.length < 3),
      reasoning: {},
      detectedLanguage: 'unknown',
      detectedIndustry: 'unknown'
    };
  }
}

/**
 * ✅ CACHED VERSION
 */
const filterCache = new Map<string, any>();

export async function filterKeywordsCached(
  keywords: string[],
  jobDescription: string,
  language?: string
): Promise<ReturnType<typeof filterKeywordsUniversal>> {
  const cacheKey = `${jobDescription.substring(0, 100)}_${keywords.join('_')}`;
  
  if (filterCache.has(cacheKey)) {
    console.log('💾 Using cached filter result');
    return filterCache.get(cacheKey);
  }
  
  const result = await filterKeywordsUniversal(keywords, jobDescription, language);
  filterCache.set(cacheKey, result);
  
  return result;
}

/**
 * ✅ BATCH PROCESSING
 */
export async function filterKeywordsBatch(
  batches: Array<{ keywords: string[]; jobDescription: string }>,
  language?: string
): Promise<Array<Awaited<ReturnType<typeof filterKeywordsUniversal>>>> {
  return Promise.all(
    batches.map(batch => 
      filterKeywordsUniversal(batch.keywords, batch.jobDescription, language)
    )
  );
}