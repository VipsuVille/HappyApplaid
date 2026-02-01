// app/api/cover-letters/[id]/route.ts - ✅ FINAL FIX (NO SUPABASE AUTH!)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ════════════════════════════════════════════════════════════════
// GET - PUBLIC
// ════════════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  try {
    // ✅ NO AUTH - Supabase anon key only
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    return NextResponse.json({ coverLetter: data });

  } catch (error) {
    console.error('❌ [API GET] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════
// PATCH - PROTECTED (MIDDLEWARE ALREADY CHECKED TOKEN!)
// ════════════════════════════════════════════════════════════════
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  console.log('═══════════════════════════════════════════');
  console.log('🔧 [API PATCH] REQUEST RECEIVED');
  console.log('═══════════════════════════════════════════');
  console.log('📍 Letter ID:', params.id);
  
  try {
    // ✅ MIDDLEWARE ALREADY CHECKED TOKEN EXISTS!
    // Just verify it's there
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ [API] No Authorization header (should not happen - middleware failed?)');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 [API] Token received, length:', token.length);

    // ✅ CREATE SUPABASE CLIENT (NO AUTH - RLS IS OFF!)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      // NO authorization header! RLS is disabled.
    );
    
    console.log('✅ [API] Supabase client created');

    // ✅ DECODE JWT TO GET CLERK USER ID
    // JWT format: header.payload.signature
    const payloadBase64 = token.split('.')[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    
    const clerkUserId = payload.sub; // Clerk user ID from JWT
    
    console.log('👤 [API] Clerk User ID from token:', clerkUserId);

    if (!clerkUserId) {
      console.error('❌ [API] No user ID in token payload');
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ✅ PARSE REQUEST BODY
    const body = await req.json();
    console.log('📦 [API] Body parsed');

    // ✅ UPDATE DATABASE (use Clerk user_id!)
    console.log('💾 [API] Updating database...');
    console.log('   - Letter ID:', params.id);
    console.log('   - User ID (Clerk):', clerkUserId);
    
    const { data, error } = await supabase
      .from('cover_letters')
      .update({
        content: body.content,
        ai_data: body.ai_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', clerkUserId) // ✅ CLERK USER ID!
      .select()
      .single();

    if (error) {
      console.error('❌ [API] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    if (!data) {
      console.error('❌ [API] No data returned (not found or unauthorized)');
      return NextResponse.json({ 
        error: 'Not found',
        details: 'Cover letter not found or you do not have permission to update it'
      }, { status: 404 });
    }

    console.log('✅ [API] Database updated successfully');
    console.log('═══════════════════════════════════════════');
    console.log('✅✅✅ PATCH COMPLETED SUCCESSFULLY ✅✅✅');
    console.log('═══════════════════════════════════════════');

    return NextResponse.json({ coverLetter: data });

  } catch (error) {
    console.error('❌❌❌ [API PATCH] UNEXPECTED ERROR ❌❌❌');
    console.error('Error:', error);
    console.log('═══════════════════════════════════════════');
    
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// ════════════════════════════════════════════════════════════════
// DELETE - PROTECTED
// ════════════════════════════════════════════════════════════════
export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode JWT
    const payloadBase64 = token.split('.')[1];
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
    const payload = JSON.parse(payloadJson);
    const clerkUserId = payload.sub;
    
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', params.id)
      .eq('user_id', clerkUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API DELETE] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}