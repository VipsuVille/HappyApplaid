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
  <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-50 via-white to-pink-50 font-sans text-slate-900">
    
    {/* --- PROFIILI MODAALI (Raikastettu) --- */}
    {showProfilePrompt && profileCompleted === false && (
      <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="backdrop-blur-2xl bg-white/95 border border-white rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-300">
          <button
            onClick={() => setShowProfilePrompt(false)}
            className="absolute top-6 right-6 hover:bg-orange-50 rounded-full p-2 transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>

          <div className="bg-orange-100 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner">
            <User className="h-10 w-10 text-orange-600" />
          </div>

          <h3 className="text-2xl font-black text-center mb-3 text-slate-900 tracking-tight">
            {language === "en" ? `Hey, ${displayName}!` : `Hei, ${displayName}!`}
          </h3>
          <p className="text-center text-slate-600 mb-8 leading-relaxed">
            {language === "en"
              ? "We recommend filling out your profile to get the best results."
              : "Suosittelemme profiilin täyttämistä, jotta saat parhaan hyödyn tekoälystämme."}
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/profile" className="w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:shadow-orange-200 shadow-lg rounded-2xl border-none text-white font-bold transition-transform active:scale-95">
                {language === "en" ? "Fill Profile" : "Täytä Profiili"}
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowProfilePrompt(false)}
              className="w-full h-12 rounded-2xl text-slate-400 hover:text-slate-600 hover:bg-slate-100/50"
            >
              {language === "en" ? "Maybe later" : "Ehkä myöhemmin"}
            </Button>
          </div>
        </div>
      </div>
    )}

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* --- TERVEHDYS (Ilmava ja kirkas) --- */}
      <div className="mb-10 backdrop-blur-xl bg-white/70 border border-white/60 rounded-[2.5rem] shadow-xl shadow-orange-100/30 p-8 sm:p-12 relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-200/20 blur-3xl rounded-full"></div>
        
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-orange-600 via-pink-500 to-orange-500 bg-clip-text text-transparent mb-4 tracking-tight">
          {language === "en"
            ? `Welcome back${displayName ? `, ${displayName}` : ""}!`
            : `Tervetuloa takaisin${displayName ? `, ${displayName}` : ""}!`}
        </h1>
        <div className="flex items-center gap-3">
           <span className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest ${tier === 'free' ? 'bg-slate-100 text-slate-500' : 'bg-orange-100 text-orange-600'}`}>
              {tier === "free"
                ? language === "en" ? "Free Member" : "Ilmaisjäsen"
                : tier.toUpperCase()}
           </span>
           <p className="text-slate-500 text-sm font-medium italic">
            {tier === "free" && (
                language === "en" ? "• 1 CV + 1 Letter remaining" : "• 1 CV + 1 hakukirje jäljellä"
            )}
           </p>
        </div>
      </div>

      {/* --- UPGRADE BANNERI (Ei mustaa, käytetään värejä) --- */}
      {tier === "free" && hasUsedFreeCv && (
        <div className="mb-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-[2.5rem] shadow-2xl p-1 shadow-orange-200">
          <div className="bg-white/90 backdrop-blur-sm rounded-[2.4rem] p-8 flex flex-col items-center relative overflow-hidden">
            <div className="bg-orange-100 p-4 rounded-2xl mb-4">
              <Crown className="h-8 w-8 text-orange-600 animate-bounce" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2">
              {language === "en" ? "Ready for the next step?" : "Valmis seuraavaan askeleeseen?"}
            </h2>
            <p className="text-center text-slate-600 mb-8 max-w-md leading-relaxed">
              {language === "en"
                ? "Upgrade to Premium to get unlimited access and ATS-optimization."
                : "Päivitä Premium-tiliin saadaksesi rajattomat työkalut ja ATS-optimoinnin."}
            </p>
            <Link href="/pricing" className="w-full sm:w-auto">
              <Button className="px-10 h-14 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-2xl font-bold transition-all hover:scale-105 shadow-lg shadow-orange-200 border-none">
                <Crown className="w-5 h-5 mr-2" />
                {language === "en" ? "Upgrade Now" : "Päivitä nyt"}
              </Button>
            </Link>
          </div>
        </div>
      )}

      <HowItWorksTimeline />

      {/* --- TOIMINNOT (Valkoiset lasikortit) --- */}
      <div className="grid mt-10 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        
        {/* CV KORTTI */}
        {canCreateCV ? (
          <Link href="/create-cv" className="group">
            <div className="h-full bg-white/80 border border-white rounded-[2.5rem] shadow-lg shadow-slate-200/50 p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="bg-orange-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10">
                <FileText className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="font-black text-2xl mb-2 text-slate-900 relative z-10 tracking-tight">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-sm text-slate-500 mb-8 leading-relaxed relative z-10">
                {isPaid
                  ? language === "en" ? "Unlimited ATS-optimized CVs." : "Rajattomat ATS-optimoidut CV:t."
                  : language === "en" ? "Try our basic CV builder for free." : "Kokeile ilmaista CV-työkaluamme."}
              </p>
              <Button className="w-full h-12 bg-slate-900 hover:bg-slate-800 rounded-xl font-bold text-white transition-colors relative z-10">
                {language === "en" ? "Get Started" : "Aloita tästä"}
              </Button>
            </div>
          </Link>
        ) : (
          <div className="h-full bg-slate-50/50 border border-slate-200 rounded-[2.5rem] p-8 opacity-70">
            <div className="bg-slate-200 w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-slate-400 tracking-tight">{language === "en" ? "Create CV" : "Luo CV"}</h3>
            <p className="text-sm text-slate-400 mb-8">{language === "en" ? "Free limit reached." : "Ilmainen CV käytetty."}</p>
            <Link href="/pricing">
              <Button variant="outline" className="w-full h-12 rounded-xl border-2 border-slate-200 font-bold text-slate-400">
                {language === "en" ? "Upgrade" : "Päivitä"}
              </Button>
            </Link>
          </div>
        )}

        {/* HAKUKIRJE KORTTI */}
        <Link href="/create-cover-letter" className="group">
          <div className="h-full bg-white/80 border border-white rounded-[2.5rem] shadow-lg shadow-slate-200/50 p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <FileInput className="h-8 w-8 text-emerald-600" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-slate-900 relative z-10 tracking-tight">
              {language === "en" ? "Cover Letter" : "Hakukirje"}
            </h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed relative z-10">
               {isPaid
                ? language === "en" ? "Craft letters for every job application." : "Luo kirje jokaiseen työpaikkaan."
                : language === "en" ? "1 general letter to get you started." : "1 yleinen hakukirje alkuun."}
            </p>
            <Button className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-white transition-colors relative z-10">
              {language === "en" ? "Write Now" : "Kirjoita heti"}
            </Button>
          </div>
        </Link>

        {/* PROFIILI KORTTI */}
        <Link href="/profile" className="group">
          <div className="h-full bg-white/80 border border-white rounded-[2.5rem] shadow-lg shadow-slate-200/50 p-8 group-hover:shadow-2xl group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500"></div>
            <div className="bg-amber-100 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative z-10">
              <User className="h-8 w-8 text-amber-600" />
            </div>
            <h3 className="font-black text-2xl mb-2 text-slate-900 relative z-10 tracking-tight">
              {language === "en" ? "Profile" : "Profiili"}
            </h3>
            <p className="text-sm text-slate-500 mb-8 leading-relaxed relative z-10">
               {language === "en" ? "Keep your experience details up to date." : "Pidä työkokemuksesi ajan tasalla."}
            </p>
            <Button variant="outline" className="w-full h-12 rounded-xl border-2 border-amber-200 text-amber-600 font-bold hover:bg-amber-50 transition-colors relative z-10">
              {language === "en" ? "Edit Details" : "Muokkaa tietoja"}
            </Button>
          </div>
        </Link>
      </div>

      {/* --- DOKUMENTTILISTAUS (Puhdas ja selkeä) --- */}
      <div className="bg-white/60 backdrop-blur-md border border-white rounded-[2.5rem] shadow-xl p-8 sm:p-10">
        <h2 className="text-2xl font-black flex items-center gap-3 text-slate-900 mb-10 tracking-tight">
          <Files className="h-7 w-7 text-orange-600" />
          {language === "en" ? "Recent Documents" : "Viimeisimmät dokumentit"}
        </h2>

        <div className="grid md:grid-cols-2 gap-10">
          {/* CV-lista */}
          <div>
            <Link href="/my-cvs" className="flex items-center justify-between mb-6 group">
              <h3 className="font-bold text-slate-400 group-hover:text-orange-600 transition-colors uppercase tracking-widest text-xs">
                {language === "en" ? "Curriculum Vitae" : "Ansioluettelot"}
              </h3>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="space-y-3">
              {loadingRecent ? (
                 <div className="animate-pulse flex space-y-3 flex-col">
                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                    <div className="h-16 bg-slate-100 rounded-2xl"></div>
                 </div>
              ) : recentCVs.length > 0 ? (
                recentCVs.map((cv: any) => (
                  <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                    <div className="p-4 bg-white border border-slate-100 hover:border-orange-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                          {cv.content?.personalInfo?.name || cv.title || (language === "en" ? "Untitled CV" : "Nimetön CV")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                          {new Date(cv.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                   <p className="text-slate-400 text-sm">{language === "en" ? "No CVs found" : "Ei löytyneitä CV:itä"}</p>
                </div>
              )}
            </div>
          </div>

          {/* Kirjeet */}
          <div>
            <Link href="/my-cover-letters" className="flex items-center justify-between mb-6 group">
              <h3 className="font-bold text-slate-400 group-hover:text-emerald-600 transition-colors uppercase tracking-widest text-xs">
                {language === "en" ? "Cover Letters" : "Hakukirjeet"}
              </h3>
              <ChevronRight className="h-4 w-4 text-slate-300 group-hover:translate-x-1 transition-transform" />
            </Link>
            <div className="space-y-3">
              {recentCoverLetters.length > 0 ? (
                recentCoverLetters.map((letter: any) => (
                  <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                    <div className="p-4 bg-white border border-slate-100 hover:border-emerald-200 rounded-2xl shadow-sm hover:shadow-md transition-all flex justify-between items-center group">
                      <div>
                        <p className="font-bold text-slate-800 group-hover:text-emerald-600 transition-colors">
                          {letter.title || letter.job_title || (language === "en" ? "Untitled Letter" : "Nimetön Kirje")}
                        </p>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">
                           {new Date(letter.created_at).toLocaleDateString(language === "en" ? "en-US" : "fi-FI")}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="py-10 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                   <p className="text-slate-400 text-sm">{language === "en" ? "No letters found" : "Ei löytyneitä kirjeitä"}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* --- FOOTER (Kevyt) --- */}
    <footer className="py-16 text-center">
      <div className="max-w-7xl mx-auto px-4">
        <div className="w-12 h-1 bg-gradient-to-r from-orange-200 to-pink-200 mx-auto mb-8 rounded-full"></div>
        <p className="text-slate-400 text-sm font-medium">
          © {new Date().getFullYear()} HappyApplaid — {language === "en" ? "Built for your success" : "Rakennettu menestystäsi varten"}
        </p>
      </div>
    </footer>
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