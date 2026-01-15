'use client';

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { clerkPageAppearance } from "@/lib/clerkAppearance";
import { Sparkles, X } from "lucide-react";

export default function SignInPage() {
  const { language } = useLanguage();
  const router = useRouter();

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black">
      
      {/* Animated background orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/20 to-amber-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-600/15 to-gray-700/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        ></div>
        <div
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/15 to-orange-600/15 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "3s" }}
        ></div>
      </div>

      {/* Subtle grid pattern overlay */}
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
      <div className="relative z-10 w-full max-w-md px-4 flex flex-col items-center">

        {/* Logo/Title Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 backdrop-blur-md border border-orange-400/30 mb-4">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
              HappyApplaid
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-2">
            {language === "en" ? "Welcome back" : "Tervetuloa takaisin"}
          </h1>
          <p className="text-sm text-gray-400">
            {language === "en" ? "Sign in to continue your journey" : "Kirjaudu jatkaaksesi matkaasi"}
          </p>
        </div>

        {/* Clerk Sign In Component */}
        <div className="w-full flex justify-center">
          <SignIn 
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
            signUpUrl="/sign-up"
          />
        </div>

        {/* Footer Text - Single instance */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {language === "en" ? "Don't have an account?" : "Eikö sinulla ole tiliä?"}{" "}
            <Link href="/sign-up" className="font-semibold text-orange-400 hover:text-orange-300 transition-colors">
              {language === "en" ? "Sign up" : "Rekisteröidy"}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}