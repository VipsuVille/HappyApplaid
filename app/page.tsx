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
  ChevronRight,
  Shield,
  Brain,
  FileInput,
  FileEdit,
  Clock,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import SmartHeader from "@/components/ui/smartHeader";

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
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(
    null
  );
  const [recentCVs, setRecentCVs] = useState<any[]>([]);
  const [recentCoverLetters, setRecentCoverLetters] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [freemiumStatus, setFreemiumStatus] =
    useState<SubscriptionStatus | null>(null);
  const [freemiumLoading, setFreemiumLoading] = useState(true);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);

  const { language } = useLanguage();
  const { isLoaded, isSignedIn, user } = useUser();
  const { tokens } = useTokens();

  const displayName = user?.firstName || null;

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
              HERO SECTION - REALISTINEN LUPAUS
              =================================== */}
          <div className="mb-16">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 md:p-12 lg:p-16 backdrop-saturate-150 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>

              <div className="relative z-10 text-center">
                {/* Trust Badge */}
                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/90 backdrop-blur-sm rounded-full border-2 border-indigo-300 shadow-xl mb-4 sm:mb-6">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600" />
                  <span className="font-bold text-indigo-800 text-sm sm:text-base">
                    {language === "en"
                      ? "90% of Work Done For You"
                      : "90% Työstä Tehty Puolestasi"}
                  </span>
                </div>

                {/* Main Hook */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {language === "en"
                      ? "Create Your Profile Once,"
                      : "Luo Profiili Kerran,"}
                  </span>
                  <br />
                  <span className="text-gray-900">
                    {language === "en"
                      ? "Get Personalized CVs & Cover Letters"
                      : "Saa Personoituja CV:itä & Hakukirjeitä"}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {language === "en" ? "In Minutes" : "Minuuteissa"}
                  </span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                  {language === "en"
                    ? "Start for free with zero risk. We just need you to fill your profile so our AI knows you. You get 1 free CV and Cover Letter (Basic features) to try it out."
                    : "Aloita ilmaiseksi nollariskillä. Sinun tarvitsee vain täyttää profiilisi, jotta AI oppii tuntemaan sinut. Saat 1 ilmaisen CV:n ja hakukirjeen (Basic-ominaisuudet) kokeiltavaksi."}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
                        <Sparkles className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
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
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-xl font-bold text-base sm:text-lg border-2 border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    {language === "en"
                      ? "See How It Works"
                      : "Katso Miten Se Toimii"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto px-4">
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "No credit card required"
                        : "Ei vaadi luottokorttia"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "1 Free CV + Letter (Basic)"
                        : "1 Ilmainen CV + Kirje (Basic)"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "No commitment"
                        : "Ei sitoutumista"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================
              HOW IT WORKS
              =================================== */}
          <div
            id="how-it-works"
            className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-indigo-200 shadow-2xl mb-12 sm:mb-16"
          >
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-4">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="font-bold text-indigo-800 text-sm sm:text-base">
                  {language === "en" ? "How It Works" : "Miten Se Toimii"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en"
                  ? "3 Simple Steps to Your Perfect Application"
                  : "3 Yksinkertaista Askelta Täydelliseen Hakemukseen"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto px-4">
                {language === "en"
                  ? "We do 90% of the work. You just review and customize."
                  : "Me teemme 90% työstä. Sinä vain tarkistat ja muokkaat."}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {/* Step 1 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 sm:p-8 border-2 border-indigo-200 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-4 sm:mb-6">
                  1
                </div>
                <User className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3">
                  {language === "en"
                    ? "Create Profile (Once)"
                    : "Luo Profiili (Kerran)"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {language === "en"
                    ? "Fill in your work experience, education, and skills. This is the hardest part - but you only do it once!"
                    : "Täytä työkokemuksesi, koulutuksesi ja taitosi. Tämä on työläin vaihe - mutta teet sen vain kerran!"}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs sm:text-sm">
                  <p className="font-semibold text-indigo-900">
                    ⏱️{" "}
                    {language === "en" ? "~5-10 minutes" : "~5-10 minuuttia"}
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 sm:p-8 border-2 border-green-200 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-4 sm:mb-6">
                  2
                </div>
                <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3">
                  {language === "en"
                    ? "AI Generates (Automatically)"
                    : "AI Generoi (Automaattisesti)"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {language === "en"
                    ? "Paste job description → AI creates personalized CV and cover letter based on your profile."
                    : "Liitä työpaikkailmoitus → AI luo personoidun CV:n ja hakukirjeen profiilisi perusteella."}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs sm:text-sm">
                  <p className="font-semibold text-green-900">
                    ⚡{" "}
                    {language === "en" ? "~30-60 seconds" : "~30-60 sekuntia"}
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 sm:p-8 border-2 border-amber-200 text-center">
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl mx-auto mb-4 sm:mb-6">
                  3
                </div>
                <FileEdit className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600 mx-auto mb-3 sm:mb-4" />
                <h3 className="font-bold text-lg sm:text-xl mb-2 sm:mb-3">
                  {language === "en" ? "Review & Send" : "Tarkista & Lähetä"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {language === "en"
                    ? "Quick review, small tweaks if needed, then download PDF. That's it - you're ready to apply!"
                    : "Nopea tarkistus, pienet muutokset tarvittaessa, sitten lataa PDF. Siinä kaikki - olet valmis hakemaan!"}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs sm:text-sm">
                  <p className="font-semibold text-amber-900">
                    👀{" "}
                    {language === "en" ? "~2-3 minutes" : "~2-3 minuuttia"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 rounded-2xl p-4 sm:p-6 text-center">
              <p className="text-base sm:text-lg font-bold text-indigo-900 mb-2">
                ⏱️{" "}
                {language === "en"
                  ? "Total Time: ~7-15 minutes per application"
                  : "Kokonaisaika: ~7-15 minuuttia per hakemus"}
              </p>
              <p className="text-xs sm:text-sm text-indigo-700">
                {language === "en"
                  ? "(After profile is created - then just 2-3 minutes per new application!)"
                  : "(Kun profiili on luotu - sitten vain 2-3 minuuttia per uusi hakemus!)"}
              </p>
            </div>
          </div>

          {/* ===================================
              MIKSI ATS-OPTIMOINTI ON TÄRKEÄÄ
              =================================== */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-amber-300 shadow-2xl mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-4">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <span className="font-bold text-amber-800 text-sm sm:text-base">
                  {language === "en"
                    ? "Why ATS Optimization Matters"
                    : "Miksi ATS-Optimointi On Tärkeää"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en"
                  ? "98% of Fortune 500 Companies Use ATS"
                  : "98% Fortune 500 -yrityksistä Käyttää ATS:ää"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto px-4">
                {language === "en"
                  ? "If your CV isn't optimized for big company portals, it might never reach human eyes."
                  : "Jos CV:si ei ole optimoitu suuryritysten portaaleihin, se ei välttämättä koskaan päädy ihmissilmille."}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">
                  98%
                </div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Fortune 500 companies use ATS systems"
                    : "Fortune 500 -yrityksistä käyttää ATS-järjestelmiä"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">
                  75%
                </div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Of all recruiters use ATS or tech-driven tools"
                    : "Rekrytoijista käyttää ATS:ää tai teknisiä työkaluja"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">
                  250+
                </div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Average applications per corporate job posting"
                    : "Keskimääräinen määrä hakemuksia per yritystyöpaikka"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-300">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-center text-gray-900">
                {language === "en"
                  ? "Choose the Right Tool for the Job:"
                  : "Valitse Oikea Työkalu Työnhakuun:"}
              </h3>
              <div className="space-y-3 text-sm sm:text-base">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-gray-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">
                    1
                  </div>
                  <p className="text-gray-700">
                    <strong>{language === "en" ? "Basic Plan" : "Basic-taso"}:</strong>{" "}
                    {language === "en"
                      ? "Creates standard job-specific letters. Perfect for emailing smaller companies directly or introducing yourself."
                      : "Luo tavallisia, työpaikkakohtaisia kirjeitä. Täydellinen sähköpostitse lähetettäviin hakemuksiin tai pienille yrityksille."}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">
                    2
                  </div>
                  <p className="text-gray-700">
                    <strong>{language === "en" ? "Semi-Pro & Pro" : "Semi-Pro & Pro"}:</strong>{" "}
                    {language === "en"
                      ? "Adds the ATS optimization layer. Essential when applying through large corporate portals (Workday, Taleo, etc.)."
                      : "Lisää ATS-optimointikerroksen. Välttämätön, kun haet suurten yritysten portaalien kautta (Workday, Taleo, jne.)."}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">
                    3
                  </div>
                  <p className="text-gray-700">
                    <strong>{language === "en" ? "Pro (RAG)" : "Pro (RAG)"}:</strong>{" "}
                    {language === "en"
                      ? "The expert touch. Integrates deep industry knowledge into your text for maximum impact."
                      : "Eksperttitaso. Integroi syvällistä toimialatietoa tekstiisi maksimaalisen vaikutuksen saamiseksi."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ===================================
              OMINAISUUDET - Mitä saat
              =================================== */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-purple-200 shadow-2xl mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en" ? "What You Get" : "Mitä Saat"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto px-4">
                {language === "en"
                  ? "AI-powered tools that save you hours of work"
                  : "AI-työkalut jotka säästävät tunteja työaikaa"}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {/* Feature 1 - PERSONALITY (Emphasized) */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-indigo-400 shadow-xl transform hover:scale-105 transition-all">
                <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2 text-indigo-900">
                  {language === "en"
                    ? "Personality-Based Writing"
                    : "Persoonallisuuspohjainen Kirjoitus"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Our unique engine analyzes your psychological profile and writes in YOUR voice - not like a generic robot. This is our core difference."
                    : "Ainutlaatuinen moottorimme analysoi psykologisen profiilisi ja kirjoittaa SINUN äänelläsi - ei kuin geneerinen robotti. Tämä on tärkein erottuvuustekijämme."}
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-green-200 shadow-lg">
                <Zap className="w-10 h-10 sm:w-12 sm:h-12 text-green-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2">
                  {language === "en" ? "ATS Optimization" : "ATS-Optimointi"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Semi-Pro & Pro: Automatic keyword matching for applicant tracking systems"
                    : "Semi-Pro & Pro: Automaattinen avainsanojen sovitus hakujärjestelmiin"}
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-amber-200 shadow-lg">
                <Target className="w-10 h-10 sm:w-12 sm:h-12 text-amber-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2">
                  {language === "en"
                    ? "Job-Specific Content"
                    : "Työkohtainen Sisältö"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Each application tailored to the specific job description"
                    : "Jokainen hakemus räätälöity juuri kyseiseen työpaikkaan"}
                </p>
              </div>

              {/* Feature 4 - COMING SOON */}
              <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-gray-300 shadow-lg relative overflow-hidden group">
                {/* Coming Soon Badge */}
                <div className="absolute top-0 right-0 bg-gray-800 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-md z-10">
                   {language === "en" ? "COMING SOON" : "TULOSSA PIAN"}
                </div>
                
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mb-3 sm:mb-4 group-hover:text-purple-500 transition-colors" />
                <h3 className="font-bold text-base sm:text-lg mb-2 text-gray-800">
                  {language === "en"
                    ? "Multiple Formats"
                    : "Useita Formaatteja"}
                </h3>
                <p className="text-sm sm:text-base text-gray-600">
                  {language === "en"
                    ? "Professional CV templates + cover letters in PDF format"
                    : "Ammattimaiset CV-pohjat + hakukirjeet PDF-muodossa"}
                </p>
              </div>

              {/* Feature 5 */}
              <div className="bg-gradient-to-br from-yellow-100 to-amber-100 rounded-2xl p-4 sm:p-6 border-2 border-yellow-400 shadow-lg relative">
                <Crown className="w-10 h-10 sm:w-12 sm:h-12 text-yellow-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2">
                  {language === "en" ? "Expert Knowledge" : "Eksperttitieto"}
                  <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full border border-yellow-400">
                    PRO
                  </span>
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "RAG: AI reads recruitment expert articles before writing"
                    : "RAG: AI lukee rekrytointieksperttien artikkeleita ennen kirjoittamista"}
                </p>
              </div>

              {/* Feature 6 */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-blue-200 shadow-lg">
                <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-blue-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2">
                  {language === "en" ? "Quality Checks" : "Laatutarkistukset"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "AI verifies content matches your real experience and skills"
                    : "AI varmistaa että sisältö vastaa todellista kokemustasi ja taitojasi"}
                </p>
              </div>
            </div>
          </div>

          {/* ===================================
              PRICING - YKSINKERTAINEN
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-indigo-200 shadow-2xl mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en"
                  ? "Simple, Transparent Pricing"
                  : "Yksinkertainen, Läpinäkyvä Hinnoittelu"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 px-4">
                {language === "en"
                  ? "Start free - upgrade when you need more"
                  : "Aloita ilmaiseksi - päivitä kun tarvitset enemmän"}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Free */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === "en" ? "Free" : "Ilmainen"}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">
                    {language === "en" ? "/month" : "/kk"}
                  </span>
                </div>
                <div className="mb-4 bg-gray-100 p-2 rounded text-xs text-gray-600 text-center font-medium">
                  {language === "en" ? "Includes Basic Features" : "Sisältää Basic-ominaisuudet"}
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en" ? "1 Free CV" : "1 Ilmainen CV"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en"
                        ? "1 Free Cover Letter"
                        : "1 Ilmainen Hakukirje"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-500">
                      {language === "en" ? "No ATS Optimization" : "Ei ATS-optimointia"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en" ? "Good for direct email" : "Hyvä sähköpostihakuun"}
                    </span>
                  </li>
                </ul>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700">
                      {language === "en" ? "Try Now (Risk Free)" : "Kokeile Nyt (Riskitön)"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>

              {/* Semi-Pro - SUOSITUIN */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-4 sm:p-6 border-2 border-yellow-400 shadow-2xl relative scale-105">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {language === "en" ? "Most Popular" : "Suosituin"}
                </div>
                <h3 className="text-xl sm:text-2xl font-bold mb-2">Semi-Pro</h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">12€</span>
                  <span className="text-gray-600 text-sm">
                    {language === "en" ? "/month" : "/kk"}
                  </span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en" ? "Unlimited CVs" : "Rajattomat CV:t"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en"
                        ? "Unlimited cover letters"
                        : "Rajattomat hakukirjeet"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold">
                      {language === "en" ? "ATS optimization" : "ATS-optimointi"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en" ? "Essential for big firms" : "Välttämätön isoihin firmoihin"}
                    </span>
                  </li>
                </ul>
                <Link href="/pricing">
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                    {language === "en" ? "Choose Plan" : "Valitse"}
                  </Button>
                </Link>
              </div>

              {/* Pro */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-purple-300 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2 flex items-center gap-2">
                  Pro
                  <Crown className="w-5 h-5 text-purple-600" />
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">25€</span>
                  <span className="text-gray-600 text-sm">
                    {language === "en" ? "/month" : "/kk"}
                  </span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en"
                        ? "Everything in Semi-Pro"
                        : "Kaikki Semi-Prossa"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold">
                      {language === "en"
                        ? "RAG: Expert knowledge"
                        : "RAG: Eksperttitieto"}
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>
                      {language === "en"
                        ? "Maximum Impact"
                        : "Maksimaalinen Vaikutus"}
                    </span>
                  </li>
                </ul>
                <Link href="/pricing">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700">
                    {language === "en" ? "Choose Plan" : "Valitse"}
                  </Button>
                </Link>
              </div>
            </div>

            <p className="text-center text-xs sm:text-sm text-gray-600 mt-6 sm:mt-8 px-4">
              {language === "en"
                ? "All plans: Cancel anytime • No credit card required for free plan"
                : "Kaikki paketit: Peruuta milloin vain • Ei luottokorttia ilmaisessa"}
            </p>
          </div>

          {/* ===================================
              FINAL CTA
              =================================== */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6 px-2">
              {language === "en"
                ? "Ready to Save Hours on Job Applications?"
                : "Valmis Säästämään Tunteja Työnhaussa?"}
            </h2>
            <p className="text-base sm:text-lg md:text-2xl mb-6 sm:mb-8 text-indigo-100 max-w-3xl mx-auto px-4">
              {language === "en"
                ? "Create your profile once, get personalized applications in minutes"
                : "Luo profiili kerran, saa personoituja hakemuksia minuuteissa"}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8 px-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all">
                    <Sparkles className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {language === "en"
                      ? "Start Free Now"
                      : "Aloita Ilmaiseksi"}
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-8 text-xs sm:text-sm text-indigo-100 max-w-2xl mx-auto px-4">
              <div className="flex items-center justify-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>
                  {language === "en" ? "No credit card" : "Ei luottokorttia"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>
                  {language === "en"
                    ? "Cancel anytime"
                    : "Peruuta milloin vain"}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 bg-white/10 px-3 py-2 rounded-lg backdrop-blur-sm">
                <Check className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span>{language === "en" ? "5min setup" : "5min setup"}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-8 sm:py-12 text-center text-gray-600 border-t border-indigo-100 bg-white/70 backdrop-blur-xl mt-12 sm:mt-16">
            <div className="max-w-7xl mx-auto px-4">
              <div className="text-xs sm:text-sm">
                © {new Date().getFullYear()} HappyApplaid.{" "}
                {language === "en"
                  ? "All rights reserved."
                  : "Kaikki oikeudet pidätetään."}
              </div>
            </div>
          </footer>
        </div>
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
        <div className="mb-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {language === "en"
              ? `Welcome${displayName ? `, ${displayName}` : ""}!`
              : `Tervetuloa${displayName ? `, ${displayName}` : ""}!`}
          </h1>
          <p className="text-gray-700 text-base sm:text-lg">
            {currentTier === "free"
              ? language === "en"
                ? "Free user - 1 free CV + 1 free cover letter (Basic)"
                : "Ilmainen käyttäjä - 1 ilmainen CV + 1 ilmainen hakukirje (Basic)"
              : `${currentTier.toUpperCase()}-${
                  language === "en" ? "user" : "käyttäjä"
                }`}
          </p>
        </div>

        {/* Upgrade Prompt for Free Users */}
        {!isPremium && hasUsedFreeCv && (
          <div className="mb-8 backdrop-blur-xl bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-3xl shadow-2xl p-6 sm:p-8">
            <Crown className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-600 mx-auto mb-4" />
            <h2 className="text-xl sm:text-2xl font-bold text-center text-gray-900 mb-4">
              {language === "en"
                ? "You've used your free documents!"
                : "Olet käyttänyt ilmaiset dokumentit!"}
            </h2>
            <p className="text-center text-gray-700 mb-6 text-sm sm:text-base">
              {language === "en"
                ? "Upgrade to create unlimited CVs and cover letters with ATS optimization"
                : "Päivitä luodaksesi rajattomasti CV:itä ja hakukirjeitä ATS-optimoinnilla"}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {/* Create CV Card */}
          {canCreateCV ? (
            <Link href="/create-cv">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-600 mb-4" />
                <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">
                  {isPremium
                    ? language === "en"
                      ? "Unlimited ATS-optimized CVs"
                      : "Rajattomat ATS-optimoidut CV:t"
                    : language === "en"
                    ? "Free personality-driven CV (Basic)"
                    : "Ilmainen persoonallisuusvetoinen CV (Basic)"}
                </p>
                <Button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </Button>
              </div>
            </Link>
          ) : (
            <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl shadow-xl p-6 opacity-60">
              <Lock className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-4" />
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
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
          <Link href="/create-cover-letter">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <FileInput className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mb-4" />
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                {language === "en" ? "Create Cover Letter" : "Luo Hakukirje"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
                {isPremium
                  ? language === "en"
                    ? "Unlimited ATS-optimized letters"
                    : "Rajattomat ATS-optimoidut kirjeet"
                  : language === "en"
                  ? "1 free cover letter (Basic)"
                  : "1 ilmainen hakukirje (Basic)"}
              </p>
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                {language === "en" ? "Create Letter" : "Luo Kirje"}
              </Button>
            </div>
          </Link>

          {/* Edit Profile Card */}
          <Link href="/profile">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <User className="h-10 w-10 sm:h-12 sm:w-12 text-amber-600 mb-4" />
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
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
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 text-gray-900">
            <Files className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
            {language === "en" ? "My Documents" : "Omat Dokumentit"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            {/* CVs Section */}
            <div>
              <Link href="/my-cvs">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-all mb-3 sm:mb-4 cursor-pointer">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {language === "en" ? "My CVs" : "Omat CV:t"}
                    </span>
                    {recentCVs.length > 0 && (
                      <span className="bg-indigo-200 px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                        {recentCVs.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                </div>
              </Link>

              {loadingRecent ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : recentCVs.length > 0 ? (
                <div className="space-y-2">
                  {recentCVs.map((cv: any) => (
                    <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                      <div className="p-3 sm:p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-indigo-300">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                          {cv.content?.personalInfo?.name ||
                            cv.title ||
                            (language === "en" ? "Unnamed CV" : "Nimetön CV")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(cv.created_at).toLocaleDateString(
                            language === "en" ? "en-US" : "fi-FI",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
                    {language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}
                  </p>
                  {canCreateCV && (
                    <Link href="/create-cv">
                      <Button variant="outline" size="sm">
                        {language === "en"
                          ? "Create First CV"
                          : "Luo Ensimmäinen CV"}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Cover Letters Section */}
            <div>
              <Link href="/my-cover-letters">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-all mb-3 sm:mb-4 cursor-pointer">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileInput className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                    </span>
                    {recentCoverLetters.length > 0 && (
                      <span className="bg-green-200 px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                        {recentCoverLetters.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                </div>
              </Link>

              {loadingRecent ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : recentCoverLetters.length > 0 ? (
                <div className="space-y-2">
                  {recentCoverLetters.map((letter: any) => (
                    <Link
                      key={letter.id}
                      href={`/edit-cover-letter/${letter.id}`}
                    >
                      <div className="p-3 sm:p-4 bg-white rounded-xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-green-300">
                        <p className="font-semibold text-xs sm:text-sm text-gray-900 truncate">
                          {letter.title ||
                            letter.job_title ||
                            (language === "en"
                              ? "Unnamed Cover Letter"
                              : "Nimetön Hakukirje")}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(letter.created_at).toLocaleDateString(
                            language === "en" ? "en-US" : "fi-FI",
                            {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            }
                          )}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 sm:py-8">
                  <FileInput className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-2 sm:mb-3" />
                  <p className="text-sm sm:text-base text-gray-500 mb-3 sm:mb-4">
                    {language === "en"
                      ? "No cover letters yet"
                      : "Ei vielä hakukirjeitä"}
                  </p>
                  <Link href="/create-cover-letter">
                    <Button variant="outline" size="sm">
                      {language === "en"
                        ? "Create First Letter"
                        : "Luo Ensimmäinen Kirje"}
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