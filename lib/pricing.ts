// lib/pricing.ts
export type Tier = 'free' | 'basic' | 'premium';
export type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

export interface FeatureFlags {
  canUseV1: boolean;
  canUseV2: boolean;
  canUseRAG: boolean;
  canUseATS: boolean;
}

export interface PaidTierConfig {
  stripePriceId: Record<BillingPeriod, string>;
  features: string[]; // UI:ssa käytettävä lista
  featureFlags: FeatureFlags; // Backend-logiikka
}

export interface FreeTierConfig {
  features: string[];
  featureFlags: FeatureFlags;
}

export const PRICING: {
  free: FreeTierConfig;
  basic: PaidTierConfig;
  premium: PaidTierConfig;
} = {
  free: {
    features: [
      '1 ilmainen CV tai hakukirje',
      'Perustoiminnot',
      'Ei säilytystä',
    ],
    featureFlags: {
      canUseV1: false,
      canUseV2: false,
      canUseRAG: false,
      canUseATS: false,
    },
  },
  basic: {
    stripePriceId: {
      monthly: process.env.STRIPE_BASIC_MONTHLY_PRICE_ID!,
      sixMonths: process.env.STRIPE_BASIC_6M_PRICE_ID!,
      yearly: process.env.STRIPE_BASIC_YEARLY_PRICE_ID!,
    },
    features: [
      '10,000 tokenia/kk',
      'Rajaton määrä CV:itä ja hakukirjeitä',
      'Tallenna 50 kirjettä',
      'Osta lisää tokeneita (2.99€/10k)',
      'Tuki 24/7',
    ],
    featureFlags: {
      canUseV1: true,
      canUseV2: false,
      canUseRAG: false,
      canUseATS: false,
    },
  },
  premium: {
    stripePriceId: {
      monthly: process.env.STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
      sixMonths: process.env.STRIPE_PREMIUM_6M_PRICE_ID!,
      yearly: process.env.STRIPE_PREMIUM_YEARLY_PRICE_ID!,
    },
    features: [
      '100,000 tokenia/kk',
      'Rajaton määrä CV:itä ja hakukirjeitä',
      'ATS-optimointi',
      'RAG-tietokanta',
      'Tallenna 100 kirjettä',
      'Prioriteettituki',
    ],
    featureFlags: {
      canUseV1: true,
      canUseV2: true,
      canUseRAG: true,
      canUseATS: true,
    },
  },
} as const;

/**
 * Laskee säästöt pitkäaikaisille tilauksille
 */
export function getSavings(tier: 'basic' | 'premium', period: BillingPeriod): string {
  if (period === 'monthly') return '';

  const monthlyPrices = {
    basic: 4.99,
    premium: 14.99,
  };

  const actualPrices = {
    basic: {
      sixMonths: 26.94,
      yearly: 50.99,
    },
    premium: {
      sixMonths: 80.94,
      yearly: 152.99,
    },
  };

  const monthlyPrice = monthlyPrices[tier];
  const actualPrice = actualPrices[tier][period];
  const months = period === 'sixMonths' ? 6 : 12;
  const fullPrice = monthlyPrice * months;
  const savings = fullPrice - actualPrice;

  return `Säästät ${savings.toFixed(2)}€`;
}