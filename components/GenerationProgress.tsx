// components/GenerationProgress.tsx
// ✅ Sivun sisäinen latausnäkymä (EI koko ruudun lukkoa).
//    - Itsestään etenevä palkki: ei jumitu 80%:iin kuten setStage-hyppely.
//      Palkki kiilaa hitaasti kohti 90% generoinnin aikana, ja täyttyy 100% kun valmis.
//    - Elävät ikonit: vaihe vaihtuu ajan myötä (analysoi → kirjoittaa → viimeistelee).
//    - beforeunload-suojaus: varoittaa jos käyttäjä yrittää poistua kesken generoinnin.
//    - Käyttää design-tokeneita (bg-card, border-border…) → light+dark.
'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, PenLine, Sparkles, CheckCircle2 } from 'lucide-react';

interface GenerationProgressProps {
  active: boolean;                 // true = generointi käynnissä
  done?: boolean;                  // true = valmis → täytä 100% ja näytä check
  language?: 'fi' | 'en';
  /** Arvioitu kesto sekunteina (palkin tahti). ATS ~25s, general ~12s. */
  estimatedSeconds?: number;
}

const STAGES = {
  fi: [
    { icon: Search,    label: 'Analysoidaan ilmoitusta…' },
    { icon: PenLine,   label: 'Kirjoitetaan hakukirjettä…' },
    { icon: Sparkles,  label: 'Viimeistellään yksityiskohtia…' },
  ],
  en: [
    { icon: Search,    label: 'Analyzing the posting…' },
    { icon: PenLine,   label: 'Writing your letter…' },
    { icon: Sparkles,  label: 'Polishing the details…' },
  ],
};

export default function GenerationProgress({
  active,
  done = false,
  language = 'fi',
  estimatedSeconds = 25,
}: GenerationProgressProps) {
  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // ── Itsestään etenevä palkki ───────────────────────────────
  useEffect(() => {
    if (!active) {
      setProgress(0);
      setStageIndex(0);
      startRef.current = null;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      return;
    }

    startRef.current = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - (startRef.current ?? now)) / 1000; // sekunteina
      // Asymptoottinen eteneminen kohti 90% — ei koskaan "jumitu" täyteen ennen valmistumista.
      // 1 - e^(-t/τ) antaa pehmeän kiilauksen; τ skaalaa arvioidun keston mukaan.
      const tau = Math.max(estimatedSeconds, 5) / 2.3;
      const pct = (1 - Math.exp(-elapsed / tau)) * 90;
      setProgress((p) => (pct > p ? pct : p));

      // Vaihe ajan mukaan: 0–35% analysoi, 35–80% kirjoittaa, 80%+ viimeistelee
      const sp = pct;
      setStageIndex(sp < 35 ? 0 : sp < 80 ? 1 : 2);

      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active, estimatedSeconds]);

  // ── Valmis → täytä 100% ────────────────────────────────────
  useEffect(() => {
    if (done) {
      setProgress(100);
      setStageIndex(STAGES[language].length); // → check-tila
    }
  }, [done, language]);

  // ── beforeunload: varoita poistumisesta kesken generoinnin ─
  useEffect(() => {
    if (!active || done) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // selain näyttää oman vakiovaroituksensa
      return '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active, done]);

  if (!active && !done) return null;

  const stages = STAGES[language];
  const isDone = done || stageIndex >= stages.length;
  const current = isDone
    ? { icon: CheckCircle2, label: language === 'fi' ? 'Valmis!' : 'Done!' }
    : stages[stageIndex];
  const Icon = current.icon;

  return (
    <div className="bg-card border border-border rounded-3xl p-6 md:p-7">
      <div className="flex items-center gap-4 mb-4">
        {/* Ikoni — vaihtuu vaiheittain, pehmeä fade key:n kautta */}
        <div
          key={isDone ? 'done' : stageIndex}
          className={`flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 transition-colors ${
            isDone
              ? 'bg-emerald-500/15 border border-emerald-500/30'
              : 'bg-orange-500/15 border border-orange-500/25'
          }`}
          style={{ animation: 'gp-pop 0.3s ease-out' }}
        >
          <Icon
            className={`w-5 h-5 ${isDone ? 'text-emerald-500' : 'text-orange-500'} ${
              isDone ? '' : 'animate-pulse'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{current.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {language === 'fi'
              ? 'Tämä kestää yleensä alle puoli minuuttia.'
              : 'This usually takes under half a minute.'}
          </p>
        </div>

        <span className="text-sm font-black text-foreground tabular-nums shrink-0">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Palkki */}
      <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isDone
              ? 'bg-emerald-500'
              : 'bg-gradient-to-r from-orange-500 to-amber-500'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Vaiheindikaattorit (pisteet) */}
      <div className="flex items-center justify-center gap-2 mt-4">
        {stages.map((_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all ${
              isDone || i < stageIndex
                ? 'w-6 bg-orange-500/60'
                : i === stageIndex
                ? 'w-6 bg-orange-500'
                : 'w-1.5 bg-muted'
            }`}
          />
        ))}
      </div>

      <style>{`
        @keyframes gp-pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}