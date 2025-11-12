// app/api/insert-keyword-smart/route.ts - KORJATTU
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
    const { keyword, currentContent, jobDescription } = await req.json();

    if (!keyword || !currentContent) {
      return NextResponse.json(
        { error: 'Keyword and current content required' },
        { status: 400 }
      );
    }

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an expert at naturally inserting keywords into cover letters.

Your task: Find the BEST place to insert "{keyword}" into the cover letter and return ONLY the improved text.

RULES:
1. Insert the keyword in a natural, grammatically correct way
2. DO NOT change any other content
3. If it's a technical term, keep it as-is
4. If it's a soft skill, integrate it naturally
5. Find relevant context from job description
6. Return ONLY the new cover letter text, no explanations

Example:
Original: "I have experience with web development"
Keyword: "React"
Result: "I have experience with web development using React"

Return ONLY the improved cover letter.`],
      ['human', `Current cover letter:
{currentContent}

Keyword to insert:
{keyword}

Job context:
{jobDescription}

Insert "{keyword}" naturally and return the improved text only.`]
    ]);

    const formatted = await prompt.formatMessages({
      keyword,
      currentContent,
      jobDescription: jobDescription || 'No context'
    });

    const result = await model.invoke(formatted);
    const improvedContent = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    return NextResponse.json({
      improvedContent: improvedContent.trim(),
      insertedKeyword: keyword
    });
  } catch (error) {
    console.error('Smart keyword insertion error:', error);
    return NextResponse.json(
      { 
        error: 'Insertion failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
