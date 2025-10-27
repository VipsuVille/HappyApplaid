// app/api/images/[id]/route.ts
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { error } = await supabaseAdmin
    .from('default_images')
    .delete()
    .eq('id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { is_active } = await request.json()

  const { data, error } = await supabaseAdmin
    .from('default_images')
    .update({ is_active })
    .eq('id', params.id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}