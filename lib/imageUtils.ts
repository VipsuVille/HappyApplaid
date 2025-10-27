// utils/imageUtils.ts - YKSINKERTAISTETTU (ei tokeneita)
import { supabase } from "@/lib/supabase-client";

/**
 * Hakee default-kuvat Supabasesta
 * ✅ EI TOKENEITA - Käyttää RLS:ää automaattisesti
 */
export async function getDefaultImages(): Promise<{
  profileImages: string[];
  backgroundImages: string[];
}> {
  console.log("🖼️ [imageUtils] Fetching default images...");

  try {
    // Hae vain aktiiviset kuvat
    const { data: images, error } = await supabase
      .from("default_images")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching default images:", error);
      throw error;
    }

    if (!images || images.length === 0) {
      console.log("⚠️ No default images found");
      return {
        profileImages: [],
        backgroundImages: [],
      };
    }

    // Hae signed URL:t rinnakkain
    const urlPromises = images.map(async (img) => {
      const { data } = await supabase.storage
        .from("cv_files")
        .createSignedUrl(img.file_path, 3600); // 1h voimassaolo

      return { 
        type: img.image_type as 'profile' | 'background', 
        url: data?.signedUrl 
      };
    });

    const urlResults = await Promise.all(urlPromises);

    // Järjestele tulokset
    const result = {
      profileImages: [] as string[],
      backgroundImages: [] as string[],
    };

    urlResults.forEach(({ type, url }) => {
      if (!url) return;
      if (type === "profile") {
        result.profileImages.push(url);
      } else {
        result.backgroundImages.push(url);
      }
    });

    console.log(`✅ Loaded ${result.profileImages.length} profile images and ${result.backgroundImages.length} background images`);

    return result;

  } catch (error) {
    console.error("❌ Error in getDefaultImages:", error);
    // Palauta tyhjät listat virheen sattuessa
    return {
      profileImages: [],
      backgroundImages: [],
    };
  }
}

/**
 * Upload profile image using RLS-protected storage
 * ✅ EI TOKENEITA - Supabase Auth hoitaa
 */
export async function uploadProfileImage(
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `profile-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  console.log("📤 Uploading profile image:", filePath);

  // Upload file to user's folder
  const { error: uploadError } = await supabase.storage
    .from("cv-files")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true, // Allow overwriting
    });

  if (uploadError) {
    console.error("❌ Upload error:", uploadError);
    throw uploadError;
  }

  // Return public URL (RLS will handle access control)
  const { data } = supabase.storage
    .from("cv-files")
    .getPublicUrl(filePath);

  console.log("✅ Profile image uploaded:", data.publicUrl);
  return data.publicUrl;
}

/**
 * Get profile image URL - no signed URL needed with RLS!
 */
export function getProfileImageUrl(filePath: string): string {
  const { data } = supabase.storage.from("cv-files").getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Delete profile image
 * ✅ EI TOKENEITA - RLS tarkistaa käyttöoikeudet
 */
export async function deleteProfileImage(fileUrl: string): Promise<void> {
  // Extract the path from the URL
  const filePath = fileUrl.split("/storage/v1/object/public/cv-files/")[1];
  if (!filePath) return;

  console.log("🗑️ Deleting profile image:", filePath);

  const { error } = await supabase.storage
    .from("cv-files")
    .remove([filePath]);

  if (error) {
    console.error("❌ Delete error:", error);
    throw error;
  }

  console.log("✅ Profile image deleted");
}

/**
 * Tarkistaa onko URL validi kuva-URL
 */
export function isValidImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:image/');
  } catch {
    return false;
  }
}

/**
 * Muuntaa base64-kuvan pienemmäksi (max koko)
 */
export async function compressImage(
  base64Image: string,
  maxWidth: number = 800,
  maxHeight: number = 800
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Laske uudet mitat säilyttäen kuvasuhde
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = width * ratio;
        height = height * ratio;
      }

      // Luo canvas ja pienennä kuva
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Palauta base64
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = base64Image;
  });
}