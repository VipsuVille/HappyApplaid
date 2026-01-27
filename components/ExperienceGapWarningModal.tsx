
'use client';
// components/ExperienceGapWarningModal.tsx - VAROITUS KÄYTTÄJÄLLE

import { AlertCircle, CheckCircle, AlertTriangle, TrendingDown, Lightbulb, X } from 'lucide-react';
import type { ExperienceGap } from '@/lib/ats/experienceGapAnalyzer';

interface Props {
  gap: ExperienceGap;
  onProceed: () => void;
  onCancel: () => void;
  language?: 'finnish' | 'english';
}

export default function ExperienceGapWarningModal({
  gap,
  onProceed,
  onCancel,
  language = 'finnish'
}: Props) {
  const isFinnish = language === 'finnish';

  // Määritä värit ja ikonit severity:n mukaan
  const getTheme = () => {
    if (gap.passLikelihood >= 75) {
      return {
        bgColor: 'from-green-500/10 to-emerald-500/10',
        borderColor: 'border-green-500/30',
        iconColor: 'text-green-400',
        icon: CheckCircle,
        title: isFinnish ? '✅ Hyvät mahdollisuudet!' : '✅ Good Chances!'
      };
    } else if (gap.passLikelihood >= 50) {
      return {
        bgColor: 'from-yellow-500/10 to-orange-500/10',
        borderColor: 'border-yellow-500/30',
        iconColor: 'text-yellow-400',
        icon: AlertTriangle,
        title: isFinnish ? '⚠️ Kohtalaiset mahdollisuudet' : '⚠️ Moderate Chances'
      };
    } else {
      return {
        bgColor: 'from-red-500/10 to-pink-500/10',
        borderColor: 'border-red-500/30',
        iconColor: 'text-red-400',
        icon: AlertCircle,
        title: isFinnish ? '🔴 Haastavat mahdollisuudet' : '🔴 Challenging Chances'
      };
    }
  };

  const theme = getTheme();
  const Icon = theme.icon;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full my-8 border border-slate-700/50">
        
        {/* HEADER */}
        <div className={`p-6 border-b border-slate-700/50 bg-gradient-to-r ${theme.bgColor}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className={`p-3 bg-slate-900/50 rounded-xl ${theme.borderColor} border-2`}>
                <Icon className={`w-8 h-8 ${theme.iconColor}`} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-2">
                  {theme.title}
                </h2>
                <p className="text-sm text-slate-300">
                  {isFinnish 
                    ? `ATS-läpäisymahdollisuus: ${gap.passLikelihood}%`
                    : `ATS Pass Likelihood: ${gap.passLikelihood}%`
                  }
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          
          {/* User-Friendly Explanation */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <p className="text-slate-200 leading-relaxed">
              {gap.userFriendlyExplanation}
            </p>
          </div>

          {/* Missing Experiences */}
          {gap.missingExperiences.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-orange-400" />
                {isFinnish ? 'Puuttuvat kokemukset:' : 'Missing Experiences:'}
              </h3>
              
              <div className="space-y-3">
                {gap.missingExperiences.map((exp, index) => {
                  const impactColor = exp.impact === 'critical' 
                    ? 'bg-red-500/20 border-red-500/30 text-red-300'
                    : exp.impact === 'important'
                    ? 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300'
                    : 'bg-blue-500/20 border-blue-500/30 text-blue-300';

                  const impactLabel = exp.impact === 'critical'
                    ? (isFinnish ? '🔴 Kriittinen' : '🔴 Critical')
                    : exp.impact === 'important'
                    ? (isFinnish ? '🟡 Tärkeä' : '🟡 Important')
                    : (isFinnish ? '🟢 Bonus' : '🟢 Bonus');

                  return (
                    <div 
                      key={index}
                      className={`p-4 rounded-xl border-2 ${impactColor}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-bold text-slate-100">
                          {exp.skill}
                        </h4>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-900/50">
                          {impactLabel}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">
                        {exp.explanation}
                      </p>
                      {exp.required && (
                        <p className="text-xs mt-2 font-semibold text-slate-400">
                          {isFinnish 
                            ? '⚠️ Työpaikkailmoituksessa mainittu pakollisena'
                            : '⚠️ Listed as required in job posting'
                          }
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {gap.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-orange-400" />
                {isFinnish ? 'Suositukset:' : 'Recommendations:'}
              </h3>
              
              <ul className="space-y-2">
                {gap.recommendations.map((rec, index) => (
                  <li 
                    key={index}
                    className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
                  >
                    <span className="text-orange-400 font-bold mt-0.5">→</span>
                    <span className="text-sm text-slate-300 flex-1">{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Message */}
          <div className="bg-slate-800/50 rounded-xl p-4 border-l-4 border-orange-500">
            <p className="text-sm text-slate-300 italic">
              💡 {gap.warningMessage}
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-blue-500/10 rounded-xl p-4 border border-blue-500/30">
            <p className="text-sm text-blue-200 leading-relaxed">
              {isFinnish ? (
                <>
                  <strong>Huom:</strong> Generoimme hakukirjeen joka tapauksessa käyttäen 
                  parhaita vahvuuksiasi. Voit silti lähettää hakemuksen - monet yritykset 
                  arvioivat hakemuksia myös ihmisen toimesta, eikä ATS-pisteet ole ainoa 
                  kriteeri.
                </>
              ) : (
                <>
                  <strong>Note:</strong> We will generate a cover letter regardless, 
                  highlighting your best strengths. You can still submit your application - 
                  many companies also have human reviewers, and ATS scores are not the only 
                  criterion.
                </>
              )}
            </p>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-700/50 flex justify-between items-center bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={onCancel}
            className="px-6 py-3 bg-slate-800/50 border border-slate-700 rounded-xl hover:bg-slate-700/50 disabled:opacity-50 text-slate-300 transition-colors font-semibold"
          >
            {isFinnish ? 'Peruuta' : 'Cancel'}
          </button>
          
          <button
            onClick={onProceed}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-xl hover:from-orange-600 hover:to-amber-700 flex items-center gap-2 font-semibold shadow-lg transition-all"
          >
            {isFinnish ? 'Jatka ja generoi kirje' : 'Continue and Generate Letter'}
            →
          </button>
        </div>
      </div>
    </div>
  );
}