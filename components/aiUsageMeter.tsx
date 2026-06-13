'use client';
// components/AiUsageMeter.tsx
// Yksi yhtenäinen näyttö KAIKILLE AI-toiminnoille (CV, hakukirje, iterointi, ATS, verdikti).
// Näyttää x/y, prosentin ja varoittaa kun raja lähenee. Käytä headerissa + generointisivuilla.
import { usePlanStatus } from '@/hooks/usePlanStatus';

export default function AiUsageMeter({
  isFi = true,
  compact = false,
}: { isFi?: boolean; compact?: boolean }) {
  const { status, loading } = usePlanStatus();
  if (loading || !status) return null;

  const { aiRemaining, aiLimit, windowLabel } = status;
  const used = Math.max(0, aiLimit - aiRemaining);
  const remainingPct = aiLimit > 0 ? aiRemaining / aiLimit : 0;
  const usedPct = Math.min(100, Math.round((used / Math.max(1, aiLimit)) * 100));

  // Värit jäljellä olevan mukaan
  const tone =
    remainingPct <= 0 ? 'red' :
    remainingPct <= 0.2 ? 'red' :
    remainingPct <= 0.4 ? 'amber' : 'emerald';

  const barColor = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone];
  const textColor = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  }[tone];

  const label = isFi ? `AI-toiminnot / ${windowLabel}` : `AI actions / ${windowLabel}`;

  if (compact) {
    // Headeriin: pieni pilleri "AI 3/150"
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${textColor}`}>
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        AI {aiRemaining}/{aiLimit}
      </span>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`text-xs font-bold ${textColor}`}>
          {aiRemaining}/{aiLimit} {isFi ? 'jäljellä' : 'left'}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${usedPct}%` }} />
      </div>

      {/* Varoitus kun raja lähenee */}
      {remainingPct <= 0.2 && aiRemaining > 0 && (
        <p className={`mt-2 text-[11px] ${textColor}`}>
          {isFi
            ? `Vain ${aiRemaining} AI-toimintoa jäljellä tällä ${windowLabel}lla.`
            : `Only ${aiRemaining} AI actions left this ${windowLabel}.`}
          {status.plan === 'free' && (
            <a href="/pricing" className="underline ml-1">{isFi ? 'Päivitä Pro' : 'Upgrade'}</a>
          )}
        </p>
      )}
      {aiRemaining <= 0 && (
        <p className="mt-2 text-[11px] text-red-600 dark:text-red-400">
          {isFi ? `Raja täynnä. Uusiutuu seuraavan ${windowLabel}n alussa.` : `Limit reached. Resets next ${windowLabel}.`}
          {status.plan === 'free' && <a href="/pricing" className="underline ml-1">{isFi ? 'Päivitä Pro' : 'Upgrade'}</a>}
        </p>
      )}
    </div>
  );
}