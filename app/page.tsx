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
  ChevronDown,
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

  // ══════════════════════════════════════════════════════════════════
  //  UNAUTHENTICATED — Riot Games × Blizzard aesthetic
  //  Dark, cinematic, bold typography, black + orange brand palette
  // ══════════════════════════════════════════════════════════════════
  if (!isSignedIn) {
    const t = (fi: string, en: string) => language === "en" ? en : fi;

    // CSS injected once for the Riot/Blizzard aesthetic
    // Supports both dark (default) and light theme via .ha-light modifier
    const riotCSS = `
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700&family=Barlow:wght@300;400;500;600&display=swap');

      .ha-landing * { box-sizing: border-box; }

      /* ══ DARK THEME (default) ══ */
      .ha-landing {
        --orange: #f97316;
        --orange-bright: #fb923c;
        --amber: #f59e0b;
        --bg:      #080808;
        --bg-2:    #0f0f0f;
        --bg-3:    #161616;
        --border:  rgba(255,255,255,.07);
        --border-strong: rgba(255,255,255,.14);
        --text:    #f0ece4;
        --gray-dim: #555;
        --gray-mid: #888;
        --gray-light: #bbb;
        --card-top: rgba(249,115,22,.3);
        --stat-sep: rgba(255,255,255,.05);
        --kw-sep:   rgba(255,255,255,.05);
        --scan-color: rgba(249,115,22,.3);
        font-family: 'Barlow Condensed', 'Impact', sans-serif;
        background: var(--bg);
        color: var(--text);
        min-height: 100vh;
        overflow-x: hidden;
      }

      /* ══ LIGHT THEME ══ */
      .ha-landing.ha-light {
        --bg:      #f5f4f0;
        --bg-2:    #eeede9;
        --bg-3:    #e8e7e2;
        --border:  rgba(0,0,0,.08);
        --border-strong: rgba(0,0,0,.15);
        --text:    #111;
        --gray-dim: #888;
        --gray-mid: #555;
        --gray-light: #333;
        --card-top: rgba(249,115,22,.4);
        --stat-sep: rgba(0,0,0,.07);
        --kw-sep:   rgba(0,0,0,.07);
        --scan-color: rgba(249,115,22,.2);
        background: var(--bg);
        color: var(--text);
      }

      .ha-body { font-family: 'Barlow', sans-serif; }

      /* ── BTN PRIMARY — angled corners like Riot ── */
      .ha-btn-primary {
        display: inline-flex; align-items: center; gap: 8px;
        background: var(--orange);
        color: #000;
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 900; font-size: 1rem;
        letter-spacing: .1em; text-transform: uppercase;
        padding: 14px 32px;
        clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
        border: none; cursor: pointer;
        position: relative; overflow: hidden;
        transition: background .2s, transform .15s;
      }
      .ha-btn-primary::before {
        content: '';
        position: absolute; inset: 0;
        background: linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 50%);
        pointer-events: none;
      }
      .ha-btn-primary:hover { background: var(--orange-bright); transform: translateY(-2px); }
      .ha-btn-primary:active { transform: none; }

      .ha-btn-ghost {
        display: inline-flex; align-items: center; gap: 8px;
        background: transparent; color: var(--gray-light);
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700; font-size: .9rem;
        letter-spacing: .08em; text-transform: uppercase;
        padding: 12px 24px;
        border: 1px solid var(--border-strong);
        cursor: pointer;
        transition: border-color .2s, color .2s, background .2s;
      }
      .ha-btn-ghost:hover { border-color: var(--orange); color: var(--orange); background: rgba(249,115,22,.05); }

      /* ── DIVIDER ── */
      .ha-divider {
        width: 100%; height: 1px;
        background: linear-gradient(90deg, transparent, rgba(249,115,22,.4), transparent);
      }

      /* ── BADGE ── */
      .ha-badge {
        display: inline-flex; align-items: center; gap: 6px;
        border: 1px solid rgba(249,115,22,.4);
        background: rgba(249,115,22,.08);
        padding: 5px 14px;
        font-size: .72rem; font-weight: 700;
        letter-spacing: .15em; text-transform: uppercase;
        color: var(--orange-bright);
      }

      /* ── CARD ── */
      .ha-card {
        background: var(--bg-3);
        border: 1px solid var(--border);
        position: relative; overflow: hidden;
      }
      .ha-card::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, var(--card-top), transparent);
      }

      /* ── KW ITEM ── */
      .ha-kw {
        display: flex; align-items: center; justify-content: space-between;
        padding: 8px 12px;
        border-bottom: 1px solid var(--kw-sep);
        font-family: 'Barlow', sans-serif; font-size: .82rem;
      }
      .ha-kw-y { color: #16a34a; background: rgba(22,163,74,.1); padding: 2px 8px; font-size: .7rem; font-weight: 700; }
      .ha-kw-n { color: #dc2626; background: rgba(220,38,38,.1); padding: 2px 8px; font-size: .7rem; font-weight: 700; }
      .ha-landing:not(.ha-light) .ha-kw-y { color: #4ade80; background: rgba(74,222,128,.1); }
      .ha-landing:not(.ha-light) .ha-kw-n { color: #f87171; background: rgba(248,113,113,.1); }

      /* ── PRICE CARD ── */
      .ha-price {
        background: var(--bg-3);
        border: 1px solid var(--border);
        padding: 36px 28px;
        position: relative; overflow: hidden;
        transition: border-color .2s, transform .2s;
      }
      .ha-price:hover { border-color: rgba(249,115,22,.3); transform: translateY(-4px); }
      .ha-price-top {
        position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
        background: var(--orange); color: #000;
        font-size: .65rem; font-weight: 800; letter-spacing: .12em;
        text-transform: uppercase; padding: 4px 16px;
        clip-path: polygon(0 0, 100% 0, 93% 100%, 7% 100%);
      }

      /* ── SCAN LINE ── */
      @keyframes haScan {
        0% { transform: translateY(-100%); opacity: 0; }
        10% { opacity: .3; } 90% { opacity: .3; }
        100% { transform: translateY(100vh); opacity: 0; }
      }
      .ha-scan {
        position: fixed; left: 0; right: 0; height: 2px;
        background: linear-gradient(90deg, transparent, var(--scan-color), transparent);
        animation: haScan 10s linear infinite;
        pointer-events: none; z-index: 0;
      }

      /* ── VIDEO MODAL ── */
      .ha-video-overlay {
        position: fixed; inset: 0; z-index: 200;
        background: rgba(0,0,0,.92);
        display: flex; align-items: center; justify-content: center;
      }

      /* ── FEAT CARD ── */
      .ha-feat {
        padding: 36px 28px;
        border-left: 3px solid var(--orange);
        background: var(--bg-3);
        position: relative; overflow: hidden;
      }

      /* ── STAT BAR ── */
      .ha-stat-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 1px;
        background: var(--stat-sep);
      }
      .ha-stat-cell {
        background: var(--bg-2);
        padding: 32px 40px;
        text-align: center;
      }
      .ha-stat-num {
        font-size: clamp(2.5rem, 5vw, 3.5rem);
        font-weight: 900; color: var(--orange);
        line-height: 1; letter-spacing: -.02em;
      }

      /* ── HERO SIDE PANE ── */
      .ha-hero-side {
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 340px;
        flex-shrink: 0;
      }
      @media (max-width: 860px) {
        .ha-hero-side { display: none !important; }
      }
      @media (max-width: 640px) {
        .ha-stat-grid { grid-template-columns: 1fr; }
        .ha-stat-cell { padding: 20px 24px; }
        .ha-price-grid { grid-template-columns: 1fr !important; }
      }
    `;

    // ── Video modal state (local to this render scope) ──────────────
    // We use a ref-style approach via a small wrapper component to avoid
    // hooks-in-conditionals — useState is called in the parent already.
    // Since we already have component-level state, we reuse setters here.
    // videoOpen / setVideoOpen are defined at the top of Home().
    // (They are declared via useState above — add them if not present;
    //  here we declare them inline for clarity.)

    // ── Reusable MID-PAGE CTA ────────────────────────────────────────
    const MidCTA = ({ label }: { label: string }) => (
      <div style={{ textAlign: "center", margin: "72px 0 8px" }}>
        <SignUpButton mode="modal" appearance={clerkAppearance}>
          <button className="ha-btn-primary" style={{ fontSize: "1.05rem" }}>
            <Sparkles size={16} />
            {label}
          </button>
        </SignUpButton>
        <p className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".78rem", marginTop: "12px", letterSpacing: ".06em", textTransform: "uppercase" }}>
          {t("Ei luottokorttia · Tulos 60 sekunnissa", "No credit card · Result in 60 seconds")}
        </p>
      </div>
    );

    return (
      <div className={`ha-landing${isDark ? "" : " ha-light"}`}>
        <style>{riotCSS}</style>
        <div className="ha-scan" />

        {/* ════════════════════════════════════════════════
            1. HERO — single column, video below headline
        ════════════════════════════════════════════════ */}
        <section style={{ position: "relative", minHeight: "100vh", display: "flex", alignItems: "center", overflow: "hidden" }}>

          {/* BG layers */}
          <div className="ha-hero-bg-grad" style={{ position: "absolute", inset: 0, background: isDark ? "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(249,115,22,.1) 0%, transparent 65%)" : "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(249,115,22,.06) 0%, transparent 65%)", pointerEvents: "none" }} />
          <div className="ha-hero-fade" style={{ position: "absolute", inset: 0, background: isDark ? "linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,.3) 60%, #080808 100%)" : "linear-gradient(180deg, rgba(245,244,240,0) 0%, rgba(245,244,240,.3) 60%, #f5f4f0 100%)", pointerEvents: "none" }} />

          {/* Geometric X — right side decoration */}
          <svg style={{ position: "absolute", top: "8%", right: "3%", width: "clamp(140px, 22vw, 340px)", opacity: isDark ? .06 : .04, pointerEvents: "none" }} viewBox="0 0 100 100" fill="none">
            <line x1="10" y1="10" x2="90" y2="90" stroke="#f97316" strokeWidth="3.5" />
            <line x1="90" y1="10" x2="10" y2="90" stroke="#f97316" strokeWidth="3.5" />
            <rect x="5" y="5" width="90" height="90" stroke="#f97316" strokeWidth="1.5" />
            <rect x="20" y="20" width="60" height="60" stroke="#f97316" strokeWidth="1" />
          </svg>

          {/* Grid texture right side */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: "55%", height: "70%",
            backgroundImage: `linear-gradient(rgba(249,115,22,${isDark ? ".03" : ".015"}) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,${isDark ? ".03" : ".015"}) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
            pointerEvents: "none",
          }} />

          <div style={{ position: "relative", zIndex: 2, maxWidth: "1200px", margin: "0 auto", padding: "clamp(80px, 12vw, 120px) 24px clamp(64px, 8vw, 80px)", width: "100%" }}>

            {/* Eyebrow */}
            <div style={{ marginBottom: "22px" }}>
              <span className="ha-badge">
                <Sparkles size={12} />
                {t("Realistinen ATS-analyysi", "Realistic ATS Analysis")}
              </span>
            </div>

            {/* ── TWO-PANE: headline left, meta right ── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "48px", alignItems: "flex-end", marginBottom: "40px" }}>
              <div>
                <h1 style={{
                  fontSize: "clamp(3.8rem, 8vw, 7.5rem)",
                  fontWeight: 900, lineHeight: .9,
                  letterSpacing: "-.02em", textTransform: "uppercase",
                  color: "var(--text)",
                }}>
                  <span style={{ display: "block" }}>
                    {t("Selvitä", "See if")}
                  </span>
                  <span style={{ display: "block", color: "var(--orange)", fontStyle: "italic" }}>
                    {t("pääsetkö läpi.", "you'd pass.")}
                  </span>
                  <span style={{ display: "block", color: isDark ? "rgba(240,236,228,.3)" : "rgba(17,17,17,.25)", fontSize: ".48em", fontWeight: 700, letterSpacing: ".03em", marginTop: "12px", fontStyle: "normal" }}>
                    {t("Ennen kuin haet.", "Before you apply.")}
                  </span>
                </h1>
              </div>

              {/* Right side — description + trust on larger screens */}
              <div style={{ maxWidth: "360px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "20px" }} className="ha-hero-side">
                <p className="ha-body" style={{ fontSize: ".95rem", color: "var(--gray-mid)", lineHeight: 1.75 }}>
                  {t(
                    "75% hakemuksista hylätään automaattisesti. HappyApplaid näyttää kilpailukykysi ja keyword-osuman — ennen kuin lähetät.",
                    "75% of applications are auto-rejected. HappyApplaid shows your competitiveness and keyword match — before you apply."
                  )}
                </p>
                {/* Trust badges */}
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }} className="ha-body">
                  {[
                    { icon: <CreditCard size={13} />, label: t("Ei luottokorttia", "No credit card") },
                    { icon: <Clock size={13} />, label: t("Tulos 60 sekunnissa", "Result in 60 sec") },
                    { icon: <Shield size={13} />, label: t("Ei PII:tä AI:lle", "No PII to AI") },
                  ].map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--gray-dim)", fontSize: ".74rem", fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase" }}>
                      <span style={{ color: "var(--orange)" }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── VIDEO — full-width, directly under headline ── */}
            <div style={{
              background: "var(--bg-3)", border: "1px solid var(--border)",
              position: "relative", overflow: "hidden", cursor: "pointer",
              aspectRatio: "16/6", maxHeight: "340px",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: "36px",
            }}>
              {/* Orange corner brackets */}
              <div style={{ position: "absolute", top: 0, left: 0, width: "3px", height: "48px", background: "var(--orange)" }} />
              <div style={{ position: "absolute", top: 0, left: 0, width: "48px", height: "3px", background: "var(--orange)" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "3px", height: "48px", background: "var(--orange)" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: "48px", height: "3px", background: "var(--orange)" }} />
              {/* BG effects */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(249,115,22,.05) 0%, transparent 55%)", pointerEvents: "none" }} />
              <div style={{
                position: "absolute", inset: 0,
                backgroundImage: `linear-gradient(rgba(249,115,22,${isDark ? ".04" : ".02"}) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,${isDark ? ".04" : ".02"}) 1px, transparent 1px)`,
                backgroundSize: "40px 40px", pointerEvents: "none",
              }} />
              <div style={{ position: "relative", zIndex: 2, textAlign: "center" }}>
                <div style={{
                  width: "72px", height: "72px", margin: "0 auto 16px",
                  background: "var(--orange)",
                  clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform .2s",
                }}>
                  <Play size={28} color="#000" fill="#000" />
                </div>
                <p style={{ fontWeight: 800, fontSize: "1.1rem", letterSpacing: ".06em", textTransform: "uppercase", color: "var(--text)" }}>
                  {t("Katso miten se toimii", "See How It Works")}
                </p>
                <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".82rem", marginTop: "6px" }}>
                  {t("90 sekuntia — ennen kuin lähetät seuraavan hakemuksesi", "90 seconds — before you send your next application")}
                </p>
              </div>
              {/* TODO: replace with <video> or <iframe> when ready */}
            </div>

            {/* ── CTAs row ── */}
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <SignUpButton mode="modal" appearance={clerkAppearance}>
                <button className="ha-btn-primary" style={{ fontSize: "1.05rem" }}>
                  <Sparkles size={16} />
                  {t("Testaa hakemukseni ilmaiseksi", "Test My Application Free")}
                </button>
              </SignUpButton>
              <button
                className="ha-btn-ghost"
                onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
              >
                {t("Katso Hinnoittelu", "See Pricing")}
                <ChevronDown size={14} />
              </button>
            </div>

          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            STATS BAR
        ════════════════════════════════════════════════ */}
        <section style={{ background: "var(--bg-2)", padding: "48px 24px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div className="ha-stat-grid">
              {[
                { value: "75%", label: t("Automaattisesti hylätty", "Auto-rejected") },
                { value: "3s", label: t("Keskimääräinen seulonta-aika", "Avg screening time") },
                { value: "10×", label: t("Enemmän osumia", "More keyword matches") },
              ].map((s, i) => (
                <div key={i} className="ha-stat-cell">
                  <div className="ha-stat-num">{s.value}</div>
                  <div className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".75rem", fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", marginTop: "6px" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            2. REALITY CHECK
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "96px 24px", background: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

            <div style={{ marginBottom: "52px" }}>
              <span className="ha-badge" style={{ borderColor: "rgba(239,68,68,.3)", background: "rgba(239,68,68,.06)", color: "#f87171", marginBottom: "18px", display: "inline-flex" }}>
                <AlertTriangle size={12} />
                {t("Todellinen ongelma", "The Real Problem")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.8rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-.01em", lineHeight: .93, maxWidth: "720px" }}>
                {t("Useimmat hakijat", "Most applicants")}<br />
                <span style={{ color: "var(--orange)" }}>{t("jäävät näkemättä.", "never get seen.")}</span>
              </h2>
              <p className="ha-body" style={{ color: "var(--gray-mid)", marginTop: "18px", maxWidth: "540px", lineHeight: 1.7 }}>
                {t(
                  "Seulontajärjestelmät suodattavat hakemuksia mekaanisesti — ilman kontekstia, ilman harkintaa. Täsmälliset sanat ratkaisevat, ei potentiaali.",
                  "Screening systems filter applications mechanically — no context, no judgment. Exact words decide, not potential."
                )}
              </p>
            </div>

            {/* Example cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2px" }}>
              {[
                {
                  badge: t("Varhainen ura", "Early career"),
                  title: t("Hakija → Asiakaspalvelurooli", "Applicant → Customer Service"),
                  keywords: [
                    { label: t("Viestintätaidot", "Communication skills"), found: true },
                    { label: t("Asiakaskohtaaminen", "Customer interaction"), found: true },
                    { label: t("CRM-kokemus", "CRM experience"), found: false },
                    { label: t("1+ vuoden kokemus", "1+ year experience"), found: false },
                  ],
                  score: "58%", risk: t("Kohtalainen riski", "Medium risk"), riskColor: "#f59e0b",
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
                  score: "42%", risk: t("Korkea riski", "High risk"), riskColor: "#f87171",
                  tip: t("Korosta mitattavia tuloksia", "Highlight measurable results"),
                },
              ].map((ex, i) => (
                <div key={i} className="ha-card" style={{ padding: "28px" }}>
                  <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gray-dim)", marginBottom: "6px" }}>{ex.badge}</p>
                  <p className="ha-body" style={{ fontSize: ".92rem", fontWeight: 600, marginBottom: "18px", color: "var(--gray-light)" }}>{ex.title}</p>
                  <div>
                    {ex.keywords.map((kw, j) => (
                      <div key={j} className="ha-kw">
                        <span style={{ color: "var(--gray-light)" }}>{kw.label}</span>
                        <span className={kw.found ? "ha-kw-y" : "ha-kw-n"}>{kw.found ? "✓ MATCH" : "✗ MISSING"}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: "18px", paddingTop: "14px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="ha-body" style={{ fontSize: ".75rem", color: "var(--gray-dim)" }}>{t("ATS-pisteet", "ATS Score")}</span>
                    <span style={{ fontWeight: 900, color: ex.riskColor, fontSize: ".95rem" }}>{ex.score} — {ex.risk}</span>
                  </div>
                  <p className="ha-body" style={{ fontSize: ".75rem", color: "var(--gray-dim)", marginTop: "8px", fontStyle: "italic" }}>→ {ex.tip}</p>
                </div>
              ))}
            </div>

            <MidCTA label={t("Tarkista hakemukseni nyt — ilmaiseksi", "Check My Application Now — Free")} />
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            3. WHO IS IT FOR
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "96px 24px", background: "var(--bg-2)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "52px" }}>
              <span className="ha-badge" style={{ marginBottom: "16px", display: "inline-flex" }}>
                {t("Kenelle", "For every applicant")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: .93, letterSpacing: "-.01em" }}>
                {t("Tunnistatko", "Does this sound")}<br />
                <span style={{ color: "var(--orange)" }}>{t("itsesi?", "like you?")}</span>
              </h2>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2px" }}>
              {[
                {
                  emoji: "🌱", num: "01",
                  title: t("Varhainen ura", "Early Career"),
                  sub: t("Opiskelija, harjoittelija tai vasta aloittanut", "Student, trainee, or new to the workforce"),
                  points: [
                    t("Lähetät hakemuksia mutta et saa vastauksia", "Sending applications but getting no replies"),
                    t("Et tiedä miksi hakemus hylätään", "Not sure why applications get rejected"),
                    t("Haluat hyödyntää sen mitä sinulla on", "Want to make the most of what you have"),
                  ],
                  cta: t("Tiedä missä olet — ennen kuin lähetät.", "Know where you stand — before you send."),
                  accent: "var(--orange)",
                },
                {
                  emoji: "🎯", num: "02",
                  title: t("Tähtäät korkeammalle", "Aiming Higher"),
                  sub: t("Alanvaihtaja tai kilpailtuihin rooleihin tähtäävä", "Career changer or targeting competitive roles"),
                  points: [
                    t("Sinulla on kokemusta — mutta et tiedä miten se kääntyy", "You have experience — but unsure how it translates"),
                    t("Haet tietämättä todellisia mahdollisuuksiasi", "Applying without knowing your real chances"),
                    t("Hakukirjeet eivät tunnu kolahtavan", "Cover letters feel generic and don't land"),
                  ],
                  cta: t("Näe kuilu rehellisesti — sitten kuroe se umpeen.", "See the gap honestly — then close it."),
                  accent: "#38bdf8",
                },
              ].map((seg, i) => (
                <div key={i} className="ha-card" style={{ padding: "40px 32px", borderLeft: `3px solid ${seg.accent}` }}>
                  <div style={{ fontSize: "2.8rem", marginBottom: "14px" }}>{seg.emoji}</div>
                  <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: seg.accent, marginBottom: "4px" }}>
                    {seg.num} / {seg.title}
                  </p>
                  <p className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".8rem", marginBottom: "22px" }}>{seg.sub}</p>
                  <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
                    {seg.points.map((p, j) => (
                      <li key={j} className="ha-body" style={{ display: "flex", gap: "10px", color: "var(--gray-light)", fontSize: ".88rem", lineHeight: 1.5 }}>
                        <span style={{ color: seg.accent, flexShrink: 0, marginTop: "2px" }}>›</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  <p className="ha-body" style={{ color: seg.accent, fontSize: ".82rem", fontStyle: "italic", borderTop: "1px solid var(--border)", paddingTop: "14px" }}>{seg.cta}</p>
                </div>
              ))}
            </div>

            <p className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".75rem", textAlign: "center", marginTop: "28px", letterSpacing: ".06em", textTransform: "uppercase" }}>
              {t(
                "Toimii terveydenhuollossa · liiketoiminnassa · opetuksessa · IT:ssä · markkinoinnissa",
                "Works for healthcare · business · education · tech · marketing — any field"
              )}
            </p>
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            4. HOW IT WORKS
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "96px 24px", background: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "52px" }}>
              <span className="ha-badge" style={{ marginBottom: "16px", display: "inline-flex" }}>
                {t("Yksinkertainen prosessi", "Simple Process")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: .93 }}>
                {t("Miten se", "How it")}{" "}
                <span style={{ color: "var(--orange)" }}>{t("toimii", "works")}</span>
              </h2>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "2px" }}>
              {[
                { n: "01", title: t("Lataa CV ja työ", "Upload CV & Job"), desc: t("Liitä työkuvaus. Lataa CV:si.", "Paste the job description. Upload your CV.") },
                { n: "02", title: t("Tekoäly skannaa kuten ATS", "AI Scans Like ATS"), desc: t("Täsmällinen keyword matching — kuten oikeat seulontajärjestelmät.", "Exact keyword matching — like real screening systems.") },
                { n: "03", title: t("Saat pisteytyksen", "Get Your Score"), desc: t("Hae / Älä hae -tuomio 60 sekunnissa.", "Apply / Don't Apply verdict in 60 seconds.") },
              ].map((step, i) => (
                <div key={i} className="ha-feat">
                  <p style={{ fontSize: "clamp(3rem, 6vw, 4.5rem)", fontWeight: 900, color: "rgba(249,115,22,.1)", lineHeight: 1, marginBottom: "14px", letterSpacing: "-.02em" }}>{step.n}</p>
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "10px" }}>{step.title}</h3>
                  <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".85rem", lineHeight: 1.65 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            5. REAL ANALYSIS / ATS HIGHLIGHT
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "96px 24px", background: "var(--bg-2)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "52px" }}>
              <span className="ha-badge" style={{ borderColor: "rgba(74,222,128,.3)", background: "rgba(74,222,128,.06)", color: "#4ade80", marginBottom: "16px", display: "inline-flex" }}>
                <Shield size={12} />
                {t("Ei pelkkiä avainsanoja", "Not just keywords")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: .93, maxWidth: "680px" }}>
                {t("Oikea analyysi.", "Real analysis.")}<br />
                <span style={{ color: "var(--orange)" }}>{t("Oikea strategia.", "Real strategy.")}</span>
              </h2>
              <p className="ha-body" style={{ color: "var(--gray-mid)", marginTop: "18px", maxWidth: "520px", lineHeight: 1.7 }}>
                {t(
                  "Useimmat checkerit antavat prosentin. HappyApplaid kertoo koko kuvan — kokemuskuilut, kilpailukyvyn, ja suoran suosituksen.",
                  "Most checkers give you a percentage. HappyApplaid gives the full picture — experience gaps, competitiveness, and a direct verdict."
                )}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px", marginBottom: "40px" }}>
              {[
                { icon: <Target size={28} />, title: t("Täsmällinen matching", "Exact Keyword Match"), desc: t("Kuten oikeat ATS:t — ei synonyymitemppuja", "Like real ATS — no synonym tricks"), color: "#4ade80" },
                { icon: <TrendingDown size={28} />, title: t("Kokemuskuilu", "Experience Gap"), desc: t("Low / Medium / High vakavuus", "Low / Medium / High severity"), color: "var(--orange)" },
                { icon: <CheckCircle size={28} />, title: t("Hae / Älä hae", "Apply / Don't Apply"), desc: t("Rehellinen suositus — ei false hope", "Honest call — no false hope"), color: "#38bdf8" },
                { icon: <Brain size={28} />, title: t("Älykkäät kysymykset", "Smart Follow-ups"), desc: t("Kysyy kun tietoa puuttuu", "Asks when info is missing"), color: "#a78bfa" },
              ].map((item, i) => (
                <div key={i} className="ha-card" style={{ padding: "28px 22px" }}>
                  <div style={{ color: item.color, marginBottom: "14px" }}>{item.icon}</div>
                  <h3 style={{ fontSize: ".95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "8px" }}>{item.title}</h3>
                  <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".82rem", lineHeight: 1.6 }}>{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Privacy note */}
            <div style={{ background: "var(--bg-3)", border: "1px solid rgba(74,222,128,.15)", padding: "18px 22px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
              <Shield size={16} color="#4ade80" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".85rem", lineHeight: 1.6 }}>
                <strong style={{ color: "#4ade80" }}>{t("Tietosuoja arkkitehtuurin tasolla. ", "Privacy-first by architecture. ")}</strong>
                {t(
                  "Nimesi, emailisi ja puhelinnumerosi eivät koskaan mene AI:lle — tekninen valinta, ei lupaus.",
                  "Your name, email, and phone never go to AI — a technical decision, not just a promise."
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            6. INTELLIGENT ENGINE
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "96px 24px", background: "var(--bg)" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ marginBottom: "52px" }}>
              <span className="ha-badge" style={{ marginBottom: "16px", display: "inline-flex" }}>
                <Brain size={12} />
                {t("Älykäs hakemuskone", "Intelligent Engine")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", lineHeight: .93 }}>
                {t("Kirjoittaa sinun äänelläsi.", "Writes in your voice.")}<br />
                <span style={{ color: "var(--orange)" }}>{t("Oppii joka kerta.", "Learns every time.")}</span>
              </h2>
              <p className="ha-body" style={{ color: "var(--gray-mid)", marginTop: "18px", maxWidth: "520px", lineHeight: 1.7 }}>
                {t(
                  "Ei robottitekstiä. Järjestelmä analysoi profiilisi, kysyy älykkäitä lisäkysymyksiä ja tallentaa vastauksesi.",
                  "No robotic text. The engine analyzes your profile, asks smart follow-ups, and saves your answers — so every application improves on the last."
                )}
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2px" }}>
              {[
                { icon: <X size={18} />, iconColor: "#f87171", label: "Generic AI", content: '"I am a hard working individual with excellent communication skills..."', highlight: false },
                { icon: <Check size={18} />, iconColor: "#4ade80", label: "HappyApplaid", content: t('"Analyyttinen lähestymistapani auttoi tiimimme lyhentämään asiakasvasteaikaa 40%..."', '"My analytical approach helped our team cut customer response time by 40%..."'), highlight: true },
                { icon: <MessageCircle size={18} />, iconColor: "var(--orange)", label: t("Älykkäät kysymykset", "Smart follow-ups"), content: t("Kun tietoa puuttuu, järjestelmä kysyy — oikeaan aikaan, oikeasta asiasta.", "When info is missing, the engine asks — at the right time, about the right thing."), highlight: false },
                { icon: <Lightbulb size={18} />, iconColor: "#f59e0b", label: t("Paranee käytöllä", "Gets better with use"), content: t("Vastauksesi tallentuvat profiiliisi. Seuraava hakemus on nopeampi ja tarkempi.", "Your answers are saved. The next application is faster and more accurate."), highlight: false },
              ].map((card, i) => (
                <div key={i} className="ha-card" style={{ padding: "26px 22px", ...(card.highlight ? { borderColor: "rgba(74,222,128,.2)", background: "rgba(74,222,128,.04)" } : {}) }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <span style={{ color: card.iconColor }}>{card.icon}</span>
                    <span style={{ fontWeight: 800, fontSize: ".82rem", textTransform: "uppercase", letterSpacing: ".08em" }}>{card.label}</span>
                  </div>
                  <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".85rem", lineHeight: 1.65, fontStyle: "italic" }}>{card.content}</p>
                </div>
              ))}
            </div>

            {/* Features row */}
            <div style={{ marginTop: "56px" }}>
              <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)", fontWeight: 900, textTransform: "uppercase", textAlign: "center", marginBottom: "32px" }}>
                {t("Kaikki mitä tarvitset", "Everything You Need")}
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "2px" }}>
                {[
                  { icon: <Target size={28} color="#4ade80" />, title: t("ATS-Optimoitu", "ATS Optimized"), desc: t("Täsmällinen keyword matching", "Exact keyword matching — like real ATS systems"), tag: "Premium" },
                  { icon: <TrendingDown size={28} color="#f59e0b" />, title: t("Kokemuskuilu", "Experience Gap"), desc: t("Low / Medium / High — strateginen suositus", "Low / Medium / High — with strategic advice"), tag: "Premium" },
                  { icon: <Star size={28} color="#f59e0b" />, title: "STAR-Metodi", desc: t("Todistettu viitekehys — myy taitosi oikein", "Proven framework — sell your skills right"), tag: "Premium" },
                  { icon: <FileText size={28} color="var(--orange)" />, title: t("PDF-Vienti", "PDF Export"), desc: t("Ammattimaiset lataukset välittömästi", "Professional downloads instantly"), tag: null },
                ].map((feat, i) => (
                  <div key={i} className="ha-card" style={{ padding: "28px 22px" }}>
                    <div style={{ marginBottom: "14px" }}>{feat.icon}</div>
                    <h3 style={{ fontSize: ".95rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
                      {feat.title}
                      {feat.tag && <span style={{ fontSize: ".6rem", fontWeight: 700, background: "rgba(74,222,128,.15)", color: "#4ade80", padding: "2px 7px", letterSpacing: ".08em" }}>PREMIUM</span>}
                    </h3>
                    <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".82rem", lineHeight: 1.6 }}>{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <MidCTA label={t("Aloita ilmaiseksi — näe tuloksesi heti", "Start Free — See Your Results Now")} />
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            7. PRICING
        ════════════════════════════════════════════════ */}
        <section id="pricing" style={{ padding: "96px 24px", background: "var(--bg-2)", scrollMarginTop: "80px" }}>
          <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
            <div style={{ textAlign: "center", marginBottom: "60px" }}>
              <span className="ha-badge" style={{ marginBottom: "20px", display: "inline-flex" }}>
                {t("Yksinkertainen hinnoittelu", "Simple Pricing")}
              </span>
              <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-.01em" }}>
                {t("Aloita ilmaiseksi.", "Start free.")}<br />
                <span style={{ color: "var(--orange)" }}>{t("Päivitä kun olet valmis.", "Upgrade when ready.")}</span>
              </h2>
            </div>

            <div className="ha-price-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "2px" }}>

              {/* Free */}
              <div className="ha-price">
                <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--gray-dim)", marginBottom: "12px" }}>{t("Ilmainen", "Free")}</p>
                <div style={{ marginBottom: "26px" }}>
                  <span style={{ fontSize: "3rem", fontWeight: 900 }}>0€</span>
                  <span className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".82rem" }}>/mo</span>
                </div>
                <ul className="ha-body" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                  <li style={{ display: "flex", gap: "10px", color: "var(--gray-light)", fontSize: ".88rem" }}>
                    <Check size={14} color="#4ade80" style={{ marginTop: "3px", flexShrink: 0 }} />
                    {t("1 Yleinen CV + Kirje", "1 General CV + Letter")}
                  </li>
                  {[t("Ei ATS-analyysiä", "No ATS analysis"), t("Ei kokemuskuilu-analyysiä", "No gap analysis")].map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: "10px", color: "var(--gray-dim)", fontSize: ".88rem", opacity: .5 }}>
                      <Ban size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <SignUpButton mode="modal" appearance={clerkAppearance}>
                  <button className="ha-btn-ghost" style={{ width: "100%", justifyContent: "center" }}>{t("Aloita", "Start Free")}</button>
                </SignUpButton>
              </div>

              {/* Basic */}
              <div className="ha-price" style={{ borderColor: "rgba(56,189,248,.2)" }}>
                <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "#38bdf8", marginBottom: "12px" }}>Basic</p>
                <div style={{ marginBottom: "26px" }}>
                  <span style={{ fontSize: "3rem", fontWeight: 900 }}>4.99€</span>
                  <span className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".82rem" }}>/mo</span>
                </div>
                <ul className="ha-body" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                  {[t("Rajattomat CV:t ja kirjeet", "Unlimited CVs & Letters"), t("Kirjoittaa aidon äänesi", "Captures your authentic voice")].map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: "10px", color: "var(--gray-light)", fontSize: ".88rem" }}>
                      <Check size={14} color="#38bdf8" style={{ marginTop: "3px", flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                  <li style={{ display: "flex", gap: "10px", color: "var(--gray-dim)", fontSize: ".88rem", opacity: .5 }}>
                    <Ban size={14} style={{ marginTop: "3px", flexShrink: 0 }} />
                    {t("Ei ATS-analyysiä", "No ATS analysis")}
                  </li>
                </ul>
                <Link href="/pricing">
                  <button className="ha-btn-ghost" style={{ width: "100%", justifyContent: "center", borderColor: "rgba(56,189,248,.3)", color: "#38bdf8" }}>
                    {t("Valitse Basic", "Choose Basic")}
                  </button>
                </Link>
              </div>

              {/* Premium */}
              <div className="ha-price" style={{ borderColor: "rgba(249,115,22,.5)", background: "linear-gradient(160deg, rgba(249,115,22,.06) 0%, var(--bg-3) 60%)", paddingTop: "52px" }}>
                <div className="ha-price-top">{t("Paras arvo", "Best Value")}</div>
                <p style={{ fontSize: ".68rem", fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "var(--orange)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  Premium <Crown size={12} />
                </p>
                <div style={{ marginBottom: "26px" }}>
                  <span style={{ fontSize: "3rem", fontWeight: 900 }}>14.99€</span>
                  <span className="ha-body" style={{ color: "var(--gray-dim)", fontSize: ".82rem" }}>/mo</span>
                </div>
                <ul className="ha-body" style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
                  {[
                    t("ATS-analyysi & keyword matching", "ATS analysis & keyword matching"),
                    t("Kokemuskuilu-raportti", "Experience Gap report"),
                    t("Työkohtainen kohdistus", "Job-specific targeting"),
                    t("STAR-metodologia", "STAR methodology"),
                  ].map((item, i) => (
                    <li key={i} style={{ display: "flex", gap: "10px", color: "var(--orange-bright)", fontSize: ".88rem", fontWeight: 600 }}>
                      <Check size={14} color="var(--orange)" style={{ marginTop: "3px", flexShrink: 0 }} />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing">
                  <button className="ha-btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                    {t("Valitse Premium", "Choose Premium")}
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <div className="ha-divider" />

        {/* ════════════════════════════════════════════════
            8. FINAL CTA
        ════════════════════════════════════════════════ */}
        <section style={{ padding: "120px 24px", background: "var(--bg)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(249,115,22,.07) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{
            position: "absolute", inset: 0, opacity: .025,
            backgroundImage: "linear-gradient(rgba(249,115,22,1) 1px, transparent 1px), linear-gradient(90deg, rgba(249,115,22,1) 1px, transparent 1px)",
            backgroundSize: "60px 60px", pointerEvents: "none",
          }} />
          <div style={{ position: "relative", zIndex: 2, maxWidth: "860px", margin: "0 auto", textAlign: "center" }}>
            <h2 style={{ fontSize: "clamp(2.4rem, 6vw, 5rem)", fontWeight: 900, textTransform: "uppercase", letterSpacing: "-.02em", lineHeight: .9, marginBottom: "26px" }}>
              {t("Lopeta arvaileminen.", "Stop guessing.")}<br />
              <span style={{ color: "var(--orange)" }}>{t("Hae strategisesti.", "Apply strategically.")}</span>
            </h2>
            <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: "1.05rem", maxWidth: "460px", margin: "0 auto 44px", lineHeight: 1.7 }}>
              {t("Luo profiili kerran. Tiedä missä olet — ennen kuin lähetät.", "Create your profile once. Know where you stand — before you send.")}
            </p>
            <SignUpButton mode="modal" appearance={clerkAppearance}>
              <button className="ha-btn-primary" style={{ fontSize: "1.1rem", padding: "18px 48px" }}>
                <Sparkles size={18} />
                {t("Aloita Ilmaiseksi", "Start Free Now")}
              </button>
            </SignUpButton>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ background: "var(--bg-2)", borderTop: "1px solid var(--border)", padding: "36px 24px", textAlign: "center" }}>
          <p className="ha-body" style={{ color: "var(--gray-mid)", fontSize: ".75rem", letterSpacing: ".06em", textTransform: "uppercase" }}>
            © {new Date().getFullYear()} HAPPYAPPLAID —{" "}
            {t("Kaikki oikeudet pidätetään.", "All rights reserved.")}
          </p>
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