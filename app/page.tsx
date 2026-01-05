/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSubscription } from '@/context/SubscriptionContext';
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
  Play,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import HowItWorksTimeline from "@/components/howitworks";

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

      // ✅ korvattu freemiumStatus-logiikka
      if (tokens > 0 || (isActive && tier !== "free")) {
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
  isActive,
  tier,
  isLoaded,
  showWelcome,
  showOnboarding,
]);

if (!isLoaded || subLoading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 flex items-center justify-center">
      <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-lg font-bold text-gray-900">
          {language === "en" ? "Loading..." : "Ladataan..."}
        </div>
      </div>
    </div>
  );
}

  // --- 1. ENSIN: Clerk Loading State ---
 if (!isLoaded || subLoading) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100 flex items-center justify-center">
      <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
        <div className="text-lg font-bold text-gray-900">
          {language === "en" ? "Loading..." : "Ladataan..."}
        </div>
      </div>
    </div>
  );
}

  // --- 2. Welcome/Onboarding State ---
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-orange-50 to-pink-100">
        <OnboardingSteps
          isOpen={true}
          onComplete={handleOnboardingComplete}
          currentUserName={user?.firstName || "käyttäjä"}
        />
      </div>
    );
  }

  // LANDING PAGE (LOGGED OUT) EI KIRJAUTUNUT!
  if (!isSignedIn) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans text-gray-100 selection:bg-orange-400/30 selection:text-white relative overflow-hidden">
      {/* Subtle background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        
        {/* Hero Section */}
        <div className="mb-12 sm:mb-16">
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-black/50 p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-orange-500/5 pointer-events-none rounded-3xl sm:rounded-[2.5rem]"></div>

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-black/40 backdrop-blur-md rounded-full border border-orange-400/30 shadow-xl mb-4 sm:mb-6">
                <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                <span className="font-bold text-orange-300 text-sm sm:text-base">
                  {language === "en"
                    ? "Not Just AI. Your Digital Twin."
                    : "Ei Vain AI. Vaan Digitaalinen Kaksosesi."}
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  {language === "en"
                    ? "Create Your Profile Once,"
                    : "Luo Profiili Kerran,"}
                </span>
                <br />
                <span className="text-gray-100">
                  {language === "en"
                    ? "Get Personalized Applications Quickly And Easy"
                    : "Saa Personoituja Hakemuksia Nopeasti Ja Helposti"}
                </span>
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                {language === "en"
                  ? "Start for free with zero risk. We just need you to fill your profile so our AI knows you. You get 1 free CV and a general Cover Letter to test the quality."
                  : "Aloita ilmaiseksi ilman sitoutumista. Sinun tarvitsee vain täyttää profiilisi, jotta AI oppii tuntemaan sinut. Saat 1 ilmaisen CV:n ja yhden yleisen esittelykirjeen testataksesi laatua."}
              </p>

              <HowItWorksTimeline />

              <div className="flex mt-6 flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all">
                      <Sparkles className="inline w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                      {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
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
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/5 backdrop-blur-md text-orange-300 rounded-xl font-bold text-base sm:text-lg border border-orange-400/30 hover:bg-white/10 transition-all"
                >
                  {language === "en"
                    ? "See How It Works"
                    : "Katso Miten Ohjelma Toimii"}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-300 max-w-3xl mx-auto px-4 font-medium">
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <CreditCard className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {language === "en"
                      ? "No credit card required"
                      : "Ei vaadi luottokorttia"}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Clock className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  <span>
                    {language === "en"
                      ? "10-15min setup"
                      : "10-15min asennus"}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                  <span>
                    {language === "en"
                      ? "No commitment In Free Version"
                      : "Ei sitoutumista Ilmaisversiossa"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Digital Twin Section */}
        <div className="mb-16 sm:mb-20">
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-16 text-white shadow-2xl relative overflow-hidden text-center border border-white/10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
            
            <div className="relative z-10 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-orange-400/30 mb-4 sm:mb-6">
                <Brain className="w-5 h-5 text-orange-300" />
                <span className="font-bold text-orange-200 tracking-wide uppercase text-sm">
                  {language === "en" ? "Not Just AI" : "Ei Vain AI"}
                </span>
              </div>
              
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight">
                {language === "en"
                  ? "Your Digital Twin."
                  : "Sinun Digitaalinen Kaksosesi."}
              </h2>
              
              <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                {language === "en"
                  ? "Most AI tools generate generic, robotic text that recruiters spot instantly. Our unique engine analyzes your profile, your strengths, working style, and values—and writes in YOUR unique voice."
                  : "Useimmat AI-työkalut luovat geneeristä tekstiä, jonka rekrytoijat tunnistavat heti. Meidän ainutlaatuinen ohjelmamme analysoi profiilisi psygolokisesti – vahvuutesi, työtapasi ja arvosi – ja kirjoittaa SINUN ainutlaatuisella äänelläsi."}
              </p>

              <div className="grid md:grid-cols-2 gap-4 sm:gap-6 text-left">
                <div className="bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10">
                  <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2">
                    <X className="w-5 h-5 text-red-400" />
                    Generic AI (ChatGPT etc.)
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-400 italic">
                    "I am a hard working individual who is motivated to succeed in this role..."
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-md p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-green-500/20">
                  <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2 text-green-300">
                    <Check className="w-5 h-5" />
                    HappyApplaid
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-200 italic">
                    {language === "en"
                      ? "\"My problem-solving approach relies on deep analysis, which helped me lead the X project...\""
                      : "\"Ongelmanratkaisutyylini perustuu syvälliseen analyysiin, mikä auttoi minua johtamaan X-projektia...\""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div id="how-it-works" className="bg-white/5 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-12 border border-white/10 shadow-2xl mb-16">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500/20 backdrop-blur-md rounded-full mb-4 border border-orange-400/30">
              <Sparkles className="w-5 h-5 text-orange-400" />
              <span className="font-bold text-orange-300 text-sm sm:text-base">
                {language === "en" ? "See It In Action" : "Katso Toiminnassa"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-100 mb-3 sm:mb-4 px-4">
              {language === "en" ? "How The System Works" : "Näin Järjestelmä Toimii"}
            </h2>
          </div>

          <div className="max-w-3xl mx-auto px-4">
            <div className="relative aspect-video bg-gradient-to-br from-gray-800 to-black rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden shadow-xl">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-2xl">
                  <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-100 text-center">
                  {language === "en" ? "Demo Video Coming Soon" : "Demo-video Tulossa Pian"}
                </h3>
              </div>

              <div className="absolute top-3 sm:top-4 left-3 sm:left-4 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-400"></div>
              <div className="absolute top-3 sm:top-4 left-8 sm:left-10 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-yellow-400"></div>
              <div className="absolute top-3 sm:top-4 left-[52px] sm:left-16 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-400"></div>
            </div>
          </div>
        </div>

        {/* AI That Grows Section */}
        <div className="mb-16 sm:mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-800/50 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-orange-400/30 mb-6">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                  <span className="font-bold text-orange-300 text-sm">
                    {language === "en" ? "Smart & Adaptive" : "Älykäs & Mukautuva"}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-100 mb-4 sm:mb-6">
                  {language === "en" ? "AI That Grows With You" : "AI Joka Kasvaa Kanssasi"}
                </h2>
                
                <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-6 sm:mb-8 leading-relaxed">
                  {language === "en"
                    ? "If our AI needs more info for a specific job, it asks you smart questions. It learns from your answers and saves them to your profile—so you never have to repeat yourself."
                    : "Jos AI tarvitsee lisätietoja tiettyyn työhön, se kysyy älykkäitä kysymyksiä. Se oppii vastauksistasi ja tallentaa ne profiiliisi – jotta sinun ei tarvitse koskaan toistaa itseäsi."}
                </p>

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-400" />
                      <h3 className="font-bold text-base sm:text-lg text-gray-100">
                        {language === "en" ? "Smart Questions" : "Älykkäät Kysymykset"}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      {language === "en"
                        ? "Contextual follow-ups based on the job requirements"
                        : "Kontekstuaaliset jatkokysymykset työn vaatimusten perusteella"}
                    </p>
                  </div>

                  <div className="bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/10 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-400" />
                      <h3 className="font-bold text-base sm:text-lg text-gray-100">
                        {language === "en" ? "Gets Smarter" : "Viisastuu"}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-400">
                      {language === "en"
                        ? "Your profile improves with every application"
                        : "Profiilisi paranee jokaisen hakemuksen myötä"}
                    </p>
                  </div>
                </div>

                <div className="mt-6 sm:mt-8 bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-md p-4 sm:p-6 rounded-2xl text-white border border-orange-400/30">
                  <p className="text-sm sm:text-base font-semibold flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-400" />
                    {language === "en" ? "Result:" : "Tulos:"}
                  </p>
                  <p className="text-base sm:text-lg md:text-xl font-bold mt-2">
                    {language === "en"
                      ? "Your profile gets smarter with every application."
                      : "Profiilisi viisastuu jokaisen hakemuksen myötä."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RAG Expert Section */}
        <div className="mb-16 sm:mb-20">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-2xl rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 border border-white/10 shadow-xl hover:shadow-2xl transition-all">
              <div className="bg-orange-500/20 backdrop-blur-md w-14 h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6 border border-orange-400/30">
                <Crown className="w-7 h-7 text-orange-400" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-100 mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
                {language === "en" ? "Built-in HR Consultant" : "Sisäänrakennettu HR-Konsultti"}
                <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full border border-orange-400/30">Pro</span>
              </h3>
              <p className="text-sm sm:text-base text-gray-300 mb-4 sm:mb-6 leading-relaxed">
                {language === "en"
                  ? "Our Pro AI reads real recruitment articles and HR guides from our database before writing. It's like having an expert check your application."
                  : "Pro AI:mme lukee tietokannastamme oikeita rekrytointiartikkeleita ja HR-oppaita ennen kirjoittamista. Kuin asiantuntija tarkistaisi hakemuksesi."}
              </p>
              <div className="bg-orange-500/10 backdrop-blur-md p-4 rounded-2xl border border-orange-400/20">
                <p className="text-sm font-semibold text-orange-300 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  {language === "en" ? "RAG Technology:" : "RAG-Teknologia:"}
                </p>
                <p className="text-sm text-orange-200 mt-1">
                  {language === "en"
                    ? "Retrieval-Augmented Generation ensures professional advice."
                    : "Retrieval-Augmented Generation varmistaa ammattimaisen neuvonnan."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="mb-16 sm:mb-20">
          <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-100 mb-6 sm:mb-8 px-4">
            {language === "en" ? "Everything You Need" : "Kaikki Mitä Tarvitset"}
          </h2>
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md transition-all">
              <Target className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100">{language === "en" ? "Job-Specific Content" : "Työkohtainen Sisältö"}</h3>
              <p className="text-sm text-gray-400">{language === "en" ? "Tailored to the specific job description." : "Räätälöity juuri kyseiseen työpaikkaan."}</p>
            </div>
            
            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md transition-all">
              <Shield className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100">{language === "en" ? "Honesty Check" : "Rehellisyystarkistus"}</h3>
              <p className="text-sm text-gray-400">{language === "en" ? "AI verifies claims against your profile." : "AI tarkistaa väitteet profiiliasi vasten."}</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 shadow-sm hover:shadow-md transition-all">
              <FileText className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100">{language === "en" ? "Professional PDF Export" : "Ammattimainen PDF-Vienti"}</h3>
              <p className="text-sm text-gray-400">{language === "en" ? "Download your CVs and cover letters as professional PDF files for easy sharing." : "Lataa CV:t ja hakukirjeet ammattimaisina PDF-tiedostoina helppoa jakamista varten."}</p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 shadow-none relative overflow-hidden group">
              <div className="absolute top-3 right-3 bg-yellow-500/80 text-black text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10 shadow-sm">
                {language === "en" ? "Coming Soon" : "Tulossa Pian"}
              </div>
              <div className="grayscale opacity-40 group-hover:opacity-50 transition-opacity">
                <FileEdit className="w-10 h-10 text-gray-500 mb-4" />
                <h3 className="font-bold text-lg mb-2 text-gray-400">{language === "en" ? "Professional Templates" : "Ammattimaiset Pohjat"}</h3>
                <p className="text-sm text-gray-500">{language === "en" ? "Multiple professional CV and cover letter templates to choose from." : "Useita ammattimaisia CV- ja hakukirjepohjia valittavana."}</p>
              </div>
              <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] pointer-events-none rounded-3xl"></div>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 border border-white/10 shadow-2xl mb-16">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-100 mb-4">
              {language === "en" ? "Simple, Transparent Pricing" : "Yksinkertainen, Läpinäkyvä Hinnoittelu"}
            </h2>
            <p className="text-base sm:text-lg text-gray-300">
              {language === "en" ? "Start free - upgrade when you need more" : "Aloita ilmaiseksi - päivitä kun tarvitset enemmän"}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 border border-white/10 shadow-lg flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-gray-100">{language === "en" ? "Free" : "Ilmainen"}</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">0€</span>
                <span className="text-gray-400 text-sm">{language === "en" ? "/month" : "/kk"}</span>
              </div>
              <div className="bg-gray-700/30 p-2 rounded text-xs text-center font-medium mb-4 text-gray-300">
                {language === "en" ? "Risk Free Trial" : "Riskitön Kokeilu"}
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-gray-200">{language === "en" ? "1 Free CV" : "1 Ilmainen CV"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "1 General Letter" : "1 Yleinen Kirje"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "Save Profile Data" : "Profiilitiedot tallennetaan"}</span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">No Job Specific / ATS</span>
                </li>
              </ul>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full border-white/20 bg-white/5 text-gray-200 hover:bg-white/10">
                    {language === "en" ? "Start Free" : "Aloita"}
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>

            {/* Basic Plan */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 border border-blue-400/30 shadow-lg flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-blue-300">Basic</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">4.99€</span>
                <span className="text-gray-400 text-sm">{language === "en" ? "/month" : "/kk"}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "Unlimited CVs" : "Rajattomat CV:t"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "Unlimited Letters" : "Rajattomat Kirjeet"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "Job-Specific Letters" : "Työpaikkakohtaiset Kirjeet"}</span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-500">No ATS Optimization</span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30">
                  {language === "en" ? "Choose Basic" : "Valitse Basic"}
                </Button>
              </Link>
            </div>

            {/* Semi-Pro Plan */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 border border-amber-400/40 shadow-2xl relative scale-105 z-10 flex flex-col">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md whitespace-nowrap">
                {language === "en" ? "Recommended" : "Suosittelemme"}
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-300">Semi-Pro</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">9.99€</span>
                <span className="text-gray-300 text-sm">{language === "en" ? "/month" : "/kk"}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-gray-200">{language === "en" ? "Everything in Basic" : "Kaikki Basicissä"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-gray-200">{language === "en" ? "ATS Optimized CVs" : "ATS-optimoidut CV:t"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-gray-200">{language === "en" ? "ATS Optimized Letters" : "ATS-optimoidut Kirjeet"}</span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
                  {language === "en" ? "Choose Semi-Pro" : "Valitse Semi-Pro"}
                </Button>
              </Link>
            </div>

            {/* Pro Plan */}
            <div className="bg-white/5 backdrop-blur-md rounded-2xl sm:rounded-3xl p-6 border border-orange-400/30 shadow-lg flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-orange-300 flex items-center gap-2">
                Pro <Crown className="w-4 h-4 text-orange-400" />
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">15.99€</span>
                <span className="text-gray-400 text-sm">{language === "en" ? "/month" : "/kk"}</span>
              </div>
              <ul className="space-y-3 mb-6 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-300">{language === "en" ? "Everything in Semi-Pro" : "Kaikki Semi-Prossa"}</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
                  <span className="font-bold text-orange-200">{language === "en" ? "RAG Expert Database" : "RAG-Eksperttitietokanta"}</span>
                </li>
                <li className="flex items-start gap-2 text-xs text-orange-300 font-medium bg-orange-500/20 p-1 rounded border border-orange-400/30">
                  {language === "en" ? "Maximum Impact" : "Maksimaalinen Vaikutus"}
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                  {language === "en" ? "Choose Pro" : "Valitse Pro"}
                </Button>
              </Link>
            </div>
          </div>
          
          <p className="text-center text-xs text-gray-500 mt-8">
            {language === "en" ? "Cancel anytime • No credit card required for free plan" : "Peruuta milloin vain • Ei luottokorttia ilmaisessa paketissa"}
          </p>
        </div>

        {/* Final CTA */}
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-2xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 lg:p-16 text-center text-white shadow-2xl border border-orange-400/30">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6">
            {language === "en" ? "Ready to Save Hours?" : "Valmis Säästämään Tunteja?"}
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-200 max-w-2xl mx-auto">
            {language === "en"
              ? "Create your profile once. Get personalized applications forever."
              : "Luo profiili kerran. Saa personoituja hakemuksia ikuisesti."}
          </p>

          <div className="flex justify-center mb-6 sm:mb-8">
            <SignedOut>
              <SignInButton mode="modal">
                <Button className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-orange-600 rounded-xl font-bold text-base sm:text-lg hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all">
                  <Sparkles className="inline w-5 h-5 mr-2" />
                  {language === "en" ? "Start Free Now" : "Aloita Ilmaiseksi"}
                </Button>
              </SignInButton>
            </SignedOut>
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-200">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" /> {language === "en" ? "No credit card" : "Ei luottokorttia"}
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" /> {language === "en" ? "Cancel anytime" : "Peruuta milloin vain"}
            </div>
          </div>
        </div>

      <footer className="py-8 sm:py-12 text-center text-gray-500 border-t border-orange-100 bg-white/70 backdrop-blur-xl mt-16 rounded-3xl">
        <div className="max-w-7xl mx-auto px-4 text-sm">
          © {new Date().getFullYear()} HappyApplaid. {language === "en" ? "All rights reserved." : "Kaikki oikeudet pidätetään."}
        </div>
      </footer>
    </div>
  </div>
    )}

  return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans">
    
    {/* --- PROFIILI MODAALI --- */}
    {showProfilePrompt && profileCompleted === false && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setShowProfilePrompt(false)}
            className="absolute top-6 right-6 hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-md w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-orange-400/30">
            <User className="h-10 w-10 text-orange-400" />
          </div>

          <h3 className="text-2xl font-black text-center mb-3 text-gray-100 tracking-tight">
            {language === "en" ? `Hey, ${user?.firstName}!` : `Hei, ${user?.firstName}!`}
          </h3>
          <p className="text-center text-gray-400 mb-8 leading-relaxed">
            {language === "en"
              ? "We recommend filling out your profile to get the best results."
              : "Suosittelemme profiilin täyttämistä, jotta saat parhaan hyödyn tekoälystämme."}
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/profile" className="w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-2xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 border-none text-white font-bold">
                {language === "en" ? "Fill Profile" : "Täytä Profiili"}
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowProfilePrompt(false)}
              className="w-full h-12 rounded-2xl text-gray-400 hover:text-gray-200 hover:bg-white/5"
            >
              {language === "en" ? "Maybe later" : "Ehkä myöhemmin"}
            </Button>
          </div>
        </div>
      </div>
    )}

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* --- TERVEHDYS OSA --- */}
      <div className="mb-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-xl shadow-black/50 p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
        
        <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-orange-400 via-amber-500 to-orange-500 bg-clip-text text-transparent mb-3 tracking-tight">
          {language === "en"
            ? `Welcome${displayName ? `, ${displayName}` : ""}!`
            : `Tervetuloa${displayName ? `, ${displayName}` : ""}!`}
        </h1>
        <div className="flex items-center gap-2">
           <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md ${tier === 'free' ? 'bg-gray-700/50 text-gray-300 border border-gray-600/30' : 'bg-orange-500/20 text-orange-300 border border-orange-400/30'}`}>
              {tier === "free"
                ? language === "en" ? "Free Member" : "Ilmaisjäsen"
                : tier.toUpperCase()}
           </span>
           <p className="text-gray-400 text-sm sm:text-base font-medium">
            {tier === "free" && (
                language === "en" ? "• 1 CV + 1 Letter included" : "• Sisältää 1 CV:n + 1 hakukirjeen"
            )}
           </p>
        </div>
      </div>

      {/* --- UPGRADE BANNERI --- */}
      {tier === "free" && hasUsedFreeCv && (
        <div className="mb-10 backdrop-blur-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-400/30 rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="bg-white/5 backdrop-blur-md p-4 rounded-2xl shadow-sm mb-4 relative z-10 border border-white/10">
            <Crown className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-100 mb-3 relative z-10">
            {language === "en" ? "Unlock Your Full Potential" : "Avaa täydet ominaisuudet"}
          </h2>
          <p className="text-center text-gray-300 mb-8 max-w-md relative z-10 leading-relaxed">
            {language === "en"
              ? "Upgrade to Premium to create unlimited ATS-optimized documents and stand out from the crowd."
              : "Päivitä Premium-tiliin ja luo rajattomasti ATS-optimoituja dokumentteja ilman rajoituksia."}
          </p>
          <Link href="/pricing" className="relative z-10 w-full sm:w-auto">
            <Button className="px-10 h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl">
              <Crown className="w-5 h-5" />
              {language === "en" ? "Get Premium Access" : "Hanki Premium-käyttöoikeus"}
            </Button>
          </Link>
        </div>
      )}

      <HowItWorksTimeline />

      {/* --- PÄÄTOIMINNOT (GRID) --- */}
      <div className="grid mt-10 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        
        {/* CV KORTTI */}
        {canCreateCV ? (
          <Link href="/create-cv" className="group">
            <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:shadow-orange-500/20 group-hover:-translate-y-2 transition-all duration-300">
              <div className="bg-orange-500/20 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-orange-400/30">
                <FileText className="h-8 w-8 text-orange-400" />
              </div>
              <h3 className="font-black text-2xl mb-2 text-gray-100 tracking-tight">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-sm text-gray-400 mb-8 leading-relaxed">
                {isPaid
                  ? language === "en" ? "Unlimited ATS-optimized CVs for your dream job." : "Rajattomat ATS-optimoidut CV:t unelmaduuniisi."
                  : language === "en" ? "Try our personality-driven basic template." : "Kokeile persoonallisuusvetoista pohjaamme."}
              </p>
              <Button className="w-full h-12 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition-colors text-white">
                {language === "en" ? "Start Now" : "Aloita heti"}
              </Button>
            </div>
          </Link>
        ) : (
          <div className="h-full backdrop-blur-xl bg-gray-900/50 border border-gray-700/50 rounded-[2rem] p-8 opacity-80 relative">
            <Lock className="absolute top-8 right-8 h-6 w-6 text-gray-600" />
            <div className="bg-gray-700/30 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-gray-600" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-600 tracking-tight">
              {language === "en" ? "Create CV" : "Luo CV"}
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              {language === "en" ? "Free CV already used. Upgrade to create more!" : "Ilmainen CV jo käytetty. Päivitä luodaksesi lisää!"}
            </p>
            <Link href="/pricing">
              <Button variant="outline" className="w-full h-12 rounded-xl border border-gray-700 font-bold text-gray-400 hover:bg-white/5">
                {language === "en" ? "Upgrade" : "Päivitä"}
              </Button>
            </Link>
          </div>
        )}

        {/* HAKUKIRJE KORTTI */}
        <Link href="/create-cover-letter" className="group">
          <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:shadow-emerald-500/20 group-hover:-translate-y-2 transition-all duration-300">
            <div className="bg-emerald-500/20 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-emerald-400/30">
              <FileInput className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-100 tracking-tight">
              {language === "en" ? "Cover Letter" : "Hakukirje"}
            </h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              {isPaid
                ? language === "en" ? "Craft compelling letters for every application." : "Luo vakuuttavat kirjeet jokaiseen hakuun."
                : language === "en" ? "1 general letter to get you started." : "1 yleinen hakukirje aloittamiseen."}
            </p>
            <Button className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-colors text-white">
              {language === "en" ? "Write Letter" : "Kirjoita kirje"}
            </Button>
          </div>
        </Link>

        {/* PROFIILI KORTTI */}
        <Link href="/profile" className="group">
          <div className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:shadow-amber-500/20 group-hover:-translate-y-2 transition-all duration-300">
            <div className="bg-amber-500/20 backdrop-blur-md w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-amber-400/30">
              <User className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-100 tracking-tight">
              {language === "en" ? "Your Profile" : "Profiili"}
            </h3>
            <p className="text-sm text-gray-400 mb-8 leading-relaxed">
              {language === "en" ? "Keep your info updated for better AI generation." : "Pidä tiedot ajan tasalla parasta tulosta varten."}
            </p>
            <Button variant="outline" className="w-full h-12 rounded-xl border border-amber-400/30 font-bold text-amber-300 hover:bg-amber-500/10 transition-colors">
              {language === "en" ? "Edit Profile" : "Muokkaa profiilia"}
            </Button>
          </div>
        </Link>
      </div>

      {/* --- OMAT DOKUMENTIT --- */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-[2.5rem] shadow-xl p-8 sm:p-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3 text-gray-100 tracking-tight">
            <Files className="h-7 w-7 text-orange-400" />
            {language === "en" ? "My Documents" : "Omat Dokumentit"}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* CV-lista */}
          <div className="space-y-4">
            <Link href="/my-cvs" className="flex items-center justify-between p-5 bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-md rounded-[1.5rem] transition-all group border border-orange-400/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg shadow-sm border border-white/10">
                  <FileText className="h-5 w-5 text-orange-400" />
                </div>
                <span className="font-black text-gray-100">{language === "en" ? "My CVs" : "Omat CV:t"}</span>
                {recentCVs.length > 0 && (
                  <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCVs.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-3 min-h-[100px]">
              {loadingRecent ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-4 border-orange-500 border-t-transparent rounded-full"></div></div>
              ) : recentCVs.length > 0 ? (
                recentCVs.map((cv: any) => (
                  <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                    <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-orange-400/30 hover:bg-white/10 rounded-2xl transition-all shadow-sm hover:shadow-md flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-sm text-gray-200 group-hover:text-orange-400 transition-colors">
                          {cv.content?.personalInfo?.name || cv.title || (language === "en" ? "Unnamed CV" : "Nimetön CV")}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-wider">
                          {new Date(cv.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 text-sm py-6 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
                  {language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}
                </p>
              )}
            </div>
          </div>

          {/* Kirje-lista */}
          <div className="space-y-4">
            <Link href="/my-cover-letters" className="flex items-center justify-between p-5 bg-emerald-500/10 hover:bg-emerald-500/20 backdrop-blur-md rounded-[1.5rem] transition-all group border border-emerald-400/20">
              <div className="flex items-center gap-3">
                <div className="bg-white/10 backdrop-blur-md p-2 rounded-lg shadow-sm border border-white/10">
                  <FileInput className="h-5 w-5 text-emerald-400" />
                </div>
                <span className="font-black text-gray-100">{language === "en" ? "Cover Letters" : "Hakukirjeet"}</span>
                {recentCoverLetters.length > 0 && (
                  <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCoverLetters.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-3 min-h-[100px]">
              {loadingRecent ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div></div>
              ) : recentCoverLetters.length > 0 ? (
                recentCoverLetters.map((letter: any) => (
                  <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                    <div className="p-4 bg-white/5 backdrop-blur-md border border-white/10 hover:border-emerald-400/30 hover:bg-white/10 rounded-2xl transition-all shadow-sm hover:shadow-md flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-sm text-gray-200 group-hover:text-emerald-400 transition-colors">
                          {letter.title || letter.job_title || (language === "en" ? "Unnamed Letter" : "Nimetön Kirje")}
                        </p>
                        <p className="text-[10px] text-gray-500 uppercase font-bold mt-1 tracking-wider">
                          {new Date(letter.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-500 text-sm py-6 bg-gray-900/50 rounded-2xl border border-dashed border-gray-700">
                  {language === "en" ? "No letters yet" : "Ei vielä kirjeitä"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* --- FOOTER --- */}
    <footer className="py-12 text-center text-gray-500 mt-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-orange-500/20 to-transparent mb-8"></div>
        <p className="text-sm font-medium tracking-wide">
          © {new Date().getFullYear()} HappyApplaid.{" "}
          {language === "en" ? "Crafted with love for your career." : "Rakkaudella luotu urallesi."}
        </p>
      </div>
    </footer>
  </div>
)};