// lib/domain/tokens.ts - KORJATTU 3-TIER SYSTEEMI

export type TokenAction = 
  | 'cv_basic'              // Perus-CV ilman jobPostingia
  | 'cv_ats_addon'          // CV + ATS optimointi
  | 'cv_rag_addon'          // CV + RAG tietokanta
  | 'cover_letter_v1'       // Perus hakukirje (job-specific)
  | 'cover_letter_v2'       // ATS-optimoitu hakukirje
  | 'cover_letter_rag'      // RAG-optimoitu hakukirje
  | 'cover_letter_general'; // Yleinen esittelykirje

// ✅ KORJATTU: Vain 3 tieriä
export type PlanType = 'free' | 'basic' | 'premium';

export const ACTION_COSTS: Record<PlanType, Partial<Record<TokenAction, number>>> = {
  free: {}, // FREE ei kuluta tokeneita
  
  basic: {
    cv_basic: 200,
    cover_letter_v1: 50,
    cover_letter_general: 40, // ✅ Halvempi kuin job-specific
  },
  
  premium: {
    cv_basic: 200,
    cv_ats_addon: 300,         // ATS-optimointi
    cv_rag_addon: 500,         // RAG-tietokanta
    cover_letter_v1: 50,
    cover_letter_v2: 75,       // ATS-optimoitu kirje
    cover_letter_rag: 100,     // RAG-kirje
    cover_letter_general: 40,  // ✅ Edelleen halvin
  },
};

// ✅ KORJATTU: Helper-funktio (vain 3 tieriä)
export function requiresTier(action: TokenAction): 'free' | 'basic' | 'premium' {
  // Premium-ominaisuudet
  if (action === 'cv_rag_addon' || action === 'cover_letter_rag') {
    return 'premium';
  }
  
  // Premium-ominaisuudet (ATS)
  if (action === 'cv_ats_addon' || action === 'cover_letter_v2') {
    return 'premium';
  }
  
  // Basic-ominaisuudet
  return 'basic';
}

// ✅ UUSI: Tarkista onko action sallittu tierillä
export function isActionAllowed(tier: PlanType, action: TokenAction): boolean {
  return ACTION_COSTS[tier]?.[action] !== undefined;
}