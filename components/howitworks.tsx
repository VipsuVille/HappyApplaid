"use client";

import {
  UserPlus,
  LogIn,
  CheckCircle2,
  UserCheck,
  Hammer,
  FileText,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HowItWorksTimeline() {
  const { isSignedIn } = useUser();
  const { language } = useLanguage();

  return (
    <section className="bg-card border border-border rounded-3xl p-8 sm:p-12">
      {/* HEADER */}
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-foreground mb-3">
          {language === "en" ? "How it works" : "Näin se toimii"}
        </h2>
        <div className="mx-auto h-1 w-20 bg-primary rounded-full" />
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* STEP 1 */}
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-6">
            {isSignedIn ? (
              <CheckCircle2 className="w-7 h-7 text-primary" />
            ) : (
              <UserPlus className="w-7 h-7 text-primary" />
            )}
          </div>

          <h3 className="font-bold text-lg text-foreground mb-2">
            {language === "en" ? "Create account" : "Luo käyttäjä"}
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            {isSignedIn
              ? language === "en"
                ? "You are already signed in."
                : "Olet jo kirjautunut."
              : language === "en"
              ? "Sign up to get started."
              : "Kirjaudu tai rekisteröidy aloittaaksesi."}
          </p>

          {!isSignedIn && (
            <div className="flex gap-3">
              <Link href="/sign-in" className="flex-1">
                <Button variant="outline" className="w-full">
                  <LogIn className="w-4 h-4 mr-1" />
                  Login
                </Button>
              </Link>

              <Link href="/sign-up" className="flex-1">
                <Button className="w-full">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* STEP 2 */}
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-secondary/20 mb-6">
            <UserCheck className="w-7 h-7 text-secondary-foreground" />
          </div>

          <h3 className="font-bold text-lg text-foreground mb-2">
            {language === "en" ? "Create your profile" : "Luo profiili"}
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            {language === "en"
              ? "Tell us about your skills and experience."
              : "Kerro taidoistasi ja kokemuksestasi."}
          </p>

          {isSignedIn && (
            <Link href="/profile">
              <Button variant="secondary" className="w-full">
                {language === "en" ? "Create profile" : "Luo profiili"}
              </Button>
            </Link>
          )}
        </div>

        {/* STEP 3 */}
        <div className="bg-background border border-border rounded-2xl p-6">
          <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-6">
            <Hammer className="w-7 h-7 text-primary" />
          </div>

          <h3 className="font-bold text-lg text-foreground mb-2">
            {language === "en" ? "Create documents" : "Luo dokumentit"}
          </h3>

          <p className="text-sm text-muted-foreground mb-6">
            {language === "en"
              ? "Generate CVs and cover letters."
              : "Luo CV ja hakukirje helposti."}
          </p>

          {isSignedIn && (
            <div className="flex flex-col gap-3">
              <Link href="/create-cv">
                <Button className="w-full">
                  {language === "en" ? "Create CV" : "Tee CV"}
                </Button>
              </Link>

              <Link href="/create-cover-letter">
                <Button variant="outline" className="w-full">
                  <FileText className="w-4 h-4 mr-1" />
                  {language === "en" ? "Create cover letter" : "Tee hakukirje"}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
