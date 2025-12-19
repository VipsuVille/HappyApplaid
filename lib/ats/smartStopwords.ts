// lib/ats/smartStopwords.ts - JSON KORJATTU

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { escapeTemplateString } from '../utils/escapeTemplate';

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
    ['system', `You are a universal ATS keyword validator. Each job is UNIQUE.

**MISSION:**
Filter keywords to find ONLY those that ATS systems scan for THIS SPECIFIC JOB.

**RULES:**
- NO predefined stopword lists
- NO assumptions
- USE semantic understanding for THIS job

**KEEP:**
- Technical/professional terms THIS field values
- Certifications THIS industry needs
- Skills THIS role requires

**REMOVE:**
- Articles/pronouns (ANY language)
- Generic verbs
- Filler words

**OUTPUT (no markdown, no triple braces):**
{
  "meaningful": ["keyword1"],
  "filtered": ["and"],
  "reasoning": {
    "keyword1": "Why kept"
  },
  "detectedLanguage": "finnish",
  "detectedIndustry": "tech"
}

Return JSON only.`],

    ['human', `Filter for THIS job:

**JOB:**
{jobDescription}

**KEYWORDS:**
{keywords}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      jobDescription: escapeTemplateString(jobDescription.substring(0, 1500)),
      keywords: escapeTemplateString(keywords.join(', '))
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ Filtered for ${parsed.detectedIndustry}: ${parsed.meaningful.length} meaningful`);
    
    return parsed;
  } catch (error) {
    console.error('❌ AI filtering failed:', error);
    
    return {
      meaningful: keywords.filter(k => k.length >= 3),
      filtered: keywords.filter(k => k.length < 3),
      reasoning: {},
      detectedLanguage: 'unknown',
      detectedIndustry: 'unknown'
    };
  }
}

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