// utils/pdfStorageUtils.ts - KORJATTU (Public-malli)
import { supabaseAdmin } from "@/lib/supabase";
import { getBackgroundImageUrl } from "@/lib/supabase-client";
import type { BaseCV } from "@/types";
import { auth } from "@clerk/nextjs/server";

// POISTETTU: Kaikki JWT-clientit ja token-logiikka

export const getCVById = async (cvId: string): Promise<BaseCV> => {
  // Hae CV suoraan ilman JWT:tä
  const { data: cv, error } = await supabaseAdmin
    .from("cvs")
    .select("*")
    .eq("id", cvId)
    .single();

  if (error) throw error;

  // Jos taustakuva on tallennettu file path -muodossa, muunna public URL:ksi
  if (
    cv.content?.ai_data?.background_image &&
    !cv.content.ai_data.background_image.startsWith("http")
  ) {
    cv.content.ai_data.background_image_url = getBackgroundImageUrl(
      cv.user_id,
      cv.content.ai_data.background_image
    );
  }

  return cv;
};

export const getUserCVs = async (userId: string): Promise<BaseCV[]> => {
  // VARMISTA että käytät RLS-policyja
  const { data, error } = await supabaseAdmin
    .from("cvs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase error:", error);
    throw new Error("Failed to fetch CVs");
  }

  // Lisää taustakuvien URL:t
  return (data || []).map((cv) => {
    if (
      cv.content?.ai_data?.background_image &&
      !cv.content.ai_data.background_image.startsWith("http")
    ) {
      cv.content.ai_data.background_image_url = getBackgroundImageUrl(
        cv.user_id,
        cv.content.ai_data.background_image
      );
    }
    return cv;
  });
};

export const deleteStoredCV = async (
  cvId: string
): Promise<{ success: boolean }> => {
  try {
    // Hae CV ja varmista olemassaolo
    const { data: cv, error: fetchError } = await supabaseAdmin
      .from("cvs")
      .select("user_id, content")
      .eq("id", cvId)
      .single();

    if (fetchError || !cv) {
      throw new Error(fetchError?.message || "CV not found");
    }

    // Poista tiedostot (jos niitä on)
    const userId = cv.user_id;
    const prefix = `${userId}/`;

    const { data: files } = await supabaseAdmin.storage
      .from("cv_files")
      .list(userId, { limit: 100 });

    if (files?.length) {
      // Poista vain tähän CV:hen liittyvät tiedostot
      const cvFiles = files.filter((f) => f.name.includes(cvId));
      if (cvFiles.length > 0) {
        const filePaths = cvFiles.map((f) => `${userId}/${f.name}`);
        await supabaseAdmin.storage.from("cv_files").remove(filePaths);
      }
    }

    // Poista CV-record
    const { error: deleteError } = await supabaseAdmin
      .from("cvs")
      .delete()
      .eq("id", cvId);

    if (deleteError) throw deleteError;

    return { success: true };
  } catch (error) {
    console.error("CV deletion failed:", error);
    throw error;
  }
};

export const fetchStoredCV = async (cvId: string): Promise<BaseCV> => {
  return getCVById(cvId);
};

export const updateCV = async (cvId: string, cvData: BaseCV): Promise<void> => {
  const { error } = await supabaseAdmin
    .from("cvs")
    .update({
      content: cvData.content,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cvId);

  if (error) throw error;
};
