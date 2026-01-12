// lib/pricing.ts

export type Tier = 'free' | 'basic' | 'premium';
export type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

type PaidTierConfig = {
  name: string;
  monthly: number;
  sixMonths: number;
  yearly: number;
  tokens: number;
  storage: number;
  stripePriceId: Record<BillingPeriod, string>;
  features: readonly string[];
};

type FreeTierConfig = {
  name: string;
  monthly: 0;
  tokens: 0;
  storage: 0;
  stripePriceId: null;
  features: readonly string[];
};

export const PRICING: {
  free: FreeTierConfig;
  basic: PaidTierConfig;
  premium: PaidTierConfig;
} = {
  free: {
    name: 'Free',
    monthly: 0,
    tokens: 0,
    storage: 0,
    stripePriceId: null,
    features: [
      '1 ilmainen CV tai hakukirje',
      'Testaa palvelua',
      'Profiilit tallennetaan',
    ],
  },

  basic: {
    name: 'Basic',
    monthly: 4.99,
    sixMonths: 26.94,
    yearly: 50.99,
    tokens: 10_000,
    storage: 50,
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID!,
      sixMonths: process.env.NEXT_PUBLIC_STRIPE_BASIC_6M_PRICE_ID!,
      yearly: process.env.NEXT_PUBLIC_STRIPE_BASIC_YEARLY_PRICE_ID!,
    },
    features: [
      '10 000 tokenia / kk',
      'CV:t ja hakukirjeet',
      'Ei ATS eikä RAG',
      'Token top-up saatavilla',
    ],
  },

  premium: {
    name: 'Premium',
    monthly: 14.99,
    sixMonths: 80.94,
    yearly: 152.99,
    tokens: 100_000,
    storage: 100,
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
      sixMonths: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_6M_PRICE_ID!,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID!,
    },
    features: [
      '100 000 tokenia / kk',
      'ATS + RAG',
      'Kaikki ominaisuudet',
    ],
  },
};

// Helpers
export function getPriceForPeriod(tier: Tier, period: BillingPeriod): number {
  if (tier === 'free') return 0;
  return PRICING[tier][period];
}

export function getSavings(tier: Tier, period: BillingPeriod): string {
  if (tier === 'free' || period === 'monthly') return '';
  return period === 'sixMonths' ? '−10 %' : '−15 %';
}
