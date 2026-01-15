'use client';

import { useState } from 'react';
import { Check, Ban, Crown, Star, Target, Shield } from 'lucide-react';
import { PricingButton } from '@/components/buttons/pricing-button';

export type BillingPeriod = 'monthly' | 'sixMonths' | 'yearly';

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#1a1a1a] text-[#e7e3dc]">
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-extrabold mb-6">
            <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
              Hinnoittelu
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Aloita ilmaiseksi. Päivitä kun haluat voittaa ATS:n ja erottua STAR-metodilla.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-2 border border-white/10 inline-flex">
            {['monthly', 'sixMonths', 'yearly'].map((p) => (
              <button
                key={p}
                onClick={() => setBillingPeriod(p as BillingPeriod)}
                className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                  billingPeriod === p
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p === 'monthly' && 'Kuukausi'}
                {p === 'sixMonths' && '6 kk'}
                {p === 'yearly' && 'Vuosi'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-8">
          {/* Free */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-white/10 flex flex-col">
            <h3 className="text-xl font-bold mb-2">Free</h3>
            <p className="text-3xl font-bold mb-6">0€</p>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex gap-2"><Check className="text-green-400" /> 1 yleinen CV + hakukirje</li>
              <li className="flex gap-2 opacity-50"><Ban /> Ei ATS-optimointia</li>
              <li className="flex gap-2 opacity-50"><Ban /> Ei STAR-metodia</li>
            </ul>
            <PricingButton tier="free" label="Aloita ilmaiseksi" />
          </div>

          {/* Basic */}
          <div className="bg-white/5 backdrop-blur-md rounded-3xl p-8 border border-blue-400/30 flex flex-col">
            <h3 className="text-xl font-bold text-blue-300 mb-2">Basic</h3>
            <p className="text-3xl font-bold mb-6">4.99€ / kk</p>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex gap-2"><Check className="text-green-400" /> 10,000 tokenia / kk</li>
              <li className="flex gap-2"><Check className="text-green-400" /> Rajattomat yleiset CV:t</li>
              <li className="flex gap-2 opacity-50"><Ban /> Ei ATS-optimointia</li>
              <li className="flex gap-2 opacity-50"><Ban /> Ei STAR-metodia</li>
            </ul>
            <PricingButton tier="basic" billingPeriod={billingPeriod} label="Valitse Basic" />
          </div>

          {/* Premium */}
          <div className="relative bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-md rounded-3xl p-8 border border-amber-400/40 shadow-2xl scale-105 flex flex-col">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
              Suositus
            </div>
            <h3 className="text-xl font-bold text-amber-300 mb-2 flex items-center gap-2">
              Premium <Crown className="w-4 h-4" />
            </h3>
            <p className="text-3xl font-bold mb-6">14.99€ / kk</p>
            <ul className="space-y-3 mb-8 flex-1">
              <li className="flex gap-2"><Check className="text-green-400" /> 100,000 tokenia / kk</li>
              <li className="flex gap-2"><Target className="text-green-400" /> Työkohtainen kohdistus</li>
              <li className="flex gap-2"><Shield className="text-green-400" /> ATS-optimoitu sisältö</li>
              <li className="flex gap-2"><Star className="text-amber-400" /> STAR-metodologia</li>
            </ul>
            <PricingButton tier="premium" billingPeriod={billingPeriod} label="Valitse Premium" />
          </div>
        </div>

        {/* Comparison */}
        <div className="mt-20 bg-white/5 backdrop-blur-2xl rounded-3xl p-8 border border-white/10">
          <h2 className="text-2xl font-bold text-center mb-8">Mitä eroa paketeilla on?</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="text-center">
              <h4 className="font-bold mb-2">ATS-optimointi</h4>
              <p className="text-gray-400">Vain Premium</p>
            </div>
            <div className="text-center">
              <h4 className="font-bold mb-2">STAR-metodi</h4>
              <p className="text-gray-400">Vain Premium</p>
            </div>
            <div className="text-center">
              <h4 className="font-bold mb-2">RAG-tietokanta</h4>
              <p className="text-gray-500 italic">Tulossa myöhemmin</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
