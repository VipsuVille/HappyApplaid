// lib/domain/freeUsageGuard.ts
import { supabaseAdmin } from "@/lib/supabase";

export type FreeAction = 'cv' | 'cover_letter';

export interface FreeUsageStatus {
  canUse: boolean;
  reason?: string;
  hasUsedCV: boolean;
  hasUsedCoverLetter: boolean;
  hasUsedAny: boolean;
}

/**
 *  MITÄ TÄMÄ TEKEE:
 * - Tarkistaa onko free-käyttäjä käyttänyt ilmaisen tokeninsa
 * - Free-käyttäjä saa YHDEN ilmaisen toiminnon (CV TAI hakukirje, ei molempia)
 * - Toimii vaikka käyttäjä olisi aiemmin ollut maksava
 */

/**
 * ✅ UNIFIED FREE USAGE CHECKER
 * 
 * Tarkistaa onko free-käyttäjä käyttänyt:
 * - CV:n (kaikki tyypit)
 * - Hakukirjeen (kaikki tyypit: v1, v2, general)
 * 
 * Free-käyttäjä saa vain YHDEN ilmaisen toiminnon KOSKAAN.
 */
export async function checkFreeUsage(
  userId: string,
  action: FreeAction
): Promise<FreeUsageStatus> {
  
  // 1. HAE free_usage taulu
  const { data: freeUsage, error } = await supabaseAdmin
    .from('free_usage')
    .select('used_free_cv, used_free_cover_letter')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('❌ Free usage check failed:', error);
    throw new Error('FREE_USAGE_CHECK_FAILED');
  }

  // Jos riviä ei ole, luo se
  if (!freeUsage) {
    const { error: insertError } = await supabaseAdmin
      .from('free_usage')
      .insert({
        user_id: userId,
        used_free_cv: false,
        used_free_cover_letter: false,
      });

    if (insertError) {
      console.error('❌ Failed to create free_usage row:', insertError);
      throw new Error('FREE_USAGE_INIT_FAILED');
    }

    // Uusi käyttäjä - saa käyttää
    return {
      canUse: true,
      hasUsedCV: false,
      hasUsedCoverLetter: false,
      hasUsedAny: false,
    };
  }

  // 2. TARKISTA STATUS
  const hasUsedCV = freeUsage.used_free_cv === true;
  const hasUsedCoverLetter = freeUsage.used_free_cover_letter === true;
  const hasUsedAny = hasUsedCV || hasUsedCoverLetter;

  // 3. PÄÄTÖKSET
  if (action === 'cv') {
    if (hasUsedCV) {
      return {
        canUse: false,
        reason: 'FREE_CV_ALREADY_USED',
        hasUsedCV: true,
        hasUsedCoverLetter,
        hasUsedAny: true,
      };
    }

    if (hasUsedCoverLetter) {
      return {
        canUse: false,
        reason: 'FREE_SLOT_USED_FOR_COVER_LETTER',
        hasUsedCV: false,
        hasUsedCoverLetter: true,
        hasUsedAny: true,
      };
    }

    return {
      canUse: true,
      hasUsedCV: false,
      hasUsedCoverLetter: false,
      hasUsedAny: false,
    };
  }

  if (action === 'cover_letter') {
    if (hasUsedCoverLetter) {
      return {
        canUse: false,
        reason: 'FREE_COVER_LETTER_ALREADY_USED',
        hasUsedCV,
        hasUsedCoverLetter: true,
        hasUsedAny: true,
      };
    }

    if (hasUsedCV) {
      return {
        canUse: false,
        reason: 'FREE_SLOT_USED_FOR_CV',
        hasUsedCV: true,
        hasUsedCoverLetter: false,
        hasUsedAny: true,
      };
    }

    return {
      canUse: true,
      hasUsedCV: false,
      hasUsedCoverLetter: false,
      hasUsedAny: false,
    };
  }

  throw new Error('INVALID_ACTION');
}

/**
 * ✅ MARK FREE USAGE AS CONSUMED
 */
export async function consumeFreeUsage(
  userId: string,
  action: FreeAction
): Promise<boolean> {
  
  const updateField = action === 'cv' ? 'used_free_cv' : 'used_free_cover_letter';

  const { error } = await supabaseAdmin
    .from('free_usage')
    .upsert({
      user_id: userId,
      [updateField]: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error(`❌ Failed to mark ${action} as used:`, error);
    return false;
  }

  console.log(`✅ Marked free ${action} as used for ${userId}`);
  return true;
}

/**
 * ✅ GET FREE USAGE INFO (for frontend display)
 */
export async function getFreeUsageInfo(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('free_usage')
    .select('used_free_cv, used_free_cover_letter')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return {
      hasUsedCV: false,
      hasUsedCoverLetter: false,
      hasUsedAny: false,
      remainingFreeActions: 1,
    };
  }

  const hasUsedCV = data.used_free_cv === true;
  const hasUsedCoverLetter = data.used_free_cover_letter === true;
  const hasUsedAny = hasUsedCV || hasUsedCoverLetter;

  return {
    hasUsedCV,
    hasUsedCoverLetter,
    hasUsedAny,
    remainingFreeActions: hasUsedAny ? 0 : 1,
  };
}