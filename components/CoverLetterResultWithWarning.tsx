// components/CoverLetterResultWithWarning.tsx - TULOSSIVUN VAROITUS

'use client';

import { AlertTriangle, TrendingDown, Lightbulb, Download, Edit, Share2 } from 'lucide-react';

interface FinalWarning {
  message: string;
  missingSkills: string[];
  recommendations: string[];
  atsScore: number;
  passLikelihood: number;
}

interface Props {
  content: string;
  title: string;
  coverLetterId: string;
  atsAnalysis?: {
    score: number;
    exactMatches?: string[];
    synonymMatches?: string[];
    missingCritical?: string[];
    [key: string]: any;
  };
  finalWarning?: FinalWarning | null;
  language?: 'finnish' | 'english';
  onDownload?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
}

export default function CoverLetterResultWithWarning({
  content,
  title,
  coverLetterId,
  atsAnalysis,
  finalWarning,
  language = 'finnish',
  onDownload,
  onEdit,
  onShare
}: Props) {
  const isFinnish = language === 'finnish';

  // Määritä onko varoitus näytettävä
  const showWarning = finalWarning && (
    finalWarning.passLikelihood < 60 || 
    finalWarning.atsScore < 60
  );

  return (
    <div className="space-y-6">
      
      {/* ✅ VAROITUS BANNER (jos tarvitaan) */}
      {showWarning && finalWarning && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-2 border-yellow-500/30 rounded-2xl p-6 shadow-2xl">
          
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="p-3 bg-yellow-500/20 rounded-xl border border-yellow-500/30">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-100 mb-2">
                {isFinnish 
                  ? '⚠️ ATS-läpäisy epätodennäköistä'
                  : '⚠️ ATS Pass Unlikely'
                }
              </h3>
              <p className="text-sm text-yellow-200/80">
                {finalWarning.message}
              </p>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">
                {isFinnish ? 'ATS-pisteet' : 'ATS Score'}
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                {finalWarning.atsScore}%
              </p>
            </div>
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">
                {isFinnish ? 'Läpäisymahdollisuus' : 'Pass Likelihood'}
              </p>
              <p className="text-2xl font-bold text-yellow-400">
                {finalWarning.passLikelihood}%
              </p>
            </div>
          </div>

          {/* Missing Skills */}
          {finalWarning.missingSkills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-bold text-yellow-100 mb-2 flex items-center gap-2">
                <TrendingDown className="w-4 h-4" />
                {isFinnish ? 'Puuttuvat kriittiset taidot:' : 'Missing Critical Skills:'}
              </h4>
              <div className="flex flex-wrap gap-2">
                {finalWarning.missingSkills.map((skill, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-200 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {finalWarning.recommendations.length > 0 && (
            <div className="bg-slate-900/30 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-sm font-bold text-yellow-100 mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4" />
                {isFinnish ? 'Suositukset:' : 'Recommendations:'}
              </h4>
              <ul className="space-y-2">
                {finalWarning.recommendations.map((rec, i) => (
                  <li 
                    key={i}
                    className="flex items-start gap-2 text-sm text-slate-300"
                  >
                    <span className="text-yellow-400 font-bold mt-0.5">→</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Encouragement */}
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <p className="text-sm text-blue-200 leading-relaxed">
              {isFinnish ? (
                <>
                  💡 <strong>Muistutus:</strong> Hakukirjeesi on silti laadittu parhaalla 
                  mahdollisella tavalla. Monet yritykset arvioivat hakemuksia myös ihmisen 
                  toimesta, joten lähetä hakemus rohkeasti. ATS-pisteet eivät ole ainoa kriteeri!
                </>
              ) : (
                <>
                  💡 <strong>Remember:</strong> Your cover letter has still been crafted to 
                  the best of our ability. Many companies also review applications manually, 
                  so feel confident submitting. ATS scores are not the only criterion!
                </>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ✅ ATS ANALYSIS (jos on mutta ei kriittinen) */}
      {atsAnalysis && !showWarning && (
        <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-xl">
              <TrendingDown className="w-5 h-5 text-green-400 rotate-180" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-green-100">
                {isFinnish ? '✅ Hyvä ATS-yhteensopivuus' : '✅ Good ATS Compatibility'}
              </h3>
              <p className="text-sm text-green-200/80">
                {isFinnish 
                  ? `Pisteet: ${atsAnalysis.score}% - Todennäköisesti läpäisee ATS:n`
                  : `Score: ${atsAnalysis.score}% - Likely to pass ATS`
                }
              </p>
            </div>
          </div>

          {/* Matched Keywords */}
          {atsAnalysis.exactMatches && atsAnalysis.exactMatches.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-green-200/80 mb-2">
                {isFinnish ? 'Löydetyt avainsanat:' : 'Matched Keywords:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {atsAnalysis.exactMatches.slice(0, 10).map((keyword, i) => (
                  <span 
                    key={i}
                    className="px-2 py-1 bg-green-500/20 rounded-md text-xs text-green-200"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ✅ ACTION BUTTONS */}
      <div className="flex flex-wrap gap-3">
        {onDownload && (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 font-semibold shadow-lg transition-all"
          >
            <Download className="w-4 h-4" />
            {isFinnish ? 'Lataa PDF' : 'Download PDF'}
          </button>
        )}
        
        {onEdit && (
          <button
            onClick={onEdit}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700 text-slate-200 rounded-xl hover:bg-slate-700/50 font-semibold transition-all"
          >
            <Edit className="w-4 h-4" />
            {isFinnish ? 'Muokkaa' : 'Edit'}
          </button>
        )}
        
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 border border-slate-700 text-slate-200 rounded-xl hover:bg-slate-700/50 font-semibold transition-all"
          >
            <Share2 className="w-4 h-4" />
            {isFinnish ? 'Jaa' : 'Share'}
          </button>
        )}
      </div>

      {/* ✅ COVER LETTER CONTENT */}
      <div className="backdrop-blur-xl bg-white rounded-2xl shadow-2xl p-8 md:p-12 border border-slate-200">
        <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b border-slate-200 pb-4">
          {title}
        </h2>
        
        <div 
          className="prose prose-slate max-w-none"
          style={{
            fontSize: '11pt',
            lineHeight: '1.8',
            fontFamily: "'Merriweather', serif",
            color: '#1a202c'
          }}
        >
          {content.split('\n\n').map((paragraph, index) => (
            <p 
              key={index} 
              className="mb-4 text-justify"
              style={{ textAlign: 'justify' }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>

      {/* ✅ METADATA */}
      <div className="text-center text-xs text-slate-500">
        <p>
          {isFinnish ? 'Hakukirje ID:' : 'Cover Letter ID:'} {coverLetterId}
        </p>
      </div>
    </div>
  );
}