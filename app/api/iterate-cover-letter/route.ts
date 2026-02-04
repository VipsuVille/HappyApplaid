// app/api/iterate-cover-letter/route.ts
// API endpoint hakukirjeen iteratiiviselle muokkaukselle

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';
import { iterateCoverLetter } from '@/lib/langchain/iterativeCoverLetterGenerator';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(req: Request) {
  try {
    // 1️⃣ AUTH
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'Kirjautuminen vaaditaan' },
        { status: 401 }
      );
    }

    const { coverLetterId, userFeedback } = await req.json();

    // 2️⃣ VALIDATE
    if (!coverLetterId || !userFeedback?.trim()) {
      return NextResponse.json(
        { error: 'coverLetterId ja userFeedback vaaditaan' },
        { status: 400 }
      );
    }

    console.log('🔄 [API] Iterate request:', {
      userId,
      coverLetterId,
      feedbackLength: userFeedback.length
    });

    // 3️⃣ FETCH EXISTING LETTER
    const { data: existingLetter, error: fetchError } = await supabaseAdmin
      .from('cover_letters')
      .select('*')
      .eq('id', coverLetterId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existingLetter) {
      console.error('❌ [API] Letter not found:', fetchError);
      return NextResponse.json(
        { error: 'Kirjettä ei löydy tai sinulla ei ole oikeutta siihen' },
        { status: 404 }
      );
    }

    // 4️⃣ CHECK TOKENS
    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('tokens, plan_type')
      .eq('user_id', userId)
      .single();

    const ITERATION_COST = subscription?.plan_type === 'premium' ? 30 : 50;

    if ((subscription?.tokens || 0) < ITERATION_COST) {
      return NextResponse.json(
        { error: `Tarvitset ${ITERATION_COST} tokenia muokkaukseen` },
        { status: 403 }
      );
    }

    // 5️⃣ EXTRACT DATA
    const originalInputs = existingLetter.ai_data?.original_inputs || {};
    const currentContent = existingLetter.content?.body || '';
    const iterations = existingLetter.ai_data?.iterations || [];

    if (!currentContent) {
      return NextResponse.json(
        { error: 'Kirjeen sisältö puuttuu' },
        { status: 400 }
      );
    }

    console.log('📋 [API] Loaded letter:', {
      contentLength: currentContent.length,
      iterationCount: iterations.length,
      hasOriginalInputs: !!originalInputs.jobDescription
    });

    // 6️⃣ CALL ITERATIVE GENERATOR
    console.log('🤖 [API] Calling iterative generator...');
    
    const result = await iterateCoverLetter({
      // Original context
      jobDescription: originalInputs.jobDescription || 'No job description',
      profileData: originalInputs.profileData || {},
      language: originalInputs.language || 'finnish',
      style: originalInputs.style || 'professional',
      originalType: originalInputs.type || 'general',
      
      // Current state
      currentContent: currentContent,
      
      // New feedback
      userFeedback: userFeedback.trim(),
      
      // History
      previousIterations: iterations
    });

    console.log('✅ [API] Generation complete:', {
      newLength: result.newContent.length,
      changesSummary: result.changesSummary,
      affectedSections: result.affectedSections
    });

    // 7️⃣ CREATE NEW ITERATION RECORD
    const newIteration = {
      version: iterations.length + 1,
      timestamp: new Date().toISOString(),
      user_feedback: userFeedback.trim(),
      changes_made: result.changesSummary,
      affected_sections: result.affectedSections
    };

    // 8️⃣ UPDATE DATABASE
    const { error: updateError } = await supabaseAdmin
      .from('cover_letters')
      .update({
        content: {
          ...existingLetter.content,
          body: result.newContent
        },
        ai_data: {
          ...existingLetter.ai_data,
          iterations: [...iterations, newIteration],
          last_modified: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', coverLetterId);

    if (updateError) {
      console.error('❌ [API] Update failed:', updateError);
      return NextResponse.json(
        { error: 'Kirjeen päivitys epäonnistui' },
        { status: 500 }
      );
    }

    // 9️⃣ DEDUCT TOKENS
    const { error: tokenError } = await supabaseAdmin
      .from('subscriptions')
      .update({
        tokens: (subscription?.tokens || 0) - ITERATION_COST
      })
      .eq('user_id', userId);

    if (tokenError) {
      console.error('⚠️ [API] Token deduction failed:', tokenError);
    }

    console.log('💰 [API] Deducted tokens:', ITERATION_COST);

    // 🔟 RESPONSE
    return NextResponse.json({
      success: true,
      newContent: result.newContent,
      changesSummary: result.changesSummary,
      affectedSections: result.affectedSections,
      iterationNumber: iterations.length + 1,
      tokensUsed: ITERATION_COST,
      remainingTokens: (subscription?.tokens || 0) - ITERATION_COST
    });

  } catch (error: any) {
    console.error('❌ [API] Iteration failed:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Iteratiivinen muokkaus epäonnistui',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';