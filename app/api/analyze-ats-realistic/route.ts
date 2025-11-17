// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. app/api/analyze-ats-realistic/route.ts - LISÄÄ SYNONYMS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { NextResponse } from 'next/server';
import { analyzeKeywords } from '@/lib/ats/synonymMatcher';

function detectLanguageSimple(text: string): string {
  const sample = text.toLowerCase().substring(0, 500);
  
  const finnishWords = ['ja', 'on', 'että', 'olla', 'kanssa', 'mutta', 'kuin', 'tämä', 'olen', 'minä'];
  const englishWords = ['the', 'and', 'to', 'of', 'in', 'for', 'with', 'is', 'that', 'this'];
  
  const finnishCount = finnishWords.filter(w => sample.includes(` ${w} `)).length;
  const englishCount = englishWords.filter(w => sample.includes(` ${w} `)).length;
  
  if (finnishCount > englishCount) return 'suomi';
  if (englishCount > finnishCount) return 'englanti';
  return 'tuntematon';
}

async function extractKeywordsWithAI(jobDescription: string): Promise<{
  keywords: string[];
  success: boolean;
  method: 'ai' | 'fallback';
}> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${baseUrl}/api/extract-keywords-ai`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.INTERNAL_API_KEY || 'internal'}` // Sisäinen kutsu
      },
      body: JSON.stringify({ jobDescription }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) throw new Error(`AI extraction failed: ${response.status}`);

    const data = await response.json();
    
    // ✅ Stop words on jo suodatettu extract-keywords-ai:ssa
    const allKeywords = [
      ...(data.critical || []),
      ...(data.technical || []),
      ...(data.soft || []),
      ...(data.certifications || []),
      ...(data.qualifications || []),
    ];

    if (allKeywords.length === 0) {
      throw new Error('No keywords extracted by AI');
    }

    return {
      keywords: allKeywords,
      success: true,
      method: 'ai'
    };
  } catch (error) {
    console.error('⚠️ AI keyword extraction failed:', error);
    return {
      keywords: [],
      success: false,
      method: 'fallback'
    };
  }
}

export async function POST(req: Request) {
  console.log('🔍 API called: /api/analyze-ats-realistic');

  try {
    const { jobDescription, coverLetterContent } = await req.json();

    if (!jobDescription || !coverLetterContent) {
      return NextResponse.json(
        { error: 'Job description and cover letter required' },
        { status: 400 }
      );
    }

    const jobLang = detectLanguageSimple(jobDescription);
    const coverLang = detectLanguageSimple(coverLetterContent);
    const languageMismatch = jobLang !== coverLang;

    console.log(`📝 Languages: Job=${jobLang}, Cover=${coverLang}`);

    // ✅ 1. EKSTRAKTOI AVAINSANAT (Stop words jo suodatettu)
    console.log('🤖 Extracting keywords with AI...');
    const { keywords, success: aiSuccess, method } = await extractKeywordsWithAI(jobDescription);
    
    if (keywords.length === 0) {
      console.warn('⚠️ No keywords found');
      return NextResponse.json({
        score: 0,
        exactMatches: [],
        missingCritical: [],
        languageMismatch,
        jobLanguage: jobLang,
        coverLetterLanguage: coverLang,
        warningMessage: 'Ei löytynyt merkityksellisiä avainsanoja työpaikkailmoituksesta.',
        warningType: 'warning',
        totalKeywords: 0
      });
    }

    console.log(`✅ Extracted ${keywords.length} keywords using ${method}`);

    // ✅ 2. SYNONYM MATCHING (monikielinen tuki)
    const analysis = analyzeKeywords(keywords, coverLetterContent);

    console.log(`📊 ATS Analysis:`);
    console.log(`  - Exact matches: ${analysis.exactMatches.length}`);
    console.log(`  - Synonym matches: ${analysis.synonymMatches.length}`);
    console.log(`  - Partial matches: ${analysis.partialMatches.length}`);
    console.log(`  - Missing: ${analysis.missing.length}`);
    console.log(`  - Overall score: ${analysis.overallScore}%`);

    // ✅ 3. ATS-JÄRJESTELMÄN TUNNISTUS
    let atsDetection;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
      const atsResponse = await fetch(`${baseUrl}/api/detect-ats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobDescription })
      });

      atsDetection = atsResponse.ok 
        ? await atsResponse.json()
        : {
            usesATS: true,
            confidence: 0.5,
            reasoning: 'Ei voitu määrittää',
            indicators: { hasATS: [], noATS: [] },
            companySize: 'unknown',
            recommendation: 'Optimoi ATS:lle'
          };
    } catch (error) {
      console.error('ATS detection failed:', error);
      atsDetection = {
        usesATS: true,
        confidence: 0.5,
        reasoning: 'Ei voitu määrittää',
        indicators: { hasATS: [], noATS: [] },
        companySize: 'unknown',
        recommendation: 'Optimoi ATS:lle varmuuden vuoksi'
      };
    }

    // ✅ 4. VAROITUSVIESTI
    let warningMessage = '';
    let warningType: 'critical' | 'warning' | 'info' | 'success' = 'info';

    if (!aiSuccess) {
      warningMessage = `⚠️ HUOM: Avainsanojen tunnistus epäonnistui osittain. Tulokset voivat olla epätarkkoja.`;
      warningType = 'warning';
    } else if (languageMismatch) {
      warningMessage = `⚠️ KRIITTINEN: Työpaikkailmoitus on ${jobLang}-kielellä, mutta hakukirjeesi on ${coverLang}-kielellä. ATS-järjestelmä EI löydä avainsanoja! Kirjoita hakukirje ${jobLang}-kielellä.`;
      warningType = 'critical';
    } else if (atsDetection.usesATS && analysis.overallScore < 75) {
      warningMessage = `⚠️ Yritys käyttää todennäköisesti ATS-järjestelmää (${Math.round(atsDetection.confidence * 100)}% varmuus). Lisää puuttuvia avainsanoja parantaaksesi pisteitäsi.`;
      warningType = 'warning';
    } else if (!atsDetection.usesATS) {
      warningMessage = `✅ Yritys ei todennäköisesti käytä ATS:ää (${Math.round(atsDetection.confidence * 100)}% varmuus). Ihminen lukee hakemuksesi - keskity sisällön laatuun.`;
      warningType = 'success';
    } else if (analysis.overallScore >= 75) {
      warningMessage = `✅ Erinomaiset ATS-pisteet! Hakukirjeesi läpäisee todennäköisesti automaattisen seulonnan.`;
      warningType = 'success';
    }

    return NextResponse.json({
      score: analysis.overallScore,
      
      // ✅ Kaikki match-tyypit
      exactMatches: analysis.exactMatches.map(m => m.keyword),
      synonymMatches: analysis.synonymMatches.map(m => ({
        keyword: m.keyword,
        foundAs: m.synonymMatch,
        confidence: m.confidence
      })),
      partialMatches: analysis.partialMatches.map(m => ({
        keyword: m.keyword,
        foundPart: m.partialMatch,
        confidence: m.confidence
      })),
      missingCritical: analysis.missing.map(m => m.keyword).slice(0, 15),
      
      languageMismatch,
      jobLanguage: jobLang,
      coverLetterLanguage: coverLang,
      warningMessage,
      warningType,
      atsDetection,
      totalKeywords: keywords.length,
      extractionMethod: method,
      aiSuccess,
      
      analysis: {
        exact: analysis.exactMatches.length,
        synonyms: analysis.synonymMatches.length,
        partial: analysis.partialMatches.length,
        missing: analysis.missing.length
      }
    });
  } catch (error) {
    console.error('❌ Realistic ATS analysis error:', error);
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}