// app/api/cover-letters/[id]/route.ts - DEBUG VERSION (EI MUUTETTU LOGIIKKAA!)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🔍 [API GET] Cover letter request:', params.id);
  
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.log('⚠️ [API GET] No auth header (public access)');
      // Public access - no auth required for GET
    }

    const token = authHeader?.replace('Bearer ', '');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      token ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      } : {}
    );

    const { data, error } = await supabase
      .from('cover_letters')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      console.error('❌ [API GET] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.log('❌ [API GET] Cover letter not found:', params.id);
      return NextResponse.json({ error: 'Cover letter not found' }, { status: 404 });
    }

    console.log('✅ [API GET] Cover letter found');
    return NextResponse.json({ coverLetter: data });

  } catch (error) {
    console.error('❌ [API GET] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('═══════════════════════════════════════════');
  console.log('🔧 [API PATCH] REQUEST RECEIVED');
  console.log('═══════════════════════════════════════════');
  console.log('📍 Letter ID:', params.id);
  console.log('⏰ Timestamp:', new Date().toISOString());
  
  try {
    // ═══════════════════════════════════════════════════════════════
    // STEP 1: CHECK AUTHORIZATION HEADER
    // ═══════════════════════════════════════════════════════════════
    const authHeader = req.headers.get('Authorization');
    console.log('🔑 [STEP 1] Authorization header check:');
    console.log('   - Exists:', authHeader ? '✅ YES' : '❌ NO');
    
    if (!authHeader) {
      console.error('❌ [STEP 1] FAILED: No Authorization header!');
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'No authorization header provided'
      }, { status: 401 });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 2: EXTRACT TOKEN
    // ═══════════════════════════════════════════════════════════════
    const token = authHeader.replace('Bearer ', '');
    console.log('🔑 [STEP 2] Token extraction:');
    console.log('   - Token exists:', !!token ? '✅ YES' : '❌ NO');
    console.log('   - Token length:', token.length);
    console.log('   - Token preview:', token.substring(0, 30) + '...');
    console.log('   - Token ends:', '...' + token.substring(token.length - 10));

    // ═══════════════════════════════════════════════════════════════
    // STEP 3: CHECK ENV VARS
    // ═══════════════════════════════════════════════════════════════
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('🔧 [STEP 3] Environment variables check:');
    console.log('   - SUPABASE_URL exists:', !!supabaseUrl ? '✅ YES' : '❌ NO');
    console.log('   - SUPABASE_KEY exists:', !!supabaseKey ? '✅ YES' : '❌ NO');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ [STEP 3] FAILED: Missing Supabase env vars!');
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Server configuration error',
        details: 'Missing Supabase environment variables'
      }, { status: 500 });
    }

    // ═══════════════════════════════════════════════════════════════
    // STEP 4: CREATE SUPABASE CLIENT
    // ═══════════════════════════════════════════════════════════════
    console.log('🔧 [STEP 4] Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    console.log('   - Client created:', '✅ YES');

    // ═══════════════════════════════════════════════════════════════
    // STEP 5: VERIFY USER
    // ═══════════════════════════════════════════════════════════════
    console.log('👤 [STEP 5] Verifying user with Supabase...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    console.log('   - User verification result:');
    console.log('     • Has user:', !!user ? '✅ YES' : '❌ NO');
    console.log('     • User ID:', user?.id || 'N/A');
    console.log('     • User email:', user?.email || 'N/A');
    console.log('     • Error:', userError?.message || 'None');

    if (userError) {
      console.error('❌ [STEP 5] FAILED: User error:', userError);
      console.log('   - Error name:', userError.name);
      console.log('   - Error message:', userError.message);
      console.log('   - Error status:', userError.status);
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: userError.message,
        step: 'user_verification'
      }, { status: 401 });
    }

    if (!user) {
      console.error('❌ [STEP 5] FAILED: No user returned (but no error either)');
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'No user found',
        step: 'user_verification'
      }, { status: 401 });
    }

    console.log('✅ [STEP 5] User verified successfully:', user.id);

    // ═══════════════════════════════════════════════════════════════
    // STEP 6: PARSE REQUEST BODY
    // ═══════════════════════════════════════════════════════════════
    console.log('📦 [STEP 6] Parsing request body...');
    const body = await req.json();
    console.log('   - Has content:', !!body.content ? '✅ YES' : '❌ NO');
    console.log('   - Has ai_data:', !!body.ai_data ? '✅ YES' : '❌ NO');
    console.log('   - Content keys:', body.content ? Object.keys(body.content).length : 0);
    console.log('   - AI data keys:', body.ai_data ? Object.keys(body.ai_data).length : 0);

    // ═══════════════════════════════════════════════════════════════
    // STEP 7: UPDATE DATABASE
    // ═══════════════════════════════════════════════════════════════
    console.log('💾 [STEP 7] Updating database...');
    console.log('   - Table: cover_letters');
    console.log('   - ID:', params.id);
    console.log('   - User ID:', user.id);

    const { data, error } = await supabase
      .from('cover_letters')
      .update({
        content: body.content,
        ai_data: body.ai_data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ [STEP 7] FAILED: Database error:', error);
      console.log('   - Error code:', error.code);
      console.log('   - Error message:', error.message);
      console.log('   - Error details:', error.details);
      console.log('   - Error hint:', error.hint);
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Database error',
        details: error.message,
        code: error.code,
        step: 'database_update'
      }, { status: 500 });
    }

    if (!data) {
      console.error('❌ [STEP 7] FAILED: No data returned (letter not found or unauthorized)');
      console.log('═══════════════════════════════════════════');
      return NextResponse.json({ 
        error: 'Not found',
        details: 'Cover letter not found or you do not have permission to update it',
        step: 'database_update'
      }, { status: 404 });
    }

    console.log('✅ [STEP 7] Database updated successfully');
    console.log('═══════════════════════════════════════════');
    console.log('✅✅✅ PATCH REQUEST COMPLETED SUCCESSFULLY ✅✅✅');
    console.log('═══════════════════════════════════════════');

    return NextResponse.json({ coverLetter: data });

  } catch (error) {
    console.error('❌❌❌ [API PATCH] UNEXPECTED ERROR ❌❌❌');
    console.error('Error:', error);
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.log('═══════════════════════════════════════════');
    
    return NextResponse.json({ 
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      step: 'unexpected_error'
    }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🗑️ [API DELETE] Cover letter request:', params.id);
  
  try {
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      console.error('❌ [API DELETE] No Authorization header');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ [API DELETE] User verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('cover_letters')
      .delete()
      .eq('id', params.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('❌ [API DELETE] Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ [API DELETE] Cover letter deleted successfully');
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [API DELETE] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}