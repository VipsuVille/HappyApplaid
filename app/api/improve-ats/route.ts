
// ============================================
// app/api/improve-ats/route.ts
// ============================================
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
    const { currentContent, missingKeywords, jobDescription } = await req.json();

    if (!currentContent || !missingKeywords || missingKeywords.length === 0) {
      return NextResponse.json(
        { error: 'Current content and missing keywords required' },
        { status: 400 }
      );
    }

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.4,
    });

    const improvePrompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an ATS optimization expert specializing in cover letters.

Your task: Add missing keywords naturally into the existing cover letter WITHOUT:
- Changing the core message or tone
- Making it sound robotic or keyword-stuffed
- Removing any existing content
- Creating fake experiences

RULES:
1. Add keywords in relevant context where they fit naturally
2. Maintain professional Finnish language
3. Keep the same paragraph structure
4. Don't force keywords - if they don't fit naturally, skip them
5. Preserve the applicant's voice and personality

Return ONLY the improved content, no explanations or markdown.`],
      
      ['human', `Improve this cover letter by adding these missing keywords naturally:

CURRENT CONTENT:
{currentContent}

MISSING KEYWORDS TO ADD (priority order):
{missingKeywords}

JOB DESCRIPTION CONTEXT:
{jobDescription}

Add the keywords naturally where they make sense. Return the improved content.`]
    ]);

    const formatted = await improvePrompt.formatMessages({
      currentContent,
      missingKeywords: missingKeywords.join(', '),
      jobDescription: jobDescription || 'No context available'
    });

    const result = await model.invoke(formatted);
    const improvedContent = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // Clean up any markdown artifacts
    const cleanedContent = improvedContent
      .replace(/```html/g, '')
      .replace(/```/g, '')
      .trim();

    return NextResponse.json({
      improvedContent: cleanedContent,
      addedKeywords: missingKeywords.slice(0, 5), // Return which ones were attempted
    });
  } catch (error) {
    console.error('ATS improvement error:', error);
    return NextResponse.json(
      { error: 'ATS improvement failed' },
      { status: 500 }
    );
  }
}

