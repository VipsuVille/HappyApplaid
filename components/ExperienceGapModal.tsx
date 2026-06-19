// components/ExperienceGapModal.tsx
// ✅ Gap-modaali: ystävällinen, EI tekninen, EI nappimainen.
//    - Puutteet näytetään pehmeänä listana (ei laatikko-"nappeja").
//    - Sävy kannustava, ei raporttimainen.
//    - "Luo silti" → skipExperienceCheck=true.
//    - Design-tokenit → light+dark.
'use client';

import { Lightbulb, ArrowRight, X, Sparkles } from 'lucide-react';

export interface ExperienceGapData {
  hasGap: boolean;
  severity: 'none' | 'minor' | 'moderate' | 'critical';
  passLikelihood: number;
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
  onProceed: () => void;
  onCancel: () => void;
}

export default function ExperienceGapModal({
  gap,
  language = 'fi',
  onProceed,
  onCancel,
}: ExperienceGapModalProps) {
  const isFi = language === 'fi';

  // Näytä vain tärkeimmät puutteet, max 4 — ja vain skill-nimet + lyhyt selite
  const shownMissing = (gap.missingExperiences || [])
    .filter((m) => m.impact === 'critical' || m.impact === 'important')
    .slice(0, 4);

  const shownRecommendations = (gap.recommendations || []).slice(0, 3);
  const likelihood = Math.max(0, Math.min(100, Math.round(gap.passLikelihood || 0)));

  const t = isFi
    ? {
        title: 'Pari ajatusta ennen kuin jatkat',
        subtitle:
          'Kävimme ilmoituksen läpi. Työnantaja vaikuttaa painottavan muutamaa asiaa, joita profiilistasi ei löytynyt selvästi. Voit silti luoda kirjeen — korostamme vahvuuksiasi ja kerromme rehellisesti siitä, mitä olet innokas oppimaan.',
        missingTitle: 'Ilmoituksessa painottuu erityisesti:',
        recTitle: 'Jos haluat vahvistaa hakemustasi myöhemmin:',
        proceed: 'Luo hakukirje silti',
        cancel: 'Täydennän profiilini ensin',
        note: 'Emme keksi kokemusta jota sinulla ei ole — kerromme kiinnostuksestasi oppia.',
      }
    : {
        title: 'A couple of thoughts before you continue',
        subtitle:
          "We reviewed the posting. The employer seems to emphasize a few things not clearly found in your profile. You can still create the letter — we'll highlight your strengths and honestly express what you're eager to learn.",
        missingTitle: 'The posting especially emphasizes:',
        recTitle: 'If you want to strengthen your application later:',
        proceed: 'Create letter anyway',
        cancel: "I'll complete my profile first",
        note: "We won't invent experience you don't have — we express your eagerness to learn.",
      };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gap-modal-title"
    >
      <div
        className="relative w-full max-w-md max-h-[88vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground"
          aria-label={isFi ? 'Sulje' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 md:p-7">
          {/* Otsikko — ystävällinen, ei varoituskolmiota */}
          <div className="flex items-center gap-3 mb-3 pr-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-amber-500/15 shrink-0">
              <Sparkles className="w-5 h-5 text-amber-500" />
            </div>
            <h2 id="gap-modal-title" className="text-base font-bold text-foreground leading-snug">
              {t.title}
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">{t.subtitle}</p>

          {/* Puutteet — pehmeä lista, EI laatikko-nappeja. Vain skill-nimi lihavoituna + selite. */}
          {shownMissing.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted-foreground mb-2.5">{t.missingTitle}</p>
              <ul className="space-y-2.5">
                {shownMissing.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-foreground">{m.skill}</span>
                      {m.explanation && (
                        <span className="text-sm text-muted-foreground">
                          {' — '}
                          {m.explanation}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Vinkit — kevyt, ei korostettu laatikko */}
          {shownRecommendations.length > 0 && (
            <div className="mb-5">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs font-semibold text-muted-foreground">{t.recTitle}</span>
              </div>
              <ul className="space-y-1.5 pl-1">
                {shownRecommendations.map((r, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                    • {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rehellisyys-huomautus */}
          <p className="text-[11px] text-muted-foreground/80 italic leading-relaxed mb-5">
            {t.note}
          </p>

          {/* Napit — NÄMÄ ovat oikeita nappeja, selvästi erottuvat */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={onProceed}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 text-white text-sm font-bold hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
            >
              {t.proceed}
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onCancel}
              className="w-full py-2.5 px-4 rounded-2xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}