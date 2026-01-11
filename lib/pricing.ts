// lib/pricing.ts - UUSI 3-TIER RAKENNE

export const PRICING = {
  free: {
    name: "Free",
    monthly: 0,
    tokens: 0, // Ei tokeneita, vain 1 ilmainen
    storage: 0,
    stripePriceId: null,
    features: [
      "1 ilmainen CV tai hakukirje",
      "Testaa palvelua",
      "Profiilitiedot tallennetaan",
    ],
  },
  basic: {
    name: "Basic",
    monthly: 4.99,
    sixMonths: 26.94, // 4.99 * 6 * 0.9 = -10%
    yearly: 50.99,    // 4.99 * 12 * 0.85 = -15%
    tokens: 10000,
    storage: 50,
    tokenTopUp: {
      amount: 10000,
      price: 2.99,
      stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_TOPUP_PRICE_ID!,
    },
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_BASIC_MONTHLY_PRICE_ID!,
      sixMonths: process.env.NEXT_PUBLIC_STRIPE_BASIC_6M_PRICE_ID!,
      yearly: process.env.NEXT_PUBLIC_STRIPE_BASIC_YEARLY_PRICE_ID!,
    },
    features: [
      "10,000 tokenia/kk",
      "Rajattomat CV:t ja hakukirjeet",
      "Lisää tokeneita: 2.99€ = 10,000 tok",
      "50 kirjeen säilytys",
      "Profiilit tallennetaan",
    ],
  },
  premium: {
    name: "Premium",
    monthly: 14.99,
    sixMonths: 80.94,  // 14.99 * 6 * 0.9 = -10%
    yearly: 152.99,    // 14.99 * 12 * 0.85 = -15%
    tokens: 100000,
    storage: 100,
    stripePriceId: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_MONTHLY_PRICE_ID!,
      sixMonths: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_6M_PRICE_ID!,
      yearly: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_YEARLY_PRICE_ID!,
    },
    features: [
      "100,000 tokenia/kk",
      "Rajattomat CV:t ja hakukirjeet",
      "✅ ATS-optimointi",
      "✅ RAG-tietokanta (AI-boost)",
      "100 kirjeen säilytys",
      "Kaikki ominaisuudet",
    ],
  },
} as const;

export type Tier = keyof typeof PRICING;
export type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

// Feature mapping per tier
export const TIER_FEATURES = {
  free: {
    canUseV1: true,  // Perus CV & hakukirje
    canUseV2: false, // EI ATS
    canUseRAG: false,
    canUseATS: false,
    name: 'Free',
    maxStorage: 0,
  },
  basic: {
    canUseV1: true,
    canUseV2: false, // ✅ EI ATS
    canUseRAG: false, // ✅ EI RAG
    canUseATS: false,
    name: 'Basic',
    maxStorage: 50,
    canBuyTokens: true,
  },
  premium: {
    canUseV1: true,
    canUseV2: true,  // ✅ ATS
    canUseRAG: true, // ✅ RAG
    canUseATS: true,
    name: 'Premium',
    maxStorage: 100,
    canBuyTokens: false, // Ei tarvitse, 100k riittää
  },
} as const;

// Helper: Laske hinta per billing period
export function getPriceForPeriod(tier: Tier, period: BillingPeriod): number {
  if (tier === 'free') return 0;
  
  const config = PRICING[tier];
  
  // TypeScript type guard
  if ('sixMonths' in config && 'yearly' in config) {
    if (period === 'monthly') return config.monthly;
    if (period === 'sixMonths') return config.sixMonths;
    if (period === 'yearly') return config.yearly;
  }
  
  return 0;
}

// Helper: Laske säästö
export function getSavings(tier: Tier, period: BillingPeriod): string {
  if (period === 'monthly' || tier === 'free') return '';
  
  const config = PRICING[tier];
  
  // TypeScript type guard
  if ('sixMonths' in config && 'yearly' in config) {
    const monthlyTotal = period === 'sixMonths' 
      ? config.monthly * 6 
      : config.monthly * 12;
    
    const discountedPrice = period === 'sixMonths' 
      ? config.sixMonths 
      : config.yearly;
    
    const saved = monthlyTotal - discountedPrice;
    const percentage = period === 'sixMonths' ? 10 : 15;
    
    return `Säästä ${saved.toFixed(2)}€ (-${percentage}%)`;
  }
  
  return '';
}