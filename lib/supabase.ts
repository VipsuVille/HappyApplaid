// lib/supabase.ts - KORJATTU KONFIGURAATIO

import { createClient } from '@supabase/supabase-js';

// ✅ YMPÄRISTÖMUUTTUJAT
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
}

if (!supabaseAnonKey) {
  throw new Error('❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

// ✅ PUBLIC CLIENT (selain + RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web',
    },
  },
});

// ✅ ADMIN CLIENT (palvelin + ohittaa RLS)
// HUOM: Käytä VAIN API routeissa!
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey, // Fallback if service key missing
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-admin',
      },
    },
  }
);

// ✅ TARKISTA SERVICE ROLE KEY
if (!supabaseServiceKey) {
  console.error('⚠️ CRITICAL: SUPABASE_SERVICE_ROLE_KEY missing!');
  console.error('   Admin operations will fail or use wrong permissions.');
  console.error('   Add to .env.local:');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key');
}

console.log('✅ Supabase initialized');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Admin mode: ${!!supabaseServiceKey ? '✅' : '❌ MISSING'}`);

/**
 * ✅ ALLEKIRJOITETUT URL:T
 */
export async function generateSignedUrl(
  bucket: string,
  fileName: string,
  expiresIn: number = 60 * 60 * 24 * 30 // 30 päivää
): Promise<string> {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(fileName, expiresIn);

    if (error) {
      console.error('Signed URL error:', error);
      throw new Error(`Error generating URL: ${error.message}`);
    }
    
    if (!data?.signedUrl) {
      throw new Error('URL generation failed - no URL returned');
    }

    return data.signedUrl;
  } catch (error) {
    console.error('Error generating signed URL:', {
      bucket,
      fileName,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * ✅ CLERK JWT AUTH CLIENT (käytetään jos tarvitaan user-kontekstia)
 */
export const getSupabaseClient = async (clerkToken?: string) => {
  if (!clerkToken) return supabase;
  
  return createClient(supabaseUrl, supabaseAnonKey, {
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
};

/**
 * ✅ BACKGROUND IMAGE URL
 */
export const getBackgroundImageUrl = (userId: string, filename: string): string => {
  if (filename.startsWith("http")) return filename;
  if (filename.includes("backgrounds/")) {
    return `${supabaseUrl}/storage/v1/object/public/cv_files/${filename}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/cv_files/backgrounds/${userId}/${filename}`;
};

/**
 * ✅ PROFILE IMAGE URL
 */
export const getProfileImageUrl = (filePath: string): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${supabaseUrl}/storage/v1/object/public/cv_files/${filePath}`;
};

/**
 * ✅ IMAGE TO BASE64 (PDF:lle)
 */
export const getImageAsBase64 = async (imageUrl: string): Promise<string | null> => {
  try {
    if (imageUrl.startsWith("data:image/")) {
      return imageUrl;
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${imageUrl}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
};

/**
 * ✅ PREPARE IMAGE FOR PDF
 */
export const prepareImageForPDF = async (imageUrl: string | null): Promise<string | null> => {
  if (!imageUrl) return null;

  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    if (response.ok) {
      return imageUrl;
    } else {
      return await getImageAsBase64(imageUrl);
    }
  } catch {
    console.warn(`Image not accessible, converting to base64: ${imageUrl}`);
    return await getImageAsBase64(imageUrl);
  }
};