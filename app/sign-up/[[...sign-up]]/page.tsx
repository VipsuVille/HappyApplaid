//app/sign-up/[[..sign-up]]/page.tsx

'use client';

import { SignUp } from "@clerk/nextjs";
import { Sparkles, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export default function SignUpPage() {
  const { language } = useLanguage();

  const benefits = [
    {
      title: language === "en" ? "1 Free CV" : "1 Ilmainen CV",
      description: language === "en" 
        ? "Create your first personality-driven CV for free" 
        : "Luo ensimmäinen persoonallisuusvetoinen CV:si ilmaiseksi"
    },
    {
      title: language === "en" ? "AI-Powered" : "Tekoälyavusteinen",
      description: language === "en"
        ? "Advanced AI optimizes your CV for job hunting"
        : "Edistynyt AI optimoi CV:si työnhakua varten"
    },
    {
      title: language === "en" ? "ATS Optimization" : "ATS-optimointi",
      description: language === "en"
        ? "Pass automated screening systems easily"
        : "Läpäise automaattiset seulontajärjestelmät helposti"
    },
    {
      title: language === "en" ? "Quick Start" : "Nopea aloitus",
      description: language === "en"
        ? "Create your first CV in under 5 minutes"
        : "Luo ensimmäinen CV:si alle 5 minuutissa"
    },
    {
      title: language === "en" ? "Secure" : "Turvallinen",
      description: language === "en"
        ? "Your data is encrypted and fully protected"
        : "Tietosi on salattu ja täysin suojattu"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#1a1a1a] font-sans text-[#e7e3dc] relative overflow-hidden flex items-center justify-center p-4">
      
      {/* Animated background orbs - matching landing page */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div 
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-gray-700/10 rounded-full blur-3xl animate-pulse" 
          style={{animationDelay: '1s'}}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" 
          style={{animationDelay: '2s'}}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Sign Up Form */}
          <div className="backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-3xl shadow-2xl shadow-black/50 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-orange-500/5 pointer-events-none rounded-3xl"></div>
            
            <div className="relative z-10">
              {/* Logo/Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent mb-3">
                  HappyApplaid
                </h1>
                <p className="text-gray-300 text-lg">
                  {language === "en" ? "Start free today" : "Aloita ilmaiseksi tänään"}
                </p>
              </div>

              {/* Clerk Sign Up Component */}
              <div className="flex justify-center">
                <SignUp 
                  appearance={{
                    elements: {
                      rootBox: "w-full",
                      card: "bg-transparent shadow-none",
                      formButtonPrimary: "bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700",
                      formFieldInput: "bg-white/5 border-white/10 text-gray-100",
                      formFieldLabel: "text-gray-300",
                      identityPreviewText: "text-gray-300",
                      formHeaderTitle: "text-gray-100",
                      formHeaderSubtitle: "text-gray-400",
                      socialButtonsBlockButton: "bg-white/5 border-white/10 text-gray-200 hover:bg-white/10",
                      dividerLine: "bg-white/10",
                      dividerText: "text-gray-400",
                      footerActionLink: "text-orange-400 hover:text-orange-300",
                    }
                  }}
                />
              </div>

              {/* Footer Text */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-300">
                  {language === "en" ? "Already have an account?" : "Onko sinulla jo tili?"}{" "}
                  <Link href="/sign-in" className="text-orange-400 font-semibold hover:text-orange-300 transition-colors">
                    {language === "en" ? "Sign in" : "Kirjaudu sisään"}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Benefits */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-3xl shadow-2xl shadow-black/50 p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-orange-500/5 pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-orange-400/30 shadow-xl mb-6">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
                    {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
                  </span>
                </div>

                <h2 className="text-3xl font-bold text-gray-100 mb-6">
                  {language === "en" ? "Why HappyApplaid?" : "Miksi HappyApplaid?"}
                </h2>

                <div className="space-y-4">
                  {benefits.map((benefit, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="h-6 w-6 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-100 mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gradient-to-r from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-400/30">
                  <p className="text-sm text-gray-300 text-center">
                    <span className="font-bold">
                      {language === "en" ? "No credit card needed" : "Ei luottokorttia tarvita"}
                    </span>{" "}
                    {language === "en" ? "to create your free CV" : "ilmaisen CV:n luomiseen"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-400 hover:text-gray-200 transition-colors font-medium inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {language === "en" ? "Back to home" : "Takaisin etusivulle"}
          </Link>
        </div>
      </div>
    </div>
  );
}