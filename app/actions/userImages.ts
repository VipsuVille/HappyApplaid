// app/actions/userImages.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

export interface UserImage {
  id: string;
  image_type: 'profile' | 'background';
  file_path: string;
  name: string;
  is_active: boolean;
  is_ai_generated?: boolean;
  created_at: string;
  signedUrl?: string;
}

/**
 * ✅ Hakee käyttäjän omat + generoidut kuvat
 */
export async function getUserImagesAction(): Promise<{
  profileImages: UserImage[];
  backgroundImages: UserImage[];
}> {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  try {
    // Hae kaikki käyttäjän kuvat (sekä ladatut että AI-generoidut)
    const { data: images, error } = await supabaseAdmin
      .from('default_images')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user images:', error);
      throw error;
    }

    // Generoi signed URL:t
    const imagesWithUrls = await Promise.all(
      (images || []).map(async (image) => {
        const { data: urlData } = await supabaseAdmin.storage
          .from('cv_files')
          .createSignedUrl(image.file_path, 7 * 24 * 60 * 60); // 7 päivää

        return {
          id: image.id,
          image_type: image.image_type,
          file_path: image.file_path,
          name: image.name || 'Unnamed',
          is_active: image.is_active,
          is_ai_generated: image.is_ai_generated || false,
          created_at: image.created_at,
          signedUrl: urlData?.signedUrl
        } as UserImage;
      })
    );

    // Jaa profiilikuviin ja taustakuviin
    const result = {
      profileImages: imagesWithUrls.filter(img => img.image_type === 'profile'),
      backgroundImages: imagesWithUrls.filter(img => img.image_type === 'background')
    };

    console.log(`✅ Loaded ${result.profileImages.length} profile + ${result.backgroundImages.length} background images for user ${userId}`);

    return result;
  } catch (error) {
    console.error('❌ Error in getUserImagesAction:', error);
    return {
      profileImages: [],
      backgroundImages: []
    };
  }
}

/**
 * ✅ Hakee SEKÄ globaalit default-kuvat ETTÄ käyttäjän omat
 */
export async function getAllAvailableImagesAction(): Promise<{
  profileImages: UserImage[];
  backgroundImages: UserImage[];
}> {
  const { userId } = await auth();
  
  try {
    // Hae globaalit default-kuvat (user_id IS NULL)
    const { data: defaultImages } = await supabaseAdmin
      .from('default_images')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true);

    // Hae käyttäjän omat kuvat (jos kirjautunut)
    let userImages: any[] = [];
    if (userId) {
      const { data } = await supabaseAdmin
        .from('default_images')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      
      userImages = data || [];
    }

    // Yhdistä ja generoi URL:t
    const allImages = [...(defaultImages || []), ...userImages];

    const imagesWithUrls = await Promise.all(
      allImages.map(async (image) => {
        const { data: urlData } = await supabaseAdmin.storage
          .from('cv_files')
          .createSignedUrl(image.file_path, 7 * 24 * 60 * 60);

        return {
          id: image.id,
          image_type: image.image_type,
          file_path: image.file_path,
          name: image.name || 'Unnamed',
          is_active: image.is_active,
          is_ai_generated: image.is_ai_generated || false,
          created_at: image.created_at,
          signedUrl: urlData?.signedUrl
        } as UserImage;
      })
    );

    // Jaa tyypin mukaan
    return {
      profileImages: imagesWithUrls.filter(img => img.image_type === 'profile'),
      backgroundImages: imagesWithUrls.filter(img => img.image_type === 'background')
    };
  } catch (error) {
    console.error('❌ Error in getAllAvailableImagesAction:', error);
    return {
      profileImages: [],
      backgroundImages: []
    };
  }
}