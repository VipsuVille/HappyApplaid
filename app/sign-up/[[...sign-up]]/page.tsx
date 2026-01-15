'use client';

import { SignUp } from "@clerk/nextjs";
import { Sparkles, X, Zap, Shield, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { clerkPageAppearance } from "@/lib/clerkAppearance";
import Link from "next/link";

export default function SignUpPage() {
  const { language } = useLanguage();
  const router = useRouter();

  const benefits = [
    {
      icon: Zap,
      title: language === "en" ? "AI-Powered" : "Tekoälyavusteinen",
      description: language === "en" 
        ? "Smart CV optimization" 
        : "Älykäs CV-optimointi"
    },
    {
      icon: Shield,
      title: language === "en" ? "ATS Ready" : "ATS-Valmis",
      description: language === "en"
        ? "Pass screening systems"
        : "Läpäise seulontajärjestelmät"
    },
    {
      icon: Clock,
      title: language === "en" ? "Save Time" : "Säästä Aikaa",
      description: language === "en"
        ? "Create CV in minutes"
        : "Luo CV minuuteissa"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black font-sans text-white relative overflow-hidden flex items-center justify-center p-4">
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-amber-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-600/15 to-gray-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/15 to-orange-600/15 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100px_100px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>

      {/* Close button (X) - top right */}
      <button
        onClick={() => router.push('/')}
        className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md transition-all group"
        aria-label="Close"
      >
        <X className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
      </button>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Side - Sign Up Form */}
          <div className="flex flex-col justify-center">
            {/* Header */}
            <div className="text-center lg:text-left mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 backdrop-blur-md border border-orange-400/30 mb-6">
                <Sparkles className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                  {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
                </span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl font-extrabold mb-3 leading-tight">
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  {language === "en" ? "Your future is" : "Tulevaisuutesi on"}
                </span>
                <br />
                <span className="text-white italic font-serif">
                  HappyApplaid
                </span>
              </h1>
              
              <p className="text-gray-400 text-lg">
                {language === "en" 
                  ? "Create your profile once, get personalized applications forever." 
                  : "Luo profiili kerran, saa personoituja hakemuksia ikuisesti."}
              </p>
            </div>

            {/* Clerk Sign Up Component */}
            <div className="flex justify-center lg:justify-start">
              <SignUp 
                appearance={{
                  ...clerkPageAppearance,
                  elements: {
                    ...clerkPageAppearance.elements,
                    // Hide duplicate footer
                    footerAction: 'hidden',
                    // Hide Clerk branding
                    footer: 'hidden',
                  }
                }}
                signInUrl="/sign-in"
              />
            </div>

            {/* Footer Text - Single instance */}
            <div className="mt-6 text-center lg:text-left">
              <p className="text-sm text-gray-500">
                {language === "en" ? "Already have an account?" : "Onko sinulla jo tili?"}{" "}
                <Link href="/sign-in" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
                  {language === "en" ? "Sign in" : "Kirjaudu"}
                </Link>
              </p>
            </div>
          </div>

          {/* Right Side - Benefits (Hidden on mobile) */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
              
              <h2 className="text-2xl font-bold mb-6">
                {language === "en" ? "Why HappyApplaid?" : "Miksi HappyApplaid?"}
              </h2>

              <div className="space-y-6 mb-8">
                {benefits.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-orange-400/30">
                          <Icon className="h-5 w-5 text-orange-400" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-white mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 backdrop-blur-md rounded-2xl p-6 border border-orange-400/30">
                <div className="space-y-3">
                  <div>
                    <p className="font-bold text-white mb-1">
                      {language === "en" ? "✓ 1 Free CV Included" : "✓ 1 Ilmainen CV Sisältyy"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {language === "en" 
                        ? "Test our quality with zero risk" 
                        : "Testaa laatuamme ilman riskiä"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="font-bold text-white mb-1">
                      {language === "en" ? "✓ No Credit Card Required" : "✓ Ei Luottokorttia Tarvita"}
                    </p>
                    <p className="text-sm text-gray-400">
                      {language === "en" 
                        ? "Sign up takes less than 2 minutes" 
                        : "Rekisteröityminen alle 2 minuutissa"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}