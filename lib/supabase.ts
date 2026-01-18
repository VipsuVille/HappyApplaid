// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * 🔒 Apufunktio:
 * ENV tarkistetaan VASTA KÄYTÖSSÄ, ei importissa
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

/* ------------------------------------------------------------------ */
/*  PUBLIC SUPABASE CLIENT (selain + RLS)                              */
/* ------------------------------------------------------------------ */

let _publicClient: SupabaseClient | null = null;

/**
 * Käytä tätä:
 *  - selaimessa
 *  - API routeissa, joissa RLS riittää
 */
export function getSupabase(): SupabaseClient {
  if (_publicClient) return _publicClient;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  _publicClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-client-info": "supabase-js-public",
      },
    },
  });

  return _publicClient;
}

/**
 * 🔁 Yhteensopivuus vanhan koodin kanssa:
 *   import { supabase } from "@/lib/supabase"
 */
export const supabase = {
  from: (table: string) => getSupabase().from(table),
  storage: getSupabase().storage,
};

/* ------------------------------------------------------------------ */
/*  ADMIN SUPABASE CLIENT (server only, ohittaa RLS)                  */
/* ------------------------------------------------------------------ */

let _adminClient: SupabaseClient | null = null;

/**
 * ⚠️ Käytä VAIN API routeissa / server actions
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

  _adminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-client-info": "supabase-js-admin",
      },
    },
  });

  return _adminClient;
}

/* ------------------------------------------------------------------ */
/*  CLERK JWT - SUPABASE CLIENT                                       */
/* ------------------------------------------------------------------ */

export function getSupabaseWithClerkToken(
  clerkToken?: string
): SupabaseClient {
  if (!clerkToken) return getSupabase();

  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${clerkToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/* ------------------------------------------------------------------ */
/*  STORAGE / IMAGE HELPERS                                            */
/* ------------------------------------------------------------------ */

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

export async function getImageAsBase64(
  imageUrl: string
): Promise<string | null> {
  try {
    if (imageUrl.startsWith("data:image/")) {
      return imageUrl;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType =
      response.headers.get("content-type") || "image/jpeg";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}

export async function prepareImageForPDF(
  imageUrl: string | null
): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    if (response.ok) {
      return imageUrl;
    }
    return await getImageAsBase64(imageUrl);
  } catch {
    return await getImageAsBase64(imageUrl);
  }
}
