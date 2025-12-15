// app/api/user-responses/[id]/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * PATCH - Päivitä vastaus
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params; // ✅ Await params
    const { answer } = await req.json();
    
    if (!answer) {
      return NextResponse.json({ error: 'Answer required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_responses')
      .update({
        answer,
        answer_length: answer.length,
        updated_at: new Date().toISOString()
      })
      .eq('id', id) // ✅ Käytä purettua id:tä
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, response: data });
  } catch (error) {
    console.error('Error updating response:', error);
    return NextResponse.json(
      { error: 'Failed to update response' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Poista vastaus
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authData = await auth();
  const userId = authData.userId;
  
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params; // ✅ Await params
    
    const { error } = await supabaseAdmin
      .from('user_responses')
      .delete()
      .eq('id', id) // ✅ Käytä purettua id:tä
      .eq('user_id', userId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting response:', error);
    return NextResponse.json(
      { error: 'Failed to delete response' },
      { status: 500 }
    );
  }
}