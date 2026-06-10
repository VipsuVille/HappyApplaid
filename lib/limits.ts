// lib/limits.ts
// Ilmainen vs maksullinen — EI tokeneita.
//  • Ei-AI-polkua EI lasketa tänne (ilmainen sinulle → rajaton).
//  • AI-luonnit kirjataan usage_events:iin ja rajataan plan-kohtaisesti.
//  • Osa ominaisuuksista on vain maksullisille (canUseFeature).
import { supabaseAdmin } from "@/lib/supabase";

export type UsageKind = "cv" | "cover_letter" | "recruiter_verdict"; // AI-toiminnot (maksavat)
export type Feature = "recruiter_verdict" | "premium_skins";          // vain maksullisille
type Plan = "free" | "pro" | "premium";

interface Win { days: number; limit: number; label: string; }

// AI-luontien katot. Ilmainen: 1 / viikko. Maksullinen: reilu päivä- + kuukausikatto.
const PLAN_LIMITS: Record<Plan, { windows: Win[]; throttleSec: number }> = {
  free:    { windows: [{ days: 7, limit: 1, label: "viikko" }], throttleSec: 15 },
  pro:     { windows: [{ days: 1, limit: 50, label: "päivä" }, { days: 30, limit: 800, label: "kuukausi" }], throttleSec: 3 },
  premium: { windows: [{ days: 1, limit: 80, label: "päivä" }, { days: 30, limit: 1500, label: "kuukausi" }], throttleSec: 3 },
};

// Maksulliset ominaisuudet (eivät ilmaiskäyttäjille).
const FEATURE_ACCESS: Record<Plan, Feature[]> = {
  free:    [],
  pro:     ["recruiter_verdict", "premium_skins"],
  premium: ["recruiter_verdict", "premium_skins"],
};

function planOf(p?: string | null): Plan {
  if (!p || p === "free") return "free";
  if (p === "premium") return "premium";
  return "pro"; // 'basic', 'pro' tai mikä tahansa muu maksullinen → maksullinen taso
}

export function canUseFeature(planType: string | null | undefined, feature: Feature): boolean {
  return FEATURE_ACCESS[planOf(planType)].includes(feature);
}

async function countSince(userId: string, sinceISO: string): Promise<number> {
  const { count } = await supabaseAdmin
    .from("usage_events")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", sinceISO);
  return count || 0;
}

async function computeRemaining(userId: string, cfg: { windows: Win[] }) {
  let tightest = cfg.windows[0];
  let remaining = Infinity;
  for (const w of cfg.windows) {
    const used = await countSince(userId, new Date(Date.now() - w.days * 86400000).toISOString());
    const r = Math.max(0, w.limit - used);
    if (r < remaining) { remaining = r; tightest = w; }
  }
  return { remaining: remaining === Infinity ? 0 : remaining, limit: tightest.limit, windowLabel: tightest.label };
}

export interface LimitResult {
  allowed: boolean;
  reason?: "throttle" | "limit";
  remaining: number;
  limit: number;
  windowLabel: string;
  plan: Plan;
}

/** Kutsu ENNEN AI-kutsua (vain AI-polussa, ei ei-AI-polussa). */
export async function checkLimit(userId: string, planType?: string | null): Promise<LimitResult> {
  const plan = planOf(planType);
  const cfg = PLAN_LIMITS[plan];
  try {
    const recent = await countSince(userId, new Date(Date.now() - cfg.throttleSec * 1000).toISOString());
    if (recent > 0) {
      const w = cfg.windows[0];
      return { allowed: false, reason: "throttle", remaining: 0, limit: w.limit, windowLabel: w.label, plan };
    }
    const { remaining, limit, windowLabel } = await computeRemaining(userId, cfg);
    if (remaining <= 0) return { allowed: false, reason: "limit", remaining: 0, limit, windowLabel, plan };
    return { allowed: true, remaining, limit, windowLabel, plan };
  } catch {
    const w = cfg.windows[0];
    return { allowed: true, remaining: w.limit, limit: w.limit, windowLabel: w.label, plan }; // fail-open
  }
}

/** Kirjaa onnistunut AI-luonti (AI-kutsun JÄLKEEN). */
export async function logUsage(userId: string, kind: UsageKind): Promise<void> {
  try { await supabaseAdmin.from("usage_events").insert({ user_id: userId, kind }); } catch { /* ei kriittinen */ }
}

export function limitMessage(r: LimitResult, isFi = true): string {
  if (r.allowed) return "";
  if (r.reason === "throttle") return isFi ? "Hetki — yritä uudelleen hetken päästä." : "Slow down — try again shortly.";
  if (r.plan === "free") return isFi
    ? "Ilmaisversiossa voit luoda yhden AI-dokumentin viikossa. Voit jatkaa ilmaisilla mallipohjilla tai päivittää Pro:ksi rajattomampaan käyttöön."
    : "The free plan allows one AI document per week. Keep building with free templates, or upgrade to Pro.";
  return isFi ? `${r.windowLabel === "päivä" ? "Päivän" : "Kuukauden"} AI-raja täynnä.` : `AI ${r.windowLabel} limit reached.`;
}

// ── UI-status (header, lukkomerkit) ──────────────────────────────────────────
export interface PlanStatus {
  plan: Plan;
  aiRemaining: number;
  aiLimit: number;
  windowLabel: string;        // 'viikko' | 'päivä' | 'kuukausi'
  features: Record<Feature, boolean>;
}
export async function getPlanStatus(userId: string, planType?: string | null): Promise<PlanStatus> {
  const plan = planOf(planType);
  const { remaining, limit, windowLabel } = await computeRemaining(userId, PLAN_LIMITS[plan]);
  return {
    plan,
    aiRemaining: remaining,
    aiLimit: limit,
    windowLabel,
    features: {
      recruiter_verdict: canUseFeature(planType, "recruiter_verdict"),
      premium_skins: canUseFeature(planType, "premium_skins"),
    },
  };
}