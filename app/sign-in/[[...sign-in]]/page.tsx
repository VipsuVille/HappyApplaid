//app/sign-in/[[...sign-in]]/page.tsx

'use client';

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export function SignInPage() {
  const { language } = useLanguage();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-gray-50 via-orange-50/30 to-amber-50/40 py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Animated background orbs - softer colors for light background */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-200/40 to-amber-300/40 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-300/30 to-gray-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md space-y-8 flex flex-col items-center">
        
        {/* Logo/Title Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent tracking-tight">
            HappyApplaid
          </h1>
          <p className="mt-2 text-sm text-gray-700">
            {language === "en" ? "Welcome back!" : "Tervetuloa takaisin!"}
          </p>
        </div>

        {/* Clerk Sign In Component with light backdrop */}
        <div className="w-full flex justify-center backdrop-blur-xl bg-white/80 border-2 border-white/60 rounded-3xl p-8 shadow-2xl shadow-orange-500/10">
          <SignIn 
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
        <div className="text-center">
          <p className="text-sm text-gray-700">
            {language === "en" ? "Don't have an account?" : "Eikö sinulla ole tiliä?"}{" "}
            <Link href="/sign-up" className="font-medium text-orange-600 hover:text-orange-700 transition-colors">
              {language === "en" ? "Sign up" : "Rekisteröidy tästä"}
            </Link>
          </p>
        </div>

        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          ← {language === "en" ? "Back to home" : "Takaisin etusivulle"}
        </Link>
      </div>
    </div>
  );
}

