/* eslint-disable @typescript-eslint/no-explicit-any */


"use client";

import { useLanguage } from "@/context/LanguageContext";
import ComingSoonAnimation from "@/components/profile/components/desktop/ComingSoonAnimation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  useUser,
  SignInButton,
  SignOutButton,
  SignedIn,
  SignedOut,
} from "@clerk/nextjs";
import {
  FileText,
  FileInput,
  User,
  FileEdit,
  Files,
  Coins,
  Check,
  Sparkles,
  Target,
  Zap,
  AlertCircle,
  Clock,
  Crown,
  Lock,
} from "lucide-react";
import { useSubscription } from "@/components/SubscriptionStatus";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";

interface SubscriptionStatus {
  plan_type: "free" | "premium";
  is_premium: boolean;
  has_used_free_cv: boolean;
  tokens: number;
  cv_count: number;
  can_create_cv: boolean;
  message: string;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);
  const [recentCVs, setRecentCVs] = useState([]);
  const [recentCoverLetters, setRecentCoverLetters] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  const [freemiumStatus, setFreemiumStatus] = useState<SubscriptionStatus | null>(null);
  const [freemiumLoading, setFreemiumLoading] = useState(true);
  
  const { language } = useLanguage();
  const { isLoaded, isSignedIn, user } = useUser();
  const {
    tokens,
  } = useTokens();

  // ✅ LISÄTTY: isDevelopmentMode määritelmä
  const isDevelopmentMode = process.env.NEXT_PUBLIC_DEVELOPMENT_MODE === "true";

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
          console.log("✅ Freemium status loaded:", data);
        } else {
          console.error("Failed to load freemium status");
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

  // Check if this is user's first visit
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
        setIsFirstVisit(isNewUser);

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
      } else {
        throw new Error("Failed to save initial profile");
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

  const text = {
    hero: {
      title:
        language === "en"
          ? "Your AI-powered career co-pilot."
          : "Tekoälyllä tehostettu urakumppanisi.",
      subtitle:
        language === "en"
          ? "Craft perfect CVs and cover letters in minutes."
          : "Luo täydelliset CV:t ja hakukirjeet minuuteissa.",
      description:
        language === "en"
          ? "HappyApplaid is launching soon! Join our waitlist to get early access and exclusive benefits."
          : "HappyApplaid julkaistaan pian! Liity jonotuslistallemme saadaksesi varhaisen pääsyn ja eksklusiivisia etuja.",
    },
    features: [
      {
        icon: Sparkles,
        title:
          language === "en"
            ? "AI-Driven CV Creation"
            : "Tekoälypohjainen CV:n luonti",
        description:
          language === "en"
            ? "Generate professional CVs tailored to your skills and experience with smart suggestions."
            : "Luo ammattimaisia ansioluetteloita tekoälyllä, jotka on räätälöity taitojesi ja kokemuksesi mukaan älykkäillä ehdotuksilla.",
      },
      {
        icon: Target,
        title:
          language === "en"
            ? "Targeted Cover Letters"
            : "Kohdennetut hakukirjeet",
        description:
          language === "en"
            ? "Automate personalized cover letters for specific job applications, saving you time."
            : "Automatisoi henkilökohtaiset hakukirjeet tiettyihin työhakemuksiin, säästäen aikaasi.",
      },
      {
        icon: Zap,
        title: language === "en" ? "Instant Downloads" : "Välittömät lataukset",
        description:
          language === "en"
            ? "Download your documents instantly in various professional formats, ready to impress."
            : "Lataa asiakirjasi välittömästi eri ammattimaisissa muodoissa, valmiina vaikuttamaan.",
      },
    ],
    cta: {
      title:
        language === "en"
          ? "Be the first to know!"
          : "Ole ensimmäisten joukossa!",
      description:
        language === "en"
          ? "Sign up for our waitlist to receive updates, beta access, and special launch offers."
          : "Liity jonotuslistallemme saadaksesi päivityksiä, beta-pääsyn ja erityisiä julkaisutarjouksia.",
      placeholder:
        language === "en" ? "Your email address" : "Sähköpostiosoitteesi",
      submit: language === "en" ? "Join Waitlist" : "Liity jonoon",
      success:
        language === "en"
          ? "Thanks for joining! We'll keep you updated."
          : "Kiitos liittymisestä! Pidämme sinut ajan tasalla.",
    },
    footer: {
      rights:
        language === "en"
          ? "All rights reserved."
          : "Kaikki oikeudet pidätetään.",
    },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          language,
          ip: await getClientIP(),
        }),
      });

      if (!response.ok) throw new Error("Failed to submit");

      setSubmittedEmail(true);
    } catch (error) {
      console.error("Error:", error);
      alert(
        language === "en"
          ? "Failed to submit. Please try again."
          : "Lähetys epäonnistui. Yritä uudelleen."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getClientIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch {
      return "unknown";
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        Ladataan sovellusta...
      </div>
    );
  }

  // ========================================
  // ✅ KORJATTU: WAITLIST SIVU (kirjautumattomat käyttäjät)
  // ========================================
  if (!isDevelopmentMode || (isDevelopmentMode && !isSignedIn)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
        <header className="py-6 px-6 bg-white/90 backdrop-blur-md border-b border-indigo-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center">
              <div className="h-10 w-10 mr-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                HappyApplaid
              </span>
              <Link href="/settings" className="text-sm hover:underline ml-4">
                {language === "en" ? "Settings" : "Asetukset"}
              </Link>
            </div>
            {isDevelopmentMode && (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="outline">
                      {language === "en" ? "Sign In" : "Kirjaudu sisään"}
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <SignOutButton>
                    <Button variant="outline">
                      {language === "en" ? "Sign Out" : "Kirjaudu ulos"}
                    </Button>
                  </SignOutButton>
                </SignedIn>
              </>
            )}
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <div className="mb-8">
                <ComingSoonAnimation />
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
                {text.hero.title}
              </h1>
              <h2 className="text-2xl md:text-4xl text-indigo-600 mb-8 font-medium">
                {text.hero.subtitle}
              </h2>
              <p className="text-xl md:text-2xl text-gray-700 mb-12 max-w-4xl mx-auto leading-relaxed">
                {text.hero.description}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              {text.features.map((feature, index) => {
                const IconComponent = feature.icon;
                return (
                  <div key={index} className="group">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-indigo-100 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
                      <div className="flex items-center justify-center mb-6">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
                          <IconComponent className="h-8 w-8" />
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
                        {feature.title}
                      </h3>
                      <p className="text-gray-700 text-center leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="max-w-3xl mx-auto">
              <div className="bg-gradient-to-br from-white to-indigo-50 backdrop-blur-sm rounded-3xl p-10 md:p-12 border border-indigo-200 shadow-2xl">
                <div className="text-center mb-8">
                  <h3 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                    {text.cta.title}
                  </h3>
                  <p className="text-xl text-gray-600 leading-relaxed">
                    {text.cta.description}
                  </p>
                </div>

                {submittedEmail ? (
                  <div className="bg-green-50 border-2 border-green-200 text-green-800 p-6 rounded-2xl flex items-center justify-center text-lg font-medium">
                    <Check className="h-6 w-6 mr-3" />
                    <span>{text.cta.success}</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="flex flex-col sm:flex-row gap-4"
                  >
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={text.cta.placeholder}
                      required
                      className="flex-grow px-6 py-4 text-lg rounded-2xl border-2 border-indigo-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 outline-none transition-all bg-white/80"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-8 py-4 bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold text-lg rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-70 disabled:transform-none"
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          {language === "en" ? "Sending..." : "Lähetetään..."}
                        </div>
                      ) : (
                        text.cta.submit
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </main>

        <footer className="py-8 px-6 border-t border-indigo-100 bg-white/90 backdrop-blur-md">
          <div className="max-w-6xl mx-auto text-center text-gray-500">
            © {new Date().getFullYear()} HappyApplaid. {text.footer.rights}
          </div>
        </footer>
      </div>
    );
  }

  // MODAALIT
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gray-50">
        <OnboardingSteps
          isOpen={true}
          onComplete={handleOnboardingComplete}
          currentUserName={user?.firstName || "käyttäjä"}
        />
      </div>
    );
  }

  if (profileCompleted === false && !isFirstVisit) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border p-6 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {language === "en" ? "Complete Your Profile" : "Täytä Profiilisi"}
          </h2>
          <p className="text-gray-600 mb-6">
            {language === "en"
              ? "Please complete your profile to access the dashboard and create your first documents."
              : "Täytä profiilisi päästäksesi hallintapaneeliin ja luodaksesi ensimmäiset dokumenttisi."}
          </p>
          <Link href="/profile">
            <Button className="w-full">
              {language === "en" ? "Complete Profile" : "Täytä Profiili"}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (profileCompleted === null || freemiumLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {language === "en" ? "Loading..." : "Ladataan..."}
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN DASHBOARD - FREEMIUM VERSION
  // ========================================
  const isPremium = freemiumStatus?.is_premium || false;
  const canCreateCV = freemiumStatus?.can_create_cv || false;
  const hasUsedFreeCv = freemiumStatus?.has_used_free_cv || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Rest of the dashboard code remains exactly the same... */}
      {/* I'll include the complete dashboard here for completeness */}
      <header className="bg-white/80 backdrop-blur-lg shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-6">
              <div className="flex items-center">
                <div className="h-8 w-8 mr-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
                  <FileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  HappyApplaid
                </span>
              </div>

              <nav className="hidden md:flex items-center gap-1">
                <Link href="/">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    {language === "en" ? "Home" : "Etusivu"}
                  </Button>
                </Link>
                <Link href="/my-cvs">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    {language === "en" ? "CVs" : "CV:t"}
                  </Button>
                </Link>
                {isPremium && (
                  <Link href="/my-cover-letters">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-indigo-600"
                    >
                      {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                    </Button>
                  </Link>
                )}
                <Link href="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-indigo-600"
                  >
                    {language === "en" ? "Profile" : "Profiili"}
                  </Button>
                </Link>
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {!freemiumLoading && (
                <>
                  {isPremium ? (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-300 px-3 py-1.5 rounded-full shadow-sm">
                      <Crown className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-semibold text-yellow-800">
                        Premium ({freemiumStatus?.tokens || 0})
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-300 px-3 py-1.5 rounded-full shadow-sm">
                      <span className="text-sm font-semibold text-gray-700">
                        {hasUsedFreeCv
                          ? language === "en"
                            ? "Free CV Used"
                            : "Ilmainen CV käytetty"
                          : language === "en"
                          ? "1 Free CV"
                          : "1 Ilmainen CV"}
                      </span>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                <User className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {user?.firstName}
                </span>
              </div>

              <Link href="/settings">
                <Button variant="ghost" size="sm" className="text-gray-600">
                  {language === "en" ? "Settings" : "Asetukset"}
                </Button>
              </Link>

              {isDevelopmentMode && isSignedIn && (
                <SignOutButton>
                  <Button variant="outline" size="sm">
                    {language === "en" ? "Sign Out" : "Kirjaudu ulos"}
                  </Button>
                </SignOutButton>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 animate-fade-in">
              {language === "en"
                ? `Welcome back, ${user?.firstName}!`
                : `Tervetuloa takaisin, ${user?.firstName}!`}
            </h1>
            <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
              {isPremium
                ? language === "en"
                  ? "Premium user - Create unlimited ATS-optimized CVs and cover letters"
                  : "Premium-käyttäjä - Luo rajattomasti ATS-optimoituja CV:itä ja hakukirjeitä"
                : language === "en"
                ? "Free user - Create one personality-driven CV"
                : "Ilmainen käyttäjä - Luo yksi persoonallisuusvetoinen CV"}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 -mt-8">
        {/* FREE USER - CV KÄYTETTY - UPGRADE PROMPT */}
        {!isPremium && hasUsedFreeCv && (
          <div className="mb-12 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl shadow-2xl border-2 border-yellow-300 p-8">
            <div className="text-center">
              <Lock className="h-20 w-20 text-yellow-500 mx-auto mb-4" />
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                {language === "en"
                  ? "You've used your free CV!"
                  : "Olet käyttänyt ilmaisen CV:si!"}
              </h2>
              <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                {language === "en"
                  ? "Upgrade to Premium to create unlimited CVs with ATS optimization and cover letters"
                  : "Päivitä Premium-tiliin luodaksesi rajattomasti ATS-optimoituja CV:itä ja hakukirjeitä"}
              </p>

              <div className="grid md:grid-cols-3 gap-4 mb-8 max-w-4xl mx-auto">
                <div className="p-4 bg-white rounded-xl shadow-md">
                  <Sparkles className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {language === "en" ? "Unlimited CVs" : "Rajattomat CV:t"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {language === "en"
                      ? "Create as many as you need"
                      : "Luo niin monta kuin tarvitset"}
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl shadow-md">
                  <Zap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {language === "en" ? "ATS Optimization" : "ATS-optimointi"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {language === "en"
                      ? "Beat automated systems"
                      : "Läpäise automaattiset järjestelmät"}
                  </p>
                </div>

                <div className="p-4 bg-white rounded-xl shadow-md">
                  <FileInput className="h-8 w-8 text-pink-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {language === "en"
                      ? "Generate tailored letters"
                      : "Generoi räätälöityjä kirjeitä"}
                  </p>
                </div>
              </div>

              <Link href="/pricing">
                <Button
                  size="lg"
                  className="px-12 py-6 text-lg bg-gradient-to-br from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all"
                >
                  <Crown className="h-6 w-6 mr-3" />
                  {language === "en" ? "Upgrade to Premium" : "Päivitä Premium-tiliin"}
                </Button>
              </Link>

              <p className="text-sm text-gray-600 mt-4">
                {language === "en"
                  ? "Starting from €9.99/month"
                  : "Alkaen 9,99 €/kuukausi"}
              </p>
            </div>
          </div>
        )}

        {/* Quick Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* CREATE CV CARD - FREE vs PREMIUM */}
          {canCreateCV ? (
            <Link href="/create-cv">
              <div className="group bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-indigo-300 hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
                <div className="p-8 text-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {language === "en" ? "Create CV" : "Luo CV"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {isPremium
                      ? language === "en"
                        ? "Create unlimited CVs with ATS optimization"
                        : "Luo rajattomasti ATS-optimoituja CV:itä"
                      : language === "en"
                      ? "Create your free personality-driven CV"
                      : "Luo ilmainen persoonallisuusvetoinen CV"}
                  </p>
                  {!isPremium && (
                    <div className="flex items-center justify-center gap-2 text-blue-600 mb-4">
                      <span className="text-sm font-semibold">
                        {language === "en" ? "Free (1x)" : "Ilmainen (1x)"}
                      </span>
                    </div>
                  )}
                  <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                    {language === "en" ? "Create CV" : "Luo CV"}
                  </Button>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 text-center opacity-75">
              <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">
                {language === "en" ? "Create CV" : "Luo CV"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {language === "en"
                  ? "Free CV already used"
                  : "Ilmainen CV jo käytetty"}
              </p>
              <Link href="/pricing">
                <Button variant="outline" className="w-full">
                  <Crown className="h-4 w-4 mr-2" />
                  {language === "en" ? "Upgrade" : "Päivitä"}
                </Button>
              </Link>
            </div>
          )}

          {/* COVER LETTER CARD - PREMIUM ONLY */}
          {isPremium ? (
            <Link href="/create-cover-letter">
              <div className="group bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-green-300 hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
                <div className="p-8 text-center">
                  <div className="h-16 w-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <FileInput className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {language === "en"
                      ? "Create Cover Letter"
                      : "Luo Hakukirje"}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {language === "en"
                      ? "Generate ATS-optimized cover letters"
                      : "Generoi ATS-optimoituja hakukirjeitä"}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-green-600 mb-4">
                    <Crown className="h-4 w-4" />
                    <span className="text-sm font-semibold">Premium</span>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
                    {language === "en" ? "Create Letter" : "Luo Hakukirje"}
                  </Button>
                </div>
              </div>
            </Link>
          ) : (
            <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-8 text-center opacity-75">
              <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-600 mb-2">
                {language === "en" ? "Cover Letter" : "Hakukirje"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {language === "en"
                  ? "Premium feature only"
                  : "Vain Premium-käyttäjille"}
              </p>
              <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
                <Crown className="h-4 w-4" />
                <span className="text-sm font-semibold">Premium</span>
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
            <div className="group bg-white rounded-2xl shadow-lg border-2 border-transparent hover:border-blue-300 hover:shadow-xl transition-all duration-300 overflow-hidden transform hover:-translate-y-2">
              <div className="p-8 text-center">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <User className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {language === "en"
                    ? "Keep your personal information up to date"
                    : "Päivitä henkilökohtaiset tietosi"}
                </p>
                <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 mt-8">
                  {language === "en" ? "Edit Profile" : "Muokkaa Profiilia"}
                </Button>
              </div>
            </div>
          </Link>
        </div>

        {/* SUBSCRIPTION STATUS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Subscription Status */}
          {!freemiumLoading && (
            <div
              className={`bg-white rounded-2xl shadow-lg p-6 border-2 ${
                isPremium
                  ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50"
                  : "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50"
              }`}
            >
              <div className="flex items-center gap-3 mb-3">
                {isPremium ? (
                  <Crown className="h-6 w-6 text-yellow-600" />
                ) : (
                  <Sparkles className="h-6 w-6 text-blue-600" />
                )}
                <h3 className="text-lg font-bold text-gray-900">
                  {isPremium
                    ? "Premium Plan"
                    : language === "en"
                    ? "Free User"
                    : "Ilmainen Käyttäjä"}
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {isPremium
                  ? language === "en"
                    ? "Unlimited CVs + ATS optimization"
                    : "Rajattomat CV:t + ATS-optimointi"
                  : language === "en"
                  ? "1 free personality-driven CV"
                  : "1 ilmainen persoonallisuusvetoinen CV"}
              </p>
              {isPremium && (
                <div className="flex items-center gap-2 text-yellow-700 bg-yellow-100 rounded-lg px-3 py-2">
                  <Coins className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {freemiumStatus?.tokens || 0}{" "}
                    {language === "en" ? "tokens remaining" : "tokenia jäljellä"}
                  </span>
                </div>
              )}
              {!isPremium && !hasUsedFreeCv && (
                <div className="flex items-center gap-2 text-blue-700 bg-blue-100 rounded-lg px-3 py-2">
                  <Check className="h-4 w-4" />
                  <span className="text-sm font-semibold">
                    {language === "en" ? "1 CV available" : "1 CV käytettävissä"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Feature Comparison */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-6 w-6 text-indigo-600" />
              <h3 className="text-lg font-bold text-gray-900">
                {language === "en" ? "Features" : "Ominaisuudet"}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
                <span className="text-gray-700">
                  {isPremium
                    ? language === "en"
                      ? "Unlimited CVs"
                      : "Rajattomat CV:t"
                    : language === "en"
                    ? "1 Simple CV"
                    : "1 Simple CV"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
                <span className={isPremium ? "text-gray-700" : "text-gray-400"}>
                  {language === "en" ? "ATS Optimization" : "ATS-optimointi"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
                <span className={isPremium ? "text-gray-700" : "text-gray-400"}>
                  {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isPremium ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
                <span className={isPremium ? "text-gray-700" : "text-gray-400"}>
                  {language === "en"
                    ? "Professional/Creative CVs"
                    : "Professional/Creative CV:t"}
                </span>
              </div>
            </div>
          </div>

          {/* Upgrade prompt (only for free users) */}
          {!isPremium && (
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-lg p-6 border-2 border-indigo-300">
              <div className="flex items-center gap-3 mb-3">
                <Crown className="h-6 w-6 text-indigo-600" />
                <h3 className="text-lg font-bold text-gray-900">
                  {language === "en" ? "Upgrade to Premium" : "Päivitä Premium-tiliin"}
                </h3>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                {language === "en"
                  ? "Get unlimited CVs, ATS optimization, and cover letters!"
                  : "Saat rajattomat CV:t, ATS-optimoinnin ja hakukirjeet!"}
              </p>
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700">
                  <Crown className="h-4 w-4 mr-2" />
                  {language === "en" ? "View Plans" : "Katso Hinnat"}
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Documents Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Files className="h-6 w-6 text-indigo-600" />
              {language === "en" ? "My Documents" : "Omat Dokumentit"}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CVs Section */}
            <div>
              <Link href="/my-cvs">
                <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all group mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                      <FileText className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <span className="text-base font-semibold text-gray-900 group-hover:text-indigo-600">
                        {language === "en" ? "My CVs" : "Omat CV:t"}
                      </span>
                      {recentCVs.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {recentCVs.length}{" "}
                          {language === "en" ? "documents" : "dokumenttia"}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-indigo-600 text-xl">→</span>
                </div>
              </Link>

              {/* Recent CVs */}
              {recentCVs.length > 0 && (
                <div className="space-y-2">
                  {recentCVs.slice(0, 3).map((cv: any) => (
                    <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-all group">
                        <Clock className="h-4 w-4 text-gray-400 group-hover:text-indigo-500" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 group-hover:text-indigo-600 truncate">
                            {cv.content?.cv_data?.name || "Nimetön CV"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(cv.created_at).toLocaleDateString("fi-FI")}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {recentCVs.length === 0 && !loadingRecent && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    {language === "en" ? "No CVs yet" : "Ei vielä CV:itä"}
                  </p>
                  {canCreateCV && (
                    <Link href="/create-cv">
                      <Button variant="outline" size="sm" className="mt-3">
                        {language === "en" ? "Create First CV" : "Luo Ensimmäinen CV"}
                      </Button>
                    </Link>
                  )}
                </div>
              )}
            </div>

            {/* Cover Letters Section - Only for Premium */}
            <div>
              {isPremium ? (
                <>
                  <Link href="/my-cover-letters">
                    <div className="flex items-center justify-between p-4 rounded-xl border-2 border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all group mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          <FileEdit className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <span className="text-base font-semibold text-gray-900 group-hover:text-green-600">
                            {language === "en" ? "Cover Letters" : "Hakukirjeet"}
                          </span>
                          {recentCoverLetters.length > 0 && (
                            <p className="text-xs text-gray-500">
                              {recentCoverLetters.length}{" "}
                              {language === "en" ? "documents" : "dokumenttia"}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-green-600 text-xl">→</span>
                    </div>
                  </Link>

                  {recentCoverLetters.length > 0 && (
                    <div className="space-y-2">
                      {recentCoverLetters.slice(0, 3).map((letter: any) => (
                        <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-200 transition-all group">
                            <Clock className="h-4 w-4 text-gray-400 group-hover:text-green-500" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-700 group-hover:text-green-600 truncate">
                                {letter.title || "Nimetön hakukirje"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(letter.created_at).toLocaleDateString("fi-FI")}
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}

                  {recentCoverLetters.length === 0 && !loadingRecent && (
                    <div className="text-center py-8 text-gray-500">
                      <FileEdit className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm">
                        {language === "en" ? "No cover letters yet" : "Ei vielä hakukirjeitä"}
                      </p>
                      <Link href="/create-cover-letter">
                        <Button variant="outline" size="sm" className="mt-3">
                          {language === "en"
                            ? "Create First Letter"
                            : "Luo Ensimmäinen Hakukirje"}
                        </Button>
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                  <Lock className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="font-semibold text-gray-700 mb-2">
                    {language === "en" ? "Premium Feature" : "Premium-ominaisuus"}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {language === "en"
                      ? "Cover letters are available for Premium users"
                      : "Hakukirjeet ovat saatavilla Premium-käyttäjille"}
                  </p>
                  <Link href="/pricing">
                    <Button variant="outline" size="sm">
                      <Crown className="h-4 w-4 mr-2" />
                      {language === "en" ? "Upgrade" : "Päivitä"}
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Loading state */}
          {loadingRecent && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          )}
        </div>

        {/* Quick Templates Section - Only for users who can create CVs */}
        {canCreateCV && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="h-6 w-6 text-indigo-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                {language === "en" ? "Quick Templates" : "Pika-mallit"}
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  name: language === "en" ? "Simple" : "Yksinkertainen",
                  template: "simple",
                  available: true,
                },
                {
                  name: language === "en" ? "Technical" : "Tekninen",
                  template: "technical",
                  available: isPremium,
                },
                {
                  name: language === "en" ? "Creative" : "Luova",
                  template: "creative",
                  available: isPremium,
                },
                {
                  name: language === "en" ? "Executive" : "Johtotaso",
                  template: "executive",
                  available: isPremium,
                },
              ].map((item) => (
                <div key={item.template} className="relative">
                  {item.available ? (
                    <Link href={`/create-cv?template=${item.template}`}>
                      <div className="group bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-6 text-center border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <FileText className="h-10 w-10 mx-auto mb-3 text-gray-500 group-hover:text-indigo-600 transition-colors" />
                        <p className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600">
                          {item.name}
                        </p>
                      </div>
                    </Link>
                  ) : (
                    <div className="bg-gray-50 rounded-xl p-6 text-center border-2 border-gray-200 opacity-60 relative">
                      <Lock className="absolute top-2 right-2 h-4 w-4 text-gray-400" />
                      <FileText className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm font-semibold text-gray-400">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">Premium</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="py-8 border-t border-gray-200 mt-12 bg-white/80">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-gray-500">
          <p>
            &copy; {new Date().getFullYear()} HappyApplaid. {text.footer.rights}
          </p>
        </div>
      </footer>
    </div>
  );
}