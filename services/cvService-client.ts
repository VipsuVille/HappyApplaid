// services/cvService-client.ts
import { getSupabaseClient } from '@/lib/supabase-client';
import { BaseCV } from '@/types';

// ✅ HAE KAIKKI CV:T (vaatii Clerk tokenin)
export async function fetchCVs(userId: string, token: string) {
  try {
    console.log('🔍 [cvService] Fetching CVs for user:', userId);
    
    const supabase = await getSupabaseClient(token);
    
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [cvService] Error fetching CVs:', error);
      throw error;
    }

    console.log(`✅ [cvService] Fetched ${data?.length || 0} CVs`);
    return { data: data as BaseCV[], error: null };
    
  } catch (error) {
    console.error('❌ [cvService] Exception:', error);
    return { data: null, error };
  }
}

// ✅ HAE YKSITTÄINEN CV
export async function fetchCVById(cvId: string, userId: string, token: string) {
  try {
    console.log('🔍 [cvService] Fetching CV:', cvId);
    
    const supabase = await getSupabaseClient(token);
    
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('id', cvId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.warn('⚠️ CV not found');
        return { data: null, error: null };
      }
      console.error('❌ [cvService] Error:', error);
      throw error;
    }

    console.log('✅ [cvService] CV found');
    return { data: data as BaseCV, error: null };
    
  } catch (error) {
    console.error('❌ [cvService] Exception:', error);
    return { data: null, error };
  }
}

// ✅ PÄIVITÄ CV
export async function updateCV(cvId: string, updates: any, token: string) {
  try {
    console.log('📝 [cvService] Updating CV:', cvId);
    
    const supabase = await getSupabaseClient(token);
    
    const { data, error } = await supabase
      .from('cvs')
      .update(updates)
      .eq('id', cvId)
      .select()
      .single();

    if (error) {
      console.error('❌ [cvService] Update error:', error);
      throw error;
    }

    console.log('✅ [cvService] CV updated');
    return { data: data as BaseCV, error: null };
    
  } catch (error) {
    console.error('❌ [cvService] Update exception:', error);
    return { data: null, error };
  }
}

// ✅ POISTA CV
export async function deleteCV(cvId: string, userId: string, token: string) {
  try {
    console.log('🗑️ [cvService] Deleting CV:', cvId);
    
    const supabase = await getSupabaseClient(token);
    
    const { error } = await supabase
      .from('cvs')
      .delete()
      .eq('id', cvId)
      .eq('user_id', userId);

    if (error) {
      console.error('❌ [cvService] Delete error:', error);
      throw error;
    }

    console.log('✅ [cvService] CV deleted');
    return { error: null };
    
  } catch (error) {
    console.error('❌ [cvService] Delete exception:', error);
    return { error };
  }
}