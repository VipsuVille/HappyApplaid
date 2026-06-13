// lib/limits.ts — Yksi totuuden lähde kuluhallinnalle (EI tokeneita).
// Kaikki AI-toiminnot (CV, hakukirje, iterointi, ATS-tarkistus, verdikti)
// kuluttavat SAMAA viikkokattoa → usage_events-taulu, kind kertoo mistä.
//
// Taulu: usage_events { id, user_id (text), kind (text), created_at (timestamptz) }

import { supabaseAdmin } from "@/lib/supabase";

// ─── Tyypit ───────────────────────────────────────────────────
export type Plan = "free" | "pro" | "premium";
export type LogKind = "cv" | "cover_letter" | "recruiter_verdict" | "ats_check";
export type Feature = "recruiter_verdict" | "premium_skins" | "ai_background";

interface UsageWindow { days: number; limit: number; label: string; }
interface PlanConfig { windows: UsageWindow[]; throttleSeconds: number; }

export interface CheckResult {
  allowed: boolean;
  reason?: "LIMIT_REACHED" | "THROTTLED";
  remaining: number;
  limit: number;
  windowLabel: string;
  plan: Plan;
}

export interface PlanStatus {
  plan: Plan;
  aiRemaining: number;
  aiLimit: number;
  windowLabel: string;
  features: Feature[];
}

// ─── Konfiguraatio (viikkomalli) ──────────────────────────────
// free:    1 AI-toiminto / viikko
// pro:     150 / viikko  (~1,3 € OpenAI-kulua maxissa)
// premium: 300 / viikko  (~2,6 €)
// throttleSeconds = pienin väli kahden AI-toiminnon välillä (estää bursti-väärinkäytön)
const PLAN_LIMITS: Record<Plan, PlanConfig> = {
  free:    { windows: [{ days: 7, limit: 1,   label: "viikko" }], throttleSeconds: 15 },
  pro:     { windows: [{ days: 7, limit: 150, label: "viikko" }], throttleSeconds: 4 },
  premium: { windows: [{ days: 7, limit: 300, label: "viikko" }], throttleSeconds: 3 },
};

// ─── Maksulliset ominaisuudet ─────────────────────────────────
const FEATURE_ACCESS: Record<Plan, Feature[]> = {
  free: [],
  pro: ["recruiter_verdict", "premium_skins"],
  premium: ["recruiter_verdict", "premium_skins", "ai_background"],
};

// ─── plan_type → Plan ─────────────────────────────────────────
// HUOM: tilauksen plan_type voi olla 'basic' → mapataan 'pro':ksi.
export function planOf(p?: string | null): Plan {
  if (!p || p === "free") return "free";
  if (p === "premium") return "premium";
  return "pro"; // 'basic' (ja kaikki muut maksulliset) → pro
}

// ─── Onko ominaisuus käytössä tällä planilla? ─────────────────
export function canUseFeature(plan: Plan, feature: Feature): boolean {
  return FEATURE_ACCESS[plan].includes(feature);
}

// ─── Laske jäljellä oleva (ILMAN throttlea) — getPlanStatus käyttää ──
async function computeRemaining(userId: string, win: UsageWindow): Promise<number> {
  try {
    const since = new Date(Date.now() - win.days * 86400000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);
    if (error) { console.error("computeRemaining error:", error); return win.limit; } // fail-open
    return Math.max(0, win.limit - (count || 0));
  } catch (e) {
    console.error("computeRemaining exception:", e);
    return win.limit; // fail-open
  }
}

// ─── Pääfunktio: saako käyttäjä tehdä AI-toiminnon nyt? ───────
export async function checkLimit(userId: string, planType?: string | null): Promise<CheckResult> {
  const plan = planOf(planType);
  const config = PLAN_LIMITS[plan];
  const win = config.windows[0]; // viikkomallissa yksi ikkuna

  try {
    // 1. Määräraja
    const since = new Date(Date.now() - win.days * 86400000).toISOString();
    const { count, error } = await supabaseAdmin
      .from("usage_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since);

    if (error) {
      console.error("checkLimit count error (fail-open):", error);
      return { allowed: true, remaining: win.limit, limit: win.limit, windowLabel: win.label, plan };
    }

    const used = count || 0;
    const remaining = Math.max(0, win.limit - used);

    if (used >= win.limit) {
      return { allowed: false, reason: "LIMIT_REACHED", remaining: 0, limit: win.limit, windowLabel: win.label, plan };
    }

    // 2. Throttle (pienin väli edellisestä toiminnosta)
    if (config.throttleSeconds > 0) {
      const { data: last } = await supabaseAdmin
        .from("usage_events")
        .select("created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (last?.created_at) {
        const elapsed = (Date.now() - new Date(last.created_at).getTime()) / 1000;
        if (elapsed < config.throttleSeconds) {
          return { allowed: false, reason: "THROTTLED", remaining, limit: win.limit, windowLabel: win.label, plan };
        }
      }
    }

    return { allowed: true, remaining, limit: win.limit, windowLabel: win.label, plan };
  } catch (e) {
    console.error("checkLimit exception (fail-open):", e);
    return { allowed: true, remaining: win.limit, limit: win.limit, windowLabel: win.label, plan };
  }
}

// ─── Kirjaa käytetty AI-toiminto (kutsu VASTA onnistuneen tallennuksen jälkeen) ──
export async function logUsage(userId: string, kind: LogKind): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("usage_events")
      .insert({ user_id: userId, kind });
    if (error) console.error("logUsage error:", error);
  } catch (e) {
    console.error("logUsage exception:", e);
  }
}

// ─── Käyttäjän tila frontille (usePlanStatus / AiUsageMeter) ──
export async function getPlanStatus(userId: string, planType?: string | null): Promise<PlanStatus> {
  const plan = planOf(planType);
  const win = PLAN_LIMITS[plan].windows[0];
  const aiRemaining = await computeRemaining(userId, win);
  return {
    plan,
    aiRemaining,
    aiLimit: win.limit,
    windowLabel: win.label,
    features: FEATURE_ACCESS[plan],
  };
}

// ─── Käyttäjälle näytettävä viesti rajasta ────────────────────
export function limitMessage(r: CheckResult, isFi = true): string {
  if (r.reason === "THROTTLED") {
    return isFi
      ? "Hetki — odota muutama sekunti ja yritä uudelleen."
      : "Just a moment — wait a few seconds and try again.";
  }
  // LIMIT_REACHED
  if (r.plan === "free") {
    return isFi
      ? `Ilmainen raja täynnä (${r.limit}/${r.windowLabel}). Päivitä Pro tehdäksesi enemmän.`
      : `Free limit reached (${r.limit}/${r.windowLabel}). Upgrade to Pro for more.`;
  }
  return isFi
    ? `Viikkoraja täynnä (${r.limit}/${r.windowLabel}). Uusiutuu ensi viikolla.`
    : `Weekly limit reached (${r.limit}/${r.windowLabel}). Resets next week.`;
}