// app/api/detect-ats/route.ts - REFAKTOROITU
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { detectATSUsageAI } from '@/lib/langchain/realisticATSAnalyzer';

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

    // ✅ KÄYTÄ JAETTUA FUNKTIOTA
    const result = await detectATSUsageAI(jobDescription);
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('ATS detection error:', error);
    return NextResponse.json(
      { error: 'ATS detection failed' },
      { status: 500 }
    );
  }
}