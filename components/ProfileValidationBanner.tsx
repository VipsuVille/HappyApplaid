// components/ProfileValidationBanner.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ChevronDown, ChevronUp, Info, ArrowRight, CheckCircle } from 'lucide-react';
import { ProfileValidationResult, formatValidationMessage, getGroupedMissingFields } from '@/lib/profileValidation';

interface Props {
  validation: ProfileValidationResult;
  language?: 'fi' | 'en';
  context?: 'cv' | 'cover_letter';
}

export default function ProfileValidationBanner({ 
  validation, 
  language = 'fi',
  context = 'cv'
}: Props) {
  const [showDetails, setShowDetails] = useState(false);
  
  if (validation.isValid) {
    return (
      <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-6 flex items-center gap-4">
        <div className="p-3 bg-emerald-500/20 rounded-xl">
          <CheckCircle className="w-6 h-6 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-black text-emerald-400">
            {language === 'fi' ? '✓ Profiili valmis!' : '✓ Profile ready!'}
          </h3>
          <p className="text-xs sm:text-sm text-emerald-200/70 mt-1">
            {language === 'fi' 
              ? 'Kaikki pakolliset kentät täytetty. Voit aloittaa generoinnin.' 
              : 'All required fields filled. You can start generation.'
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-black text-emerald-400">{validation.completionPercentage}%</div>
          <div className="text-[9px] text-emerald-500 uppercase tracking-wider">Complete</div>
        </div>
      </div>
    );
  }

  const message = formatValidationMessage(validation, language);
  const grouped = getGroupedMissingFields(validation);
  const showExpanded = validation.requiredMissing.length <= 5;

  return (
    <div className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl overflow-hidden">
      
      {/* HEADER */}
      <div className="p-4 sm:p-6 bg-orange-500/5 flex items-start gap-4">
        <div className="p-3 bg-orange-500/20 rounded-xl shrink-0">
          <AlertCircle className="w-6 h-6 text-orange-400" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-black text-orange-400 mb-2">
            {message.title}
          </h3>
          <p className="text-xs sm:text-sm text-orange-200/80">
            {message.description}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl sm:text-3xl font-black text-orange-400">{validation.completionPercentage}%</div>
          <div className="text-[9px] text-orange-500 uppercase tracking-wider">Complete</div>
        </div>
      </div>

      {/* MISSING FIELDS - COMPACT (jos <= 5) */}
      {showExpanded && (
        <div className="p-4 sm:p-6 bg-black/20 border-t border-orange-500/20">
          <div className="space-y-3">
            {message.missingFields.map((field, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl"
              >
                <div className="w-2 h-2 bg-orange-400 rounded-full shrink-0" />
                <span className="text-sm font-bold text-orange-200">{field}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MISSING FIELDS - EXPANDABLE (jos > 5) */}
      {!showExpanded && (
        <>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full p-4 sm:p-5 bg-orange-500/5 border-t border-orange-500/20 flex items-center justify-between hover:bg-orange-500/10 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-300">
                {showDetails 
                  ? (language === 'fi' ? 'Piilota lista' : 'Hide list')
                  : (language === 'fi' 
                    ? `Näytä kaikki ${validation.requiredMissing.length} puuttuvaa kenttää`
                    : `Show all ${validation.requiredMissing.length} missing fields`
                  )
                }
              </span>
            </div>
            {showDetails ? <ChevronUp className="w-5 h-5 text-orange-400" /> : <ChevronDown className="w-5 h-5 text-orange-400" />}
          </button>

          {showDetails && (
            <div className="p-4 sm:p-6 bg-black/20 border-t border-orange-500/20 space-y-6">
              {grouped.map((group, gIndex) => (
                <div key={gIndex}>
                  <h4 className="text-xs font-black text-orange-400 uppercase tracking-wider mb-3">
                    {group.category}
                  </h4>
                  <div className="space-y-2">
                    {group.fields.map((issue, iIndex) => (
                      <div 
                        key={iIndex}
                        className="flex items-start gap-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-xl"
                      >
                        <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5 shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-orange-200">{issue.displayName}</p>
                          {issue.minLength && issue.currentLength !== undefined && (
                            <div className="mt-2">
                              <div className="h-1.5 bg-black/40 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-orange-400 rounded-full transition-all"
                                  style={{ width: `${Math.min((issue.currentLength / issue.minLength) * 100, 100)}%` }}
                                />
                              </div>
                              <p className="text-[10px] text-orange-400/60 mt-1">
                                {issue.currentLength} / {issue.minLength} {language === 'fi' ? 'merkkiä' : 'characters'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ACTION BUTTON */}
      <div className="p-4 sm:p-6 bg-orange-500/5 border-t border-orange-500/20">
        <Link href="/profile">
          <button className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-black text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]">
            {language === 'fi' ? 'Täydennä profiilia' : 'Complete Profile'}
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </Link>
      </div>
    </div>
  );
}