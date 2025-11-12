//app/pricing/page.tsx
import PromoCodeRedeem from '@/components/promoCode';
import { Button } from '@/components/ui/button';
import SmartHeader from '@/components/ui/smartHeader';
import { PRICING } from '@/lib/pricing';
import { createCheckoutSession, Tier } from '@/lib/stripe/subscriptions';
import { currentUser } from '@clerk/nextjs/server';
import { Check, Crown, Sparkles, Zap, Target, FileText, ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PricingPage() {
  const user = await currentUser();
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <SmartHeader />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 animate-fade-in">
              Valitse Sopiva Tilaus
            </h1>
            <p className="text-base sm:text-xl text-indigo-100 max-w-2xl mx-auto px-4">
              Aloita ilmaiseksi tai päivitä Premium-tiliin saadaksesi kaikki ominaisuudet
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 -mt-8">
        
        {/* Promo Code Section */}
        <div className="mb-8 sm:mb-12 bg-white rounded-2xl shadow-lg border-2 border-indigo-200 p-4 sm:p-6 md:p-8">
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-full mb-3">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              <span className="text-sm sm:text-base font-semibold text-indigo-900">
                Onko sinulla etukoodi?
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600 px-2">
              Syötä etukoodisi alle saadaksesi alennuksen
            </p>
          </div>
          <PromoCodeRedeem />
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
          {Object.entries(PRICING).map(([tier, details]) => {
            const isPremium = tier === 'Premium';
            
            return (
              <div 
                key={tier} 
                className={`relative bg-white rounded-2xl shadow-lg border-2 transition-all duration-300 transform hover:-translate-y-2 hover:shadow-xl ${
                  isPremium 
                    ? 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50' 
                    : 'border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50'
                }`}
              >
                {/* Premium Badge */}
                {isPremium && (
                  <div className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-3 py-1 sm:px-4 sm:py-2 rounded-full shadow-lg flex items-center gap-1 sm:gap-2">
                      <Crown className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="text-xs sm:text-sm font-bold">Suosituin</span>
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  {/* Header */}
                  <div className="text-center mb-6 sm:mb-8">
                    <div className={`h-16 w-16 sm:h-20 sm:w-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
                      isPremium 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500' 
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                    }`}>
                      {isPremium ? (
                        <Crown className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      ) : (
                        <Sparkles className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                      )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                      {tier}
                    </h2>
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
                        {details.monthly}€
                      </span>
                      <span className="text-lg sm:text-xl text-gray-600">/kk</span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {isPremium ? 'Kaikki ominaisuudet käytössäsi' : 'Perusominaisuudet'}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                    {details.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 h-5 w-5 sm:h-6 sm:w-6 rounded-full flex items-center justify-center mt-0.5 ${
                          isPremium 
                            ? 'bg-yellow-100' 
                            : 'bg-blue-100'
                        }`}>
                          <Check className={`h-3 w-3 sm:h-4 sm:w-4 ${
                            isPremium ? 'text-yellow-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <span className="text-sm sm:text-base text-gray-700 leading-relaxed">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button */}
                  <form action={async () => {
                    'use server';
                    if (!user?.id) return;
                    const session = await createCheckoutSession(user.id, tier as Tier);
                    if (session.url) {
                      redirect(session.url);
                    }
                  }}>
                    <Button 
                      type="submit" 
                      className={`w-full py-4 sm:py-6 text-base sm:text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all ${
                        isPremium
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                      }`}
                    >
                      {isPremium ? (
                        <span className="flex items-center justify-center gap-2">
                          <Crown className="h-5 w-5" />
                          Päivitä Premium-tiliin
                        </span>
                      ) : (
                        'Aloita Ilmaiseksi'
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 sm:p-8 mb-8 sm:mb-12">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
            Ominaisuuksien Vertailu
          </h3>
          
          <div className="grid gap-4 sm:gap-6">
            {[
              {
                icon: FileText,
                title: 'CV:iden Määrä',
                free: '1 yksinkertainen CV',
                premium: 'Rajattomat CV:t',
              },
              {
                icon: Target,
                title: 'ATS-optimointi',
                free: 'Ei käytössä',
                premium: 'Käytössä',
              },
              {
                icon: Zap,
                title: 'Hakukirjeet',
                free: 'Ei käytössä',
                premium: 'Rajattomat hakukirjeet',
              },
              {
                icon: Sparkles,
                title: 'CV-mallit',
                free: 'Perusmalli',
                premium: 'Kaikki mallit (Technical, Creative, Executive)',
              },
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-50 to-indigo-50 border border-gray-200">
                  <div className="flex items-center gap-3 sm:col-span-1">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm sm:text-base">
                      {item.title}
                    </span>
                  </div>
                  
                  <div className="sm:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Ilmainen</p>
                      <p className="text-xs sm:text-sm text-gray-700">{item.free}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                      <p className="text-xs font-semibold text-yellow-700 mb-1">Premium</p>
                      <p className="text-xs sm:text-sm text-gray-900 font-medium">{item.premium}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Back to Home Button */}
        <div className="text-center">
          <Link href="/">
            <Button
              variant="outline"
              size="lg"
              className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg border-2 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
              Takaisin Etusivulle
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 sm:py-8 px-4 sm:px-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto text-center text-sm sm:text-base text-gray-500">
          © {new Date().getFullYear()} HappyApplaid. Kaikki oikeudet pidätetään.
        </div>
      </footer>
    </div>
  );
}