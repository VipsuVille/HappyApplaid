"use client";

import {
  UserPlus,
  LogIn,
  CheckCircle2,
  UserCheck,
  Hammer,
  FileText,
  Sparkles,
} from "lucide-react";
import { useUser, SignInButton, SignUpButton } from "@clerk/nextjs";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { clerkAppearance } from "@/lib/clerkAppearance";

export default function HowItWorksTimeline() {
  const { isSignedIn } = useUser();
  const { language } = useLanguage();

  return (
    <section className="bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-12 shadow-2xl shadow-orange-500/10">
      {/* HEADER */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 backdrop-blur-md border border-orange-400/30 mb-4">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-300 uppercase tracking-wider">
            {language === "en" ? "Quick Start" : "Pika-aloitus"}
          </span>
        </div>
        <h2 className="text-3xl font-black text-white mb-3">
          {language === "en" ? "How it works" : "Näin se toimii"}
        </h2>
        <div className="mx-auto h-1 w-20 bg-gradient-to-r from-orange-500 to-amber-600 rounded-full" />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* STEP 1 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-orange-400/30 transition-all group">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-md mb-6 border border-orange-400/30 group-hover:scale-110 transition-transform">
            {isSignedIn ? (
              <CheckCircle2 className="w-7 h-7 text-orange-400" />
            ) : (
              <UserPlus className="w-7 h-7 text-orange-400" />
            )}
          </div>

          <div className="mb-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            {language === "en" ? "Step 1" : "Vaihe 1"}
          </div>

          <h3 className="font-bold text-lg text-white mb-2">
            {language === "en" ? "Create account" : "Luo käyttäjä"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {isSignedIn
              ? language === "en"
                ? "✓ You're all set!"
                : "✓ Olet valmis!"
              : language === "en"
              ? "Sign up in less than 2 minutes"
              : "Rekisteröidy alle 2 minuutissa"}
          </p>

          {!isSignedIn && (
            <div className="flex flex-col gap-3">
              <SignInButton mode="modal" appearance={clerkAppearance}>
                <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-gray-300">
                  <LogIn className="w-4 h-4 mr-2" />
                  {language === "en" ? "Sign In" : "Kirjaudu"}
                </Button>
              </SignInButton>

              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/20">
                  {language === "en" ? "Sign Up Free" : "Rekisteröidy Ilmaiseksi"}
                </Button>
              </SignUpButton>
            </div>
          )}

          {isSignedIn && (
            <div className="bg-green-500/10 backdrop-blur-md border border-green-400/30 rounded-lg p-3 text-center">
              <CheckCircle2 className="w-5 h-5 text-green-400 mx-auto mb-1" />
              <p className="text-xs font-semibold text-green-400">
                {language === "en" ? "Completed" : "Valmis"}
              </p>
            </div>
          )}
        </div>

        {/* STEP 2 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-orange-400/30 transition-all group">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-md mb-6 border border-orange-400/30 group-hover:scale-110 transition-transform">
            <UserCheck className="w-7 h-7 text-orange-400" />
          </div>

          <div className="mb-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            {language === "en" ? "Step 2" : "Vaihe 2"}
          </div>

          <h3 className="font-bold text-lg text-white mb-2">
            {language === "en" ? "Create your profile" : "Luo profiili"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {language === "en"
              ? "Tell us about your skills and experience"
              : "Kerro taidoistasi ja kokemuksestasi"}
          </p>

          {isSignedIn && (
            <Link href="/profile">
              <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/20">
                {language === "en" ? "Create Profile" : "Luo Profiili"}
              </Button>
            </Link>
          )}

          {!isSignedIn && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">
                {language === "en" ? "Sign up first" : "Kirjaudu ensin"}
              </p>
            </div>
          )}
        </div>

        {/* STEP 3 */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-orange-400/30 transition-all group">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-600/20 backdrop-blur-md mb-6 border border-orange-400/30 group-hover:scale-110 transition-transform">
            <Hammer className="w-7 h-7 text-orange-400" />
          </div>

          <div className="mb-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            {language === "en" ? "Step 3" : "Vaihe 3"}
          </div>

          <h3 className="font-bold text-lg text-white mb-2">
            {language === "en" ? "Create documents" : "Luo dokumentit"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {language === "en"
              ? "Generate CVs and cover letters"
              : "Luo CV ja hakukirje helposti"}
          </p>

          {isSignedIn && (
            <div className="flex flex-col gap-3">
              <Link href="/create-cv">
                <Button className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white shadow-lg shadow-orange-500/20">
                  {language === "en" ? "Create CV" : "Tee CV"}
                </Button>
              </Link>

              <Link href="/create-cover-letter">
                <Button variant="outline" className="w-full bg-white/5 border-white/10 hover:bg-white/10 text-gray-300">
                  <FileText className="w-4 h-4 mr-2" />
                  {language === "en" ? "Create Letter" : "Tee Hakukirje"}
                </Button>
              </Link>
            </div>
          )}

          {!isSignedIn && (
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">
                {language === "en" ? "Complete steps 1 & 2" : "Suorita vaiheet 1 & 2"}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}