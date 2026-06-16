// components/ExperienceGapModal.tsx
// ✅ Gap-modaali: näyttää käyttäjälle ystävällisesti jos hakemuksessa on kokemuspuutteita.
//    - Näytetään VAIN severity 'moderate' | 'critical' (ei 'minor' / 'none').
//    - "Luo silti" → kutsuu generoinnin uudelleen skipExperienceCheck=true (ei uutta gap-AI-kutsua).
//    - Sävy: kannustava, EI tyrmäävä. Ei "et pääse läpi" vaan "tässä on huomioitavaa".
//    - Käyttää sovelluksen design-tokeneita (bg-card, border-border, text-foreground…) → istuu light+dark.
'use client';

import { AlertTriangle, ArrowRight, X, Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';

// Vastaa experienceGapAnalyzer.ts:n ExperienceGap-tyyppiä (oleelliset kentät)
export interface ExperienceGapData {
  hasGap: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'critical';
  passLikelihood: number; // 0-100
  missingExperiences: {
    skill: string;
    required: boolean;
    impact: 'critical' | 'important' | 'helpful';
    explanation: string;
  }[];
  recommendations: string[];
  warningMessage?: string;
  userFriendlyExplanation?: string;
}

interface ExperienceGapModalProps {
  gap: ExperienceGapData;
  language?: 'fi' | 'en';
  onProceed: () => void;   // "Luo silti" → generoi skipExperienceCheck=true
  onCancel: () => void;    // "Muokkaa profiilia" / sulje
}

export default function ExperienceGapModal({
  gap,
  language = 'fi',
  onProceed,
  onCancel,
}: ExperienceGapModalProps) {
  const isFi = language === 'fi';

  // Näytä vain merkittävät puutteet (impact critical/important), max 5
  const shownMissing = (gap.missingExperiences || [])
    .filter((m) => m.impact === 'critical' || m.impact === 'important')
    .slice(0, 5);

  const shownRecommendations = (gap.recommendations || []).slice(0, 3);

  // Sävy passLikelihoodin mukaan — aina kannustava
  const likelihood = Math.max(0, Math.min(100, Math.round(gap.passLikelihood || 0)));

  const t = isFi
    ? {
        title: 'Muutama asia kannattaa huomioida',
        subtitle:
          'Kävimme ilmoituksen läpi ja huomasimme, että profiilistasi voi puuttua joitakin asioita, joita työnantaja painottaa. Voit luoda hakukirjeen silti — me korostamme vahvuuksiasi ja kerromme rehellisesti siitä mitä olet oppimassa.',
        matchLabel: 'Arvioitu osuvuus ilmoitukseen',
        missingTitle: 'Ilmoituksessa painotetaan, mutta profiilistasi ei löytynyt selvästi:',
        impactCritical: 'Keskeinen',
        impactImportant: 'Tärkeä',
        recTitle: 'Vinkkejä',
        proceed: 'Luo hakukirje silti',
        cancel: 'Täydennä profiilia ensin',
        note: 'Hakukirje tehdään rehellisesti — emme keksi kokemusta jota sinulla ei ole, vaan kerromme kiinnostuksestasi oppia.',
      }
    : {
        title: 'A few things worth noting',
        subtitle:
          "We reviewed the posting and noticed your profile may be missing some things the employer emphasizes. You can still create the letter — we'll highlight your strengths and be honest about what you're eager to learn.",
        matchLabel: 'Estimated match to posting',
        missingTitle: "Emphasized in the posting but not clearly found in your profile:",
        impactCritical: 'Key',
        impactImportant: 'Important',
        recTitle: 'Tips',
        proceed: 'Create letter anyway',
        cancel: 'Complete profile first',
        note: "The letter stays honest — we won't invent experience you don't have; we express your eagerness to learn instead.",
      };

  // Värisävy: kannustava keltainen/amber (ei punainen = ei "epäonnistuminen")
  const barColor =
    likelihood >= 60 ? 'bg-emerald-500' : likelihood >= 40 ? 'bg-amber-500' : 'bg-orange-500';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-modal-title"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sulje */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label={isFi ? 'Sulje' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-8">
          {/* Otsikko */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/25 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
            <div className="min-w-0 pr-6">
              <h2 id="gap-modal-title" className="text-lg font-bold text-foreground">
                {t.title}
              </h2>
            </div>
          </div>

          {/* Selite */}
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">{t.subtitle}</p>

          {/* Osuvuusmittari */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">{t.matchLabel}</span>
              <span className="text-sm font-black text-foreground">{likelihood}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all`}
                style={{ width: `${likelihood}%` }}
              />
            </div>
          </div>

          {/* Puuttuvat asiat */}
          {shownMissing.length > 0 && (
            <div className="mb-6">
              <p className="text-xs font-bold text-foreground mb-3">{t.missingTitle}</p>
              <ul className="space-y-2.5">
                {shownMissing.map((m, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted border border-border"
                  >
                    <span
                      className={`shrink-0 mt-0.5 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full ${
                        m.impact === 'critical'
                          ? 'bg-orange-500/15 text-orange-500 border border-orange-500/25'
                          : 'bg-amber-500/15 text-amber-500 border border-amber-500/25'
                      }`}
                    >
                      {m.impact === 'critical' ? t.impactCritical : t.impactImportant}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{m.skill}</p>
                      {m.explanation && (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                          {m.explanation}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vinkit */}
          {shownRecommendations.length > 0 && (
            <div className="mb-6 p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-foreground">{t.recTitle}</span>
              </div>
              <ul className="space-y-1.5">
                {shownRecommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rehellisyys-huomautus */}
          <div className="mb-6 flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span>{t.note}</span>
          </div>

          {/* Napit */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 rounded-2xl border border-border bg-muted hover:bg-muted/70 text-sm font-semibold text-foreground transition-colors"
            >
              {t.cancel}
            </button>
            <button
              onClick={onProceed}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              {t.proceed}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}