// lib/domain/tokens.ts

export type TokenAction = 
  | 'cv_simple'
  | 'cv_technical'
  | 'cv_creative'
  | 'cover_letter_v1' 
  | 'cover_letter_v2' 
  | 'cover_letter_rag';

export type PlanType = 'free' | 'basic' | 'semi-pro' | 'pro';

export const ACTION_COSTS: Record<PlanType, Partial<Record<TokenAction, number>>> = {
  free: {}, // FREE ei kuluta tokeneita
  basic: {
    cv_simple: 50,
    cv_technical: 50,
    cv_creative: 50,
    cover_letter_v1: 50,
  },
  'semi-pro': {
    cv_simple: 50,
    cv_technical: 75,
    cv_creative: 75,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
  },
  pro: {
    cv_simple: 50,
    cv_technical: 75,
    cv_creative: 100,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 100,
  },
};