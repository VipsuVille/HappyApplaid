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
      <div className="min-h-screen bg-[#0a0a0c] font-sans text-gray-200 selection:bg-orange-500/30 selection:text-white relative overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-1/4 w-[600px] h-[600px] bg-orange-900/10 rounded-full blur-[120px] animate-pulse"></div>
          <div
            className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-slate-800/20 rounded-full blur-[100px] animate-pulse"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Main Hero Card with Glassmorphism */}
          <div className="mb-12 sm:mb-16">
            <div className="backdrop-blur-md bg-white/[0.03] border border-white/10 rounded-3xl sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 md:p-12 lg:p-16 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.05] via-transparent to-transparent pointer-events-none"></div>

              <div className="relative z-10 text-center">
                <div className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-white/[0.05] backdrop-blur-md rounded-full border border-orange-500/30 shadow-xl mb-4 sm:mb-6">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
                  <span className="font-bold text-orange-100/90 text-sm sm:text-base tracking-wide">
                    {language === "en"
                      ? "Not Just AI. Your Digital Twin."
                      : "Ei Vain AI. Vaan Digitaalinen Kaksosesi."}
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold mb-4 sm:mb-6 leading-tight px-2">
                  <span className="bg-gradient-to-r from-orange-300 via-orange-400 to-amber-500 bg-clip-text text-transparent">
                    {language === "en"
                      ? "Create Your Profile Once,"
                      : "Luo Profiili Kerran,"}
                  </span>
                  <br />
                  <span className="text-gray-100">
                    {language === "en"
                      ? "Get Personalized Applications Quickly"
                      : "Saa Personoituja Hakemuksia Nopeasti"}
                  </span>
                </h1>

                <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-6 sm:mb-8 px-4">
                  {language === "en"
                    ? "Start for free with zero risk. Our AI learns your unique professional voice to create high-quality CVs and Cover Letters."
                    : "Aloita ilmaiseksi ilman sitoutumista. AI oppii tuntemaan sinut ja luo laadukkaita hakemuksia juuri sinun tyylilläsi."}
                </p>

                <div className="flex mt-6 flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-10 px-4">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="w-full sm:w-auto px-8 py-6 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold text-lg shadow-lg shadow-orange-500/20 transition-all">
                        {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  <Button
                    variant="outline"
                    className="w-full sm:w-auto px-8 py-6 bg-white/5 text-gray-200 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/10 backdrop-blur-sm transition-all"
                  >
                    {language === "en" ? "See How It Works" : "Katso Miten Ohjelma Toimii"}
                  </Button>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm text-gray-400">
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <CreditCard className="w-4 h-4 text-orange-400/80" />
                    <span>{language === "en" ? "No credit card required" : "Ei vaadi luottokorttia"}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                    <Check className="w-4 h-4 text-orange-400/80" />
                    <span>{language === "en" ? "100% Secure" : "100% Turvallinen"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature Highlight Section */}
          <div className="mb-16 sm:mb-20">
            <div className="bg-gradient-to-br from-gray-900 to-black rounded-3xl sm:rounded-[2.5rem] p-8 md:p-16 border border-white/5 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-[100px]"></div>
              
              <div className="relative z-10 grid md:grid-cols-2 gap-12 items-center">
                <div className="text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 rounded-full border border-orange-500/20 mb-6">
                    <Brain className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold text-orange-300 uppercase tracking-widest">Digital Twin</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                    {language === "en" ? "Your AI, Your Voice." : "Sinun AI, Sinun Äänesi."}
                  </h2>
                  <p className="text-gray-400 text-lg leading-relaxed mb-8">
                    {language === "en" 
                      ? "Unlike generic AI, we analyze your psychological strengths and working style to ensure every word sounds like it came from you."
                      : "Toisin kuin geneerinen AI, me analysoimme vahvuutesi ja työtapasi varmistaaksemme, että jokainen sana kuulostaa sinulta."}
                  </p>
                </div>

                <div className="space-y-4">
                   <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                      <p className="text-orange-300 font-mono text-sm mb-2">HappyApplaid Engine:</p>
                      <p className="text-gray-300 italic">"My approach to project management combines analytical rigor with empathetic leadership..."</p>
                   </div>
                   <div className="bg-red-500/5 backdrop-blur-sm p-4 rounded-2xl border border-red-500/10 opacity-60">
                      <p className="text-red-400 font-mono text-xs mb-1">Standard GPT Output:</p>
                      <p className="text-gray-500 text-sm italic">"I am a hard working individual who wants to work at your company..."</p>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Free", price: "0€", color: "gray" },
              { title: "Semi-Pro", price: "9.99€", color: "orange", popular: true },
              { title: "Pro", price: "15.99€", color: "amber" }
            ].map((plan, i) => (
              <div key={i} className={`relative backdrop-blur-xl bg-white/[0.02] border ${plan.popular ? 'border-orange-500/50' : 'border-white/10'} p-8 rounded-3xl flex flex-col`}>
                {plan.popular && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-4 py-1 rounded-full text-xs font-bold">Most Popular</div>}
                <h3 className="text-xl font-bold text-white mb-2">{plan.title}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-500 ml-2">/mo</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-orange-400" /> AI-Powered Analysis
                  </li>
                  <li className="flex items-center gap-3 text-gray-400 text-sm">
                    <Check className="w-4 h-4 text-orange-400" /> Export to PDF
                  </li>
                </ul>
                <Button className={`w-full ${plan.popular ? 'bg-orange-500 hover:bg-orange-600' : 'bg-white/5 hover:bg-white/10 border border-white/10'} text-white py-6 rounded-xl`}>
                  Select Plan
                </Button>
              </div>
            ))}
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
  <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-100 via-slate-50 to-pink-100 font-sans">
    
    {/* --- PROFIILI MODAALI --- */}
    {showProfilePrompt && profileCompleted === false && (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="backdrop-blur-2xl bg-white/90 border border-white/40 rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setShowProfilePrompt(false)}
            className="absolute top-6 right-6 hover:bg-orange-50 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>

          <div className="bg-gradient-to-br from-orange-100 to-orange-200 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <User className="h-10 w-10 text-orange-600" />
          </div>

          <h3 className="text-2xl font-black text-center mb-3 text-gray-900 tracking-tight">
            {language === "en" ? `Hey, ${user?.firstName}!` : `Hei, ${user?.firstName}!`}
          </h3>
          <p className="text-center text-gray-600 mb-8 leading-relaxed">
            {language === "en"
              ? "We recommend filling out your profile to get the best results."
              : "Suosittelemme profiilin täyttämistä, jotta saat parhaan hyödyn tekoälystämme."}
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/profile" className="w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95 border-none text-white font-bold">
                {language === "en" ? "Fill Profile" : "Täytä Profiili"}
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowProfilePrompt(false)}
              className="w-full h-12 rounded-2xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/50"
            >
              {language === "en" ? "Maybe later" : "Ehkä myöhemmin"}
            </Button>
          </div>
        </div>
      </div>
    )}

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* --- TERVEHDYS OSA --- */}
      <div className="mb-10 backdrop-blur-xl bg-white/60 border border-white/40 rounded-[2.5rem] shadow-xl shadow-orange-100/50 p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-200/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
        
        <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-orange-600 via-orange-500 to-pink-500 bg-clip-text text-transparent mb-3 tracking-tight">
          {language === "en"
            ? `Welcome${displayName ? `, ${displayName}` : ""}!`
            : `Tervetuloa${displayName ? `, ${displayName}` : ""}!`}
        </h1>
        <div className="flex items-center gap-2">
           <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${tier === 'free' ? 'bg-slate-200 text-slate-600' : 'bg-orange-100 text-orange-600'}`}>
              {tier === "free"
                ? language === "en" ? "Free Member" : "Ilmaisjäsen"
                : tier.toUpperCase()}
           </span>
           <p className="text-gray-500 text-sm sm:text-base font-medium">
            {tier === "free" && (
                language === "en" ? "• 1 CV + 1 Letter included" : "• Sisältää 1 CV:n + 1 hakukirjeen"
            )}
           </p>
        </div>
      </div>

      {/* --- UPGRADE BANNERI --- */}
      {tier === "free" && hasUsedFreeCv && (
        <div className="mb-10 backdrop-blur-xl bg-gradient-to-br from-amber-50 to-orange-100 border border-amber-200 rounded-[2.5rem] shadow-xl p-8 flex flex-col items-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="bg-white/80 p-4 rounded-2xl shadow-sm mb-4 relative z-10">
            <Crown className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3 relative z-10">
            {language === "en" ? "Unlock Your Full Potential" : "Avaa täydet ominaisuudet"}
          </h2>
          <p className="text-center text-gray-600 mb-8 max-w-md relative z-10 leading-relaxed">
            {language === "en"
              ? "Upgrade to Premium to create unlimited ATS-optimized documents and stand out from the crowd."
              : "Päivitä Premium-tiliin ja luo rajattomasti ATS-optimoituja dokumentteja ilman rajoituksia."}
          </p>
          <Link href="/pricing" className="relative z-10 w-full sm:w-auto">
            <Button className="px-10 h-14 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-105 shadow-xl">
              <Crown className="w-5 h-5 text-amber-400" />
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
            <div className="h-full backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-black text-2xl mb-2 text-gray-900 tracking-tight">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-sm text-gray-500 mb-8 leading-relaxed">
                {isPaid
                  ? language === "en" ? "Unlimited ATS-optimized CVs for your dream job." : "Rajattomat ATS-optimoidut CV:t unelmaduuniisi."
                  : language === "en" ? "Try our personality-driven basic template." : "Kokeile persoonallisuusvetoista pohjaamme."}
              </p>
              <Button className="w-full h-12 bg-orange-600 hover:bg-orange-700 rounded-xl font-bold shadow-lg shadow-orange-100 transition-colors">
                {language === "en" ? "Start Now" : "Aloita heti"}
              </Button>
            </div>
          </Link>
        ) : (
          <div className="h-full backdrop-blur-xl bg-gray-50/50 border border-gray-200 rounded-[2rem] p-8 opacity-80 relative">
            <Lock className="absolute top-8 right-8 h-6 w-6 text-gray-400" />
            <div className="bg-gray-200 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-400 tracking-tight">
              {language === "en" ? "Create CV" : "Luo CV"}
            </h3>
            <p className="text-sm text-gray-500 mb-8">
              {language === "en" ? "Free CV already used. Upgrade to create more!" : "Ilmainen CV jo käytetty. Päivitä luodaksesi lisää!"}
            </p>
            <Link href="/pricing">
              <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-bold border-gray-200 hover:bg-gray-50">
                {language === "en" ? "Upgrade" : "Päivitä"}
              </Button>
            </Link>
          </div>
        )}

        {/* HAKUKIRJE KORTTI */}
        <Link href="/create-cover-letter" className="group">
          <div className="h-full backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <FileInput className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-900 tracking-tight">
              {language === "en" ? "Cover Letter" : "Hakukirje"}
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {isPaid
                ? language === "en" ? "Craft compelling letters for every application." : "Luo vakuuttavat kirjeet jokaiseen hakuun."
                : language === "en" ? "1 general letter to get you started." : "1 yleinen hakukirje aloittamiseen."}
            </p>
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold shadow-lg shadow-emerald-100 transition-colors text-white">
              {language === "en" ? "Write Letter" : "Kirjoita kirje"}
            </Button>
          </div>
        </Link>

        {/* PROFIILI KORTTI */}
        <Link href="/profile" className="group">
          <div className="h-full backdrop-blur-xl bg-white/70 border border-white/40 rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300">
            <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <User className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-gray-900 tracking-tight">
              {language === "en" ? "Your Profile" : "Profiili"}
            </h3>
            <p className="text-sm text-gray-500 mb-8 leading-relaxed">
              {language === "en" ? "Keep your info updated for better AI generation." : "Pidä tiedot ajan tasalla parasta tulosta varten."}
            </p>
            <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-bold border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
              {language === "en" ? "Edit Profile" : "Muokkaa profiilia"}
            </Button>
          </div>
        </Link>
      </div>

      {/* --- OMAT DOKUMENTIT --- */}
      <div className="backdrop-blur-xl bg-white/60 border border-white/40 rounded-[2.5rem] shadow-xl p-8 sm:p-10">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-black flex items-center gap-3 text-gray-900 tracking-tight">
            <Files className="h-7 w-7 text-orange-600" />
            {language === "en" ? "My Documents" : "Omat Dokumentit"}
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* CV-lista */}
          <div className="space-y-4">
            <Link href="/my-cvs" className="flex items-center justify-between p-5 bg-orange-100/50 hover:bg-orange-100 rounded-[1.5rem] transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
                <span className="font-black text-gray-900">{language === "en" ? "My CVs" : "Omat CV:t"}</span>
                {recentCVs.length > 0 && (
                  <span className="bg-orange-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCVs.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-3 min-h-[100px]">
              {loadingRecent ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-4 border-orange-600 border-t-transparent rounded-full"></div></div>
              ) : recentCVs.length > 0 ? (
                recentCVs.map((cv: any) => (
                  <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                    <div className="p-4 bg-white/50 border border-white hover:border-orange-200 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-sm text-gray-900 group-hover:text-orange-600 transition-colors">
                          {cv.content?.personalInfo?.name || cv.title || (language === "en" ? "Unnamed CV" : "Nimetön CV")}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mt-1 tracking-wider">
                          {new Date(cv.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm py-6 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                  {language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}
                </p>
              )}
            </div>
          </div>

          {/* Kirje-lista */}
          <div className="space-y-4">
            <Link href="/my-cover-letters" className="flex items-center justify-between p-5 bg-emerald-100/50 hover:bg-emerald-100 rounded-[1.5rem] transition-all group">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-lg shadow-sm">
                  <FileInput className="h-5 w-5 text-emerald-600" />
                </div>
                <span className="font-black text-gray-900">{language === "en" ? "Cover Letters" : "Hakukirjeet"}</span>
                {recentCoverLetters.length > 0 && (
                  <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCoverLetters.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-3 min-h-[100px]">
              {loadingRecent ? (
                <div className="flex justify-center py-10"><div className="animate-spin h-6 w-6 border-4 border-emerald-600 border-t-transparent rounded-full"></div></div>
              ) : recentCoverLetters.length > 0 ? (
                recentCoverLetters.map((letter: any) => (
                  <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                    <div className="p-4 bg-white/50 border border-white hover:border-emerald-200 hover:bg-white rounded-2xl transition-all shadow-sm hover:shadow-md flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">
                          {letter.title || letter.job_title || (language === "en" ? "Unnamed Letter" : "Nimetön Kirje")}
                        </p>
                        <p className="text-[10px] text-gray-400 uppercase font-bold mt-1 tracking-wider">
                          {new Date(letter.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="text-center text-gray-400 text-sm py-6 bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
                  {language === "en" ? "No letters yet" : "Ei vielä kirjeitä"}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* --- FOOTER --- */}
    <footer className="py-12 text-center text-gray-400 mt-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="h-px bg-gradient-to-r from-transparent via-orange-200 to-transparent mb-8"></div>
        <p className="text-sm font-medium tracking-wide">
          © {new Date().getFullYear()} HappyApplaid.{" "}
          {language === "en" ? "Crafted with love for your career." : "Rakkaudella luotu urallesi."}
        </p>
      </div>
    </footer>
  </div>
);
}