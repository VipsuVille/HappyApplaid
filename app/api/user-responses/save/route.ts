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

/**
 * Infer a proper category from the question text.
 * 
 * The frontend often sends category='other' or 'cv' or 'cover_letter'
 * which are too generic for responseHelper's bucket system.
 * We look at the question text to determine the REAL category.
 */
function inferCategoryFromQuestion(questionText: string, fallbackCategory: string): string {
  const q = (questionText || '').toLowerCase();

  // Work experience
  if (
    q.includes('työkokemus') || q.includes('work experience') ||
    q.includes('projektit') || q.includes('projects') ||
    q.includes('mitä olet tehnyt') || q.includes('what have you done') ||
    q.includes('työhistoria') || q.includes('work history') ||
    q.includes('tehtävä') || q.includes('responsibilities') ||
    q.includes('työssä') || q.includes('at work') ||
    q.includes('mitä teit') || q.includes('what did you')
  ) {
    return 'experience';
  }

  // Education
  if (
    q.includes('koulutus') || q.includes('education') ||
    q.includes('tutkinto') || q.includes('degree') ||
    q.includes('opiskelu') || q.includes('study') ||
    q.includes('kurssi') || q.includes('course') ||
    q.includes('oppilaitos') || q.includes('institution') ||
    q.includes('valmistumi') || q.includes('graduat')
  ) {
    return 'education';
  }

  // Skills
  if (
    q.includes('taido') || q.includes('osaamis') || q.includes('skill') ||
    q.includes('teknolog') || q.includes('technolog') ||
    q.includes('ohjelmoint') || q.includes('programming') ||
    q.includes('työkalu') || q.includes('tool') ||
    q.includes('listaa') || q.includes('list your') ||
    q.includes('react') || q.includes('python') || q.includes('aws') || q.includes('docker')
  ) {
    return 'skills';
  }

  // Personality / working style / strength
  if (
    q.includes('vahvuu') || q.includes('strength') ||
    q.includes('persoonall') || q.includes('personalit') ||
    q.includes('työskentelytyyli') || q.includes('working style') ||
    q.includes('ongelmanratkaisu') || q.includes('problem solving') ||
    q.includes('supervoima') || q.includes('superpower') ||
    q.includes('tiimirooli') || q.includes('team role')
  ) {
    return 'personality';
  }

  // Projects / achievements
  if (
    q.includes('paras projekti') || q.includes('best project') ||
    q.includes('saavutus') || q.includes('achievement') ||
    q.includes('ylpein') || q.includes('proudest') ||
    q.includes('mitä saavutit') || q.includes('what did you achieve')
  ) {
    return 'achievements';
  }

  // Career goals
  if (
    q.includes('tavoite') || q.includes('goal') ||
    q.includes('tulevaisuus') || q.includes('future') ||
    q.includes('uralla') || q.includes('career')
  ) {
    return 'personality'; // Goals go to personality bucket in responseHelper
  }

  // CV validation items (from Guardian)
  if (q.includes('ai ehdotti')) {
    const lower = q;
    if (lower.includes('(skill)')) return 'skills';
    if (lower.includes('(experience)')) return 'experience';
    if (lower.includes('(education)')) return 'education';
  }

  // Cover letter generic → keep as-is but try to improve
  if (fallbackCategory === 'cover_letter') {
    if (q.includes('kokemus') || q.includes('tausta')) return 'experience';
    if (q.includes('kehitty') || q.includes('tavoite')) return 'personality';
    return 'experience'; // Most cover letter questions are about experience
  }

  // If truly unknown, return the fallback
  return fallbackCategory || 'other';
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

    // ✅ CRITICAL FIX: Infer proper category from question text
    // The frontend often sends 'other', 'cv', or 'cover_letter' as category,
    // but responseHelper needs 'experience', 'education', 'skills', etc.
    const smartCategory = inferCategoryFromQuestion(questionText, category || 'other');

    if (smartCategory !== (category || 'other')) {
      console.log(`🔄 [SAVE] Re-categorized: "${questionText.substring(0, 50)}..." → ${smartCategory} (was: ${category || 'other'})`);
    }

    const { data, error } = await supabaseAdmin
      .from('user_responses')
      .upsert(
        {
          user_id: userId,
          question_id: questionId,
          question_text: questionText,
          answer: answer,
          answer_length: answer.length,
          question_category: smartCategory, // ✅ Uses inferred category
          asked_in_context: context || 'unknown',
          job_title_context: jobTitle || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,question_id',
        }
      )
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