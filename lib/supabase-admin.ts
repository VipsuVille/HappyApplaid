// lib/supabase-admin.ts
'use server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase admin environment variables');
}

let _supabaseAdmin: SupabaseClient | null = null;

export async function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseAdmin;
}