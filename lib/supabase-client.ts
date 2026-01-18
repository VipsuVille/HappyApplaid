// lib/supabase-client.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _publicClient: SupabaseClient | null = null;

/**
 * ✅ PUBLIC SUPABASE CLIENT
 * - Ei heitä virhettä importissa
 * - Tarkistaa envit vasta käytössä
 */
export function getSupabaseClient(token?: string): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing public Supabase environment variables");
  }

  if (!token) {
    if (!_publicClient) {
      _publicClient = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
    }
    return _publicClient;
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * ✅ URL helperit (ei heitä buildissä)
 */
export function getBackgroundImageUrl(
  userId: string,
  filename: string
): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return "";

  if (filename.startsWith("http")) return filename;
  if (filename.includes("backgrounds/")) {
    return `${url}/storage/v1/object/public/cv_files/${filename}`;
  }
  return `${url}/storage/v1/object/public/cv_files/backgrounds/${userId}/${filename}`;
}

export function getProfileImageUrl(filePath: string): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${url}/storage/v1/object/public/cv_files/${filePath}`;
}
