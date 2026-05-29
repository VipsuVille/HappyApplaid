// app/api/generate-cover-letter-background/route.ts
// ✅ Generoi AI-taustakuvan hakukirjeelle (sama funktio kuin CV:llä) ja tallentaa
//    sen kohtaan content.background.imageUrl — jota engine (BackgroundLayer / Aurora) lukee.
//    Kuva itse menee Supabase storageen: cv_files/backgrounds/{userId}/bg-...png

export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateEnhancedBackgroundImage } from '@/lib/langchain/cvGenerator';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { letterId } = await req.json();
    if (!letterId) {
      return NextResponse.json({ error: 'letterId required' }, { status: 400 });
    }

    console.log('🎨 [CL-BG] Generating background for letter:', letterId);

    // ── Generoi kuva. Funktio tarvitsee vain userId + cvId storage-polkua varten. ──
    const imageUrl = await generateEnhancedBackgroundImage(
      { userId, cvId: `cl_${letterId}` } as any,
      undefined
    );

    if (!imageUrl) {
      throw new Error('Image generation returned empty');
    }

    console.log('✅ [CL-BG] Image generated:', imageUrl.substring(0, 80));

    // ── Hae nykyinen content, yhdistä background-kenttä (älä ylikirjoita muuta) ──
    const { data: letter, error: fetchErr } = await supabaseAdmin
      .from('cover_letters')
      .select('content')
      .eq('id', letterId)
      .eq('user_id', userId)
      .single();

    if (fetchErr || !letter) {
      throw fetchErr || new Error('Cover letter not found');
    }

    const newContent = {
      ...(letter.content || {}),
      background: {
        mode: 'generated',
        imageUrl,
        opacity: 1,
      },
    };

    const { error: updErr } = await supabaseAdmin
      .from('cover_letters')
      .update({ content: newContent, updated_at: new Date().toISOString() })
      .eq('id', letterId)
      .eq('user_id', userId);

    if (updErr) throw updErr;

    console.log('✅ [CL-BG] Saved to content.background');

    return NextResponse.json({ success: true, imageUrl });
  } catch (error) {
    console.error('❌ [CL-BG] Background generation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';