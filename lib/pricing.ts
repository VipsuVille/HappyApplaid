// lib/pricing.ts
export const PRICING = {
  basic: {
    monthly: 5.99,
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID || 'price_basic123',
    features: [
      '1000 tokenia kuukaudessa',
      'Pääsy perusominaisuuksiin',
      'Rajaton määrä ansioluetteloita',
      'Sähköpostituki'
    ]
  },
  premium: {
    monthly: 19.99,
    stripePriceId: process.env.STRIPE_PREMIUM_PRICE_ID || 'price_premium123',
    features: [
      '3000 tokenia kuukaudessa',
      'Kaikki Basic-tason ominaisuudet',
      'Saatekirjeiden luonti',
      'Edistyneet CV-mallit',
      'Prioriteettituki'
    ]
  },
  professional: {
    monthly: 29.99,
    stripePriceId: process.env.STRIPE_PROFESSIONAL_PRICE_ID || 'price_professional123',
    features: [
      '5000 tokenia kuukaudessa',
      'Kaikki Premium-tason ominaisuudet',
      'LinkedIn-profiilin optimointi',
      'Henkilökohtainen neuvonta',
      'Ensisijainen tuki'
    ]
  }
};