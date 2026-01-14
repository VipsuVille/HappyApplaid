//app/sign-in/[[...sign-in]]/page.tsx
'use client'

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#1a1a1a] py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Animated background orbs - matching landing page style */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-gray-700/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-md space-y-8 flex flex-col items-center">
        
        {/* Logo/Title Section */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent tracking-tight">
            HappyApplaid
          </h1>
          <p className="mt-2 text-sm text-gray-300">
            Tervetuloa takaisin!
          </p>
        </div>

        {/* Clerk Sign In Component with backdrop */}
        <div className="w-full flex justify-center backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-3xl p-8 shadow-2xl shadow-black/50">
          <SignIn 
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
        <div className="text-center">
          <p className="text-sm text-gray-300">
            Eikö sinulla ole tiliä?{" "}
            <Link href="/sign-up" className="font-medium text-orange-400 hover:text-orange-300 transition-colors">
              Rekisteröidy tästä
            </Link>
          </p>
        </div>

        {/* Back to Home Link */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-200 transition-colors"
        >
          ← Takaisin etusivulle
        </Link>
      </div>
    </div>
  );
}