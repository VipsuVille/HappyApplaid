/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser, SignInButton, SignedOut } from "@clerk/nextjs";
import {
  FileText, User, Files, Check, Sparkles, Target, Zap,
  Crown, Lock, X, Play, ChevronRight, Database, Shield, Brain, FileInput
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import SmartHeader from "@/components/ui/smartHeader";
import { PRICING } from "@/lib/pricing";

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
      />
    </div>
  );
}


   // ✅ Pitäisi olla (alkuperäisen mukaan):
   <div className="h-8 w-8 sm:h-10 sm:w-10 mr-2 sm:mr-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
     <FileText className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
   </div>



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

// 2. Korjaa OnboardingSteps
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
}// ========================================
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

        {/* Hero Section */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div className="text-center mb-16">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-12 md:p-16 backdrop-saturate-150 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 backdrop-blur-sm border border-white/40 shadow-lg shadow-indigo-500/10 mb-6">
                  <Sparkles className="w-5 h-5 text-indigo-700" />
                  <span className="text-sm font-extrabold text-indigo-800 uppercase tracking-wider">
                    {language === "en" ? "AI-Powered Career Tools" : "Tekoälyavusteinen Uratyökalu"}
                  </span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-6">
                  {language === "en" ? "Land Your Dream Job" : "Saa Unelmiesi Työ"}
                </h1>
                
                <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
                  {language === "en"
                    ? "Create ATS-optimized CVs and cover letters with AI. Start free with 1 personality-driven CV."
                    : "Luo ATS-optimoituja CV:itä ja hakukirjeitä tekoälyllä. Aloita ilmaiseksi yhdellä persoonallisuusvetoisella CV:llä."}
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <SignedOut>
                    <SignInButton mode="modal">
                      <Button className="px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all bg-gradient-to-br from-indigo-500 to-purple-600 hover:opacity-90 border-2 border-white/40">
                        <Sparkles className="w-5 h-5 mr-2" />
                        {language === "en" ? "Start Free" : "Aloita Ilmaiseksi"}
                      </Button>
                    </SignInButton>
                  </SignedOut>
                  
                  <Link href="/pricing">
                    <Button variant="outline" className="px-8 py-6 text-lg font-semibold rounded-xl border-2 border-indigo-300 hover:bg-indigo-50">
                      {language === "en" ? "View Pricing" : "Katso Hinnat"}
                      <ChevronRight className="w-5 h-5 ml-2" />
                    </Button>
                  </Link>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>{language === "en" ? "1 free CV included • No credit card required" : "1 ilmainen CV mukana • Ei luottokorttia tarvita"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: Sparkles,
                title: language === "en" ? "AI-Powered CVs" : "Tekoälyvoimaiset CV:t",
                description: language === "en" 
                  ? "Generate professional CVs tailored to your personality and experience"
                  : "Luo ammattimaisia CV:itä persoonallisuutesi ja kokemuksesi mukaan"
              },
              {
                icon: Target,
                title: language === "en" ? "ATS Optimization" : "ATS-optimointi",
                description: language === "en"
                  ? "Beat automated screening systems and get noticed by recruiters"
                  : "Läpäise automaattiset seulontajärjestelmät ja tule huomatuksi"
              },
              {
                icon: Zap,
                title: language === "en" ? "Cover Letters" : "Hakukirjeet",
                description: language === "en"
                  ? "Create tailored cover letters for each job application instantly"
                  : "Luo räätälöityjä hakukirjeitä jokaiseen hakemukseen välittömästi"
              }
            ].map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <div key={index} className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-8 backdrop-saturate-150 transform hover:-translate-y-2 hover:shadow-2xl transition-all">
                  <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                    <IconComponent className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-center">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Video Demo Section */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-8 md:p-12 backdrop-saturate-150 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "See How It Works" : "Katso Miten Se Toimii"}
              </h2>
              <p className="text-gray-600 text-lg">
                {language === "en" 
                  ? "Watch a quick demo of HappyApplaid in action"
                  : "Katso nopea demo HappyApplaidista toiminnassa"}
              </p>
            </div>
            
            <div className="aspect-video bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center border-2 border-indigo-200">
              <div className="text-center">
                <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Play className="h-10 w-10 text-white ml-1" />
                </div>
                <p className="text-gray-600 font-medium">
                  {language === "en" ? "Demo video coming soon" : "Demovideo tulossa pian"}
                </p>
              </div>
            </div>
          </div>

          {/* Pricing Preview */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-8 md:p-12 backdrop-saturate-150 mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {language === "en" ? "Simple, Transparent Pricing" : "Yksinkertainen, Läpinäkyvä Hinnoittelu"}
              </h2>
              <p className="text-gray-600 text-lg">
                {language === "en" 
                  ? "Start free or upgrade for more features"
                  : "Aloita ilmaiseksi tai päivitä lisää ominaisuuksia varten"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(PRICING).map(([tier, details]) => {
                const isSemiPro = tier === 'semi-pro';
                const isPro = tier === 'pro';
                
                return (
                  <div key={tier} className={`bg-white/50 border-2 ${isSemiPro ? 'border-yellow-300' : isPro ? 'border-purple-300' : 'border-blue-300'} rounded-xl p-6 text-center ${isSemiPro ? 'transform scale-105' : ''}`}>
                    {isSemiPro && (
                      <div className="inline-block bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold mb-4">
                        {language === "en" ? "Most Popular" : "Suosituin"}
                      </div>
                    )}
                    
                    <h3 className="text-2xl font-bold text-gray-900 mb-2 capitalize">
                      {tier === 'semi-pro' ? 'Semi-Pro' : tier}
                    </h3>
                    
                    <div className="text-4xl font-bold text-gray-900 mb-4">
                      {details.monthly}€
                      <span className="text-lg text-gray-600">/kk</span>
                    </div>
                    
                    <ul className="space-y-2 mb-6 text-left">
                      {details.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Link href="/pricing">
                      <Button className={`w-full ${isSemiPro ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : isPro ? 'bg-gradient-to-r from-purple-500 to-pink-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                        {language === "en" ? "Choose Plan" : "Valitse Paketti"}
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-8">
              <Link href="/pricing">
                <Button variant="link" className="text-indigo-600 font-semibold">
                  {language === "en" ? "See full comparison →" : "Katso täydellinen vertailu →"}
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Shield,
                title: language === "en" ? "Data Security" : "Tietoturva",
                description: language === "en" 
                  ? "Your data is encrypted and secure"
                  : "Tietosi on salattu ja turvassa"
              },
              {
                icon: Brain,
                title: language === "en" ? "Smart AI" : "Älykäs tekoäly",
                description: language === "en"
                  ? "Advanced AI that learns your style"
                  : "Edistynyt tekoäly joka oppii tyylistäsi"
              },
              {
                icon: Database,
                title: language === "en" ? "RAG Technology" : "RAG-teknologia",
                description: language === "en"
                  ? "Pro users get access to knowledge base"
                  : "Pro-käyttäjät saavat pääsyn tietokantaan"
              }
            ].map((item, index) => {
              const IconComponent = item.icon;
              return (
                <div key={index} className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-xl shadow-lg p-6 text-center">
                  <IconComponent className="h-10 w-10 text-indigo-600 mx-auto mb-3" />
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="relative z-10 py-8 px-6 border-t border-indigo-100 backdrop-blur-xl bg-white/70 mt-12">
          <div className="max-w-6xl mx-auto text-center text-base text-gray-500">
            © {new Date().getFullYear()} HappyApplaid. {language === "en" ? "All rights reserved." : "Kaikki oikeudet pidätetään."}
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
  const currentTier = freemiumStatus?.plan_type || 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 relative overflow-hidden">
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <SmartHeader />

      {/* Profile Prompt */}
      {showProfilePrompt && profileCompleted === false && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/90 border-2 border-white/40 rounded-3xl shadow-2xl p-8 max-w-md w-full relative">
            <button
              onClick={() => setShowProfilePrompt(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <User className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === "en" 
                  ? `Hi, ${user?.firstName || "there"}!` 
                  : `Hei, ${user?.firstName || "siellä"}!`}
              </h3>
              
              <p className="text-gray-600">
                {language === "en"
                  ? "We recommend completing your profile for personalized documents."
                  : "Suosittelemme profiilin täyttämistä henkilökohtaisia dokumentteja varten."}
              </p>
            </div>
            
            <div className="flex gap-3">
              <Link href="/profile" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                  {language === "en" ? "Complete Profile" : "Täytä Profiili"}
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => setShowProfilePrompt(false)}
                className="flex-shrink-0"
              >
                {language === "en" ? "Later" : "Myöhemmin"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        
        {/* Hero Section */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-8 backdrop-saturate-150 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
            
            <div className="relative z-10">
              <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                {language === "en"
                  ? `Welcome back, ${user?.firstName}!`
                  : `Tervetuloa takaisin, ${user?.firstName}!`}
              </h1>
              
              <p className="text-gray-700">
                {currentTier === 'free'
                  ? language === "en"
                    ? "Free user - Create one personality-driven CV"
                    : "Ilmainen käyttäjä - Luo yksi persoonallisuusvetoinen CV"
                  : language === "en"
                  ? `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} user - ${currentTier === 'pro' ? 'RAG + ATS' : currentTier === 'semi-pro' ? 'ATS' : 'V1'} optimization enabled`
                  : `${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}-käyttäjä - ${currentTier === 'pro' ? 'RAG + ATS' : currentTier === 'semi-pro' ? 'ATS' : 'V1'} optimointi käytössä`}
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="space-y-8">
          {/* FREE USER - CV USED - UPGRADE PROMPT */}
          {!isPremium && hasUsedFreeCv && (
            <div className="backdrop-blur-xl bg-white/70 border-2 border-yellow-300 rounded-2xl shadow-xl p-8 backdrop-saturate-150">
              <div className="text-center">
                <Crown className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {language === "en" ? "You've used your free CV!" : "Olet käyttänyt ilmaisen CV:si!"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {language === "en"
                    ? "Upgrade to create unlimited CVs with ATS optimization and cover letters"
                    : "Päivitä luodaksesi rajattomasti ATS-optimoituja CV:itä ja hakukirjeitä"}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: FileText, title: language === "en" ? "Unlimited CVs" : "Rajattomat CV:t", desc: language === "en" ? "Create as many as you need" : "Luo niin monta kuin tarvitset" },
                    { icon: Target, title: language === "en" ? "ATS Optimization" : "ATS-optimointi", desc: language === "en" ? "Beat automated systems" : "Läpäise automaattiset järjestelmät" },
                    { icon: FileInput, title: language === "en" ? "Cover Letters" : "Hakukirjeet", desc: language === "en" ? "Generate tailored letters" : "Generoi räätälöityjä kirjeitä" }
                  ].map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div key={idx} className="bg-white/50 rounded-xl p-4">
                        <Icon className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                        <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.title}</h3>
                        <p className="text-xs text-gray-600">{item.desc}</p>
                      </div>
                    );
                  })}
                </div>

                <Link href="/pricing">
                  <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-3 rounded-xl font-bold hover:opacity-90">
                    <Crown className="w-5 h-5 mr-2" />
                    {language === "en" ? "Upgrade to Premium" : "Päivitä Premium-tiliin"}
                  </Button>
                </Link>

                <p className="text-sm text-gray-500 mt-4">
                  {language === "en" ? "Starting from €2.99/month" : "Alkaen 2,99 €/kuukausi"}
                </p>
              </div>
            </div>
          )}

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CREATE CV CARD */}
            {canCreateCV ? (
              <Link href="/create-cv">
                <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all backdrop-saturate-150 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    {!isPremium && (
                      <div className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold">
                        {language === "en" ? "Free (1x)" : "Ilmainen (1x)"}
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {language === "en" ? "Create CV" : "Luo CV"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {isPremium
                      ? language === "en" ? "Create unlimited CVs with ATS optimization" : "Luo rajattomasti ATS-optimoituja CV:itä"
                      : language === "en" ? "Create your free personality-driven CV" : "Luo ilmainen persoonallisuusvetoinen CV"}
                  </p>
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                    {language === "en" ? "Create CV" : "Luo CV"}
                  </Button>
                </div>
              </Link>
            ) : (
              <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl shadow-xl p-6 backdrop-saturate-150 opacity-60">
                <Lock className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {language === "en" ? "Create CV" : "Luo CV"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {language === "en" ? "Free CV already used" : "Ilmainen CV jo käytetty"}
                </p>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    <Crown className="w-4 h-4 mr-2" />
                    {language === "en" ? "Upgrade" : "Päivitä"}
                  </Button>
                </Link>
              </div>
            )}

            {/* COVER LETTER CARD */}
            {isPremium ? (
              <Link href="/create-cover-letter">
                <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all backdrop-saturate-150 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <FileInput className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">
                      Premium
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {language === "en" ? "Create Cover Letter" : "Luo Hakukirje"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {language === "en" ? "Generate ATS-optimized cover letters" : "Generoi ATS-optimoituja hakukirjeitä"}
                  </p>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600">
                    {language === "en" ? "Create Letter" : "Luo Hakukirje"}
                  </Button>
                </div>
              </Link>
            ) : (
              <div className="backdrop-blur-xl bg-white/70 border-2 border-gray-300 rounded-2xl shadow-xl p-6 backdrop-saturate-150 opacity-60">
                <Lock className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {language === "en" ? "Cover Letter" : "Hakukirje"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {language === "en" ? "Premium feature only" : "Vain Premium-käyttäjille"}
                </p>
                <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-bold mb-4 inline-block">
                  Premium
                </div>
                <Link href="/pricing">
                  <Button variant="outline" className="w-full">
                    {language === "en" ? "Upgrade" : "Päivitä"}
                  </Button>
                </Link>
              </div>
            )}

            {/* Profile Card */}
            <Link href="/profile">
              <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 hover:shadow-2xl hover:-translate-y-1 transition-all backdrop-saturate-150 cursor-pointer">
                <div className="h-12 w-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg mb-4">
                  <User className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {language === "en" ? "Keep your personal information up to date" : "Päivitä henkilökohtaiset tietosi"}
                </p>
                <Button variant="outline" className="w-full">
                  {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
                </Button>
              </div>
            </Link>
          </div>

          {/* Subscription Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 backdrop-saturate-150">
              <div className="flex items-center gap-3 mb-4">
                {isPremium ? <Crown className="h-8 w-8 text-yellow-600" /> : <FileText className="h-8 w-8 text-blue-600" />}
                <h3 className="text-xl font-bold text-gray-900">
                  {isPremium ? currentTier.charAt(0).toUpperCase() + currentTier.slice(1) + " Plan" : language === "en" ? "Free User" : "Ilmainen Käyttäjä"}
                </h3>
              </div>
              <p className="text-gray-600 mb-4">
                {isPremium
                  ? language === "en" ? "Unlimited CVs + ATS optimization" : "Rajattomat CV:t + ATS-optimointi"
                  : language === "en" ? "1 free personality-driven CV" : "1 ilmainen persoonallisuusvetoinen CV"}
              </p>
              {isPremium && (
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Zap className="h-4 w-4 text-indigo-600" />
                  <span>{freemiumStatus?.tokens || 0} {language === "en" ? "tokens remaining" : "tokenia jäljellä"}</span>
                </div>
              )}
              {!isPremium && !hasUsedFreeCv && (
                <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                  <Check className="h-4 w-4" />
                  <span>{language === "en" ? "1 CV available" : "1 CV käytettävissä"}</span>
                </div>
              )}
            </div>

            {/* Feature List */}
            <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-6 backdrop-saturate-150">
              <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-indigo-600" />
                {language === "en" ? "Features" : "Ominaisuudet"}
              </h3>
              <div className="space-y-3">
                {[
                  { available: true, text: isPremium ? (language === "en" ? "Unlimited CVs" : "Rajattomat CV:t") : (language === "en" ? "1 Simple CV" : "1 Yksinkertainen CV") },
                  { available: isPremium, text: language === "en" ? "ATS Optimization" : "ATS-optimointi" },
                  { available: isPremium, text: language === "en" ? "Cover Letters" : "Hakukirjeet" },
                  { available: isPremium, text: language === "en" ? "Advanced Templates" : "Edistyneet mallit" }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    {item.available ? <Check className="h-5 w-5 text-green-600" /> : <X className="h-5 w-5 text-gray-400" />}
                    <span className={item.available ? "text-gray-900" : "text-gray-400"}>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upgrade CTA (free users) */}
          {!isPremium && (
            <div className="backdrop-blur-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border-2 border-indigo-300 rounded-2xl shadow-xl p-8 backdrop-saturate-150 text-center">
              <Crown className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {language === "en" ? "Upgrade to Premium" : "Päivitä Premium-tiliin"}
              </h3>
              <p className="text-gray-700 mb-6">
                {language === "en"
                  ? "Get unlimited CVs, ATS optimization, and cover letters!"
                  : "Saat rajattomat CV:t, ATS-optimoinnin ja hakukirjeet!"}
              </p>
              <Link href="/pricing">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold">
                  <Sparkles className="w-5 h-5 mr-2" />
                  {language === "en" ? "View Plans" : "Katso Hinnat"}
                </Button>
              </Link>
            </div>
          )}

          {/* Recent Documents */}
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl p-8 backdrop-saturate-150">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Files className="h-6 w-6 text-indigo-600" />
                {language === "en" ? "My Documents" : "Omat Dokumentit"}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* CVs */}
              <div>
                <Link href="/my-cvs">
                  <div className="flex items-center justify-between mb-4 p-3 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-indigo-600" />
                      <span className="font-bold text-gray-900">{language === "en" ? "My CVs" : "Omat CV:t"}</span>
                      {recentCVs.length > 0 && (
                        <span className="bg-indigo-200 text-indigo-800 px-2 py-1 rounded-full text-xs font-bold">
                          {recentCVs.length}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-5 w-5 text-indigo-600" />
                  </div>
                </Link>

                {recentCVs.length > 0 ? (
                  <div className="space-y-2">
                    {recentCVs.map((cv: any) => (
                      <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                        <div className="p-3 bg-white rounded-lg hover:shadow-md transition-all cursor-pointer border border-gray-200">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-400" />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">{cv.content?.cv_data?.name || "Nimetön CV"}</p>
                              <p className="text-xs text-gray-500">{new Date(cv.created_at).toLocaleDateString("fi-FI")}</p>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : !loadingRecent ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-4">{language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}</p>
                    {canCreateCV && (
                      <Link href="/create-cv">
                        <Button variant="outline">{language === "en" ? "Create First CV" : "Luo Ensimmäinen CV"}</Button>
                      </Link>
                    )}
                  </div>
                ) : null}
              </div>

              {/* Cover Letters */}
              <div>
                {isPremium ? (
                  <>
                    <Link href="/my-cover-letters">
                      <div className="flex items-center justify-between mb-4 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors cursor-pointer">
                        <div className="flex items-center gap-3">
                          <FileInput className="h-5 w-5 text-green-600" />
                          <span className="font-bold text-gray-900">{language === "en" ? "Cover Letters" : "Hakukirjeet"}</span>
                          {recentCoverLetters.length > 0 && (
                            <span className="bg-green-200 text-green-800 px-2 py-1 rounded-full text-xs font-bold">
                              {recentCoverLetters.length}
                            </span>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-green-600" />
                      </div>
                    </Link>

                    {recentCoverLetters.length > 0 ? (
                      <div className="space-y-2">
                        {recentCoverLetters.map((letter: any) => (
                          <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                            <div className="p-3 bg-white rounded-lg hover:shadow-md transition-all cursor-pointer border border-gray-200">
                              <div className="flex items-center gap-2">
                                <FileInput className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 text-sm">{letter.title || "Nimetön hakukirje"}</p>
                                  <p className="text-xs text-gray-500">{new Date(letter.created_at).toLocaleDateString("fi-FI")}</p>
                                </div>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : !loadingRecent ? (
                      <div className="text-center py-8">
                        <FileInput className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 mb-4">{language === "en" ? "No cover letters yet" : "Ei vielä hakukirjeitä"}</p>
                        <Link href="/create-cover-letter">
                          <Button variant="outline">{language === "en" ? "Create First Letter" : "Luo Ensimmäinen Hakukirje"}</Button>
                        </Link>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="font-bold text-gray-900 mb-2">{language === "en" ? "Premium Feature" : "Premium-ominaisuus"}</p>
                    <p className="text-gray-500 mb-4">
                      {language === "en" ? "Cover letters are available for Premium users" : "Hakukirjeet ovat saatavilla Premium-käyttäjille"}
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
      </div>

      {/* Footer */}
      <footer className="relative z-10 py-8 px-6 border-t border-indigo-100 backdrop-blur-xl bg-white/70 mt-12">
        <div className="max-w-6xl mx-auto text-center text-base text-gray-500">
          © {new Date().getFullYear()} HappyApplaid. {language === "en" ? "All rights reserved." : "Kaikki oikeudet pidätetään."}
        </div>
      </footer>
    </div>
  );
}
