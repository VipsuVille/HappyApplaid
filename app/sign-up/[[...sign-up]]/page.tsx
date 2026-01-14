//app/sign-up/[[..sign-up]]/page.tsx

// ===================================
// SIGN UP PAGE
// ===================================
'use client';

import { SignUp } from "@clerk/nextjs";
import { Sparkles, Check } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";

export function SignUpPage() {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/40 font-sans text-gray-900 relative overflow-hidden flex items-center justify-center p-4">
      
      {/* Animated background blobs - softer for light theme */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-200/40 to-amber-300/40 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-300/30 to-gray-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Side - Sign Up Form */}
          <div className="backdrop-blur-xl bg-white/80 border-2 border-white/60 rounded-3xl shadow-2xl shadow-orange-500/10 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-orange-100/30 pointer-events-none rounded-3xl"></div>
            
            <div className="relative z-10">
              {/* Logo/Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-3">
                  HappyApplaid
                </h1>
                <p className="text-gray-700 text-lg">
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
                      formFieldInput: "bg-gray-50 border-gray-200 text-gray-900",
                      formFieldLabel: "text-gray-700",
                      identityPreviewText: "text-gray-700",
                      formHeaderTitle: "text-gray-900",
                      formHeaderSubtitle: "text-gray-600",
                      socialButtonsBlockButton: "bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100",
                      dividerLine: "bg-gray-200",
                      dividerText: "text-gray-500",
                      footerActionLink: "text-orange-600 hover:text-orange-700",
                    }
                  }}
                />
              </div>

              {/* Footer Text */}
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-700">
                  {language === "en" ? "Already have an account?" : "Onko sinulla jo tili?"}{" "}
                  <Link href="/sign-in" className="text-orange-600 font-semibold hover:text-orange-700 transition-colors">
                    {language === "en" ? "Sign in" : "Kirjaudu sisään"}
                  </Link>
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Benefits */}
          <div className="hidden lg:flex flex-col justify-center">
            <div className="backdrop-blur-xl bg-white/80 border-2 border-white/60 rounded-3xl shadow-2xl shadow-orange-500/10 p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-orange-100/30 pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-orange-100/80 to-amber-100/80 backdrop-blur-sm border border-orange-200/60 shadow-lg shadow-orange-500/10 mb-6">
                  <Sparkles className="w-5 h-5 text-orange-600" />
                  <span className="text-sm font-bold text-orange-800 uppercase tracking-wider">
                    {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
                  </span>
                </div>

                <h2 className="text-3xl font-bold text-gray-900 mb-6">
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
                        <h3 className="font-bold text-gray-900 mb-1">
                          {benefit.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-200">
                  <p className="text-sm text-gray-800 text-center">
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
          <Link href="/" className="text-gray-600 hover:text-gray-900 transition-colors font-medium inline-flex items-center gap-2">
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