// app/api/user-responses/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const context = searchParams.get('context');

    let query = supabaseAdmin
      .from('user_responses')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('question_category', category);
    }

    if (context) {
      query = query.eq('asked_in_context', context);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, responses: data || [] });
  } catch (error) {
    console.error('Error fetching responses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch responses' },
      { status: 500 }
    );
  }
}