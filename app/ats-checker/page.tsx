// app/ats-checker/page.tsx
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/context/LanguageContext';
import { 
  Shield, Target, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, FileText, Briefcase, BarChart3, ArrowRight,
  Lock, Zap, ChevronDown, ChevronUp, Info
} from 'lucide-react';
import { toast } from 'sonner';

interface KeywordMatch {
  keyword: string;
  found: boolean;
  context: string;
  importance: 'required' | 'preferred' | 'nice_to_have';
  weight: number;
}

interface ExperienceGap {
  skill: string;
  required: string;
  userHas: string;
  gapSeverity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  passLikelihood: number;
}

interface ATSResult {
  overallScore: number;
  keywordScore: number;
  experienceScore: number;
  languageScore: number;
  formattingScore: number;
  keywordMatches: KeywordMatch[];
  experienceGaps: ExperienceGap[];
  detectedLanguage: { jobPosting: string; userDocument: string; match: boolean };
  recommendations: { critical: string[]; important: string[]; optional: string[] };
  jobTitle: string;
  requiredSkillsCount: number;
  matchedSkillsCount: number;
  passLikelihood: string;
  summary: string;
}

interface UsageInfo {
  checksToday: number;
  maxChecks: number;
  isPro: boolean;
}

export default function ATSCheckerPage() {
  const { isSignedIn } = useAuth();
  const { language } = useLanguage();

  const [jobPosting, setJobPosting] = useState('');
  const [userDocument, setUserDocument] = useState('');
  const [documentType, setDocumentType] = useState<'cv' | 'cover_letter' | 'both'>('cv');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSResult | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const t = language === 'fi' ? {
    title: 'ATS Score Checker',
    subtitle: 'Tarkista pääsetkö ATS-seulan läpi ennen hakemista',
    jobLabel: 'Työpaikkailmoitus',
    jobPlaceholder: 'Liitä työpaikkailmoitus tähän...',
    docLabel: 'Oma CV / Hakukirje',
    docPlaceholder: 'Liitä oma CV:si tai hakukirjeesi tähän...',
    docType: 'Dokumentin tyyppi',
    cv: 'CV',
    coverLetter: 'Hakukirje',
    both: 'Molemmat',
    analyze: 'Analysoi ATS-yhteensopivuus',
    analyzing: 'Analysoidaan...',
    score: 'ATS Score',
    keywords: 'Avainsanat',
    experience: 'Kokemus',
    languageLabel: 'Kieli',
    formatting: 'Muotoilu',
    recommendations: 'Suositukset',
    critical: 'Kriittinen',
    important: 'Tärkeä',
    optional: 'Valinnainen',
    found: 'Löytyi',
    missing: 'Puuttuu',
    required: 'Vaadittu',
    preferred: 'Toivottu',
    passLikelihood: 'Läpimenon todennäköisyys',
    checksRemaining: 'tarkistusta jäljellä tänään',
    upgradeForMore: 'Päivitä Pro:ksi saadaksesi lisää tarkistuksia',
    signInRequired: 'Kirjaudu sisään käyttääksesi ATS Checkeria',
    securityNote: 'Tietosi eivät tallennu – vain pisteet.',
    showDetails: 'Näytä yksityiskohdat',
    hideDetails: 'Piilota yksityiskohdat',
    experienceGaps: 'Kokemusaukot',
  } : {
    title: 'ATS Score Checker',
    subtitle: 'Check if you would pass ATS screening before you apply',
    jobLabel: 'Job Posting',
    jobPlaceholder: 'Paste the job posting here...',
    docLabel: 'Your CV / Cover Letter',
    docPlaceholder: 'Paste your CV or cover letter here...',
    docType: 'Document type',
    cv: 'CV',
    coverLetter: 'Cover Letter',
    both: 'Both',
    analyze: 'Analyze ATS Compatibility',
    analyzing: 'Analyzing...',
    score: 'ATS Score',
    keywords: 'Keywords',
    experience: 'Experience',
    languageLabel: 'Language',
    formatting: 'Formatting',
    recommendations: 'Recommendations',
    critical: 'Critical',
    important: 'Important',
    optional: 'Optional',
    found: 'Found',
    missing: 'Missing',
    required: 'Required',
    preferred: 'Preferred',
    passLikelihood: 'Pass Likelihood',
    checksRemaining: 'checks remaining today',
    upgradeForMore: 'Upgrade to Pro for more checks',
    signInRequired: 'Sign in to use ATS Checker',
    securityNote: 'Your data is not stored — only scores are saved.',
    showDetails: 'Show details',
    hideDetails: 'Hide details',
    experienceGaps: 'Experience Gaps',
  };

  const handleAnalyze = useCallback(async () => {
    if (!jobPosting.trim() || !userDocument.trim()) {
      toast.error(language === 'fi' ? 'Täytä molemmat kentät' : 'Please fill both fields');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/ats-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobPosting, userDocument, documentType }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.limit_reached) {
          setError(data.error);
          toast.error(data.error);
        } else {
          throw new Error(data.error || 'Analysis failed');
        }
        return;
      }

      setResult(data.result);
      setUsage(data.usage);
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [jobPosting, userDocument, documentType, language]);

  // Score color helper
  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-green-500';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const scoreBg = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 30) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const gapColor = (severity: string) => {
    const colors: Record<string, string> = {
      none: 'text-green-500', low: 'text-green-400',
      medium: 'text-yellow-500', high: 'text-orange-500', critical: 'text-red-500',
    };
    return colors[severity] || 'text-gray-400';
  };

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">{t.signInRequired}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc]">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full mb-4">
            <Shield className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-orange-500 tracking-wider uppercase">ATS Reality Simulator</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3">
            {t.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {t.subtitle}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>{t.securityNote}</span>
          </div>
        </div>

        {/* Input Section */}
        {!result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Job Posting */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl">
                  <Briefcase className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="font-bold text-lg">{t.jobLabel}</h2>
              </div>
              <textarea
                value={jobPosting}
                onChange={(e) => setJobPosting(e.target.value)}
                placeholder={t.jobPlaceholder}
                className="w-full h-64 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                maxLength={15000}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {jobPosting.length}/15000
              </div>
            </div>

            {/* User Document */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl">
                  <FileText className="w-5 h-5 text-orange-500" />
                </div>
                <h2 className="font-bold text-lg">{t.docLabel}</h2>
              </div>

              {/* Document type selector */}
              <div className="flex gap-2 mb-4">
                {(['cv', 'cover_letter', 'both'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDocumentType(type)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      documentType === type
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {type === 'cv' ? t.cv : type === 'cover_letter' ? t.coverLetter : t.both}
                  </button>
                ))}
              </div>

              <textarea
                value={userDocument}
                onChange={(e) => setUserDocument(e.target.value)}
                placeholder={t.docPlaceholder}
                className="w-full h-56 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                maxLength={15000}
              />
              <div className="text-right text-xs text-gray-400 mt-1">
                {userDocument.length}/15000
              </div>
            </div>
          </div>
        )}

        {/* Analyze Button */}
        {!result && (
          <div className="text-center mb-8">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jobPosting.trim() || !userDocument.trim()}
              className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl font-bold text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 mx-auto"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.analyzing}
                </>
              ) : (
                <>
                  <Target className="w-5 h-5" />
                  {t.analyze}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {usage && (
              <p className="text-xs text-gray-400 mt-3">
                {usage.maxChecks - usage.checksToday} {t.checksRemaining}
                {!usage.isPro && (
                  <span className="text-orange-500 ml-2">• {t.upgradeForMore}</span>
                )}
              </p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          </div>
        )}

        {/* ═══ RESULTS ═══ */}
        {result && (
          <div className="space-y-6">

            {/* Overall Score */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">{t.score}</h2>
              <div className={`text-7xl sm:text-8xl font-black ${scoreColor(result.overallScore)}`}>
                {result.overallScore}
              </div>
              <div className="text-gray-400 text-sm mt-2">/100</div>

              <div className={`inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full text-sm font-bold ${
                result.passLikelihood === 'very_high' ? 'bg-green-500/10 text-green-500' :
                result.passLikelihood === 'high' ? 'bg-green-500/10 text-green-400' :
                result.passLikelihood === 'medium' ? 'bg-yellow-500/10 text-yellow-500' :
                result.passLikelihood === 'low' ? 'bg-orange-500/10 text-orange-500' :
                'bg-red-500/10 text-red-500'
              }`}>
                {result.passLikelihood === 'very_high' || result.passLikelihood === 'high' 
                  ? <CheckCircle2 className="w-4 h-4" /> 
                  : <AlertTriangle className="w-4 h-4" />}
                {t.passLikelihood}: {result.passLikelihood.replace('_', ' ').toUpperCase()}
              </div>

              <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-lg mx-auto text-sm">
                {result.summary}
              </p>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {[
                  { label: t.keywords, score: result.keywordScore, icon: Target },
                  { label: t.experience, score: result.experienceScore, icon: Briefcase },
                  { label: t.languageLabel, score: result.languageScore, icon: FileText },
                  { label: t.formatting, score: result.formattingScore, icon: BarChart3 },
                ].map(({ label, score, icon: Icon }) => (
                  <div key={label} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4">
                    <Icon className="w-4 h-4 text-gray-400 mx-auto mb-2" />
                    <div className={`text-2xl font-black ${scoreColor(score)}`}>{score}</div>
                    <div className="text-xs text-gray-400 mt-1">{label}</div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                      <div className={`h-1.5 rounded-full transition-all ${scoreBg(score)}`} style={{ width: `${score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {(result.recommendations.critical.length > 0 || result.recommendations.important.length > 0) && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  {t.recommendations}
                </h3>
                <div className="space-y-3">
                  {result.recommendations.critical.map((rec, i) => (
                    <div key={`c-${i}`} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-red-500 uppercase">{t.critical}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                  {result.recommendations.important.map((rec, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-yellow-600 uppercase">{t.important}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                  {result.recommendations.optional.map((rec, i) => (
                    <div key={`o-${i}`} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">{t.optional}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showDetails ? t.hideDetails : t.showDetails}
            </button>

            {showDetails && (
              <>
                {/* Keyword Matches */}
                <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                  <h3 className="font-bold text-lg mb-4">{t.keywords} ({result.matchedSkillsCount}/{result.requiredSkillsCount})</h3>
                  <div className="space-y-2">
                    {result.keywordMatches.map((kw, i) => (
                      <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                        kw.found ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                      }`}>
                        <div className="flex items-center gap-3">
                          {kw.found 
                            ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                            : <XCircle className="w-4 h-4 text-red-500" />
                          }
                          <span className="font-medium text-sm">{kw.keyword}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                            kw.importance === 'required' 
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-600' 
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                          }`}>
                            {kw.importance === 'required' ? t.required : t.preferred}
                          </span>
                        </div>
                        <span className={`text-xs font-bold ${kw.found ? 'text-green-500' : 'text-red-500'}`}>
                          {kw.found ? t.found : t.missing}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Experience Gaps */}
                {result.experienceGaps.length > 0 && (
                  <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-4">{t.experienceGaps}</h3>
                    <div className="space-y-3">
                      {result.experienceGaps.map((gap, i) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">{gap.skill}</span>
                            <span className={`text-xs font-bold ${gapColor(gap.gapSeverity)}`}>
                              {gap.gapSeverity.toUpperCase()}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>{language === 'fi' ? 'Vaaditaan' : 'Required'}: <span className="text-gray-700 dark:text-gray-300 font-medium">{gap.required}</span></div>
                            <div>{language === 'fi' ? 'Sinulla' : 'You have'}: <span className="text-gray-700 dark:text-gray-300 font-medium">{gap.userHas}</span></div>
                          </div>
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div className={`h-2 rounded-full ${scoreBg(gap.passLikelihood)}`} style={{ width: `${gap.passLikelihood}%` }} />
                            </div>
                            <div className="text-right text-[10px] text-gray-400 mt-1">{gap.passLikelihood}% pass</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* New Analysis button */}
            <div className="text-center">
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold text-sm transition-colors"
              >
                {language === 'fi' ? '← Uusi analyysi' : '← New Analysis'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}