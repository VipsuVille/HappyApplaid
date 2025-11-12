// app/api/detect-ats/route.ts - KORJATTU
// ============================================
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

// ✅ NIMETTY EXPORT
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
      ['system', `You are an HR technology expert who analyzes job postings to detect ATS usage.

ATS (Applicant Tracking System) indicators:

STRONG ATS INDICATORS (usesATS: true):
- "Apply through our portal/system/website"
- "Upload your resume to our career page"
- Mentions of Workday, Greenhouse, Lever, BambooHR, Taleo, SmartRecruiters
- Very structured job description (numbered lists, clear sections)
- "No phone calls/emails - apply online only"
- Large company (500+ employees)
- Multiple identical job postings
- "Keywords:" section explicitly listed
- "Required qualifications" in strict bullet format
- Company is Fortune 500 or well-known corporation

NO ATS / HUMAN REVIEW INDICATORS (usesATS: false):
- "Send CV to email@company.com"
- "Contact [Name] directly at [phone/email]"
- Small company (<50 employees)
- Startup (especially early stage)
- Personal/casual tone ("we're a small team", "join our family")
- "We read every application personally"
- Local small business (restaurant, retail, etc.)
- Creative/informal job description
- Posted on LinkedIn by actual person (not company page)

Return ONLY JSON:
{
  "usesATS": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation in Finnish",
  "indicators": {
    "hasATS": ["indicator1", "indicator2"],
    "noATS": ["indicator1"]
  },
  "companySize": "large|medium|small|unknown",
  "recommendation": "Specific advice in Finnish"
}`],
      ['human', `Analyze this job posting:

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
      return NextResponse.json({
        usesATS: true,
        confidence: 0.5,
        reasoning: 'Ei voitu määrittää - oletetaan ATS käytössä varmuuden vuoksi',
        indicators: { hasATS: [], noATS: [] },
        companySize: 'unknown',
        recommendation: 'Optimoi ATS:lle varmuuden vuoksi'
      });
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error('ATS detection error:', error);
    return NextResponse.json(
      { 
        error: 'ATS detection failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}