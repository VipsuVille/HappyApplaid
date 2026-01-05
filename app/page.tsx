/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSubscription } from "@/context/SubscriptionContext";
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
  ChevronRight,
  Shield,
  Brain,
  FileInput,
  FileEdit,
  Clock,
  CreditCard,
  Ban,
  MessageCircle,
  Database,
  Lightbulb,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import HowItWorksTimeline from "@/components/howitworks";

/* =====================================================
   TYPES
===================================================== */

interface SubscriptionStatus {
  plan_type: "free" | "basic" | "semi-pro" | "pro";
  is_premium: boolean;
  has_used_free_cv: boolean;
  tokens: number;
  cv_count: number;
  can_create_cv: boolean;
  message: string;
}

/* =====================================================
   PAGE
===================================================== */

export default function Home() {
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [recentCVs, setRecentCVs] = useState<any[]>([]);
  const [recentCoverLetters, setRecentCoverLetters] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { subscription, isLoading: subLoading } = useSubscription();
  const tier = subscription?.tier ?? "free";
  const isActive = subscription?.active === true;
  const hasUsedFreeCv = subscription?.has_used_free_cv || false;
  const canCreateCV = subscription?.can_create_cv || false;
  const isPaid = isActive && tier !== "free";

  const { language } = useLanguage();
  const { isLoaded, isSignedIn, user } = useUser();
  const { tokens } = useTokens();
  const displayName = user?.firstName || null;

  /* =====================================================
     FIRST VISIT CHECK
  ===================================================== */

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
        if (isNewUser) setShowWelcome(true);

        setProfileCompleted(hasProfile);
      } catch (error) {
        console.error("Error checking first visit:", error);
        setProfileCompleted(false);
      }
    };

    if (isLoaded && isSignedIn) {
      checkFirstVisit();
    }
  }, [isLoaded, isSignedIn, user?.id]);

  /* =====================================================
     WELCOME HANDLERS
  ===================================================== */

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

  /* =====================================================
     LOADING STATES
  ===================================================== */

  if (!isLoaded || subLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black flex items-center justify-center">
        <div className="backdrop-blur-xl bg-gray-900/60 border border-gray-700/50 rounded-2xl shadow-2xl p-8 text-center">
          <div className="text-lg font-bold text-gray-100">
            {language === "en" ? "Loading..." : "Ladataan..."}
          </div>
        </div>
      </div>
    );
  }

  /* =====================================================
     WELCOME / ONBOARDING
  ===================================================== */

  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <WelcomeModal
          isOpen
          onComplete={handleWelcomeComplete}
          onSkip={handleWelcomeSkip}
          initialEmail={user?.emailAddresses?.[0]?.emailAddress}
        />
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
        <OnboardingSteps
          isOpen
          onComplete={handleOnboardingComplete}
          currentUserName={user?.firstName || "käyttäjä"}
        />
      </div>
    );
  }
  /* =====================================================
     LOAD RECENT DOCUMENTS
  ===================================================== */

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

        if (tokens > 0 || isPaid) {
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

    loadRecentDocuments();
  }, [isSignedIn, user?.id, profileCompleted, tokens, isPaid]);

  /* =====================================================
     LANDING PAGE (LOGGED OUT)
  ===================================================== */

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-900/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[520px] h-[520px] bg-orange-900/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
          {/* HERO */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-[2.5rem] shadow-2xl p-10 md:p-16 text-center mb-20">
            <div className="inline-flex items-center gap-2 px-6 py-2 bg-gray-800/60 rounded-full border border-orange-800/40 mb-6">
              <Sparkles className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-orange-600">
                {language === "en"
                  ? "Not Just AI. Your Digital Twin."
                  : "Ei vain AI – vaan digitaalinen kaksosesi"}
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              <span className="bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent">
                {language === "en" ? "Create Your Profile Once" : "Luo profiili kerran"}
              </span>
              <br />
              <span className="text-gray-100">
                {language === "en"
                  ? "Get Personalized Applications Instantly"
                  : "Saa personoidut hakemukset hetkessä"}
              </span>
            </h1>

            <p className="max-w-3xl mx-auto text-lg text-gray-300 mb-10">
              {language === "en"
                ? "Fill your profile once. Our AI learns how YOU think, work and communicate – and writes applications in your voice."
                : "Täytä profiilisi kerran. AI oppii ajattelutapasi, työskentelytyylisi ja äänesi – ja kirjoittaa hakemukset puolestasi."}
            </p>

            <HowItWorksTimeline />

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="px-8 py-4 bg-gradient-to-r from-orange-700 to-orange-900 text-white font-bold rounded-xl shadow-xl hover:scale-105 transition">
                    <Sparkles className="w-5 h-5 mr-2 inline" />
                    {language === "en" ? "Start Free" : "Aloita ilmaiseksi"}
                  </Button>
                </SignInButton>
              </SignedOut>

              <Button
                variant="outline"
                onClick={() =>
                  document
                    .getElementById("digital-twin")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="px-8 py-4 bg-gray-800/60 border border-orange-800/40 text-orange-600 font-bold rounded-xl hover:bg-gray-700/60"
              >
                {language === "en" ? "Learn More" : "Lue lisää"}
              </Button>
            </div>
          </div>

          {/* DIGITAL TWIN */}
          <div
            id="digital-twin"
            className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-[2.5rem] p-12 text-center border border-gray-800/60 shadow-2xl"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-full border border-gray-700/50 mb-6">
              <Brain className="w-5 h-5 text-orange-600" />
              <span className="font-bold text-gray-300 uppercase text-sm">
                {language === "en" ? "Your Digital Twin" : "Digitaalinen kaksosesi"}
              </span>
            </div>

            <h2 className="text-3xl md:text-5xl font-extrabold mb-6">
              {language === "en"
                ? "Stop Sounding Like Everyone Else"
                : "Lopeta kuulostamasta samalta kuin kaikki muut"}
            </h2>

            <p className="max-w-3xl mx-auto text-gray-300 text-lg mb-10">
              {language === "en"
                ? "Generic AI writes generic text. Our system understands your psychology, values and strengths — and writes like YOU."
                : "Geneerinen AI tuottaa geneeristä tekstiä. Meidän järjestelmämme ymmärtää psykologiasi, arvosi ja vahvuutesi – ja kirjoittaa kuin sinä."}
            </p>

            <div className="grid md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
              <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50">
                <h3 className="font-bold mb-2 flex items-center gap-2">
                  <X className="text-red-500 w-5 h-5" />
                  Generic AI
                </h3>
                <p className="text-gray-400 italic text-sm">
                  “I am a motivated individual seeking new opportunities…”
                </p>
              </div>

              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/20 p-6 rounded-2xl border border-green-800/40">
                <h3 className="font-bold mb-2 flex items-center gap-2 text-green-400">
                  <Check className="w-5 h-5" />
                  HappyApplaid
                </h3>
                <p className="text-gray-200 italic text-sm">
                  “My analytical problem-solving style helped me lead the X project under pressure…”
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

    /* =====================================================
     DASHBOARD (LOGGED IN)
  ===================================================== */

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black text-gray-100 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-orange-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[520px] h-[520px] bg-orange-900/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24">
        {/* DASHBOARD HERO */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-[2.5rem] shadow-2xl p-10 md:p-14 mb-16">
          <div className="flex flex-col md:flex-row justify-between gap-10 items-start md:items-center">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
                {language === "en"
                  ? `Welcome back${displayName ? `, ${displayName}` : ""}`
                  : `Tervetuloa takaisin${displayName ? `, ${displayName}` : ""}`}
              </h1>

              <p className="text-gray-300 max-w-xl">
                {language === "en"
                  ? "Your digital twin is ready. Create tailored applications in seconds."
                  : "Digitaalinen kaksosesi on valmis. Luo räätälöityjä hakemuksia sekunneissa."}
              </p>
            </div>

            <div className="flex gap-3 flex-wrap">
              <Link href="/create/cv">
                <Button
                  disabled={!canCreateCV}
                  className="px-6 py-3 bg-gradient-to-r from-orange-700 to-orange-900 text-white font-bold rounded-xl shadow-lg hover:scale-105 transition"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  {language === "en" ? "Create CV" : "Luo CV"}
                </Button>
              </Link>

              <Link href="/create/cover-letter">
                <Button
                  disabled={!isPaid && tokens === 0}
                  variant="outline"
                  className="px-6 py-3 bg-gray-800/60 border border-orange-800/40 text-orange-600 font-bold rounded-xl hover:bg-gray-700/60"
                >
                  <FileEdit className="w-5 h-5 mr-2" />
                  {language === "en"
                    ? "Create Cover Letter"
                    : "Luo hakemuskirje"}
                </Button>
              </Link>
            </div>
          </div>

          {/* USAGE INFO */}
          <div className="mt-8 grid sm:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">
                {language === "en" ? "Plan" : "Tilaus"}
              </p>
              <p className="font-bold text-lg capitalize">{tier}</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">
                {language === "en" ? "Tokens" : "Tokenit"}
              </p>
              <p className="font-bold text-lg">{tokens}</p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/50">
              <p className="text-sm text-gray-400 mb-1">
                {language === "en" ? "Profile status" : "Profiilin tila"}
              </p>
              <p className="font-bold text-lg">
                {profileCompleted ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    {language === "en" ? "Complete" : "Valmis"}
                  </span>
                ) : (
                  <span className="text-yellow-400">
                    {language === "en" ? "Incomplete" : "Kesken"}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
        {/* RECENT DOCUMENTS */}
        <div className="grid md:grid-cols-2 gap-10 mb-20">
          {/* RECENT CVS */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Files className="w-5 h-5 text-orange-600" />
              {language === "en" ? "Recent CVs" : "Viimeisimmät CV:t"}
            </h2>

            {recentCVs.length === 0 ? (
              <div className="text-gray-400 text-sm italic">
                {language === "en"
                  ? "No CVs created yet."
                  : "Et ole vielä luonut CV:tä."}
              </div>
            ) : (
              <ul className="space-y-3">
                {recentCVs.map((cv) => (
                  <li
                    key={cv.id}
                    className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700/50"
                  >
                    <span className="font-medium truncate">
                      {cv.title || "Untitled CV"}
                    </span>
                    <Link href={`/cv/${cv.id}`}>
                      <Button size="sm" variant="ghost">
                        <ChevronRight />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* RECENT COVER LETTERS */}
          <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-700/50 rounded-3xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-orange-600" />
              {language === "en"
                ? "Recent Cover Letters"
                : "Viimeisimmät hakemuskirjeet"}
            </h2>

            {!isPaid && tokens === 0 ? (
              <div className="text-gray-400 text-sm italic">
                {language === "en"
                  ? "Upgrade to create cover letters."
                  : "Päivitä tilaus luodaksesi hakemuskirjeitä."}
              </div>
            ) : recentCoverLetters.length === 0 ? (
              <div className="text-gray-400 text-sm italic">
                {language === "en"
                  ? "No cover letters yet."
                  : "Ei vielä hakemuskirjeitä."}
              </div>
            ) : (
              <ul className="space-y-3">
                {recentCoverLetters.map((letter) => (
                  <li
                    key={letter.id}
                    className="flex items-center justify-between bg-gray-800/50 p-4 rounded-xl border border-gray-700/50"
                  >
                    <span className="font-medium truncate">
                      {letter.title || "Cover Letter"}
                    </span>
                    <Link href={`/cover-letter/${letter.id}`}>
                      <Button size="sm" variant="ghost">
                        <ChevronRight />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* UPGRADE CTA */}
        {!isPaid && (
          <div className="bg-gradient-to-r from-orange-900/40 to-orange-800/40 border border-orange-800/40 rounded-[2.5rem] p-10 text-center shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">
              {language === "en"
                ? "Unlock Your Full Digital Twin"
                : "Avaa koko digitaalinen kaksosesi"}
            </h2>

            <p className="text-gray-200 max-w-2xl mx-auto mb-8">
              {language === "en"
                ? "Unlimited cover letters, smarter AI, and HR-level expertise built in."
                : "Rajattomat hakemuskirjeet, älykkäämpi AI ja HR-tason osaaminen."}
            </p>

            <Link href="/pricing">
              <Button className="px-8 py-4 bg-black/60 border border-white/20 text-white font-bold rounded-xl hover:scale-105 transition">
                <Crown className="w-5 h-5 mr-2" />
                {language === "en" ? "Upgrade to Pro" : "Päivitä Pro-versioon"}
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-gray-800/60 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} HappyApplaid ·{" "}
        {language === "en"
          ? "Your Digital Twin for Job Applications"
          : "Digitaalinen kaksosesi työnhakuun"}
      </footer>
    </div>
  );
}
