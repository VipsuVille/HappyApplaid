// services/coverLetterService-client.ts
import { getSupabaseClient } from '@/lib/supabase-client';

// ✅ MUUTA: userId ensin, token toisena
export const fetchCoverLetters = async (token: string, userId: string) => {
  console.log("🔍 [Service] fetchCoverLetters called");
  console.log("🔍 [Service] token:", token?.substring(0, 20) + "...");
  console.log("🔍 [Service] userId:", userId);
  
  try {
    const supabase = await getSupabaseClient(token);
    console.log("✅ [Service] Supabase client created");
    
    const result = await supabase
      .from('cover_letters')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    console.log("📊 [Service] Query result:", result);
    console.log("📊 [Service] Data:", result.data);
    console.log("❌ [Service] Error:", result.error);
    
    return result;
  } catch (error) {
    console.error("❌ [Service] Exception:", error);
    throw error;
  }
};
// ✅ MUUTA: Yhdenmukaista kaikki funktiot
export const fetchCoverLetterById = async (id: string, token: string) => {
  const supabase = await getSupabaseClient(token);
  return supabase
    .from('cover_letters')
    .select('*')
    .eq('id', id)
    .single();
};

export const createCoverLetter = async (
  letterData: {
    user_id: string;
    title: string;
    content: any;
    ai_data: any;
    is_mock?: boolean;
  },
  token: string
) => {
  const supabase = await getSupabaseClient(token);
  return supabase
    .from('cover_letters')
    .insert(letterData)
    .select()
    .single();
};

export const updateCoverLetter = async (
  id: string,
  updates: {
    content?: any;
    ai_data?: any;
    title?: string;
  },
  token: string
) => {
  const supabase = await getSupabaseClient(token);
  return supabase
    .from('cover_letters')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
};

export const deleteCoverLetter = async (id: string, token: string) => {
  const supabase = await getSupabaseClient(token);
  return supabase
    .from('cover_letters')
    .delete()
    .eq('id', id);
};