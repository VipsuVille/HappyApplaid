//lib/supabase.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// lib/supabase.ts

// Julkinen client selaimelle (RLS päälla)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Admin client palvelinpuolelle (ohittaa RLS:n)
// HUOM: Käytä vain API routeissa, EI KOSKAAN selaimessa!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
/**
 * Luo allekirjoitetun URL:n tiedostolle Supabase Storage:ssa.
 * @param bucket - Bucketin nimi (esim. 'cv_files').
 * @param fileName - Tiedoston nimi (esim. 'user_123-bg.png').
 * @param expiresIn - URL:n voimassaoloaika sekunteina (oletus: 30 päivää).
 * @returns Allekirjoitettu URL tai heittää virheen, jos tiedostoa ei löydy.
 */
// lib/supabase.ts

export async function generateSignedUrl(
  bucket: string,
  fileName: string,
  expiresIn: number = 60 * 60 * 24 * 30 // 30 päivää
): Promise<string> {
  try {
    // POISTETAAN TURHA TIEDOSTON OLEMASSAOLON TARKISTUS
    // Suoraan allekirjoitetun URL:n luonti
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .createSignedUrl(fileName, expiresIn);

    if (error) throw new Error(`Error generating URL: ${error.message}`);
    if (!data?.signedUrl) throw new Error('URL generation failed');

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