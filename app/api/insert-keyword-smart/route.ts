// app/api/insert-keyword-smart/route.ts - KORJATTU

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
    const { keyword, currentContent, jobDescription } = await req.json();

    if (!keyword || !currentContent) {
      return NextResponse.json(
        { error: 'Keyword and current content required' },
        { status: 400 }
      );
    }

    console.log(`🎯 Inserting keyword: "${keyword}"`);

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an expert at naturally inserting keywords into cover letters.

**YOUR MISSION:**
Insert the keyword "{keyword}" naturally into the text while maintaining flow.

**CRITICAL RULES:**
1. **MAINTAIN FLOW**: Don't break the text structure
2. **NATURAL INTEGRATION**: Make it sound like user wrote it
3. **ONE KEYWORD ONLY**: Insert only the given keyword
4. **PRESERVE FACTS**: Don't change dates, companies, or experiences
5. **SAME LANGUAGE**: Keep original language

**INTEGRATION STRATEGIES:**

Technical terms:
- "Osaan [keyword]" 
- "Käytän [keyword]:a projekteis sani"
- "I use [keyword] in my projects"

Soft skills:
- "tiimityö" → "työskentelen tiimissä"
- "teamwork" → "I work in teams"
- "problemlösning" → "jag löser problem"

**EXAMPLE:**

BEFORE:
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta ja opiskelen AMK:ssa."

INSERT: "React"

AFTER:
"Olen ohjelmistokehittäjä joka tykkää koodaamisesta React-teknologialla ja 
opiskelen AMK:ssa."

Return ONLY the improved text.`],
      
      ['human', `**CURRENT TEXT:**
{currentContent}

**KEYWORD TO INSERT:**
{keyword}

**JOB CONTEXT:**
{jobDescription}

Insert naturally. Return improved text only.`]
    ]);

    const formatted = await prompt.formatMessages({
      keyword,
      currentContent,
      jobDescription: jobDescription || 'No context'
    });

    const result = await model.invoke(formatted);
    let improvedContent = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // Puhdista
    improvedContent = improvedContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    // Tarkista että muuttui
    if (improvedContent === currentContent) {
      console.warn('⚠️ Content unchanged');
      return NextResponse.json({
        error: 'CANNOT_INSERT',
        message: `AI ei pystynyt lisäämään avainsanaa "${keyword}" luonnollisesti.`,
        suggestion: 'Lisää avainsana manuaalisesti tai valitse toinen paikka.'
      }, { status: 400 });
    }

    // Tarkista että avainsana lisättiin
    if (!improvedContent.toLowerCase().includes(keyword.toLowerCase())) {
      console.warn('⚠️ Keyword not found in result');
      return NextResponse.json({
        error: 'KEYWORD_NOT_ADDED',
        message: `Avainsanaa "${keyword}" ei löydy tuloksesta.`,
        suggestion: 'Kokeile uudelleen tai lisää manuaalisesti.'
      }, { status: 400 });
    }

    console.log(`✅ Keyword "${keyword}" inserted successfully`);

    return NextResponse.json({
      success: true,
      improvedContent,
      insertedKeyword: keyword,
      message: `Avainsana "${keyword}" lisätty onnistuneesti`
    });

  } catch (error) {
    console.error('❌ Keyword insertion error:', error);
    
    return NextResponse.json(
      { 
        error: 'INSERTION_FAILED',
        message: 'Avainsanan lisäys epäonnistui',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Yritä uudelleen tai lisää manuaalisesti'
      },
      { status: 500 }
    );
  }
}