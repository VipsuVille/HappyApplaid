// lib/pricing.ts
export const PRICING = {
  basic: {
    monthly: 2.99,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic123',
    features: [
      'V1 Hakukirjegeneraattori',
      'Kysymysgenerointi automaattisesti',
      'Master Guardian -validointi',
      'Rajaton määrä hakukirjeitä',
      'Sähköpostituki'
    ]
  },
  'semi-pro': {
    monthly: 6.99,
    stripePriceId: process.env.STRIPE_SEMI_PRO_PRICE_ID || 'price_semipro123',
    features: [
      'Kaikki Basic-tason ominaisuudet',
      'V2 ATS-optimoitu generaattori',
      'ATS-analyysi ja pisteytys',
      'Synonyymihaku avainsanoille',
      'Prioriteettituki'
    ]
  },
  pro: {
    monthly: 12.99,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || 'price_pro123',
    features: [
      'Kaikki Semi-Pro ominaisuudet',
      'RAG Knowledge Base -tuki',
      'Dynaamiset insights artikkeleista',
      'V1 + V2 generaattorit RAG:lla',
      'Priority-pohjainen sisältö',
      'Ensisijainen tuki'
    ]
  }
};

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