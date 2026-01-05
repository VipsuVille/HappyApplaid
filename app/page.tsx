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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100 flex items-center justify-center">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100 flex items-center justify-center">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100">
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
      <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">

          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
          <div
            className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          ></div>
        </div>


        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
      
          <div className="mb-12 sm:mb-16">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl sm:rounded-[2.5rem] shadow-2xl shadow-orange-500/10 p-6 sm:p-8 md:p-12 lg:p-16 backdrop-saturate-150 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl sm:rounded-[2.5rem]"></div>

              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/90 backdrop-blur-sm rounded-full border-2 border-orange-300 shadow-xl mb-4 sm:mb-6">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                  <span className="font-bold text-orange-800 text-sm sm:text-base">
                    {language === "en"
                      ? "Not Just AI. Your Digital Twin."
                      : "Ei Vain AI. Vaan Digitaalinen Kaksosesi."}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                  <span className="bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent">
                    {language === "en"
                      ? "Create Your Profile Once,"
                      : "Luo Profiili Kerran,"}
                  </span>
                  <br />
                  <span className="text-gray-900">
                    {language === "en"
                      ? "Get Personalized Applications Quickly And Easy"
                      : "Saa Personoituja Hakemuksia Nopeasti Ja Helposti"}
                  </span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                  {language === "en"
                    ? "Start for free with zero risk. We just need you to fill your profile so our AI knows you. You get 1 free CV and a general Cover Letter to test the quality."
                    : "Aloita ilmaiseksi ilman sitoutumista. Sinun tarvitsee vain täyttää profiilisi, jotta AI oppii tuntemaan sinut. Saat 1 ilmaisen CV:n ja yhden yleisen esittelykirjeen testataksesi laatua."}
                </p>
          <HowItWorksTimeline />

                <div className="flex mt-6 flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-6 sm:mb-8 px-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-600 to-purple-600 text-white rounded-xl font-bold text-base sm:text-lg shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all">
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
                    className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white text-orange-600 rounded-xl font-bold text-base sm:text-lg border-2 border-orange-300 hover:bg-orange-50 transition-all"
                  >
                    {language === "en"
                      ? "See How It Works"
                      : "Katso Miten Ohjelma Toimii"}
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-gray-700 max-w-3xl mx-auto px-4 font-medium">
                  <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-orange-100">
                    <CreditCard className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "No credit card required"
                        : "Ei vaadi luottokorttia"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-orange-100">
                    <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "10-15min setup"
                        : "10-15min asennus"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-full border border-orange-100">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
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
     
          <div className="mb-16 sm:mb-20">
             <div className="bg-gradient-to-br from-orange-900 via-purple-900 to-orange-900 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-16 text-white shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full border border-white/20 mb-4 sm:mb-6 backdrop-blur-sm">
                    <Brain className="w-5 h-5 text-pink-300" />
                    <span className="font-bold text-orange-100 tracking-wide uppercase text-sm">
                      {language === "en" ? "Not Just AI" : "Ei Vain AI"}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6 leading-tight">
                    {language === "en" 
                      ? "Your Digital Twin." 
                      : "Sinun Digitaalinen Kaksosesi."}
                  </h2>
                  
                  <p className="text-base sm:text-lg md:text-xl text-orange-100 mb-6 sm:mb-8 leading-relaxed">
                    {language === "en"
                      ? "Most AI tools generate generic, robotic text that recruiters spot instantly. Our unique engine analyzes your profile, your strengths, working style, and values—and writes in YOUR unique voice."
                      : "Useimmat AI-työkalut luovat geneeristä tekstiä, jonka rekrytoijat tunnistavat heti. Meidän ainutlaatuinen ohjelmamme analysoi profiilisi psygolokisesti – vahvuutesi, työtapasi ja arvosi – ja kirjoittaa SINUN ainutlaatuisella äänelläsi."}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6 text-left">
                    <div className="bg-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-white/10 backdrop-blur-sm">
                      <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2">
                        <X className="w-5 h-5 text-red-400" /> 
                        Generic AI (ChatGPT etc.)
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-300 italic">
                        "I am a hard working individual who is motivated to succeed in this role..."
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-green-500/30 backdrop-blur-sm">
                      <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2 text-green-300">
                        <Check className="w-5 h-5" /> 
                        HappyApplaid
                      </h3>
                      <p className="text-xs sm:text-sm text-orange-100 italic">
                        {language === "en" 
                          ? "\"My problem-solving approach relies on deep analysis, which helped me lead the X project...\""
                          : "\"Ongelmanratkaisutyylini perustuu syvälliseen analyysiin, mikä auttoi minua johtamaan X-projektia...\""}
                      </p>
                    </div>
                  </div>
                </div>
             </div>
          </div>

    


<div id="how-it-works" className="bg-white/90 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] p-4 sm:p-6 md:p-12 border-2 border-orange-200 shadow-2xl mb-16">
  <div className="text-center mb-6 sm:mb-8">
    <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-4">
      <Sparkles className="w-5 h-5 text-orange-600" />
      <span className="font-bold text-orange-800 text-sm sm:text-base">
        {language === "en" ? "See It In Action" : "Katso Toiminnassa"}
      </span>
    </div>
    <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 px-4">
      {language === "en" ? "How The System Works" : "Näin Järjestelmä Toimii"}
    </h2>
  </div>

  {/* Video Placeholder - Yksinkertaistettu */}
  <div className="max-w-3xl mx-auto px-4">
    <div className="relative aspect-video bg-gradient-to-br from-orange-100 to-purple-100 rounded-2xl sm:rounded-3xl border-2 border-orange-300 overflow-hidden shadow-xl">
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
        <div className="h-16 w-16 sm:h-20 sm:w-20 bg-gradient-to-br from-orange-500 to-purple-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-2xl">
          <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/>
          </svg>
        </div>
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 text-center">
          {language === "en" ? "Demo Video Coming Soon" : "Demo-video Tulossa Pian"}
        </h3>
      </div>

      {/* Decorative dots */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-red-400"></div>
      <div className="absolute top-3 sm:top-4 left-8 sm:left-10 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-yellow-400"></div>
      <div className="absolute top-3 sm:top-4 left-[52px] sm:left-16 h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-400"></div>
    </div>
  </div>
</div>


<div className="mb-16 sm:mb-20">
  <div className="max-w-4xl mx-auto">
    <div className="bg-gradient-to-br from-orange-50 via-purple-50 to-pink-50 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 border-2 border-orange-200 shadow-2xl relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-200/30 to-purple-200/30 rounded-full blur-3xl -mr-20 -mt-20"></div>
      
      <div className="relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-orange-300 mb-6 backdrop-blur-sm">
          <Sparkles className="w-5 h-5 text-orange-600" />
          <span className="font-bold text-orange-800 text-sm">
            {language === "en" ? "Smart & Adaptive" : "Älykäs & Mukautuva"}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 sm:mb-6">
          {language === "en" ? "AI That Grows With You" : "AI Joka Kasvaa Kanssasi"}
        </h2>
        
        <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-6 sm:mb-8 leading-relaxed">
          {language === "en"
            ? "If our AI needs more info for a specific job, it asks you smart questions. It learns from your answers and saves them to your profile—so you never have to repeat yourself."
            : "Jos AI tarvitsee lisätietoja tiettyyn työhön, se kysyy älykkäitä kysymyksiä. Se oppii vastauksistasi ja tallentaa ne profiiliisi – jotta sinun ei tarvitse koskaan toistaa itseäsi."}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-orange-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-orange-600" />
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                {language === "en" ? "Smart Questions" : "Älykkäät Kysymykset"}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {language === "en"
                ? "Contextual follow-ups based on the job requirements"
                : "Kontekstuaaliset jatkokysymykset työn vaatimusten perusteella"}
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-sm p-4 sm:p-6 rounded-2xl border border-orange-200 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <Lightbulb className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              <h3 className="font-bold text-base sm:text-lg text-gray-900">
                {language === "en" ? "Gets Smarter" : "Viisastuu"}
              </h3>
            </div>
            <p className="text-sm text-gray-600">
              {language === "en"
                ? "Your profile improves with every application"
                : "Profiilisi paranee jokaisen hakemuksen myötä"}
            </p>
          </div>
        </div>

        <div className="mt-6 sm:mt-8 bg-gradient-to-r from-orange-600 to-purple-600 p-4 sm:p-6 rounded-2xl text-white">
          <p className="text-sm sm:text-base font-semibold flex items-center gap-2">
            <Check className="w-5 h-5" />
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

{/* ===================================
    RAG EXPERT KNOWLEDGE
    =================================== */}
<div className="mb-16 sm:mb-20">
  <div className="max-w-4xl mx-auto">
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl sm:rounded-[2rem] p-6 sm:p-8 border-2 border-purple-100 shadow-xl hover:shadow-2xl transition-all">
      <div className="bg-purple-100 w-14 h-14 rounded-2xl sm:rounded-3xl flex items-center justify-center mb-4 sm:mb-6">
        <Crown className="w-7 h-7 text-purple-600" />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2 flex-wrap">
        {language === "en" ? "Built-in HR Consultant" : "Sisäänrakennettu HR-Konsultti"}
        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full border border-purple-300">Pro</span>
      </h3>
      <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6 leading-relaxed">
        {language === "en"
          ? "Our Pro AI reads real recruitment articles and HR guides from our database before writing. It's like having an expert check your application."
          : "Pro AI:mme lukee tietokannastamme oikeita rekrytointiartikkeleita ja HR-oppaita ennen kirjoittamista. Kuin asiantuntija tarkistaisi hakemuksesi."}
      </p>
      <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
        <p className="text-sm font-semibold text-purple-800 flex items-center gap-2">
          <Database className="w-4 h-4" />
          {language === "en" ? "RAG Technology:" : "RAG-Teknologia:"}
        </p>
        <p className="text-sm text-purple-700 mt-1">
          {language === "en"
            ? "Retrieval-Augmented Generation ensures professional advice."
            : "Retrieval-Augmented Generation varmistaa ammattimaisen neuvonnan."}
        </p>
      </div>
    </div>
  </div>
</div>
    <div className="mb-16 sm:mb-20">
             <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6 sm:mb-8 px-4">
               {language === "en" ? "Everything You Need" : "Kaikki Mitä Tarvitset"}
             </h2>
             <div className="space-y-4 sm:space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                   <Target className="w-10 h-10 text-orange-600 mb-4" />
                   <h3 className="font-bold text-lg mb-2">{language === "en" ? "Job-Specific Content" : "Työkohtainen Sisältö"}</h3>
                   <p className="text-sm text-gray-600">{language === "en" ? "Tailored to the specific job description." : "Räätälöity juuri kyseiseen työpaikkaan."}</p>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                   <Shield className="w-10 h-10 text-green-600 mb-4" />
                   <h3 className="font-bold text-lg mb-2">{language === "en" ? "Honesty Check" : "Rehellisyystarkistus"}</h3>
                   <p className="text-sm text-gray-600">{language === "en" ? "AI verifies claims against your profile." : "AI tarkistaa väitteet profiiliasi vasten."}</p>
                </div>

                <div className="space-y-4 sm:space-y-6">
                  
                  <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                     <FileText className="w-10 h-10 text-purple-600 mb-4" />
                     <h3 className="font-bold text-lg mb-2">{language === "en" ? "Professional PDF Export" : "Ammattimainen PDF-Vienti"}</h3>
                     <p className="text-sm text-gray-600">{language === "en" ? "Download your CVs and cover letters as professional PDF files for easy sharing." : "Lataa CV:t ja hakukirjeet ammattimaisina PDF-tiedostoina helppoa jakamista varten."}</p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-200 shadow-none relative overflow-hidden group">
                     <div className="absolute top-3 right-3 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider z-10 shadow-sm">
                        {language === "en" ? "Coming Soon" : "Tulossa Pian"}
                     </div>
                     <div className="grayscale opacity-50 group-hover:opacity-60 transition-opacity">
                        <FileEdit className="w-10 h-10 text-gray-500 mb-4" />
                        <h3 className="font-bold text-lg mb-2">{language === "en" ? "Professional Templates" : "Ammattimaiset Pohjat"}</h3>
                        <p className="text-sm text-gray-600">{language === "en" ? "Multiple professional CV and cover letter templates to choose from." : "Useita ammattimaisia CV- ja hakukirjepohjia valittavana."}</p>
                     </div>
                     <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,0.03)_10px,rgba(0,0,0,0.03)_20px)] pointer-events-none rounded-3xl"></div>
                  </div>
                </div>
             </div>
          </div>

      
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 border-2 border-orange-200 shadow-2xl mb-16">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "Simple, Transparent Pricing" : "Yksinkertainen, Läpinäkyvä Hinnoittelu"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700">
                {language === "en" ? "Start free - upgrade when you need more" : "Aloita ilmaiseksi - päivitä kun tarvitset enemmän"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border-2 border-gray-200 shadow-lg flex flex-col">
                <h3 className="text-xl font-bold mb-2">{language === "en" ? "Free" : "Ilmainen"}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">0€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/month" : "/kk"}</span>
                </div>
                <div className="bg-gray-100 p-2 rounded text-xs text-center font-medium mb-4 text-gray-600">
                  {language === "en" ? "Risk Free Trial" : "Riskitön Kokeilu"}
                </div>
                <ul className="space-y-3 mb-6 text-sm flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-semibold text-gray-900">{language === "en" ? "1 Free CV" : "1 Ilmainen CV"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "1 General Letter" : "1 Yleinen Kirje"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Save Profile Data" : "Profiilitiedot tallennetaan"}</span>
                  </li>
                  <li className="flex items-start gap-2 opacity-50">
                    <Ban className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>No Job Specific / ATS</span>
                  </li>
                </ul>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline" className="w-full border-gray-300 hover:bg-gray-100">
                      {language === "en" ? "Start Free" : "Aloita"}
                    </Button>
                  </SignInButton>
                </SignedOut>
              </div>

              <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border-2 border-blue-200 shadow-lg flex flex-col">
                <h3 className="text-xl font-bold mb-2 text-blue-900">Basic</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">4.99€</span>
                  <span className="text-gray-600 text-sm">{language === "en" ? "/month" : "/kk"}</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Unlimited CVs" : "Rajattomat CV:t"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Unlimited Letters" : "Rajattomat Kirjeet"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{language === "en" ? "Job-Specific Letters" : "Työpaikkakohtaiset Kirjeet"}</span>
                  </li>
                  <li className="flex items-start gap-2 opacity-50">
                    <Ban className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>No ATS Optimization</span>
                  </li>
                </ul>
                <Link href="/pricing">
                  <Button className="w-full bg-blue-100 text-blue-700 hover:bg-blue-200">
                    {language === "en" ? "Choose Basic" : "Valitse Basic"}
                  </Button>
                </Link>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl sm:rounded-3xl p-6 border-2 border-yellow-400 shadow-2xl relative scale-105 z-10 flex flex-col">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md whitespace-nowrap">
                  {language === "en" ? "Recommended" : "Suosittelemme"}
                </div>
                <h3 className="text-xl font-bold mb-2 text-amber-900">Semi-Pro</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold text-amber-900">9.99€</span>
                  <span className="text-amber-700 text-sm">{language === "en" ? "/month" : "/kk"}</span>
                </div>
                <ul className="space-y-3 mb-6 text-sm flex-1">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold">{language === "en" ? "Everything in Basic" : "Kaikki Basicissä"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold">{language === "en" ? "ATS Optimized CVs" : "ATS-optimoidut CV:t"}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="font-bold">{language === "en" ? "ATS Optimized Letters" : "ATS-optimoidut Kirjeet"}</span>
                  </li>
                </ul>
                <Link href="/pricing">
                  <Button className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg">
                    {language === "en" ? "Choose Semi-Pro" : "Valitse Semi-Pro"}
                  </Button>
                </Link>
              </div>
          <div className="bg-white rounded-2xl sm:rounded-3xl p-6 border-2 border-purple-200 shadow-lg flex flex-col">
            <h3 className="text-xl font-bold mb-2 text-purple-900 flex items-center gap-2">
              Pro <Crown className="w-4 h-4 text-purple-600" />
            </h3>
            <div className="mb-4">
              <span className="text-3xl font-bold">15.99€</span>
              <span className="text-gray-600 text-sm">{language === "en" ? "/month" : "/kk"}</span>
            </div>
            <ul className="space-y-3 mb-6 text-sm flex-1">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <span>{language === "en" ? "Everything in Semi-Pro" : "Kaikki Semi-Prossa"}</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                <span className="font-bold text-purple-900">{language === "en" ? "RAG Expert Database" : "RAG-Eksperttitietokanta"}</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-purple-600 font-medium bg-purple-50 p-1 rounded">
                 {language === "en" ? "Maximum Impact" : "Maksimaalinen Vaikutus"}
              </li>
            </ul>
            <Link href="/pricing">
              <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                {language === "en" ? "Choose Pro" : "Valitse Pro"}
              </Button>
            </Link>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-8">
           {language === "en" ? "Cancel anytime • No credit card required for free plan" : "Peruuta milloin vain • Ei luottokorttia ilmaisessa paketissa"}
        </p>
      </div>
      <div className="bg-gradient-to-r from-orange-600 to-purple-600 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 lg:p-16 text-center text-white shadow-2xl">
        <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-4 sm:mb-6">
          {language === "en" ? "Ready to Save Hours?" : "Valmis Säästämään Tunteja?"}
        </h2>
        <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-orange-100 max-w-2xl mx-auto">
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

        <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-orange-100">
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
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-purple-50 to-pink-100">

      {showProfilePrompt && profileCompleted === false && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/90 border-2 border-white/40 rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowProfilePrompt(false)}
              className="absolute top-4 right-4 hover:bg-gray-100 rounded-full p-1"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>

            <User className="h-16 w-16 mx-auto mb-4 text-orange-600" />
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
                <Button className="w-full bg-gradient-to-r from-orange-600 to-purple-600">
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
        <div className="mb-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl sm:rounded-[2rem] shadow-2xl p-6 sm:p-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-600 to-purple-600 bg-clip-text text-transparent mb-2">
            {language === "en"
              ? `Welcome${displayName ? `, ${displayName}` : ""}!`
              : `Tervetuloa${displayName ? `, ${displayName}` : ""}!`}
          </h1>
<p className="text-gray-700 text-base sm:text-lg">
  {tier === "free"
    ? language === "en"
      ? "Free user - 1 free CV + 1 general cover letter"
      : "Ilmainen käyttäjä - 1 ilmainen CV + 1 yleinen hakukirje"
    : `${tier.toUpperCase()}-${language === "en" ? "user" : "käyttäjä"}`}
</p>
        </div>

          {tier === "free" && hasUsedFreeCv && (
          <div className="mb-8 backdrop-blur-xl bg-gradient-to-r from-yellow-100 to-amber-100 border-2 border-yellow-300 rounded-3xl sm:rounded-[2rem] shadow-2xl p-6 sm:p-8">
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
          <HowItWorksTimeline />

        <div className="grid mt-6 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          {canCreateCV ? (
            <Link href="/create-cv">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl sm:rounded-3xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
                <FileText className="h-10 w-10 sm:h-12 sm:w-12 text-orange-600 mb-4" />
                <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-4">
{isPaid
  ? language === "en"
    ? "Unlimited ATS-optimized CVs"
    : "Rajattomat ATS-optimoidut CV:t"
  : language === "en"
  ? "Free personality-driven CV (Basic)"
  : "Ilmainen persoonallisuusvetoinen CV (Basic)"}
                </p>
                <Button className="w-full bg-gradient-to-r from-orange-600 to-purple-600">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </Button>
              </div>
            </Link>
          ) : (
            <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl sm:rounded-3xl shadow-xl p-6 opacity-60">
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

          <Link href="/create-cover-letter">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl sm:rounded-3xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <FileInput className="h-10 w-10 sm:h-12 sm:w-12 text-green-600 mb-4" />
              <h3 className="font-bold text-lg sm:text-xl mb-2 text-gray-900">
                {language === "en" ? "Create Cover Letter" : "Luo Hakukirje"}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mb-4">
{isPaid
  ? language === "en"
    ? "Unlimited ATS-optimized letters"
    : "Rajattomat ATS-optimoidut kirjeet"
  : language === "en"
  ? "1 general letter (Basic)"
  : "1 yleinen hakukirje (Basic)"}
              </p>
              <Button className="w-full bg-gradient-to-r from-green-600 to-emerald-600">
                {language === "en" ? "Create Letter" : "Luo Kirje"}
              </Button>
            </div>
          </Link>

          <Link href="/profile">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl sm:rounded-3xl shadow-xl p-6 hover:shadow-2xl hover:scale-105 transition-all cursor-pointer">
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

        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl sm:rounded-[2rem] shadow-2xl p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 flex items-center gap-2 text-gray-900">
            <Files className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
            {language === "en" ? "My Documents" : "Omat Dokumentit"}
          </h2>

          <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <Link href="/my-cvs">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-orange-50 rounded-xl sm:rounded-2xl hover:bg-orange-100 transition-all mb-3 sm:mb-4 cursor-pointer">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                    <span className="font-bold text-gray-900 text-sm sm:text-base">
                      {language === "en" ? "My CVs" : "Omat CV:t"}
                    </span>
                    {recentCVs.length > 0 && (
                      <span className="bg-orange-200 px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold">
                        {recentCVs.length}
                      </span>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
                </div>
              </Link>

              {loadingRecent ? (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin h-6 w-6 sm:h-8 sm:w-8 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
                </div>
              ) : recentCVs.length > 0 ? (
                <div className="space-y-2">
                  {recentCVs.map((cv: any) => (
                    <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                      <div className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-orange-300">
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

            <div>
              <Link href="/my-cover-letters">
                <div className="flex items-center justify-between p-3 sm:p-4 bg-green-50 rounded-xl sm:rounded-2xl hover:bg-green-100 transition-all mb-3 sm:mb-4 cursor-pointer">
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
                      <div className="p-3 sm:p-4 bg-white rounded-xl sm:rounded-2xl hover:shadow-md transition-all border-2 border-gray-200 hover:border-green-300">
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

      <footer className="py-8 text-center text-gray-500 border-t border-orange-100 bg-white/70 backdrop-blur-xl mt-12 mx-4 sm:mx-6 lg:mx-8 rounded-3xl">
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