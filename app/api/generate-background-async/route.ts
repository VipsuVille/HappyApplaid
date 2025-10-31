// app/api/generate-background-async/route.ts
export const maxDuration = 60;

import { NextRequest, NextResponse } from 'next/server';
import { generateEnhancedBackgroundImage } from '@/lib/langchain/cvGenerator';
import { supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { cvId } = await req.json();
    
    // Hae CV:n tiedot
    const { data: cv } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .single();

    if (!cv) throw new Error('CV not found');

    // Generoi taustakuva
    const backgroundImage = await generateEnhancedBackgroundImage(
      cv.content.cv_data,
      cv.content.cv_data.authToken
    );

    // Päivitä CV:hen
    await supabase
      .from('cvs')
      .update({
        'content.ai_data.background_image': backgroundImage
      })
      .eq('id', cvId);

    return NextResponse.json({ success: true, backgroundImage });
  } catch (error) {
    console.error('Background generation failed:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}