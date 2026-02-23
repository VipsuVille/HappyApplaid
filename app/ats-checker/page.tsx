// app/ats-checker/page.tsx — v3: ATS Usage Detection + Human Reading Mode
'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useLanguage } from '@/context/LanguageContext';
import {
  Shield, Target, AlertTriangle, CheckCircle2, XCircle,
  Loader2, FileText, Briefcase, BarChart3, ArrowRight,
  Lock, Zap, ChevronDown, ChevronUp, Info, Star,
  Car, Globe, User, Bot, Eye, EyeOff, Lightbulb,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoleType = 'tech' | 'sales' | 'healthcare' | 'service' | 'admin' | 'logistics' | 'education' | 'marketing' | 'finance' | 'general';
type ATSLikelihood = 'very_high' | 'high' | 'low' | 'very_low';

interface ATSUsageResult {
  likelihood: ATSLikelihood;
  confidence: number;
  usesATS: boolean;
  signals: { positive: string[]; negative: string[] };
  recruitmentMode: 'ats' | 'human' | 'mixed';
  explanation: string;
  humanReadingTips: string[];
  atsTips: string[];
}

interface HardRequirement {
  requirement: string;
  found: boolean;
  critical: boolean;
}

interface CompetencyTheme {
  theme: string;
  description: string;
  keywords: string[];
  found: boolean;
  matchedKeywords: string[];
  weight: number;
}

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
  roleType: RoleType;
  themeScore: number;
  atsUsage: ATSUsageResult;
  hardRequirements: HardRequirement[];
  competencyThemes: CompetencyTheme[];
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

// ─── Role labels & icons ──────────────────────────────────────────────────────

const ROLE_LABELS: Record<RoleType, { fi: string; en: string; icon: string; color: string }> = {
  tech:       { fi: 'Tekninen rooli',     en: 'Tech role',         icon: '💻', color: 'blue' },
  sales:      { fi: 'Myyntirooli',        en: 'Sales role',        icon: '🤝', color: 'green' },
  healthcare: { fi: 'Terveydenhuolto',   en: 'Healthcare',        icon: '🏥', color: 'red' },
  service:    { fi: 'Asiakaspalvelu',     en: 'Customer service',  icon: '💬', color: 'purple' },
  admin:      { fi: 'Hallinto/toimisto',  en: 'Admin/Office',      icon: '📋', color: 'gray' },
  logistics:  { fi: 'Logistiikka',        en: 'Logistics',         icon: '📦', color: 'yellow' },
  education:  { fi: 'Opetus/koulutus',   en: 'Education',         icon: '📚', color: 'indigo' },
  marketing:  { fi: 'Markkinointi',       en: 'Marketing',         icon: '📣', color: 'pink' },
  finance:    { fi: 'Talous/rahoitus',    en: 'Finance',           icon: '💰', color: 'emerald' },
  general:    { fi: 'Yleinen rooli',      en: 'General role',      icon: '🔍', color: 'gray' },
};

// ─── ATS Usage Banner Component ───────────────────────────────────────────────

function ATSUsageBanner({ atsUsage, isFi }: { atsUsage: ATSUsageResult; isFi: boolean }) {
  const [showSignals, setShowSignals] = useState(false);

  const isHuman = !atsUsage.usesATS;
  const isMixed = atsUsage.recruitmentMode === 'mixed';

  const config = {
    human: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800/50',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
      iconColor: 'text-blue-600 dark:text-blue-400',
      badge: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      badgeText: isFi ? '👤 Ihminen lukee' : '👤 Human reads',
      title: isFi ? 'Ihminen lukee hakemuksesi suoraan' : 'A human reads your application directly',
      titleColor: 'text-blue-800 dark:text-blue-200',
      descColor: 'text-blue-700 dark:text-blue-300',
      tipsTitle: isFi ? '💡 Vinkit tähän hakuun' : '💡 Tips for this application',
      tips: atsUsage.humanReadingTips,
    },
    mixed: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800/50',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
      iconColor: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300',
      badgeText: isFi ? '🔀 Sekahaku' : '🔀 Mixed process',
      title: isFi ? 'Sekä ATS että ihminen osallistuvat päätökseen' : 'Both ATS and human are involved',
      titleColor: 'text-amber-800 dark:text-amber-200',
      descColor: 'text-amber-700 dark:text-amber-300',
      tipsTitle: isFi ? '💡 Tasapainota molemmat' : '💡 Balance both approaches',
      tips: [...atsUsage.humanReadingTips.slice(0, 2), ...atsUsage.atsTips.slice(0, 2)],
    },
    ats: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800/50',
      iconBg: 'bg-purple-100 dark:bg-purple-900/50',
      iconColor: 'text-purple-600 dark:text-purple-400',
      badge: 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300',
      badgeText: isFi ? '🤖 ATS suodattaa' : '🤖 ATS filters',
      title: isFi ? 'ATS-ohjelmisto suodattaa hakemuksia' : 'ATS software filters applications',
      titleColor: 'text-purple-800 dark:text-purple-200',
      descColor: 'text-purple-700 dark:text-purple-300',
      tipsTitle: isFi ? '💡 ATS-optimointivinkit' : '💡 ATS optimization tips',
      tips: atsUsage.atsTips,
    },
  };

  const mode = isHuman ? 'human' : isMixed ? 'mixed' : 'ats';
  const c = config[mode];

  return (
    <div className={`rounded-2xl border p-6 ${c.bg} ${c.border}`}>

      {/* Header row */}
      <div className="flex items-start gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.iconBg}`}>
          {isHuman ? <User className={`w-6 h-6 ${c.iconColor}`} /> :
           isMixed ? <Eye className={`w-6 h-6 ${c.iconColor}`} /> :
           <Bot className={`w-6 h-6 ${c.iconColor}`} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${c.badge}`}>
              {c.badgeText}
            </span>
            <span className="text-xs text-gray-400">
              {isFi ? `Varmuus: ${atsUsage.confidence}%` : `Confidence: ${atsUsage.confidence}%`}
            </span>
          </div>
          <h3 className={`font-black text-lg leading-tight ${c.titleColor}`}>{c.title}</h3>
          <p className={`text-sm mt-1 leading-relaxed ${c.descColor}`}>{atsUsage.explanation}</p>
        </div>
      </div>

      {/* Tips */}
      <div className={`mt-5 pt-4 border-t ${c.border}`}>
        <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${c.descColor}`}>{c.tipsTitle}</p>
        <ul className="space-y-2">
          {c.tips.map((tip, i) => (
            <li key={i} className={`flex items-start gap-2 text-sm ${c.descColor}`}>
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 opacity-70" />
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Detection signals — collapsible */}
      {(atsUsage.signals.positive.length > 0 || atsUsage.signals.negative.length > 0) && (
        <div className="mt-4">
          <button
            onClick={() => setShowSignals(!showSignals)}
            className={`flex items-center gap-1.5 text-xs font-semibold ${c.descColor} opacity-70 hover:opacity-100 transition-opacity`}
          >
            {showSignals ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {isFi ? 'Näytä tunnistussignaalit' : 'Show detection signals'}
          </button>

          {showSignals && (
            <div className={`mt-3 pt-3 border-t ${c.border} grid sm:grid-cols-2 gap-4`}>
              {atsUsage.signals.positive.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500 mb-2">
                    {isFi ? '🤖 ATS-signaalit' : '🤖 ATS signals'}
                  </p>
                  <ul className="space-y-1">
                    {atsUsage.signals.positive.map((s, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-purple-400 mt-0.5">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {atsUsage.signals.negative.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-2">
                    {isFi ? '👤 Ihmislukusignaalit' : '👤 Human-read signals'}
                  </p>
                  <ul className="space-y-1">
                    {atsUsage.signals.negative.map((s, i) => (
                      <li key={i} className="text-xs text-gray-500 flex items-start gap-1.5">
                        <span className="text-blue-400 mt-0.5">•</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ───────────────────────────────────────────────────────

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

  const isFi = language === 'fi';

  // ─── Score helpers ───────────────────────────────────────────────────────────

  const scoreColor = (s: number) =>
    s >= 75 ? 'text-green-500' : s >= 50 ? 'text-yellow-500' : s >= 30 ? 'text-orange-500' : 'text-red-500';
  const scoreBg = (s: number) =>
    s >= 75 ? 'bg-green-500' : s >= 50 ? 'bg-yellow-500' : s >= 30 ? 'bg-orange-500' : 'bg-red-500';
  const gapColor = (severity: string) => ({
    none: 'text-green-500', low: 'text-green-400',
    medium: 'text-yellow-500', high: 'text-orange-500', critical: 'text-red-500',
  }[severity] || 'text-gray-400');

  // ─── Analyze ─────────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!jobPosting.trim() || !userDocument.trim()) {
      toast.error(isFi ? 'Täytä molemmat kentät' : 'Please fill both fields');
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
        setError(data.error);
        toast.error(data.error);
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
  }, [jobPosting, userDocument, documentType, isFi]);

  // ─── Sign-in gate ────────────────────────────────────────────────────────────

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Lock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">
            {isFi ? 'Kirjaudu sisään käyttääksesi ATS Checkeria' : 'Sign in to use ATS Checker'}
          </h1>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc]">

      {/* Background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Header ── */}
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 px-4 py-2 rounded-full mb-4">
            <Shield className="w-4 h-4 text-orange-500" />
            <span className="text-xs font-bold text-orange-500 tracking-wider uppercase">ATS Reality Simulator v2</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black mb-3">
            {isFi ? 'ATS Score Checker' : 'ATS Score Checker'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {isFi
              ? 'Analysoi hakemuksesi roolityyppikohtaisesti — myynti, IT, terveydenhuolto ja muut'
              : 'Role-aware analysis — tech, sales, healthcare, and more'}
          </p>
          <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-400">
            <Lock className="w-3 h-3" />
            <span>{isFi ? 'Tietosi eivät tallennu — vain pisteet.' : 'Your data is not stored — only scores are saved.'}</span>
          </div>
        </div>

        {/* ── Input form ── */}
        {!result && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              {/* Job posting */}
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-xl">
                    <Briefcase className="w-5 h-5 text-blue-500" />
                  </div>
                  <h2 className="font-bold text-lg">{isFi ? 'Työpaikkailmoitus' : 'Job Posting'}</h2>
                </div>
                <textarea
                  value={jobPosting}
                  onChange={(e) => setJobPosting(e.target.value)}
                  placeholder={isFi ? 'Liitä työpaikkailmoitus tähän...' : 'Paste the job posting here...'}
                  className="w-full h-64 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  maxLength={15000}
                />
                <div className="text-right text-xs text-gray-400 mt-1">{jobPosting.length}/15000</div>
              </div>

              {/* User document */}
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl">
                    <FileText className="w-5 h-5 text-orange-500" />
                  </div>
                  <h2 className="font-bold text-lg">{isFi ? 'Oma CV / Hakukirje' : 'Your CV / Cover Letter'}</h2>
                </div>
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
                      {type === 'cv' ? 'CV' : type === 'cover_letter' ? (isFi ? 'Hakukirje' : 'Cover Letter') : (isFi ? 'Molemmat' : 'Both')}
                    </button>
                  ))}
                </div>
                <textarea
                  value={userDocument}
                  onChange={(e) => setUserDocument(e.target.value)}
                  placeholder={isFi ? 'Liitä oma CV:si tai hakukirjeesi tähän...' : 'Paste your CV or cover letter here...'}
                  className="w-full h-56 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-4 text-sm resize-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all"
                  maxLength={15000}
                />
                <div className="text-right text-xs text-gray-400 mt-1">{userDocument.length}/15000</div>
              </div>
            </div>

            {/* Analyze button */}
            <div className="text-center mb-8">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !jobPosting.trim() || !userDocument.trim()}
                className="px-8 py-4 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-2xl font-bold text-lg shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-3 mx-auto"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" />{isFi ? 'Analysoidaan...' : 'Analyzing...'}</>
                ) : (
                  <><Target className="w-5 h-5" />{isFi ? 'Analysoi ATS-yhteensopivuus' : 'Analyze ATS Compatibility'}<ArrowRight className="w-5 h-5" /></>
                )}
              </button>
              {usage && (
                <p className="text-xs text-gray-400 mt-3">
                  {usage.maxChecks - usage.checksToday} {isFi ? 'tarkistusta jäljellä tänään' : 'checks remaining today'}
                  {!usage.isPro && <span className="text-orange-500 ml-2">• {isFi ? 'Päivitä Pro:ksi saadaksesi lisää' : 'Upgrade to Pro for more'}</span>}
                </p>
              )}
            </div>
          </>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 mb-8 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-red-600 dark:text-red-400 font-semibold">{error}</p>
          </div>
        )}

        {/* ══════════════ RESULTS ══════════════ */}
        {result && (
          <div className="space-y-6">

            {/* ── Role type badge ── */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 px-5 py-2.5 rounded-full shadow-sm">
                <span className="text-xl">{ROLE_LABELS[result.roleType]?.icon}</span>
                <span className="font-bold text-sm">
                  {isFi
                    ? `Tunnistettu: ${ROLE_LABELS[result.roleType]?.fi || result.roleType}`
                    : `Detected: ${ROLE_LABELS[result.roleType]?.en || result.roleType}`}
                </span>
                <span className="text-xs text-gray-400">
                  {result.roleType === 'tech'
                    ? (isFi ? '• Avainsanapainotteinen analyysi' : '• Keyword-weighted analysis')
                    : (isFi ? '• Osaamisteemalinen analyysi' : '• Competency-theme analysis')}
                </span>
              </div>
            </div>

            {/* ── ATS Usage Banner — most important context ── */}
            <ATSUsageBanner atsUsage={result.atsUsage} isFi={isFi} />

            {/* ── Overall score ── */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-8 text-center">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">
                {result.atsUsage.usesATS
                  ? (isFi ? 'ATS-yhteensopivuus' : 'ATS Compatibility Score')
                  : (isFi ? 'Hakemuksen sopivuus' : 'Application Fit Score')}
              </h2>
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
                {isFi
                  ? (result.atsUsage.usesATS ? 'ATS-läpimenon todennäköisyys' : 'Soveltuvuuden arvio')
                  : (result.atsUsage.usesATS ? 'ATS pass likelihood' : 'Application fit estimate')}: {result.passLikelihood.replace('_', ' ').toUpperCase()}
              </div>

              <p className="text-gray-500 dark:text-gray-400 mt-4 max-w-lg mx-auto text-sm">
                {result.summary}
              </p>

              {/* Sub-scores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
                {[
                  {
                    label: result.roleType === 'tech' ? (isFi ? 'Avainsanat' : 'Keywords') : (isFi ? 'Osaamisteemat' : 'Competencies'),
                    score: result.roleType === 'tech' ? result.keywordScore : result.themeScore,
                    icon: Target,
                  },
                  { label: isFi ? 'Kokemus' : 'Experience', score: result.experienceScore, icon: Briefcase },
                  { label: isFi ? 'Kieli' : 'Language', score: result.languageScore, icon: Globe },
                  { label: isFi ? 'Rakenne' : 'Formatting', score: result.formattingScore, icon: BarChart3 },
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

            {/* ── Hard requirements ── */}
            {result.hardRequirements.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Car className="w-5 h-5 text-red-500" />
                  {isFi ? 'Pakolliset vaatimukset' : 'Hard Requirements'}
                </h3>
                <div className="space-y-2">
                  {result.hardRequirements.map((req, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                      req.found
                        ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30'
                        : req.critical
                          ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30'
                          : 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30'
                    }`}>
                      <div className="flex items-center gap-3">
                        {req.found
                          ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                          : req.critical
                            ? <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                            : <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />}
                        <div>
                          <p className="text-sm font-medium">{req.requirement}</p>
                          {req.critical && !req.found && (
                            <p className="text-xs text-red-500 mt-0.5">
                              {isFi ? '⚠️ Kriittinen — voi johtaa hylkäykseen' : '⚠️ Critical — may cause auto-rejection'}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${req.found ? 'text-green-500' : req.critical ? 'text-red-500' : 'text-yellow-600'}`}>
                        {req.found ? (isFi ? 'Löytyi ✓' : 'Found ✓') : (isFi ? 'Puuttuu' : 'Missing')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Competency themes ── */}
            {result.competencyThemes.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                  <Star className="w-5 h-5 text-orange-500" />
                  {isFi ? 'Osaamisteemat' : 'Competency Themes'}
                  <span className="text-sm font-normal text-gray-400 ml-1">
                    ({result.competencyThemes.filter((t) => t.found).length}/{result.competencyThemes.length} {isFi ? 'löytyi' : 'found'})
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                  {result.roleType === 'tech'
                    ? (isFi ? 'Teknisessä roolissa käytetään myös avainsana-analyysiä (alla).' : 'Tech roles also use keyword analysis (see below).')
                    : (isFi ? 'Tässä roolissa ATS analysoi kokonaisvaltaisia osaamisteemoja yksittäisten avainsanojen sijaan.' : 'For this role type, ATS analyses competency themes rather than individual keywords.')}
                </p>
                <div className="space-y-3">
                  {result.competencyThemes.map((theme, i) => (
                    <div key={i} className={`p-4 rounded-xl border ${
                      theme.found
                        ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800/30'
                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                    }`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {theme.found
                            ? <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                            : <XCircle className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />}
                          <div>
                            <p className="font-semibold text-sm">{theme.theme}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{theme.description}</p>
                            {theme.found && theme.matchedKeywords.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {theme.matchedKeywords.map((kw, j) => (
                                  <span key={j} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] px-2 py-0.5 rounded-full font-medium">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                            {!theme.found && (
                              <p className="text-xs text-gray-400 mt-1">
                                {isFi ? 'Esimerkkisanoja: ' : 'Example terms: '}
                                {theme.keywords.slice(0, 5).join(', ')}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {Array.from({ length: theme.weight }).map((_, j) => (
                            <div key={j} className={`w-2 h-2 rounded-full ${theme.found ? 'bg-green-400' : 'bg-gray-300 dark:bg-gray-600'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Recommendations ── */}
            {(result.recommendations.critical.length > 0 || result.recommendations.important.length > 0 || result.recommendations.optional.length > 0) && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-orange-500" />
                  {isFi ? 'Suositukset' : 'Recommendations'}
                </h3>
                <div className="space-y-3">
                  {result.recommendations.critical.map((rec, i) => (
                    <div key={`c-${i}`} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-red-500 uppercase">{isFi ? 'Kriittinen' : 'Critical'}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                  {result.recommendations.important.map((rec, i) => (
                    <div key={`i-${i}`} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 rounded-xl">
                      <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-yellow-600 uppercase">{isFi ? 'Tärkeä' : 'Important'}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                  {result.recommendations.optional.map((rec, i) => (
                    <div key={`o-${i}`} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30 rounded-xl">
                      <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">{isFi ? 'Valinnainen' : 'Optional'}</span>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{rec}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Details toggle ── */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors"
            >
              {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              {showDetails ? (isFi ? 'Piilota yksityiskohdat' : 'Hide details') : (isFi ? 'Näytä yksityiskohdat' : 'Show details')}
            </button>

            {showDetails && (
              <>
                {/* Keyword matches — mainly relevant for tech roles */}
                {result.keywordMatches.length > 0 && (
                  <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-1">{isFi ? 'Avainsanat' : 'Keywords'}</h3>
                    {result.roleType !== 'tech' && (
                      <p className="text-xs text-gray-400 mb-4">
                        {isFi
                          ? 'Avainsanavertailu on vähemmän relevantti tässä roolityypissä — katso osaamisteemat yllä.'
                          : 'Keyword matching is less relevant for this role type — see competency themes above.'}
                      </p>
                    )}
                    <div className="space-y-2">
                      {result.keywordMatches.map((kw, i) => (
                        <div key={i} className={`flex items-center justify-between p-3 rounded-xl ${
                          kw.found ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
                        }`}>
                          <div className="flex items-center gap-3">
                            {kw.found ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="font-medium text-sm">{kw.keyword}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                              kw.importance === 'required'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                              {kw.importance === 'required' ? (isFi ? 'Vaadittu' : 'Required') : (isFi ? 'Toivottu' : 'Preferred')}
                            </span>
                          </div>
                          <span className={`text-xs font-bold ${kw.found ? 'text-green-500' : 'text-red-500'}`}>
                            {kw.found ? (isFi ? 'Löytyi' : 'Found') : (isFi ? 'Puuttuu' : 'Missing')}
                          </span>
                        </div>
                      ))}
                      {result.keywordMatches.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                          {isFi
                            ? 'Ei teknisiä avainsanoja — katso osaamisteemat yllä.'
                            : 'No technical keywords — see competency themes above.'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Experience gaps */}
                {result.experienceGaps.length > 0 && (
                  <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
                    <h3 className="font-bold text-lg mb-4">{isFi ? 'Kokemusaukot' : 'Experience Gaps'}</h3>
                    <div className="space-y-3">
                      {result.experienceGaps.map((gap, i) => (
                        <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">{gap.skill}</span>
                            <span className={`text-xs font-bold ${gapColor(gap.gapSeverity)}`}>{gap.gapSeverity.toUpperCase()}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
                            <div>{isFi ? 'Vaaditaan' : 'Required'}: <span className="text-gray-700 dark:text-gray-300 font-medium">{gap.required}</span></div>
                            <div>{isFi ? 'Sinulla' : 'You have'}: <span className="text-gray-700 dark:text-gray-300 font-medium">{gap.userHas}</span></div>
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

            {/* New analysis button */}
            <div className="text-center pb-8">
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold text-sm transition-colors"
              >
                {isFi ? '← Uusi analyysi' : '← New Analysis'}
              </button>
              {usage && !usage.isPro && (
                <p className="text-xs text-gray-400 mt-3">
                  {usage.maxChecks - usage.checksToday} {isFi ? 'tarkistusta jäljellä' : 'checks remaining'} •{' '}
                  <a href="/pricing" className="text-orange-500 hover:underline">
                    {isFi ? 'Päivitä Pro:ksi' : 'Upgrade to Pro'}
                  </a>
                </p>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}