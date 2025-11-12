// ============================================
// app/api/extract-keywords-ai/route.ts - KORJATTU
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
      ['system', `You are an expert in analyzing job postings across ALL industries and extracting ATS-critical keywords.

Your task: Extract EXACT keywords that an ATS (Applicant Tracking System) would scan for. These must be EXACTLY as written in the job posting.

RULES FOR ALL INDUSTRIES:
1. **Technical Skills/Certifications:**
   - IT: React, Python, AWS, Kubernetes
   - Healthcare: BLS, ACLS, IV Therapy, Patient Assessment
   - Construction: AutoCAD, Welding, OSHA Certified, Forklift License
   - Design: Adobe Photoshop, Figma, Color Theory, UX/UI
   - Transport: CDL Class A, HazMat, Logistics, Route Planning
   - Education: Curriculum Development, Classroom Management, Special Education
   - Hospitality: Food Safety, POS Systems, Customer Service

2. **Soft Skills (exact phrases):**
   - "problem-solving", "team collaboration", "leadership"
   - "ongelmanratkaisu", "tiimityö", "johtaminen"

3. **Required Qualifications:**
   - "Bachelor's degree in X"
   - "3+ years experience"
   - "Kandidaatin tutkinto"

4. **Industry-Specific Terms:**
   - Extract domain-specific terminology EXACTLY as written
   - Include licenses, certifications, methodologies

5. **Prioritization:**
   - Mark as "critical" if mentioned multiple times
   - Mark as "important" if in requirements section
   - Mark as "optional" if in "nice to have"

Return ONLY JSON:
{
  "keywords": [
    {
      "text": "exact keyword from posting",
      "category": "technical|soft|certification|qualification|domain_specific",
      "priority": "critical|important|optional",
      "context": "brief context from job posting"
    }
  ],
  "industry": "detected industry (IT, Healthcare, Construction, etc.)",
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

    return NextResponse.json({
      keywords: parsed.keywords || [],
      industry: parsed.industry || 'unknown',
      totalKeywords: parsed.totalKeywords || 0,
      
      // Vanha muoto yhteensopivuutta varten
      technical: parsed.keywords
        .filter((k: any) => k.category === 'technical')
        .map((k: any) => k.text),
      soft: parsed.keywords
        .filter((k: any) => k.category === 'soft')
        .map((k: any) => k.text),
      certifications: parsed.keywords
        .filter((k: any) => k.category === 'certification')
        .map((k: any) => k.text),
      qualifications: parsed.keywords
        .filter((k: any) => k.category === 'qualification')
        .map((k: any) => k.text),
      
      // Kriittiset avainsanat
      critical: parsed.keywords
        .filter((k: any) => k.priority === 'critical')
        .map((k: any) => k.text),
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
