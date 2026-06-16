// app/create-cover-letter/page.tsx
// ✅ Yhtenäinen tyylittely: käyttää KAIKKIALLA design-tokeneita (theme.css):
//    bg-background / bg-card / bg-muted / text-foreground / text-muted-foreground / border-border.
//    Ei enää kovakoodattuja dark:bg-[#030711] yms. → dark+light pysyvät linjassa automaattisesti.
// ✅ RAG-kytkin: näkyy VAIN premiumille. Turva on palvelimella (ragOn = plan==='premium' && body.enableRAG).
//    Kytkimen pakottaminen F12:lla ei auta — palvelin tarkistaa planin ensin.
// ✅ Aksenttivärit (oranssi/sininen/violetti/emerald valituissa tiloissa) säilytetty tarkoituksella.
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
  Palette, MessageSquarePlus, Save, BookOpen,
} from "lucide-react";
import { validateProfile } from '@/lib/profileValidation';
import ProfileValidationBanner from '@/components/ProfileValidationBanner';
import { usePlanStatus } from "@/hooks/usePlanStatus";
import { useLanguage } from '@/context/LanguageContext';
import CVConfirmationModal from "@/components/CVConfirmationModal";
import TemplateThumb from "@/components/cover-letter/TemplateThumb";
import ExperienceGapModal, { type ExperienceGapData } from "@/components/ExperienceGapModal";

type LetterType = "job_specific" | "general";
type LetterVersion = "v1" | "v2";
type LetterLanguage = "finnish" | "english" | "swedish";
type LetterStyle = "formal" | "casual";

// ✅ Yhtenäinen osio-tyyli — pelkät tokenit (toimii light + dark)
const SECTION = "bg-card border border-border rounded-3xl p-6 md:p-8";

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

  const [openAppCompany, setOpenAppCompany] = useState("");
  const [companyMotivation, setCompanyMotivation] = useState("");
  const [companyAboutText, setCompanyAboutText] = useState("");
const [showGapModal, setShowGapModal] = useState(false);
const [gapData, setGapData] = useState<ExperienceGapData | null>(null);
  const [letterLanguage, setLetterLanguage] = useState<LetterLanguage>("finnish");
  const [letterStyle, setLetterStyle] = useState<LetterStyle>("formal");
  const [mustInclude, setMustInclude] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [saveAdditionalNotes, setSaveAdditionalNotes] = useState(false);
  const [previousNotes, setPreviousNotes] = useState<string>("");

  // ✅ RAG-valinta (oletuksena päällä premiumilla; palvelin valvoo lopullisen luvan)
  const [useRag, setUseRag] = useState(true);

  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<any>(null);
  const [showPremiumBox, setShowPremiumBox] = useState(false);

  const { status, loading: planLoading, isPaid, refresh } = usePlanStatus();

  const {
    startGeneration, setStage, completeGeneration,
    failGeneration, cancelGeneration, isGenerating,
  } = useGeneration();

  const isPremium = status?.plan === 'premium';
  const canUseATS = status ? status.plan !== 'free' : false;       // ATS = maksullinen
  const canUseV2 = isPremium && letterType === 'job_specific';

  const isFinnish = language === 'fi' || (language as string) === 'finnish';
  const profileValidation = useMemo(() => {
    if (!profileData) return null;
    return validateProfile(profileData);
  }, [profileData]);

  const TEMPLATES = useMemo(() => ([
    { id: 'modern-top', label: isFinnish ? 'Moderni · banneri' : 'Modern · banner', accent: '#6366f1' },
    { id: 'aurora', label: 'Aurora', accent: '#8b5cf6', badge: isFinnish ? 'AI-tausta' : 'AI background' },
    { id: 'modern-left', label: isFinnish ? 'Moderni · sivupalsta' : 'Modern · sidebar', accent: '#14b8a6' },
    { id: 'elegant', label: isFinnish ? 'Elegantti' : 'Elegant', accent: '#B59850' },
    { id: 'creative-wave', label: 'Creative Wave', accent: '#a855f7' },
    { id: 'classic', label: isFinnish ? 'Klassinen' : 'Classic', accent: '#475569' },
    { id: 'ribbon', label: 'Ribbon', accent: '#e11d48' },
    { id: 'sidebar', label: isFinnish ? 'Sivupalsta+' : 'Sidebar+', accent: '#0f766e' },
    { id: 'monogram', label: 'Monogram', accent: '#1e3a5f' },
  ]), [isFinnish]);

  const t = {
    en: {
      title: "Create an", titleHighlight: "Impressive", titleEnd: "Cover Letter.",
      subtitle: "Let AI craft a compelling introduction.",
      aiLeft: "AI generations left", planFree: "Free · 1 AI / week", planPaid: "Active plan",
      sectionType: "Letter type", sectionLanguage: "Language & Style",
      sectionOptimization: "ATS Optimization (Paid)", sectionAdditionalNotes: "Additional Notes (Optional)",
      sectionTemplate: "Visual Template", sectionTemplateHelp: "Pick a look — you can fine-tune it later in the editor.",
      jobSpecific: "Job-Specific", jobSpecificDesc: "Tailored for a job posting",
      general: "General Introduction", generalDesc: "Universal professional intro",
      atsToggle: "Optimize for ATS", jobPostingPlaceholder: "Job posting text...",
      targetRolePlaceholder: "e.g. Software Engineer...",
      languageLabel: "Letter Language", languageHelp: "Which language should the letter be written in?",
      styleLabel: "Writing Style", styleHelp: "Choose the tone of your letter",
      styleFormal: "Formal", styleFormalDesc: "Professional and polished",
      styleCasual: "Casual", styleCasualDesc: "Conversational but credible",
      additionalNotesPlaceholder: "E.g. 'I want to emphasize my project management skills and mention I'm ready to start immediately.'",
      additionalNotesHelp: "These instructions will be given to AI when writing your letter.",
      mustIncludeLabel: "Make sure this is included in the letter",
      saveNotesCheckbox: "Save for future letters", previousNotesLabel: "Previously used:",
      summary: "Summary", generateNow: "Create Letter Now", generating: "Generating...",
      freeNote: "Free plan: 1 AI generation per week. ATS optimization is a paid feature.",
      noProfile: "Fill profile first!", success: "✅ Cover letter created!", error: "Error occurred",
      jobPostingRequired: "Job posting required.",
      limitReached: "Weekly AI limit reached. Upgrade to Pro for more.",
      sumLanguage: "Language", sumStyle: "Style", sumTemplate: "Template", sumType: "Type", sumNotes: "Notes",
      sumRag: "Expert knowledge",
      ragTitle: "Expert writing knowledge",
      ragDesc: "Uses our curated cover-letter guidance to sharpen tone, structure and impact.",
      ragBadge: "Premium",
    },
    fi: {
      title: "Luo", titleHighlight: "Vaikuttava", titleEnd: "Hakukirje.",
      subtitle: "Anna AI:n luoda vakuuttava esittely.",
      aiLeft: "AI-luonnit jäljellä", planFree: "Ilmainen · 1 AI / viikko", planPaid: "Aktiivinen tilaus",
      sectionType: "Kirjeen tyyppi", sectionLanguage: "Kieli & Tyyli",
      sectionOptimization: "ATS-optimointi (Maksullinen)", sectionAdditionalNotes: "Lisätiedot (Vapaaehtoinen)",
      sectionTemplate: "Visuaalinen pohja", sectionTemplateHelp: "Valitse ulkoasu — voit hienosäätää sitä myöhemmin editorissa.",
      jobSpecific: "Työpaikkaan kohdistettu", jobSpecificDesc: "Räätälöity ilmoitukselle",
      general: "Yleinen esittely", generalDesc: "Yleispätevä esittelykirje",
      atsToggle: "Optimoi ATS:lle", jobPostingPlaceholder: "Työpaikkailmoitus...",
      targetRolePlaceholder: "esim. Kehittäjä...",
      languageLabel: "Kirjeen kieli", languageHelp: "Millä kielellä kirje kirjoitetaan?",
      styleLabel: "Kirjoitustyyli", styleHelp: "Valitse kirjeen sävy",
      styleFormal: "Muodollinen", styleFormalDesc: "Ammattimainen ja hiottu",
      styleCasual: "Rento", styleCasualDesc: "Keskusteleva mutta uskottava",
      additionalNotesPlaceholder: "Esim: 'Haluan korostaa projektinhallintaosaamistani ja mainita että olen valmis aloittamaan heti.'",
      additionalNotesHelp: "Nämä ohjeet annetaan AI:lle kirjettä kirjoitettaessa.",
      mustIncludeLabel: "Varmista että tämä huomioidaan hakukirjeessä",
      saveNotesCheckbox: "Tallenna tulevia kirjeitä varten", previousNotesLabel: "Viimeksi käytetty:",
      summary: "Yhteenveto", generateNow: "Luo hakukirje", generating: "Generoidaan...",
      freeNote: "Ilmaisversio: 1 AI-luonti viikossa. ATS-optimointi on maksullinen ominaisuus.",
      noProfile: "Täytä profiili ensin!", success: "✅ Hakukirje luotu!", error: "Tapahtui virhe",
      jobPostingRequired: "Ilmoitus vaaditaan.",
      limitReached: "Viikon AI-raja täynnä. Päivitä Pro:ksi saadaksesi lisää.",
      sumLanguage: "Kieli", sumStyle: "Tyyli", sumTemplate: "Pohja", sumType: "Tyyppi", sumNotes: "Lisätiedot",
      sumRag: "Asiantuntijaohjeisto",
      ragTitle: "Asiantuntijaohjeisto",
      ragDesc: "Hyödyntää kuratoituja hakukirjeohjeita parantaakseen sävyä, rakennetta ja vaikuttavuutta.",
      ragBadge: "Premium",
    }
  }[isFinnish ? 'fi' : 'en'];

  const apiType = useMemo(() => {
    if (letterType === 'general') return 'general';
    return letterVersion === 'v2' ? 'ats-v2' : 'ats-v1';
  }, [letterType, letterVersion]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        setProfileLoading(true);
        const response = await fetch(`/api/user-profile/${user.id}`);
        if (response.ok) setProfileData(await response.json());
        const notesResponse = await fetch('/api/user-responses?category=cover_letter&context=additional_notes&limit=1');
        if (notesResponse.ok) {
          const notesData = await notesResponse.json();
          if (notesData.responses?.length > 0) setPreviousNotes(notesData.responses[0].answer);
        }
      } catch (error) {
        console.error("Profile load error:", error);
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

const handleGenerateLetter = async (confirmedViolations?: any, skipExperienceCheck?: boolean) => {
    if (!profileValidation?.isValid) { toast.error(t.noProfile); return; }
    if (letterType === 'job_specific' && !jobPosting.trim()) { toast.error(t.jobPostingRequired); return; }
    if (letterVersion === 'v2' && status?.plan !== 'premium') {
      toast.error(isFinnish ? 'ATS V2 vaatii Premium-tilauksen' : 'ATS V2 requires Premium');
      return;
    }

    try {
      startGeneration('cover_letter', { templateType: letterType, language: letterLanguage });

      let jobTitle: string | undefined;
      let companyName: string | undefined;
      let jobDescription = jobPosting;

      if (letterType === 'job_specific' && jobPosting.trim().length < 200) {
        const extracted = extractJobInfo(jobPosting);
        jobTitle = extracted.jobTitle;
        companyName = extracted.companyName;
        jobDescription = jobPosting;
      }

      const requestBody = {
        type: apiType,
        templateStyle,
        ...(letterType === 'job_specific' && {
          jobTitle: jobTitle || 'Työtehtävä',
          companyName: companyName || 'Yritys',
          jobDescription,
        }),
        ...(letterType === 'general' && {
          targetIndustry, targetRole,
          companyName: openAppCompany.trim() || undefined,
          jobTitle: targetRole.trim() || undefined,
          companyMotivation: companyMotivation.trim() || undefined,
          companyAboutText: companyAboutText.trim() || undefined,
        }),
        language: letterLanguage,
        style: letterStyle,
        additionalNotes: additionalNotes?.trim()
          ? (mustInclude
              ? `PAKOLLINEN OHJE: Sisällytä seuraavan asian YDIN hakukirjeeseen luontevasti ja omin sanoin — ÄLÄ kopioi sanasta sanaan, mutta varmista että pääajatus näkyy selvästi tekstissä: "${additionalNotes.trim()}"`
              : additionalNotes.trim())
          : undefined,
        saveAdditionalNotes,
        name: profileData?.name, email: profileData?.email, phone: profileData?.phone,
        workExperience: typeof profileData?.work_experience === 'string'
          ? profileData.work_experience : JSON.stringify(profileData?.work_experience || []),
        education: typeof profileData?.education === 'string'
          ? profileData.education : JSON.stringify(profileData?.education || []),
        skills: Array.isArray(profileData?.skills) ? profileData.skills.join(', ') : profileData?.skills || '',
        workingStyle: profileData?.working_style, problemSolving: profileData?.problem_solving,
        uniqueStrength: profileData?.unique_strength, superpower: profileData?.superpower,
        energySources: profileData?.energy_sources, learningStyle: profileData?.learning_style,
        teamRole: profileData?.team_role, valuesExample: profileData?.values_example,
        careerGoals: profileData?.career_goals, bestProjectExample: profileData?.best_project_example,
        failureLesson: profileData?.failure_lesson,
        // ✅ käyttäjän valinta — palvelin tarkistaa silti plan==='premium' ENNEN kuin tämä pätee
        enableRAG: useRag,
        confirmedViolations: confirmedViolations || null,
        skipValidation: !!confirmedViolations,
        skipExperienceCheck: !!skipExperienceCheck, 
      };

      setStage('analyzing', 20);
      const response = await fetch("/api/generate-cover-letter", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = await response.json();
      setStage('generating', 50);
      setStage('finalizing', 80);

      if (response.status === 429) {
        cancelGeneration();
        toast.error(data.message || t.limitReached);
        return;
      }
// ✅ GAP: kokemuspuute löytyi → näytä modaali (ei virhe!)
      if (data.needsWarning && data.experienceGap) {
        setGapData(data.experienceGap);
        setShowGapModal(true);
        cancelGeneration();
        return;
      }

      if (data.success) {
        completeGeneration(data.coverLetterId || data.id);
        toast.success(t.success);
        refresh();
      } else {
        throw new Error(data.error || t.error);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      failGeneration(error.message || t.error);
      toast.error(t.error);
    }
  };

  const handleApproveViolations = async (approvedItems: any[]): Promise<void> => {
    setShowConfirmation(false);
    await handleGenerateLetter(approvedItems.map(item => ({ ...item, decision: 'approved' })));
  };
  const handleRejectViolations = () => {
    setShowConfirmation(false);
    toast.error(isFinnish ? "Generointi keskeytetty." : "Generation cancelled.");
  };
  const handleEditViolations = async (correctedItems: any[]): Promise<void> => {
    setShowConfirmation(false);
    await handleGenerateLetter(correctedItems.map(item => ({
      ...item, decision: item.corrected ? 'corrected' : 'approved',
      content: item.corrected || item.original, correctedContent: item.corrected,
    })));
  };

  if (!userLoaded || profileLoading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
      </div>
    );
  }

  const Header = ({ step, icon: Icon, title, help }: { step: number; icon: any; title: string; help?: string }) => (
    <div className="flex items-start gap-3 mb-6">
      <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-orange-500/15 border border-orange-500/25 text-orange-500 text-sm font-bold shrink-0">
        {step}
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
        </div>
        {help && <p className="text-xs text-muted-foreground mt-1">{help}</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        {/* HERO */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <Mail className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">AI Letter</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-foreground">
              {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{t.titleHighlight}</span> {t.titleEnd}
            </h1>
            <p className="text-muted-foreground">{t.subtitle}</p>
          </div>

          {/* AI-merkki */}
          <div className="bg-card border border-border p-4 rounded-2xl flex items-center gap-5">
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">{t.aiLeft}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-foreground">{status?.aiRemaining ?? '–'}</span>
                <span className="text-xs font-bold text-muted-foreground">/ {status?.aiLimit ?? '–'} · {status?.windowLabel ?? ''}</span>
              </div>
            </div>
            <div className="w-px h-9 bg-border" />
            <Crown className={`w-6 h-6 ${isPremium ? 'text-amber-400' : isPaid ? 'text-orange-500' : 'text-muted-foreground'}`} />
          </div>
        </div>

        {profileValidation && !profileValidation.isValid && (
          <div className="mb-8">
            <ProfileValidationBanner validation={profileValidation} context="cover_letter" language={isFinnish ? 'fi' : 'en'} />
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
                        : 'border-border bg-muted hover:border-foreground/20'
                    }`}
                  >
                    <type.icon className={`w-5 h-5 mb-3 ${letterType === type.id ? 'text-orange-500' : 'text-muted-foreground'}`} />
                    <p className="font-semibold text-foreground mb-1">{type.label}</p>
                    <p className="text-xs text-muted-foreground">{type.desc}</p>
                    {letterType === type.id && <CheckCircle className="absolute top-3 right-3 w-5 h-5 text-orange-500" />}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 2: KIELI & TYYLI */}
            <section className={SECTION}>
              <Header step={2} icon={Globe} title={t.sectionLanguage} />
              <div className="mb-7">
                <label className="block text-sm font-semibold text-foreground mb-1">{t.languageLabel}</label>
                <p className="text-xs text-muted-foreground mb-3">{t.languageHelp}</p>
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
                          : 'border-border bg-muted hover:border-foreground/20'
                      }`}
                    >
                      <div className="text-2xl mb-2">{lang.flag}</div>
                      <p className="font-semibold text-foreground text-sm">{lang.label}</p>
                      {letterLanguage === lang.id && <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1">{t.styleLabel}</label>
                <p className="text-xs text-muted-foreground mb-3">{t.styleHelp}</p>
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
                          : 'border-border bg-muted hover:border-foreground/20'
                      }`}
                    >
                      <styleOpt.icon className={`w-5 h-5 mb-2 ${letterStyle === styleOpt.id ? 'text-purple-400' : 'text-muted-foreground'}`} />
                      <p className="font-semibold text-foreground mb-0.5">{styleOpt.label}</p>
                      <p className="text-xs text-muted-foreground">{styleOpt.desc}</p>
                      {letterStyle === styleOpt.id && <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-purple-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* ✅ RAG — premium-only kytkin. Ei numeroitu vaihe (premium-lisäominaisuus). */}
            {isPremium && (
              <section className="bg-card border border-amber-500/30 rounded-3xl p-6 md:p-8">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/25 shrink-0">
                      <BookOpen className="w-4.5 h-4.5 text-amber-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{t.ragTitle}</h3>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-black uppercase tracking-wide text-amber-500">
                          <Crown className="w-3 h-3" />{t.ragBadge}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.ragDesc}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUseRag(v => !v)}
                    role="switch"
                    aria-checked={useRag}
                    className={`relative shrink-0 w-14 h-7 rounded-full transition-colors ${useRag ? 'bg-amber-500' : 'bg-muted'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${useRag ? 'translate-x-7' : ''}`} />
                  </button>
                </div>
              </section>
            )}

            {/* SECTION 3: ATS / JOB POSTING */}
            {letterType === 'job_specific' && (
              <>
                {!canUseATS && (
                  <section className="bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-3xl overflow-hidden">
                    <div className="p-6 md:p-8 cursor-pointer md:cursor-default" onClick={() => setShowPremiumBox(!showPremiumBox)}>
                      <div className="flex items-center gap-3">
                        <Lock className="w-5 h-5 text-amber-500" />
                        <div>
                          <h3 className="text-base font-semibold text-foreground">{t.sectionOptimization}</h3>
                          <p className="text-xs text-muted-foreground">
                            {isFinnish ? 'ATS-optimointi on maksullinen ominaisuus. Ilmaisversiossa voit luoda yleisen hakukirjeen.' : 'ATS optimization is a paid feature. Free users can create a general letter.'}
                          </p>
                        </div>
                        <a href="/pricing" className="ml-auto shrink-0 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold">Pro</a>
                      </div>
                    </div>
                  </section>
                )}

                {canUseATS && (
                  <section className={`rounded-3xl p-6 md:p-8 border ${
                    letterVersion === 'v2' && canUseV2 ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-card border-border'
                  }`}>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <Shield className={`w-9 h-9 p-2 rounded-xl border ${
                          letterVersion === 'v2' && canUseV2 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground border-border'
                        }`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-semibold text-foreground">{t.sectionOptimization}</h3>
                            {isPremium && <Crown className="w-4 h-4 text-amber-400" />}
                          </div>
                          <p className="text-xs text-muted-foreground">{t.atsToggle}</p>
                        </div>
                      </div>

                      {canUseV2 && (
                        <button
                          onClick={() => setLetterVersion(letterVersion === 'v2' ? 'v1' : 'v2')}
                          className={`relative w-14 h-7 rounded-full transition-colors ${letterVersion === 'v2' ? 'bg-emerald-500' : 'bg-muted'}`}
                        >
                          <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${letterVersion === 'v2' ? 'translate-x-7' : ''}`} />
                        </button>
                      )}

                      {!canUseV2 && canUseATS && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                          <Lock className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">V2: Premium</span>
                        </div>
                      )}
                    </div>

                    <textarea
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                      placeholder={t.jobPostingPlaceholder}
                      className="w-full h-48 bg-muted border border-border rounded-2xl p-5 text-sm text-foreground focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-muted-foreground"
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
                      className="w-full h-48 bg-muted border border-border rounded-2xl p-5 text-sm text-foreground focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-muted-foreground"
                    />
                  </section>
                )}
              </>
            )}

            {/* GENERAL: avoin hakemus */}
            {letterType === 'general' && (
              <section className={`${SECTION} space-y-5`}>
                <Header step={3} icon={Briefcase}
                  title={isFinnish ? 'Kohdeyritys (vapaaehtoinen)' : 'Target company (optional)'}
                  help={isFinnish ? 'Tee avoimesta hakemuksesta yksilöllinen juuri tälle yritykselle' : 'Make your open application specific to this company'} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={openAppCompany} onChange={(e) => setOpenAppCompany(e.target.value)}
                    placeholder={isFinnish ? 'Yritys, esim. Nokia' : 'Company, e.g. Nokia'}
                    className="w-full bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-orange-500/50 placeholder:text-muted-foreground" />
                  <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)}
                    placeholder={t.targetRolePlaceholder}
                    className="w-full bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-orange-500/50 placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">{isFinnish ? 'Miksi juuri tämä yritys?' : 'Why this company?'}</label>
                  <textarea value={companyMotivation} onChange={(e) => setCompanyMotivation(e.target.value)}
                    placeholder={isFinnish ? 'Esim. "Olen seurannut heidän kestävyystyötään". Omin sanoin — tämä tekee kirjeestä aidon.' : 'E.g. "I\'ve followed their sustainability work". In your own words.'}
                    className="w-full h-24 bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-muted-foreground" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">{isFinnish ? 'Tietoa yrityksestä (vapaaehtoinen)' : 'About the company (optional)'}</label>
                  <p className="text-xs text-muted-foreground mb-2">{isFinnish ? 'Liitä yrityksen "Tietoa meistä" -teksti. AI käyttää sitä tehdäkseen kirjeestä osuvan.' : 'Paste the company\'s "About us" text.'}</p>
                  <textarea value={companyAboutText} onChange={(e) => setCompanyAboutText(e.target.value)}
                    placeholder={isFinnish ? 'Liitä yrityksen esittelyteksti tähän…' : 'Paste the company description here…'}
                    className="w-full h-28 bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-orange-500/50 resize-none placeholder:text-muted-foreground"
                    maxLength={6000} />
                </div>
              </section>
            )}

            {/* SECTION 4: LISÄTIEDOT — järjestys korjattu (otsikko → textarea → varmista → tallenna) */}
            <section className={SECTION}>
              <Header step={4} icon={MessageSquarePlus} title={t.sectionAdditionalNotes} help={t.additionalNotesHelp} />

              {previousNotes && (
                <div className="mb-4 p-4 bg-purple-500/5 border border-purple-500/20 rounded-xl">
                  <p className="text-xs font-bold text-purple-500 dark:text-purple-300 mb-2 flex items-center gap-2">
                    <Info className="w-3 h-3" />{t.previousNotesLabel}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-200 italic">"{previousNotes}"</p>
                </div>
              )}

              <textarea value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder={t.additionalNotesPlaceholder}
                className="w-full h-28 bg-muted border border-border rounded-2xl p-4 text-sm text-foreground focus:outline-none focus:border-purple-400/60 resize-none placeholder:text-muted-foreground mb-3" />

              {/* mustInclude — heti textarean alla, koskee kirjoitettua ohjetta */}
              <label className="flex items-center gap-2 mb-3 cursor-pointer">
                <input type="checkbox" checked={mustInclude}
                  onChange={(e) => setMustInclude(e.target.checked)}
                  className="w-4 h-4 accent-orange-500" />
                <span className="text-xs font-semibold text-foreground">{t.mustIncludeLabel}</span>
              </label>

              {/* saveAdditionalNotes — eri käsite (tulevat kirjeet), omassa laatikossa */}
              <label className="flex items-start gap-3 p-3 bg-muted border border-border rounded-xl cursor-pointer hover:border-foreground/20 transition-colors">
                <input type="checkbox" checked={saveAdditionalNotes} onChange={(e) => setSaveAdditionalNotes(e.target.checked)}
                  className="w-5 h-5 accent-purple-600 rounded mt-0.5" />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-200 flex items-center gap-2">
                    <Save className="w-4 h-4" />{t.saveNotesCheckbox}
                  </span>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isFinnish ? 'AI käyttää näitä tietoja automaattisesti seuraavissa kirjeissä. Voit muokata profiilissa.' : 'AI will use this automatically in future letters. You can edit in profile.'}
                  </p>
                </div>
              </label>
            </section>

            {/* SECTION 5: VISUAALINEN POHJA */}
            <section className={SECTION}>
              <Header step={5} icon={Palette} title={t.sectionTemplate} help={t.sectionTemplateHelp} />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {TEMPLATES.map((tpl) => {
                  const selected = templateStyle === tpl.id;
                  return (
                    <button key={tpl.id} type="button" onClick={() => setTemplateStyle(tpl.id)}
                      className={`group relative rounded-2xl p-2 border text-left transition-all ${
                        selected ? 'border-orange-500/60 bg-orange-500/5 ring-2 ring-orange-500/30'
                                 : 'border-border bg-muted hover:border-foreground/25'
                      }`}>
                      <div className="relative rounded-lg overflow-hidden border border-black/10 shadow-sm bg-white">
                        <TemplateThumb id={tpl.id} accent={tpl.accent} />
                        {selected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center shadow">
                            <CheckCircle className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-1 px-1 pt-2">
                        <p className={`text-xs font-semibold truncate ${selected ? 'text-orange-600 dark:text-orange-300' : 'text-muted-foreground'}`}>{tpl.label}</p>
                        {tpl.badge && (
                          <span className="shrink-0 text-[8px] font-black uppercase tracking-wide text-violet-500 dark:text-violet-300 bg-violet-500/15 border border-violet-500/30 rounded px-1 py-0.5">{tpl.badge}</span>
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
              <div className="bg-card border border-border rounded-3xl p-7">
                <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-7">{t.summary}</h3>

                <div className="space-y-5 mb-8">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.aiLeft}</span>
                    <span className="text-foreground font-bold">{status?.aiRemaining ?? '–'}/{status?.aiLimit ?? '–'} · {status?.windowLabel ?? ''}</span>
                  </div>

                  <div className="pt-4 border-t border-border space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-muted-foreground">{t.sumLanguage}:</span>
                      <span className="text-foreground font-bold capitalize">{letterLanguage}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Palette className="w-4 h-4 text-purple-400" />
                      <span className="text-muted-foreground">{t.sumStyle}:</span>
                      <span className="text-foreground font-bold capitalize">{letterStyle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Palette className="w-4 h-4 text-indigo-400" />
                      <span className="text-muted-foreground">{t.sumTemplate}:</span>
                      <span className="text-indigo-500 dark:text-indigo-300 font-bold">{TEMPLATES.find(x => x.id === templateStyle)?.label || templateStyle}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="w-4 h-4 text-orange-400" />
                      <span className="text-muted-foreground">{t.sumType}:</span>
                      <span className="text-foreground font-bold uppercase">{apiType}</span>
                    </div>
                    {isPremium && useRag && (
                      <div className="flex items-center gap-2 text-xs">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span className="text-muted-foreground">{t.sumRag}:</span>
                        <span className="text-amber-500 dark:text-amber-300 font-bold">✓</span>
                      </div>
                    )}
                    {additionalNotes.trim() && (
                      <div className="flex items-center gap-2 text-xs">
                        <MessageSquarePlus className="w-4 h-4 text-purple-400" />
                        <span className="text-muted-foreground">{t.sumNotes}:</span>
                        <span className="text-purple-500 dark:text-purple-300 font-bold">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-5 border-t border-border">
                    <p className="text-lg font-black text-foreground">{isPaid ? t.planPaid : t.planFree}</p>
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
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-red-500 mb-1">{t.noProfile}</p>
                      <button onClick={() => router.push('/profile')} className="text-xs text-red-400 underline hover:text-red-300">
                        {isFinnish ? 'Täytä profiili →' : 'Complete profile →'}
                      </button>
                    </div>
                  </div>
                )}

                {!isPaid && (
                  <div className="mt-5 flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                    <Info className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-[11px] text-muted-foreground">{t.freeNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showConfirmation && pendingViolations && (
        <CVConfirmationModal
          violations={pendingViolations}
          onApprove={handleApproveViolations}
          onReject={handleRejectViolations}
          onEdit={handleEditViolations}
        />
      )}

       {/* ✅ GAP-MODAALI tähän */}
      {showGapModal && gapData && (
        <ExperienceGapModal
          gap={gapData}
          language={isFinnish ? 'fi' : 'en'}
          onProceed={async () => {
            setShowGapModal(false);
            await handleGenerateLetter(undefined, true);
          }}
          onCancel={() => {
            setShowGapModal(false);
            toast.info(isFinnish
              ? 'Voit täydentää profiiliasi ja yrittää uudelleen.'
              : 'You can complete your profile and try again.');
          }}
        />
      )}
    </div>
    
  );
}