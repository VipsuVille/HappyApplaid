import { createClient } from '@supabase/supabase-js';
import { useAuth } from '@clerk/nextjs';

// Luodaan client ilman auth-optioita
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


// Apufunktio allekirjoitetun URL:n luomiseen
export async function generateSignedUrl(
  bucket: string, 
  fileName: string,
  expiresIn: number = 60 * 60 * 24 * 30 // 30 päivää
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(fileName, expiresIn);

  if (error) {
    console.error('Error generating signed URL:', error);
    return null;
  }

  return data?.signedUrl;
}

export async function refreshSignedUrl(bucket: string, filePath: string) {
  return await generateSignedUrl(bucket, filePath);
}