// app/create-cover-letter/page.tsx - KORJATTU VERSIO

"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles,
  Target,
  Mail,
  Crown,
  Lock,
  Shield,
  CheckCircle,
  ArrowRight,
  Info,
  AlertCircle,
  Loader2,
  Briefcase,
  Globe,      // ← UUSI: Kielivalinta-ikoni
  Palette,    // ← UUSI: Tyylivalinta-ikoni
} from "lucide-react";

import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import { useLanguage } from '@/context/LanguageContext';
import { ACTION_COSTS, PlanType, TokenAction } from "@/lib/domain/tokens";
import CVConfirmationModal from "@/components/CVConfirmationModal";

type LetterType = "job_specific" | "general";
type LetterVersion = "v1" | "v2";
type LetterLanguage = "finnish" | "english" | "swedish"; // ← UUSI
type LetterStyle = "formal" | "casual"; // ← UUSI

export default function CreateCoverLetterPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { language } = useLanguage();
  
  const [isLoading, setIsLoading] = useState(false);
  const [letterType, setLetterType] = useState<LetterType>("job_specific");
  const [letterVersion, setLetterVersion] = useState<LetterVersion>("v1");
  const [jobPosting, setJobPosting] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetRole, setTargetRole] = useState("");
  
  // ✅ UUDET STATE:t
  const [letterLanguage, setLetterLanguage] = useState<LetterLanguage>("finnish");
  const [letterStyle, setLetterStyle] = useState<LetterStyle>("formal");
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // --- GUARDIAN STATE ---
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<any>(null);

  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
  const freeUsage = useFreeUsage();

  const isFinnish = language === 'fi' || (language as string) === 'finnish';

  // ✅ PÄIVITETYT TRANSLATIONS
  const t = {
    en: {
      title: "Create an",
      titleHighlight: "Impressive",
      titleEnd: "Cover Letter.",
      subtitle: "Let AI craft a compelling introduction.",
      balance: "Your Balance",
      sectionType: "1. Letter type",
      sectionLanguage: "2. Language & Style", // ← UUSI
      sectionOptimization: "3. ATS Optimization (Premium)", // ← Numero muuttui
      jobSpecific: "Job-Specific",
      jobSpecificDesc: "Tailored for a job posting",
      general: "General Introduction",
      generalDesc: "Universal professional intro",
      atsToggle: "Optimize for ATS",
      atsInfo: "Paste job posting. AI analyzes key skills.",
      jobPostingPlaceholder: "Job posting text...",
      targetIndustryPlaceholder: "e.g. Technology...",
      targetRolePlaceholder: "e.g. Software Engineer...",
      // ✅ UUDET KÄÄNNÖKSET
      languageLabel: "Letter Language",
      languageHelp: "Which language should the letter be written in?",
      styleLabel: "Writing Style",
      styleHelp: "Choose the tone of your letter",
      styleFormal: "Formal",
      styleFormalDesc: "Professional and polished",
      styleCasual: "Casual",
      styleCasualDesc: "Conversational but credible",
      summary: "Summary",
      letterGeneration: "Letter Generation",
      cost: "Cost",
      free: "FREE",
      generateNow: "Create Letter Now",
      generating: "Generating...",
      premiumOnly: "Premium Only",
      freeTrialInfo: "Free users can create one cover letter.",
      processTime: "Takes ~30 seconds.",
      noProfile: "Fill profile first!",
      noTokens: (cost: number) => `Need ${cost} tokens.`,
      freeUsed: "Free trial used.",
      success: "✅ Cover letter created!",
      error: "Error occurred",
      jobPostingRequired: "Job posting required.",
    },
    fi: {
      title: "Luo",
      titleHighlight: "Vaikuttava",
      titleEnd: "Hakukirje.",
      subtitle: "Anna AI:n luoda vakuuttava esittely.",
      balance: "Saldosi",
      sectionType: "1. Kirjeen tyyppi",
      sectionLanguage: "2. Kieli & Tyyli", // ← UUSI
      sectionOptimization: "3. ATS-optimointi (Premium)", // ← Numero muuttui
      jobSpecific: "Työpaikkaan kohdistettu",
      jobSpecificDesc: "Räätälöity ilmoitukselle",
      general: "Yleinen esittely",
      generalDesc: "Yleispätevä esittelykirje",
      atsToggle: "Optimoi ATS:lle",
      atsInfo: "Liitä ilmoitus. AI analysoi taidot.",
      jobPostingPlaceholder: "Työpaikkailmoitus...",
      targetIndustryPlaceholder: "esim. Teknologia...",
      targetRolePlaceholder: "esim. Kehittäjä...",
      // ✅ UUDET KÄÄNNÖKSET
      languageLabel: "Kirjeen kieli",
      languageHelp: "Millä kielellä kirje kirjoitetaan?",
      styleLabel: "Kirjoitustyyli",
      styleHelp: "Valitse kirjeen sävy",
      styleFormal: "Muodollinen",
      styleFormalDesc: "Ammattimainen ja hiottu",
      styleCasual: "Rento",
      styleCasualDesc: "Keskusteleva mutta uskottava",
      summary: "Yhteenveto",
      letterGeneration: "Hakukirjeen generointi",
      cost: "Kustannus",
      free: "ILMAINEN",
      generateNow: "Luo hakukirje",
      generating: "Generoidaan...",
      premiumOnly: "Vain Premium",
      freeTrialInfo: "Ilmaiskäyttäjät voivat luoda yhden.",
      processTime: "Kestää ~30 sekuntia.",
      noProfile: "Täytä profiili ensin!",
      noTokens: (cost: number) => `Tarvitset ${cost} tokenia.`,
      freeUsed: "Ilmainen käytetty.",
      success: "✅ Hakukirje luotu!",
      error: "Tapahtui virhe",
      jobPostingRequired: "Ilmoitus vaaditaan.",
    }
  }[isFinnish ? 'fi' : 'en'];

  // Calculate costs
  const costs = useMemo(() => {
    const currentTier = (plan_type as PlanType) || 'free';
    const tierCosts = ACTION_COSTS[currentTier] || {};
    let action: TokenAction = letterType === 'general' 
      ? 'cover_letter_general' 
      : (letterVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1');
    const cost = tierCosts[action] || 0;
    return { base: cost, total: cost };
  }, [plan_type, letterType, letterVersion]);

  // Load profile
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
        console.error("❌ Profile load error:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    if (userLoaded && user) loadProfile();
  }, [userLoaded, user]);

  // ✅ VALIDOI PROFIILI
  const isProfileValid = useMemo(() => {
    if (!profileData) return false;
    
    // Tarkista että vähintään nimi ja yksi persoonallisuuskysymys on täytetty
    const hasName = profileData.name && profileData.name.length > 0;
    const hasPersonality = 
      (profileData.working_style && profileData.working_style.length >= 50) ||
      (profileData.problem_solving && profileData.problem_solving.length >= 80) ||
      (profileData.unique_strength && profileData.unique_strength.length >= 60);
    
    return hasName && hasPersonality;
  }, [profileData]);

  // --- GENERATE HANDLER ---
  const handleGenerateLetter = async (confirmedViolations?: any) => {
    // ✅ VALIDOI ENNEN LÄHETYSTÄ
    if (!isProfileValid) {
      toast.error(t.noProfile);
      router.push('/profile');
      return;
    }

    if (letterType === 'job_specific' && !jobPosting.trim()) {
      toast.error(t.jobPostingRequired);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ✅ PERUSDATA
          jobDescription: letterType === 'job_specific' ? jobPosting : "",
          targetIndustry: letterType === 'general' ? targetIndustry : "",
          targetRole: letterType === 'general' ? targetRole : "",
          letterType,
          letterVersion,
          
          // ✅ KIELI & TYYLI (EI ENÄÄ KOVAKOODATTU)
          language: letterLanguage,
          style: letterStyle,
          
          // ✅ RAG (aktivoi aina general-tyypissä)
    enableRAG: false, // ← Kovakoodattu false kunnes valmis
          
          // ✅ GUARDIAN
          confirmedViolations: confirmedViolations || null,
          skipValidation: !!confirmedViolations
        }),
      });

      const data = await response.json();

      if (response.status === 400 && data.needsConfirmation) {
        setPendingViolations(data.violations);
        setShowConfirmation(true);
        setIsLoading(false);
        return;
      }

      if (data.success) {
        toast.success(t.success);
        router.push(`/edit-cover-letter/${data.coverLetterId}`);
      }
    } catch (error) {
      toast.error(t.error);
    } finally {
      if (!showConfirmation) setIsLoading(false);
    }
  };

  // --- GUARDIAN HANDLERS ---
  const handleApproveViolations = async (approvedItems: any[]): Promise<void> => {
    setShowConfirmation(false);
    const confirmed = approvedItems.map(item => ({ ...item, decision: 'approved' }));
    await handleGenerateLetter(confirmed);
  };

  const handleRejectViolations = () => {
    setShowConfirmation(false);
    setIsLoading(false);
    toast.error(isFinnish ? "Generointi keskeytetty." : "Generation cancelled.");
  };

  const handleEditViolations = async (correctedItems: any[]): Promise<void> => {
    setShowConfirmation(false);
    const confirmed = correctedItems.map(item => ({
      ...item,
      decision: item.corrected ? 'corrected' : 'approved',
      content: item.corrected || item.original,
      correctedContent: item.corrected
    }));
    await handleGenerateLetter(confirmed);
  };

  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
      </div>
    );
  }

  const canUseATS = plan_type === 'premium' && letterType === 'job_specific';

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">AI Letter</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white">
              {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{t.titleHighlight}</span> {t.titleEnd}
            </h1>
            <p className="text-gray-400 text-lg">{t.subtitle}</p>
          </div>

          <div className="bg-gray-900/40 border border-gray-800 p-5 rounded-3xl flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.balance}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-white">{tokens.toLocaleString()}</span>
                <span className="text-xs font-bold text-orange-500">TKN</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <Crown className={`w-6 h-6 ${plan_type === 'premium' ? 'text-amber-400' : 'text-gray-600'}`} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">
            
            {/* ═══════════════════════════════════════════════════════
                SECTION 1: LETTER TYPE
            ═══════════════════════════════════════════════════════ */}
            <section className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center gap-3 mb-8">
                <Briefcase className="w-10 h-10 p-2 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30" />
                <h3 className="text-xl font-bold text-white">{t.sectionType}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: "job_specific", label: t.jobSpecific, desc: t.jobSpecificDesc, icon: Target },
                  { id: "general", label: t.general, desc: t.generalDesc, icon: Mail },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setLetterType(type.id as LetterType)}
                    className={`relative p-6 rounded-3xl border text-left transition-all ${
                      letterType === type.id 
                        ? 'border-orange-500/50 bg-orange-500/5' 
                        : 'border-gray-800 bg-black/20 hover:border-gray-700'
                    }`}
                  >
                    <type.icon className={`w-6 h-6 mb-4 ${letterType === type.id ? 'text-orange-400' : 'text-gray-500'}`} />
                    <p className="font-bold text-white mb-2">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.desc}</p>
                    {letterType === type.id && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-orange-500" />}
                  </button>
                ))}
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 2: KIELI & TYYLI (UUSI!)
            ═══════════════════════════════════════════════════════ */}
            <section className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center gap-3 mb-8">
                <Globe className="w-10 h-10 p-2 rounded-2xl bg-blue-500/20 text-blue-400 border border-blue-500/30" />
                <h3 className="text-xl font-bold text-white">{t.sectionLanguage}</h3>
              </div>

              {/* KIELIVALINTA */}
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-300 mb-3">
                  {t.languageLabel}
                </label>
                <p className="text-xs text-gray-500 mb-4">{t.languageHelp}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'finnish', label: 'Suomi', flag: '🇫🇮' },
                    { id: 'english', label: 'English', flag: '🇬🇧' },
                    { id: 'swedish', label: 'Svenska', flag: '🇸🇪' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLetterLanguage(lang.id as LetterLanguage)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        letterLanguage === lang.id
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-800 bg-black/20 hover:border-gray-700'
                      }`}
                    >
                      <div className="text-2xl mb-2">{lang.flag}</div>
                      <p className="font-bold text-white text-sm">{lang.label}</p>
                      {letterLanguage === lang.id && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* TYYLIVALINTA */}
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">
                  {t.styleLabel}
                </label>
                <p className="text-xs text-gray-500 mb-4">{t.styleHelp}</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'formal', label: t.styleFormal, desc: t.styleFormalDesc, icon: Shield },
                    { id: 'casual', label: t.styleCasual, desc: t.styleCasualDesc, icon: Palette },
                  ].map((styleOpt) => (
                    <button
                      key={styleOpt.id}
                      onClick={() => setLetterStyle(styleOpt.id as LetterStyle)}
                      className={`relative p-5 rounded-2xl border text-left transition-all ${
                        letterStyle === styleOpt.id
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-gray-800 bg-black/20 hover:border-gray-700'
                      }`}
                    >
                      <styleOpt.icon className={`w-5 h-5 mb-3 ${letterStyle === styleOpt.id ? 'text-purple-400' : 'text-gray-500'}`} />
                      <p className="font-bold text-white mb-1">{styleOpt.label}</p>
                      <p className="text-xs text-gray-500">{styleOpt.desc}</p>
                      {letterStyle === styleOpt.id && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ═══════════════════════════════════════════════════════
                SECTION 3: ATS OPTIMIZATION (numero muuttui 2→3)
            ═══════════════════════════════════════════════════════ */}
            {letterType === 'job_specific' && (
              <section className={`rounded-[2.5rem] p-10 border ${
                letterVersion === 'v2' && canUseATS ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-gray-900/20 border-gray-800/50'
              }`}>
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <Shield className={`w-10 h-10 p-2 rounded-2xl ${
                      letterVersion === 'v2' && canUseATS ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-gray-800/50 text-gray-500 border-gray-700'
                    } border`} />
                    <div>
                      <h3 className="text-xl font-bold text-white">{t.sectionOptimization}</h3>
                      <p className="text-xs text-gray-500">{t.atsToggle}</p>
                    </div>
                  </div>
                  {canUseATS ? (
                    <button 
                      onClick={() => setLetterVersion(letterVersion === 'v2' ? 'v1' : 'v2')}
                      className={`relative w-14 h-7 rounded-full ${letterVersion === 'v2' ? 'bg-emerald-500' : 'bg-gray-800'}`}
                    >
                      <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${letterVersion === 'v2' ? 'translate-x-7' : ''}`} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-[10px] font-black text-amber-500 uppercase">{t.premiumOnly}</span>
                    </div>
                  )}
                </div>
                <div className="space-y-6">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-200/70">{t.atsInfo}</p>
                  </div>
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder={t.jobPostingPlaceholder}
                    className="w-full h-48 bg-black/40 border border-white/10 rounded-3xl p-6 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none"
                  />
                </div>
              </section>
            )}

            {/* GENERAL: Target fields */}
            {letterType === 'general' && (
              <section className="bg-gray-900/20 border border-gray-800/50 rounded-[2.5rem] p-10 space-y-6">
                <h3 className="text-xl font-bold text-white">Target (Optional)</h3>
                <input
                  type="text"
                  value={targetIndustry}
                  onChange={(e) => setTargetIndustry(e.target.value)}
                  placeholder={t.targetIndustryPlaceholder}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50"
                />
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder={t.targetRolePlaceholder}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50"
                />
              </section>
            )}
          </div>

          {/* SIDEBAR: Summary */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12">
              <div className="bg-gray-900/40 border border-gray-800 rounded-[2.5rem] p-8">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8">{t.summary}</h3>
                
                <div className="space-y-5 mb-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t.letterGeneration}</span>
                    <span className="text-white font-bold">{plan_type === 'free' ? '0' : costs.base} TKN</span>
                  </div>
                  
                  {/* ✅ NÄYTÄ VALITUT ASETUKSET */}
                  <div className="pt-4 border-t border-gray-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-400">Kieli:</span>
                      <span className="text-white font-bold capitalize">{letterLanguage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span className="text-gray-400">Tyyli:</span>
                      <span className="text-white font-bold capitalize">{letterStyle}</span>
                    </div>
                  </div>
                  
                  <div className="pt-5 border-t border-gray-800">
                    <p className="text-[10px]font-bold text-gray-500 uppercase mb-1">{t.cost}</p>
<p className="text-3xl font-black text-white">
  {plan_type === 'free' ? t.free : `$${costs.total}`}

{plan_type === 'free' ? t.free : (
  <>
    <span className="text-xs opacity-70">$</span>
    {costs.total}
  </>
)}{plan_type !== 'free' && <span className="text-xs text-orange-500 ml-1">TKN</span>}
</p>
</div>
</div>
<Button
              onClick={() => handleGenerateLetter()}
              disabled={isLoading || !isProfileValid || (letterType === 'job_specific' && !jobPosting.trim())}
              className="w-full py-8 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02]"
            >
              {isLoading ? (
                <><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.generating}</>
              ) : (
                <><Sparkles className="w-5 h-5 mr-2" />{t.generateNow}<ArrowRight className="w-5 h-5 ml-2 opacity-50" /></>
              )}
            </Button>
            
            {/* ✅ PROFIILIVAROITUS */}
            {!isProfileValid && (
              <div className="mt-6 flex gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-red-400 mb-1">{t.noProfile}</p>
                  <button 
                    onClick={() => router.push('/profile')}
                    className="text-xs text-red-300 underline hover:text-red-200"
                  >
                    Täytä profiili →
                  </button>
                </div>
              </div>
            )}
            
            {plan_type === 'free' && (
              <div className="mt-6 flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                <p className="text-[10px] text-gray-500 italic">{t.freeTrialInfo}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  </div>

  {/* GUARDIAN MODAL */}
  {showConfirmation && pendingViolations && (
    <CVConfirmationModal
      violations={pendingViolations}
      onApprove={handleApproveViolations}
      onReject={handleRejectViolations}
      onEdit={handleEditViolations}
    />
  )}
</div>
);
}