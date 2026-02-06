"use client";

import { useState, useEffect, useMemo } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useGeneration, type GenerationQuestion } from '@/context/GenerationContext';
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
  Globe,
} from "lucide-react";

import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import CVConfirmationModal from "@/components/CVConfirmationModal";

// Domain tiedostot
import { ACTION_COSTS, PlanType, TokenAction } from "@/lib/domain/tokens";

type CVTemplate = "technical" | "creative" | "simple";
type LanguageOption = 'finnish' | 'english';

interface Violations {
  fabricatedSkills?: string[];
  fabricatedEducation?: string[];
  fabricatedExperience?: string[];
}

export default function CreateCVPage() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>("finnish");
  const [jobPosting, setJobPosting] = useState("");
  const [useATS, setUseATS] = useState(false);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingViolations, setPendingViolations] = useState<Violations | null>(null);

  const { 
    tokens, 
    plan_type, 
    features, 
    isLoading: tokensLoading 
  } = useTokens();

  const freeUsage = useFreeUsage();

  // ✅ GLOBAL GENERATION STATE
  const {
    state: generationState,
    startGeneration,
    setStage,
    setQuestions,
    setAnswer,
    completeGeneration,
    failGeneration,
    cancelGeneration,
    resetState,
    isGenerating,
  } = useGeneration();

  // ✅ CLEANUP: Reset CV state kun komponentti mountataan
  useEffect(() => {
    console.log('🧹 CV page mounted - resetting CV state');
    resetState('cv');
  }, []); // Tyhjä dependency array = ajetaan vain mountissa

  // ✅ TIMEOUT: Automaattinen reset jos generointi kestää yli 60s
  useEffect(() => {
    if (!isGenerating) return;

    const timeoutId = setTimeout(() => {
      if (isGenerating && generationState.stage !== 'complete') {
        console.error('⏰ Generation timeout - resetting state');
        failGeneration('Generointi kesti liian kauan (timeout)');
        toast.error('Generointi kesti liian kauan. Yritä uudelleen.');
      }
    }, 60000); // 60 sekuntia

    return () => clearTimeout(timeoutId);
  }, [isGenerating, generationState.stage]);

  // Local modal state
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);

  // Sync modal visibility with generation state
  useEffect(() => {
    console.log('🔄 [Modal Sync] useEffect triggered:', {
      stage: generationState.stage,
      questionsCount: generationState.questions.length,
      showQuestionsModal,
      shouldOpen: generationState.stage === 'waiting_questions' && generationState.questions.length > 0,
      shouldClose: generationState.stage === 'idle' || generationState.stage === 'complete'
    });
    
    if (generationState.stage === 'waiting_questions' && generationState.questions.length > 0) {
      console.log('✅ [Modal Sync] Opening questions modal');
      setShowQuestionsModal(true);
    } else if (generationState.stage === 'idle' || generationState.stage === 'complete') {
      console.log('🔒 [Modal Sync] Closing questions modal');
      setShowQuestionsModal(false);
    }
  }, [generationState.stage, generationState.questions.length]);

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

  const canCreateCV = () => {
    if (plan_type === 'free') {
      return !freeUsage.hasUsedCV && !freeUsage.isLoading;
    }
    return tokens >= costs.total;
  };

  // ✅ KORJATTU: handleGenerateCV
  const handleGenerateCV = async (
    finalAnswers?: Record<string, string>,
    skipConfirmation = false
  ) => {
    // ✅ GUARD: Estä duplikaatit
    if (isGenerating) {
      console.log('⚠️ Already generating, ignoring duplicate call');
      return;
    }

    if (!user) return toast.error("Kirjautuminen vaaditaan");
    if (!profileData) {
      toast.error("Täytä profiilitiedot ensin!");
      router.push("/profile");
      return;
    }

    if (!canCreateCV()) {
      const msg = plan_type === 'free' 
        ? 'Ilmainen kokeilu on jo käytetty.' 
        : `Tarvitset ${costs.total} tokenia.`;
      toast.error(msg);
      return;
    }

    try {
      // ✅ RESET: Jos tämä on uusi yritys kysymysten jälkeen
      if (finalAnswers && generationState.stage === 'waiting_questions') {
        console.log('🔄 Resetting state after questions answered');
      }

      startGeneration('cv', {
        templateType: selectedTemplate,
        language: selectedLanguage
      });

      const currentAnswers = finalAnswers || generationState.answers;
      const hasAnswers = Object.keys(currentAnswers).length > 0;
      
      // ✅ PARSE JSON ARRAYS - TURVALLINEN VERSIO
      const parseJsonField = (field: any): any[] => {
        // Jos null tai undefined, palauta tyhjä array
        if (field == null) return [];
        
        // Jos jo array, palauta se
        if (Array.isArray(field)) return field;
        
        // Jos string, yritä parsia
        if (typeof field === 'string') {
          // Tyhjä string → tyhjä array
          if (field.trim() === '') return [];
          
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
          } catch (e) {
            // Jos parse epäonnistuu, palauta tyhjä array
            return [];
          }
        }
        
        // Muu tyyppi → tyhjä array
        return [];
      };

      // ✅ CONVERT ARRAY TO STRING - TURVALLINEN VERSIO
      const arrayToString = (field: any): string => {
        // Jos null tai undefined, palauta tyhjä string
        if (field == null) return '';
        
        // Jos jo string, palauta se
        if (typeof field === 'string') return field;
        
        // Jos array, yhdistä pilkulla
        if (Array.isArray(field)) {
          return field
            .filter(item => item != null && item !== '') // Suodata pois null/undefined/tyhjät
            .join(', ');
        }
        
        // Muu tyyppi → tyhjä string
        return '';
      };

      // ✅ HELPER: Muunna arrayt API:n odottamaan string-muotoon
      const formatEducationForApi = (education: any): string => {
        if (!education) return '';
        const eduArray = Array.isArray(education) ? education : 
                         typeof education === 'string' ? JSON.parse(education) : [];
        
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
                          typeof workExperience === 'string' ? JSON.parse(workExperience) : [];
        
        return workArray
          .filter((work: any) => work.company || work.position)
          .map((work: any) => {
            let formatted = "";
            if (work.position && work.company) {
              formatted = `${work.position}, ${work.company}`;
            } else if (work.position) {
              formatted = work.position;
            } else if (work.company) {
              formatted = work.company;
            }

            if (work.duration) {
              formatted += ` (${work.duration})`;
            }

            if (work.description) {
              formatted += `\n${work.description}`;
            }

            return formatted;
          })
          .join("\n\n");
      };

      const requestBody = {
        profileData: {
          name: profileData?.name,
          email: profileData?.email,
          phone: profileData?.phone,
          location: profileData?.location,
          jobTitle: profileData?.job_title || profileData?.jobTitle,
          
          // ✅ STRING-MUOTO (sama kuin types/index.ts)
          education: formatEducationForApi(profileData?.education),
          workExperience: formatWorkExperienceForApi(profileData?.work_experience),
          skills: arrayToString(profileData?.skills),
          languages: arrayToString(profileData?.languages),
          hobbies: profileData?.hobbies || '',
          
          // Persoonallisuus
          workingStyle: profileData?.working_style || '',
          problemSolving: profileData?.problem_solving || '',
          energySources: profileData?.energy_sources || '',
          uniqueStrength: profileData?.unique_strength || '',
          learningStyle: profileData?.learning_style || '',
          teamRole: profileData?.team_role || '',
          valuesExample: profileData?.values_example || '',
          superpower: profileData?.superpower || '',
          
          // Storyt
          careerGoals: profileData?.career_goals || '',
          bestProjectExample: profileData?.best_project_example || '',
          failureLesson: profileData?.failure_lesson || '',
          
          // Kuvat
          profileImage: profileData?.profile_image || profileData?.profileImage,
          backgroundImage: profileData?.background_image || profileData?.backgroundImage,
        },
        cvType: selectedTemplate,
        language: selectedLanguage === 'english' ? 'english' : 'finnish',
        jobPosting: useATS ? jobPosting : undefined,
        enableRAG: false,
        answeredQuestions: hasAnswers 
          ? Object.entries(currentAnswers).map(([id, answer]) => ({
              id,
              question: generationState.questions.find((q: GenerationQuestion) => q.id === id)?.question || '',
              answer
            }))
          : [],
        skipQuestions: hasAnswers,
        skipConfirmation,
      };

      console.log('📤 Sending CV generation request:', {
        cvType: requestBody.cvType,
        language: requestBody.language,
        hasJobPosting: !!requestBody.jobPosting,
        hasAnswers: hasAnswers,
        answerCount: requestBody.answeredQuestions?.length || 0,
        profileData: {
          hasName: !!requestBody.profileData.name,
          hasEmail: !!requestBody.profileData.email,
          educationType: typeof requestBody.profileData.education,
          educationLength: requestBody.profileData.education?.length || 0,
          workExpType: typeof requestBody.profileData.workExperience,
          workExpLength: requestBody.profileData.workExperience?.length || 0,
          skillsType: typeof requestBody.profileData.skills,
        }
      });

      setStage('analyzing', 20);

      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      // Handle questions
      if (result.needsMoreInfo && result.questions?.length > 0) {
        console.log('❓ AI kysyy lisäkysymyksiä:', result.questions.length);
        console.log('📝 Kysymykset:', result.questions);
        
        setQuestions(result.questions);
        setStage('waiting_questions', 30);
        
        // ✅ PAKKO-AVAUS: Varmista että modaali avautuu
        setTimeout(() => {
          console.log('🔓 Avataan kysymysmodaali');
          setShowQuestionsModal(true);
        }, 100);
        
        return;
      }

      // Handle confirmation
      if (result.needsConfirmation && !skipConfirmation) {
        console.log('⚠️ Tarvitaan käyttäjän vahvistus');
        setPendingViolations(result.violations);
        setShowConfirmation(true);
        cancelGeneration();
        return;
      }

      setStage('generating', 50);
      setTimeout(() => setStage('generating', 70), 2000);
      setTimeout(() => setStage('finalizing', 90), 4000);

      if (response.ok && (result.id || result.cvId)) {
        completeGeneration(result.id || result.cvId);
        toast.success("✅ CV luotu onnistuneesti!");
      } else {
        throw new Error(result.error || result.message || 'Tuntematon virhe');
      }
    } catch (error: any) {
      console.error('❌ CV generation error:', error);
      failGeneration(error.message || 'CV:n luonti epäonnistui');
      toast.error(error.message || 'CV:n luonti epäonnistui');
    }
  };

  const handleApproveViolations = async (items: any[]) => {
    setShowConfirmation(false);
    await handleGenerateCV(generationState.answers, true);
  };

  const handleRejectViolations = async () => {
    setShowConfirmation(false);
    setPendingViolations(null);
    toast.info('Generointi peruutettu.');
  };

  const handleEditViolations = async () => {
    setShowConfirmation(false);
    router.push("/profile");
  };

  // ✅ KORJATTU: Submit-funktio modalille
  const handleSubmitQuestions = async () => {
    console.log('📝 Submitting answers:', generationState.answers);
    
    // ✅ GUARD: Jos jo generoidaan, älä tee mitään
    if (isGenerating && generationState.stage !== 'waiting_questions') {
      console.log('⚠️ Already generating (not in question state), ignoring');
      return;
    }
    
    // Tarkista että kaikki kysymykset on vastattu
    const unansweredQuestions = generationState.questions.filter(
      (q: GenerationQuestion) => !generationState.answers[q.id]?.trim()
    );

    if (unansweredQuestions.length > 0) {
      toast.error(`Vastaa kaikkiin kysymyksiin (${unansweredQuestions.length} puuttuu)`);
      return;
    }

    // Sulje modaali
    setShowQuestionsModal(false);
    
    // ✅ ANNA HETKINEN ENNEN UUTTA GENEROINTIA
    setTimeout(() => {
      handleGenerateCV(generationState.answers);
    }, 300);
  };

  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">
          Ladataan työkaluja...
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
                AI CV Builder
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Luo <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Vaikuttava</span> CV.
            </h1>
            <p className="text-gray-400 max-w-xl text-base sm:text-lg font-medium leading-relaxed">
              Anna tekoälyn hioa kokemuksestasi timanttinen esitys. Valitse tyyli ja anna palaa.
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex items-center gap-4 sm:gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Saldosi</p>
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
                <h3 className="text-lg sm:text-xl font-bold text-white">1. Valitse visuaalinen linja</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                {[
                  { id: "simple", label: "Rento", desc: "Tarinallinen ja helposti lähestyttävä.", icon: Info },
                  { id: "technical", label: "Pro", desc: "Suoraviivainen ja faktoihin keskittyvä.", icon: Target },
                  { id: "creative", label: "Luova", desc: "Erottuva tyyli joka jää mieleen.", icon: Zap },
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

            {/* 2. KIELI */}
            <section className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/50 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-10">
              <div className="flex items-center gap-3 mb-6 sm:mb-8">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">2. Valitse kieli</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <button
                  onClick={() => setSelectedLanguage('finnish')}
                  className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 group ${
                    selectedLanguage === 'finnish'
                      ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                      : 'border-gray-800 bg-black/20 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🇫🇮</span>
                    <p className="font-bold text-white text-sm sm:text-base">Suomi</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">CV luodaan suomeksi</p>
                  {selectedLanguage === 'finnish' && (
                    <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
                  )}
                </button>

                <button
                  onClick={() => setSelectedLanguage('english')}
                  className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border text-left transition-all duration-300 group relative ${
                    selectedLanguage === 'english'
                      ? 'border-blue-500/50 bg-blue-500/5 shadow-[0_0_30px_rgba(59,130,246,0.1)]'
                      : 'border-gray-800 bg-black/20 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🇬🇧</span>
                    <p className="font-bold text-white text-sm sm:text-base">English</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">CV will be in English</p>
                  {selectedLanguage === 'english' && (
                    <CheckCircle className="absolute top-3 right-3 w-4 h-4 text-blue-500" />
                  )}
                </button>
              </div>
            </section>

            {/* 3. ATS OPTIMOINTI */}
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
                    <h3 className="text-lg sm:text-xl font-bold text-white">3. Kohdistaminen (ATS)</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Optimoi tietylle työpaikalle</p>
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
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Premium</span>
                  </div>
                )}
              </div>

              {useATS && (
                <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl sm:rounded-2xl flex gap-2 sm:gap-3">
                    <Info className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200/70 leading-relaxed">
                      Liitä työpaikkailmoitus alle. AI analysoi vaatimukset ja nostaa esiin juuri ne taidot, joita työnantaja etsii.
                    </p>
                  </div>
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder="Esim. 'Haemme kokenutta full-stack kehittäjää...'"
                    className="w-full h-36 sm:h-48 bg-black/40 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 resize-none"
                  />
                </div>
              )}
            </section>
          </div>

          {/* OIKEA: YHTEENVETO */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-12 space-y-4 sm:space-y-6">
              <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800 rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-8 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-6 sm:mb-8">Yhteenveto</h3>
                
                <div className="space-y-4 sm:space-y-5 mb-8 sm:mb-10">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400 font-medium">CV Generointi</span>
                    <span className="text-white font-bold">{plan_type === 'free' ? '0' : costs.basic} TKN</span>
                  </div>
                  
                  {useATS && (
                    <div className="flex justify-between items-center text-sm animate-in slide-in-from-right-4">
                      <span className="text-emerald-400 font-medium flex items-center gap-2">
                        <CheckCircle className="w-3.5 h-3.5" /> ATS-lisä
                      </span>
                      <span className="text-emerald-400 font-bold">+{costs.ats} TKN</span>
                    </div>
                  )}

                  <div className="pt-4 sm:pt-5 border-t border-gray-800 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Kustannus</p>
                      <p className="text-2xl sm:text-3xl font-black text-white">
                        {plan_type === 'free' ? 'ILMAINEN' : `${costs.total}`}
                        {plan_type !== 'free' && <span className="text-xs text-orange-500 ml-1">TKN</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateCV()}
                  disabled={isGenerating || (useATS && !jobPosting.trim())}
                  className="w-full py-6 sm:py-8 bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] text-white rounded-xl sm:rounded-2xl font-black text-base sm:text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                >
                  {isGenerating ? (
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                      <span>Generoidaan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-12 transition-transform" />
                      <span>Luo CV nyt</span>
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-1 opacity-50 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </Button>

                {plan_type === 'free' && (
                  <div className="mt-4 sm:mt-6 flex gap-2 sm:gap-3 p-3 sm:p-4 bg-orange-500/5 rounded-xl sm:rounded-2xl border border-orange-500/10">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                      Ilmaiskäyttäjänä voit luoda yhden CV:n. Se ei tallennu pysyvästi ilman tilausta.
                    </p>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-3 sm:py-4 bg-white/5 border border-white/5 rounded-2xl sm:rounded-3xl">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed font-medium">
                  Prosessi kestää noin 30 sekuntia. Tekoäly saattaa kysyä tarkentavia kysymyksiä.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ KORJATTU KYSYMYSMODAALI */}
      {showQuestionsModal && generationState.questions.length > 0 && (() => {
        // Debug info - voidaan poistaa tuotannossa
        console.log('🔍 Modal state:', {
          isGenerating,
          stage: generationState.stage,
          questionsCount: generationState.questions.length,
          answersCount: Object.keys(generationState.answers).length,
          buttonWillBeDisabled: isGenerating && generationState.stage !== 'waiting_questions'
        });
        return null;
      })()}
      
      {showQuestionsModal && generationState.questions.length > 0 && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isGenerating && setShowQuestionsModal(false)} />
          <div className="relative bg-[#0d1117] border border-gray-800 w-full max-w-2xl rounded-2xl sm:rounded-[2.5rem] p-6 sm:p-10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent" />
            
            <h3 className="text-xl sm:text-2xl font-black text-white mb-2 flex items-center gap-3">
              <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-orange-500" />
              Tarkennetaanko hieman?
            </h3>
            <p className="text-gray-400 text-sm mb-8 sm:mb-10">
              AI haluaa varmistaa, että CV:stä tulee mahdollisimman vakuuttava.
            </p>

            {/* ✅ HÄTÄNAPPI: Jos state on rikki */}
            {isGenerating && generationState.stage !== 'waiting_questions' && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <p className="text-red-400 text-sm mb-3">
                  ⚠️ Generointi on jumissa. Yritä resetoida:
                </p>
                <button
                  onClick={() => {
                    cancelGeneration();
                    setShowQuestionsModal(false);
                    toast.info('State resetoitu. Yritä uudelleen.');
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold"
                >
                  Resetoi ja sulje
                </button>
              </div>
            )}

            <div className="space-y-6 sm:space-y-8 max-h-[50vh] overflow-y-auto pr-2 sm:pr-4 custom-scrollbar">
              {generationState.questions.map((q: GenerationQuestion) => (
                <div key={q.id} className="space-y-3 sm:space-y-4 group">
                  <label className="text-sm font-bold text-gray-200 block transition-colors group-focus-within:text-orange-400">
                    {q.question}
                  </label>
                  {q.why && (
                    <div className="flex gap-2 items-start text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                      <span className="text-orange-500/50">Miksi:</span>
                      <span>{q.why}</span>
                    </div>
                  )}
                  <textarea
                    className="w-full bg-black/40 border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all min-h-[100px] resize-none"
                    value={generationState.answers[q.id] || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="Vastaa tähän..."
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 sm:gap-4 mt-8 sm:mt-10">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl sm:rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 h-12 sm:h-14 font-bold text-sm sm:text-base"
                onClick={() => {
                  setShowQuestionsModal(false);
                  // ✅ Peruuta generointi jos kysytään kysymyksiä
                  if (generationState.stage === 'waiting_questions') {
                    cancelGeneration();
                  }
                }}
                disabled={isGenerating && generationState.stage !== 'waiting_questions'}
              >
                Sulje
              </Button>
              <Button 
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-xl sm:rounded-2xl h-12 sm:h-14 font-black text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitQuestions}
                disabled={isGenerating && generationState.stage !== 'waiting_questions'}
              >
                {isGenerating && generationState.stage !== 'waiting_questions' ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Viimeistellään...</span>
                  </div>
                ) : (
                  'Valmista tuli'
                )}
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