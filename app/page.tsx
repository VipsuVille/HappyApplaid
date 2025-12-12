/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, SignInButton, SignedOut } from "@clerk/nextjs";
import {
  FileText, User, Files, Check, Sparkles, Target, Zap,
  Crown, Lock, X, ChevronRight, Shield, Brain, 
  FileInput, FileEdit
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
        const hasSeenOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`);
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

  const handleWelcomeComplete = async (data: { name: string; email: string; useClerkEmail: boolean }) => {
    try {
      const response = await fetch("/api/save-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile: {
            name: data.name,
            email: data.email,
            education: [{ id: 1, school: "", degree: "", year: "", isOngoing: false }],
            workExperience: [{ id: 1, company: "", position: "", duration: "", description: "" }],
            languages: [{ id: 1, language: "", level: "Hyvä" }],
            workingStyle: "", problemSolving: "", energySources: "", uniqueStrength: "",
            learningStyle: "", teamRole: "", valuesExample: "", superpower: "", skills: "",
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
    if (isLoaded && isSignedIn && profileCompleted === true && !showWelcome && !showOnboarding) {
      loadRecentDocuments();
    }
  }, [isSignedIn, user?.id, profileCompleted, tokens, freemiumStatus, isLoaded, showWelcome, showOnboarding]);

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
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
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
                    {language === "en" ? "90% of Work Done For You" : "90% Työstä Tehty Puolestasi"}
                  </span>
                </div>

                {/* Main Hook */}
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {language === "en" ? "Create Your Profile Once," : "Luo Profiili Kerran,"}
                  </span>
                  <br />
                  <span className="text-gray-900">
                    {language === "en" ? "Get Personalized CVs & Cover Letters" : "Saa Personoituja CV:itä & Hakukirjeitä"}
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    {language === "en" ? "In Minutes" : "Minuuteissa"}
                  </span>
                </h1>
                
                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                  {language === "en"
                    ? "We handle 90% of the work - you fill your profile once, then review and customize. Personalized, ATS-optimized applications ready in minutes."
                    : "Me teemme 90% työstä - täytät profiilin kerran, sitten tarkistat ja muokkaat. Personoidut, ATS-optimoidut hakemukset valmiina minuuteissa."}
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
                    onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-indigo-600 rounded-xl font-bold text-base sm:text-lg border-2 border-indigo-300 hover:bg-indigo-50 transition-all"
                  >
                    {language === "en" ? "See How It Works" : "Katso Miten Se Toimii"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600 max-w-2xl mx-auto px-4">
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>{language === "en" ? "No credit card" : "Ei luottokorttia"}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>{language === "en" ? "1 free CV + Cover Letter" : "1 ilmainen CV + Hakukirje"}</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
                    <span>{language === "en" ? "No commitment" : "Ei sitoutumista"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="how-it-works" className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-indigo-200 shadow-2xl mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full mb-4">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                <span className="font-bold text-indigo-800 text-sm sm:text-base">
                  {language === "en" ? "How It Works" : "Miten Se Toimii"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en" ? "3 Simple Steps to Your Perfect Application" : "3 Yksinkertaista Askelta Täydelliseen Hakemukseen"}
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
                  {language === "en" ? "Create Profile (Once)" : "Luo Profiili (Kerran)"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {language === "en"
                    ? "Fill in your work experience, education, and skills. This is the hardest part - but you only do it once!"
                    : "Täytä työkokemuksesi, koulutuksesi ja taitosi. Tämä on työläin vaihe - mutta teet sen vain kerran!"}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs sm:text-sm">
                  <p className="font-semibold text-indigo-900">
                    ⏱️ {language === "en" ? "~5-10 minutes" : "~5-10 minuuttia"}
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
                  {language === "en" ? "AI Generates (Automatically)" : "AI Generoi (Automaattisesti)"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                  {language === "en"
                    ? "Paste job description → AI creates personalized CV and cover letter based on your profile. ATS-optimized for Pro users."
                    : "Liitä työpaikkailmoitus → AI luo personoidun CV:n ja hakukirjeen profiilisi perusteella. ATS-optimoitu Pro-käyttäjille."}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs sm:text-sm">
                  <p className="font-semibold text-green-900">
                    ⚡ {language === "en" ? "~30-60 seconds" : "~30-60 sekuntia"}
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
                    👀 {language === "en" ? "~2-3 minutes" : "~2-3 minuuttia"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 sm:mt-12 bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-300 rounded-2xl p-4 sm:p-6 text-center">
              <p className="text-base sm:text-lg font-bold text-indigo-900 mb-2">
                ⏱️ {language === "en" ? "Total Time: ~7-15 minutes per application" : "Kokonaisaika: ~7-15 minuuttia per hakemus"}
              </p>
              <p className="text-xs sm:text-sm text-indigo-700">
                {language === "en"
                  ? "(After profile is created - then just 2-3 minutes per new application!)"
                  : "(Kun profiili on luotu - sitten vain 2-3 minuuttia per uusi hakemus!)"}
              </p>
            </div>
          </div>


          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl p-6 sm:p-8 md:p-12 border-2 border-amber-300 shadow-2xl mb-12 sm:mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full mb-4">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600" />
                <span className="font-bold text-amber-800 text-sm sm:text-base">
                  {language === "en" ? "Why ATS Optimization Matters" : "Miksi ATS-Optimointi On Tärkeää"}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
                {language === "en" 
                  ? "98% of Fortune 500 Companies Use ATS*"
                  : "98% Fortune 500 -yrityksistä Käyttää ATS:ää*"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto px-4">
                {language === "en"
                  ? "If your CV isn't optimized, it never reaches human eyes"
                  : "Jos CV:si ei ole optimoitu, se ei koskaan päädy ihmissilmille"}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {language === "en"
                  ? "*Source: Jobscan 2024, Harvard Business Review"
                  : "*Lähde: Jobscan 2024, Harvard Business Review"}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">98%</div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Fortune 500 companies use ATS systems"
                    : "Fortune 500 -yrityksistä käyttää ATS-järjestelmiä"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">75%</div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Of all recruiters use ATS or tech-driven tools"
                    : "Rekrytoijista käyttää ATS:ää tai teknisiä työkaluja"}
                </p>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-200 text-center">
                <div className="text-3xl sm:text-4xl font-bold text-amber-600 mb-2">250+</div>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Average applications per corporate job posting"
                    : "Keskimääräinen määrä hakemuksia per yritystyöpaikka"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-amber-300">
              <h3 className="font-bold text-base sm:text-lg mb-3 text-center text-gray-900">
                {language === "en" ? "What This Means For You:" : "Mitä Tämä Tarkoittaa Sinulle:"}
              </h3>
              <div className="space-y-3 text-sm sm:text-base">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-gray-700">
                    {language === "en"
                      ? "Your CV must pass ATS screening before any recruiter sees it"
                      : "CV:si täytyy läpäistä ATS-seulonta ennen kuin kukaan rekrytoija näkee sen"}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-gray-700">
                    {language === "en"
                      ? "With 250+ applications per job, standing out is critical"
                      : "Kun työpaikkaa kohti on 250+ hakemusta, erottuminen on kriittistä"}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 bg-amber-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-gray-700">
                    {language === "en"
                      ? "Basic: Standard CV & job-optimized cover letter (no ATS). Semi-Pro & Pro: ATS optimization included"
                      : "Basic: Normaali CV & työkohtainen hakukirje (ei ATS). Semi-Pro & Pro: ATS-optimointi mukana"}
                  </p>
                </div>
              </div>
            </div>
          </div>

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
              {/* Feature 1 - PAINOTETTU */}
              <div className="bg-gradient-to-br from-indigo-100 to-purple-100 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-indigo-300 shadow-xl relative">
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                  {language === "en" ? "CORE FEATURE" : "YDINOMINAISUUS"}
                </div>
                <Brain className="w-10 h-10 sm:w-12 sm:h-12 text-indigo-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2">
                  {language === "en" ? "Personality-Based Writing" : "Persoonallisuuspohjainen Kirjoitus"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700 mb-3">
                  {language === "en"
                    ? "AI analyzes your unique personality profile and writes in YOUR authentic voice - not generic templates. Every word sounds like you."
                    : "AI analysoi ainutlaatuisen persoonallisuusprofiilisi ja kirjoittaa SINUN aidolla äänelläsi - ei geneerisiä malleja. Jokainen sana kuulostaa sinulta."}
                </p>
                <div className="bg-white rounded-lg p-3 text-xs">
                  <p className="font-semibold text-indigo-900 mb-1">
                    {language === "en" ? "Available in:" : "Saatavilla:"}
                  </p>
                  <p className="text-indigo-700">✓ Basic • ✓ Semi-Pro • ✓ Pro</p>
                </div>
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
                  {language === "en" ? "Job-Specific Content" : "Työkohtainen Sisältö"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
                  {language === "en"
                    ? "Each application tailored to the specific job description"
                    : "Jokainen hakemus räätälöity juuri kyseiseen työpaikkaan"}
                </p>
              </div>

              {/* Feature 4 - COMING SOON */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 border-2 border-purple-200 shadow-lg relative opacity-75">
                <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                  {language === "en" ? "COMING SOON" : "TULOSSA"}
                </div>
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-purple-600 mb-3 sm:mb-4" />
                <h3 className="font-bold text-base sm:text-lg mb-2">
                  {language === "en" ? "Multiple Formats" : "Useita Formaatteja"}
                </h3>
                <p className="text-sm sm:text-base text-gray-700">
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
                  <span className="text-xs bg-yellow-200 px-2 py-0.5 rounded-full">PRO</span>
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

<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Free/Basic */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === "en" ? "Basic (Free)" : "Basic (Ilmainen)"}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/forever" : "/ikuisesti"}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 personality-driven CV" : "1 persoonallisuusvetoinen CV"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 job-optimized cover letter" : "1 työkohtainen hakukirje"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Personality-based writing" : "Persoonallisuuspohjainen kirjoitus"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Perfect for small companies" : "Täydellinen pienille yrityksille"}</span>
                  </li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>{language === "en" ? "Best for:" : "Parhaiten:"}</strong>{" "}
                    {language === "en" 
                      ? "Startups, small businesses, personal applications"
                      : "Startup-yritykset, pienet firmat, henkilökohtaiset hakemukset"}
                  </p>
                </div>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700">
                      {language === "en" ? "Get Started" : "Aloita"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Free/Basic */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === "en" ? "Basic (Free)" : "Basic (Ilmainen)"}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/forever" : "/ikuisesti"}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 personality-driven CV" : "1 persoonallisuusvetoinen CV"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 job-optimized cover letter" : "1 työkohtainen hakukirje"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Personality-based writing" : "Persoonallisuuspohjainen kirjoitus"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Perfect for small companies" : "Täydellinen pienille yrityksille"}</span>
                  </li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>{language === "en" ? "Best for:" : "Parhaiten:"}</strong>{" "}
                    {language === "en" 
                      ? "Startups, small businesses, personal applications"
                      : "Startup-yritykset, pienet firmat, henkilökohtaiset hakemukset"}
                  </p>
                </div>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700">
                      {language === "en" ? "Get Started" : "Aloita"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Free/Basic */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === "en" ? "Basic (Free)" : "Basic (Ilmainen)"}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/forever" : "/ikuisesti"}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 personality-driven CV" : "1 persoonallisuusvetoinen CV"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 job-optimized cover letter" : "1 työkohtainen hakukirje"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Personality-based writing" : "Persoonallisuuspohjainen kirjoitus"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Perfect for small companies" : "Täydellinen pienille yrityksille"}</span>
                  </li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>{language === "en" ? "Best for:" : "Parhaiten:"}</strong>{" "}
                    {language === "en" 
                      ? "Startups, small businesses, personal applications"
                      : "Startup-yritykset, pienet firmat, henkilökohtaiset hakemukset"}
                  </p>
                </div>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700">
                      {language === "en" ? "Get Started" : "Aloita"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Free/Basic */}
              <div className="bg-white rounded-2xl p-4 sm:p-6 border-2 border-gray-200 shadow-lg">
                <h3 className="text-xl sm:text-2xl font-bold mb-2">
                  {language === "en" ? "Basic (Free)" : "Basic (Ilmainen)"}
                </h3>
                <div className="mb-4">
                  <span className="text-3xl sm:text-4xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/forever" : "/ikuisesti"}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6 text-sm sm:text-base">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 personality-driven CV" : "1 persoonallisuusvetoinen CV"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 job-optimized cover letter" : "1 työkohtainen hakukirje"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Personality-based writing" : "Persoonallisuuspohjainen kirjoitus"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Perfect for small companies" : "Täydellinen pienille yrityksille"}</span>
                  </li>
                </ul>
                <div className="bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
                  <p className="text-xs text-blue-900">
                    <strong>{language === "en" ? "Best for:" : "Parhaiten:"}</strong>{" "}
                    {language === "en" 
                      ? "Startups, small businesses, personal applications"
                      : "Startup-yritykset, pienet firmat, henkilökohtaiset hakemukset"}
                  </p>
                </div>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full bg-gray-600 hover:bg-gray-700">
                      {language === "en" ? "Get Started" : "Aloita"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>
                      </div>
      </div>
      </div>
      </div></div></div>
    );
}
  }
