// lib/domain/tokens.ts - PÄIVITETTY

export type TokenAction = 
  | 'cv_basic'              // Perus-CV ilman jobPostingia
  | 'cv_ats'                // CV + jobPosting optimointi
  | 'cv_rag'                // CV + RAG tietokanta
  | 'cover_letter_v1'       // Perus hakukirje (job-specific)
  | 'cover_letter_v2'       // ATS-optimoitu hakukirje
  | 'cover_letter_rag'      // RAG-optimoitu hakukirje
  | 'cover_letter_general'; //Yleinen esittelykirje

export type PlanType = 'free' | 'basic' | 'semi-pro' | 'pro';

export const ACTION_COSTS: Record<PlanType, Partial<Record<TokenAction, number>>> = {
  free: {}, // FREE ei kuluta tokeneita
  basic: {
    cv_basic: 200,
    cover_letter_v1: 50,
    cover_letter_general: 40, // ✅ Halvempi kuin job-specific
  },
  'semi-pro': {
    cv_basic: 200,
    cv_ats: 300,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_general: 40, // ✅ Sama hinta
  },
  pro: {
    cv_basic: 200,
    cv_ats: 300,
    cv_rag: 500,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 100,
    cover_letter_general: 40, // ✅ Edelleen halvin
  },
};

// Helper: Tarkista vaatiiko action tier-tason
export function requiresTier(action: TokenAction): 'free' | 'basic' | 'semi-pro' | 'pro' {
  if (action === 'cv_rag' || action === 'cover_letter_rag') return 'pro';
  if (action === 'cv_ats' || action === 'cover_letter_v2') return 'semi-pro';
  return 'basic';
}