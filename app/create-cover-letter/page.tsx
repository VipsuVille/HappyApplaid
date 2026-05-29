"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useGeneration } from '@/context/GenerationContext';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles, Target, Mail, Crown, Lock, Shield, CheckCircle,
  ArrowRight, Info, AlertCircle, Loader2, Briefcase, Globe,
  Palette, MessageSquarePlus, Save,
} from "lucide-react";
import { validateProfile } from '@/lib/profileValidation';
import ProfileValidationBanner from '@/components/ProfileValidationBanner';
import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import { useLanguage } from '@/context/LanguageContext';
import { ACTION_COSTS, PlanType, TokenAction } from "@/lib/domain/tokens";
import CVConfirmationModal from "@/components/CVConfirmationModal";
import TemplateThumb from "@/components/cover-letter/TemplateThumb"; // ✅ uusi

type LetterType = "job_specific" | "general";
type LetterVersion = "v1" | "v2";
type LetterLanguage = "finnish" | "english" | "swedish";
type LetterStyle = "formal" | "casual";

// ✅ Yhtenäinen, rauhallinen osio-tyyli
const SECTION = "bg-white/[0.02] border border-white/10 rounded-3xl p-6 md:p-8";

export default function CreateCoverLetterPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { language } = useLanguage();
  const [templateStyle, setTemplateStyle] = useState<string>("modern-top");
  const [letterType, setLetterType] = useState<LetterType>("job_specific");
  const [letterVersion, setLetterVersion] = useState<LetterVersion>("v1");
  const [jobPosting, setJobPosting] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  const [targetRole, setTargetRole] = useState("");

  // ✅ AVOIN HAKEMUS — firma-konteksti
  const [openAppCompany, setOpenAppCompany] = useState("");
  const [companyMotivation, setCompanyMotivation] = useState("");
  const [companyAboutText, setCompanyAboutText] = useState("");

  const [letterLanguage, setLetterLanguage] = useState<LetterLanguage>("finnish");
  const [letterStyle, setLetterStyle] = useState<LetterStyle>("formal");

  // ✅ Lisätiedot-kenttä
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [saveAdditionalNotes, setSaveAdditionalNotes] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<string>("");

  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<any>(null);
  const [showPremiumBox, setShowPremiumBox] = useState(false);

  const { tokens, plan_type, isLoading: tokensLoading } = useTokens();
  const freeUsage = useFreeUsage();

  const {
    startGeneration,
    setStage,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    isGenerating,
  } = useGeneration();

  const canUseATS = plan_type !== 'free';
  const canUseV2 = plan_type === 'premium' && letterType === 'job_specific';

  const isFinnish = language === 'fi' || (language as string) === 'finnish';
  const profileValidation = useMemo(() => {
    if (!profileData) return null;
    return validateProfile(profileData);
  }, [profileData]);

  // ✅ Pohjat + edustava väri thumbnailiin (visuaalinen vaihtelu kuten oikeissa gallerioissa)
  const TEMPLATES = useMemo(() => ([
    { id: 'modern-top', label: isFinnish ? 'Moderni · banneri' : 'Modern · banner', accent: '#6366f1' },
    { id: 'aurora', label: 'Aurora', accent: '#8b5cf6', badge: isFinnish ? 'AI-tausta' : 'AI background' },
    { id: 'modern-left', label: isFinnish ? 'Moderni · sivupalsta' : 'Modern · sidebar', accent: '#14b8a6' },
    { id: 'elegant', label: isFinnish ? 'Elegantti' : 'Elegant', accent: '#B59850' },
    { id: 'creative-wave', label: 'Creative Wave', accent: '#a855f7' },
    { id: 'classic', label: isFinnish ? 'Klassinen' : 'Classic', accent: '#475569' },
  ]), [isFinnish]);

  const t = {
    en: {
      title: "Create an",
      titleHighlight: "Impressive",
      titleEnd: "Cover Letter.",
      subtitle: "Let AI craft a compelling introduction.",
      balance: "Your Balance",
      sectionType: "Letter type",
      sectionLanguage: "Language & Style",
      sectionOptimization: "ATS Optimization (Premium)",
      sectionAdditionalNotes: "Additional Notes (Optional)",
      sectionTemplate: "Visual Template",
      sectionTemplateHelp: "Pick a look — you can fine-tune it later in the editor.",
      jobSpecific: "Job-Specific",
      jobSpecificDesc: "Tailored for a job posting",
      general: "General Introduction",
      generalDesc: "Universal professional intro",
      atsToggle: "Optimize for ATS",
      jobPostingPlaceholder: "Job posting text...",
      targetRolePlaceholder: "e.g. Software Engineer...",
      languageLabel: "Letter Language",
      languageHelp: "Which language should the letter be written in?",
      styleLabel: "Writing Style",
      styleHelp: "Choose the tone of your letter",
      styleFormal: "Formal",
      styleFormalDesc: "Professional and polished",
      styleCasual: "Casual",
      styleCasualDesc: "Conversational but credible",
      additionalNotesPlaceholder: "E.g. 'I want to emphasize my project management skills and mention I'm ready to start immediately.'",
      additionalNotesHelp: "These instructions will be given to AI when writing your letter.",
      saveNotesCheckbox: "Save for future letters",
      previousNotesLabel: "Previously used:",
      summary: "Summary",
      letterGeneration: "Letter Generation",
      cost: "Cost",
      free: "FREE",
      generateNow: "Create Letter Now",
      generating: "Generating...",
      freeTrialInfo: "Free users can create one cover letter.",
      noProfile: "Fill profile first!",
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
      sectionType: "Kirjeen tyyppi",
      sectionLanguage: "Kieli & Tyyli",
      sectionOptimization: "ATS-optimointi (Premium)",
      sectionAdditionalNotes: "Lisätiedot (Vapaaehtoinen)",
      sectionTemplate: "Visuaalinen pohja",
      sectionTemplateHelp: "Valitse ulkoasu — voit hienosäätää sitä myöhemmin editorissa.",
      jobSpecific: "Työpaikkaan kohdistettu",
      jobSpecificDesc: "Räätälöity ilmoitukselle",
      general: "Yleinen esittely",
      generalDesc: "Yleispätevä esittelykirje",
      atsToggle: "Optimoi ATS:lle",
      jobPostingPlaceholder: "Työpaikkailmoitus...",
      targetRolePlaceholder: "esim. Kehittäjä...",
      languageLabel: "Kirjeen kieli",
      languageHelp: "Millä kielellä kirje kirjoitetaan?",
      styleLabel: "Kirjoitustyyli",
      styleHelp: "Valitse kirjeen sävy",
      styleFormal: "Muodollinen",
      styleFormalDesc: "Ammattimainen ja hiottu",
      styleCasual: "Rento",
      styleCasualDesc: "Keskusteleva mutta uskottava",
      additionalNotesPlaceholder: "Esim: 'Haluan korostaa projektinhallintaosaamistani ja mainita että olen valmis aloittamaan heti.'",
      additionalNotesHelp: "Nämä ohjeet annetaan AI:lle kirjettä kirjoitettaessa.",
      saveNotesCheckbox: "💾 Tallenna tulevia kirjeitä varten",
      previousNotesLabel: "Viimeksi käytetty:",
      summary: "Yhteenveto",
      letterGeneration: "Hakukirjeen generointi",
      cost: "Kustannus",
      free: "ILMAINEN",
      generateNow: "Luo hakukirje",
      generating: "Generoidaan...",
      freeTrialInfo: "Ilmaiskäyttäjät voivat luoda yhden.",
      noProfile: "Täytä profiili ensin!",
      success: "✅ Hakukirje luotu!",
      error: "Tapahtui virhe",
      jobPostingRequired: "Ilmoitus vaaditaan.",
    }
  }[isFinnish ? 'fi' : 'en'];

  const apiType = useMemo(() => {
    if (letterType === 'general') {
      return 'general';
    } else {
      return letterVersion === 'v2' ? 'ats-v2' : 'ats-v1';
    }
  }, [letterType, letterVersion]);

  const costs = useMemo(() => {
    const currentTier = (plan_type as PlanType) || 'free';
    const tierCosts = ACTION_COSTS[currentTier] || {};

    let action: TokenAction;
    if (letterType === 'general') {
      action = 'cover_letter_general';
    } else {
      action = letterVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1';
    }

    const cost = tierCosts[action] || 0;
    return { base: cost, total: cost };
  }, [plan_type, letterType, letterVersion]);

  // ✅ LOAD PROFILE & PREVIOUS NOTES (ennallaan)
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

        const notesResponse = await fetch('/api/user-responses?category=cover_letter&context=additional_notes&limit=1');
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          if (notesData.responses && notesData.responses.length > 0) {
            setPreviousNotes(notesData.responses[0].answer);
          }
        }
      } catch (error) {
        console.error("❌ Profile load error:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    if (userLoaded && user) loadProfile();
  }, [userLoaded, user]);

  const extractJobInfo = (text: string) => {
    const lowerText = text.toLowerCase();
    let jobTitle = "Työtehtävä";
    let companyName = "Yritys";

    if (lowerText.includes('kesko')) companyName = 'Kesko';
    if (lowerText.includes('nokia')) companyName = 'Nokia';
    if (lowerText.includes('wolt')) companyName = 'Wolt';

    if (lowerText.includes('it') || lowerText.includes('ohjelmisto')) jobTitle = 'IT-tehtävä';
    if (lowerText.includes('myynti')) jobTitle = 'Myyntitehtävä';
    if (lowerText.includes('asiakaspalvelu')) jobTitle = 'Asiakaspalvelutehtävä';

    return { jobTitle, companyName };
  };

  // --- GENERATE HANDLER (ennallaan) ---
  const handleGenerateLetter = async (confirmedViolations?: any) => {
    if (!profileValidation?.isValid) {
      toast.error(t.noProfile);
      return;
    }
    if (letterType === 'job_specific' && !jobPosting.trim()) {
      toast.error(t.jobPostingRequired);
      return;
    }

    if (letterVersion === 'v2' && plan_type !== 'premium') {
      toast.error('ATS V2 vaatii Premium-tilauksen');
      return;
    }

    console.log('🚀 Starting generation with type:', apiType);

    try {
      startGeneration('cover_letter', {
        templateType: letterType,
        language: letterLanguage
      });

      let jobTitle = undefined;
      let companyName = undefined;
      let jobDescription = jobPosting;

      if (letterType === 'job_specific' && jobPosting.trim().length < 200) {
        const extracted = extractJobInfo(jobPosting);
        jobTitle = extracted.jobTitle;
        companyName = extracted.companyName;
        jobDescription = jobPosting;
      }

      const requestBody = {
        type: apiType,
        templateStyle: templateStyle, // 🔥 LÄHETETÄÄN VALITTU POHJA BACKENDILLE

        ...(letterType === 'job_specific' && {
          jobTitle: jobTitle || 'Työtehtävä',
          companyName: companyName || 'Yritys',
          jobDescription: jobDescription,
        }),

        ...(letterType === 'general' && {
          targetIndustry,
          targetRole,
          companyName: openAppCompany.trim() || undefined,
          jobTitle: targetRole.trim() || undefined,
          companyMotivation: companyMotivation.trim() || undefined,
          companyAboutText: companyAboutText.trim() || undefined,
        }),

        language: letterLanguage,
        style: letterStyle,

        additionalNotes: additionalNotes.trim() || undefined,
        saveAdditionalNotes: saveAdditionalNotes,

        name: profileData?.name,
        email: profileData?.email,
        phone: profileData?.phone,
        workExperience: typeof profileData?.work_experience === 'string'
          ? profileData.work_experience
          : JSON.stringify(profileData?.work_experience || []),
        education: typeof profileData?.education === 'string'
          ? profileData.education
          : JSON.stringify(profileData?.education || []),
        skills: Array.isArray(profileData?.skills)
          ? profileData.skills.join(', ')
          : profileData?.skills || '',

        workingStyle: profileData?.working_style,
        problemSolving: profileData?.problem_solving,
        uniqueStrength: profileData?.unique_strength,
        superpower: profileData?.superpower,
        energySources: profileData?.energy_sources,
        learningStyle: profileData?.learning_style,
        teamRole: profileData?.team_role,
        valuesExample: profileData?.values_example,
        careerGoals: profileData?.career_goals,
        bestProjectExample: profileData?.best_project_example,
        failureLesson: profileData?.failure_lesson,

        enableRAG: false,

        confirmedViolations: confirmedViolations || null,
        skipValidation: !!confirmedViolations
      };

      setStage('analyzing', 20);

      const response = await fetch("/api/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      setStage('generating', 50);

      console.log('📨 API Response:', data);
      setStage('finalizing', 80);

      if (response.status === 400 && data.needsConfirmation) {
        setPendingViolations(data.violations);
        setShowConfirmation(true);
        cancelGeneration();
        return;
      }

      if (data.success) {
        completeGeneration(data.id);
        toast.success(t.success);
      } else {
        throw new Error(data.error || t.error);
      }
    } catch (error: any) {
      console.error('❌ Generation error:', error);
      failGeneration(error.message || t.error);
      toast.error(t.error);
    }
  };

  const handleApproveViolations = async (approvedItems: any[]): Promise<void> => {
    setShowConfirmation(false);
    const confirmed = approvedItems.map(item => ({ ...item, decision: 'approved' }));
    await handleGenerateLetter(confirmed);
  };

  const handleRejectViolations = () => {
    setShowConfirmation(false);
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

  // Pieni osio-otsikko (yhtenäinen, rauhallinen)
  const Header = ({ step, icon: Icon, title, help }: { step: number; icon: any; title: string; help?: string }) => (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-400 text-sm font-bold shrink-0">
        {step}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-gray-500" />
          <h3 className="text-base font-semibold text-white">{title}</h3>
        </div>
        {help && <p className="text-xs text-gray-500 mt-1">{help}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* HERO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <Mail className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">AI Letter</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white">
              {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{t.titleHighlight}</span> {t.titleEnd}
            </h1>
            <p className="text-gray-400">{t.subtitle}</p>
          </div>

          <div className="bg-white/[0.03] border border-white/10 p-4 rounded-2xl flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.balance}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-white">{tokens.toLocaleString()}</span>
                <span className="text-xs font-bold text-orange-500">TKN</span>
              </div>
            </div>
            <div className="w-px h-9 bg-white/10" />
            <Crown className={`w-6 h-6 ${plan_type === 'premium' ? 'text-amber-400' : 'text-gray-600'}`} />
          </div>
        </div>

        {profileValidation && !profileValidation.isValid && (
          <div className="mb-8">
            <ProfileValidationBanner
              validation={profileValidation}
              context="cover_letter"
              language={isFinnish ? 'fi' : 'en'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-6">

            {/* SECTION 1: LETTER TYPE */}
            <section className={SECTION}>
              <Header step={1} icon={Briefcase} title={t.sectionType} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "job_specific", label: t.jobSpecific, desc: t.jobSpecificDesc, icon: Target },
                  { id: "general", label: t.general, desc: t.generalDesc, icon: Mail },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setLetterType(type.id as LetterType)}
                    className={`relative p-5 rounded-2xl border text-left transition-all ${
                      letterType === type.id
                        ? 'border-orange-500/50 bg-orange-500/5'
                        : 'border-white/10 bg-black/20 hover:border-white/20'
                    }`}
                  >
                    <type.icon className={`w-5 h-5 mb-3 ${letterType === type.id ? 'text-orange-400' : 'text-gray-500'}`} />
                    <p className="font-semibold text-white mb-1">{type.label}</p>
                    <p className="text-xs text-gray-500">{type.desc}</p>
                    {letterType === type.id && <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-orange-500" />}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 2: KIELI & TYYLI */}
            <section className={SECTION}>
              <Header step={2} icon={Globe} title={t.sectionLanguage} />

              <div className="mb-7">
                <label className="block text-sm font-semibold text-gray-300 mb-1">{t.languageLabel}</label>
                <p className="text-xs text-gray-500 mb-3">{t.languageHelp}</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'finnish', label: 'Suomi', flag: '🇫🇮' },
                    { id: 'english', label: 'English', flag: '🇬🇧' },
                    { id: 'swedish', label: 'Svenska', flag: '🇸🇪' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setLetterLanguage(lang.id as LetterLanguage)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${
                        letterLanguage === lang.id
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <div className="text-2xl mb-2">{lang.flag}</div>
                      <p className="font-semibold text-white text-sm">{lang.label}</p>
                      {letterLanguage === lang.id && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">{t.styleLabel}</label>
                <p className="text-xs text-gray-500 mb-3">{t.styleHelp}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'formal', label: t.styleFormal, desc: t.styleFormalDesc, icon: Shield },
                    { id: 'casual', label: t.styleCasual, desc: t.styleCasualDesc, icon: Palette },
                  ].map((styleOpt) => (
                    <button
                      key={styleOpt.id}
                      onClick={() => setLetterStyle(styleOpt.id as LetterStyle)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${
                        letterStyle === styleOpt.id
                          ? 'border-purple-500/50 bg-purple-500/10'
                          : 'border-white/10 bg-black/20 hover:border-white/20'
                      }`}
                    >
                      <styleOpt.icon className={`w-5 h-5 mb-2 ${letterStyle === styleOpt.id ? 'text-purple-400' : 'text-gray-500'}`} />
                      <p className="font-semibold text-white mb-0.5">{styleOpt.label}</p>
                      <p className="text-xs text-gray-500">{styleOpt.desc}</p>
                      {letterStyle === styleOpt.id && (
                        <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-purple-400" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 3: ATS / JOB POSTING */}
            {letterType === 'job_specific' && (
              <>
                {!canUseATS && (
                  <section className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-3xl overflow-hidden">
                    <div
                      className="p-6 md:p-8 cursor-pointer md:cursor-default"
                      onClick={() => setShowPremiumBox(!showPremiumBox)}
                    >
                      {/* Premium box content... */}
                    </div>
                  </section>
                )}

                {canUseATS && (
                  <section className={`rounded-3xl p-6 md:p-8 border ${
                    letterVersion === 'v2' && canUseV2 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-white/[0.02] border-white/10'
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Shield className={`w-9 h-9 p-2 rounded-xl ${
                          letterVersion === 'v2' && canUseV2 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-gray-500 border-white/10'
                        } border`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-white">{t.sectionOptimization}</h3>
                            {plan_type === 'premium' && <Crown className="w-4 h-4 text-amber-400" />}
                          </div>
                          <p className="text-xs text-gray-500">{t.atsToggle}</p>
                        </div>
                      </div>

                      {canUseV2 && (
                        <button
                          onClick={() => setLetterVersion(letterVersion === 'v2' ? 'v1' : 'v2')}
                          className={`relative w-14 h-7 rounded-full transition-colors ${
                            letterVersion === 'v2' ? 'bg-emerald-500' : 'bg-gray-800'
                          }`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            letterVersion === 'v2' ? 'translate-x-7' : ''
                          }`} />
                        </button>
                      )}

                      {!canUseV2 && canUseATS && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">V2: Premium Only</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex gap-3 mb-5">
                      <Info className="w-5 h-5 text-blue-400 shrink-0" />
                      <p className="text-xs text-blue-200/70">
                        {letterVersion === 'v2' && canUseV2
                          ? '✅ ATS V2: Iteratiivinen optimointi käytössä (tavoite >= 75%)'
                          : canUseATS && !canUseV2
                          ? 'ℹ️ ATS V1: Perusoptimointi käytössä (Basic). Premium = V2 iteratiivinen optimointi.'
                          : 'ℹ️ ATS V1: Perusoptimointi käytössä'
                        }
                      </p>
                    </div>

                    <textarea
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                      placeholder={t.jobPostingPlaceholder}
                      className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </section>
                )}

                {!canUseATS && (
                  <section className={SECTION}>
                    <Header step={3} icon={Briefcase} title={isFinnish ? 'Työpaikkailmoitus' : 'Job posting'} />
                    <textarea
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                      placeholder={t.jobPostingPlaceholder}
                      className="w-full h-48 bg-black/40 border border-white/10 rounded-2xl p-5 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none"
                    />
                  </section>
                )}
              </>
            )}

            {/* GENERAL: avoin hakemus tietylle firmalle */}
            {letterType === 'general' && (
              <section className={`${SECTION} space-y-5`}>
                <Header
                  step={3}
                  icon={Briefcase}
                  title={isFinnish ? 'Kohdeyritys (vapaaehtoinen)' : 'Target company (optional)'}
                  help={isFinnish
                    ? 'Tee avoimesta hakemuksesta yksilöllinen juuri tälle yritykselle'
                    : 'Make your open application specific to this company'}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={openAppCompany}
                    onChange={(e) => setOpenAppCompany(e.target.value)}
                    placeholder={isFinnish ? 'Yritys, esim. Nokia' : 'Company, e.g. Nokia'}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50"
                  />
                  <input
                    type="text"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    placeholder={t.targetRolePlaceholder}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {isFinnish ? 'Miksi juuri tämä yritys?' : 'Why this company?'}
                  </label>
                  <textarea
                    value={companyMotivation}
                    onChange={(e) => setCompanyMotivation(e.target.value)}
                    placeholder={isFinnish
                      ? 'Esim. "Olen seurannut heidän kestävyystyötään" tai "Ystäväni töissä siellä kehui kulttuuria". Omin sanoin — tämä tekee kirjeestä aidon.'
                      : 'E.g. "I\'ve followed their sustainability work". In your own words — this makes the letter genuine.'}
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    {isFinnish ? 'Tietoa yrityksestä (vapaaehtoinen)' : 'About the company (optional)'}
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    {isFinnish
                      ? 'Liitä yrityksen "Tietoa meistä" -teksti nettisivuilta. AI käyttää sitä tehdäkseen kirjeestä osuvan.'
                      : 'Paste the company\'s "About us" text. AI uses it to make the letter relevant.'}
                  </p>
                  <textarea
                    value={companyAboutText}
                    onChange={(e) => setCompanyAboutText(e.target.value)}
                    placeholder={isFinnish ? 'Liitä yrityksen esittelyteksti tähän…' : 'Paste the company description here…'}
                    className="w-full h-28 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-gray-600"
                    maxLength={2000}
                  />
                </div>

                <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-2xl flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-blue-200/70">
                    <p className="font-bold text-blue-300 mb-1">
                      {isFinnish ? 'AI-faktantarkistus (tulossa)' : 'AI fact-check (coming soon)'}
                    </p>
                    <p>
                      {isFinnish
                        ? 'Pian: maksavat käyttäjät voivat antaa AI:n tarkistaa väitteet yrityksestä. Toistaiseksi kirjoita itse — se on aidoin tapa.'
                        : 'Soon: paid users can let AI verify claims about the company. For now, write it yourself — the most genuine way.'}
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* SECTION 4: LISÄTIEDOT (rauhoitettu) */}
            <section className={SECTION}>
              <Header step={4} icon={MessageSquarePlus} title={t.sectionAdditionalNotes} help={t.additionalNotesHelp} />

              {previousNotes && (
                <div className="mb-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                  <p className="text-xs font-bold text-purple-300 mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" />
                    {t.previousNotesLabel}
                  </p>
                  <p className="text-sm text-purple-200 italic">"{previousNotes}"</p>
                </div>
              )}

              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder={t.additionalNotesPlaceholder}
                className="w-full h-28 bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-gray-200 focus:outline-none focus:border-purple-400/60 resize-none placeholder:text-gray-600 mb-3"
              />

              <label className="flex items-start gap-3 p-3 bg-black/20 border border-white/10 rounded-xl cursor-pointer hover:border-white/20 transition-colors">
                <input
                  type="checkbox"
                  checked={saveAdditionalNotes}
                  onChange={(e) => setSaveAdditionalNotes(e.target.checked)}
                  className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-purple-200 flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {t.saveNotesCheckbox}
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    {isFinnish
                      ? 'AI käyttää näitä tietoja automaattisesti seuraavissa kirjeissä. Voit muokata profiilissa.'
                      : 'AI will use this information automatically in future letters. You can edit in profile.'}
                  </p>
                </div>
              </label>
            </section>

            {/* SECTION 5: VISUAALINEN POHJA — THUMBNAIL-GALLERIA */}
            <section className={SECTION}>
              <Header step={5} icon={Palette} title={t.sectionTemplate} help={t.sectionTemplateHelp} />

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {TEMPLATES.map((tpl) => {
                  const selected = templateStyle === tpl.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setTemplateStyle(tpl.id)}
                      className={`group relative rounded-2xl p-2 border text-left transition-all ${
                        selected
                          ? 'border-orange-500/60 bg-orange-500/5 ring-2 ring-orange-500/30'
                          : 'border-white/10 bg-black/20 hover:border-white/25'
                      }`}
                    >
                      {/* Paperi-thumbnail */}
                      <div className="relative rounded-lg overflow-hidden border border-black/10 shadow-sm bg-white">
                        <TemplateThumb id={tpl.id} accent={tpl.accent} />
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-1 px-1 pt-2">
                        <p className={`text-xs font-semibold truncate ${selected ? 'text-orange-300' : 'text-gray-300'}`}>
                          {tpl.label}
                        </p>
                        {tpl.badge && (
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-violet-300 bg-violet-500/15 border border-violet-500/30 rounded px-1 py-0.5">
                            {tpl.badge}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

          </div>

          {/* SIDEBAR: Summary */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12">
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-7">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-7">{t.summary}</h3>

                <div className="space-y-5 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">{t.letterGeneration}</span>
                    <span className="text-white font-bold">{plan_type === 'free' ? '0' : costs.base} TKN</span>
                  </div>

                  <div className="pt-4 border-t border-white/10 space-y-3">
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
                    <div className="flex items-center gap-2 text-xs">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span className="text-gray-400">{isFinnish ? "Pohja:" : "Template:"}</span>
                      <span className="text-indigo-300 font-bold">
                        {TEMPLATES.find(x => x.id === templateStyle)?.label || templateStyle}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-gray-400">Tyyppi:</span>
                      <span className="text-white font-bold uppercase">{apiType}</span>
                    </div>
                    {additionalNotes.trim() && (
                      <div className="flex items-center gap-2 text-xs">
                        <MessageSquarePlus className="w-4 h-4 text-purple-400" />
                        <span className="text-gray-400">Lisätiedot:</span>
                        <span className="text-purple-300 font-bold">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 border-t border-white/10">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.cost}</p>
                    <p className="text-3xl font-black text-white">
                      {plan_type === 'free' ? t.free : (
                        <>
                          {costs.total}
                          <span className="text-xs text-orange-500 ml-1">TKN</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateLetter()}
                  disabled={isGenerating || !profileValidation?.isValid || (letterType === 'job_specific' && !jobPosting.trim())}
                  className="w-full py-7 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-5 h-5 animate-spin mr-2" />{t.generating}</>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" />{t.generateNow}<ArrowRight className="w-5 h-5 ml-2 opacity-50" /></>
                  )}
                </Button>

                {!profileValidation?.isValid && (
                  <div className="mt-5 flex gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
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
                  <div className="mt-5 flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
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