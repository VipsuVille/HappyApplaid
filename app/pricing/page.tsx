// app/pricing/page.tsx - UUSI 3-TIER VERSIO

'use client';

import { useState } from 'react';
import { PRICING, Tier, BillingPeriod, getPriceForPeriod, getSavings } from '@/lib/pricing';
import PromoCodeRedeem from '@/components/promoCode';
import { Crown, Sparkles, Check, Zap, AlertCircle } from 'lucide-react';
import { PricingButton } from '@/components/buttons/pricing-button';

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Valitse Sopiva Tilaus
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Aloita ilmaiseksi tai päivitä maksulliseen
          </p>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-white rounded-2xl p-2 shadow-lg border-2 border-indigo-200 inline-flex">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Kuukausittain
            </button>
            <button
              onClick={() => setBillingPeriod('sixMonths')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all relative ${
                billingPeriod === 'sixMonths'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              6 kuukautta
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -10%
              </span>
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-6 py-3 rounded-xl font-semibold transition-all relative ${
                billingPeriod === 'yearly'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Vuosittain
              <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                -15%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          
          {/* FREE */}
          <div className="bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
            <div className="mb-6">
              <Sparkles className="w-12 h-12 text-gray-400" />
            </div>
            
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Free</h3>
            
            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">0€</span>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Kokeile palvelua ilmaiseksi
            </p>

            <ul className="space-y-3 mb-8">
              {PRICING.free.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingButton
              tier="free"
              label="Aloita ilmaiseksi"
            />
          </div>

          {/* BASIC */}
          <div className="bg-white rounded-3xl p-8 border-2 border-indigo-300 shadow-xl transform scale-105">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-indigo-600 text-white px-4 py-1 rounded-full text-sm font-bold">
                Suosituin
              </span>
            </div>

            <div className="mb-6">
              <Zap className="w-12 h-12 text-indigo-600" />
            </div>
            
            <h3 className="text-2xl font-bold mb-2 text-gray-900">Basic</h3>
            
            <div className="mb-6">
              <span className="text-5xl font-bold text-gray-900">
                {billingPeriod === 'monthly' 
                  ? '4.99' 
                  : billingPeriod === 'sixMonths'
                    ? '26.94'
                    : '50.99'}€
              </span>
              <span className="text-gray-600 text-lg">
                {billingPeriod === 'monthly' ? '/kk' : ''}
              </span>
            </div>

            {billingPeriod !== 'monthly' && (
              <p className="text-sm text-green-600 font-semibold mb-4">
                {getSavings('basic', billingPeriod)}
              </p>
            )}

            <p className="text-sm font-bold text-indigo-600 mb-6">
              10,000 tokenia/kk
            </p>

            <ul className="space-y-3 mb-8">
              {PRICING.basic.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingButton
              tier="basic"
              billingPeriod={billingPeriod}
              label="Valitse Basic"
            />

            {/* Token Top-up Info */}
            <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
              <p className="text-xs text-indigo-800">
                💡 <strong>Lisää tokeneita:</strong> 2.99€ = 10,000 tokenia
              </p>
            </div>
          </div>

          {/* PREMIUM */}
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-3xl p-8 border-2 border-purple-400 shadow-2xl text-white relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-yellow-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                <Crown className="w-4 h-4" />
                Pro
              </span>
            </div>

            <div className="mb-6">
              <Crown className="w-12 h-12 text-yellow-300" />
            </div>
            
            <h3 className="text-2xl font-bold mb-2">Premium</h3>
            
            <div className="mb-6">
              <span className="text-5xl font-bold">
                {billingPeriod === 'monthly' 
                  ? '14.99' 
                  : billingPeriod === 'sixMonths'
                    ? '80.94'
                    : '152.99'}€
              </span>
              <span className="text-purple-200 text-lg">
                {billingPeriod === 'monthly' ? '/kk' : ''}
              </span>
            </div>

            {billingPeriod !== 'monthly' && (
              <p className="text-sm text-yellow-300 font-semibold mb-4">
                {getSavings('premium', billingPeriod)}
              </p>
            )}

            <p className="text-sm font-bold text-yellow-300 mb-6">
              100,000 tokenia/kk
            </p>

            <ul className="space-y-3 mb-8">
              {PRICING.premium.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-white">{feature}</span>
                </li>
              ))}
            </ul>

            <PricingButton
              tier="premium"
              billingPeriod={billingPeriod}
              label="Valitse Premium"
            />
          </div>

        </div>

        {/* Token Info Banner */}
        <div className="max-w-4xl mx-auto mb-12 bg-amber-50 border-2 border-amber-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-amber-900 mb-2">
                💡 Miten tokenit toimivat?
              </h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• <strong>Perus CV:</strong> 200 tokenia</li>
                <li>• <strong>Perus hakukirje:</strong> 50 tokenia</li>
                <li>• <strong>ATS-optimointi:</strong> +100-150 tokenia (vain Premium)</li>
                <li>• <strong>RAG-tietokanta:</strong> +200-300 tokenia (vain Premium)</li>
              </ul>
              <p className="text-xs text-amber-700 mt-3">
                Basic-tilauksessa voit ostaa lisää tokeneita tarpeen mukaan. Premium-tilauksessa 100,000 tokenia riittää useisiin kymmeniin CV:ihin ja hakukirjeisiin!
              </p>
            </div>
          </div>
        </div>

        {/* Promo Code */}
        <div className="max-w-md mx-auto mb-12">
          <PromoCodeRedeem />
        </div>

        {/* Feature Comparison */}
        <div className="max-w-5xl mx-auto bg-white rounded-3xl p-8 border-2 border-gray-200 shadow-lg">
          <h2 className="text-3xl font-bold mb-8 text-center text-gray-900">
            Ominaisuuksien Vertailu
          </h2>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200">
                  <th className="text-left py-4 px-4 text-gray-900">Ominaisuus</th>
                  <th className="text-center py-4 px-4 text-gray-900">Free</th>
                  <th className="text-center py-4 px-4 text-indigo-600">Basic</th>
                  <th className="text-center py-4 px-4 text-purple-600">Premium</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">Tokenit/kk</td>
                  <td className="text-center py-4 px-4 text-gray-600">-</td>
                  <td className="text-center py-4 px-4 font-semibold text-indigo-600">10,000</td>
                  <td className="text-center py-4 px-4 font-semibold text-purple-600">100,000</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">CV:t & Hakukirjeet</td>
                  <td className="text-center py-4 px-4 text-gray-600">1 kpl</td>
                  <td className="text-center py-4 px-4 text-green-600">✅ Rajaton</td>
                  <td className="text-center py-4 px-4 text-green-600">✅ Rajaton</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">ATS-optimointi</td>
                  <td className="text-center py-4 px-4 text-red-500">❌</td>
                  <td className="text-center py-4 px-4 text-red-500">❌</td>
                  <td className="text-center py-4 px-4 text-green-600">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">RAG-tietokanta</td>
                  <td className="text-center py-4 px-4 text-red-500">❌</td>
                  <td className="text-center py-4 px-4 text-red-500">❌</td>
                  <td className="text-center py-4 px-4 text-green-600">✅</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-4 px-4 text-gray-700">Säilytys</td>
                  <td className="text-center py-4 px-4 text-gray-600">0</td>
                  <td className="text-center py-4 px-4 text-indigo-600">50 kirjettä</td>
                  <td className="text-center py-4 px-4 text-purple-600">100 kirjettä</td>
                </tr>
                <tr>
                  <td className="py-4 px-4 text-gray-700">Lisää tokeneita</td>
                  <td className="text-center py-4 px-4 text-red-500">❌</td>
                  <td className="text-center py-4 px-4 text-green-600">✅ 2.99€/10k</td>
                  <td className="text-center py-4 px-4 text-gray-400">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}