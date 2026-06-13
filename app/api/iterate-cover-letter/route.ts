// app/api/iterate-cover-letter/route.ts — EI tokeneita: checkLimit + logUsage
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { iterateCoverLetter } from '@/lib/langchain/iterativeCoverLetterGenerator';
import { checkLimit, logUsage, limitMessage } from '@/lib/limits'; // ✅ kuluhallinta

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: Request) {
  try {
    // 1️⃣ AUTH
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Kirjautuminen vaaditaan' }, { status: 401 });
    }

    const { coverLetterId, userFeedback } = await req.json();

    // 2️⃣ VALIDATE
    if (!coverLetterId || !userFeedback?.trim()) {
      return NextResponse.json({ error: 'coverLetterId ja userFeedback vaaditaan' }, { status: 400 });
    }

    // 3️⃣ FETCH EXISTING LETTER
    const { data: existingLetter, error: fetchError } = await supabaseAdmin
      .from('cover_letters')
      .select('*')
      .eq('id', coverLetterId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingLetter) {
      return NextResponse.json(
        { error: 'Kirjettä ei löydy tai sinulla ei ole oikeutta siihen' },
        { status: 404 }
      );
    }

    // 4️⃣ KULUHALLINTA (ei tokeneita) — iterointi on AI-toiminto, kuluttaa kattoa
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .maybeSingle();

    const limit = await checkLimit(userId, subscription?.plan_type);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: 'LIMIT_REACHED', message: limitMessage(limit), reason: limit.reason, upgrade: limit.plan === 'free' },
        { status: 429 }
      );
    }

    // 5️⃣ EXTRACT DATA
    const originalInputs = existingLetter.ai_data?.original_inputs || {};
    const currentContent = existingLetter.content?.body || '';
    const iterations = existingLetter.ai_data?.iterations || [];

    if (!currentContent) {
      return NextResponse.json({ error: 'Kirjeen sisältö puuttuu' }, { status: 400 });
    }

    // 6️⃣ CALL ITERATIVE GENERATOR
    const result = await iterateCoverLetter({
      jobDescription: originalInputs.jobDescription || 'No job description',
      profileData: originalInputs.profileData || {},
      language: originalInputs.language || 'finnish',
      style: originalInputs.style || 'professional',
      originalType: originalInputs.type || 'general',
      currentContent,
      userFeedback: userFeedback.trim(),
      previousIterations: iterations,
    });

    // 7️⃣ NEW ITERATION RECORD
    const newIteration = {
      version: iterations.length + 1,
      timestamp: new Date().toISOString(),
      user_feedback: userFeedback.trim(),
      changes_made: result.changesSummary,
      affected_sections: result.affectedSections,
    };

    // 8️⃣ UPDATE DATABASE
    const { error: updateError } = await supabaseAdmin
      .from('cover_letters')
      .update({
        content: { ...existingLetter.content, body: result.newContent },
        ai_data: {
          ...existingLetter.ai_data,
          iterations: [...iterations, newIteration],
          last_modified: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', coverLetterId);

    if (updateError) {
      return NextResponse.json({ error: 'Kirjeen päivitys epäonnistui' }, { status: 500 });
    }

    // 9️⃣ KIRJAA AI-TOIMINTO (vasta onnistuneen päivityksen jälkeen)
    await logUsage(userId, 'cover_letter');

    // 🔟 RESPONSE
    return NextResponse.json({
      success: true,
      newContent: result.newContent,
      changesSummary: result.changesSummary,
      affectedSections: result.affectedSections,
      iterationNumber: iterations.length + 1,
      aiRemaining: Math.max(0, limit.remaining - 1),
    });

  } catch (error: any) {
    console.error('❌ [API] Iteration failed:', error);
    return NextResponse.json(
      { error: error.message || 'Iteratiivinen muokkaus epäonnistui' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';