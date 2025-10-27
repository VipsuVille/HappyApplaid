// services/cvService-server.ts
'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function getDefaultImages() {
  const supabaseAdmin = await getSupabaseAdmin();
  const { data, error } = await supabaseAdmin
    .from('default_images')
    .select('*')
    .eq('is_active', true);
   
  if (error) throw error;
  return data;
}