// lib/domain/tokens.ts - PÄIVITETTY: Iteratiivinen muokkaus mukana

export type TokenAction = 
  | 'cv_basic'                  // Perus-CV ilman jobPostingia
  | 'cv_ats_addon'              // CV + ATS optimointi
  | 'cv_rag_addon'              // CV + RAG tietokanta
  | 'cover_letter_v1'           // Perus hakukirje (job-specific)
  | 'cover_letter_v2'           // ATS-optimoitu hakukirje
  | 'cover_letter_rag'          // RAG-optimoitu hakukirje
  | 'cover_letter_general'      // Yleinen esittelykirje
  | 'cover_letter_iterate';     // ✅ UUSI: Iteratiivinen muokkaus

// ✅ KORJATTU: Vain 3 tieriä
export type PlanType = 'free' | 'basic' | 'premium';

export const ACTION_COSTS: Record<PlanType, Partial<Record<TokenAction, number>>> = {
  free: {
    // FREE ei kuluta tokeneita (1 ilmainen CV + 1 ilmainen kirje)
  }, 
  
  basic: {
    cv_basic: 200,
    cover_letter_v1: 150,              // Job-specific
    cover_letter_general: 100,         // ✅ Halvempi kuin job-specific
    cover_letter_iterate: 50,          // ✅ UUSI: 67% halvempi kuin uusi
  },
  
  premium: {
    cv_basic: 200,
    cv_ats_addon: 300,                 // ATS-optimointi
    cv_rag_addon: 500,                 // RAG-tietokanta
    cover_letter_v1: 100,              // Job-specific (halvempi kuin Basic)
    cover_letter_v2: 300,              // ATS-optimoitu kirje (iteratiivinen)
    cover_letter_rag: 400,             // RAG-kirje
    cover_letter_general: 75,          // ✅ Yleinen esittely
    cover_letter_iterate: 30,          // ✅ UUSI: 70% halvempi kuin uusi
  },
};

// ✅ KORJATTU: Helper-funktio (vain 3 tieriä)
export function requiresTier(action: TokenAction): 'free' | 'basic' | 'premium' {
  // Premium-ominaisuudet
  if (action === 'cv_rag_addon' || action === 'cover_letter_rag') {
    return 'premium';
  }
  
  // Premium-ominaisuudet (ATS V2)
  if (action === 'cv_ats_addon' || action === 'cover_letter_v2') {
    return 'premium';
  }
  
  // Basic-ominaisuudet (iteraatio saatavilla sekä Basic että Premium)
  if (action === 'cover_letter_iterate') {
    return 'basic';
  }
  
  // Basic-ominaisuudet
  return 'basic';
}

// ✅ UUSI: Tarkista onko action sallittu tierillä
export function isActionAllowed(tier: PlanType, action: TokenAction): boolean {
  return ACTION_COSTS[tier]?.[action] !== undefined;
}

// ✅ UUSI: Hae action kustannus
export function getActionCost(tier: PlanType, action: TokenAction): number {
  return ACTION_COSTS[tier]?.[action] || 0;
}