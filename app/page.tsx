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
  CreditCard,
  Ban,
  MessageCircle,
  Database,
  Lightbulb,
  Play,
  Download,
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
              HERO SECTION
              =================================== */}
          <div className="mb-12 sm:mb-16">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-xl sm:shadow-2xl shadow-indigo-500/10 p-6 sm:p-12 lg:p-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>

              <div className="relative z-10 text-center">
                {/* Trust Badge */}
                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-full border border-indigo-200 shadow-sm mb-6">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
                  <span className="font-bold text-indigo-800 text-xs sm:text-sm">
                    {language === "en"
                      ? "Not Just AI. Your Digital Twin."
                      : "Ei Vain AI. Vaan Digitaalinen Kaksosesi."}
                  </span>
                </div>

                {/* Main Hook */}
                <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight px-2">
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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

                <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed mb-8 px-4">
                  {language === "en"
                    ? "Start for free with zero risk. We just need you to fill your profile so our AI knows you. You get 1 free CV and a general Cover Letter to test the quality."
                    : "Aloita ilmaiseksi ilman sitoutumista. Sinun tarvitsee vain täyttää profiilisi, jotta AI oppii tuntemaan sinut. Saat 1 ilmaisen CV:n ja yhden yleisen esittelykirjeen testataksesi laatua."}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-8 px-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all">
                        <Sparkles className="inline w-5 h-5 mr-2" />
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
                    className="w-full sm:w-auto px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg border-2 border-indigo-200 hover:bg-indigo-50 transition-all"
                  >
                    {language === "en"
                      ? "See How It Works"
                      : "Katso Miten Ohjelma Toimii"}
                  </Button>
                </div>

                {/* Key Selling Points - Mobile Optimized */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm text-gray-700 max-w-3xl mx-auto px-4 font-medium">
                  <div className="flex items-center justify-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-indigo-100 shadow-sm">
                    <CreditCard className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "No credit card required"
                        : "Ei vaadi luottokorttia"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-indigo-100 shadow-sm">
                    <Clock className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    <span>
                      {language === "en"
                        ? "10-15min setup"
                        : "10-15min asennus"}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 bg-white/60 px-3 py-2 rounded-xl border border-indigo-100 shadow-sm">
                    <Check className="w-4 h-4 text-green-600 flex-shrink-0" />
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
              CORE DIFFERENCE: PERSONALITY
              =================================== */}
          <div className="mb-16 sm:mb-20">
             <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 rounded-3xl p-6 sm:p-12 md:p-16 text-white shadow-2xl relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 w-64 sm:w-96 h-64 sm:h-96 bg-purple-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="absolute bottom-0 left-0 w-64 sm:w-96 h-64 sm:h-96 bg-indigo-500/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
                
                <div className="relative z-10 max-w-4xl mx-auto">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-white/10 rounded-full border border-white/20 mb-6 backdrop-blur-sm">
                    <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-pink-300" />
                    <span className="font-bold text-indigo-100 tracking-wide uppercase text-xs sm:text-sm">
                      {language === "en" ? "Not Just AI" : "Ei Vain AI"}
                    </span>
                  </div>
                  
                  <h2 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
                    {language === "en" 
                      ? "Your Digital Twin." 
                      : "Sinun Digitaalinen Kaksosesi."}
                  </h2>
                  
                  <p className="text-base sm:text-lg md:text-xl text-indigo-100 mb-8 leading-relaxed">
                    {language === "en"
                      ? "Most AI tools generate generic, robotic text that recruiters spot instantly. Our unique engine analyzes your profile, your strengths, working style, and values—and writes in YOUR unique voice."
                      : "Useimmat AI-työkalut luovat geneeristä tekstiä, jonka rekrytoijat tunnistavat heti. Meidän ainutlaatuinen ohjelmamme analysoi profiilisi psygolokisesti – vahvuutesi, työtapasi ja arvosi – ja kirjoittaa SINUN ainutlaatuisella äänelläsi."}
                  </p>

                  <div className="grid md:grid-cols-2 gap-4 sm:gap-6 text-left">
                    <div className="bg-white/10 p-5 sm:p-6 rounded-2xl border border-white/10 backdrop-blur-sm">
                      <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2">
                        <X className="w-5 h-5 text-red-400" /> 
                        Generic AI (ChatGPT etc.)
                      </h3>
                      <p className="text-sm text-gray-300 italic">
                        "I am a hard working individual who is motivated to succeed in this role..."
                      </p>
                    </div>
                    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-5 sm:p-6 rounded-2xl border border-green-500/30 backdrop-blur-sm">
                      <h3 className="font-bold text-base sm:text-lg mb-2 flex items-center gap-2 text-green-300">
                        <Check className="w-5 h-5" /> 
                        HappyApplaid
                      </h3>
                      <p className="text-sm text-indigo-100 italic">
                        {language === "en" 
                          ? "\"My problem-solving approach relies on deep analysis, which helped me lead the X project...\""
                          : "\"Ongelmanratkaisutyylini perustuu syvälliseen analyysiin, mikä auttoi minua johtamaan X-projektia...\""}
                      </p>
                    </div>
                  </div>
                </div>
             </div>
          </div>

          {/* ===================================
              VIDEO DEMO (COMING SOON)
              =================================== */}
          <div id="how-it-works" className="scroll-mt-24 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xl mb-16 relative overflow-hidden group">
             <div className="text-center mb-8">
               <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                 {language === "en" ? "See It In Action" : "Katso Kuinka Ohjelma Toimii"}
               </h2>
               <p className="text-gray-600 text-sm sm:text-base">
                 {language === "en" ? "Watch a short demo of the process" : "Katso lyhyt demo prosessista"}
               </p>
             </div>
             
             {/* Video Placeholder / Coming Soon */}
             <div className="relative aspect-video bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center border border-gray-200">
               {/* Coming Soon Overlay */}
               <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20">
                 <div className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-lg sm:text-xl shadow-2xl transform rotate-0 sm:-rotate-3 border-2 border-indigo-400">
                   {language === "en" ? "Video Coming Soon!" : "Video Tulossa Pian!"}
                 </div>
               </div>
               
               {/* Fake Play Button behind overlay */}
               <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white/20 rounded-full flex items-center justify-center">
                 <Play className="w-8 h-8 sm:w-10 sm:h-10 text-white ml-1 opacity-50" />
               </div>
             </div>
          </div>

          {/* ===================================
              SMART FEATURES (AI QUESTIONS & RAG)
              =================================== */}
          <div className="grid md:grid-cols-2 gap-6 sm:gap-8 mb-16 sm:mb-20">
            {/* Feature: Smart Questions */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-indigo-100 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
                {language === "en" ? "AI That Grows With You" : "AI Joka Kasvaa Kanssasi"}
              </h3>
              <p className="text-gray-700 mb-6 text-sm sm:text-base">
                {language === "en"
                  ? "If our AI needs more info for a specific job, it asks you smart questions. It learns from your answers and saves them to your profile—so you never have to repeat yourself."
                  : "Jos AI tarvitsee lisätietoja tiettyyn työhön, se kysyy älykkäitä kysymyksiä. Se oppii vastauksistasi ja tallentaa ne profiiliisi – jotta sinun ei tarvitse koskaan toistaa itseäsi."}
              </p>
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" />
                  {language === "en" ? "Result:" : "Tulos:"}
                </p>
                <p className="text-sm text-indigo-700 mt-1">
                  {language === "en"
                    ? "Your profile gets smarter with every application."
                    : "Profiilisi viisastuu jokaisen hakemuksen myötä."}
                </p>
              </div>
            </div>

            {/* Feature: RAG Expert Knowledge */}
            <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-purple-100 shadow-lg hover:shadow-xl transition-all">
              <div className="bg-purple-100 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center mb-6">
                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                {language === "en" ? "Built-in HR Consultant" : "Sisäänrakennettu HR-Konsultti"}
                <span className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded-full border border-purple-300">Pro</span>
              </h3>
              <p className="text-gray-700 mb-6 text-sm sm:text-base">
                {language === "en"
                  ? "Our Pro AI reads real recruitment articles and HR guides from our database before writing. It's like having an expert check your application."
                  : "Pro AI:mme lukee tietokannastamme oikeita rekrytointiartikkeleita ja HR-oppaita ennen kirjoittamista. Kuin asiantuntija tarkistaisi hakemuksesi."}
              </p>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
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

          {/* ===================================
              FEATURE GRID
              =================================== */}
          <div className="mb-20">
             <h2 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-8">{language === "en" ? "Everything You Need" : "Kaikki Mitä Tarvitset"}</h2>
             <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Feature 1 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                   <Target className="w-10 h-10 text-indigo-600 mb-4" />
                   <h3 className="font-bold text-lg mb-2">{language === "en" ? "Job-Specific Content" : "Työkohtainen Sisältö"}</h3>
                   <p className="text-sm text-gray-600">{language === "en" ? "Tailored to the specific job description." : "Räätälöity juuri kyseiseen työpaikkaan."}</p>
                </div>
                
                {/* Feature 2 */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                   <Shield className="w-10 h-10 text-green-600 mb-4" />
                   <h3 className="font-bold text-lg mb-2">{language === "en" ? "Honesty Check" : "Rehellisyystarkistus"}</h3>
                   <p className="text-sm text-gray-600">{language === "en" ? "AI verifies claims against your profile." : "AI tarkistaa väitteet profiiliasi vasten."}</p>
                </div>

                {/* Feature 3 - PDF EXPORT (ACTIVE) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all">
                   <Download className="w-10 h-10 text-indigo-600 mb-4" />
                   <h3 className="font-bold text-lg mb-2">{language === "en" ? "PDF Export" : "PDF-lataus"}</h3>
                   <p className="text-sm text-gray-600">{language === "en" ? "Download your CVs and letters as professional PDFs instantly." : "Lataa CV:t ja hakukirjeet ammattimaisina PDF-tiedostoina heti."}</p>
                </div>
             </div>
          </div>

          {/* ===================================
              PRICING
              =================================== */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 sm:p-12 border-2 border-indigo-200 shadow-xl mb-16">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "Simple, Transparent Pricing" : "Yksinkertainen, Läpinäkyvä Hinnoittelu"}
              </h2>
              <p className="text-base sm:text-lg text-gray-700">
                {language === "en" ? "Start free - upgrade when you need more" : "Aloita ilmaiseksi - päivitä kun tarvitset enemmän"}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto">
              {/* Free */}
              <div className="bg-white rounded-2xl p-6 border-2 border-gray-200 shadow-lg flex flex-col">
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

              {/* Basic */}
              <div className="bg-white rounded-2xl p-6 border-2 border-blue-200 shadow-lg flex flex-col">
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

              {/* Semi-Pro - RECOMMENDED */}
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-400 shadow-2xl relative scale-105 z-10 flex flex-col">
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

              {/* Pro */}
              <div className="bg-white rounded-2xl p-6 border-2 border-purple-200 shadow-lg flex flex-col">
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

          {/* ===================================
              FINAL CTA
              =================================== */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-8 sm:p-12 md:p-16 text-center text-white shadow-2xl">
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold mb-6">
              {language === "en" ? "Ready to Save Hours?" : "Valmis Säästämään Tunteja?"}
            </h2>
            <p className="text-lg md:text-xl mb-8 text-indigo-100 max-w-2xl mx-auto">
              {language === "en" 
                ? "Create your profile once. Get personalized applications forever." 
                : "Luo profiili kerran. Saa personoituja hakemuksia ikuisesti."}
            </p>

            <div className="flex justify-center mb-8">
              <SignedOut>
                <SignInButton mode="modal">
                  <Button className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-bold text-lg hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all">
                    <Sparkles className="inline w-5 h-5 mr-2" />
                    {language === "en" ? "Start Free Now" : "Aloita Ilmaiseksi"}
                  </Button>
                </SignInButton>
              </SignedOut>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm text-indigo-100">
              <div className="flex items-center gap-2">
                 <Check className="w-4 h-4" /> {language === "en" ? "No credit card" : "Ei luottokorttia"}
              </div>
              <div className="flex items-center gap-2">
                 <Check className="w-4 h-4" /> {language === "en" ? "Cancel anytime" : "Peruuta milloin vain"}
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="py-12 text-center text-gray-500 border-t border-indigo-100 bg-white/70 backdrop-blur-xl mt-16">
            <div className="max-w-7xl mx-auto px-4 text-sm">
              © {new Date().getFullYear()} HappyApplaid. {language === "en" ? "All rights reserved." : "Kaikki oikeudet pidätetään."}
            </div>
          </footer>
        </div>
      </div>
    );
  }