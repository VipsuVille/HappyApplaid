// app/pricing/page.tsx
import { PRICING, Tier } from '@/lib/pricing';
import PromoCodeRedeem from '@/components/promoCode';
import { Crown, Sparkles, Zap, Check } from 'lucide-react';
import { PricingButton } from '@/components/buttons/pricing-button';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Hinnoittelu
          </h1>
          <p className="text-xl text-gray-300 mb-2">
            Valitse Sopiva Tilaus
          </p>
          <p className="text-sm text-gray-400">
            Aloita ilmaiseksi tai päivitä maksulliseen tilaukseen
          </p>
        </div>

        {/* Token-selitys */}
        <div className="text-center mb-12">
          <p className="text-lg text-yellow-300 font-semibold">
            💡 1 CV = 50 tokenia | 1 Hakukirje = 50 tokenia
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {(Object.entries(PRICING) as [Tier, typeof PRICING[Tier]][]).map(([tier, details]) => {
            const isPopular = tier === 'pro';
            const isFree = tier === 'free';

            return (
              <div
                key={tier}
                className={`relative rounded-2xl p-8 ${
                  isPopular
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 ring-4 ring-yellow-400'
                    : 'bg-slate-800/50 backdrop-blur-xl border border-slate-700'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-yellow-400 text-slate-900 px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      Suosituin
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className="mb-6">
                  {isFree && <Sparkles className="w-10 h-10 text-gray-400" />}
                  {tier === 'basic' && <Zap className="w-10 h-10 text-blue-400" />}
                  {tier === 'semi-pro' && <Crown className="w-10 h-10 text-purple-400" />}
                  {tier === 'pro' && <Crown className="w-10 h-10 text-yellow-400" />}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold mb-2">{details.name}</h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl font-bold">{details.monthly}€</span>
                  <span className="text-gray-400"> /kk</span>
                </div>

                {/* Tokens */}
                {!isFree && (
                  <p className="text-sm text-gray-300 mb-6 font-semibold">
                    {details.tokens} tokenia
                  </p>
                )}

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {details.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2">
                      {feature.startsWith('❌') ? (
                        <span className="text-red-400 text-sm">{feature}</span>
                      ) : (
                        <>
                          <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-300">{feature}</span>
                        </>
                      )}
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <PricingButton
                  tier={tier}
                  label={isFree ? 'Kokeile ilmaiseksi' : `Valitse ${details.name}`}
                />
              </div>
            );
          })}
        </div>

        {/* Promo Code Section */}
        <div className="max-w-md mx-auto">
          <PromoCodeRedeem />
        </div>

        {/* Feature Comparison Table (optional) */}
        <div className="mt-20 bg-slate-800/30 backdrop-blur-xl rounded-2xl p-8 border border-slate-700">
          <h2 className="text-3xl font-bold mb-8 text-center">Ominaisuuksien Vertailu</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-4 px-4">Ominaisuus</th>
                  <th className="text-center py-4 px-4">Free</th>
                  <th className="text-center py-4 px-4">Basic</th>
                  <th className="text-center py-4 px-4">Semi-Pro</th>
                  <th className="text-center py-4 px-4">Pro</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <tr className="border-b border-slate-700/50">
                  <td className="py-4 px-4">CV:iden määrä</td>
                  <td className="text-center py-4 px-4">1 kpl</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-4 px-4">Hakukirjeet</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                  <td className="text-center py-4 px-4">Rajaton</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="py-4 px-4">ATS-optimointi</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
                <tr>
                  <td className="py-4 px-4">RAG-artikkelit</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">❌</td>
                  <td className="text-center py-4 px-4">✅</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}