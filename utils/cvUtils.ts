// utils/cvUtils.ts - KORJATTU
import { supabaseAdmin } from "@/lib/supabase";
import { BaseCV } from "@/types";

/**
 * Lataa käyttäjän kaikki CV:t
 * HUOM: Käyttää supabaseAdmin (ohittaa RLS)
 */
export async function loadUserCVs(userId: string): Promise<BaseCV[]> {
  if (!userId) {
    console.error("❌ loadUserCVs: userId is missing");
    throw new Error("User ID is required");
  }

  console.log("🔍 Loading CVs for user:", userId);

  try {
    // ✅ KÄYTÄ supabaseAdmin (ohittaa RLS)
    const { data, error } = await supabaseAdmin
      .from("cvs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Supabase error loading CVs:", error);
      throw new Error(`Failed to load CVs: ${error.message}`);
    }

    if (!data) {
      console.log("⚠️ No CVs found for user");
      return [];
    }

    console.log(`✅ Loaded ${data.length} CVs`);
    return data as BaseCV[];
    
  } catch (error) {
    console.error("❌ Error in loadUserCVs:", error);
    throw error;
  }
}

/**
 * Lataa yksittäinen CV ID:llä
 */
export async function loadCVById(cvId: string, userId: string): Promise<BaseCV | null> {
  if (!cvId || !userId) {
    throw new Error("CV ID and User ID are required");
  }

  console.log("🔍 Loading CV:", cvId);

  try {
    const { data, error } = await supabaseAdmin
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("❌ Error loading CV:", error);
      throw error;
    }

    if (!data) {
      console.log("⚠️ CV not found:", cvId);
      return null;
    }

    console.log("✅ CV loaded successfully");
    return data as BaseCV;
    
  } catch (error) {
    console.error("❌ Error in loadCVById:", error);
    throw error;
  }
}