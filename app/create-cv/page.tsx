// app/create-cv/page.tsx — light/dark + free/pro (ei tokeneita); generointilogiikka säilytetty
"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useGeneration, GenerationQuestion } from '@/context/GenerationContext';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Sparkles, FileText, Crown, CheckCircle, ArrowRight,
  Info, AlertCircle, Loader2, Briefcase, Globe,
  CheckCircle2, Zap
} from "lucide-react";
import { validateProfile } from '@/lib/profileValidation';
import ProfileValidationBanner from '@/components/ProfileValidationBanner';
import CVQuestionsModal from '@/components/CVQuestionsModal';
import { usePlanStatus } from "@/hooks/usePlanStatus"; // ✅ tokeneista plan-statukseen
import { useLanguage } from '@/context/LanguageContext';

type CVTemplate = "simple" | "technical" | "creative";
type CVLanguage = "finnish" | "english";

export default function CreateCVPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { language } = useLanguage();

  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [confirmedTemplate, setConfirmedTemplate] = useState<CVTemplate>("simple");
  const [selectedLanguage, setSelectedLanguage] = useState<CVLanguage>("finnish");
  const [useATS, setUseATS] = useState(false);
  const [jobPosting, setJobPosting] = useState("");

  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [localQuestions, setLocalQuestions] = useState<GenerationQuestion[]>([]);
  const [preFilled, setPreFilled] = useState<Record<string, boolean>>({});

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<any[]>([]);
  const [skipConfirmation, setSkipConfirmation] = useState(false);

  // ✅ Plan-status (ei tokeneita)
  const { status, loading: planLoading, isPaid, refresh } = usePlanStatus();

  const {
    cvState,
    startGeneration,
    setStage,
    setQuestions,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    resetState,
    isGenerating,
  } = useGeneration();

  const isFinnish = language === 'fi' || (language as string) === 'finnish';

  const profileValidation = useMemo(() => {
    if (!profileData) return null;
    return validateProfile(profileData);
  }, [profileData]);

  const t = {
    en: {
      title: "Create a", titleHighlight: "Professional", titleEnd: "CV.",
      subtitle: "Let AI build your perfect resume.",
      aiLeft: "AI generations left", planFree: "Free · 1 AI / week", planPaid: "Active plan",
      sectionTemplate: "1. CV Template", sectionLanguage: "2. Language", sectionOptimization: "3. ATS Optimization (Optional)",
      simple: "Simple", simpleDesc: "Clean and minimal",
      technical: "Technical", technicalDesc: "For IT professionals",
      professional: "Creative", professionalDesc: "Visually stunning",
      languageLabel: "CV Language", languageHelp: "Which language should the CV be written in?",
      atsToggle: "Optimize for ATS", atsInfo: "Paste job posting. AI will analyze and optimize.",
      jobPostingPlaceholder: "Paste job posting here...",
      summary: "Summary", cost: "Plan", generateNow: "Create CV Now", generating: "Generating...",
      noProfile: "Complete your profile first!",
      success: "✅ CV created successfully!", error: "An error occurred during generation",
      limitReached: "Weekly AI limit reached. Upgrade to Pro for more.",
      freeNote: "Free plan: 1 AI generation per week.",
      simpleFeatures: ['Basic layout', 'Easy to read', 'ATS-friendly'],
      technicalFeatures: ['Technical style', 'Project listings', 'Skill categories'],
      creativeFeatures: ['Premium design', 'Background color', 'Profile image'],
    },
    fi: {
      title: "Luo", titleHighlight: "Ammattimainen", titleEnd: "CV.",
      subtitle: "Anna AI:n rakentaa täydellinen ansioluettelo.",
      aiLeft: "AI-luonnit jäljellä", planFree: "Ilmainen · 1 AI / viikko", planPaid: "Aktiivinen tilaus",
      sectionTemplate: "1. CV-pohja", sectionLanguage: "2. Kieli", sectionOptimization: "3. ATS-optimointi (Valinnainen)",
      simple: "Yksinkertainen", simpleDesc: "Selkeä ja minimalistinen",
      technical: "Tekninen", technicalDesc: "IT-ammattilaisille",
      professional: "Luova", professionalDesc: "Visuaalisesti upea",
      languageLabel: "CV:n kieli", languageHelp: "Millä kielellä CV kirjoitetaan?",
      atsToggle: "Optimoi ATS:lle", atsInfo: "Liitä työpaikkailmoitus. AI analysoi ja optimoi.",
      jobPostingPlaceholder: "Liitä työpaikkailmoitus tähän...",
      summary: "Yhteenveto", cost: "Tilaus", generateNow: "Luo CV Nyt", generating: "Generoidaan...",
      noProfile: "Täydennä profiili ensin!",
      success: "✅ CV luotu onnistuneesti!", error: "Tapahtui virhe generoinnissa",
      limitReached: "Viikon AI-raja täynnä. Päivitä Pro:ksi saadaksesi lisää.",
      freeNote: "Ilmaisversio: 1 AI-luonti viikossa.",
      simpleFeatures: ['Perus layout', 'Helppolukuinen', 'ATS-ystävällinen'],
      technicalFeatures: ['Tekninen tyyli', 'Projektilistaukset', 'Osaamisalueet'],
      creativeFeatures: ['Premium design', 'Taustaväri', 'Profiilikuva'],
    }
  }[isFinnish ? 'fi' : 'en'];

  useEffect(() => {
    resetState('cv');
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!isGenerating) return;
    const timeoutId = setTimeout(() => {
      if (isGenerating && cvState.stage !== 'complete') {
        failGeneration(isFinnish ? 'Generointi kesti yli 5 minuuttia' : 'Generation timed out');
        toast.error(isFinnish ? 'Generointi kesti yli 5 minuuttia. Yritä uudelleen.' : 'Generation timed out. Try again.');
      }
    }, 300000);
    return () => clearTimeout(timeoutId);
  }, [isGenerating, cvState.stage]);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      try {
        setProfileLoading(true);
        const response = await fetch(`/api/user-profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          setProfileData(data.profile || data);
        }
      } catch (error) {
        console.error("Profile load error:", error);
      } finally {
        setProfileLoading(false);
      }
    };
    if (userLoaded && user) loadProfile();
  }, [userLoaded, user]);

  const fetchSavedResponses = async () => {
    try {
      const res = await fetch('/api/user-responses?context=cv_generation&limit=100');
      const data = await res.json();
      if (data.success && data.responses) {
        const savedMap: Record<string, string> = {};
        data.responses.forEach((r: any) => { savedMap[r.question_text] = r.answer; });
        return savedMap;
      }
    } catch (error) {
      console.error('Error fetching saved responses:', error);
    }
    return {};
  };

  const saveResponse = async (questionText: string, answer: string, category: string) => {
    try {
      await fetch('/api/user-responses/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionText, answer, category, context: 'cv_generation', jobTitle: null })
      });
    } catch (error) {
      console.error('Error saving response:', error);
    }
  };

  const handleSubmitQuestions = async (questionAnswers: Array<{
    id: string; question: string; answer: string;
    answerType: 'use' | 'mention' | 'interested' | 'skip'; shouldSave: boolean; category: string;
  }>) => {
    for (const qa of questionAnswers) {
      if (qa.shouldSave && qa.answer) await saveResponse(qa.question, qa.answer, qa.category);
    }
    setShowQuestionsModal(false);
    const simpleAnswers: Record<string, string> = {};
    questionAnswers.forEach(qa => { if (qa.answer) simpleAnswers[qa.id] = qa.answer; });
    setTimeout(() => handleGenerateCV(simpleAnswers), 300);
  };

  const handleGenerateCV = async (
    finalAnswers?: Record<string, string>,
    skipQuestionsExplicitly = false
  ) => {
    if (!profileValidation?.isValid) { toast.error(t.noProfile); return; }
    if (!user || !profileData) { toast.error(t.noProfile); return; }

    try {
      const savedResponses = await fetchSavedResponses();
      const currentAnswers = finalAnswers || {};
      const hasAnswers = Object.keys(currentAnswers).length > 0;

      if (!hasAnswers && !skipQuestionsExplicitly) {
        setConfirmedTemplate(selectedTemplate);
        startGeneration('cv', { templateType: selectedTemplate, language: selectedLanguage });
      }

      const cvTypeToUse: CVTemplate = (hasAnswers || skipQuestionsExplicitly)
        ? confirmedTemplate
        : selectedTemplate;

      const formatEducationForApi = (education: any): string => {
        if (!education) return '';
        const eduArray = Array.isArray(education) ? education :
          typeof education === 'string' ? (() => { try { return JSON.parse(education); } catch { return []; } })() : [];
        return eduArray
          .filter((edu: any) => edu.school && edu.degree)
          .map((edu: any) => {
            const period = edu.isOngoing ? `${edu.year} - Kesken` : edu.year;
            return `${edu.degree}, ${edu.school}${period ? ` (${period})` : ""}`;
          })
          .join("\n");
      };
      const formatWorkExperienceForApi = (workExperience: any): string => {
        if (!workExperience) return '';
        const workArray = Array.isArray(workExperience) ? workExperience :
          typeof workExperience === 'string' ? (() => { try { return JSON.parse(workExperience); } catch { return []; } })() : [];
        return workArray
          .filter((work: any) => work.company || work.position)
          .map((work: any) => {
            let formatted = work.position && work.company ? `${work.position}, ${work.company}` : work.position || work.company || "";
            if (work.duration) formatted += ` (${work.duration})`;
            if (work.description) formatted += `\n${work.description}`;
            return formatted;
          })
          .join("\n\n");
      };
      const formatSkillsForApi = (skills: any): string => {
        if (!skills) return '';
        if (Array.isArray(skills)) {
          if (skills.length > 0 && typeof skills[0] === 'object' && skills[0].name) {
            return skills.map((s: any) => s.name).filter(Boolean).join(', ');
          }
          return skills.filter(Boolean).join(', ');
        }
        if (typeof skills === 'string') return skills;
        return '';
      };
      const formatLanguagesForApi = (languages: any): string => {
        if (!languages) return '';
        if (Array.isArray(languages)) return languages.filter(Boolean).join(', ');
        if (typeof languages === 'string') return languages;
        return '';
      };

      const requestBody = {
        profileData: {
          name: profileData?.name, email: profileData?.email, phone: profileData?.phone, location: profileData?.location,
          jobTitle: profileData?.job_title || profileData?.jobTitle,
          education: formatEducationForApi(profileData?.education),
          workExperience: formatWorkExperienceForApi(profileData?.work_experience),
          skills: formatSkillsForApi(profileData?.skills),
          languages: formatLanguagesForApi(profileData?.languages),
          hobbies: profileData?.hobbies || '', workingStyle: profileData?.working_style || '',
          problemSolving: profileData?.problem_solving || '', energySources: profileData?.energy_sources || '',
          uniqueStrength: profileData?.unique_strength || '', learningStyle: profileData?.learning_style || '',
          teamRole: profileData?.team_role || '', valuesExample: profileData?.values_example || '',
          superpower: profileData?.superpower || '', careerGoals: profileData?.career_goals || '',
          bestProjectExample: profileData?.best_project_example || '', failureLesson: profileData?.failure_lesson || '',
          profileImage: profileData?.profile_image || profileData?.profileImage,
          backgroundImage: profileData?.background_image || profileData?.backgroundImage,
        },
        cvType: cvTypeToUse,
        language: selectedLanguage === 'english' ? 'english' : 'finnish',
        jobPosting: useATS ? jobPosting : undefined,
        enableRAG: false,
        answeredQuestions: hasAnswers
          ? Object.entries(currentAnswers).map(([id, answer]) => ({
              id, question: localQuestions.find((q: GenerationQuestion) => q.id === id)?.question || '', answer
            }))
          : [],
        skipQuestions: hasAnswers || skipQuestionsExplicitly,
        skipConfirmation,
      };

      if (hasAnswers) setStage('analyzing', 20);

      const response = await fetch('/api/generate-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (hasAnswers) setStage('generating', 50);
      const result = await response.json();
      if (hasAnswers) setStage('finalizing', 80);

      // ✅ FREE/PRO: viikkoraja täynnä
      if (response.status === 429) {
        cancelGeneration();
        toast.error(result.message || t.limitReached);
        return;
      }

      // Lisäkysymykset
      if (result.needsMoreInfo && result.questions?.length > 0) {
        if (!hasAnswers) cancelGeneration();
        const preFilledFlags: Record<string, boolean> = {};
        result.questions.forEach((q: GenerationQuestion) => {
          if (savedResponses[q.question]) preFilledFlags[q.id] = true;
        });
        setLocalQuestions(result.questions);
        setPreFilled(preFilledFlags);
        setQuestions(result.questions);
        setShowQuestionsModal(true);
        return;
      }

      // Vahvistus
      if (result.needsConfirmation && !skipConfirmation) {
        setPendingViolations(result.violations);
        setShowConfirmation(true);
        cancelGeneration();
        return;
      }

      // Onnistui
      if (result.success && result.cvId) {
        completeGeneration(result.cvId);
        toast.success(t.success);
        refresh(); // ✅ päivitä jäljellä oleva AI-määrä
        setTimeout(() => router.push(`/edit-cv/${result.cvId}`), 500);
      } else {
        throw new Error(result.error || t.error);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      failGeneration(error.message || t.error);
      toast.error(t.error);
    }
  };

  if (!userLoaded || profileLoading || planLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-12">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">AI CV</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white">
              {t.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">{t.titleHighlight}</span> {t.titleEnd}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">{t.subtitle}</p>
          </div>

          {/* ✅ AI-merkki (ei TKN-pilleriä) */}
          <div className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 p-5 rounded-3xl flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.aiLeft}</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-gray-900 dark:text-white">{status?.aiRemaining ?? '–'}</span>
                <span className="text-xs font-bold text-gray-400">/ {status?.aiLimit ?? '–'} · {status?.windowLabel ?? ''}</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-200 dark:bg-gray-800" />
            <Crown className={`w-6 h-6 ${status?.plan === 'premium' ? 'text-amber-400' : isPaid ? 'text-orange-500' : 'text-gray-400 dark:text-gray-600'}`} />
          </div>
        </div>

        {profileValidation && !profileValidation.isValid && (
          <div className="mb-10">
            <ProfileValidationBanner validation={profileValidation} context="cv" language={isFinnish ? 'fi' : 'en'} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-10">

            {/* SECTION 1: TEMPLATE */}
            <section className="bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center gap-3 mb-8">
                <Briefcase className="w-10 h-10 p-2 rounded-2xl bg-orange-500/20 text-orange-500 border border-orange-500/30" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.sectionTemplate}</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { id: "simple" as CVTemplate, label: t.simple, desc: t.simpleDesc, icon: FileText, features: t.simpleFeatures },
                  { id: "technical" as CVTemplate, label: t.technical, desc: t.technicalDesc, icon: Briefcase, features: t.technicalFeatures },
                  { id: "creative" as CVTemplate, label: t.professional, desc: t.professionalDesc, icon: Crown, features: t.creativeFeatures },
                ].map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setSelectedTemplate(template.id)}
                    className={`relative p-6 rounded-3xl border text-left transition-all ${
                      selectedTemplate === template.id
                        ? 'border-orange-500/50 bg-orange-500/5'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 hover:border-gray-300 dark:hover:border-gray-700'
                    }`}
                  >
                    <template.icon className={`w-6 h-6 mb-4 ${selectedTemplate === template.id ? 'text-orange-500' : 'text-gray-400 dark:text-gray-500'}`} />
                    <p className="font-bold text-gray-900 dark:text-white mb-2">{template.label}</p>
                    <p className="text-xs text-gray-500 mb-3">{template.desc}</p>
                    <ul className="space-y-1">
                      {template.features.map((f, i) => (
                        <li key={i} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-orange-400" />{f}
                        </li>
                      ))}
                    </ul>
                    {selectedTemplate === template.id && <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-orange-500" />}
                  </button>
                ))}
              </div>
            </section>

            {/* SECTION 2: LANGUAGE */}
            <section className="bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-center gap-3 mb-8">
                <Globe className="w-10 h-10 p-2 rounded-2xl bg-blue-500/20 text-blue-500 border border-blue-500/30" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t.sectionLanguage}</h3>
              </div>
              <div className="mb-8">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">{t.languageLabel}</label>
                <p className="text-xs text-gray-500 mb-4">{t.languageHelp}</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'finnish', label: 'Suomi', flag: '🇫🇮' },
                    { id: 'english', label: 'English', flag: '🇬🇧' },
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => setSelectedLanguage(lang.id as CVLanguage)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${
                        selectedLanguage === lang.id
                          ? 'border-blue-500/50 bg-blue-500/10'
                          : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-black/20 hover:border-gray-300 dark:hover:border-gray-700'
                      }`}
                    >
                      <div className="text-2xl mb-2">{lang.flag}</div>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{lang.label}</p>
                      {selectedLanguage === lang.id && <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* SECTION 3: ATS OPTIMIZATION */}
            <section className="bg-white dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800/50 rounded-[2.5rem] p-10">
              <div className="flex items-start gap-4 mb-6">
                <input type="checkbox" checked={useATS} onChange={(e) => setUseATS(e.target.checked)} className="w-5 h-5 rounded mt-1 accent-orange-500" id="ats-cv-checkbox" />
                <div className="flex-1">
                  <label htmlFor="ats-cv-checkbox" className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer block mb-2">
                    {t.atsToggle} 🎯
                  </label>
                  <p className="text-xs text-gray-500">{t.atsInfo}</p>
                </div>
              </div>
              {useATS && (
                <textarea
                  value={jobPosting}
                  onChange={(e) => setJobPosting(e.target.value)}
                  placeholder={t.jobPostingPlaceholder}
                  className="w-full h-48 bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-3xl p-6 text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:border-orange-500/50 resize-none mt-4"
                />
              )}
            </section>

          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12">
              <div className="bg-white dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-8">
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8">{t.summary}</h3>

                <div className="space-y-5 mb-10">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{t.aiLeft}</span>
                    <span className="text-gray-900 dark:text-white font-bold">
                      {status?.aiRemaining ?? '–'}/{status?.aiLimit ?? '–'} · {status?.windowLabel ?? ''}
                    </span>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs">
                      <FileText className="w-4 h-4 text-orange-400" />
                      <span className="text-gray-500">{isFinnish ? 'Pohja:' : 'Template:'}</span>
                      <span className="text-gray-900 dark:text-white font-bold capitalize">{selectedTemplate}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Globe className="w-4 h-4 text-blue-400" />
                      <span className="text-gray-500">{isFinnish ? 'Kieli:' : 'Language:'}</span>
                      <span className="text-gray-900 dark:text-white font-bold capitalize">{selectedLanguage}</span>
                    </div>
                  </div>

                  <div className="pt-5 border-t border-gray-200 dark:border-gray-800">
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">{t.cost}</p>
                    <p className="text-lg font-black text-gray-900 dark:text-white">
                      {isPaid ? t.planPaid : t.planFree}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateCV()}
                  disabled={isGenerating || !profileValidation?.isValid}
                  className="w-full py-8 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02]"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      {t.generating}
                      {cvState.progress > 0 && <span className="ml-2 text-xs opacity-80">({cvState.progress}%)</span>}
                    </>
                  ) : (
                    <><Sparkles className="w-5 h-5 mr-2" />{t.generateNow}<ArrowRight className="w-5 h-5 ml-2 opacity-50" /></>
                  )}
                </Button>

                {!profileValidation?.isValid && (
                  <div className="mt-6 flex gap-3 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
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
                    <p className="text-[11px] text-gray-500">{t.freeNote}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KYSYMYSMODAALI */}
      {showQuestionsModal && localQuestions.length > 0 && (
        <CVQuestionsModal
          questions={localQuestions}
          preFilled={preFilled}
          onSubmit={handleSubmitQuestions}
          onCancel={() => {
            setShowQuestionsModal(false);
            setTimeout(() => handleGenerateCV({}, true), 300);
          }}
        />
      )}

      {/* VAHVISTUSMODAALI (overlay — pidetään tummana molemmissa) */}
      {showConfirmation && pendingViolations.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" />
          <div className="relative bg-gradient-to-br from-gray-900/95 via-slate-900/95 to-gray-900/95 backdrop-blur-2xl rounded-3xl border-2 border-red-400/30 shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-orange-600 p-6">
              <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                {isFinnish ? 'Vahvista tiedot' : 'Confirm details'}
              </h2>
              <p className="text-white/90">
                {isFinnish ? 'CV sisältää tietoja joita ei löydy profiilista' : 'CV contains information not found in profile'}
              </p>
            </div>
            <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
              {pendingViolations.map((v, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs font-bold text-red-400 uppercase">{v.type}</span>
                    <span className="text-xs text-gray-400">{v.severity}</span>
                  </div>
                  <p className="text-sm text-gray-200 mb-2">{v.content}</p>
                  <p className="text-xs text-gray-400">{v.reason}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4 p-6 border-t border-white/10">
              <Button variant="ghost" className="flex-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 h-12 font-bold"
                onClick={() => { setShowConfirmation(false); setPendingViolations([]); }}>
                {isFinnish ? 'Peruuta' : 'Cancel'}
              </Button>
              <Button className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-black"
                onClick={() => { setShowConfirmation(false); setSkipConfirmation(true); handleGenerateCV(); }}>
                {isFinnish ? 'Hyväksy ja jatka' : 'Accept and continue'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}