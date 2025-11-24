// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. app/api/extract-keywords-ai/route.ts - LISÄÄ SMART STOPWORDS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { filterKeywordsUniversal } from '@/lib/ats/smartStopwords';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobDescription } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: 'Job description required' },
        { status: 400 }
      );
    }

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.1,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an expert in analyzing job postings and extracting ATS-critical keywords.

Extract MEANINGFUL keywords that ATS systems actually scan for.

DO NOT EXTRACT:
- Articles: "the", "a", "an"
- Conjunctions: "and", "or", "but"
- Pronouns: "you", "we", "they"
- Generic verbs: "is", "are", "will", "should"
- Filler words: "maybe", "perhaps", "just"

EXTRACT:
- Technical skills: "React", "Python", "Excel"
- Certifications: "AWS Certified", "PMP", "BLS"
- Domain skills: "customer service", "problem-solving"
- Qualifications: "3+ years", "Bachelor's degree"

Return JSON:
{
  "keywords": [
    {
      "text": "exact keyword from posting",
      "category": "technical|soft|certification|qualification|domain_specific",
      "priority": "critical|important|optional",
      "context": "brief context"
    }
  ],
  "industry": "detected industry",
  "totalKeywords": number
}`],
      
      ['human', `Extract ATS keywords from this job posting:

{jobDescription}

Return JSON only.`]
    ]);

    const formatted = await prompt.formatMessages({ jobDescription });
    const result = await model.invoke(formatted);
    
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'Failed to parse keywords' },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const allKeywordTexts = parsed.keywords.map((k: any) => k.text);

    // ✅ SMART STOPWORDS FILTER (hybrid mode - nopea + tarkka)
    console.log(`🔍 Filtering ${allKeywordTexts.length} keywords...`);
    const filtered = await filterKeywordsUniversal(
      allKeywordTexts,
      jobDescription,
      'balanced' // TF-IDF + Heuristic (~50ms)
    );

    console.log(`✅ Valid keywords: ${filtered.meaningful.length}`);
    console.log(`❌ Filtered stopwords: ${filtered.filtered.length}`, filtered.filtered.slice(0, 10));

    // Pidä vain validit keywordit
    const validKeywords = parsed.keywords.filter((k: any) => 
      filtered.meaningful.includes(k.text)
    );

    return NextResponse.json({
      keywords: validKeywords,
      industry: parsed.industry || 'unknown',
      totalKeywords: validKeywords.length,
      
      // Yhteensopivuus vanhaan
      technical: validKeywords
        .filter((k: any) => k.category === 'technical')
        .map((k: any) => k.text),
      soft: validKeywords
        .filter((k: any) => k.category === 'soft')
        .map((k: any) => k.text),
      certifications: validKeywords
        .filter((k: any) => k.category === 'certification')
        .map((k: any) => k.text),
      qualifications: validKeywords
        .filter((k: any) => k.category === 'qualification')
        .map((k: any) => k.text),
      critical: validKeywords
        .filter((k: any) => k.priority === 'critical')
        .map((k: any) => k.text),
      
      // Debug-tieto
      filtered_stopwords: filtered.filtered,
      filter_method: filtered.reasoning
    });
  } catch (error) {
    console.error('AI keyword extraction error:', error);
    return NextResponse.json(
      { 
        error: 'Keyword extraction failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}