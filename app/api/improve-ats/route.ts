// app/api/improve-ats/route.ts - TÄYSIN KORJATTU

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { currentContent, missingKeywords, jobDescription, language } = await req.json();

    console.log('📝 Improve ATS request:', {
      contentLength: currentContent?.length,
      keywordsCount: missingKeywords?.length,
      keywords: missingKeywords?.slice(0, 5),
      language: language || 'auto-detect'
    });

    // ✅ VALIDOINTI
    if (!currentContent) {
      return NextResponse.json(
        { error: 'Current content required' },
        { status: 400 }
      );
    }

    if (!missingKeywords || missingKeywords.length === 0) {
      return NextResponse.json(
        { 
          error: 'NO_MISSING_KEYWORDS',
          message: 'Ei puuttuvia avainsanoja - ATS-pisteet ovat jo hyvät!',
          suggestion: 'Hakukirjeesi sisältää jo kaikki tärkeät avainsanat.'
        },
        { status: 400 }
      );
    }

    // ✅ TUNNISTA KIELI
    const detectedLanguage = language || detectLanguageSimple(currentContent);
    console.log(`🌍 Detected language: ${detectedLanguage}`);

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4o-mini',
      temperature: 0.4,
    });

    const improvePrompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ATS optimization expert working in ANY language.

**YOUR MISSION:**
Add missing keywords naturally into the cover letter while MAINTAINING TEXT FLOW.

**CRITICAL RULES:**
1. **MAINTAIN COHERENCE**: Keep text flowing naturally
2. **NO NEW PARAGRAPHS**: Integrate into existing paragraphs
3. **NATURAL PHRASING**: Sound like the user wrote it
4. **PRESERVE FACTS**: Don't change companies, dates, or experiences
5. **SAME LANGUAGE**: Keep original language
6. **MAX 5 KEYWORDS**: Don't overload

**BAD EXAMPLE (DON'T DO THIS):**

BEFORE:
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta."

AFTER (adding "React, tiimityö"):
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta.

React.

Tiimityö."

**GOOD EXAMPLE (DO THIS):**

BEFORE:
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta."

AFTER (adding "React, tiimityö"):
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta React-teknologialla 
ja nauttii tiimityöskentelystä."

**INTEGRATION TIPS:**
- Technical terms: "Osaan React:n ja Node.js:n"
- Soft skills: "työskentelen tiimissä" (not just "tiimityö")
- Experience: "hallinnoin projekteja" (not just "projektinhallinta")

Return ONLY the improved text.`],
      
      ['human', `**CURRENT TEXT:**
{currentContent}

**KEYWORDS TO ADD (max 5):**
{missingKeywords}

**JOB CONTEXT:**
{jobDescription}

Add keywords naturally. Return improved text only.`]
    ]);

    // ✅ KÄYTÄ MAX 5 AVAINSANAA KERRALLA
    const keywordsToAdd = missingKeywords.slice(0, 5);
    console.log(`🎯 Adding keywords: ${keywordsToAdd.join(', ')}`);

    const formatted = await improvePrompt.formatMessages({
      currentContent,
      missingKeywords: keywordsToAdd.join(', '),
      jobDescription: jobDescription || 'No context available'
    });

    const result = await model.invoke(formatted);
    let improvedContent = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // ✅ PUHDISTA MARKDOWN
    improvedContent = improvedContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    // ✅ TARKISTA että sisältö muuttui
    if (improvedContent === currentContent) {
      console.warn('⚠️ Content unchanged');
      return NextResponse.json({
        error: 'CANNOT_IMPROVE',
        message: 'AI ei pystynyt lisäämään avainsanoja luonnollisesti.',
        suggestion: 'Avainsanat eivät sovi hakukirjeen kontekstiin. Kokeile manuaalista muokkausta.',
        attemptedKeywords: keywordsToAdd
      }, { status: 400 });
    }

    // ✅ TARKISTA että avainsanoja lisättiin
    const addedKeywords = keywordsToAdd.filter((kw: string) => 
      !currentContent.toLowerCase().includes(kw.toLowerCase()) &&
      improvedContent.toLowerCase().includes(kw.toLowerCase())
    );

    console.log(`✅ Successfully added ${addedKeywords.length}/${keywordsToAdd.length} keywords`);

    if (addedKeywords.length === 0) {
      console.warn('⚠️ No keywords were actually added');
      return NextResponse.json({
        error: 'NO_KEYWORDS_ADDED',
        message: 'AI ei pystynyt lisäämään yhtään avainsanaa luonnollisesti.',
        suggestion: 'Kokeile lisätä avainsanat manuaalisesti klikkaamalla.',
        attemptedKeywords: keywordsToAdd
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      improvedContent,
      addedKeywords,
      attemptedKeywords: keywordsToAdd,
      language: detectedLanguage,
      message: `Lisättiin ${addedKeywords.length} avainsanaa: ${addedKeywords.join(', ')}`
    });

  } catch (error) {
    console.error('❌ ATS improvement error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { 
        error: 'ATS_IMPROVEMENT_FAILED',
        message: 'ATS-parannuksen luonti epäonnistui',
        details: errorMessage,
        suggestion: 'Yritä uudelleen tai muokkaa manuaalisesti. Jos ongelma toistuu, ota yhteyttä tukeen.'
      },
      { status: 500 }
    );
  }
}

/**
 * ✅ YKSINKERTAINEN KIELENTUNNISTUS
 */
function detectLanguageSimple(text: string): string {
  const lower = text.toLowerCase();
  
  if (lower.match(/\b(olen|minä|että|joka|kun|mutta|työssä)\b/)) {
    return 'finnish';
  }
  
  if (lower.match(/\b(jag|är|att|som|när|med)\b/)) {
    return 'swedish';
  }
  
  return 'english';
}