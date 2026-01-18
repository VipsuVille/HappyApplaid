// lib/supabase-client.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ✅ Perus client (ei autentikaatiota)
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// ✅ Auth-client Clerkin JWT tokenilla
export const getSupabaseClient = async (token?: string) => {
  if (!token) return supabase;
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

// Taustakuvien URL-generointi (sama kuin ennen)
export const getBackgroundImageUrl = (userId: string, filename: string): string => {
  if (filename.startsWith("http")) return filename;
  if (filename.includes("backgrounds/")) {
    return `${supabaseUrl}/storage/v1/object/public/cv_files/${filename}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/cv_files/backgrounds/${userId}/${filename}`;
};


// UUSI: Funktio joka hakee kuvan base64 muodossa PDF:ää varten
export const getImageAsBase64 = async (
  imageUrl: string
): Promise<string | null> => {
  try {
    // Jos URL on jo base64, palauta se sellaisenaan
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

// KORJATTU: Profiilikuvien URL-generointi (pysyy samana)
export const getProfileImageUrl = (filePath: string): string | null => {
  if (!filePath) return null;
  if (filePath.startsWith("http")) return filePath;
  return `${supabaseUrl}/storage/v1/object/public/cv_files/${filePath}`;
};

// UUSI: Funktio joka varmistaa että kuvat ovat saatavilla PDF:ään
export const prepareImageForPDF = async (
  imageUrl: string | null
): Promise<string | null> => {
  if (!imageUrl) return null;

  try {
    // Testaa onko kuva saatavilla
    const response = await fetch(imageUrl, { method: "HEAD" });
    if (response.ok) {
      // Jos suora URL toimii, käytä sitä
      return imageUrl;
    } else {
      // Jos ei toimi, muunna base64:ksi
      return await getImageAsBase64(imageUrl);
    }
  } catch  {
    console.warn(
      `Image not accessible directly, converting to base64: ${imageUrl}`
    );
    return await getImageAsBase64(imageUrl);
  }
};
