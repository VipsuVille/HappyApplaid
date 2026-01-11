"use client";

import {
  LogIn,
  UserCheck,
  CheckCircle2,
  Hammer,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function HowItWorksTimeline() {
  const { language } = useLanguage();
  const { isSignedIn } = useUser();

  return (
    <div className="bg-[#151515]/80 border border-[#2a2a2a] rounded-[2.5rem] p-8 sm:p-12 shadow-2xl">
      <div className="text-center mb-14">
        <h2 className="text-3xl font-black text-[#e7e3dc] mb-3">
          {language === "en" ? "How it works" : "Näin se toimii"}
        </h2>
        <div className="mx-auto h-1 w-20 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
      </div>

      <div className="grid md:grid-cols-3 gap-8">

        {/* STEP 1 */}
        <div className="p-6 rounded-2xl bg-[#1b1b1b]/70 border border-[#2a2a2a]">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-6">
            {isSignedIn ? (
              <CheckCircle2 className="w-7 h-7 text-green-400" />
            ) : (
              <LogIn className="w-7 h-7 text-orange-400" />
            )}
          </div>

          <h3 className="font-bold text-lg text-[#e7e3dc] mb-2">
            {language === "en" ? "Sign in" : "Kirjaudu sisään"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {isSignedIn
              ? language === "en"
                ? "You are signed in."
                : "Olet kirjautunut sisään."
              : language === "en"
              ? "Create an account to get started."
              : "Luo käyttäjä aloittaaksesi."}
          </p>

          {!isSignedIn && (
            <div className="flex gap-3">
              <Link href="/sign-in" className="flex-1">
                <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#2a2a2a] text-sm font-bold">
                  Login
                </button>
              </Link>
              <Link href="/sign-up" className="flex-1">
                <button className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-sm font-bold">
                  Sign up
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* STEP 2 */}
        <div className="p-6 rounded-2xl bg-[#1b1b1b]/70 border border-[#2a2a2a]">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/15 flex items-center justify-center mb-6">
            <UserCheck className="w-7 h-7 text-amber-400" />
          </div>

          <h3 className="font-bold text-lg text-[#e7e3dc] mb-2">
            {language === "en" ? "Create your profile" : "Luo profiili"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {language === "en"
              ? "Tell us about your skills and experience."
              : "Kerro taidoistasi ja kokemuksestasi."}
          </p>

          {isSignedIn && (
            <Link href="/profile">
              <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#2a2a2a] text-sm font-bold">
                {language === "en" ? "Create profile" : "Luo profiili"}
              </button>
            </Link>
          )}
        </div>

        {/* STEP 3 */}
        <div className="p-6 rounded-2xl bg-[#1b1b1b]/70 border border-[#2a2a2a]">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/15 flex items-center justify-center mb-6">
            <Hammer className="w-7 h-7 text-orange-400" />
          </div>

          <h3 className="font-bold text-lg text-[#e7e3dc] mb-2">
            {language === "en" ? "Create documents" : "Luo dokumentit"}
          </h3>

          <p className="text-sm text-gray-400 mb-6">
            {language === "en"
              ? "Generate CVs and cover letters."
              : "Luo CV ja hakukirje."}
          </p>

          {isSignedIn && (
            <div className="flex gap-3">
              <Link href="/create-cv" className="flex-1">
                <button className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-[#2a2a2a] text-sm font-bold">
                  Tee CV
                </button>
              </Link>
              <Link href="/create-cover-letter" className="flex-1">
                <button className="w-full py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-sm font-bold">
                  Tee hakukirje
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
