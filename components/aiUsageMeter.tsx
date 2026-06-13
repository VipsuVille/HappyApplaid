'use client';
// components/AiUsageMeter.tsx
// Claude-tyylinen näyttö: ei stressaa isoilla luvuilla.
//  - Free:    näyttää AINA x/1 (yksi generointi on iso asia)
//  - Pro/Prem: näyttää vain tasomerkin (PRO/PREMIUM) kunnes ≥80 % käytetty,
//              sitten varoittaa määrällä ("80 % käytetty …").
// Käytä headerissa (compact) ja generointisivuilla.
import { usePlanStatus } from '@/hooks/usePlanStatus';

const WARN_THRESHOLD = 0.8; // varoita kun 80 % käytetty

export default function AiUsageMeter({
  isFi = true,
  compact = false,
}: { isFi?: boolean; compact?: boolean }) {
  const { status, loading } = usePlanStatus();
  if (loading || !status) return null;

  const { plan, aiRemaining, aiLimit, windowLabel } = status;
  const used = Math.max(0, aiLimit - aiRemaining);
  const usedPct = aiLimit > 0 ? used / aiLimit : 0;
  const usedPctRounded = Math.round(usedPct * 100);

  const isFree = plan === 'free';
  const planLabel = plan === 'premium' ? 'Premium' : plan === 'pro' ? 'Pro' : 'Free';

  // Näytetäänkö määrä? Free: aina. Pro/Premium: vasta kun lähestyy rajaa.
  const showCount = isFree || usedPct >= WARN_THRESHOLD;
  const atLimit = aiRemaining <= 0;
  const nearLimit = !atLimit && usedPct >= WARN_THRESHOLD;

  const tone = atLimit ? 'red' : nearLimit ? 'amber' : isFree ? 'slate' : 'emerald';
  const textColor = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
    slate: 'text-gray-600 dark:text-gray-400',
  }[tone];
  const barColor = {
    emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500', slate: 'bg-gray-400',
  }[tone];

  const upgradeHref = '/pricing';
  const showUpgrade = plan === 'free' || plan === 'pro';
  const upgradeText = isFi ? 'Päivitä tilaustasi' : 'Upgrade';

  // ── COMPACT (header) ──────────────────────────────────────────
  if (compact) {
    // Free: "Free · 1/1". Pro/Prem: pelkkä tasomerkki, ellei lähellä rajaa.
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${textColor}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {planLabel}
        {showCount && (
          <span className="font-semibold">· {aiRemaining}/{aiLimit}</span>
        )}
      </span>
    );
  }

  // ── FULL (generointisivut) ────────────────────────────────────
  // Jos Pro/Premium eikä lähellä rajaa → näytä vain hillitty tasorivi.
  if (!showCount) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {planLabel}
        </span>
        <span className="text-gray-400 dark:text-gray-600">
          {isFi ? '· AI-toiminnot käytettävissä' : '· AI actions available'}
        </span>
      </div>
    );
  }

  // Free, tai lähellä rajaa → näytä mittari + määrä
  const label = isFi ? `AI-toiminnot / ${windowLabel}` : `AI actions / ${windowLabel}`;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
          {label} <span className="text-gray-400">· {planLabel}</span>
        </span>
        <span className={`text-xs font-bold ${textColor}`}>
          {aiRemaining}/{aiLimit} {isFi ? 'jäljellä' : 'left'}
        </span>
      </div>

      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${usedPctRounded}%` }} />
      </div>

      {/* 80 % varoitus (ei vielä lopussa) */}
      {nearLimit && (
        <p className={`mt-2 text-[11px] ${textColor}`}>
          {isFi
            ? `Olet käyttänyt ${usedPctRounded} % viikon AI-toiminnoista (${aiRemaining} jäljellä).`
            : `You've used ${usedPctRounded} % of this ${windowLabel}'s AI actions (${aiRemaining} left).`}
          {showUpgrade && (
            <a href={upgradeHref} className="underline ml-1 font-semibold">{upgradeText}</a>
          )}
        </p>
      )}

      {/* Raja täynnä */}
      {atLimit && (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">
          {isFi
            ? `Raja täynnä. Uusiutuu seuraavan ${windowLabel}n alussa.`
            : `Limit reached. Resets next ${windowLabel}.`}
          {showUpgrade && (
            <a href={upgradeHref} className="underline ml-1 font-semibold">{upgradeText}</a>
          )}
        </p>
      )}
    </div>
  );
}