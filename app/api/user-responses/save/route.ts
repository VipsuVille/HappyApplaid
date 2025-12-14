// app/api/user-responses/save/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

function generateQuestionId(questionText: string): string {
  return crypto
    .createHash('sha256')
    .update(questionText.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

export async function POST(req: Request) {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { questionText, answer, category, context, jobTitle } = await req.json();
    
    if (!questionText || !answer) {
      return NextResponse.json(
        { error: 'Question and answer required' },
        { status: 400 }
      );
    }

    const questionId = generateQuestionId(questionText);

    const { data, error } = await supabaseAdmin
      .from('user_responses')
      .upsert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        answer: answer,
        answer_length: answer.length,
        question_category: category || 'other',
        asked_in_context: context || 'unknown',
        job_title_context: jobTitle || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, response: data });
  } catch (error) {
    console.error('Error saving response:', error);
    return NextResponse.json(
      { error: 'Failed to save response' },
      { status: 500 }
    );
  }
}