// app/actions.ts
'use server';

import { createClient } from '@supabase/supabase-js';

// Default image interface
export interface DefaultImage {
  id: string;
  image_type: 'profile' | 'background';
  file_path: string;
  name: string;
  is_active: boolean;
  signedUrl?: string;
}

export async function getDefaultImagesAction(): Promise<DefaultImage[]> {
  // Create a server-side Supabase client using environment variables
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Get active default images
  const { data: images, error } = await supabase
    .from('default_images')
    .select('*')
    .eq('is_active', true);

  if (error) {
    console.error('Error fetching default images:', error);
    throw new Error('Failed to load default images');
  }

  // Generate signed URLs for each image
  const imagesWithUrls: DefaultImage[] = await Promise.all(
    (images || []).map(async (image: any) => {
      const { data: urlData } = await supabase.storage
        .from('cv_files')
        .createSignedUrl(image.file_path, 3600); // 1 hour expiration
      
      return {
        id: image.id,
        image_type: image.image_type,
        file_path: image.file_path,
        name: image.name || 'Unnamed',
        is_active: image.is_active,
        signedUrl: urlData?.signedUrl
      };
    })
  );

  return imagesWithUrls;
}