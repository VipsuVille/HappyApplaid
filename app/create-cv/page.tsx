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
} from "lucide-react";

// Tuodaan hookit ja tyypit
import { useTokens } from "@/hooks/useTokens";
import { useFreeUsage } from '@/hooks/useFreeUsage';
import CVConfirmationModal from "@/components/CVConfirmationModal";

// Tuodaan hinta-asetukset suoraan domain-tiedostosta
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
  
  // State-hallinta
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [useATS, setUseATS] = useState(false);
  
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Kysymysten hallinta
  const [questions, setQuestions] = useState<CVQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);

  // Vahvistus-modalin hallinta
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

  // --- DYNAAMINEN HINNOITTELU lib/domain/tokens.ts MUKAAN ---
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

  // Ladataan käyttäjän profiili
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
    if (!user) return toast.error("Kirjaudu sisään jatkaaksesi");
    if (!profileData) {
      toast.error("Täytä profiilitiedot ensin!");
      router.push("/profile");
      return;
    }

    if (!canCreateCV()) {
      toast.error(plan_type === 'free' ? "Ilmainen kokeilu on jo käytetty." : `Tarvitset ${costs.total} tokenia.`);
      return;
    }

    setIsLoading(true);
    try {
      const requestBody = {
        profileData,
        cvType: selectedTemplate,
        language: "finnish",
        jobPosting: useATS ? jobPosting : undefined,
        enableRAG: false,
        answers: finalAnswers || answers,
        skipQuestions: false,
        skipConfirmation, // ✅ Lähetetään tieto backendiin että varoitukset on kuitattu
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
        // ✅ Jos backend löytää hallusinaatioita, näytetään modal
        setPendingViolations(result.violations);
        setShowConfirmation(true);
      } else if (response.ok) {
        toast.success("✅ CV luotu onnistuneesti!");
        router.push(`/edit-cv/${result.id || result.cvId}`);
      } else {
        throw new Error(result.error || "Generointi epäonnistui");
      }
    } catch (error: any) {
      toast.error(error.message || "Tapahtui virhe");
    } finally {
      setIsLoading(false);
    }
  };
// 2. UUDET HANDLER-FUNKTIOT MODALILLE (TypeScript-yhteensopivat)
  const handleApproveViolations = async (items: any[]) => {
    setShowConfirmation(false);
    // Kutsutaan generointia uudelleen skipConfirmation = true -lipulla
    await handleGenerateCV(answers, true);
  };

  const handleRejectViolations = async () => {
    setShowConfirmation(false);
    setPendingViolations(null);
    toast.info("Generointi peruutettu.");
  };

  const handleEditViolations = async () => {
    setShowConfirmation(false);
    router.push("/profile"); // Ohjataan käyttäjä korjaamaan profiilitietonsa
  };
  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan työkaluja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc] selection:bg-orange-500/30">
      {/* Taustagradientit pagesivu.tsx tyyliin */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">AI CV Builder</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
              Luo <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Vaikuttava</span> CV.
            </h1>
            <p className="text-gray-400 max-w-xl text-lg font-medium leading-relaxed">
              Anna tekoälyn hioa kokemuksestasi timanttinen esitys. Valitse tyyli ja anna palaa.
            </p>
          </div>

          <div className="bg-gray-900/40 backdrop-blur-xl border border-gray-800 p-5 rounded-3xl flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Saldosi</p>
              <div className="flex items-center gap-2 justify-end">
                <span className="text-2xl font-black text-white">{tokens.toLocaleString()}</span>
                <span className="text-xs font-bold text-orange-500">TKN</span>
              </div>
            </div>
            <div className="w-px h-10 bg-gray-800" />
            <div className="flex flex-col items-center gap-1">
              <Crown className={`w-6 h-6 ${plan_type === 'premium' ? 'text-amber-400' : 'text-gray-600'}`} />
              <span className="text-[8px] font-black uppercase tracking-tighter text-gray-500">{plan_type}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* VASEN: VALINNAT */}
          <div className="lg:col-span-8 space-y-10">
            
            {/* 1. TYYLI */}
            <section className="bg-gray-900/20 backdrop-blur-sm border border-gray-800/50 rounded-[2.5rem] p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
                  <FileEdit className="w-5 h-5 text-orange-400" />
                </div>
                <h3 className="text-xl font-bold text-white">1. Valitse visuaalinen linja</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: "simple", label: "Rento", desc: "Tarinallinen ja helposti lähestyttävä.", icon: Info },
                  { id: "technical", label: "Pro", desc: "Suoraviivainen ja faktoihin keskittyvä.", icon: Target },
                  { id: "creative", label: "Luova", desc: "Erottuva tyyli joka jää mieleen.", icon: Zap },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id as CVTemplate)}
                    className={`relative p-6 rounded-3xl border text-left transition-all duration-300 group ${
                      selectedTemplate === t.id 
                        ? 'border-orange-500/50 bg-orange-500/5 shadow-[0_0_30px_rgba(249,115,22,0.1)]' 
                        : 'border-gray-800 bg-black/20 hover:border-gray-700'
                    }`}
                  >
                    <t.icon className={`w-6 h-6 mb-4 transition-colors ${selectedTemplate === t.id ? 'text-orange-400' : 'text-gray-500 group-hover:text-gray-300'}`} />
                    <p className="font-bold text-white mb-2">{t.label}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                    {selectedTemplate === t.id && (
                      <CheckCircle className="absolute top-4 right-4 w-5 h-5 text-orange-500 animate-in zoom-in duration-300" />
                    )}
                  </button>
                ))}
              </div>
            </section>

            {/* 2. ATS OPTIMOINTI */}
            <section className={`rounded-[2.5rem] p-8 md:p-10 border transition-all duration-500 ${
              useATS 
                ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_0_40px_rgba(16,185,129,0.05)]' 
                : 'bg-gray-900/20 border-gray-800/50'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-colors ${
                    useATS ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-gray-800/50 border-gray-700'
                  }`}>
                    <Shield className={`w-5 h-5 ${useATS ? 'text-emerald-400' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">2. Kohdistaminen (ATS)</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Optimoi CV tiettyä työpaikkaa varten</p>
                  </div>
                </div>

                {plan_type !== 'free' ? (
                  <button 
                    onClick={() => setUseATS(!useATS)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${useATS ? 'bg-emerald-500' : 'bg-gray-800'}`}
                  >
                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 ${useATS ? 'translate-x-7' : 'translate-x-0'}`} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                    <Lock className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-tighter">Premium vain</span>
                  </div>
                )}
              </div>

              {useATS && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-emerald-200/70 leading-relaxed">
                      Liitä alta työpaikkailmoitus. AI analysoi vaatimukset ja nostaa esiin juuri ne taidot, joita työnantaja etsii.
                    </p>
                  </div>
                  <textarea
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                    placeholder="Esim. 'Haemme kokenutta full-stack kehittäjää...'"
                    className="w-full h-48 bg-black/40 border border-white/10 rounded-3xl p-6 text-sm text-gray-200 focus:outline-none focus:border-emerald-500/50 transition-all placeholder:text-gray-700 resize-none"
                  />
                </div>
              )}
            </section>
          </div>

          {/* OIKEA: YHTEENVETO (Sticky) */}
          <div className="lg:col-span-4">
            <div className="sticky top-12 space-y-6">
              <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800 rounded-[2.5rem] p-8 overflow-hidden relative">
                {/* Koriste-elementti */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <h3 className="text-[11px] font-black text-gray-500 uppercase tracking-[0.2em] mb-8">Yhteenveto</h3>
                
                <div className="space-y-5 mb-10">
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

                  <div className="pt-5 border-t border-gray-800 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Kustannus</p>
                      <p className="text-3xl font-black text-white">
                        {plan_type === 'free' ? 'ILMAINEN' : `${costs.total}`}
                        {plan_type !== 'free' && <span className="text-xs text-orange-500 ml-1">TKN</span>}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerateCV()}
                  disabled={isLoading || (useATS && !jobPosting.trim())}
                  className="w-full py-8 bg-gradient-to-r from-orange-500 to-amber-600 hover:shadow-[0_0_40px_rgba(249,115,22,0.3)] text-white rounded-2xl font-black text-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Generoidaan...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      <span>Luo CV nyt</span>
                      <ArrowRight className="w-5 h-5 ml-1 opacity-50 group-hover:translate-x-1 transition-all" />
                    </div>
                  )}
                </Button>

                {plan_type === 'free' && (
                  <div className="mt-6 flex gap-3 p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                    <p className="text-[10px] text-gray-500 leading-relaxed italic">
                      Ilmaiskäyttäjänä voit luoda yhden CV:n. Se ei tallennu pysyvästi ilman tilausta.
                    </p>
                  </div>
                )}
              </div>

              {/* LISÄINFO */}
              <div className="px-6 py-4 bg-white/5 border border-white/5 rounded-3xl">
                <p className="text-[11px] text-gray-500 text-center leading-relaxed font-medium">
                  Prosessi kestää noin 30 sekuntia. <br/> Tekoäly saattaa kysyä tarkentavia kysymyksiä.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODALIT */}
      
      {/* LISÄKYSYMYKSET */}
      {showQuestions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isLoading && setShowQuestions(false)} />
          <div className="relative bg-[#0d1117] border border-gray-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-transparent" />
            
            <h3 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
              <Sparkles className="w-7 h-7 text-orange-500" />
              Tarkennetaanko hieman?
            </h3>
            <p className="text-gray-400 text-sm mb-10">AI haluaa varmistaa, että CV:stä tulee mahdollisimman vakuuttava.</p>

            <div className="space-y-8 max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">
              {questions.map((q) => (
                <div key={q.id} className="space-y-4 group">
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
                    className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-orange-500/50 transition-all min-h-[100px] resize-none"
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Vastaa tähän..."
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-4 mt-10">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 h-14 font-bold"
                onClick={() => setShowQuestions(false)}
                disabled={isLoading}
              >
                Peruuta
              </Button>
              <Button 
                className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-black"
                onClick={() => handleGenerateCV(answers)}
                disabled={isLoading}
              >
                {isLoading ? "Viimeistellään..." : "Valmista tuli"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION (VIOLATIONS) */}
 {/* 3. KORJATTU MODAL-KUTSU */}
      {showConfirmation && pendingViolations && (
        <CVConfirmationModal
          violations={pendingViolations}
          onApprove={handleApproveViolations}
          onReject={handleRejectViolations}
          onEdit={handleEditViolations}
        />
      )}

      {/* LISÄKYSYMYKSET MODAL (Päivitetty kutsu) */}
      {showQuestions && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => !isLoading && setShowQuestions(false)} />
          <div className="relative bg-[#0d1117] border border-gray-800 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl">
            {/* ... kysymykset jne ... */}
            <div className="flex gap-4 mt-10">
              <Button 
                variant="ghost" 
                onClick={() => setShowQuestions(false)}
                disabled={isLoading}
              >
                Peruuta
              </Button>
              <Button 
                className="bg-orange-500 text-white"
                onClick={() => handleGenerateCV(answers)}
                disabled={isLoading}
              >
                {isLoading ? "Viimeistellään..." : "Valmista tuli"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
