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
import { useTheme } from "@/context/ThemeContext";
import { SmartSuggestions } from "@/components/SmartSuggestions";
import { supabaseAdmin } from "@/lib/supabase";

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
  const [hasRunATS, setHasRunATS] = useState(false);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [hasHighGap, setHasHighGap] = useState(false);
  const displayName = user?.firstName || null;


  // ✅ LISÄÄ TÄMÄ UUSI useEffect
  useEffect(() => {
    const loadATSStatus = async () => {
      if (!isSignedIn || !user?.id) return;

      try {
        const { data, error } = await supabaseAdmin
          .from('ats_checks')
          .select('score, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setHasRunATS(true);
          setAtsScore(data.score || null);
          // Jos sinulla on gap_severity kenttä:
          // setHasHighGap(data.gap_severity === 'high');
        }
      } catch (err) {
        console.error('Error loading ATS status:', err);
      }
    };

    if (isLoaded && isSignedIn) {
      loadATSStatus();
    }
  }, [isSignedIn, user?.id, isLoaded]);

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
  const { isDark } = useTheme();

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
//
// LISÄÄ sivun yläosaan importit (jos ei jo ole):
//   import { useTheme } from '@/context/ThemeContext';
//   import ThemeToggle from '@/components/ThemeToggle';
//
// Uudet lucide-react ikonit tarvittaessa: AlertTriangle, TrendingDown, Play
// Muut ikonit ja Clerk/Button/Link ovat samat kuin aiemmin.

if (!isSignedIn) {
  const t = (fi: string, en: string) => language === "en" ? en : fi;

  // ── Uudelleenkäytettävä mid-page CTA -komponentti ─────────────────────
  const MidPageCTA = ({ label }: { label: string }) => (
    <div className="text-center mt-10 mb-2">
      <SignUpButton mode="modal" appearance={clerkAppearance}>
        <Button className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-orange-500/40 transform hover:scale-105 transition-all">
          <Sparkles className="inline w-5 h-5 mr-2" />
          {label}
        </Button>
      </SignUpButton>
      <p className={`text-xs mt-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
        {t("Ei luottokorttia. Tulos 60 sekunnissa.", "No credit card. Result in 60 seconds.")}
      </p>
    </div>
  );

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      isDark ? "bg-[#0d0d14] text-[#e7e3dc]" : "bg-[#f8f7f4] text-[#1a1a2e]"
    }`}>

      {/* ── TAUSTAKUVIOT ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse ${isDark ? "bg-orange-500/10" : "bg-orange-300/20"}`}></div>
        <div className={`absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse ${isDark ? "bg-orange-500/8" : "bg-amber-200/25"}`} style={{ animationDelay: "1s" }}></div>
        <div className={`absolute top-1/2 left-1/2 w-72 h-72 rounded-full blur-3xl animate-pulse ${isDark ? "bg-amber-500/8" : "bg-orange-200/20"}`} style={{ animationDelay: "2s" }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16">

        {/* ══════════════════════════════════════════════════
            1. HERO — ei muutosta, toimii hyvin
        ══════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className={`backdrop-blur-2xl border rounded-3xl shadow-2xl p-8 md:p-16 relative overflow-hidden transition-colors duration-300 ${
            isDark ? "bg-[#1a1a1a]/70 border-[#2a2a2a] shadow-black/50" : "bg-white/80 border-orange-200/60 shadow-orange-100/50"
          }`}>
            <div className={`absolute inset-0 bg-gradient-to-br pointer-events-none rounded-3xl ${
              isDark ? "from-white/5 via-transparent to-orange-500/5" : "from-orange-50/50 via-transparent to-amber-50/30"
            }`}></div>

            <div className="relative z-10 text-center">
              <div className={`inline-flex items-center gap-2 px-6 py-3 backdrop-blur-md rounded-full border shadow-xl mb-6 transition-colors duration-300 ${
                isDark ? "bg-black/40 border-orange-400/30" : "bg-orange-50 border-orange-300/50"
              }`}>
                <Sparkles className="w-5 h-5 text-orange-400" />
                <span className="font-bold text-orange-400 text-sm">
                  {t("Realistinen ATS-analyysi", "Realistic ATS Analysis")}
                </span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">
                <span className="bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  {t("Selvitä pääsetkö läpi.", "See if you'd actually pass.")}
                </span>
                <br />
                <span className={isDark ? "text-gray-100" : "text-gray-800"}>
                  {t("Ennen kuin haet.", "Before you apply.")}
                </span>
              </h1>

              <p className={`text-lg md:text-xl max-w-2xl mx-auto leading-relaxed mb-8 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t(
                  "75% hakemuksista hylätään automaattisesti. HappyApplaid näyttää kilpailukykysi, kokemuskuilusi ja keyword-osuman — ennen kuin lähetät.",
                  "75% of applications are auto-rejected. HappyApplaid shows your competitiveness, experience gaps, and keyword match — before you apply."
                )}
              </p>

              <HowItWorksTimeline />

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 mb-8">
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <Button className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl font-bold text-lg shadow-xl hover:shadow-orange-500/50 transform hover:scale-105 transition-all">
                    <Sparkles className="inline w-5 h-5 mr-2" />
                    {t("Testaa hakemukseni ilmaiseksi", "Test My Application Free")}
                  </Button>
                </SignUpButton>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                  className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-lg transition-all ${
                    isDark ? "bg-white/5 backdrop-blur-md text-orange-300 border-orange-400/30 hover:bg-white/10" : "bg-orange-50 text-orange-600 border-orange-300 hover:bg-orange-100"
                  }`}
                >
                  {t("Katso Hinnoittelu", "See Pricing")}
                </Button>
              </div>

              <div className={`flex flex-wrap items-center justify-center gap-4 text-sm max-w-2xl mx-auto font-medium ${isDark ? "text-gray-300" : "text-gray-500"}`}>
                {[
                  { icon: <CreditCard className="w-4 h-4 text-green-500" />, label: t("Ei luottokorttia", "No credit card") },
                  { icon: <Clock className="w-4 h-4 text-orange-400" />, label: t("Tulos 60 sekunnissa", "Result in 60 sec") },
                  { icon: <Check className="w-4 h-4 text-green-500" />, label: t("Ei PII:tä AI:lle", "No personal data to AI") },
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors duration-300 ${
                    isDark ? "bg-black/30 border-white/10" : "bg-white/70 border-gray-200"
                  }`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            VIDEO PLACEHOLDER — heron alla, ennen reality checkiä
            Korvaa src omalla videollasi kun se on valmis.
            Rakenne: "You apply → no reply → here's why → gap → CTA"
        ══════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className={`rounded-3xl overflow-hidden border shadow-2xl transition-colors duration-300 ${
            isDark ? "border-white/10" : "border-gray-200"
          }`}>
            {/* Vaihda tämä <video> tai <iframe> -elementiksi kun video on valmis */}
            <div className={`relative aspect-video flex items-center justify-center cursor-pointer group transition-colors duration-300 ${
              isDark ? "bg-[#111118]" : "bg-gray-900"
            }`}>
              {/* Taustakuvio */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-amber-500/10"></div>

              {/* Play-nappi */}
              <div className="relative z-10 flex flex-col items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-gradient-to-r from-orange-500 to-amber-600 flex items-center justify-center shadow-2xl shadow-orange-500/40 group-hover:scale-110 transition-transform duration-200">
                  <Play className="w-8 h-8 text-white ml-1" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-lg">
                    {t("Katso miten se toimii", "See how it works")}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {t("90 sekuntia — ennen kuin lähetät seuraavan hakemuksesi", "90 seconds — before you send your next application")}
                  </p>
                </div>
              </div>

              {/* TODO: Kun video on valmis, korvaa tämä div:
              <video
                controls
                poster="/video-thumbnail.jpg"
                className="w-full h-full object-cover"
              >
                <source src="/demo-video.mp4" type="video/mp4" />
              </video>
              */}
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            2. REALITY CHECK — tiivistetty ~25%
        ══════════════════════════════════════════════════ */}
        <div className="mb-8">
          <div className={`rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden border transition-colors duration-300 ${
            isDark ? "bg-gradient-to-br from-red-900/20 via-orange-900/10 to-red-900/20 border-red-500/20" : "bg-gradient-to-br from-red-50 via-orange-50/50 to-red-50 border-red-200/60"
          }`}>
            <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-20 -mt-20 ${isDark ? "bg-red-500/10" : "bg-red-200/30"}`}></div>
            <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl -ml-20 -mb-20 ${isDark ? "bg-orange-500/10" : "bg-orange-200/30"}`}></div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full border mb-5 transition-colors duration-300 ${
                isDark ? "bg-red-500/15 border-red-400/30" : "bg-red-100 border-red-300/50"
              }`}>
                <AlertTriangle className={`w-5 h-5 ${isDark ? "text-red-300" : "text-red-500"}`} />
                <span className={`font-bold tracking-wide uppercase text-sm ${isDark ? "text-red-200" : "text-red-600"}`}>
                  {t("Todellinen ongelma", "The Real Problem")}
                </span>
              </div>

              <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("Useimmat hakijat jäävät näkemättä.", "Most applicants never get seen.")}
              </h2>

              <p className={`text-lg max-w-2xl mx-auto mb-8 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                {t(
                  "Seulontajärjestelmät suodattavat hakemuksia mekaanisesti kaikilla aloilla — ilman kontekstia, ilman harkintaa. Täsmälliset sanat ratkaisevat, ei potentiaali.",
                  "Screening systems filter applications mechanically across all industries — no context, no judgment. Exact words decide, not potential."
                )}
              </p>

              {/* Kaksi esimerkkiä */}
              <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
                {[
                  {
                    badge: t("Varhainen ura", "Early career"),
                    title: t("Hakija → Asiakaspalvelurooli", "Applicant → Customer Service role"),
                    keywords: [
                      { label: t("Viestintätaidot", "Communication skills"), found: true },
                      { label: t("Asiakaskohtaaminen", "Customer interaction"), found: true },
                      { label: t("CRM-kokemus", "CRM experience"), found: false },
                      { label: t("1+ vuoden kokemus", "1+ year experience"), found: false },
                    ],
                    score: "58%", risk: t("Kohtalainen riski", "Medium risk"), riskColor: "text-amber-500",
                    tip: t("Lisää konkreettisia tilanteita", "Add concrete examples"),
                  },
                  {
                    badge: t("Kilpailtu rooli", "Competitive role"),
                    title: t("Hakija → Senior markkinointiasiantuntija", "Applicant → Senior Marketing Specialist"),
                    keywords: [
                      { label: t("Kampanjanhallinta", "Campaign management"), found: true },
                      { label: t("Budjettiosaaminen", "Budget management"), found: true },
                      { label: t("5+ vuoden kokemus", "5+ years experience"), found: false },
                      { label: t("Tiiminjohtaminen", "Team leadership"), found: false },
                      { label: t("Edistynyt analytiikka", "Advanced analytics"), found: false },
                    ],
                    score: "42%", risk: t("Korkea riski", "High risk"), riskColor: "text-red-500",
                    tip: t("Korosta mitattavia tuloksia", "Highlight measurable results"),
                  },
                ].map((ex, i) => (
                  <div key={i} className={`backdrop-blur-md rounded-2xl p-5 border text-left transition-colors duration-300 ${
                    isDark ? "bg-black/40 border-white/10" : "bg-white/80 border-gray-200"
                  }`}>
                    <p className={`text-xs mb-1 uppercase tracking-wide font-semibold ${isDark ? "text-gray-500" : "text-gray-400"}`}>{ex.badge}</p>
                    <p className={`text-sm mb-3 font-medium ${isDark ? "text-gray-300" : "text-gray-700"}`}>{ex.title}</p>
                    <div className="space-y-1.5 mb-3">
                      {ex.keywords.map((kw, j) => (
                        <div key={j} className={`flex items-center justify-between py-1 px-2.5 rounded-lg ${isDark ? "bg-white/5" : "bg-gray-50"}`}>
                          <span className={`text-xs ${isDark ? "text-gray-300" : "text-gray-600"}`}>{kw.label}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${kw.found ? "text-green-500 bg-green-500/10" : "text-red-500 bg-red-500/10"}`}>
                            {kw.found ? "✓" : "✗"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`flex items-center justify-between pt-2 border-t ${isDark ? "border-white/10" : "border-gray-200"}`}>
                      <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{t("ATS-pisteet", "ATS Score")}</span>
                      <span className={`font-bold text-sm ${ex.riskColor}`}>{ex.score} — {ex.risk}</span>
                    </div>
                    <p className={`text-xs mt-1.5 italic ${isDark ? "text-gray-500" : "text-gray-400"}`}>→ {ex.tip}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MID-PAGE CTA #1 — heti Reality Checkin jälkeen ──────────────
            Käyttäjä on juuri pelästynyt. Nyt on oikea hetki. */}
        <MidPageCTA label={t("Tarkista hakemukseni nyt — ilmaiseksi", "Check My Application Now — Free")} />

        {/* ══════════════════════════════════════════════════
            3. KENELLE — tiivistetty
        ══════════════════════════════════════════════════ */}
        <div className="mb-16 mt-16">
          <div className="text-center mb-8">
            <h2 className={`text-3xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
              {t("Tunnistatko itsesi?", "Does this sound like you?")}
            </h2>
            <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
              {t("Ensimmäisestä hakemuksesta johtotason rooliin — millä alalla tahansa.", "From early career to senior roles — in any industry.")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                emoji: "🌱",
                title: t("Varhainen ura", "Early career"),
                subtitle: t("Opiskelija, harjoittelija tai vasta aloittanut", "Student, trainee, or new to the workforce"),
                points: [
                  t("Lähetät hakemuksia mutta et saa vastauksia", "Sending applications but getting no replies"),
                  t("Et tiedä miksi hakemus hylätään", "Not sure why applications get rejected"),
                  t("Haluat hyödyntää sen mitä sinulla on", "Want to make the most of what you have"),
                ],
                cta: t("Tiedä missä olet — ennen kuin lähetät.", "Know where you stand — before you send."),
                darkCard: "from-orange-900/20 to-amber-900/10 border-orange-500/20",
                lightCard: "from-orange-50 to-amber-50 border-orange-200/60",
                darkTitle: "text-orange-300", lightTitle: "text-orange-600",
                darkArrow: "text-orange-400", lightArrow: "text-orange-500",
                darkCta: "text-orange-300/70", lightCta: "text-orange-500/80",
              },
              {
                emoji: "🎯",
                title: t("Tähtäät korkeammalle", "Aiming higher"),
                subtitle: t("Alanvaihtaja tai kilpailtuihin rooleihin tähtäävä", "Career changer or targeting competitive roles"),
                points: [
                  t("Sinulla on kokemusta — mutta et tiedä miten se kääntyy", "You have experience — but unsure how it translates"),
                  t("Haet tietämättä todellisia mahdollisuuksiasi", "Applying without knowing your real chances"),
                  t("Hakukirjeet eivät tunnu kolahtavan", "Cover letters feel generic and don't land"),
                ],
                cta: t("Näe kuilu rehellisesti — sitten kuroe se umpeen.", "See the gap honestly — then close it."),
                darkCard: "from-indigo-900/20 to-purple-900/10 border-indigo-500/20",
                lightCard: "from-indigo-50 to-purple-50 border-indigo-200/60",
                darkTitle: "text-indigo-300", lightTitle: "text-indigo-600",
                darkArrow: "text-indigo-400", lightArrow: "text-indigo-500",
                darkCta: "text-indigo-300/70", lightCta: "text-indigo-500/80",
              },
            ].map((seg, i) => (
              <div key={i} className={`bg-gradient-to-br rounded-3xl p-8 border transition-colors duration-300 ${isDark ? seg.darkCard : seg.lightCard}`}>
                <div className="text-4xl mb-4">{seg.emoji}</div>
                <h3 className={`font-bold text-xl mb-1 ${isDark ? seg.darkTitle : seg.lightTitle}`}>{seg.title}</h3>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}>{seg.subtitle}</p>
                <ul className={`space-y-2 text-sm mb-5 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {seg.points.map((p, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <span className={`mt-0.5 ${isDark ? seg.darkArrow : seg.lightArrow}`}>→</span>
                      {p}
                    </li>
                  ))}
                </ul>
                <p className={`text-sm italic ${isDark ? seg.darkCta : seg.lightCta}`}>{seg.cta}</p>
              </div>
            ))}
          </div>
          <p className={`text-sm text-center mt-5 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
            {t(
              "Toimii terveydenhuollossa, liiketoiminnassa, opetuksessa, IT:ssä, markkinoinnissa — millä alalla tahansa.",
              "Works for healthcare, business, education, tech, marketing — any field, any level."
            )}
          </p>
        </div>

        {/* ══════════════════════════════════════════════════
            4. ATS HIGHLIGHT
        ══════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className={`rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden border transition-colors duration-300 ${
            isDark ? "bg-gradient-to-br from-green-900/30 via-emerald-900/20 to-green-800/30 border-green-500/30" : "bg-gradient-to-br from-green-50 via-emerald-50/50 to-green-50 border-green-200/60"
          }`}>
            <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl -mr-20 -mt-20 ${isDark ? "bg-green-500/20" : "bg-green-200/40"}`}></div>
            <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-3xl -ml-20 -mb-20 ${isDark ? "bg-emerald-500/15" : "bg-emerald-200/30"}`}></div>

            <div className="relative z-10 max-w-4xl mx-auto text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full border mb-5 transition-colors duration-300 ${
                isDark ? "bg-green-500/20 border-green-400/40" : "bg-green-100 border-green-300/50"
              }`}>
                <Shield className={`w-5 h-5 ${isDark ? "text-green-300" : "text-green-600"}`} />
                <span className={`font-bold tracking-wide uppercase text-sm ${isDark ? "text-green-200" : "text-green-700"}`}>
                  {t("Ei pelkkiä avainsanoja", "Not just keywords")}
                </span>
              </div>

              <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
                {t("Oikea analyysi. Oikea strategia.", "Real analysis. Real strategy.")}
              </h2>

              <p className={`text-lg max-w-2xl mx-auto mb-8 ${isDark ? "text-gray-200" : "text-gray-600"}`}>
                {t(
                  "Useimmat checkerit antavat prosentin. HappyApplaid kertoo koko kuvan — kokemuskuilut, kilpailukyvyn, ja suoran suosituksen: kannattaako hakea.",
                  "Most checkers give you a percentage. HappyApplaid gives the full picture — experience gaps, competitiveness, and a direct recommendation: apply or not."
                )}
              </p>

              <div className="grid md:grid-cols-3 gap-5 mb-8">
                {[
                  {
                    icon: <Target className={`w-10 h-10 mb-3 mx-auto ${isDark ? "text-green-400" : "text-green-600"}`} />,
                    title: t("Täsmällinen matching", "Exact Keyword Match"),
                    desc: t("Kuten oikeat ATS:t — ei synonyymitemppuja", "Like real ATS — no synonym tricks"),
                  },
                  {
                    icon: <TrendingDown className={`w-10 h-10 mb-3 mx-auto ${isDark ? "text-green-400" : "text-green-600"}`} />,
                    title: t("Kokemuskuilu", "Experience Gap"),
                    desc: t("Low / Medium / High vakavuus — ei vain lista", "Low / Medium / High severity — not just a list"),
                  },
                  {
                    icon: <CheckCircle className={`w-10 h-10 mb-3 mx-auto ${isDark ? "text-green-400" : "text-green-600"}`} />,
                    title: t("Hae / Älä hae", "Apply / Don't Apply"),
                    desc: t("Rehellinen suositus — ei false hope", "Honest call — no false hope"),
                  },
                ].map((item, i) => (
                  <div key={i} className={`backdrop-blur-md p-5 rounded-3xl border transition-colors duration-300 ${
                    isDark ? "bg-white/5 border-green-500/20" : "bg-white/70 border-green-200/50"
                  }`}>
                    {item.icon}
                    <h3 className={`font-bold text-base mb-1 ${isDark ? "text-green-300" : "text-green-700"}`}>{item.title}</h3>
                    <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{item.desc}</p>
                  </div>
                ))}
              </div>

              {/* Privacy */}
              <div className={`backdrop-blur-md p-4 rounded-2xl border text-left transition-colors duration-300 ${
                isDark ? "bg-emerald-500/10 border-green-500/20" : "bg-green-50 border-green-200/60"
              }`}>
                <div className="flex items-start gap-3">
                  <Shield className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? "text-green-400" : "text-green-600"}`} />
                  <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    <span className={`font-bold ${isDark ? "text-green-300" : "text-green-700"}`}>
                      {t("Tietosuoja arkkitehtuurin tasolla. ", "Privacy-first by architecture. ")}
                    </span>
                    {t(
                      "Nimesi, emailisi ja puhelinnumerosi eivät koskaan mene AI:lle — tekninen valinta, ei lupaus.",
                      "Your name, email, and phone never go to AI — a technical decision, not just a promise."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            5. INTELLIGENT ENGINE — Digital Twin + AI Grows yhdistetty
        ══════════════════════════════════════════════════ */}
        <div className="mb-16">
          <div className={`rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden border transition-colors duration-300 ${
            isDark ? "bg-gradient-to-br from-gray-900 via-black to-gray-800 border-white/10" : "bg-gradient-to-br from-gray-50 via-white to-gray-50 border-gray-200"
          }`}>
            <div className={`absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl -mr-16 -mt-16 ${isDark ? "bg-orange-500/10" : "bg-orange-100/40"}`}></div>
            <div className={`absolute bottom-0 left-0 w-80 h-80 rounded-full blur-3xl -ml-16 -mb-16 ${isDark ? "bg-amber-500/10" : "bg-amber-100/40"}`}></div>

            <div className="relative z-10 max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <div className={`inline-flex items-center gap-2 px-4 py-2 backdrop-blur-md rounded-full border mb-5 transition-colors duration-300 ${
                  isDark ? "bg-white/5 border-orange-400/30" : "bg-orange-50 border-orange-300/50"
                }`}>
                  <Brain className={`w-5 h-5 ${isDark ? "text-orange-300" : "text-orange-500"}`} />
                  <span className={`font-bold tracking-wide uppercase text-sm ${isDark ? "text-orange-200" : "text-orange-600"}`}>
                    {t("Älykäs hakemuskone", "Intelligent Engine")}
                  </span>
                </div>

                <h2 className={`text-3xl md:text-4xl font-extrabold mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  {t("Kirjoittaa sinun äänelläsi. Oppii joka kerta.", "Writes in your voice. Learns every time.")}
                </h2>
                <p className={`text-lg max-w-2xl mx-auto ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  {t(
                    "Ei robottitekstiä. Järjestelmä analysoi profiilisi, kysyy älykkäitä lisäkysymyksiä ja tallentaa vastauksesi — jotta jokainen hakemus on parempi kuin edellinen.",
                    "No robotic text. The engine analyzes your profile, asks smart follow-ups, and saves your answers — so every application improves on the last."
                  )}
                </p>
              </div>

              {/* Neljä korttia 2x2 */}
              <div className="grid sm:grid-cols-2 gap-5">
                {[
                  {
                    icon: <X className="w-5 h-5 text-red-400" />,
                    label: "Generic AI",
                    content: '"I am a hard working individual with excellent communication skills..."',
                    highlight: false,
                  },
                  {
                    icon: <Check className="w-5 h-5 text-green-400" />,
                    label: "HappyApplaid",
                    content: t(
                      '"Analyyttinen lähestymistapani auttoi tiimimme lyhentämään asiakasvasteaikaa 40%..."',
                      '"My analytical approach helped our team cut customer response time by 40%..."'
                    ),
                    highlight: true,
                  },
                  {
                    icon: <MessageCircle className="w-5 h-5 text-orange-400" />,
                    label: t("Älykkäät kysymykset", "Smart follow-ups"),
                    content: t(
                      "Kun tietoa puuttuu, järjestelmä kysyy — oikeaan aikaan, oikeasta asiasta.",
                      "When info is missing, the engine asks — at the right time, about the right thing."
                    ),
                    highlight: false,
                  },
                  {
                    icon: <Lightbulb className="w-5 h-5 text-yellow-400" />,
                    label: t("Paranee käytöllä", "Gets better with use"),
                    content: t(
                      "Vastauksesi tallentuvat profiiliisi. Seuraava hakemus on nopeampi ja tarkempi.",
                      "Your answers are saved. The next application is faster and more accurate."
                    ),
                    highlight: false,
                  },
                ].map((card, i) => (
                  <div key={i} className={`backdrop-blur-md p-5 rounded-2xl border transition-colors duration-300 ${
                    card.highlight
                      ? isDark ? "bg-green-500/10 border-green-500/20" : "bg-green-50 border-green-200/60"
                      : isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {card.icon}
                      <span className={`font-bold text-sm ${isDark ? "text-gray-200" : "text-gray-700"}`}>{card.label}</span>
                    </div>
                    <p className={`text-sm italic ${isDark ? "text-gray-400" : "text-gray-500"}`}>{card.content}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            6. FEATURES — tiivistetty 6 → 4
        ══════════════════════════════════════════════════ */}
        <div className="mb-16">
          <h2 className={`text-3xl font-bold text-center mb-8 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
            {t("Kaikki Mitä Tarvitset", "Everything You Need")}
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <Target className="w-9 h-9 text-green-500 mb-3" />,
                title: t("ATS-Optimoitu", "ATS Optimized"),
                desc: t("Täsmällinen keyword matching — kuten oikeat ATS:t", "Exact keyword matching — like real ATS systems"),
                tag: "Premium",
              },
              {
                icon: <TrendingDown className="w-9 h-9 text-amber-400 mb-3" />,
                title: t("Kokemuskuilu", "Experience Gap"),
                desc: t("Low / Medium / High — strateginen suositus", "Low / Medium / High — with strategic advice"),
                tag: "Premium",
              },
              {
                icon: <Star className="w-9 h-9 text-amber-400 mb-3" />,
                title: "STAR-Metodi",
                desc: t("Todistettu viitekehys — myy taitosi oikein", "Proven framework — sell your skills right"),
                tag: "Premium",
              },
              {
                icon: <FileText className="w-9 h-9 text-orange-400 mb-3" />,
                title: t("PDF-Vienti", "PDF Export"),
                desc: t("Ammattimaiset lataukset välittömästi", "Professional downloads instantly"),
                tag: null,
              },
            ].map((feat, i) => (
              <div key={i} className={`backdrop-blur-xl p-5 rounded-3xl border hover:border-orange-400/30 transition-all ${
                isDark ? "bg-white/5 border-white/10" : "bg-white/70 border-gray-200 hover:border-orange-300"
              }`}>
                {feat.icon}
                <h3 className={`font-bold text-base mb-1 flex items-center gap-2 ${isDark ? "text-gray-100" : "text-gray-800"}`}>
                  {feat.title}
                  {feat.tag === "Premium" && (
                    <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded-full">Premium</span>
                  )}
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── MID-PAGE CTA #2 — ennen pricingiä ───────────────────────────
            Käyttäjä on lukenut featuresit ja on valmis päätökseen. */}
        <MidPageCTA label={t("Aloita ilmaiseksi — näe tuloksesi heti", "Start Free — See Your Results Now")} />

        {/* ══════════════════════════════════════════════════
            7. PRICING
        ══════════════════════════════════════════════════ */}
        <div id="pricing" className={`backdrop-blur-2xl rounded-3xl p-8 md:p-12 border shadow-2xl mt-16 mb-16 scroll-mt-20 transition-colors duration-300 ${
          isDark ? "bg-white/5 border-white/10" : "bg-white/80 border-gray-200"
        }`}>
          <div className="text-center mb-10">
            <h2 className={`text-3xl md:text-4xl font-bold mb-3 ${isDark ? "text-gray-100" : "text-gray-900"}`}>
              {t("Yksinkertainen Hinnoittelu", "Simple Pricing")}
            </h2>
            <p className={`text-lg ${isDark ? "text-gray-300" : "text-gray-500"}`}>
              {t("Aloita ilmaiseksi — päivitä kun tarvitset", "Start free — upgrade when you need more")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">

            {/* Free */}
            <div className={`backdrop-blur-md rounded-3xl p-6 border flex flex-col transition-colors duration-300 ${
              isDark ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"
            }`}>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-gray-100" : "text-gray-800"}`}>{t("Ilmainen", "Free")}</h3>
              <div className="mb-4">
                <span className={`text-3xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>0€</span>
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("1 Yleinen CV + Kirje", "1 General CV + Letter")}
                  </span>
                </li>
                {[t("Ei ATS-analyysiä", "No ATS analysis"), t("Ei kokemuskuilu-analyysiä", "No gap analysis")].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 opacity-50">
                    <Ban className="w-4 h-4 text-gray-500 mt-0.5" />
                    <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>{item}</span>
                  </li>
                ))}
              </ul>
              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <Button variant="outline" className={`w-full transition-colors duration-300 ${
                  isDark ? "border-white/20 bg-white/5 text-gray-200 hover:bg-white/10" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}>
                  {t("Aloita", "Start Free")}
                </Button>
              </SignUpButton>
            </div>

            {/* Basic */}
            <div className={`backdrop-blur-md rounded-3xl p-6 border flex flex-col transition-colors duration-300 ${
              isDark ? "bg-white/5 border-blue-400/30" : "bg-blue-50/50 border-blue-200"
            }`}>
              <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-blue-300" : "text-blue-600"}`}>Basic</h3>
              <div className="mb-4">
                <span className={`text-3xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>4.99€</span>
                <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-400"}`}>/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-green-500 mt-0.5" />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("Rajattomat CV:t ja kirjeet", "Unlimited CVs & Letters")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className={`w-4 h-4 mt-0.5 ${isDark ? "text-blue-400" : "text-blue-500"}`} />
                  <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {t("Kirjoittaa aidon äänesi", "Captures your authentic voice")}
                  </span>
                </li>
                <li className="flex items-start gap-2 opacity-50">
                  <Ban className="w-4 h-4 text-gray-500 mt-0.5" />
                  <span className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                    {t("Ei ATS-analyysiä", "No ATS analysis")}
                  </span>
                </li>
              </ul>
              <Link href="/pricing">
                <Button className={`w-full transition-colors duration-300 ${
                  isDark ? "bg-blue-500/20 text-blue-300 border border-blue-400/30 hover:bg-blue-500/30" : "bg-blue-100 text-blue-600 border border-blue-300 hover:bg-blue-200"
                }`}>
                  {t("Valitse Basic", "Choose Basic")}
                </Button>
              </Link>
            </div>

            {/* Premium */}
            <div className={`backdrop-blur-md rounded-3xl p-6 border shadow-2xl relative scale-105 flex flex-col transition-colors duration-300 ${
              isDark ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/40" : "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300/60"
            }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                {t("Paras", "Best Value")}
              </div>
              <h3 className={`text-xl font-bold mb-2 flex items-center gap-2 ${isDark ? "text-amber-300" : "text-amber-600"}`}>
                Premium <Crown className="w-4 h-4" />
              </h3>
              <div className="mb-4">
                <span className={`text-3xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>14.99€</span>
                <span className={`text-sm ${isDark ? "text-gray-300" : "text-gray-500"}`}>/mo</span>
              </div>
              <ul className="space-y-3 mb-6 flex-1">
                {[
                  t("✨ ATS-analyysi & keyword matching", "✨ ATS analysis & keyword matching"),
                  t("✨ Kokemuskuilu-raportti", "✨ Experience Gap report"),
                  t("✨ Työkohtainen kohdistus", "✨ Job-specific targeting"),
                  t("✨ STAR-metodologia", "✨ STAR methodology"),
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-amber-400 mt-0.5" />
                    <span className={`text-sm font-semibold ${isDark ? "text-amber-200" : "text-amber-700"}`}>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/pricing">
                <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg">
                  {t("Valitse Premium", "Choose Premium")}
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            8. FINAL CTA
        ══════════════════════════════════════════════════ */}
        <div className={`backdrop-blur-2xl rounded-3xl p-12 md:p-16 text-center shadow-2xl border transition-colors duration-300 ${
          isDark ? "bg-gradient-to-r from-orange-500/20 to-amber-500/20 border-orange-400/30" : "bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200"
        }`}>
          <h2 className={`text-3xl md:text-4xl font-extrabold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
            {t("Lopeta arvaileminen. Hae strategisesti.", "Stop guessing. Apply strategically.")}
          </h2>
          <p className={`text-lg mb-8 max-w-xl mx-auto ${isDark ? "text-gray-200" : "text-gray-600"}`}>
            {t("Luo profiili kerran. Tiedä missä olet — ennen kuin lähetät.", "Create your profile once. Know where you stand — before you send.")}
          </p>
          <SignUpButton mode="modal" appearance={clerkAppearance}>
            <Button className={`px-8 py-4 rounded-xl font-bold text-lg shadow-xl transform hover:scale-105 transition-all ${
              isDark ? "bg-white text-orange-600 hover:bg-gray-100" : "bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700"
            }`}>
              <Sparkles className="inline w-5 h-5 mr-2" />
              {t("Aloita Ilmaiseksi", "Start Free Now")}
            </Button>
          </SignUpButton>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className={`relative z-10 py-10 text-center border-t mt-16 transition-colors duration-300 ${
        isDark ? "text-gray-500 border-white/10" : "text-gray-400 border-gray-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4">
          <p className="text-sm">
            © {new Date().getFullYear()} HappyApplaid.{" "}
            {t("Kaikki oikeudet pidätetään.", "All rights reserved.")}
          </p>
        </div>
      </footer>
    </div>
  );
}
// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD — Kirjautuneen käyttäjän pääsivu
// ═══════════════════════════════════════════════════════════════════════════

return (
  <div className={`min-h-screen font-sans transition-colors duration-300 ${
    isDark
      ? 'bg-gradient-to-br from-gray-900 via-black to-gray-800'
      : 'bg-gradient-to-br from-gray-50 via-white to-gray-100'
  }`}>

    {/* ═══════════════════════════════════
        PROFIILIMODAALI
    ═══════════════════════════════════ */}
    {showProfilePrompt && profileCompleted === false && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <div className={`backdrop-blur-2xl border rounded-[2.5rem] shadow-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in duration-300 transition-colors ${
          isDark ? 'bg-[#1a1a1a]/70 border-[#2a2a2a]' : 'bg-white/90 border-orange-200/60'
        }`}>
          <button
            onClick={() => setShowProfilePrompt(false)}
            className="absolute top-6 right-6 hover:bg-white/10 rounded-full p-2 transition-colors"
          >
            <X className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>

          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-orange-400/30">
            <User className="h-10 w-10 text-orange-400" />
          </div>

          <h3 className={`text-2xl font-black text-center mb-3 tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {language === 'en' ? `Hey, ${user?.firstName}!` : `Hei, ${user?.firstName}!`}
          </h3>
          <p className={`text-center mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {language === 'en'
              ? 'Fill your profile to get the best results from AI.'
              : 'Täytä profiilisi, jotta saat parhaan hyödyn tekoälystämme.'}
          </p>

          <div className="flex flex-col gap-3">
            <Link href="/profile" className="w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 rounded-2xl font-bold text-white">
                {language === 'en' ? 'Fill Profile' : 'Täytä Profiili'}
              </Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => setShowProfilePrompt(false)}
              className={`w-full h-12 rounded-2xl ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-white/5' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
            >
              {language === 'en' ? 'Maybe later' : 'Ehkä myöhemmin'}
            </Button>
          </div>
        </div>
      </div>
    )}

    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ═══════════════════════════════════
          1. TERVEHDYS + BADGE
      ═══════════════════════════════════ */}
      <div className={`mb-8 backdrop-blur-xl border rounded-[2.5rem] shadow-xl p-7 sm:p-9 relative overflow-hidden transition-colors duration-300 ${
        isDark
          ? 'bg-[#1a1a1a]/70 border-[#2a2a2a] shadow-black/50'
          : 'bg-white/80 border-orange-200/60 shadow-orange-100/30'
      }`}>
        <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl rounded-full -mr-10 -mt-10 ${
          isDark ? 'bg-orange-500/10' : 'bg-orange-200/30'
        }`}></div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 bg-clip-text text-transparent mb-2 tracking-tight">
              {language === 'en'
                ? `Welcome${displayName ? `, ${displayName}` : ''}!`
                : `Tervetuloa${displayName ? `, ${displayName}` : ''}!`}
            </h1>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
                tier === 'free'
                  ? isDark ? 'bg-gray-700/50 text-gray-300 border border-gray-600/30' : 'bg-gray-100 text-gray-500 border border-gray-300/50'
                  : isDark ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' : 'bg-orange-100 text-orange-600 border border-orange-300/50'
              }`}>
                {tier === 'free'
                  ? language === 'en' ? 'Free Member' : 'Ilmaisjäsen'
                  : tier.toUpperCase()}
              </span>
              {tier === 'free' && (
                <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {language === 'en' ? '• 1 CV + 1 Letter included' : '• Sisältää 1 CV:n + 1 hakukirjeen'}
                </p>
              )}
            </div>
          </div>
          
          {/* Setup Progress — vain jos uusi käyttäjä */}
          {(profileCompleted === false || (recentCVs.length === 0 && recentCoverLetters.length === 0)) && (
            <div className={`rounded-2xl p-4 border min-w-[200px] transition-colors duration-300 ${
              isDark ? 'bg-white/5 border-white/10' : 'bg-orange-50 border-orange-200/60'
            }`}>
              <p className={`text-xs font-bold uppercase tracking-wide mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {language === 'en' ? 'Your setup progress' : 'Aloituksen edistyminen'}
              </p>
              {[
                { 
                  label: language === 'en' ? 'Complete profile' : 'Täytä profiili', 
                  done: profileCompleted === true, 
                  href: '/profile' 
                },
                { 
                  label: language === 'en' ? 'Create first CV' : 'Luo ensimmäinen CV', 
                  done: recentCVs.length > 0, 
                  href: '/create-cv' 
                },
                { 
                  label: language === 'en' ? 'Run ATS check' : 'Aja ATS-testi', 
                  done: false, 
                  href: '/ats-checker' 
                },
              ].map((step, i) => (
                <Link key={i} href={step.done ? '#' : step.href}>
                  <div className={`flex items-center gap-2 py-1.5 text-sm transition-colors ${
                    step.done
                      ? isDark ? 'text-green-400' : 'text-green-600'
                      : isDark ? 'text-gray-300 hover:text-orange-300' : 'text-gray-600 hover:text-orange-600'
                  }`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      step.done
                        ? 'bg-green-500 text-white'
                        : isDark ? 'bg-white/10 text-gray-400' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {step.done ? '✓' : i + 1}
                    </span>
                    {step.label}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════
          2. SMART ACTION BAR — Kolme päätoimintoa
      ═══════════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          {
            href: '/ats-checker',
            icon: <Shield className="h-7 w-7 text-green-400" />,
            iconBg: isDark ? 'bg-green-500/20 border-green-400/30' : 'bg-green-100 border-green-300/50',
            title: language === 'en' ? 'Run ATS Check' : 'Aja ATS-testi',
            desc: language === 'en' ? 'See your pass probability' : 'Näe läpipääsytodennäköisyys',
            btnClass: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white',
            available: true,
          },
          {
            href: canCreateCV ? '/create-cv' : '/pricing',
            icon: <FileText className="h-7 w-7 text-orange-400" />,
            iconBg: isDark ? 'bg-orange-500/20 border-orange-400/30' : 'bg-orange-100 border-orange-300/50',
            title: language === 'en' ? 'Create CV' : 'Luo CV',
            desc: language === 'en' ? 'ATS-optimized, your voice' : 'ATS-optimoitu, sinun äänelläsi',
            btnClass: canCreateCV
              ? 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white'
              : isDark ? 'bg-white/10 text-gray-400 border border-white/10' : 'bg-gray-100 text-gray-500 border border-gray-300',
            available: canCreateCV,
          },
          {
            href: '/create-cover-letter',
            icon: <FileEdit className="h-7 w-7 text-indigo-400" />,
            iconBg: isDark ? 'bg-indigo-500/20 border-indigo-400/30' : 'bg-indigo-100 border-indigo-300/50',
            title: language === 'en' ? 'Cover Letter' : 'Hakukirje',
            desc: language === 'en' ? 'Targeted, not generic' : 'Kohdennettu, ei geneerinen',
            btnClass: 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white',
            available: true,
          },
        ].map((action, i) => (
          <Link key={i} href={action.href} className="group">
            <div className={`h-full backdrop-blur-xl border rounded-[2rem] p-6 group-hover:-translate-y-1 group-hover:shadow-xl transition-all duration-300 ${
              isDark
                ? 'bg-[#1a1a1a]/70 border-[#2a2a2a] group-hover:shadow-black/40'
                : 'bg-white/80 border-gray-200 group-hover:shadow-orange-100/50'
            }`}>
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border transition-transform group-hover:scale-110 ${action.iconBg}`}>
                {action.icon}
              </div>
              <h3 className={`font-black text-lg mb-1 tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                {action.title}
              </h3>
              <p className={`text-sm mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {action.desc}
              </p>
              <Button className={`w-full h-11 rounded-xl font-bold shadow-md transition-all text-sm ${action.btnClass}`}>
                {action.available
                  ? language === 'en' ? 'Start Now →' : 'Aloita →'
                  : language === 'en' ? 'Upgrade' : 'Päivitä'}
              </Button>
            </div>
          </Link>
        ))}
      </div>

      {/* ═══════════════════════════════════
          3. SMART SUGGESTIONS — dynaaminen
      ═══════════════════════════════════ */}
     <SmartSuggestions
  hasDocuments={recentCVs.length > 0 || recentCoverLetters.length > 0}
  hasRunATS={hasRunATS}           // ✅ Muutettu: false → hasRunATS
  atsScore={atsScore}             // ✅ Muutettu: null → atsScore
  hasHighGap={hasHighGap}         // ✅ Muutettu: false → hasHighGap
  isFreeTierLimited={tier === 'free' && hasUsedFreeCv}
  language={language}
    isDark={isDark} // ✅ LISÄÄ TÄMÄ

/>

      {/* ═══════════════════════════════════
          4. UPGRADE BANNERI — vain jos relevantti
      ═══════════════════════════════════ */}
      {tier === 'free' && hasUsedFreeCv && (
        <div className={`mb-8 backdrop-blur-xl border rounded-[2.5rem] shadow-xl p-7 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden group transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-400/30'
            : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300/60'
        }`}>
          <div className={`w-16 h-16 flex-shrink-0 rounded-2xl flex items-center justify-center border ${
            isDark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-amber-200'
          }`}>
            <Crown className="h-8 w-8 text-amber-400 animate-pulse" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className={`text-xl font-bold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
              {language === 'en' ? 'Ready for more?' : 'Valmis enempään?'}
            </h2>
            <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {language === 'en'
                ? 'Unlock unlimited ATS-optimized documents, experience gap analysis, and STAR methodology.'
                : 'Avaa rajattomat ATS-optimoidut dokumentit, kokemuskuilu-analyysi ja STAR-metodologia.'}
            </p>
          </div>
          <Link href="/pricing" className="flex-shrink-0">
            <Button className="h-12 px-8 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl font-bold shadow-xl whitespace-nowrap">
              <Crown className="w-4 h-4 mr-2" />
              {language === 'en' ? 'Get Premium' : 'Hanki Premium'}
            </Button>
          </Link>
        </div>
      )}

      {/* ═══════════════════════════════════
          5. MY DOCUMENTS — secondary, alla
      ═══════════════════════════════════ */}
      <div className={`backdrop-blur-xl border rounded-[2.5rem] shadow-xl p-7 sm:p-9 transition-colors duration-300 ${
        isDark ? 'bg-[#1a1a1a]/70 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'
      }`}>
        <h2 className={`text-xl font-black flex items-center gap-3 mb-7 tracking-tight ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          <Files className="h-6 w-6 text-orange-400" />
          {language === 'en' ? 'My Documents' : 'Omat Dokumentit'}
        </h2>

        <div className="grid md:grid-cols-2 gap-7">

          {/* CV-lista */}
          <div className="space-y-3">
            <Link href="/my-cvs" className={`flex items-center justify-between p-4 backdrop-blur-md rounded-[1.5rem] transition-all group border ${
              isDark
                ? 'bg-orange-500/10 hover:bg-orange-500/20 border-orange-400/20'
                : 'bg-orange-50 hover:bg-orange-100 border-orange-200/60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white border-orange-200'}`}>
                  <FileText className="h-5 w-5 text-orange-400" />
                </div>
                <span className={`font-black ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  {language === 'en' ? 'My CVs' : 'Omat CV:t'}
                </span>
                {recentCVs.length > 0 && (
                  <span className="bg-orange-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCVs.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-orange-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-2 min-h-[80px]">
              {loadingRecent ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-orange-500 border-t-transparent rounded-full"></div>
                </div>
              ) : recentCVs.length > 0 ? (
                recentCVs.map((cv: any) => (
                  <Link key={cv.id} href={`/edit-cv/${cv.id}`}>
                    <div className={`p-4 backdrop-blur-md border rounded-2xl transition-all flex justify-between items-center group hover:-translate-y-0.5 ${
                      isDark
                        ? 'bg-white/5 border-white/10 hover:border-orange-400/30 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200 hover:border-orange-300 hover:bg-orange-50/50'
                    }`}>
                      <div>
                        <p className={`font-bold text-sm group-hover:text-orange-400 transition-colors ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {cv.content?.cv_data?.name || cv.title || (language === 'en' ? 'Unnamed CV' : 'Nimetön CV')}
                        </p>
                        <p className={`text-[10px] uppercase font-bold mt-0.5 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(cv.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fi-FI')}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-orange-400' : 'text-orange-500'}`} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className={`text-center text-sm py-6 rounded-2xl border border-dashed ${isDark ? 'text-gray-500 bg-gray-900/50 border-gray-700' : 'text-gray-400 bg-gray-50 border-gray-300'}`}>
                  {language === 'en' ? 'No CVs yet' : 'Ei vielä CV:itä'}
                </p>
              )}
            </div>
          </div>

          {/* Kirje-lista */}
          <div className="space-y-3">
            <Link href="/my-cover-letters" className={`flex items-center justify-between p-4 backdrop-blur-md rounded-[1.5rem] transition-all group border ${
              isDark
                ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-400/20'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200/60'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg border ${isDark ? 'bg-white/10 border-white/10' : 'bg-white border-emerald-200'}`}>
                  <FileInput className="h-5 w-5 text-emerald-400" />
                </div>
                <span className={`font-black ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                  {language === 'en' ? 'Cover Letters' : 'Hakukirjeet'}
                </span>
                {recentCoverLetters.length > 0 && (
                  <span className="bg-emerald-500 text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {recentCoverLetters.length}
                  </span>
                )}
              </div>
              <ChevronRight className="h-5 w-5 text-emerald-400 group-hover:translate-x-1 transition-transform" />
            </Link>

            <div className="space-y-2 min-h-[80px]">
              {loadingRecent ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
                </div>
              ) : recentCoverLetters.length > 0 ? (
                recentCoverLetters.map((letter: any) => (
                  <Link key={letter.id} href={`/edit-cover-letter/${letter.id}`}>
                    <div className={`p-4 backdrop-blur-md border rounded-2xl transition-all flex justify-between items-center group hover:-translate-y-0.5 ${
                      isDark
                        ? 'bg-white/5 border-white/10 hover:border-emerald-400/30 hover:bg-white/10'
                        : 'bg-gray-50 border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                    }`}>
                      <div>
                        <p className={`font-bold text-sm group-hover:text-emerald-400 transition-colors ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {letter.title || (language === 'en' ? 'Unnamed Letter' : 'Nimetön Kirje')}
                        </p>
                        <p className={`text-[10px] uppercase font-bold mt-0.5 tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {new Date(letter.created_at).toLocaleDateString(language === 'en' ? 'en-US' : 'fi-FI')}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-all ${isDark ? 'text-emerald-400' : 'text-emerald-500'}`} />
                    </div>
                  </Link>
                ))
              ) : (
                <p className={`text-center text-sm py-6 rounded-2xl border border-dashed ${isDark ? 'text-gray-500 bg-gray-900/50 border-gray-700' : 'text-gray-400 bg-gray-50 border-gray-300'}`}>
                  {language === 'en' ? 'No letters yet' : 'Ei vielä kirjeitä'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* ═══════════════════════════════════
        FOOTER
    ═══════════════════════════════════ */}
    <footer className={`py-10 text-center mt-16 transition-colors duration-300 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
      <div className="max-w-7xl mx-auto px-4">
        <div className={`h-px mb-6 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent`}></div>
        <p className="text-sm font-medium tracking-wide">
          © {new Date().getFullYear()} HappyApplaid.{' '}
          {language === 'en' ? 'Crafted with love for your career.' : 'Rakkaudella luotu urallesi.'}
        </p>
      </div>
    </footer>
  </div>
)};