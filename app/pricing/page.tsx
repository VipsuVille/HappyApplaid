'use client';

import { useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@clerk/nextjs';
import { X } from 'lucide-react';

type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

// Hinnat UI:lle
const UI_PRICES = {
  basic: {
    monthly: { en: '€19 / mo', fi: '19 € / kk' },
    sixMonths: { en: '€99 / 6 mo', fi: '99 € / 6 kk' },
    yearly: { en: '€179 / year', fi: '179 € / vuosi' },
  },
  premium: {
    monthly: { en: '€39 / mo', fi: '39 € / kk' },
    sixMonths: { en: '€209 / 6 mo', fi: '209 € / 6 kk' },
    yearly: { en: '€359 / year', fi: '359 € / vuosi' },
  },
};

interface PlanCardProps {
  title: string;
  description: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
  onClick: () => void;
}

function PlanCard({
  title,
  description,
  price,
  features,
  cta,
  highlight = false,
  onClick,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-6 backdrop-blur transition-all ${
        highlight
          ? 'border-amber-400 bg-neutral-900/80 shadow-lg shadow-amber-500/20'
          : 'border-neutral-800 bg-neutral-900/50'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
          Most popular
        </div>
      )}

      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 text-neutral-400 text-sm">{description}</p>

      <div className="mt-6 text-4xl font-bold text-white">{price}</div>

      <ul className="mt-6 space-y-2 text-sm text-neutral-300">
        {features.map((f, idx) => (
          <li key={idx} className="flex items-start">
            <span className="text-amber-400 mr-2">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onClick}
        className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
          highlight
            ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-lg'
            : 'bg-white text-black hover:bg-neutral-200'
        }`}
      >
        {cta}
      </button>
    </div>
  );
}

function CompareModal({ onClose, isEN }: { onClose: () => void; isEN: boolean }) {
  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div 
        className="max-w-4xl w-full bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-bold text-white mb-6">
          {isEN ? 'Compare plans in detail' : 'Vertaa paketteja tarkemmin'}
        </h3>

        <div className="space-y-6">
          {/* Who is it for */}
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-3">
              {isEN ? 'Who should choose which?' : 'Kenelle mikäkin sopii?'}
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-neutral-800/50 rounded-xl p-4">
                <h5 className="font-semibold text-white mb-2">Basic</h5>
                <p className="text-sm text-neutral-300">
                  {isEN
                    ? 'Perfect when applying to smaller companies where a human reviews your application directly.'
                    : 'Täydellinen pienempiin yrityksiin haettaessa, joissa ihminen lukee hakemuksesi.'}
                </p>
              </div>
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
                <h5 className="font-semibold text-amber-400 mb-2">Premium</h5>
                <p className="text-sm text-neutral-300">
                  {isEN
                    ? 'Essential for applications to companies using ATS (Applicant Tracking Systems). Most mid-to-large companies use these.'
                    : 'Välttämätön haettaessa yrityksiin, jotka käyttävät ATS-järjestelmiä. Useimmat keskisuuret ja suuret yritykset käyttävät niitä.'}
                </p>
              </div>
            </div>
          </div>

          {/* Feature comparison */}
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-3">
              {isEN ? 'Key differences' : 'Keskeiset erot'}
            </h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center bg-neutral-800/30 rounded-lg p-3">
                <span className="text-neutral-300">
                  {isEN ? 'ATS optimization' : 'ATS-optimointi'}
                </span>
                <div className="flex gap-8">
                  <span className="text-red-400">Basic: ✗</span>
                  <span className="text-green-400">Premium: ✓</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-neutral-800/30 rounded-lg p-3">
                <span className="text-neutral-300">
                  {isEN ? 'STAR method cover letters' : 'STAR-menetelmä kirjeisiin'}
                </span>
                <div className="flex gap-8">
                  <span className="text-red-400">Basic: ✗</span>
                  <span className="text-green-400">Premium: ✓</span>
                </div>
              </div>
              <div className="flex justify-between items-center bg-neutral-800/30 rounded-lg p-3">
                <span className="text-neutral-300">
                  {isEN ? 'Save applications' : 'Tallenna hakemuksia'}
                </span>
                <div className="flex gap-8">
                  <span className="text-neutral-300">Basic: 50</span>
                  <span className="text-amber-400">Premium: 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Token explanation */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">
              {isEN ? 'How do tokens work?' : 'Miten tokenit toimivat?'}
            </h4>
            <p className="text-sm text-neutral-300">
              {isEN
                ? 'Tokens measure computation, not documents. You can generate unlimited CVs and cover letters as long as you have tokens available. This prevents abuse while giving you flexibility.'
                : 'Tokenit mittaavat laskentaa, eivät dokumentteja. Voit luoda rajattomasti CV:itä ja hakukirjeitä niin kauan kuin tokeneita on. Tämä estää väärinkäytön mutta antaa joustavuutta.'}
            </p>
          </div>

          {/* Bottom line */}
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-amber-400 mb-2">
              {isEN ? 'Bottom line' : 'Yhteenveto'}
            </h4>
            <p className="text-sm text-neutral-300">
              {isEN
                ? 'If you\'re applying to companies with 50+ employees, Premium is not optional – it\'s required to get past automated screening.'
                : 'Jos haet yrityksiin, joissa on 50+ työntekijää, Premium ei ole valinnainen – se on välttämätön automaattisen seulonnan läpäisemiseksi.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [showCompare, setShowCompare] = useState(false);

  const isEN = language === 'en';

  const basicFeatures = [
    isEN ? 'Unlimited CVs & cover letters' : 'Rajattomasti CV:t ja kirjeet',
    isEN ? '10,000 tokens/month' : '10 000 tokenia/kk',
    isEN ? 'Save up to 50 applications' : 'Tallenna 50 hakemusta',
    isEN ? 'No ATS optimization' : 'Ei ATS-optimointia',
  ];

  const premiumFeatures = [
    isEN ? 'Unlimited CVs & cover letters' : 'Rajattomasti CV:t ja kirjeet',
    isEN ? '100,000 tokens/month' : '100 000 tokenia/kk',
    isEN ? 'ATS-optimized documents' : 'ATS-optimoidut dokumentit',
    isEN ? 'STAR method cover letters' : 'STAR-menetelmä kirjeisiin',
    isEN ? 'Save up to 100 applications' : 'Tallenna 100 hakemusta',
  ];

  async function handleCheckout(tier: 'basic' | 'premium') {
    if (!user) {
      alert(isEN ? 'Please sign in first' : 'Ole hyvä ja kirjaudu ensin');
      return;
    }
    
    // Tässä kutsutaan oikeaa server actionia
    console.log(`Checkout: ${tier}, ${billing}`);
    alert(`${tier} ${billing} checkout would happen here`);
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950">
      <section className="max-w-7xl mx-auto px-4 py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-center text-white">
          {isEN ? 'Simple pricing. Real advantage.' : 'Selkeä hinnoittelu. Aito etu.'}
        </h1>
        <p className="mt-4 text-center text-neutral-400 max-w-2xl mx-auto">
          {isEN
            ? 'Choose the plan that matches how competitive your job search is.'
            : 'Valitse paketti sen mukaan, kuinka kilpailtuihin tehtäviin haet.'}
        </p>

        {/* Billing period toggle */}
        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {[
            { key: 'monthly' as BillingPeriod, label: { en: 'Monthly', fi: 'Kuukausi' } },
            { key: 'sixMonths' as BillingPeriod, label: { en: '6 months', fi: '6 kk' } },
            { key: 'yearly' as BillingPeriod, label: { en: 'Yearly', fi: 'Vuosi' } },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setBilling(key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                billing === key
                  ? 'bg-amber-500 text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {label[language]}
            </button>
          ))}
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PlanCard
            title="Basic"
            description={
              isEN
                ? 'Great for smaller companies and human-reviewed applications.'
                : 'Sopii pienempiin yrityksiin ja ihmisen lukemiin hakemuksiin.'
            }
            price={UI_PRICES.basic[billing][language]}
            features={basicFeatures}
            cta={isEN ? 'Choose Basic' : 'Valitse Basic'}
            onClick={() => handleCheckout('basic')}
          />

          <PlanCard
            title="Premium"
            description={
              isEN
                ? 'Built to beat ATS systems and stand out in competitive roles.'
                : 'Suunniteltu läpäisemään ATS-järjestelmät ja erottumaan.'
            }
            price={UI_PRICES.premium[billing][language]}
            features={premiumFeatures}
            cta={isEN ? 'Go Premium' : 'Valitse Premium'}
            onClick={() => handleCheckout('premium')}
            highlight
          />
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => setShowCompare(true)}
            className="text-sm text-neutral-400 hover:text-amber-400 underline transition-colors"
          >
            {isEN ? '🔍 Compare plans in detail' : '🔍 Vertaa paketteja tarkemmin'}
          </button>
        </div>
      </section>

      {showCompare && <CompareModal onClose={() => setShowCompare(false)} isEN={isEN} />}
    </main>
  );
}