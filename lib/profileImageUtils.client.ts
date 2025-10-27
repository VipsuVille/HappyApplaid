// lib/profileImageUtils.client.ts
export function getProfileImageUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  return `${supabaseUrl}/storage/v1/object/public/cv_files/${filePath}`;
}

export function validateImageFile(file: File): {
  valid: boolean;
  error?: string;
} {
  const MAX_SIZE = 5 * 1024 * 1024;
  const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  if (file.size > MAX_SIZE) {
    return {
      valid: false,
      error: "Tiedosto on liian suuri. Maksimikoko on 5MB.",
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Tiedostotyyppi ei ole sallittu." };
  }

  return { valid: true };
}
