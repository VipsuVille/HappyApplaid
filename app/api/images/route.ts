// app/api/images/route.ts
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { NextResponse } from 'next/server'

export async function GET() {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('default_images')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabaseAdmin = await getSupabaseAdmin();
  const { title, category, image_url } = await request.json()

  const { data, error } = await supabaseAdmin
    .from('default_images')
    .insert([{ title, category, image_url, is_active: true }])
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}