// app/api/cover-letters/[id]/route.ts - ✅ NEXT.JS 15 FIX + RLS READY

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase-client';
import { auth } from '@clerk/nextjs/server';

// ════════════════════════════════════════════════════════════════
// GET - PUBLIC
// ════════════════════════════════════════════════════════════════
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> } // ✅ NEXT.JS 15: Promise!
) {
  const params = await props.params; // ✅ Await params
  
  try {
    const token = req.headers.get('Authorization')?.replace('Bearer ', '');
    const supabase = await getSupabaseClient(token || undefined);

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
// PATCH - PROTECTED
// ════════════════════════════════════════════════════════════════
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> } // ✅ NEXT.JS 15: Promise!
) {
  const params = await props.params; // ✅ Await params
  
  console.log('═══════════════════════════════════════════');
  console.log('🔧 [API PATCH] REQUEST RECEIVED');
  console.log('═══════════════════════════════════════════');
  console.log('📍 Letter ID:', params.id);
  
  try {
    // ✅ STEP 1: GET TOKEN
    console.log('🔑 [STEP 1] Getting token from request...');
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ [STEP 1] No Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('   - Token exists:', !!token);
    console.log('   - Token length:', token.length);

    // ✅ STEP 2: CREATE SUPABASE CLIENT
    console.log('🔧 [STEP 2] Creating Supabase client with token...');
    const supabase = await getSupabaseClient(token);
    console.log('   - Client created: ✅');

    // ✅ STEP 3: VERIFY USER WITH CLERK
    console.log('👤 [STEP 3] Verifying Clerk user...');
    const { userId } = await auth();
    
    if (!userId) {
      console.error('❌ [STEP 3] No Clerk userId');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('   - User ID:', userId);
    console.log('✅ [STEP 3] Clerk user verified');

    // ✅ STEP 4: PARSE REQUEST BODY
    console.log('📦 [STEP 4] Parsing request body...');
    const body = await req.json();
    console.log('   - Has content:', !!body.content);
    console.log('   - Has ai_data:', !!body.ai_data);

    // ✅ STEP 5: UPDATE DATABASE
    console.log('💾 [STEP 5] Updating database...');
    
    const { data, error } = await supabase
      .from('cover_letters')
      .update({
        content: body.content,
        ai_data: body.ai_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', userId) // ✅ TURVALLISUUS!
      .select()
      .single();

    if (error) {
      console.error('❌ [STEP 5] Database error:', error);
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message
      }, { status: 500 });
    }

    if (!data) {
      console.error('❌ [STEP 5] No data returned');
      return NextResponse.json({ 
        error: 'Not found',
        details: 'Cover letter not found or unauthorized'
      }, { status: 404 });
    }

    console.log('✅ [STEP 5] Database updated successfully');
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
  props: { params: Promise<{ id: string }> } // ✅ NEXT.JS 15: Promise!
) {
  const params = await props.params; // ✅ Await params
  
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = await getSupabaseClient(token);

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API DELETE] Error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}