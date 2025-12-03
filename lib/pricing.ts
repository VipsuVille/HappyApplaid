// lib/pricing.ts - Päivitetty hinnoittelu
export const PRICING = {
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
  basic: {
    canUseV1: true,
    canUseV2: false,
    canUseRAG: false,
    canUseATS: false,
    name: 'Basic',
    costPerLetter: 0.004
  },
  'semi-pro': {
    canUseV1: true,
    canUseV2: true,
    canUseRAG: false,
    canUseATS: true,
    name: 'Semi-Pro',
    costPerLetter: 0.006
  },
  pro: {
    canUseV1: true,
    canUseV2: true,
    canUseRAG: true,
    canUseATS: true,
    name: 'Pro',
    costPerLetter: 0.008
  }
};