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
  ChevronRight,
  Shield,
  FileEdit,
  CheckCircle,
  ArrowRight,
  Info,
  AlertCircle,
  Loader2,
  Mail,
  Briefcase,
} from "lucide-react";

import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import { useLanguage } from '@/context/LanguageContext';

// Tuodaan domain-tiedostot
import { ACTION_COSTS, PlanType, TokenAction } from "@/lib/domain/tokens";

type LetterType = "job_specific" | "general";
type LetterVersion = "v1" | "v2"; // v1 = basic, v2 = ATS

export default function CreateCoverLetterPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const { language } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [letterType, setLetterType] = useState<LetterType>("job_specific");
  const [letterVersion, setLetterVersion] = useState<LetterVersion>("v1");
  const [jobPosting, setJobPosting] = useState("");
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

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
      titleEnd: "Cover Letter.",
      subtitle: "Let AI craft a compelling introduction from your experience. Choose your approach and let it shine.",
      balance: "Your Balance",
      sectionStyle: "1. Choose your approach",
      sectionOptimization: "2. ATS Optimization (Premium)",
      sectionType: "3. Letter type",
      jobSpecific: "Job-Specific",
      jobSpecificDesc: "Tailored for a particular job posting",
      general: "General",
      generalDesc: "Universal presentation letter",
      styleSimple: "Simple",
      styleSimpleDesc: "Straightforward and professional",
      styleTechnical: "Technical",
      styleTechnicalDesc: "Detail-oriented and precise",
      styleCreative: "Creative",
      styleCreativeDesc: "Stand-out style that makes an impression",
      atsToggle: "Optimize for Applicant Tracking Systems",
      atsInfo: "Paste a job posting below. AI will analyze requirements and highlight the exact skills employers are looking for.",
      jobPostingPlaceholder: "E.g. 'We are looking for an experienced full-stack developer...'",
      summary: "Summary",
      letterGeneration: "Letter Generation",
      atsAddon: "ATS Add-on",
      cost: "Cost",
      free: "FREE",
      generateNow: "Create Letter Now",
      generating: "Generating...",
      premiumOnly: "Premium Only",
      freeTrialInfo: "As a free user, you can create one cover letter. It won't be saved permanently without a subscription.",
      processTime: "Process takes about 30 seconds.",
      noProfile: "Fill in your profile first!",
      noTokens: (cost: number) => `You need ${cost} tokens.`,
      freeUsed: "Free trial already used.",
      success: "✅ Cover letter created successfully!",
      error: "An error occurred",
      jobPostingRequired: "Job posting text is required for job-specific letters.",
    },
    fi: {
      title: "Luo",
      titleHighlight: "Vaikuttava",
      titleEnd: "Hakukirje.",
      subtitle: "Anna tekoälyn luoda vakuuttava esittely kokemuksestasi. Valitse lähestymistapa ja anna palaa.",
      balance: "Saldosi",
      sectionStyle: "1. Valitse lähestymistapa",
      sectionOptimization: "2. ATS-optimointi (Premium)",
      sectionType: "3. Kirjeen tyyppi",
      jobSpecific: "Työpaikkaan kohdistettu",
      jobSpecificDesc: "Räätälöity tietylle työpaikkailmoitukselle",
      general: "Yleinen",
      generalDesc: "Yleispätevä esittelykirje",
      styleSimple: "Yksinkertainen",
      styleSimpleDesc: "Suoraviivainen ja ammattimainen",
      styleTechnical: "Tekninen",
      styleTechnicalDesc: "Yksityiskohtainen ja tarkka",
      styleCreative: "Luova",
      styleCreativeDesc: "Erottuva tyyli joka jää mieleen",
      atsToggle: "Optimoi hakujärjestelmille (ATS)",
      atsInfo: "Liitä työpaikkailmoitus alle. AI analysoi vaatimukset ja nostaa esiin juuri ne taidot, joita työnantaja etsii.",
      jobPostingPlaceholder: "Esim. 'Haemme kokenutta full-stack kehittäjää...'",
      summary: "Yhteenveto",
      letterGeneration: "Hakukirjeen generointi",
      atsAddon: "ATS-lisä",
      cost: "Kustannus",
      free: "ILMAINEN",
      generateNow: "Luo hakukirje nyt",
      generating: "Generoidaan...",
      premiumOnly: "Vain Premium",
      freeTrialInfo: "Ilmaiskäyttäjänä voit luoda yhden hakukirjeen. Se ei tallennu pysyvästi ilman tilausta.",
      processTime: "Prosessi kestää noin 30 sekuntia.",
      noProfile: "Täytä profiilitiedot ensin!",
      noTokens: (cost: number) => `Tarvitset ${cost} tokenia.`,
      freeUsed: "Ilmainen kokeilu on jo käytetty.",
      success: "✅ Hakukirje luotu onnistuneesti!",
      error: "Tapahtui virhe",
      jobPostingRequired: "Työpaikkailmoituksen teksti vaaditaan työpaikkaan kohdistettuun kirjeeseen.",
    }
  }[language];

  // Dynaaminen hinnoittelu
  const costs = useMemo(() => {
    const currentTier = (plan_type as PlanType) || 'free';
    const tierCosts = ACTION_COSTS[currentTier] || {};
    
    let action: TokenAction;
    
    if (letterType === 'general') {
      action = 'cover_letter_general';
    } else {
      // job_specific
      if (letterVersion === 'v2') {
        action = 'cover_letter_v2'; // ATS-optimoitu (premium only)
      } else {
        action = 'cover_letter_v1'; // Perus job-specific
      }
    }
    
    const cost = tierCosts[action] || 0;
    
    return {
      base: cost,
      total: cost
    };
  }, [plan_type, letterType, letterVersion]);

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

  const canCreateLetter = () => {
    if (plan_type === 'free') {
      return !freeUsage.hasUsedCoverLetter && !freeUsage.isLoading;
    }
    return tokens >= costs.total;
  };

  const handleGenerateLetter = async () => {
    if (!user) return toast.error(t.error);
    if (!profileData) {
      toast.error(t.noProfile);
      router.push("/profile");
      return;
    }

    if (!canCreateLetter()) {
      toast.error(plan_type === 'free' ? t.freeUsed : t.noTokens(costs.total));
      return;
    }

    // Validointi: job_specific vaatii jobPostingin
    if (letterType === 'job_specific' && !jobPosting.trim()) {
      toast.error(t.jobPostingRequired);
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        profileData,
        letterType,
        letterVersion: letterType === 'job_specific' ? letterVersion : 'v1',
        jobPosting: letterType === 'job_specific' ? jobPosting : undefined,
        language: language === 'en' ? 'english' : 'finnish',
      };

      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success(t.success);
        router.push(`/edit-cover-letter/${result.id || result.letterId}`);
      } else {
        throw new Error(result.error || t.error);
      }
    } catch (error: any) {
      toast.error(error.message || t.error);
    } finally {
      setIsLoading(false);
    }
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

  // Tarkista onko ATS käytettävissä (vain premium)
  const canUseATS = plan_type === 'premium' && letterType === 'job_specific';

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
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">
                {language === 'en' ? 'AI Letter Builder' : 'AI Hakukirjegeneraattori'}
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
            
            {/* 1. TYYPPI */}
            <section className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-orange-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{t.sectionType}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { id: "job_specific", label: t.jobSpecific, desc: t.jobSpecificDesc, icon: Target },
                  { id: "general", label: t.general, desc: t.generalDesc, icon: Mail },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setLetterType(type.id as LetterType)}
                    className={`relative p-5 sm:p-6 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 group ${
                      letterType === type.id 
                        ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.1)]' 
                        : 'border-gray-800 bg-black/20 hover:border-gray-700'
                    }`}
                  >
                    <type.icon className={`w-5 h-5 sm:w-6 sm:h-6 mb-3 sm:mb-4 transition-colors ${letterType === type.id ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    <p className="font-bold text-white mb-2 text-sm sm:text-base">{type.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{type.desc}</p>
                    {letterType === type.id && (
                      <CheckCircle className="absolute top-3 right-3 sm:top-4 sm:right-4 w-4 h-4 sm:w-5 sm:h-5 text-orange-500 animate-in zoom-in duration-300" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. ATS OPTIMOINTI (vain job_specific + premium) */}
            {letterType === 'job_specific' && (
              <section className={`rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10 border transition-all duration-500 ${
                letterVersion === 'v2' && canUseATS
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]' 
                  : 'bg-gray-900/20 border-gray-800/50'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-0 mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border transition-colors ${
                      letterVersion === 'v2' && canUseATS ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'
                    }`}>
                      <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${letterVersion === 'v2' && canUseATS ? 'text-emerald-400' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold text-white">{t.sectionOptimization}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{t.atsToggle}</p>
                    </div>
                  </div>

                  {canUseATS ? (
                    <button 
                      onClick={() => setLetterVersion(letterVersion === 'v2' ? 'v1' : 'v2')}
                      className={`relative w-14 h-7 rounded-full transition-colors duration-300 flex-shrink-0 ${letterVersion === 'v2' ? 'bg-emerald-500' : 'bg-gray-800'}`}
                    >
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${letterVersion === 'v2' ? 'translate-x-7' : 'translate-x-0'}`} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
                      <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">{t.premiumOnly}</span>
                    </div>
                  )}
                </div>

                {/* Työpaikkailmoitus (aina näkyvissä job_specific:ssä) */}
                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl sm:rounded-2xl flex gap-2 sm:gap-3">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-200/70 leading-relaxed">
                      {t.atsInfo}
                    </p>
                  </div>
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder={t.jobPostingPlaceholder}
                    className="w-full h-36 sm:h-48 bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 transition-all placeholder:text-gray-700 resize-none"
                  />
                </div>
              </section>
            )}
          </div>

          {/* OIKEA: YHTEENVETO (Sticky) */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12 space-y-4 sm:space-y-6">
              <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 overflow-hidden relative">
                {/* Koriste */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 sm:mb-8">{t.summary}</h3>
                
                <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">{t.letterGeneration}</span>
                    <span className="text-white font-bold">{plan_type === 'free' ? '0' : costs.base} TKN</span>
                  </div>

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
                  onClick={handleGenerateLetter}
                  disabled={isLoading || (letterType === 'job_specific' && !jobPosting.trim())}
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

              {/* LISÄINFO */}
              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed font-medium">
                  {t.processTime}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}