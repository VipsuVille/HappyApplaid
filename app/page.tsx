/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, SignInButton, SignedOut } from "@clerk/nextjs";
import {
  FileText,
  User,
  Files,
  Check,
  Sparkles,
  Target,
  Zap,
  Crown,
  Lock,
  X,
  Play,
  ChevronRight,
  Database,
  Shield,
  Brain,
  FileInput,
  AlertTriangle,
  XCircle,
  Award,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import SmartHeader from "@/components/ui/smartHeader";
import { PRICING } from "@/lib/pricing";
import { convertProfileToApiFormat } from "@/types";

interface SubscriptionStatus {
  plan_type: "free" | "basic" | "semi-pro" | "pro";
  is_premium: boolean;
  has_used_free_cv: boolean;
  tokens: number;
  cv_count: number;
  can_create_cv: boolean;
  message: string;
}

export default function Home() {
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [recentCVs, setRecentCVs] = useState<any[]>([]);
  const [recentCoverLetters, setRecentCoverLetters] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [freemiumStatus, setFreemiumStatus] = useState<SubscriptionStatus | null>(null);
  const [freemiumLoading, setFreemiumLoading] = useState(true);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { language } = useLanguage();
  const { isLoaded, isSignedIn, user } = useUser();
  const { tokens } = useTokens();
  
  // Huom: convertProfileToApiFormat.name voi olla ongelmallinen jos se on funktio, 
  // mutta pidin logiikan ennallaan pyynnön mukaisesti.
  const displayName = user?.firstName || (convertProfileToApiFormat as any).name || null;

  // Hae freemium status
  useEffect(() => {
    const checkFreemiumStatus = async () => {
      if (!isSignedIn || !user?.id) return;
      try {
        setFreemiumLoading(true);
        const response = await fetch("/api/check-subscription");
        if (response.ok) {
          const data: SubscriptionStatus = await response.json();
          setFreemiumStatus(data);
        }
      } catch (error) {
        console.error("Error loading freemium status:", error);
      } finally {
        setFreemiumLoading(false);
      }
    };
    if (isLoaded && isSignedIn) {
      checkFreemiumStatus();
    }
  }, [isSignedIn, user?.id, isLoaded]);

  // Check first visit
  useEffect(() => {
    const checkFirstVisit = async () => {
      if (!isSignedIn || !user?.id) return;
      try {
        const [profileResponse, cvsResponse] = await Promise.all([
          fetch(`/api/user-profile/${user.id}`),
          fetch("/api/recent-cvs"),
        ]);
        const hasProfile = profileResponse.ok;
        const cvsData = cvsResponse.ok ? await cvsResponse.json() : [];
        const hasCVs = cvsData.length > 0;
        const hasSeenOnboarding = localStorage.getItem(
          `onboarding_completed_${user.id}`
        );
        const isNewUser = !hasProfile && !hasCVs && !hasSeenOnboarding;
        if (isNewUser) {
          setShowWelcome(true);
        }
        setProfileCompleted(hasProfile);
      } catch (error) {
        console.error("Error checking first visit:", error);
        setProfileCompleted(false);
      }
    };
    if (isLoaded && isSignedIn) {
      checkFirstVisit();
    }
  }, [isSignedIn, user?.id, isLoaded]);

  const handleWelcomeComplete = async (data: {
    name: string;
    email: string;
    useClerkEmail: boolean;
  }) => {
    try {
      const response = await fetch("/api/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: data.name,
            email: data.email,
            education: [
              { id: 1, school: "", degree: "", year: "", isOngoing: false },
            ],
            workExperience: [
              {
                id: 1,
                company: "",
                position: "",
                duration: "",
                description: "",
              },
            ],
            languages: [{ id: 1, language: "", level: "Hyvä" }],
            workingStyle: "",
            problemSolving: "",
            energySources: "",
            uniqueStrength: "",
            learningStyle: "",
            teamRole: "",
            valuesExample: "",
            superpower: "",
            skills: "",
          },
        }),
      });
      if (response.ok) {
        setShowWelcome(false);
        setShowOnboarding(true);
        setProfileCompleted(true);
      }
    } catch (error) {
      console.error("Error saving initial profile:", error);
      setShowWelcome(false);
      setShowOnboarding(true);
    }
  };

  const handleWelcomeSkip = () => {
    setShowWelcome(false);
    setProfileCompleted(false);
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    if (user?.id) {
      localStorage.setItem(`onboarding_completed_${user.id}`, "true");
    }
  };

  useEffect(() => {
    const loadRecentDocuments = async () => {
      if (!isSignedIn || !user?.id || profileCompleted !== true) return;
      setLoadingRecent(true);
      try {
        const cvResponse = await fetch("/api/recent-cvs");
        if (cvResponse.ok) {
          const cvData = await cvResponse.json();
          setRecentCVs(cvData.slice(0, 3));
        }
        if (tokens > 0 || freemiumStatus?.is_premium) {
          const letterResponse = await fetch("/api/recent-cover-letters");
          if (letterResponse.ok) {
            const letterData = await letterResponse.json();
            setRecentCoverLetters(letterData.slice(0, 3));
          }
        }
      } catch (error) {
        console.error("Error loading recent documents:", error);
      } finally {
        setLoadingRecent(false);
      }
    };
    if (
      isLoaded &&
      isSignedIn &&
      profileCompleted === true &&
      !showWelcome &&
      !showOnboarding
    ) {
      loadRecentDocuments();
    }
  }, [
    isSignedIn,
    user?.id,
    profileCompleted,
    tokens,
    freemiumStatus,
    isLoaded,
    showWelcome,
    showOnboarding,
  ]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-lg font-bold text-gray-900">
            {language === "en" ? "Loading..." : "Ladataan..."}
          </div>
        </div>
      </div>
    );
  }

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <WelcomeModal
          isOpen={true}
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
          initialEmail={user?.emailAddresses?.[0]?.emailAddress}
        />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
        <OnboardingSteps
          isOpen={true}
          onComplete={handleOnboardingComplete}
          currentUserName={user?.firstName || "käyttäjä"}
        />
      </div>
    );
  }

  // ========================================
  // LANDING PAGE (LOGGED OUT)
  // ========================================
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>

        <SmartHeader />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* ===================================
              HERO SECTION - MYYVÄ HOOK
              =================================== */}
          <div className="mb-16">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-12 md:p-16 backdrop-saturate-150 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>

              <div className="relative z-10 text-center">
                {/* Trust Badge */}
                <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/90 backdrop-blur-sm rounded-full border-2 border-green-300 shadow-xl mb-6">
                  <Shield className="w-6 h-6 text-green-600" />
                  <span className="font-bold text-green-800">
                    {language === "en"
                      ? "The Only AI That Doesn't Lie"
                      : "Ainoa AI joka EI valehtele"}
                  </span>
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                </div>

                {/* Main Hook */}
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">
                    {language === "en"
                      ? "90% of AI Cover Letters"
                      : "90% AI-hakukirjeistä"}
                  </span>
                  <br />
                  <span className="text-gray-900">
                    {language === "en" ? "Lie." : "Valehtelevat."}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {language === "en" ? "We Stop That." : "Me estämme sen."}
                  </span>
                </h1>

                <p className="text-xl md:text-2xl text-gray-700 max-w-4xl mx-auto leading-relaxed mb-8">
                  {language === "en"
                    ? "The first system that provably prevents AI from inventing skills, work experience, or degrees. Multi-layered validation ensures every word is true."
                    : "Ensimmäinen järjestelmä joka todistettavasti estää AI:n keksimästä taitoja, työkokemusta tai tutkintoja. Monikerroksinen validointi varmistaa että jokainen sana on totta."}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                        <Sparkles className="inline w-5 h-5 mr-2" />
                        {language === "en" ? "Try Free" : "Kokeile Ilmaiseksi"}
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .getElementById("how-it-works")
                        ?.scrollIntoView({ behavior: "smooth" })
                    }
                    className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg border-2 border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    {language === "en"
                      ? "See How It Works"
                      : "Katso Miten Se Toimii"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>
                      {language === "en" ? "No credit card" : "Ei luottokorttia"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>
                      {language === "en" ? "1 free CV" : "1 ilmainen CV"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span>{language === "en" ? "60s setup" : "60s setup"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================
              ONGELMA - Miksi muut epäonnistuvat
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-red-200 shadow-2xl mb-16">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 rounded-full mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <span className="font-bold text-red-800">
                  {language === "en"
                    ? "The Problem With Other AI Tools"
                    : "Ongelma Muissa AI-työkaluissa"}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                {language === "en"
                  ? "ChatGPT & Co. Invent. We Don't."
                  : "ChatGPT & Co. Keksivät. Me Emme."}
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <XCircle className="w-12 h-12 text-red-600 mb-4 mx-auto" />
                <h3 className="font-bold text-lg mb-2 text-center">
                  {language === "en" ? "Invented Skills" : "Keksityt Taidot"}
                </h3>
                <p className="text-sm text-gray-700 text-center">
                  {language === "en"
                    ? '"Skills: Python, React, AWS..." → You\'ve never used them'
                    : '"Osaamiseni: Python, React, AWS..." → Et ole koskaan käyttänyt niitä'}
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <XCircle className="w-12 h-12 text-red-600 mb-4 mx-auto" />
                <h3 className="font-bold text-lg mb-2 text-center">
                  {language === "en"
                    ? "Exaggerated Experience"
                    : "Liioiteltu Kokemus"}
                </h3>
                <p className="text-sm text-gray-700 text-center">
                  {language === "en"
                    ? '"5 years project management..." → 2 years in warehouse'
                    : '"5 vuotta projektinhallintaa..." → Varastossa 2 vuotta'}
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
                <XCircle className="w-12 h-12 text-red-600 mb-4 mx-auto" />
                <h3 className="font-bold text-lg mb-2 text-center">
                  {language === "en" ? "False Degrees" : "Valheelliset Tutkinnot"}
                </h3>
                <p className="text-sm text-gray-700 text-center">
                  {language === "en"
                    ? '"Master\'s in Computer Science..." → Bachelor\'s incomplete'
                    : '"Master\'s in Computer Science..." → AMK kesken'}
                </p>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-red-100 to-pink-100 border-2 border-red-300 rounded-xl p-6">
              <h4 className="font-bold text-red-900 mb-3 text-center text-xl">
                💥{" "}
                {language === "en"
                  ? "What Happens When You Get Caught?"
                  : "Mitä Tapahtuu Kun Jäät Kiinni?"}
              </h4>
              <div className="grid md:grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <p className="font-bold text-red-800 text-2xl mb-1">❌</p>
                  <p className="text-red-700">
                    {language === "en"
                      ? "Application rejected immediately"
                      : "Hakemus hylätty välittömästi"}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-2xl mb-1">🚫</p>
                  <p className="text-red-700">
                    {language === "en"
                      ? "Blacklisted at company"
                      : "Mustalle listalle yrityksessä"}
                  </p>
                </div>
                <div>
                  <p className="font-bold text-red-800 text-2xl mb-1">📉</p>
                  <p className="text-red-700">
                    {language === "en"
                      ? "Reputation damaged in industry"
                      : "Maine kärsii alalla"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================
              RATKAISU - 5 KERROSTA
              =================================== */}
          <div
            id="how-it-works"
            className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 md:p-12 border-2 border-green-300 shadow-2xl mb-16"
          >
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 rounded-full mb-4">
                <Shield className="w-5 h-5 text-green-600" />
                <span className="font-bold text-green-800">
                  {language === "en"
                    ? "HappyApplaid Solution"
                    : "HappyApplaid Ratkaisu"}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en"
                  ? "5-Layer Truth Verification"
                  : "5-Kerroksinen Totuuden Varmistus"}
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                {language === "en"
                  ? "Every cover letter and CV passes through 5 separate AI checks before reaching you. If any layer detects an untruthful claim, the entire document is rejected."
                  : "Jokainen hakukirje ja CV läpäisee 5 erillistä AI-tarkastusta ennen kuin se päätyy sinulle. Jos joku kerros havaitsee epätodenmukaisen väitteen, koko dokumentti hylätään."}
              </p>
            </div>

            {/* 5 Layers */}
            <div className="space-y-4 mb-8">
              {/* Layer 1 - Psykologinen Profilointi */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <Brain className="w-6 h-6 text-blue-600" />
                      {language === "en"
                        ? "Psychological Profiling"
                        : "Psykologinen Profilointi"}
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {language === "en"
                        ? "AI analyzes your personality across 8 dimensions to ensure your cover letter sounds like you, not a generic robot."
                        : "AI analysoi persoonallisuutesi 8 eri dimensiosta ja varmistaa että hakukirje kuulostaa sinulta, ei geneeriseltä robotilta."}
                    </p>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm text-blue-900">
                        <strong>
                          {language === "en" ? "Example:" : "Esimerkki:"}
                        </strong>{" "}
                        {language === "en"
                          ? 'If you\'re introverted, AI won\'t write "I enjoy large social situations" - that would be inauthentic.'
                          : 'Jos olet introvertti, AI ei kirjoita "Nautin suurista sosiaalisista tilanteista" – se olisi epäaitoa.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 2 - Älykäs Kysymysjärjestelmä */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <Target className="w-6 h-6 text-purple-600" />
                      {language === "en"
                        ? "Smart Question System"
                        : "Älykäs Kysymysjärjestelmä"}
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {language === "en"
                        ? "If your profile doesn't match job requirements, AI asks before inventing. No assumptions, no guessing."
                        : "Jos profiilisi ei vastaa työn vaatimuksiin, AI kysyy ennen kuin keksii. Ei oletuksia, ei arvailua."}
                    </p>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-sm text-purple-900">
                        <strong>
                          {language === "en" ? "Example:" : "Esimerkki:"}
                        </strong>{" "}
                        {language === "en"
                          ? 'Job requires "project management" but you haven\'t mentioned it → AI asks: "Do you have project management experience?" instead of claiming you do.'
                          : 'Työ vaatii "projektinhallintaa" mutta et ole maininnut sitä → AI kysyy: "Onko sinulla projektinhallintakokemusta?" eikä vain väitä että on.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 3 - ATS-Optimointi */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 border-amber-200 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <Zap className="w-6 h-6 text-amber-600" />
                      {language === "en"
                        ? "ATS Optimization (Semi-Pro+)"
                        : "ATS-Optimointi (Semi-Pro+)"}
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {language === "en"
                        ? "AI automatically detects if the company uses ATS systems and optimizes accordingly. No unnecessary optimization for small companies."
                        : "AI tunnistaa automaattisesti käyttääkö yritys ATS-järjestelmää ja optimoi hakukirjeen sen mukaan. Ei turhaa optimointia pienille yrityksille."}
                    </p>
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-sm text-amber-900">
                        <strong>
                          {language === "en" ? "Fact:" : "Fakta:"}
                        </strong>{" "}
                        {language === "en"
                          ? "75% of large companies use ATS. We increase pass rate from 60% → 90%+ with semantic matching (not just keywords, but also synonyms)."
                          : "75% suuryrityksistä käyttää ATS:ää. Me nostamme läpäisyprosentin 60% → 90%+ semanttisella matchauksella (ei vain avainsanat, vaan myös synonyymit)."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 4 - RAG (PRO) */}
              <div className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-2xl p-6 border-2 border-yellow-400 shadow-lg relative overflow-hidden">
                <div className="absolute top-4 right-4 opacity-20">
                  <Crown className="w-20 h-20 text-yellow-600" />
                </div>
                <div className="flex items-start gap-4 relative z-10">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    4
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <Database className="w-6 h-6 text-yellow-700" />
                      {language === "en"
                        ? "RAG - Expert Consultation (PRO)"
                        : "RAG - Eksperttikonsultaatio (PRO)"}
                      <Crown className="w-5 h-5 text-yellow-600" />
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {language === "en"
                        ? "AI reads real expert articles before writing. Like having 10 recruitment consultants advising at once."
                        : "AI lukee todellisia eksperttiartikkeleita ennen kirjoittamista. Kuin olisi 10 rekrytointikonsulttia antamassa neuvoja samaan aikaan."}
                    </p>
                    <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-300">
                      <p className="text-sm text-yellow-900 mb-2">
                        <strong>
                          {language === "en"
                            ? "How it works:"
                            : "Miten se toimii:"}
                        </strong>
                      </p>
                      <ol className="text-sm text-yellow-900 space-y-1 list-decimal list-inside">
                        <li>
                          {language === "en"
                            ? "Semantic search from database (no keywords)"
                            : "Semanttinen haku tietokannasta (ei avainsanoja)"}
                        </li>
                        <li>
                          {language === "en"
                            ? "Filter by content type (CV vs cover letter)"
                            : "Suodatus sisällön tyypin mukaan (CV vs hakukirje)"}
                        </li>
                        <li>
                          {language === "en"
                            ? "Priority: high → medium → low sources"
                            : "Prioriteetti: high → medium → low lähteet"}
                        </li>
                        <li>
                          {language === "en"
                            ? "Integration into AI generation in real-time"
                            : "Integrointi AI:n generointiin reaaliajassa"}
                        </li>
                      </ol>
                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <p className="text-xs text-yellow-800">
                          <strong>
                            {language === "en" ? "Proof:" : "Todiste:"}
                          </strong>{" "}
                          {language === "en"
                            ? "PRO users get on average 2.3x more interview invitations than Basic users."
                            : "PRO-käyttäjät saavat keskimäärin 2.3x enemmän haastattelukutsuja kuin Basic-käyttäjät."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 5 - Master Guardian */}
              <div className="bg-gradient-to-r from-red-100 to-pink-100 rounded-2xl p-6 border-2 border-red-400 shadow-lg">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    5
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-xl mb-2 flex items-center gap-2">
                      <Shield className="w-6 h-6 text-red-600" />
                      {language === "en"
                        ? "Master Guardian - Final Watchdog"
                        : "Master Guardian - Viimeinen Vartija"}
                    </h3>
                    <p className="text-gray-700 mb-3">
                      {language === "en"
                        ? "Most critical layer. Compares every claim to Ground Truth (your real profile data). If a contradiction is found, entire document is rejected."
                        : "Kriittisin kerros. Vertaa jokaista väitettä Ground Truthiin (profiilisi todelliset tiedot). Jos löytyy ristiriita, koko dokumentti hylätään."}
                    </p>
                    <div className="bg-red-50 rounded-lg p-4 border-2 border-red-300">
                      <p className="text-sm text-red-900 mb-3">
                        <strong>
                          {language === "en"
                            ? "What Master Guardian checks:"
                            : "Mitä Master Guardian tarkistaa:"}
                        </strong>
                      </p>
                      <div className="grid md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-800">
                            {language === "en"
                              ? "Work years match"
                              : "Työvuodet täsmäävät"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-800">
                            {language === "en"
                              ? "Degrees verified"
                              : "Tutkinnot todistettu"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-800">
                            {language === "en"
                              ? "Skills in profile"
                              : "Taidot profiilissa"}
                          </span>
                        </div>
                        <div className="flex items-start gap-2">
                          <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-red-800">
                            {language === "en"
                              ? "Job titles realistic"
                              : "Työnimikkeet realistiset"}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 bg-white border-2 border-red-400 rounded-lg p-3">
                        <p className="text-xs font-bold text-red-900 mb-1">
                          🚨{" "}
                          {language === "en"
                            ? "DANGER = AUTOMATICALLY REJECTED"
                            : "DANGER = HYLÄTTY AUTOMAATTISESTI"}
                        </p>
                        <p className="text-xs text-red-800">
                          {language === "en"
                            ? 'If Master Guardian gives a "DANGER" classification, the document NEVER reaches the database. You get a clear error message and suggestions on how to fix it.'
                            : 'Jos Master Guardian antaa "DANGER"-luokituksen, dokumentti ei KOSKAAN päädy tietokantaan. Saat selkeän virheilmoituksen ja ehdotukset miten korjata.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trust Seal */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-2xl p-6 text-center">
              <div className="flex items-center justify-center gap-3 mb-3">
                <Award className="w-8 h-8" />
                <h3 className="text-2xl font-bold">
                  {language === "en"
                    ? "100% Truthfulness Guarantee"
                    : "100% Totuudenmukaisuustakuu"}
                </h3>
              </div>
              <p className="text-lg text-green-100">
                {language === "en"
                  ? "If Master Guardian approves a document, it is completely truthful. No exaggerations. No inventions. No lies."
                  : "Jos Master Guardian hyväksyy dokumentin, se on täysin todenmukainen. Ei liioittelua. Ei keksintöjä. Ei valheita."}
              </p>
            </div>
          </div>

          {/* ===================================
              VIDEO DEMO SECTION
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-indigo-200 shadow-2xl mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "See How It Works" : "Katso Miten Se Toimii"}
              </h2>
              <p className="text-lg text-gray-700">
                {language === "en"
                  ? "Watch a demo showing the system in action"
                  : "Katso demo jossa näytetään järjestelmän toimintaa"}
              </p>
            </div>

            {/* Video Placeholder */}
            <div className="relative aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-lg">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/50 hover:scale-110 transition-transform cursor-pointer">
                  <Play className="h-10 w-10 text-white ml-1" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {language === "en"
                    ? "Demo Video Coming Soon"
                    : "Demo-video Tulossa Pian"}
                </h3>
                <p className="text-gray-600 max-w-md">
                  {language === "en"
                    ? "We're preparing a comprehensive video showing profile creation, document generation, and Master Guardian in action"
                    : "Valmistelemme kattavaa videota jossa näytetään profiilin luonti, dokumenttien generointi ja Master Guardian toiminnassa"}
                </p>
              </div>
            </div>

            {/* Video Features Preview */}
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <div className="text-center p-4 bg-indigo-50 rounded-xl">
                <User className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                <h4 className="font-bold text-gray-900 mb-1">
                  {language === "en" ? "Profile Creation" : "Profiilin Luonti"}
                </h4>
                <p className="text-sm text-gray-600">
                  {language === "en"
                    ? "Step-by-step walkthrough"
                    : "Askel askeleelta läpikäynti"}
                </p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-xl">
                <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <h4 className="font-bold text-gray-900 mb-1">
                  {language === "en"
                    ? "Document Generation"
                    : "Dokumentin Generointi"}
                </h4>
                <p className="text-sm text-gray-600">
                  {language === "en"
                    ? "Live generation process"
                    : "Suora generointiprosessi"}
                </p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-xl">
                <Shield className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h4 className="font-bold text-gray-900 mb-1">
                  {language === "en" ? "Master Guardian" : "Master Guardian"}
                </h4>
                <p className="text-sm text-gray-600">
                  {language === "en"
                    ? "Validation in action"
                    : "Validointi toiminnassa"}
                </p>
              </div>
            </div>
          </div>

          {/* ===================================
              TECHNICAL PROOF
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-gray-300 shadow-2xl mb-16">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full mb-4">
                <FileText className="w-5 h-5 text-gray-700" />
                <span className="font-bold text-gray-800">
                  {language === "en" ? "Technical Proof" : "Tekninen Todiste"}
                </span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en"
                  ? "How It Actually Works"
                  : "Näin Se Oikeasti Toimii"}
              </h2>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                {language === "en"
                  ? "No marketing talk. Here are the real technical components that prevent AI from lying."
                  : "Ei markkinointipuhetta. Tässä ovat todelliset tekniset komponentit jotka estävät AI:n valehtelemasta."}
              </p>
            </div>

            {/* Component Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Component 1 */}
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Brain className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      personalityExtractor.ts
                    </h3>
                    <p className="text-xs text-blue-700 font-mono">
                      {language === "en"
                        ? "Role: Psychologist"
                        : "Rooli: Psykologi"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {language === "en"
                    ? "Analyzes your profile across 8 psychological dimensions: work style, problem-solving, energy sources, strengths, learning style, team role, values, and superpower."
                    : "Analysoi profiilisi 8 psykologista dimensiota: työskentelytapa, ongelmanratkaisu, energialähteet, vahvuudet, oppimistyyli, tiimirooli, arvot ja supervoima."}
                </p>
                <div className="bg-blue-100 rounded-lg p-3 text-xs">
                  <p className="font-bold text-blue-900 mb-1">
                    {language === "en"
                      ? "Real validation:"
                      : "Todellinen validointi:"}
                  </p>
                  <code className="text-blue-800">
                    extractionQuality.completeness: 0-1
                    <br />
                    extractionQuality.clarity: 0-1
                    <br />→{" "}
                    {language === "en"
                      ? "If < 0.5, document not credible"
                      : "Jos < 0.5, dokumentti ei ole uskottava"}
                  </code>
                </div>
              </div>

              {/* Component 2 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      smartQuestionAnalyzer.ts
                    </h3>
                    <p className="text-xs text-purple-700 font-mono">
                      {language === "en"
                        ? "Role: Investigator"
                        : "Rooli: Tiedustelija"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {language === "en"
                    ? "No hardcoded rules. AI understands EVERY job as unique and asks only necessary questions for this specific role."
                    : "Ei kovakoodattuja sääntöjä. AI ymmärtää JOKAISEN työn uniikkina ja kysyy vain tarpeellisia kysymyksiä tälle työlle."}
                </p>
                <div className="bg-purple-100 rounded-lg p-3 text-xs">
                  <p className="font-bold text-purple-900 mb-1">
                    {language === "en" ? "Zero Hardcoding:" : "Zero Hardcoding:"}
                  </p>
                  <code className="text-purple-800">
                    analyzeJobAndProfile()
                    <br />→{" "}
                    {language === "en"
                      ? 'No: "if (role === \'developer\')"'
                      : 'Ei: "if (role === \'developer\')"'}{" "}
                    <br />→{" "}
                    {language === "en"
                      ? "Yes: AI understands semantically"
                      : "Kyllä: AI ymmärtää semanttisesti"}
                  </code>
                </div>
              </div>

              {/* Component 3 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border-2 border-amber-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">
                      realisticATSAnalyzer.ts
                    </h3>
                    <p className="text-xs text-amber-700 font-mono">
                      {language === "en"
                        ? "Role: ATS Expert"
                        : "Rooli: ATS-Ekspertti"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {language === "en"
                    ? "Automatically detects if the company uses ATS (no unnecessary optimization for startups). Then extracts keywords semantically - not with regex patterns."
                    : "Tunnistaa automaattisesti käyttääkö yritys ATS:ää (ei turhaa optimointia startupille). Sitten ekstraktoi avainsanat semanttisesti - ei regex-patterneilla."}
                </p>
                <div className="bg-amber-100 rounded-lg p-3 text-xs">
                  <p className="font-bold text-amber-900 mb-1">
                    {language === "en"
                      ? "AI-based detection:"
                      : "AI-pohjainen detectio:"}
                  </p>
                  <code className="text-amber-800">
                    detectATSUsageAI(jobDescription)
                    <br />
                    → confidence: 0.0-1.0
                    <br />→ companySize: "large" →{" "}
                    {language === "en" ? "ATS likely" : "ATS todennäköinen"}
                  </code>
                </div>
              </div>

              {/* Component 4 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border-2 border-green-200">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">synonymMatcher.ts</h3>
                    <p className="text-xs text-green-700 font-mono">
                      {language === "en"
                        ? "Role: Semanticist"
                        : "Rooli: Semantikko"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {language === "en"
                    ? 'Semantic understanding - not just keywords. If job requires "teamwork" and you wrote "collaborative approach", it understands they are the same.'
                    : 'Semanttinen ymmärrys - ei vain avainsanoja. Jos työ vaatii "teamwork" ja kirjoitit "collaborative approach", se ymmärtää että ne ovat sama asia.'}
                </p>
                <div className="bg-green-100 rounded-lg p-3 text-xs">
                  <p className="font-bold text-green-900 mb-1">
                    {language === "en"
                      ? "Real example:"
                      : "Todellinen esimerkki:"}
                  </p>
                  <code className="text-green-800">
                    findKeywordUniversal("problem-solving")
                    <br />✓{" "}
                    {language === "en"
                      ? 'Finds: "I solve challenges"'
                      : 'Löytää: "I solve challenges"'}
                    <br />
                    matchType: "synonym", confidence: 0.9
                  </code>
                </div>
              </div>

              {/* Component 5 */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border-2 border-red-300">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-red-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">masterGuardian.ts</h3>
                    <p className="text-xs text-red-700 font-mono">
                      {language === "en" ? "Role: Watchdog" : "Rooli: Vartija"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  {language === "en"
                    ? "Most critical component. Extracts Ground Truth (real data from profile) and compares EVERY claim to it. One contradiction → REJECT."
                    : "Kriittisin komponentti. Ekstraktoi Ground Truth (todelliset tiedot profiilista) ja vertaa JOKAISTA väitettä siihen. Yksikin ristiriita → REJECT."}
                </p>
                <div className="bg-red-100 rounded-lg p-3 text-xs border border-red-300">
                  <p className="font-bold text-red-900 mb-1">
                    {language === "en" ? "Real code:" : "Todellinen koodi:"}
                  </p>
                  <code className="text-red-800">
                    masterConsistencyCheckAI(text, groundTruth)
                    <br />
                    → riskLevel: "safe" | "warning" | "DANGER"
                    <br />→ if (DANGER) throw new Error("REJECTED")
                  </code>
                </div>
              </div>

              {/* Component 6 - PRO */}
              <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-6 border-2 border-yellow-400 col-span-full">
                <div className="flex items-start gap-3 mb-4">
                  <div className="h-10 w-10 bg-yellow-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Database className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      knowledge/ingestion.ts + buildAIContext
                      <Crown className="w-5 h-5 text-yellow-600" />
                    </h3>
                    <p className="text-xs text-yellow-700 font-mono">
                      {language === "en"
                        ? "Role: Librarian + Consultant (PRO)"
                        : "Rooli: Kirjastonhoitaja + Konsultti (PRO)"}
                    </p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-700 mb-3">
                      {language === "en"
                        ? 'RAG = Retrieval-Augmented Generation. Not just "ask AI", but "read real expert articles and integrate their advice".'
                        : 'RAG = Retrieval-Augmented Generation. Ei vain "kysele AI:lta", vaan "lue todellisia eksperttiartikkeleita ja integroi niiden neuvot".'}
                    </p>
                    <div className="bg-yellow-50 rounded-lg p-3 text-xs">
                      <p className="font-bold text-yellow-900 mb-1">
                        {language === "en"
                          ? "Technical implementation:"
                          : "Tekninen toteutus:"}
                      </p>
                      <code className="text-yellow-800 block space-y-1">
                        <div>
                          1. ingestContent(article, type="cover_letter")
                        </div>
                        <div>2. OpenAI embeddings → Supabase vector DB</div>
                        <div>
                          3. buildAIContext(jobDescription, contentType)
                        </div>
                        <div>
                          4.{" "}
                          {language === "en"
                            ? "Semantic search (no keywords)"
                            : "Semantic search (ei keywords)"}
                        </div>
                        <div>5. Priority: high → medium → low</div>
                        <div>6. Inject into AI prompt</div>
                      </code>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 mb-3">
                      {language === "en"
                        ? "Real data: Articles from HR experts, recruitment consultants, and ATS system specialists. Filtered by content type (CV vs Cover Letter)."
                        : "Todellinen data: Artikkelit HR-eksperteiltä, rekrytointikonsulteilta, ja ATS-järjestelmien asiantuntijoilta. Suodatetaan sisällön tyypin mukaan (CV vs Cover Letter)."}
                    </p>
                    <div className="bg-yellow-50 rounded-lg p-3 text-xs">
                      <p className="font-bold text-yellow-900 mb-1">
                        {language === "en"
                          ? "What it actually does:"
                          : "Mitä se oikeasti tekee:"}
                      </p>
                      <ul className="text-yellow-800 space-y-1">
                        <li>
                          •{" "}
                          {language === "en"
                            ? "Fetches 3-5 most relevant articles"
                            : "Hakee 3-5 relevantteinta artikkelia"}
                        </li>
                        <li>
                          •{" "}
                          {language === "en"
                            ? "Combines their advice into AI prompt"
                            : "Yhdistää niiden neuvot AI-promptiin"}
                        </li>
                        <li>
                          •{" "}
                          {language === "en"
                            ? "AI writes with expert knowledge"
                            : "AI kirjoittaa eksperttitiedolla"}
                        </li>
                        <li>
                          •{" "}
                          {language === "en"
                            ? "Result: 20-30% better quality"
                            : "Tulos: 20-30% parempi laatu"}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Proof Statement */}
            <div className="mt-8 bg-gray-900 text-white rounded-2xl p-6 text-center">
              <p className="text-lg mb-2">
                <strong>
                  💻{" "}
                  {language === "en"
                    ? "Open Source Principle"
                    : "Avoin Lähdekoodiperiaate"}
                </strong>
              </p>
              <p className="text-sm text-gray-300">
                {language === "en"
                  ? "Every component is a real TypeScript file in our system. Not theory - these are real functions executed for every document."
                  : "Jokainen komponentti on todellinen TypeScript-tiedosto järjestelmässämme. Ei teoriaa - nämä ovat todellisia funktioita jotka suoritetaan jokaiselle dokumentille."}
              </p>
            </div>
          </div>

          {/* ===================================
              COMPARISON TABLE
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-gray-300 shadow-2xl mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en"
                  ? "ChatGPT vs HappyApplaid"
                  : "ChatGPT vs HappyApplaid"}
              </h2>
              <p className="text-lg text-gray-700">
                {language === "en"
                  ? "Both use AI. But only one ensures truth."
                  : "Molemmat käyttävät AI:ta. Mutta vain yksi varmistaa totuuden."}
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="p-4 text-left font-bold">
                      {language === "en" ? "Feature" : "Ominaisuus"}
                    </th>
                    <th className="p-4 text-center font-bold">
                      {language === "en"
                        ? "ChatGPT / Other AI"
                        : "ChatGPT / Muut AI"}
                    </th>
                    <th className="p-4 text-center font-bold">HappyApplaid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "Generate cover letter"
                        : "Generoi hakukirjeen"}
                    </td>
                    <td className="p-4 text-center">✅</td>
                    <td className="p-4 text-center">✅</td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "Verify truthfulness"
                        : "Tarkistaa totuudenmukaisuuden"}
                    </td>
                    <td className="p-4 text-center text-red-600 font-bold">
                      ❌
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅ {language === "en" ? "5 layers" : "5 kerrosta"}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "Ask before inventing"
                        : "Kysyy ennen keksimistä"}
                    </td>
                    <td className="p-4 text-center text-red-600 font-bold">
                      ❌
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "Psychological profiling"
                        : "Psykologinen profilointi"}
                    </td>
                    <td className="p-4 text-center text-red-600 font-bold">
                      ❌
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "ATS optimization"
                        : "ATS-optimointi"}
                    </td>
                    <td className="p-4 text-center text-orange-500">
                      ⚠️ {language === "en" ? "Manual" : "Manuaalinen"}
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅ {language === "en" ? "Automatic" : "Automaattinen"}
                    </td>
                  </tr>
                  <tr>
                    <td className="p-4 font-semibold">
                      {language === "en"
                        ? "Expert knowledge (RAG)"
                        : "Eksperttitieto (RAG)"}
                    </td>
                    <td className="p-4 text-center text-red-600 font-bold">
                      ❌
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅ PRO
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="p-4 font-semibold">
                      {language === "en" ? "Risk of lies" : "Valheiden riski"}
                    </td>
                    <td className="p-4 text-center text-red-600 font-bold">
                      🔥 {language === "en" ? "High" : "Korkea"}
                    </td>
                    <td className="p-4 text-center text-green-600 font-bold">
                      ✅ {language === "en" ? "Zero" : "Nolla"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================
              PRICING
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border-2 border-indigo-200 shadow-2xl mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en"
                  ? "Start Free Today"
                  : "Aloita Ilmaiseksi Tänään"}
              </h2>
              <p className="text-lg text-gray-700">
                {language === "en"
                  ? "Choose the plan that fits your needs"
                  : "Valitse tarpeisiisi sopiva paketti"}
              </p>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              {Object.entries(PRICING).map(([tier, details]) => (
                <div
                  key={tier}
                  className={`bg-white rounded-2xl p-6 border-2 ${
                    tier === "semi-pro"
                      ? "border-yellow-400 shadow-2xl scale-105 relative"
                      : "border-gray-200 shadow-lg"
                  }`}
                >
                  {tier === "semi-pro" && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      {language === "en" ? "Most Popular" : "Suosituin"}
                    </div>
                  )}

                  <h3 className="text-2xl font-bold mb-2 capitalize">
                    {tier === "semi-pro"
                      ? "Semi-Pro"
                      : tier === "free"
                      ? language === "en"
                        ? "Free"
                        : "Ilmainen"
                      : tier.toUpperCase()}
                  </h3>

                  <div className="mb-4">
                    <span className="text-4xl font-bold">{details.monthly}€</span>
                    <span className="text-gray-600">
                      {language === "en" ? "/month" : "/kk"}
                    </span>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {details.features.map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm"
                      >
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Link href="/pricing">
                    <Button
                      className={`w-full ${
                        tier === "semi-pro"
                          ? "bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                          : ""
                      }`}
                    >
                      {tier === "free"
                        ? language === "en"
                          ? "Get Started"
                          : "Aloita"
                        : language === "en"
                        ? "Choose Plan"
                        : "Valitse"}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* ===================================
              FINAL CTA
              =================================== */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-12 md:p-16 text-center text-white shadow-2xl">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
              {language === "en"
                ? "Ready to Create Truthful Applications?"
                : "Valmis Luomaan Totuudenmukaisia Hakemuksia?"}
            </h2>
            <p className="text-xl md:text-2xl mb-8 text-indigo-100 max-w-3xl mx-auto">
              {language === "en"
                ? "Join thousands who trust HappyApplaid for honest, effective job applications"
                : "Liity tuhansien joukkoon jotka luottavat HappyApplaidiin rehellisistä, tehokkaisista työhakemuksista"}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all">
                    <Sparkles className="inline w-5 h-5 mr-2" />
                    {language === "en" ? "Start Free Now" : "Aloita Ilmaiseksi"}
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-indigo-100">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>
                  {language === "en"
                    ? "No credit card required"
                    : "Ei luottokorttia"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>
                  {language === "en" ? "Cancel anytime" : "Peruuta milloin vain"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5" />
                <span>
                  {language === "en"
                    ? "100% truthful guarantee"
                    : "100% totuustakuu"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="py-12 text-center text-gray-600 border-t border-indigo-100 bg-white/70 backdrop-blur-xl mt-16">
          <div className="max-w-7xl mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="font-bold text-gray-900 mb-3">HappyApplaid</h3>
                <p className="text-sm">
                  {language === "en"
                    ? "The only AI that doesn't lie"
                    : "Ainoa AI joka ei valehtele"}
                </p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3">
                  {language === "en" ? "Product" : "Tuote"}
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/pricing" className="hover:text-indigo-600">
                      {language === "en" ? "Pricing" : "Hinnoittelu"}
                    </Link>
                  </li>
                  <li>
                    <Link href="#how-it-works" className="hover:text-indigo-600">
                      {language === "en" ? "How It Works" : "Miten Se Toimii"}
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-3">
                  {language === "en" ? "Legal" : "Lakiasiat"}
                </h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <Link href="/privacy" className="hover:text-indigo-600">
                      {language === "en" ? "Privacy Policy" : "Tietosuoja"}
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="hover:text-indigo-600">
                      {language === "en" ? "Terms of Service" : "Käyttöehdot"}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
            <p className="text-sm">
              © {new Date().getFullYear()} HappyApplaid.{" "}
              {language === "en"
                ? "All rights reserved."
                : "Kaikki oikeudet pidätetään."}
            </p>
          </div>
        </footer>
      </div>
    );
  }

  // ========================================
  // DASHBOARD (LOGGED IN)
  // ========================================

  if (profileCompleted === null || freemiumLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-lg font-bold text-gray-900">
            {language === "en" ? "Loading..." : "Ladataan..."}
          </div>
        </div>
      </div>
    );
  }

  const isPremium = freemiumStatus?.is_premium || false;
  const canCreateCV = freemiumStatus?.can_create_cv || false;
  const hasUsedFreeCv = freemiumStatus?.has_used_free_cv || false;
  const currentTier = freemiumStatus?.plan_type || "free";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      <SmartHeader />

      {/* Profile Prompt Modal */}
      {showProfilePrompt && profileCompleted === false && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/90 border-2 border-white/40 rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowProfilePrompt(false)}
              className="absolute top-4 right-4 hover:bg-gray-100 rounded-full p-1"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <User className="h-16 w-16 mx-auto mb-4 text-indigo-600" />
            <h3 className="text-2xl font-bold text-center mb-4 text-gray-900">
              {language === "en"
                ? `Hey, ${user?.firstName}!`
                : `Hei, ${user?.firstName}!`}
            </h3>
            <p className="text-center text-gray-600 mb-6">
              {language === "en"
                ? "We recommend filling out your profile to get the best results"
                : "Suosittelemme profiilin täyttämistä parhaan tuloksen saamiseksi"}
            </p>

            <div className="flex gap-3">
              <Link href="/profile" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                  {language === "en" ? "Fill Profile" : "Täytä Profiili"}
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowProfilePrompt(false)}
                className="flex-1"
              >
                {language === "en" ? "Later" : "Myöhemmin"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-8">
          <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {language === "en"
              ? `Welcome${displayName ? `, ${displayName}` : ""}!`
              : `Tervetuloa${displayName ? `, ${displayName}` : ""}!`}
          </h1>
          <p className="text-gray-700 text-lg">
            {currentTier === "free"
              ? language === "en"
                ? "Free user - 1 personalized CV"
                : "Ilmainen käyttäjä - 1 persoonallinen CV"
              : `${currentTier.toUpperCase()}-${
                  language === "en" ? "user" : "käyttäjä"
                }`}
          </p>
        </div>

        {/* Upgrade Prompt for Free Users */}
        {!isPremium && hasUsedFreeCv && (
          <div className="mb-8 backdrop-blur-xl bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-3xl shadow-2xl p-8">
            <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">
              {language === "en"
                ? "You've used your free CV!"
                : "Olet käyttänyt ilmaisen CV:si!"}
            </h2>
            <p className="text-center text-gray-700 mb-6">
              {language === "en"
                ? "Upgrade to create unlimited CVs and cover letters"
                : "Päivitä luodaksesi rajattomasti CV:itä ja hakukirjeitä"}
            </p>
            <Link href="/pricing" className="block">
              <Button className="mx-auto block bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-bold">
                <Crown className="w-5 h-5 mr-2" />
                {language === "en"
                  ? "Upgrade to Premium"
                  : "Päivitä Premium-tiliin"}
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Create CV Card */}
          {canCreateCV ? (
            <Link href="/create-cv">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                <FileText className="h-12 w-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {isPremium
                    ? language === "en"
                      ? "Unlimited ATS-optimized CVs"
                      : "Rajattomat ATS-optimoidut CV:t"
                    : language === "en"
                    ? "Free personality-driven CV"
                    : "Ilmainen persoonallisuusvetoinen CV"}
                </p>
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </Button>
              </div>
            </Link>
          ) : (
            <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl shadow-xl p-6 opacity-60">
              <Lock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-gray-900">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {language === "en"
                  ? "Free CV already used"
                  : "Ilmainen CV jo käytetty"}
              </p>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">
                  {language === "en" ? "Upgrade" : "Päivitä"}
                </Button>
              </Link>
            </div>
          )}

          {/* Create Cover Letter Card */}
          {isPremium ? (
            <Link href="/create-cover-letter">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                <FileInput className="h-12 w-12 text-green-600 mb-4" />
                <h3 className="font-bold text-xl mb-2 text-gray-900">
                  {language === "en" ? "Create Cover Letter" : "Luo Hakukirje"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {language === "en"
                    ? "ATS-optimized cover letters"
                    : "ATS-optimoidut hakukirjeet"}
                </p>
                <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                  {language === "en" ? "Create Cover Letter" : "Luo Hakukirje"}
                </Button>
              </div>
            </Link>
          ) : (
            <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl shadow-xl p-6 opacity-60">
              <Lock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-gray-900">
                {language === "en" ? "Cover Letter" : "Hakukirje"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {language === "en" ? "Premium only" : "Vain Premium"}
              </p>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">
                  {language === "en" ? "Upgrade" : "Päivitä"}
                </Button>
              </Link>
            </div>
          )}

          {/* Edit Profile Card */}
          <Link href="/profile">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <User className="h-12 w-12 text-amber-600 mb-4" />
              <h3 className="font-bold text-xl mb-2 text-gray-900">
                {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {language === "en"
                  ? "Update your information"
                  : "Päivitä tietosi"}
              </p>
              <Button variant="outline" className="w-full">
                {language === "en" ? "Edit" : "Muokkaa"}
              </Button>
            </div>
          </Link>
        </div>

        {/* Recent Documents */}
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-gray-900">
            <Files className="h-6 w-6 text-indigo-600" />
            {language === "en" ? "My Documents" : "Omat Dokumentit"}
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* CVs Section */}
            <div>
              <Link href="/my-cvs">
                <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all mb-4 cursor-pointer">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    <span className="font-bold text-gray-900">
                      {language === "en" ? "My CVs" : "Omat CV:t"}
                    </span>
                    {recentCVs.length > 0 && (
                      <span className="bg-indigo-200 px-2 py-1 rounded-full text-xs font-bold">
                        {recentCVs.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-5 w-5 text-indigo-600" />
                </div>
              </Link>

              {loadingRecent ? (
                <div className="text-center py-8">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : recentCVs.length > 0 ? (
                <div className="space-y-2">
                  {recentCVs.map((cv: any) => (
                    <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                      <div className="p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-indigo-300">
                        <p className="font-semibold text-sm text-gray-900">
                          {cv.content?.cv_data?.name ||
                            (language === "en" ? "Unnamed CV" : "Nimetön CV")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(cv.created_at).toLocaleDateString(
                            language === "en" ? "en-US" : "fi-FI"
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">
                    {language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}
                  </p>
                  {canCreateCV && (
                    <Link href="/create-cv">
                      <Button variant="outline">
                        {language === "en" ? "Create First" : "Luo Ensimmäinen"}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Cover Letters Section */}
            <div>
              {isPremium ? (
                <>
                  <Link href="/my-cover-letters">
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all mb-4 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <FileInput className="h-5 w-5 text-green-600" />
                        <span className="font-bold text-gray-900">
                          {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                        </span>
                        {recentCoverLetters.length > 0 && (
                          <span className="bg-green-200 px-2 py-1 rounded-full text-xs font-bold">
                            {recentCoverLetters.length}
                          </span>
                        )}
                      </div>
                      <ChevronRight className="h-5 w-5 text-green-600" />
                    </div>
                  </Link>

                  {loadingRecent ? (
                    <div className="text-center py-8">
                      <div className="animate-spin h-8 w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                    </div>
                  ) : recentCoverLetters.length > 0 ? (
                    <div className="space-y-2">
                      {recentCoverLetters.map((letter: any) => (
                        <Link
                          key={letter.id}
                          href={`/edit-cover-letter/${letter.id}`}
                        >
                          <div className="p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-green-300">
                            <p className="font-semibold text-sm text-gray-900">
                              {letter.title ||
                                (language === "en" ? "Unnamed" : "Nimetön")}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(letter.created_at).toLocaleDateString(
                                language === "en" ? "en-US" : "fi-FI"
                              )}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileInput className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500 mb-4">
                        {language === "en"
                          ? "No cover letters"
                          : "Ei hakukirjeitä"}
                      </p>
                      <Link href="/create-cover-letter">
                        <Button variant="outline">
                          {language === "en"
                            ? "Create First"
                            : "Luo Ensimmäinen"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-bold text-gray-900 mb-2">
                    {language === "en" ? "Premium Feature" : "Premium-ominaisuus"}
                  </p>
                  <p className="text-gray-500 mb-4 text-sm">
                    {language === "en"
                      ? "Cover letters for Premium users"
                      : "Hakukirjeet Premium-käyttäjille"}
                  </p>
                  <Link href="/pricing">
                    <Button variant="outline">
                      <Crown className="w-4 h-4 mr-2" />
                      {language === "en" ? "Upgrade" : "Päivitä"}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 border-t border-indigo-100 bg-white/70 backdrop-blur-xl mt-12">
        <p className="text-sm">
          © {new Date().getFullYear()} HappyApplaid.{" "}
          {language === "en"
            ? "All rights reserved."
            : "Kaikki oikeudet pidätetään."}
        </p>
      </footer>
    </div>
  );
}