/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useSubscription } from '@/context/SubscriptionContext';
import { useUser, SignInButton, SignedOut, SignUpButton } from "@clerk/nextjs";
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
  CheckCircle,
  Star,
  AlertTriangle,
  TrendingDown,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import WelcomeModal from "@/components/welcomephase/WelcomeModal";
import OnboardingSteps from "@/components/welcomephase/OnboardingSteps";
import HowItWorksTimeline from "@/components/howitworks";
import { clerkAppearance } from "@/lib/clerkAppearance";
import LoadingScreen from "@/components/LoadingScreen";

interface SubscriptionStatus {
  plan_type: "free" | "basic" | "premium";
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
            education: [{ id: 1, school: "", degree: "", year: "", isOngoing: false }],
            workExperience: [{ id: 1, company: "", position: "", duration: "", description: "" }],
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

  if (!isLoaded || subLoading) {
    return <LoadingScreen />;
  }

  // Welcome/Onboarding State
  if (showWelcome) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
        <OnboardingSteps
          isOpen={true}
          onComplete={handleOnboardingComplete}
          currentUserName={user?.firstName || "käyttäjä"}
        />
      </div>
    );
  }



 

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



// KORVAA alkuperäinen if (!isSignedIn) { return (...) } -blokki tällä
// Kaikki importit ovat samat kuin alkuperäisessä koodissa

if (!isSignedIn) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#121212] via-[#0e0e0e] to-[#1a1a1a] font-sans text-[#e7e3dc]">
      
      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/8 to-gray-700/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">

        {/* ─── HERO ─── */}
        <div className="mb-16">
          <div className="backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-3xl shadow-2xl shadow-black/50 p-8 md:p-16 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-orange-500/5 pointer-events-none rounded-3xl"></div>

            <div className="relative z-10 text-center">

              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-black/40 backdrop-blur-md rounded-full border border-orange-400/30 shadow-xl mb-6">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-orange-300 text-sm">
                  {language === "en" ? "Realistic ATS Analysis" : "Realistinen ATS-analyysi"}
                </span>
              </div>

              {/* Pääotsikko — uusi strateginen kulma */}
              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  {language === "en" ? "See if you'd actually pass." : "Selvitä pääsetkö läpi."}
                </span>
                <br />
                <span className="text-gray-100">
                  {language === "en" ? "Before you apply." : "Ennen kuin haet."}
                </span>
              </h1>

              <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
                {language === "en"
                  ? "75% of applications are auto-rejected before a human reads them. HappyApplaid analyzes your competitiveness, experience gaps, and keyword match — honestly."
                  : "75% hakemuksista hylätään automaattisesti ennen kuin ihminen näkee ne. HappyApplaid analysoi kilpailukykyäsi, kokemuskuiluasi ja keyword-osumaa — rehellisesti."}
              </p>

              <HowItWorksTimeline />

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 mb-8">
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <Button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all">
                    <Sparkles className="inline w-5 h-5 mr-2" />
                    {language === "en" ? "Test My Application Free" : "Testaa hakemukseni ilmaiseksi"}
                  </Button>
                </SignUpButton>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 backdrop-blur-md text-orange-300 rounded-xl font-bold text-lg border border-orange-400/30 hover:bg-white/10 transition-all"
                >
                  {language === "en" ? "See Pricing" : "Katso Hinnoittelu"}
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-300 max-w-3xl mx-auto font-medium">
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <CreditCard className="w-4 h-4 text-green-400" />
                  <span>{language === "en" ? "No credit card required" : "Ei luottokorttia"}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>{language === "en" ? "Result in 60 seconds" : "Tulos 60 sekunnissa"}</span>
                </div>
                <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <Check className="w-4 h-4 text-green-400" />
                  <span>{language === "en" ? "No personal data to AI" : "Ei PII:tä AI:lle"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── REALITY CHECK — universaali, kaikille aloille ─── */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-red-900/20 via-orange-900/10 to-red-900/20 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden border border-red-500/20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/15 backdrop-blur-md rounded-full border border-red-400/30 mb-6">
                <AlertTriangle className="w-5 h-5 text-red-300" />
                <span className="font-bold text-red-200 tracking-wide uppercase text-sm">
                  {language === "en" ? "The Real Problem" : "Todellinen ongelma"}
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white">
                {language === "en" ? "Most applicants never get seen." : "Useimmat hakijat jäävät näkemättä."}
              </h2>

              <p className="text-lg md:text-xl text-gray-200 mb-10">
                {language === "en"
                  ? "Automated screening systems filter applications mechanically — in every industry. They don't understand context. They don't care about potential. They scan for exact matches — nothing more."
                  : "Automaattiset seulontajärjestelmät suodattavat hakemuksia mekaanisesti — kaikilla aloilla. Ne eivät ymmärrä kontekstia. Ne eivät arvosta potentiaalia. Ne etsivät täsmälleen oikeita sanoja — ei mitään muuta."}
              </p>

              {/* Kaksi esimerkkiä rinnakkain — early career + vaativa rooli */}
              <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto mb-8">

                {/* Esimerkki A — Entry level */}
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-left">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                    {language === "en" ? "Early career" : "Ensimmäinen tai varhainen rooli"}
                  </p>
                  <p className="text-sm text-gray-300 mb-4 font-medium">
                    {language === "en" ? "Applicant → Customer Service role" : "Hakija → Asiakaspalvelurooli"}
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { label: language === "en" ? "Communication skills" : "Viestintätaidot", found: true },
                      { label: language === "en" ? "Customer interaction" : "Asiakaskohtaaminen", found: true },
                      { label: language === "en" ? "CRM experience" : "CRM-kokemus", found: false },
                      { label: language === "en" ? "1+ year experience" : "1+ vuoden kokemus", found: false },
                    ].map((kw, i) => (
                      <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/5">
                        <span className="text-xs text-gray-300">{kw.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${kw.found ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                          {kw.found ? "✓" : "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                    <span className="text-xs text-gray-500">
                      {language === "en" ? "ATS Score" : "ATS-pisteet"}
                    </span>
                    <span className="font-bold text-amber-400 text-sm">58% — {language === "en" ? "Medium risk" : "Kohtalainen riski"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    {language === "en" ? "→ Add concrete examples of customer situations" : "→ Lisää konkreettisia esimerkkejä asiakastilanteista"}
                  </p>
                </div>

                {/* Esimerkki B — Vaativa rooli */}
                <div className="bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 text-left">
                  <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-semibold">
                    {language === "en" ? "Competitive role" : "Kilpailtu rooli"}
                  </p>
                  <p className="text-sm text-gray-300 mb-4 font-medium">
                    {language === "en" ? "Applicant → Senior Marketing Specialist" : "Hakija → Senior markkinointiasiantuntija"}
                  </p>
                  <div className="space-y-1.5 mb-4">
                    {[
                      { label: language === "en" ? "Campaign management" : "Kampanjanhallinta", found: true },
                      { label: language === "en" ? "Budget management" : "Budjettiosaaminen", found: true },
                      { label: language === "en" ? "5+ years experience" : "5+ vuoden kokemus", found: false },
                      { label: language === "en" ? "Team leadership" : "Tiiminjohtaminen", found: false },
                      { label: language === "en" ? "Advanced analytics" : "Edistynyt analytiikka", found: false },
                    ].map((kw, i) => (
                      <div key={i} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-white/5">
                        <span className="text-xs text-gray-300">{kw.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${kw.found ? "text-green-400 bg-green-400/10" : "text-red-400 bg-red-400/10"}`}>
                          {kw.found ? "✓" : "✗"}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                    <span className="text-xs text-gray-500">
                      {language === "en" ? "ATS Score" : "ATS-pisteet"}
                    </span>
                    <span className="font-bold text-red-400 text-sm">42% — {language === "en" ? "High risk" : "Korkea riski"}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2 italic">
                    {language === "en" ? "→ Highlight measurable results and leadership scope" : "→ Korosta mitattavia tuloksia ja johtamisvastuuta"}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-400">
                {language === "en"
                  ? "HappyApplaid shows you this before you apply — and tells you exactly what to do about it. Whether it's your first application or your tenth senior role."
                  : "HappyApplaid näyttää tämän ennen kuin haet — ja kertoo täsmälleen mitä tehdä. Oli kyseessä ensimmäinen hakemus tai kymmenes johtotason haku."}
              </p>
            </div>
          </div>
        </div>

        {/* ─── KENELLE — Universaali, kaikille aloille ja kokemustasosta riippumatta ─── */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-100 mb-3">
              {language === "en" ? "Does this sound like you?" : "Tunnistatko itsesi?"}
            </h2>
            <p className="text-gray-400 text-lg">
              {language === "en"
                ? "From early career to senior roles — in any industry."
                : "Ensimmäisestä hakemuksesta johtotason rooliin — millä alalla tahansa."}
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Early career */}
            <div className="bg-gradient-to-br from-orange-900/20 to-amber-900/10 rounded-3xl p-8 border border-orange-500/20">
              <div className="text-4xl mb-4">🌱</div>
              <h3 className="font-bold text-xl mb-1 text-orange-300">
                {language === "en" ? "Early career" : "Varhainen ura"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {language === "en"
                  ? "Student, trainee, or first years in the workforce"
                  : "Opiskelija, harjoittelija tai vasta työelämässä aloittanut"}
              </p>
              <ul className="space-y-2 text-sm text-gray-300 mb-5">
                {(language === "en"
                  ? [
                      "Sending applications but getting no replies",
                      "Not sure why your application gets rejected",
                      "Want to make the most of what you have — even without much experience",
                    ]
                  : [
                      "Lähetät hakemuksia mutta et saa vastauksia",
                      "Et tiedä miksi hakemuksesi hylätään",
                      "Haluat hyödyntää sen mitä sinulla on — vaikka kokemusta olisi vähän",
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-orange-400 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-orange-300/70 italic">
                {language === "en"
                  ? "Know where you stand — and what to improve — before you send."
                  : "Tiedä missä olet — ja mitä parantaa — ennen kuin lähetät."}
              </p>
            </div>

            {/* Experienced / career changer */}
            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/10 rounded-3xl p-8 border border-indigo-500/20">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold text-xl mb-1 text-indigo-300">
                {language === "en" ? "Aiming higher" : "Tähtäät korkeammalle"}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {language === "en"
                  ? "Career changer, re-entering work, or targeting competitive roles"
                  : "Alanvaihtaja, palannut töihin tai tähtäät vaativiin rooleihin"}
              </p>
              <ul className="space-y-2 text-sm text-gray-300 mb-5">
                {(language === "en"
                  ? [
                      "You have experience — but unsure how it translates",
                      "Applying to competitive roles without knowing your real chances",
                      "Cover letters feel generic and don't land",
                    ]
                  : [
                      "Sinulla on kokemusta — mutta et tiedä miten se kääntyy",
                      "Haet kilpailtuihin rooleihin tietämättä todellisia mahdollisuuksiasi",
                      "Hakukirjeet tuntuvat geneerisiltä eivätkä kolahdeta",
                    ]
                ).map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-indigo-300/70 italic">
                {language === "en"
                  ? "See the gap honestly — then close it strategically."
                  : "Näe kuilu rehellisesti — sitten kuroe se umpeen strategisesti."}
              </p>
            </div>
          </div>

          {/* Universaali tagline */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              {language === "en"
                ? "Works for healthcare, business, education, tech, marketing, trade — any field, any level."
                : "Toimii terveydenhuollossa, liiketoiminnassa, opetuksessa, IT:ssä, markkinoinnissa, käsityössä — millä alalla tahansa, millä tasolla tahansa."}
            </p>
          </div>
        </div>

        {/* ─── ATS OPTIMIZATION — päivitetty viestintä ─── */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-green-800/30 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden border border-green-500/30">
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 backdrop-blur-md rounded-full border border-green-400/40 mb-6">
                <Shield className="w-5 h-5 text-green-300" />
                <span className="font-bold text-green-200 tracking-wide uppercase text-sm">
                  {language === "en" ? "Not just keywords" : "Ei pelkkiä avainsanoja"}
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white">
                {language === "en" ? "Real analysis. Real strategy." : "Oikea analyysi. Oikea strategia."}
              </h2>

              <p className="text-lg md:text-xl text-gray-200 mb-8">
                {language === "en"
                  ? "Most ATS checkers give you a percentage. HappyApplaid tells you the whole picture — experience gaps, competitiveness, and whether applying is worth your time."
                  : "Useimmat ATS-checkerit antavat sinulle prosentin. HappyApplaid kertoo koko kuvan — kokemuskuilut, kilpailukyvyn ja sen, kannattaako hakea ylipäätään."}
              </p>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-green-500/20">
                  <Target className="w-10 h-10 text-green-400 mb-3 mx-auto" />
                  <h3 className="font-bold text-lg mb-2 text-green-300">
                    {language === "en" ? "Exact Keyword Match" : "Täsmällinen keyword-matching"}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {language === "en"
                      ? "Like real ATS — no fake synonym tricks"
                      : "Kuten oikeat ATS:t — ei tekaistuja synonyymitemppuja"}
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-green-500/20">
                  <TrendingDown className="w-10 h-10 text-green-400 mb-3 mx-auto" />
                  <h3 className="font-bold text-lg mb-2 text-green-300">
                    {language === "en" ? "Experience Gap Severity" : "Kokemuskuilu-analyysi"}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {language === "en"
                      ? "Low / Medium / High — not just missing keywords"
                      : "Low / Medium / High — ei vain lista puuttuvista sanoista"}
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-green-500/20">
                  <CheckCircle className="w-10 h-10 text-green-400 mb-3 mx-auto" />
                  <h3 className="font-bold text-lg mb-2 text-green-300">
                    {language === "en" ? "Apply / Don't Apply" : "Hae / Älä hae"}
                  </h3>
                  <p className="text-sm text-gray-300">
                    {language === "en"
                      ? "Honest recommendation before you waste time"
                      : "Rehellinen suositus ennen kuin tuhlaat aikaa"}
                  </p>
                </div>
              </div>

              {/* Privacy highlight */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 backdrop-blur-md p-5 rounded-2xl border border-green-500/20 text-left">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-green-300 mb-1">
                      {language === "en" ? "Privacy-first by architecture" : "Tietosuoja arkkitehtuurin tasolla"}
                    </p>
                    <p className="text-sm text-gray-300">
                      {language === "en"
                        ? "Your name, email, and phone never go to AI. This is a technical decision — not just a promise."
                        : "Nimesi, emailisi ja puhelinnumerosi eivät koskaan mene AI:lle. Tämä on tekninen valinta — ei pelkkä lupaus."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── DIGITAL TWIN — alkuperäinen, siirretty alemmas ─── */}
        <div className="mb-16">
          <div className="bg-gradient-to-br from-gray-900 via-black to-gray-800 rounded-3xl p-8 md:p-16 shadow-2xl relative overflow-hidden border border-white/10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-orange-400/30 mb-6">
                <Brain className="w-5 h-5 text-orange-300" />
                <span className="font-bold text-orange-200 tracking-wide uppercase text-sm">
                  {language === "en" ? "Not Just AI" : "Ei Vain AI"}
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white">
                {language === "en" ? "Your Digital Twin." : "Sinun Digitaalinen Kaksosesi."}
              </h2>

              <p className="text-lg md:text-xl text-gray-300 mb-8">
                {language === "en"
                  ? "Generic AI creates robotic text. Our engine analyzes your profile psychologically and writes in YOUR unique voice."
                  : "Geneerinen AI luo robottitekstiä. Meidän järjestelmämme analysoi profiilisi psykologisesti ja kirjoittaa SINUN ainutlaatuisella äänelläsi."}
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                    <X className="w-5 h-5 text-red-400" />
                    Generic AI
                  </h3>
                  <p className="text-sm text-gray-400 italic">
                    "I am a hard working individual..."
                  </p>
                </div>
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-md p-6 rounded-3xl border border-green-500/20">
                  <h3 className="font-bold text-lg mb-2 flex items-center gap-2 text-green-300">
                    <Check className="w-5 h-5" />
                    HappyApplaid
                  </h3>
                  <p className="text-sm text-gray-200 italic">
                    {language === "en"
                      ? "\"My analytical approach helped me lead the X project...\""
                      : "\"Analyyttinen lähestymistapani auttoi johtamaan X-projektia...\""}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── AI GROWS — alkuperäinen säilytetty ─── */}
        <div className="mb-16">
          <div className="max-w-4xl mx-auto bg-gradient-to-br from-gray-900/50 via-black/50 to-gray-800/50 backdrop-blur-2xl rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-orange-400/30 mb-6">
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-orange-300 text-sm">
                  {language === "en" ? "Smart & Adaptive" : "Älykäs & Mukautuva"}
                </span>
              </div>

              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-100 mb-6">
                {language === "en" ? "AI That Grows With You" : "AI Joka Kasvaa Kanssasi"}
              </h2>

              <p className="text-lg md:text-xl text-gray-300 mb-8">
                {language === "en"
                  ? "Our AI asks smart questions when it needs more info. It learns and saves answers to your profile."
                  : "AI kysyy älykkäitä kysymyksiä kun tarvitsee lisätietoja. Se oppii ja tallentaa vastaukset profiiliisi."}
              </p>

              <div className="grid sm:grid-cols-2 gap-6">
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                  <MessageCircle className="w-8 h-8 text-orange-400 mb-3" />
                  <h3 className="font-bold text-lg text-gray-100 mb-2">
                    {language === "en" ? "Smart Questions" : "Älykkäät Kysymykset"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {language === "en" ? "Contextual follow-ups" : "Kontekstuaaliset jatkokysymykset"}
                  </p>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10">
                  <Lightbulb className="w-8 h-8 text-yellow-400 mb-3" />
                  <h3 className="font-bold text-lg text-gray-100 mb-2">
                    {language === "en" ? "Gets Smarter" : "Viisastuu"}
                  </h3>
                  <p className="text-sm text-gray-400">
                    {language === "en" ? "Improves with every application" : "Paranee joka hakemuksella"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── FEATURES GRID — päivitetty sisältö ─── */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-100 mb-8">
            {language === "en" ? "Everything You Need" : "Kaikki Mitä Tarvitset"}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 hover:border-orange-400/30 transition-all">
              <Target className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100 flex items-center gap-2">
                {language === "en" ? "ATS Optimized" : "ATS-Optimoitu"}
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Premium</span>
              </h3>
              <p className="text-sm text-gray-400">
                {language === "en" ? "Exact keyword matching — like real ATS systems" : "Täsmällinen keyword matching — kuten oikeat ATS-järjestelmät"}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 hover:border-orange-400/30 transition-all">
              <TrendingDown className="w-10 h-10 text-amber-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100 flex items-center gap-2">
                {language === "en" ? "Experience Gap Analysis" : "Kokemuskuilu-analyysi"}
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Premium</span>
              </h3>
              <p className="text-sm text-gray-400">
                {language === "en" ? "Low / Medium / High severity — not just a list" : "Low / Medium / High — ei vain lista puuttuvista"}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 hover:border-orange-400/30 transition-all">
              <Star className="w-10 h-10 text-amber-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100 flex items-center gap-2">
                {language === "en" ? "STAR Method" : "STAR-Metodi"}
                <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">Premium</span>
              </h3>
              <p className="text-sm text-gray-400">
                {language === "en" ? "Proven framework to sell your skills" : "Todistettu viitekehys myydä taitosi"}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 hover:border-orange-400/30 transition-all">
              <Shield className="w-10 h-10 text-green-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100">
                {language === "en" ? "Job-Targeted" : "Työkohtainen"}
              </h3>
              <p className="text-sm text-gray-400">
                {language === "en" ? "Every application matched to the job" : "Jokainen hakemus sovitettu työhön"}
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl p-6 rounded-3xl border border-white/10 hover:border-orange-400/30 transition-all">
              <FileText className="w-10 h-10 text-orange-400 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-100">
                {language === "en" ? "PDF Export" : "PDF-Vienti"}
              </h3>
              <p className="text-sm text-gray-400">
                {language === "en" ? "Professional PDF downloads" : "Ammattimaiset PDF-lataukset"}
              </p>
            </div>

            <div className="bg-gray-900/50 backdrop-blur-xl p-6 rounded-3xl border border-white/5 relative overflow-hidden grayscale opacity-60">
              <div className="absolute top-3 right-3 bg-yellow-500/80 text-black text-[10px] font-bold px-2 py-1 rounded uppercase">
                {language === "en" ? "Soon" : "Pian"}
              </div>
              <Database className="w-10 h-10 text-gray-500 mb-4" />
              <h3 className="font-bold text-lg mb-2 text-gray-400">
                {language === "en" ? "HR Knowledge Base" : "HR-Tietokanta"}
              </h3>
              <p className="text-sm text-gray-500">
                {language === "en" ? "Expert hiring insights" : "Asiantuntija-rekrytointitietoa"}
              </p>
            </div>
          </div>
        </div>

        {/* ─── PRICING — tokens vaihdettu hyödyiksi ─── */}
        <div id="pricing" className="bg-white/5 backdrop-blur-2xl rounded-3xl p-8 md:p-12 border border-white/10 shadow-2xl mb-16 scroll-mt-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
              {language === "en" ? "Simple Pricing" : "Yksinkertainen Hinnoittelu"}
            </h2>
            <p className="text-lg text-gray-300">
              {language === "en" ? "Start free — upgrade when you need more" : "Aloita ilmaiseksi — päivitä kun tarvitset"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">

            {/* Free */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-gray-100">
                {language === "en" ? "Free" : "Ilmainen"}
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">0€</span>
                <span className="text-gray-400 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5" />
                  <span className="text-sm text-gray-300">
                    {language === "en" ? "1 Free General CV + Letter" : "1 Ilmainen Yleinen CV + Kirje"}
                  </span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-500">
                    {language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}
                  </span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-500">
                    {language === "en" ? "No experience gap analysis" : "Ei kokemuskuilu-analyysiä"}
                  </span>
                </li>
              </ul>
              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <Button variant="outline" className="w-full border-white/20 bg-white/5 text-gray-200 hover:bg-white/10">
                  {language === "en" ? "Start Free" : "Aloita"}
                </Button>
              </SignUpButton>
            </div>

            {/* Basic */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-blue-400/30 flex flex-col">
              <h3 className="text-xl font-bold mb-2 text-blue-300">Basic</h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">4.99€</span>
                <span className="text-gray-400 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-400 mt-0.5" />
                  <span className="text-sm text-gray-300">
                    {language === "en" ? "Unlimited General CVs & Letters" : "Rajattomat Yleiset CV:t ja kirjeet"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-blue-400 mt-0.5" />
                  <span className="text-sm text-gray-300">
                    {language === "en" ? "Describes your authentic self" : "Kuvaa aitoa sinua"}
                  </span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span className="text-sm text-gray-500">
                    {language === "en" ? "No ATS optimization" : "Ei ATS-optimointia"}
                  </span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30">
                  {language === "en" ? "Choose Basic" : "Valitse Basic"}
                </Button>
              </Link>
            </div>

            {/* Premium */}
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 backdrop-blur-md rounded-3xl p-6 border border-amber-400/40 shadow-2xl relative scale-105 flex flex-col">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                {language === "en" ? "Best Value" : "Paras"}
              </div>
              <h3 className="text-xl font-bold mb-2 text-amber-300 flex items-center gap-2">
                Premium <Crown className="w-4 h-4" />
              </h3>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-100">14.99€</span>
                <span className="text-gray-300 text-sm">/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5" />
                  <span className="text-sm font-bold text-amber-200">
                    {language === "en" ? "✨ ATS Optimized — exact matching" : "✨ ATS-Optimoitu — täsmällinen matching"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5" />
                  <span className="text-sm font-bold text-amber-200">
                    {language === "en" ? "✨ Experience Gap Analysis" : "✨ Kokemuskuilu-analyysi"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5" />
                  <span className="text-sm font-bold text-amber-200">
                    {language === "en" ? "✨ Job-Specific Targeting" : "✨ Työkohtainen Kohdistus"}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-amber-400 mt-0.5" />
                  <span className="text-sm font-bold text-amber-200">
                    {language === "en" ? "✨ STAR Methodology" : "✨ STAR-Metodologia"}
                  </span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
                  {language === "en" ? "Choose Premium" : "Valitse Premium"}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ─── FINAL CTA — uusi viesti ─── */}
        <div className="bg-gradient-to-r from-orange-500/20 to-amber-500/20 backdrop-blur-2xl rounded-3xl p-12 md:p-16 text-center shadow-2xl border border-orange-400/30">
          <h2 className="text-3xl md:text-5xl font-extrabold mb-6 text-white">
            {language === "en" ? "Stop guessing. Apply strategically." : "Lopeta arvaileminen. Hae strategisesti."}
          </h2>
          <p className="text-lg md:text-xl mb-8 text-gray-200 max-w-2xl mx-auto">
            {language === "en"
              ? "Create your profile once. Know where you stand — before you send."
              : "Luo profiili kerran. Tiedä missä olet — ennen kuin lähetät."}
          </p>

          <SignUpButton mode="modal" appearance={clerkAppearance}>
            <Button className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:bg-gray-100 shadow-xl transform hover:scale-105 transition-all">
              <Sparkles className="inline w-5 h-5 mr-2" />
              {language === "en" ? "Start Free Now" : "Aloita Ilmaiseksi"}
            </Button>
          </SignUpButton>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 py-12 text-center text-gray-500 border-t border-white/10 mt-16">
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">
            © {new Date().getFullYear()} HappyApplaid. {language === "en" ? "All rights reserved." : "Kaikki oikeudet pidätetään."}
          </p>
        </div>
      </footer>
    </div>
  );
}

 return (
  <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans">
    
    {/* --- PROFIILI MODAALI --- */}
    {showProfilePrompt && profileCompleted === false && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className="backdrop-blur-2xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-300">
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
      <div className="mb-10 backdrop-blur-xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-[2.5rem] shadow-xl shadow-black/50 p-8 sm:p-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full -mr-10 -mt-10"></div>
        
        <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300
 bg-clip-text text-transparent mb-3 tracking-tight">
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
            <div className="h-full backdrop-blur-xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-[2rem] shadow-lg p-8 group-hover:shadow-2xl group-hover:shadow-orange-500/20 group-hover:-translate-y-2 transition-all duration-300">
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
   
      </div>

      {/* --- OMAT DOKUMENTIT --- */}
      <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-[#2a2a2a] rounded-[2.5rem] shadow-xl p-8 sm:p-10">
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