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

const SIGNED_URL_TTL = 7 * 24 * 60 * 60; // 7 päivää

/**
 * ✅ Hakee käyttäjän omat + generoidut kuvat
 */
export async function getUserImagesAction(): Promise<{
  profileImages: UserImage[];
  backgroundImages: UserImage[];
}> {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');

  try {
    const { data: images, error } = await supabaseAdmin
      .from('default_images')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching user images:', error); throw error; }

    const imagesWithUrls = await Promise.all(
      (images || []).map(async (image) => {
        const { data: urlData } = await supabaseAdmin.storage
          .from('cv_files')
          .createSignedUrl(image.file_path, SIGNED_URL_TTL);
        return {
          id: image.id,
          image_type: image.image_type,
          file_path: image.file_path,
          name: image.name || 'Unnamed',
          is_active: image.is_active,
          is_ai_generated: image.is_ai_generated || false,
          created_at: image.created_at,
          signedUrl: urlData?.signedUrl,
        } as UserImage;
      })
    );

    const result = {
      profileImages: imagesWithUrls.filter(img => img.image_type === 'profile'),
      backgroundImages: imagesWithUrls.filter(img => img.image_type === 'background'),
    };
    console.log(`✅ Loaded ${result.profileImages.length} profile + ${result.backgroundImages.length} background images for user ${userId}`);
    return result;
  } catch (error) {
    console.error('❌ Error in getUserImagesAction:', error);
    return { profileImages: [], backgroundImages: [] };
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
    const { data: defaultImages } = await supabaseAdmin
      .from('default_images')
      .select('*')
      .is('user_id', null)
      .eq('is_active', true);

    let userImages: any[] = [];
    if (userId) {
      const { data } = await supabaseAdmin
        .from('default_images')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true);
      userImages = data || [];
    }

    const allImages = [...(defaultImages || []), ...userImages];

    const imagesWithUrls = await Promise.all(
      allImages.map(async (image) => {
        const { data: urlData } = await supabaseAdmin.storage
          .from('cv_files')
          .createSignedUrl(image.file_path, SIGNED_URL_TTL);
        return {
          id: image.id,
          image_type: image.image_type,
          file_path: image.file_path,
          name: image.name || 'Unnamed',
          is_active: image.is_active,
          is_ai_generated: image.is_ai_generated || false,
          created_at: image.created_at,
          signedUrl: urlData?.signedUrl,
        } as UserImage;
      })
    );

    return {
      profileImages: imagesWithUrls.filter(img => img.image_type === 'profile'),
      backgroundImages: imagesWithUrls.filter(img => img.image_type === 'background'),
    };
  } catch (error) {
    console.error('❌ Error in getAllAvailableImagesAction:', error);
    return { profileImages: [], backgroundImages: [] };
  }
}

/**
 * ✅ LATAA käyttäjän kuva Storageen ({userId}/profiles|backgrounds/...) +
 *    kirjaa default_images-tauluun. Palauttaa pysyvän file_path + signed URL.
 *    Korvaa base64-tavan → ei enää timeout 57014.
 */
export async function uploadUserImageAction(
  formData: FormData
): Promise<{ ok: boolean; image?: UserImage; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  const file = formData.get('file') as File | null;
  const imageType = (formData.get('imageType') as string) === 'background'
    ? 'background' : 'profile';

  if (!file) return { ok: false, error: 'Tiedosto puuttuu' };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: 'Max 5 MB' };

  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    // ✅ RAKENNE: {userId}/profiles|backgrounds/timestamp.ext (userId ensin → RLS-valmis)
    const folder = imageType === 'profile' ? 'profiles' : 'backgrounds';
    const filePath = `${userId}/${folder}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await supabaseAdmin.storage
      .from('cv_files')
      .upload(filePath, arrayBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      });
    if (upErr) throw upErr;

    const { data: row, error: dbErr } = await supabaseAdmin
      .from('default_images')
      .insert({
        user_id: userId,
        image_type: imageType,
        file_path: filePath,     // ✅ PYSYVÄ polku
        name: file.name,
        is_active: true,
        is_ai_generated: false,
      })
      .select()
      .single();
    if (dbErr) throw dbErr;

    const { data: urlData } = await supabaseAdmin.storage
      .from('cv_files')
      .createSignedUrl(filePath, SIGNED_URL_TTL);

    return {
      ok: true,
      image: {
        id: row.id,
        image_type: imageType,
        file_path: filePath,
        name: file.name,
        is_active: true,
        is_ai_generated: false,
        created_at: row.created_at,
        signedUrl: urlData?.signedUrl,
      },
    };
  } catch (e: any) {
    console.error('❌ uploadUserImageAction error:', e);
    return { ok: false, error: e?.message || 'Lataus epäonnistui' };
  }
}

/**
 * ✅ POISTAA käyttäjän kuvan (Storage + default_images). Vain OMAN (user_id-vahti).
 */
export async function deleteUserImageAction(
  imageId: string
): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: 'Unauthorized' };

  try {
    const { data: row, error } = await supabaseAdmin
      .from('default_images')
      .select('*')
      .eq('id', imageId)
      .eq('user_id', userId)   // ✅ KRIITTINEN: vain oma (service role ei suojaa)
      .single();
    if (error || !row) return { ok: false, error: 'Kuvaa ei löytynyt' };

    await supabaseAdmin.storage.from('cv_files').remove([row.file_path]);
    await supabaseAdmin
      .from('default_images')
      .delete()
      .eq('id', imageId)
      .eq('user_id', userId);   // ✅ molemmat ehdot
    return { ok: true };
  } catch (e: any) {
    console.error('❌ deleteUserImageAction error:', e);
    return { ok: false, error: e?.message || 'Poisto epäonnistui' };
  }
}