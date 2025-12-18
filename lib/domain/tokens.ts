// lib/domain/tokens.ts

export type TokenAction = 
  | 'cv_basic'        // Perus-CV ilman jobPostingia
  | 'cv_ats'          // CV + jobPosting optimointi
  | 'cv_rag'          // CV + RAG tietokanta
  | 'cover_letter_v1' // Perus hakukirje
  | 'cover_letter_v2' // ATS-optimoitu hakukirje
  | 'cover_letter_rag'; // RAG-optimoitu hakukirje

export type PlanType = 'free' | 'basic' | 'semi-pro' | 'pro';

export const ACTION_COSTS: Record<PlanType, Partial<Record<TokenAction, number>>> = {
  free: {}, // FREE ei kuluta tokeneita
  basic: {
    cv_basic: 200,           // ilman jobPostingia
    cover_letter_v1: 50,
  },
  'semi-pro': {
    cv_basic: 200,           // ilman jobPostingia
    cv_ats: 300,             // jobPosting + ATS
    cover_letter_v1: 50,
    cover_letter_v2: 75,
  },
  pro: {
    cv_basic: 200,           // ilman jobPostingia
    cv_ats: 300,             // jobPosting + ATS
    cv_rag: 500,             // RAG tietokanta
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 100,
  },
};

// Helper: Tarkista vaatiiko action tier-tason
export function requiresTier(action: TokenAction): 'free' | 'basic' | 'semi-pro' | 'pro' {
  if (action === 'cv_rag' || action === 'cover_letter_rag') return 'pro';
  if (action === 'cv_ats' || action === 'cover_letter_v2') return 'semi-pro';
  return 'basic';
}