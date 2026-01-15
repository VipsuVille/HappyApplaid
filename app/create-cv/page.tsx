"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Zap,
  Crown,
  Lock,
  Shield,
  FileEdit,
  CheckCircle,
  ArrowRight,
  Info,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import { useLanguage } from '@/context/LanguageContext';
import CVConfirmationModal from "@/components/CVConfirmationModal";

// Tuodaan domain-tiedostot
import { ACTION_COSTS, PlanType, TokenAction } from "@/lib/domain/tokens";

type CVTemplate = "technical" | "creative" | "simple";

interface CVQuestion {
  id: string;
  question: string;
  why?: string;
  priority?: 'critical' | 'important' | 'optional';
}

interface Violations {
  fabricatedSkills?: string[];
  fabricatedEducation?: string[];
  fabricatedExperience?: string[];
}

export default function CreateCVPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { language } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [useATS, setUseATS] = useState(false);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [questions, setQuestions] = useState<CVQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<Violations | null>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);

  const { 
    tokens, 
    plan_type, 
    features, 
    isLoading: tokensLoading 
  } = useTokens();

  const freeUsage = useFreeUsage();

  // Käännökset
  const t = {
    en: {
      title: "Create an",
      titleHighlight: "Impressive",
      titleEnd: "CV.",
      subtitle: "Let AI polish your experience into a diamond presentation. Choose your style and let it shine.",
      balance: "Your Balance",
      sectionStyle: "1. Choose your visual style",
      sectionOptimization: "2. Targeting (ATS)",
      styleSimple: "Casual",
      styleSimpleDesc: "Story-driven and approachable.",
      styleTechnical: "Pro",
      styleTechnicalDesc: "Straightforward and fact-focused.",
      styleCreative: "Creative",
      styleCreativeDesc: "Stand-out style that makes an impression.",
      atsToggle: "Optimize for a specific job",
      atsInfo: "Paste a job posting below. AI will analyze requirements and highlight the exact skills employers are looking for.",
      jobPostingPlaceholder: "E.g. 'We are looking for an experienced full-stack developer...'",
      summary: "Summary",
      cvGeneration: "CV Generation",
      atsAddon: "ATS Add-on",
      cost: "Cost",
      free: "FREE",
      generateNow: "Create CV Now",
      generating: "Generating...",
      premiumOnly: "Premium Only",
      freeTrialInfo: "As a free user, you can create one CV. It won't be saved permanently without a subscription.",
      processTime: "Process takes about 30 seconds. AI may ask clarifying questions.",
      noProfile: "Fill in your profile first!",
      noTokens: (cost: number) => `You need ${cost} tokens.`,
      freeUsed: "Free trial already used.",
      success: "✅ CV created successfully!",
      error: "An error occurred",
      cancel: "Cancel",
      finish: "Let's go",
      finishing: "Finalizing...",
      clarifyTitle: "Let's clarify a bit?",
      clarifySubtitle: "AI wants to make sure your CV is as convincing as possible.",
      why: "Why:",
      answerPlaceholder: "Answer here...",
    },
    fi: {
      title: "Luo",
      titleHighlight: "Vaikuttava",
      titleEnd: "CV.",
      subtitle: "Anna tekoälyn hioa kokemuksestasi timanttinen esitys. Valitse tyyli ja anna palaa.",
      balance: "Saldosi",
      sectionStyle: "1. Valitse visuaalinen linja",
      sectionOptimization: "2. Kohdistaminen (ATS)",
      styleSimple: "Rento",
      styleSimpleDesc: "Tarinallinen ja helposti lähestyttävä.",
      styleTechnical: "Pro",
      styleTechnicalDesc: "Suoraviivainen ja faktoihin keskittyvä.",
      styleCreative: "Luova",
      styleCreativeDesc: "Erottuva tyyli joka jää mieleen.",
      atsToggle: "Optimoi tietylle työpaikalle",
      atsInfo: "Liitä työpaikkailmoitus alle. AI analysoi vaatimukset ja nostaa esiin juuri ne taidot, joita työnantaja etsii.",
      jobPostingPlaceholder: "Esim. 'Haemme kokenutta full-stack kehittäjää...'",
      summary: "Yhteenveto",
      cvGeneration: "CV Generointi",
      atsAddon: "ATS-lisä",
      cost: "Kustannus",
      free: "ILMAINEN",
      generateNow: "Luo CV nyt",
      generating: "Generoidaan...",
      premiumOnly: "Vain Premium",
      freeTrialInfo: "Ilmaiskäyttäjänä voit luoda yhden CV:n. Se ei tallennu pysyvästi ilman tilausta.",
      processTime: "Prosessi kestää noin 30 sekuntia. Tekoäly saattaa kysyä tarkentavia kysymyksiä.",
      noProfile: "Täytä profiilitiedot ensin!",
      noTokens: (cost: number) => `Tarvitset ${cost} tokenia.`,
      freeUsed: "Ilmainen kokeilu on jo käytetty.",
      success: "✅ CV luotu onnistuneesti!",
      error: "Tapahtui virhe",
      cancel: "Peruuta",
      finish: "Valmista tuli",
      finishing: "Viimeistellään...",
      clarifyTitle: "Tarkennetaanko hieman?",
      clarifySubtitle: "AI haluaa varmistaa, että CV:stä tulee mahdollisimman vakuuttava.",
      why: "Miksi:",
      answerPlaceholder: "Vastaa tähän...",
    }
  }[language];

  // Dynaaminen hinnoittelu
  const costs = useMemo(() => {
    const currentTier = (plan_type as PlanType) || 'free';
    const tierCosts = ACTION_COSTS[currentTier] || {};
    
    const basic = tierCosts.cv_basic || 0;
    const ats = tierCosts.cv_ats_addon || 0;
    
    return {
      basic,
      ats,
      total: basic + (useATS ? ats : 0)
    };
  }, [plan_type, useATS]);

  // Ladataan profiili
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        setProfileLoading(true);
        const response = await fetch(`/api/user-profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error("❌ Virhe profiilin latauksessa:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    if (userLoaded && user) loadProfile();
  }, [userLoaded, user]);

  const canCreateCV = () => {
    if (plan_type === 'free') {
      return !freeUsage.hasUsedCV && !freeUsage.isLoading;
    }
    return tokens >= costs.total;
  };

  const handleGenerateCV = async (
    finalAnswers?: Record<string, string>, 
    skipConfirmation = false
  ) => {
    if (!user) return toast.error(t.error);
    if (!profileData) {
      toast.error(t.noProfile);
      router.push("/profile");
      return;
    }

    if (!canCreateCV()) {
      toast.error(plan_type === 'free' ? t.freeUsed : t.noTokens(costs.total));
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        profileData,
        cvType: selectedTemplate,
        language: language === 'en' ? 'english' : 'finnish',
        jobPosting: useATS ? jobPosting : undefined,
        enableRAG: false,
        answers: finalAnswers || answers,
        skipQuestions: false,
        skipConfirmation,
      };

      setPendingRequest(requestBody);

      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (result.needsMoreInfo) {
        setQuestions(result.questions);
        setShowQuestions(true);
      } else if (result.needsConfirmation && !skipConfirmation) {
        setPendingViolations(result.violations);
        setShowConfirmation(true);
      } else if (response.ok) {
        toast.success(t.success);
        router.push(`/edit-cv/${result.id || result.cvId}`);
      } else {
        throw new Error(result.error || t.error);
      }
    } catch (error: any) {
      toast.error(error.message || t.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveViolations = async (items: any[]) => {
    setShowConfirmation(false);
    await handleGenerateCV(answers, true);
  };

  const handleRejectViolations = async () => {
    setShowConfirmation(false);
    setPendingViolations(null);
    toast.info(language === 'en' ? 'Generation cancelled.' : 'Generointi peruutettu.');
  };

  const handleEditViolations = async () => {
    setShowConfirmation(false);
    router.push("/profile");
  };

  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
          {language === 'en' ? 'Loading tools...' : 'Ladataan työkaluja...'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc] selection:bg-orange-500/30">
      {/* Taustagradientit */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 sm:gap-8 mb-12 sm:mb-16">
          <div className="space-y-3 sm:space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                {language === 'en' ? 'AI CV Builder' : 'AI CV -generaattori'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{t.titleHighlight}</span> {t.titleEnd}
            </h1>
            <p className="text-gray-400 max-w-xl text-base sm:text-lg font-medium leading-relaxed">
              {t.subtitle}
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{t.balance}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-xl sm:text-2xl font-black text-white">{tokens.toLocaleString()}</span>
                <span className="text-xs font-bold text-orange-500">TKN</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
              <Crown className={`w-5 h-5 sm:w-6 sm:h-6 ${plan_type === 'premium' ? 'text-amber-400' : 'text-gray-600'}`} />
              <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">{plan_type}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-10">
          
          {/* VASEN: VALINNAT */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-10">
            
            {/* 1. TYYLI */}
            <section className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <FileEdit className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{t.sectionStyle}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { id: "simple", label: t.styleSimple, desc: t.styleSimpleDesc, icon: Info },
                  { id: "technical", label: t.styleTechnical, desc: t.styleTechnicalDesc, icon: Target },
                  { id: "creative", label: t.styleCreative, desc: t.styleCreativeDesc, icon: Zap },
                ].map((temp) => (
                  <button
                    key={temp.id}
                    onClick={() => setSelectedTemplate(temp.id as CVTemplate)}
                    className={`relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 group ${
                      selectedTemplate === temp.id 
                        ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.1)]' 
                        : 'border-gray-800 bg-black/20 hover:border-gray-700'
                    }`}
                  >
                    <temp.icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-3 sm:mb-4 transition-colors ${selectedTemplate === temp.id ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    <p className="font-bold text-white mb-2 text-sm sm:text-base">{temp.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{temp.desc}</p>
                    {selectedTemplate === temp.id && (
                      <CheckCircle className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 sm:w-5 sm:h-5 text-orange-500 animate-in zoom-in duration-300" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. ATS OPTIMOINTI */}
            <section className={`rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border transition-all duration-500 ${
              useATS 
                ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]' 
                : 'bg-gray-900/20 border-gray-800/50'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-colors ${
                    useATS ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${useATS ? 'text-emerald-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-white">{t.sectionOptimization}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{t.atsToggle}</p>
                  </div>
                </div>

                {plan_type !== 'free' ? (
                  <button 
                    onClick={() => setUseATS(!useATS)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${useATS ? 'bg-emerald-500' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${useATS ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{t.premiumOnly}</span>
                  </div>
                )}
              </div>

              {useATS && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl flex gap-2 sm:gap-3">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200/70 leading-relaxed">
                      {t.atsInfo}
                    </p>
                  </div>
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder={t.jobPostingPlaceholder}
                    className="w-full h-36 sm:h-48 bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 resize-none"
                  />
                </div>
              )}
            </section>
          </div>

          {/* OIKEA: YHTEENVETO (Sticky) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12 space-y-4 sm:space-y-6">
              <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 sm:mb-8">{t.summary}</h3>
                
                <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">{t.cvGeneration}</span>
                    <span className="text-white font-bold">{plan_type === 'free' ? '0' : costs.basic} TKN</span>
                  </div>
                  
                  {useATS && (
                    <div className="flex justify-between items-center text-sm animate-in slide-in-from-right-4">
                      <span className="text-emerald-400 font-medium flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" /> {t.atsAddon}
                      </span>
                      <span className="text-emerald-400 font-bold">+{costs.ats} TKN</span>
                    </div>
                  )}

                  <div className="pt-4 sm:pt-5 border-t border-gray-800 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.cost}</p>
                      <p className="text-2xl sm:text-3xl font-black text-white">
                        {plan_type === 'free' ? t.free : `${costs.total}`}
                        {plan_type !== 'free' && <span className="text-xs text-orange-500 ml-1">TKN</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateCV()}
                  disabled={isLoading || (useATS && !jobPosting.trim())}
                  className="w-full py-6 sm:py-8 bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>{t.generating}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
                      <span>{t.generateNow}</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 opacity-50 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </Button>

                {plan_type === 'free' && (
                  <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 p-3 sm:p-4 bg-orange-500/5 rounded-xl sm:rounded-2xl border border-orange-500/10">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                      {t.freeTrialInfo}
                    </p>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed font-medium">
                  {t.processTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISÄKYSYMYKSET MODAL */}
      {showQuestions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isLoading && setShowQuestions(false)} />
          <div className="relative bg-[#0d1117] border border-gray-800 w-full max-w-2xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent" />
            
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 flex items-center gap-3">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
              {t.clarifyTitle}
            </h3>
            <p className="text-gray-400 text-sm mb-8 sm:mb-10">{t.clarifySubtitle}</p>

            <div className="space-y-6 sm:space-y-8 max-h-[50vh] overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
              {questions.map((q) => (
                <div key={q.id} className="space-y-3 sm:space-y-4 group">
                  <label className="text-sm font-bold text-gray-200 block transition-colors group-focus-within:text-orange-400">
                    {q.question}
                  </label>
                  {q.why && (
                    <div className="flex gap-2 items-start text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      <span className="text-orange-500/50">{t.why}</span>
                      <span>{q.why}</span>
                    </div>
                  )}
                  <textarea
                    className="w-full bg-black/40 border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all min-h-[100px] resize-none"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder={t.answerPlaceholder}
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 sm:gap-4 mt-8 sm:mt-10">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl sm:rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 h-12 sm:h-14 font-bold text-sm sm:text-base"
                onClick={() => setShowQuestions(false)}
                disabled={isLoading}
              >
                {t.cancel}
              </Button>
              <Button 
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-xl sm:rounded-2xl h-12 sm:h-14 font-black text-sm sm:text-base"
                onClick={() => handleGenerateCV(answers)}
                disabled={isLoading}
              >
                {isLoading ? t.finishing : t.finish}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {showConfirmation && pendingViolations && (
        <CVConfirmationModal
          violations={pendingViolations}
          onApprove={handleApproveViolations}
          onReject={handleRejectViolations}
          onEdit={handleEditViolations}
        />
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2937;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #374151;
        }
      `}</style>
    </div>
  );
}