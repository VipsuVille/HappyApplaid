// lib/domain/actions.ts

export type TokenAction =
  | 'cover_letter_v1'
  | 'cover_letter_v2'
  | 'cover_letter_rag';

export type PlanType = 'free' | 'basic' | 'semi-pro' | 'pro';

export const ACTION_COSTS: Record<PlanType, Record<TokenAction, number>> = {
  free: {
    cover_letter_v1: 0,
    cover_letter_v2: 0,
    cover_letter_rag: 0,
  },
  basic: {
    cover_letter_v1: 50,
    cover_letter_v2: 0,
    cover_letter_rag: 0,
  },
  'semi-pro': {
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 0,
  },
  pro: {
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 100,
  },
};
