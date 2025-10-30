// lib/profileImageUtils.client.ts (CLIENT-SAFE)
/**
 * Client-safe profile image utilities
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function getProfileImageUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  // HUOM: Käyttää public URL:a koska bucket on nyt public RLS:n kanssa
  return `${supabaseUrl}/storage/v1/object/public/cv_files/${filePath}`;
}

// Validoi kuvatiedosto client-puolella
export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: "Tiedosto on liian suuri. Maksimikoko on 5MB.",
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Tiedostotyyppi ei ole sallittu. Käytä JPG, PNG, GIF tai WebP.",
    };
  }

  return { valid: true };
}

// lib/profileImageUtils.ts (SERVER-SIDE ONLY)
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Validoi tiedostokoko (max 5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Sallitut tiedostotyypit
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface UploadResult {
  url: string;
  filePath: string;
}

/**
 * Upload profile image with automatic cleanup of old images
 * KÄYTTÖ: Vain API route handlers tai server actions
 */
export async function uploadProfileImage(
  userId: string,
  file: File,
  authToken: string
): Promise<UploadResult> {
  // Validoi tiedosto
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("Tiedosto on liian suuri. Maksimikoko on 5MB.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      "Tiedostotyyppi ei ole sallittu. Käytä JPG, PNG, GIF tai WebP."
    );
  }

  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    }
  );

  // Generoi unique tiedostonimi
  const fileExt = file.name.split(".").pop();
  const fileName = `profile_${userId}_${uuidv4()}.${fileExt}`;
  const filePath = `profiles/${userId}/${fileName}`;

  try {
    // Poista vanhat profiilikuvat ensin
    await cleanupOldProfileImages(userId, supabaseClient);

    // Upload uusi kuva
    const { error: uploadError } = await supabaseClient.storage
      .from("cv_files")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false, // Älä korvaa, koska käytämme unique nimiä
      });

    if (uploadError) {
      throw new Error(`Kuvan lataus epäonnistui: ${uploadError.message}`);
    }

    // Hae public URL
    const { data } = supabaseClient.storage
      .from("cv_files")
      .getPublicUrl(filePath);

    return {
      url: data.publicUrl,
      filePath: filePath,
    };
  } catch (error) {
    console.error("Profile image upload error:", error);
    throw error instanceof Error
      ? error
      : new Error("Kuvan lataus epäonnistui");
  }
}

/**
 * Poista vanhat profiilikuvat käyttäjältä
 * PRIVATE helper function
 */
async function cleanupOldProfileImages(userId: string, supabaseClient: SupabaseClient) {
  try {
    const { data: files, error } = await supabaseClient.storage
      .from("cv_files")
      .list(`profiles/${userId}/`, {
        limit: 100,
        offset: 0,
      });

    if (error || !files || files.length === 0) return;

    // Poista kaikki vanhat profiilikuvat
    const filesToDelete = files
      .filter((file: any) => file.name.startsWith("profile_"))
      .map((file: any) => `profiles/${userId}/${file.name}`);

    if (filesToDelete.length > 0) {
      await supabaseClient.storage.from("cv_files").remove(filesToDelete);
    }
  } catch (error) {
    console.warn("Old image cleanup failed (non-critical):", error);
  }
}

/**
 * Poista profiilikuva
 * KÄYTTÖ: Vain API route handlers tai server actions
 */
export async function deleteProfileImage(
  filePath: string,
  authToken: string
): Promise<void> {
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    }
  );

  const { error } = await supabaseClient.storage
    .from("cv_files")
    .remove([filePath]);

  if (error) {
    throw new Error(`Kuvan poisto epäonnistui: ${error.message}`);
  }
}

/**
 * Listaa käyttäjän profiilikuvat (admin/debug käyttöön)
 * KÄYTTÖ: Vain API route handlers
 */
export async function listUserProfileImages(
  userId: string,
  authToken: string
): Promise<string[]> {
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${authToken}` } },
    }
  );

  const { data: files, error } = await supabaseClient.storage
    .from("cv_files")
    .list(`profiles/${userId}/`, {
      limit: 100,
      offset: 0,
    });

  if (error) {
    throw new Error(`Tiedostojen listaus epäonnistui: ${error.message}`);
  }

  return (
    files
      ?.filter((file: any) => file.name.startsWith("profile_"))
      .map((file: any) => `profiles/${userId}/${file.name}`) || []
  );
}
