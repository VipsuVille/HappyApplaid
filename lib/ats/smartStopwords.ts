// lib/ats/smartStopwords.ts - TEMPLATE ESCAPING KORJATTU

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

  // ✅ KRIITTINEN KORJAUS: Ei JSON-esimerkkejä template-promptissa!
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

**CRITICAL: Return ONLY valid JSON with these exact fields:**
- meaningful: array of strings
- filtered: array of strings  
- reasoning: object with string keys and values
- detectedLanguage: string
- detectedIndustry: string

No markdown, no backticks, no extra text. Pure JSON only.`],

    ['human', `Filter for THIS job:

**JOB:**
{jobDescription}

**KEYWORDS:**
{keywords}

Return pure JSON with fields: meaningful, filtered, reasoning, detectedLanguage, detectedIndustry`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      jobDescription: escapeTemplateString(jobDescription.substring(0, 1500)),
      keywords: escapeTemplateString(keywords.join(', '))
    });

    const result = await model.invoke(formatted);
    
    let content: string;
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('');
    } else {
      content = JSON.stringify(result.content);
    }

    content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.error('❌ No JSON found in response:', content.substring(0, 200));
      throw new Error('No JSON found in AI response');
    }

    const jsonString = jsonMatch[0];
    if (jsonString.length < 20) {
      console.error('❌ JSON too short:', jsonString);
      throw new Error('Incomplete JSON response');
    }

    const parsed = JSON.parse(jsonString);
    
    if (!parsed.meaningful || !Array.isArray(parsed.meaningful)) {
      console.error('❌ Invalid JSON structure:', parsed);
      throw new Error('Invalid response structure');
    }
    
    console.log(`✅ Filtered for ${parsed.detectedIndustry}: ${parsed.meaningful.length} meaningful`);
    
    return {
      meaningful: parsed.meaningful || [],
      filtered: parsed.filtered || [],
      reasoning: parsed.reasoning || {},
      detectedLanguage: parsed.detectedLanguage || 'unknown',
      detectedIndustry: parsed.detectedIndustry || 'unknown'
    };
    
  } catch (error) {
    console.error('❌ AI filtering failed:', error);
    
    const fallbackMeaningful = keywords.filter(k => {
      const cleaned = k.trim().toLowerCase();
      const commonStopwords = ['and', 'the', 'or', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'ja', 'tai', 'on', 'ei'];
      return cleaned.length >= 3 && !commonStopwords.includes(cleaned);
    });
    
    return {
      meaningful: fallbackMeaningful,
      filtered: keywords.filter(k => !fallbackMeaningful.includes(k)),
      reasoning: {},
      detectedLanguage: language || 'unknown',
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