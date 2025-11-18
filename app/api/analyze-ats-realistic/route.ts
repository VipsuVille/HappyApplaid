// app/api/analyze-ats-realistic/route.ts - REFAKTOROITU
import { NextResponse } from 'next/server';
import { analyzeRealisticATS } from '@/lib/langchain/realisticATSAnalyzer';
import { analyzeKeywords } from '@/lib/ats/synonymMatcher';

export async function POST(req: Request) {
  try {
    const { jobDescription, coverLetterContent } = await req.json();
    
    // ✅ KÄYTÄ JAETTUA FUNKTIOTA
    const analysis = await analyzeRealisticATS(jobDescription, coverLetterContent);
    
    // ✅ SYNONYM MATCHING (käytetään yhä synonymMatcher.ts:ää)
    const synonymAnalysis = analyzeKeywords(
      analysis.exactMatches, 
      coverLetterContent
    );
    
    return NextResponse.json({
      ...analysis,
      synonymMatches: synonymAnalysis.synonymMatches,
      partialMatches: synonymAnalysis.partialMatches,
      analysis: {
        exact: synonymAnalysis.exactMatches.length,
        synonyms: synonymAnalysis.synonymMatches.length,
        partial: synonymAnalysis.partialMatches.length,
        missing: synonymAnalysis.missing.length,
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}