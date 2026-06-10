// lib/ats/benchmark.ts
// Anonyymi vertailu: lasketaan käyttäjän fitScore-sijoitus saman roolityypin
// jakaumassa. EI kerätä käyttäjäkohtaista tietoa — vain { role_type, fit_score }.
import { supabaseAdmin } from "@/lib/supabase";

export type Bench = {
  percentile: number;       // 0-100: kuinka monta % heikompia kuin käyttäjä
  median: number;           // tyypillinen pistemäärä tähän rooliin
  strongThreshold: number;  // ~vahvan hakijan taso (p75)
  sampleSize: number;       // todellisten arvioiden määrä (0 = baseline)
  basis: "data" | "estimate";
};

// Järkevät vertailuarvot kunnes oikeaa dataa on tarpeeksi
const BASELINE: Record<string, { median: number; spread: number }> = {
  tech:       { median: 62, spread: 16 },
  sales:      { median: 58, spread: 18 },
  healthcare: { median: 64, spread: 14 },
  service:    { median: 60, spread: 16 },
  general:    { median: 60, spread: 16 },
};
const MIN_SAMPLES = 30;

// Kevyt roolitunnistus (vertailun ryhmittelyä varten)
export function quickRoleType(text: string): string {
  const t = text.toLowerCase();
  if (/(react|typescript|javascript|python|developer|ohjelmist|software|engineer|devops|\bsql\b|backend|frontend)/.test(t)) return "tech";
  if (/(myynti|myyjä|\bsales\b|provisio|asiakashankinta|kenttämyynti|b2b)/.test(t)) return "sales";
  if (/(hoitaja|sairaanhoit|lähihoit|lääkäri|terveys|potilas|\bnurse\b|healthcare)/.test(t)) return "healthcare";
  if (/(asiakaspalvelu|customer service|support|palveluneuvoja|kassa)/.test(t)) return "service";
  return "general";
}

// Normaalijakauman CDF (Abramowitz–Stegun erf-approksimaatio)
function normalCdf(x: number, mean: number, sd: number): number {
  const z = (x - mean) / (sd * Math.SQRT2);
  const t = 1 / (1 + 0.3275911 * Math.abs(z));
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-z * z);
  const sign = z < 0 ? -1 : 1;
  return 0.5 * (1 + sign * erf);
}

// Laske vertailu (ennen oman rivin tallennusta, ettei se vääristä)
export async function computeBenchmark(roleType: string, fitScore: number): Promise<Bench> {
  const base = BASELINE[roleType] || BASELINE.general;
  let median = base.median;
  let strongThreshold = Math.round(base.median + base.spread * 0.67);
  let percentile = Math.round(normalCdf(fitScore, base.median, base.spread) * 100);
  let sampleSize = 0;
  let basis: "data" | "estimate" = "estimate";

  try {
    const { data } = await supabaseAdmin
      .from("verdict_stats")
      .select("fit_score")
      .eq("role_type", roleType);
    const scores = (data || []).map((r: any) => Number(r.fit_score)).filter((n: number) => !isNaN(n));
    sampleSize = scores.length;
    if (sampleSize >= MIN_SAMPLES) {
      basis = "data";
      const sorted = [...scores].sort((a, b) => a - b);
      const below = scores.filter((s) => s < fitScore).length;
      percentile = Math.round((below / sampleSize) * 100);
      median = sorted[Math.floor(sorted.length / 2)];
      strongThreshold = sorted[Math.floor(sorted.length * 0.75)];
    }
  } catch {
    /* baseline riittää */
  }

  return {
    percentile: Math.max(0, Math.min(100, percentile)),
    median,
    strongThreshold,
    sampleSize,
    basis,
  };
}

// Tallenna anonyymi rivi (ei user_id, ei tekstiä)
export async function recordVerdictStat(roleType: string, fitScore: number): Promise<void> {
  try {
    await supabaseAdmin.from("verdict_stats").insert({
      role_type: roleType,
      fit_score: Math.round(fitScore),
    });
  } catch {
    /* ei kriittinen */
  }
}