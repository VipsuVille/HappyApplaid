// lib/supabase-admin.ts
"use server";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

/**
 * ✅ ADMIN CLIENT
 * - EI tarkista envtejä importissa
 * - Heittää virheen vasta kutsussa
 */
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  if (!_adminClient) {
    _adminClient = createClient(url, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return _adminClient;
}
