// lib/pricing.ts - KORJATTU VERSIO
export const PRICING = {
  free: {
    name: "Free",
    monthly: 0,
    tokens: 50, // Yksi ilmainen CV
    stripePriceId: null,
    features: [
      "1 ilmainen CV",
      "Profiilitiedot tallennetaan",
      "Testaa palvelua",
    ],
  },
  basic: {
    name: "Basic",
    monthly: 4.99,
    tokens: 1000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!,
    features: [
      "Rajattomat CV:t (50 tokenia/kpl)",
      "Rajattomat hakukirjeet (50 tokenia/kpl)",
      "Kohdennetut työpaikkahakemukset",
      "Profiilitiedot tallennetaan",
    ],
  },
  "semi-pro": {
    name: "Semi-Pro",
    monthly: 9.99,
    tokens: 2000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_SEMIPRO_PRICE_ID!,
    features: [
      "Kaikki Basic-ominaisuudet",
      "ATS-optimoidut CV:t",
      "ATS-optimoidut hakukirjeet",
      "Läpäise isojen yhtiöiden tekoälysuodattimet",
    ],
  },
  pro: {
    name: "Pro",
    monthly: 15.99,
    tokens: 3000,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID!,
    features: [
      "Kaikki Semi-Pro -ominaisuudet",
      "RAG-artikkelit (eksperttitietokanta)",
      "AI 'boostaus' asiantuntijatiedolla",
      "Jatkuvasti päivittyvä tietokanta",
    ],
  },
} as const;

export type Tier = keyof typeof PRICING;

// Feature mapping per tier
export const TIER_FEATURES = {
  free: {
    canUseV1: true,
    canUseV2: false,
    canUseRAG: false,
    canUseATS: false,
    name: 'Free',
    costPerLetter: 0,
    maxCVs: 1,
    maxCoverLetters: 0
  },
  basic: {
    canUseV1: true,
    canUseV2: false,
    canUseRAG: false,
    canUseATS: false,
    name: 'Basic',
    costPerLetter: 0.004,
    maxCVs: 'unlimited',
    maxCoverLetters: 'unlimited'
  },
  'semi-pro': {
    canUseV1: true,
    canUseV2: true,
    canUseRAG: false,
    canUseATS: true,
    name: 'Semi-Pro',
    costPerLetter: 0.006,
    maxCVs: 'unlimited',
    maxCoverLetters: 'unlimited'
  },
  pro: {
    canUseV1: true,
    canUseV2: true,
    canUseRAG: true,
    canUseATS: true,
    name: 'Pro',
    costPerLetter: 0.008,
    maxCVs: 'unlimited',
    maxCoverLetters: 'unlimited'
  }
} as const;