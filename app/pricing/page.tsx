// app/pricing/page.tsx
import PromoCodeRedeem from '@/components/promoCode';
import { Button } from '@/components/ui/button';
import SmartHeader from '@/components/ui/smartHeader';
import { PRICING } from '@/lib/pricing';
import { createCheckoutSession, Tier } from '@/lib/stripe/subscriptions';
import { currentUser } from '@clerk/nextjs/server';
import { Check, Crown, Sparkles, Zap, Target, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function PricingPage() {
  const user = await currentUser();
 
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden">
      
      {/* Animated background blobs - sama kuin my-cvs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <SmartHeader />

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 md:p-12 backdrop-saturate-150 mb-8">
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
          
          <div className="text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 backdrop-blur-sm border border-white/40 shadow-lg shadow-indigo-500/10 mb-4">
              <Crown className="w-4 h-4 sm:h-5 sm:w-5 text-indigo-700" />
              <span className="text-xs sm:text-sm font-extrabold text-indigo-800 uppercase tracking-wider">
                Pricing Plans
              </span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
              Valitse Sopiva Tilaus
            </h1>
            <p className="text-base sm:text-xl text-gray-700 max-w-2xl mx-auto">
              Aloita ilmaiseksi tai päivitä Premium-tiliin saadaksesi kaikki ominaisuudet
            </p>
          </div>
        </div>

        {/* Promo Code Section */}
        <div className="mb-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 md:p-8 backdrop-saturate-150">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-100/80 to-purple-100/80 px-4 py-2 rounded-full mb-3 border border-white/40 shadow-lg">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
              <span className="text-sm sm:text-base font-semibold text-indigo-900">
                Onko sinulla etukoodi?
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-600">
              Syötä etukoodisi alle saadaksesi alennuksen
            </p>
          </div>
          <PromoCodeRedeem />
        </div>

        {/* Pricing Cards - 3 cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {Object.entries(PRICING).map(([tier, details]) => {
            const isPremium = tier === 'Premium';
            const isBasic = tier === 'Basic';
            
            return (
              <div 
                key={tier} 
                className={`group backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all overflow-hidden backdrop-saturate-150 relative ${
                  isPremium ? 'md:scale-105 md:-mt-4 md:mb-4' : ''
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Popular Badge */}
                {isPremium && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-20">
                    <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white px-4 py-1.5 rounded-full shadow-lg flex items-center gap-2">
                      <Crown className="h-4 w-4" />
                      <span className="text-sm font-bold">Suosituin</span>
                    </div>
                  </div>
                )}

                <div className="p-6 relative z-10">
                  {/* Icon & Title */}
                  <div className="text-center mb-6">
                    <div className={`h-16 w-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
                      isPremium 
                        ? 'bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/30' 
                        : isBasic
                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/30'
                        : 'bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/30'
                    }`}>
                      {isPremium ? (
                        <Crown className="h-8 w-8 text-white" />
                      ) : isBasic ? (
                        <FileText className="h-8 w-8 text-white" />
                      ) : (
                        <Zap className="h-8 w-8 text-white" />
                      )}
                    </div>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {tier}
                    </h2>
                    
                    <div className="flex items-baseline justify-center gap-1 mb-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {details.monthly}€
                      </span>
                      <span className="text-lg text-gray-600">/kk</span>
                    </div>
                    
                    <p className="text-sm text-gray-600">
                      {isPremium 
                        ? 'Kaikki ominaisuudet käytössäsi' 
                        : isBasic
                        ? 'Perusominaisuudet'
                        : 'Laajennetut ominaisuudet'}
                    </p>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-6">
                    {details.features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center mt-0.5 ${
                          isPremium 
                            ? 'bg-yellow-100' 
                            : isBasic
                            ? 'bg-blue-100'
                            : 'bg-purple-100'
                        }`}>
                          <Check className={`h-4 w-4 ${
                            isPremium 
                              ? 'text-yellow-600' 
                              : isBasic
                              ? 'text-blue-600'
                              : 'text-purple-600'
                          }`} />
                        </div>
                        <span className="text-sm text-gray-700 leading-relaxed">
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
                      className={`w-full py-5 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all ${
                        isPremium
                          ? 'bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600'
                          : isBasic
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700'
                          : 'bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                      }`}
                    >
                      {isPremium ? (
                        <span className="flex items-center justify-center gap-2">
                          <Crown className="h-5 w-5" />
                          Valitse Premium
                        </span>
                      ) : isBasic ? (
                        'Aloita Ilmaiseksi'
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <Zap className="h-5 w-5" />
                          Valitse Professional
                        </span>
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        {/* Feature Comparison Section */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 md:p-8 mb-8 backdrop-saturate-150">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 text-center">
            Ominaisuuksien Vertailu
          </h3>
          
          <div className="grid gap-4">
            {[
              {
                icon: FileText,
                title: 'CV:iden Määrä',
                basic: '3 CV:tä',
                premium: 'Rajattomat CV:t',
                professional: 'Rajattomat CV:t',
              },
              {
                icon: Target,
                title: 'ATS-optimointi',
                basic: 'Perustaso',
                premium: 'Täysi optimointi',
                professional: 'Edistynyt + Personal AI',
              },
              {
                icon: Zap,
                title: 'Hakukirjeet',
                basic: 'Ei käytössä',
                premium: 'Rajattomat',
                professional: 'Rajattomat + AI-personointi',
              },
              {
                icon: Sparkles,
                title: 'CV-mallit',
                basic: 'Perusmalli',
                premium: 'Kaikki mallit',
                professional: 'Kaikki + Custom-mallit',
              },
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-4 rounded-xl bg-gradient-to-br from-gray-50/80 to-indigo-50/80 border border-white/40 backdrop-blur-sm">
                  <div className="flex items-center gap-3 md:col-span-1">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg">
                      <IconComponent className="h-5 w-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                      {item.title}
                    </span>
                  </div>
                  
                  <div className="md:col-span-3 grid grid-cols-3 gap-3">
                    <div className="bg-white/90 p-3 rounded-lg border border-gray-200 backdrop-blur-sm">
                      <p className="text-xs font-semibold text-gray-500 mb-1">Basic</p>
                      <p className="text-xs text-gray-700">{item.basic}</p>
                    </div>
                    <div className="bg-yellow-50/90 p-3 rounded-lg border border-yellow-200 backdrop-blur-sm">
                      <p className="text-xs font-semibold text-yellow-700 mb-1">Premium</p>
                      <p className="text-xs text-gray-900 font-medium">{item.premium}</p>
                    </div>
                    <div className="bg-purple-50/90 p-3 rounded-lg border border-purple-200 backdrop-blur-sm">
                      <p className="text-xs font-semibold text-purple-700 mb-1">Professional</p>
                      <p className="text-xs text-gray-900 font-medium">{item.professional}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Section - sama tyyli kuin my-cvs */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 backdrop-saturate-150 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-500/30">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-900">3 Tasoa</div>
              <div className="text-sm text-gray-600">Jokaiselle tarpeeseen</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-green-500/30">
                <Check className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-green-900">Ilmainen kokeilu</div>
              <div className="text-sm text-gray-600">Aloita riskittömästi</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-amber-900">24/7 Tuki</div>
              <div className="text-sm text-gray-600">Aina käytettävissä</div>
            </div>
          </div>
        </div>

        {/* Back Button */}
        <div className="text-center">
          <Link href="/">
            <Button
              variant="outline"
              size="lg"
              className="px-8 py-4 text-lg border-2 bg-white/70 backdrop-blur-xl hover:bg-white hover:border-indigo-300 transition-all shadow-lg"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Takaisin Etusivulle
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-4 sm:px-6 border-t-2 border-white/40 backdrop-blur-xl bg-white/70 mt-12">
        <div className="max-w-6xl mx-auto text-center text-sm sm:text-base text-gray-600">
          © {new Date().getFullYear()} HappyApplaid. Kaikki oikeudet pidätetään.
        </div>
      </footer>
    </div>
  );
}