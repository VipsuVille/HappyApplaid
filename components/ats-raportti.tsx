// components/ats-raportti.tsx - MONIKIELINEN VERSIO
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertCircle, XCircle, Globe } from 'lucide-react';

interface ATSReportProps {
  report: {
    keyword_match_score: number;
    ats_compatibility_score: number;
    critical_keywords_used: string[];
    missing_keywords: string[];
    improvement_suggestions: string[];
    keyword_density?: Record<string, number>;
    language_info?: {
      job_language: string;
      cover_letter_language: string;
      needs_translation: boolean;
    };
  };
}

const ATSReport: React.FC<ATSReportProps> = ({ report }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Määritä väri pisteiden mukaan
  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 75) return 'bg-green-100 border-green-300';
    if (score >= 50) return 'bg-yellow-100 border-yellow-300';
    return 'bg-red-100 border-red-300';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 75) return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (score >= 50) return <AlertCircle className="w-5 h-5 text-yellow-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 75) return 'Erinomainen';
    if (score >= 50) return 'Hyvä';
    return 'Parannettavaa';
  };

  const getLanguageName = (lang: string) => {
    const map: Record<string, string> = {
      english: '🇬🇧 Englanti',
      finnish: '🇫🇮 Suomi',
      swedish: '🇸🇪 Ruotsi',
      unknown: '❓ Tuntematon'
    };
    return map[lang.toLowerCase()] || lang;
  };

  return (
    <div className="ats-report border rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Header - Always visible */}
      <div 
        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${getScoreBgColor(report.keyword_match_score)}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getScoreIcon(report.keyword_match_score)}
            <div>
              <h3 className="font-semibold text-gray-800">ATS-yhteensopivuus</h3>
              <p className="text-sm text-gray-600">
                {getScoreLabel(report.keyword_match_score)} - {report.keyword_match_score}% avainsanamatch
              </p>
              
              {/* Language indicator */}
              {report.language_info && (
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-3 h-3 text-gray-500" />
                  <span className="text-xs text-gray-500">
                    {getLanguageName(report.language_info.cover_letter_language)}
                    {report.language_info.needs_translation && (
                      <span className="ml-1 text-orange-600">
                        ↔ {getLanguageName(report.language_info.job_language)}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(report.keyword_match_score)}`}>
              {report.keyword_match_score}%
            </span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-500" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 bg-gray-50 border-t">
          {/* Multilingual Warning */}
          {report.language_info?.needs_translation && (
            <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-start gap-2">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">
                    🌍 Monikielinen analyysi
                  </p>
                  <p className="text-xs text-gray-700">
                    Työpaikkailmoitus on {getLanguageName(report.language_info.job_language)}-kielellä, 
                    hakukirje {getLanguageName(report.language_info.cover_letter_language)}-kielellä.
                    Avainsanat on käännetty automaattisesti parempaa matchingia varten.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Score Breakdown */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Avainsanamatch</p>
              <p className={`text-xl font-bold ${getScoreColor(report.keyword_match_score)}`}>
                {report.keyword_match_score}%
              </p>
            </div>
            <div className="bg-white p-3 rounded border">
              <p className="text-sm text-gray-600 mb-1">Muotoilu</p>
              <p className={`text-xl font-bold ${getScoreColor(report.ats_compatibility_score)}`}>
                {report.ats_compatibility_score}%
              </p>
            </div>
          </div>

          {/* Critical Keywords Used */}
          {report.critical_keywords_used && report.critical_keywords_used.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                Löydetyt avainsanat ({report.critical_keywords_used.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.critical_keywords_used.slice(0, 10).map((keyword, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-300"
                  >
                    {keyword}
                  </span>
                ))}
                {report.critical_keywords_used.length > 10 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{report.critical_keywords_used.length - 10} muuta
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Missing Keywords */}
          {report.missing_keywords && report.missing_keywords.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                Puuttuvat avainsanat ({report.missing_keywords.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {report.missing_keywords.slice(0, 10).map((keyword, idx) => (
                  <span 
                    key={idx}
                    className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full border border-yellow-300"
                  >
                    {keyword}
                  </span>
                ))}
                {report.missing_keywords.length > 10 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                    +{report.missing_keywords.length - 10} muuta
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Improvement Suggestions */}
          {report.improvement_suggestions && report.improvement_suggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">Parannusehdotukset</h4>
              <ul className="space-y-2">
                {report.improvement_suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info Box */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-gray-700">
            <p className="font-semibold text-blue-800 mb-1">💡 Mitä ATS-pisteet tarkoittavat?</p>
            <ul className="space-y-1 text-xs">
              <li><strong>75%+:</strong> Erinomainen - Hakemuksesi läpäisee ATS-järjestelmät helposti</li>
              <li><strong>50-74%:</strong> Hyvä - Todennäköisesti läpäisee, mutta voit parantaa</li>
              <li><strong>&lt;50%:</strong> Parannettavaa - Lisää puuttuvia avainsanoja</li>
            </ul>
            {report.language_info?.needs_translation && (
              <p className="mt-2 text-xs italic text-gray-600 border-t border-blue-200 pt-2">
                🌍 Monikielinen analyysi: Avainsanat on käännetty automaattisesti hakukirjeen kielelle.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ATSReport;
