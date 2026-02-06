'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import { useUser } from '@clerk/nextjs';
import { X, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { createCheckoutSessionAction } from '@/app/actions/stripe';
import { PRICING, BillingPeriod } from '@/lib/pricing';
import { useTokens } from '@/hooks/useTokens';
import dynamic from 'next/dynamic';

const PromoCodeRedeem = dynamic(
  () => import('@/components/promoCode'),
  { ssr: false }
);

// ✅ SYNC WITH pricing.ts
const UI_PRICES = {
  basic: {
    monthly: { en: '€4.99 / mo', fi: '4,99 € / kk' },
    sixMonths: { en: '€26.94 / 6 mo', fi: '26,94 € / 6 kk' },
    yearly: { en: '€50.99 / year', fi: '50,99 € / vuosi' },
  },
  premium: {
    monthly: { en: '€14.99 / mo', fi: '14,99 € / kk' },
    sixMonths: { en: '€80.94 / 6 mo', fi: '80,94 € / 6 kk' },
    yearly: { en: '€152.99 / year', fi: '152,99 € / vuosi' },
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
  disabled?: boolean; // ✅ UUSI
  disabledReason?: string; // ✅ UUSI
}

function PlanCard({
  title,
  description,
  price,
  features,
  cta,
  highlight = false,
  onClick,
  disabled = false,
  disabledReason,
}: PlanCardProps) {
  return (
    <div
      className={`relative rounded-2xl sm:rounded-[2.5rem] border p-6 sm:p-8 backdrop-blur transition-all ${
        highlight
          ? 'border-amber-400 dark:border-amber-500/50 bg-white/80 dark:bg-neutral-900/80 shadow-lg shadow-amber-500/20'
          : 'border-gray-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50'
      }`}
    >
      {highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-xs font-semibold px-3 py-1 rounded-full">
          Most popular
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
      <p className="mt-2 text-gray-600 dark:text-neutral-400 text-sm">{description}</p>

      <div className="mt-6 text-4xl font-bold text-gray-900 dark:text-white">{price}</div>

      <ul className="mt-6 space-y-2 text-sm text-gray-700 dark:text-neutral-300">
        {features.map((f, idx) => (
          <li key={idx} className="flex items-start">
            <span className="text-amber-400 mr-2">•</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* ✅ DISABLED STATE */}
      {disabled && disabledReason ? (
        <div className="mt-8 w-full rounded-xl py-3 text-sm font-semibold bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-500 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {disabledReason}
        </div>
      ) : (
        <button
          onClick={onClick}
          disabled={disabled}
          className={`mt-8 w-full rounded-xl py-3 text-sm font-semibold transition-all ${
            highlight
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 shadow-lg'
              : 'bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-neutral-200'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {cta}
        </button>
      )}
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
        className="max-w-4xl w-full bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 dark:text-neutral-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {isEN ? 'Compare plans in detail' : 'Vertaa paketteja tarkemmin'}
        </h3>

        <div className="space-y-6">
          {/* Who is it for */}
          <div>
            <h4 className="text-lg font-semibold text-amber-500 dark:text-amber-400 mb-3">
              {isEN ? 'Which plan for which companies?' : 'Kumpi paketti mihinkin yritykseen?'}
            </h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-neutral-800/50 rounded-xl p-4">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  Basic
                  <span className="text-xs font-normal text-gray-500 dark:text-neutral-400">
                    ({isEN ? 'Company size: <50' : 'Yrityksen koko: <50'})
                  </span>
                </h5>
                <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
                  {isEN
                    ? 'Ideal for startups, small businesses, and local companies where a hiring manager or founder reviews applications directly.'
                    : 'Ihanteellinen startup-yrityksiin, pieniin yrityksiin ja paikallisiin yrityksiin, joissa rekrytoija tai perustaja lukee hakemukset suoraan.'}
                </p>
                <p className="text-xs text-gray-500 dark:text-neutral-400 italic">
                  {isEN
                    ? '✓ Human reads your CV first\n✓ Formatting and clarity matter most\n✓ Personal touch wins'
                    : '✓ Ihminen lukee CV:si ensin\n✓ Muotoilu ja selkeys tärkein\n✓ Henkilökohtainen kosketus voittaa'}
                </p>
              </div>
              
              <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl p-4">
                <h5 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                  Premium
                  <span className="text-xs font-normal text-amber-600/70 dark:text-amber-400/70">
                    ({isEN ? 'Company size: 50+' : 'Yrityksen koko: 50+'})
                  </span>
                </h5>
                <p className="text-sm text-gray-600 dark:text-neutral-300 mb-3">
                  {isEN
                    ? 'Required for established companies using Applicant Tracking Systems (ATS). These systems filter resumes before humans see them.'
                    : 'Välttämätön vakiintuneille yrityksille, jotka käyttävät hakijaseurantajärjestelmiä (ATS). Nämä järjestelmät suodattavat CV:t ennen kuin ihmiset näkevät ne.'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 italic font-semibold">
                  {isEN
                    ? '⚠️ Software screens first\n⚠️ Keywords and structure critical\n⚠️ 75% rejected without optimization'
                    : '⚠️ Ohjelmisto seuloo ensin\n⚠️ Avainsanat ja rakenne kriittiset\n⚠️ 75% hylätään ilman optimointia'}
                </p>
              </div>
            </div>
          </div>

          {/* Feature comparison table */}
          <div>
            <h4 className="text-lg font-semibold text-amber-500 dark:text-amber-400 mb-3">
              {isEN ? 'Key differences' : 'Keskeiset erot'}
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-700">
                    <th className="text-left py-3 px-2 text-gray-700 dark:text-neutral-300 font-semibold">
                      {isEN ? 'Feature' : 'Ominaisuus'}
                    </th>
                    <th className="text-center py-3 px-2 text-gray-700 dark:text-neutral-300 font-semibold">Basic</th>
                    <th className="text-center py-3 px-2 text-amber-600 dark:text-amber-400 font-semibold">Premium</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-100 dark:border-neutral-800">
                    <td className="py-3 px-2 text-gray-600 dark:text-neutral-300">
                      {isEN ? 'Tokens/month' : 'Tokenit/kk'}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">10,000</td>
                    <td className="text-center py-3 px-2 text-amber-600 dark:text-amber-400 font-semibold">100,000</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-neutral-800">
                    <td className="py-3 px-2 text-gray-600 dark:text-neutral-300">
                      {isEN ? 'ATS optimization' : 'ATS-optimointi'}
                    </td>
                    <td className="text-center py-3 px-2 text-red-400">✗</td>
                    <td className="text-center py-3 px-2 text-green-400">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-neutral-800">
                    <td className="py-3 px-2 text-gray-600 dark:text-neutral-300">
                      {isEN ? 'STAR method cover letters' : 'STAR-menetelmä kirjeisiin'}
                    </td>
                    <td className="text-center py-3 px-2 text-red-400">✗</td>
                    <td className="text-center py-3 px-2 text-green-400">✓</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-neutral-800">
                    <td className="py-3 px-2 text-gray-600 dark:text-neutral-300">
                      {isEN ? 'RAG database' : 'RAG-tietokanta'}
                    </td>
                    <td className="text-center py-3 px-2 text-red-400">✗</td>
                    <td className="text-center py-3 px-2 text-green-400">✓</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-2 text-gray-600 dark:text-neutral-300">
                      {isEN ? 'Save applications' : 'Tallenna hakemuksia'}
                    </td>
                    <td className="text-center py-3 px-2 text-gray-900 dark:text-white">50</td>
                    <td className="text-center py-3 px-2 text-amber-600 dark:text-amber-400 font-semibold">100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Token explanation */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4">
            <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
              {isEN ? 'How do tokens work?' : 'Miten tokenit toimivat?'}
            </h4>
            <p className="text-sm text-gray-600 dark:text-neutral-300">
              {isEN
                ? 'Tokens measure computation, not documents. You can generate unlimited CVs and cover letters as long as you have tokens available. This prevents abuse while giving you flexibility.'
                : 'Tokenit mittaavat laskentaa, eivät dokumentteja. Voit luoda rajattomasti CV:itä ja hakukirjeitä niin kauan kuin tokeneita on. Tämä estää väärinkäytön mutta antaa joustavuutta.'}
            </p>
          </div>

          {/* Bottom line */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-xl p-6">
            <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {isEN ? 'The reality check' : 'Todellisuus'}
            </h4>
            <div className="space-y-3">
              <p className="text-sm text-gray-700 dark:text-neutral-300">
                {isEN
                  ? '**If you\'re applying to companies with 50+ employees, ATS is not optional—it\'s standard.** These companies receive hundreds of applications per role. They use software to filter candidates.'
                  : '**Jos haet yrityksiin, joissa on 50+ työntekijää, ATS ei ole valinnainen—se on standardi.** Nämä yritykset saavat satoja hakemuksia per rooli. Ne käyttävät ohjelmistoa hakijoiden suodattamiseen.'}
              </p>
              
              <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-4 border-l-4 border-red-400">
                <p className="text-sm text-gray-700 dark:text-neutral-300">
                  {isEN
                    ? '**Your competition is already using ATS optimization.** While your CV gets auto-rejected at 45% keyword match, theirs passes at 82% and lands on the desk. Same qualifications. Different tools. Different outcome.'
                    : '**Kilpailijasi käyttävät jo ATS-optimointia.** Kun sinun CV:si hylätään automaattisesti 45% avainsanaosumalla, heidän CV:nsä menee läpi 82%:lla ja päätyy pöydälle. Samat pätevyydet. Eri työkalut. Eri lopputulos.'}
                </p>
              </div>
              
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                {isEN
                  ? '✓ Level the playing field. Premium puts you in the same league as candidates who are already optimizing.'
                  : '✓ Tasoita pelikenttä. Premium vie sinut samalle viivalle hakijoiden kanssa, jotka jo optimoivat.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PricingPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { plan_type, isLoading: tokensLoading } = useTokens(); // ✅ HAETAAN PLAN
  const [billing, setBilling] = useState<BillingPeriod>('monthly');
  const [showCompare, setShowCompare] = useState(false);

  const isEN = language === 'en';

  const basicFeatures = PRICING.basic.features;
  const premiumFeatures = PRICING.premium.features;

  // ✅ TARKISTA TILAUS
  const canSubscribeBasic = plan_type === 'free' || plan_type === null;
  const canSubscribePremium = plan_type === 'free' || plan_type === 'basic' || plan_type === null;
  
  const basicDisabledReason = !canSubscribeBasic 
    ? (isEN ? 'Already subscribed' : 'Jo tilattu')
    : undefined;
  
  const premiumDisabledReason = plan_type === 'premium' 
    ? (isEN ? 'Current plan' : 'Nykyinen paketti')
    : undefined;

  async function handleCheckout(tier: 'basic' | 'premium') {
    if (!user) {
      alert(isEN ? 'Please sign in first' : 'Ole hyvä ja kirjaudu ensin');
      return;
    }
    
    // ✅ TARKISTA TILAUS
    if (tier === 'basic' && !canSubscribeBasic) {
      alert(isEN 
        ? 'You already have Basic or Premium. To upgrade, choose Premium.'
        : 'Sinulla on jo Basic tai Premium. Päivittääksesi valitse Premium.'
      );
      return;
    }
    
    if (tier === 'premium' && plan_type === 'premium') {
      alert(isEN 
        ? 'You already have Premium. You can extend your subscription by choosing a longer billing period.'
        : 'Sinulla on jo Premium. Voit pidentää tilaustasi valitsemalla pidemmän maksukauden.'
      );
      return;
    }
    
    await createCheckoutSessionAction(tier, billing);
  }

  if (tokensLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc] transition-colors duration-500">
      
      {/* ✅ BACKGROUND ORBS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <section className="relative z-10 max-w-7xl mx-auto px-4 py-20">
        
        {/* ✅ HERO SECTION - FAKTAPOHJAINEN */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-full mb-6">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {isEN ? '75% of Fortune 500 companies use ATS systems' : '75% Fortune 500 -yrityksistä käyttää ATS-järjestelmiä'}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            {isEN ? 'Get past the robots.' : 'Pääse robottien ohi.'}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">
              {isEN ? 'Land the interview.' : 'Saavuta haastattelu.'}
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-neutral-400 max-w-3xl mx-auto leading-relaxed">
            {isEN
              ? 'Most applications never reach human eyes. ATS software filters 75% of resumes before anyone reads them. Our Premium tier is built specifically to beat these systems.'
              : 'Useimmat hakemukset eivät koskaan päädy ihmisen silmille. ATS-ohjelmistot karsivat 75% CV:istä ennen kuin kukaan lukee ne. Premium-pakettimme on rakennettu nimenomaan näiden järjestelmien voittamiseen.'}
          </p>
        </div>

        {/* ✅ STATS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto mb-20">
          <div className="bg-white/70 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center">
            <div className="text-4xl font-black text-orange-500 mb-2">75%</div>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              {isEN ? 'of resumes never reach humans' : 'CV:istä ei koskaan päädy ihmisille'}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
              {isEN ? 'Source: Jobscan 2024' : 'Lähde: Jobscan 2024'}
            </p>
          </div>
          
          <div className="bg-white/70 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center">
            <div className="text-4xl font-black text-amber-500 mb-2">98%</div>
            <p className="text-sm text-gray-600 dark:text-neutral-400">
              {isEN ? 'of Fortune 500 use ATS' : 'Fortune 500:sta käyttää ATS:ää'}
            </p>
            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-1">
              {isEN ? 'Source: Capterra 2024' : 'Lähde: Capterra 2024'}
            </p>
          </div>
          

        </div>

        <h2 className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white mb-4">
          {isEN ? 'Choose what fits your job search' : 'Valitse työnhakusi mukaan'}
        </h2>
        <p className="text-center text-gray-600 dark:text-neutral-400 max-w-2xl mx-auto mb-12">
          {isEN
            ? 'Both plans are powerful. Premium adds the competitive edge needed for mid-to-large companies.'
            : 'Molemmat paketit ovat tehokkaita. Premium antaa kilpailuedun, jota tarvitset keskisuurissa ja suurissa yrityksissä.'}
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
                  : 'bg-gray-200 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 hover:bg-gray-300 dark:hover:bg-neutral-700'
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
                ? 'Perfect for startups, small businesses, and roles where applications are reviewed by people directly.'
                : 'Täydellinen startup-yrityksiin, pieniin yrityksiin ja tehtäviin, joissa ihmiset lukevat hakemukset suoraan.'
            }
            price={UI_PRICES.basic[billing][language]}
            features={basicFeatures}
            cta={isEN ? 'Start with Basic' : 'Aloita Basicilla'}
            onClick={() => handleCheckout('basic')}
            disabled={!canSubscribeBasic}
            disabledReason={basicDisabledReason}
          />

          <PlanCard
            title="Premium"
            description={
              isEN
                ? 'Essential for mid-to-large companies. Beats ATS systems with V2 optimization engine that gets you to interviews.'
                : 'Välttämätön keskisuuriin ja suuriin yrityksiin. Voittaa ATS-järjestelmät V2-moottorilla, joka vie sinut haastatteluun.'
            }
            price={UI_PRICES.premium[billing][language]}
            features={premiumFeatures}
            cta={isEN ? 'Upgrade to Premium' : 'Päivitä Premiumiin'}
            onClick={() => handleCheckout('premium')}
            disabled={plan_type === 'premium'}
            disabledReason={premiumDisabledReason}
            highlight
          />
        </div>
        {/* Compare plans */}
        <div className="mt-16 text-center">
          <button
            onClick={() => setShowCompare(true)}
            className="inline-flex items-center gap-2 bg-gray-200 dark:bg-neutral-800 hover:bg-gray-300 dark:hover:bg-neutral-700 text-gray-900 dark:text-white px-6 py-3 rounded-xl font-semibold transition-all border border-gray-300 dark:border-neutral-700 hover:border-amber-400/50"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400" />
            {isEN ? 'Compare plans in detail' : 'Vertaa paketteja tarkemmin'}
          </button>
        </div>
       {/* ✅ WHY PREMIUM MATTERS - SUORA & ASIALLINEN */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border-2 border-amber-500/30 rounded-3xl p-8 md:p-12">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-3 bg-amber-500 rounded-2xl">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                  {isEN ? 'Why we recommend Premium' : 'Miksi suosittelemme Premiumia'}
                </h3>
                <p className="text-gray-600 dark:text-neutral-400">
                  {isEN
                    ? 'If you actually want the job, here\'s the reality'
                    : 'Jos oikeasti haluat töihin, tässä todellisuus'}
                </p>
              </div>
            </div>

            {/* ✅ STEP 1: WITHOUT ATS - REJECTION */}
            <div className="relative pl-8 pb-8 border-l-4 border-red-400">
              <div className="absolute -left-[13px] top-0 w-6 h-6 bg-red-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                1
              </div>
              <div className="bg-red-500/10 rounded-xl p-5 border border-red-400/30">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  ❌ {isEN ? 'Without ATS optimization' : 'Ilman ATS-optimointia'}
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-neutral-300">
                  <p>
                    <span className="font-semibold">
                      {isEN ? 'You send application → ' : 'Lähetät hakemuksen → '}
                    </span>
                    {isEN 
                      ? 'ATS scans for keywords (45% match)'
                      : 'ATS skannaa avainsanoja (45% osuma)'}
                  </p>
                  <p>
                    <span className="font-semibold">
                      {isEN ? 'Result → ' : 'Tulos → '}
                    </span>
                    <span className="text-red-600 dark:text-red-400 font-bold">
                      {isEN ? 'AUTO-REJECTED' : 'AUTOMAATTINEN HYLKÄYS'}
                    </span>
                  </p>
                  <p className="text-red-600 dark:text-red-400 italic">
                    {isEN 
                      ? '🚫 Recruiter never sees your CV'
                      : '🚫 Rekrytoija ei koskaan näe CV:täsi'}
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ STEP 2: WITH ATS - PASS */}
            <div className="relative pl-8 pb-8 border-l-4 border-emerald-400">
              <div className="absolute -left-[13px] top-0 w-6 h-6 bg-emerald-400 rounded-full flex items-center justify-center text-white text-xs font-bold">
                2
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-5 border border-emerald-400/30">
                <h4 className="font-bold text-gray-900 dark:text-white mb-2">
                  ✅ {isEN ? 'With Premium (V2 optimization)' : 'Premiumilla (V2-optimointi)'}
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-neutral-300">
                  <p>
                    <span className="font-semibold">
                      {isEN ? 'You send application → ' : 'Lähetät hakemuksen → '}
                    </span>
                    {isEN 
                      ? 'ATS scans for keywords (82% match)'
                      : 'ATS skannaa avainsanoja (82% osuma)'}
                  </p>
                  <p>
                    <span className="font-semibold">
                      {isEN ? 'Result → ' : 'Tulos → '}
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {isEN ? 'PASSED TO RECRUITER' : 'VÄLITETÄÄN REKRYTOIJALLE'}
                    </span>
                  </p>
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {isEN 
                      ? '✓ Human reads CV → Interview → Job'
                      : '✓ Ihminen lukee → Haastattelu → Työ'}
                  </p>
                </div>
              </div>
            </div>

            {/* ✅ STEP 3: THE NUMBERS */}
            <div className="relative pl-8">
              <div className="absolute -left-[13px] top-0 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                3
              </div>
              <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-5 border border-amber-400/30">
                <h4 className="font-bold text-gray-900 dark:text-white mb-3">
                  🎯 {isEN ? 'The competition' : 'Kilpailu'}
                </h4>
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 dark:text-neutral-300">
                    {isEN
                      ? 'You\'re competing against hundreds who are already optimizing. Same skills, different tools.'
                      : 'Kilpailet satoja vastaan jotka jo optimoivat. Samat taidot, eri työkalut.'}
                  </p>
                  <div className="bg-white/50 dark:bg-neutral-800/50 rounded-lg p-4">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-2">
                      📊 {isEN ? 'The numbers:' : 'Luvut:'}
                    </p>
                    <ul className="text-sm text-gray-700 dark:text-neutral-300 space-y-1">
                      <li>• {isEN ? '75% rejected without optimization' : '75% hylätään ilman optimointia'}</li>
                      <li>• {isEN ? '98% of Fortune 500 use ATS' : '98% Fortune 500:sta käyttää ATS:ää'}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ✅ HAPPY APPLIED BRAND */}
            <div className="mt-8 pt-6 border-t border-amber-500/20">
              <p className="text-base font-bold text-gray-900 dark:text-white mb-2 text-center">
                {isEN 
                  ? 'Apply with confidence.' 
                  : 'Hae luottavaisesti.'}
              </p>
              <p className="text-sm text-gray-600 dark:text-neutral-400 text-center">
                {isEN
                  ? 'That\'s Happy Applied: Maximize your chances, minimize stress.'
                  : 'Se on Happy Applied: Maksimoi mahdollisuudet, minimoi stressi.'}
              </p>
            </div>
          </div>
        </div>



        {/* Promo code section */}
        <div className="mt-16 max-w-md mx-auto">
          <div className="bg-white/70 dark:bg-neutral-900/50 border border-gray-200 dark:border-neutral-800 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              🎁 {isEN ? 'Have a promo code?' : 'Onko sinulla promo-koodi?'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-neutral-400 mb-4">
              {isEN ? 'Activate it here!' : 'Aktivoi se tästä!'}
            </p>
            <PromoCodeRedeem />
            <p className="text-xs text-gray-500 dark:text-neutral-500 mt-3">
              💡 {isEN ? 'Tip: Get promo codes from Vipsu' : 'Vinkki: Promo-koodin saa Vipsulta'}
            </p>
          </div>
        </div>
      </section>

      {showCompare && <CompareModal onClose={() => setShowCompare(false)} isEN={isEN} />}
    </main>
  );
}