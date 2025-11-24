// app/api/analyze-ats-realistic/route.ts - KORJATTU

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { analyzeRealisticATSUniversal } from '@/lib/langchain/realisticATSAnalyzer';

export async function POST(req: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { jobDescription, coverLetterContent } = await req.json();

    if (!jobDescription || !coverLetterContent) {
      return NextResponse.json(
        { error: 'Job description and cover letter content required' },
        { status: 400 }
      );
    }

    console.log('🔍 Analyzing ATS compatibility...');

    // ✅ KÄYTÄ UNIVERSAL ANALYZER
    const analysis = await analyzeRealisticATSUniversal(
      jobDescription,
      coverLetterContent
    );

    console.log(`✅ ATS Analysis complete: ${analysis.score}% match`);

    return NextResponse.json({
      success: true,
      ...analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ATS analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'ATS_ANALYSIS_FAILED',
        message: 'ATS-analyysi epäonnistui',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}