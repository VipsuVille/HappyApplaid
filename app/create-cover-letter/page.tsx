// app/create-cover-letter/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Zap, CheckCircle, Crown, AlertCircle, Target, Info, ArrowRight, X, User
} from "lucide-react";
import { TokenAction, useTokens } from "@/hooks/useTokens";

type Language = "finnish" | "english" | "swedish";
type Style = "formal" | "casual";
// ✅ PÄIVITETTY TYYPPI: Lisätty 'general'
type CoverLetterVersion = "v1" | "v2" | "general";

interface Question {
  id: string;
  question: string;
  why: string;
  priority: 'critical' | 'important' | 'optional';
  suggestions?: string[];
  helpText?: string;
}

export default function CreateCoverLetterPage() {
  const [jobDescription, setJobDescription] = useState("");
  // ✅ UUDET TILAT: Yleistä kirjettä varten
  const [targetRole, setTargetRole] = useState("");
  const [targetIndustry, setTargetIndustry] = useState("");
  
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [style, setStyle] = useState<Style>("formal");
  const [selectedVersion, setSelectedVersion] = useState<CoverLetterVersion>("v1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useRAG, setUseRAG] = useState(false);
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  
  const [showQuestionPrompt, setShowQuestionPrompt] = useState(false);
  const [pendingQuestions, setPendingQuestions] = useState<Question[]>([]);

  const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  const { 
    tokens, isActive, plan_type, features, isLoading: tokensLoading,
    consumeTokens, canUseAction, getActionCost
  } = useTokens();

  useEffect(() => {
    if (isGenerating) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = 'Hakukirjettä luodaan. Haluatko varmasti poistua?';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isGenerating]);

  const handleSubmit = async () => {
    if (!isLoaded || !isSignedIn || !user?.id) {
      toast.error('Odota hetki, kirjautuminen käynnissä...');
      return;
    }

    // ✅ VALIDOINTI: Työpaikkailmoitus pakollinen vain jos EI ole general
    if (selectedVersion !== 'general' && !jobDescription.trim()) {
      setError("Työpaikkailmoitus on pakollinen tälle kirjeelle");
      return;
    }

    if (selectedVersion === 'v2' && !features.canUseV2) {
      toast.error("V2 ATS Generator vaatii Semi-Pro tai Pro -tason");
      return;
    }

    if (useRAG && !features.canUseRAG) {
      toast.error("RAG-tietokanta vaatii Pro-tason");
      return;
    }

    // ✅ ACTIONIN VALINTA
let action: TokenAction = 'cover_letter_v1';
    if (selectedVersion === 'general') action = 'cover_letter_general';
    else if (useRAG) action = 'cover_letter_rag';
    else if (selectedVersion === 'v2') action = 'cover_letter_v2';
    
    const validation = canUseAction(action);
    if (!validation.allowed && plan_type !== 'free') {
      toast.error(validation.reason || 'Ei voi generoida hakukirjettä');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // ✅ ENDPOINT VALINTA
      let endpoint = '/api/generate-cover-letter'; // Default V1
      if (selectedVersion === 'v2') endpoint = '/api/generate-cover-letter-v2';
      if (selectedVersion === 'general') endpoint = '/api/generate-general-cover-letter';

      // ✅ PAYLOADIN RAKENTAMINEN
      const body: any = {
        personalNotes,
        language,
        style,
        enableRAG: useRAG,
      };

      if (selectedVersion === 'general') {
        body.targetRole = targetRole;
        body.targetIndustry = targetIndustry;
      } else {
        body.jobDescription = jobDescription;
        body.skipQuestions = false;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.status === 401) {
        toast.error('Kirjautuminen vanhentunut. Lataa sivu uudelleen.');
        return;
      }

      // Kysymyslogiikka (lähinnä V1/V2, General harvemmin kyselee mutta valmius on)
      if (data.needsMoreInfo && data.questions && data.questions.length > 0) {
        console.log(`❓ AI has ${data.questions.length} questions`);
        setPendingQuestions(data.questions);
        setShowQuestionPrompt(true);
        setIsGenerating(false);
        return;
      }

      if (data.success && data.coverLetterId) {
        if (plan_type !== 'free' && isActive) {
          await consumeTokens(action);
        }

        toast.success(
          selectedVersion === 'general' ? "🌟 Esittelykirje luotu!" :
          useRAG ? "🎯 RAG-optimoitu hakukirje luotu!" :
          selectedVersion === 'v2' ? "✅ ATS-optimoitu hakukirje luotu!" :
          "✅ Hakukirje luotu!"
        );
        
        router.push(`/edit-cover-letter/${data.coverLetterId}`);
      } else {
        throw new Error(data.error || 'Hakukirjeen luonti epäonnistui');
      }

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
      toast.error(err instanceof Error ? err.message : 'Hakukirjeen luonti epäonnistui');
    } finally {
      setIsGenerating(false);
    }
  };

  // KÄYTTÄJÄ HALUAA VASTATA (Vain V1/V2 yleensä)
  const handleShowQuestions = () => {
    setQuestions(pendingQuestions);
    setShowQuestions(true);
    setShowQuestionPrompt(false);
  };

  // KÄYTTÄJÄ HALUAA JATKAA ILMAN
  const handleSkipQuestions = async () => {
    setShowQuestionPrompt(false);
    setIsGenerating(true);

    try {
      let endpoint = '/api/generate-cover-letter';
      if (selectedVersion === 'v2') endpoint = '/api/generate-cover-letter-v2';
      // General ei yleensä tule tänne, mutta varuiksi
      if (selectedVersion === 'general') endpoint = '/api/generate-general-cover-letter';

      let action: TokenAction = 'cover_letter_v1';
      if (selectedVersion === 'general') action = 'cover_letter_general';
      else if (useRAG) action = 'cover_letter_rag';
      else if (selectedVersion === 'v2') action = 'cover_letter_v2';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription, // Voi olla tyhjä generalissa
          personalNotes,
          language,
          style,
          targetRole,
          targetIndustry,
          enableRAG: useRAG,
          skipQuestions: true
        })
      });

      const data = await response.json();

      if (data.success && data.coverLetterId) {
        if (plan_type !== 'free' && isActive) {
          await consumeTokens(action);
        }
        toast.success('✅ Hakukirje luotu!');
        router.push(`/edit-cover-letter/${data.coverLetterId}`);
      } else {
        throw new Error(data.error || 'Generointi epäonnistui');
      }

    } catch (err) {
      console.error('❌ Error:', err);
      toast.error('Generointi epäonnistui');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswerQuestions = async () => {
    // Sama logiikka kuin alkuperäisessä, vain endpoint check lisätty varmuuden vuoksi
    const criticalQuestions = questions.filter(q => q.priority === 'critical');
    const unansweredCritical = criticalQuestions.filter(q => !answers[q.id]?.trim());
    
    if (unansweredCritical.length > 0) {
      setError('Vastaa kaikkiin pakollisiin kysymyksiin');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      let endpoint = '/api/generate-cover-letter';
      if (selectedVersion === 'v2') endpoint = '/api/generate-cover-letter-v2';

      let action: TokenAction = useRAG ? 'cover_letter_rag' : (selectedVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1');

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          personalNotes,
          language,
          style,
          answeredQuestions: answers,
          skipQuestions: true,
          enableRAG: useRAG
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);

      if (data.success && data.coverLetterId) {
        if (plan_type !== 'free' && isActive) {
          await consumeTokens(action);
        }
        setShowQuestions(false);
        setQuestions([]);
        setAnswers({});
        toast.success('✅ Hakukirje luotu vastausten perusteella!');
        router.push(`/edit-cover-letter/${data.coverLetterId}`);
      } else {
        throw new Error(data.error || 'coverLetterId puuttuu');
      }

    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isLoaded || tokensLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  const isPremium = isActive && plan_type !== 'free';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100">
      
      {/* DIALOGIT (Questions, Loading) pysyvät samana... */}
      {showQuestionPrompt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl max-w-md w-full p-8 border-2 border-white/40">
            <div className="text-center mb-6">
              <div className="h-16 w-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">AI:lla olisi lisäkysymyksiä</h3>
              <p className="text-gray-600">
                Haluatko vastata {pendingQuestions.length} kysymykseen parempaa laatua varten?
              </p>
            </div>
            <div className="space-y-3">
              <button onClick={handleShowQuestions} className="w-full px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Näytä kysymykset
              </button>
              <button onClick={handleSkipQuestions} disabled={isGenerating} className="w-full px-6 py-4 bg-white border-2 border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
                <ArrowRight className="w-5 h-5" /> Jatka ilman kysymyksiä
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-fade-in px-4">
          <div className="bg-white/90 backdrop-blur-xl border-2 border-white/40 text-gray-900 px-6 py-4 shadow-2xl rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-indigo-900">Luodaan hakukirjettä...</p>
                <p className="text-sm text-gray-600">Tämä kestää n. 20-40 sekuntia</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KYSYMYS BANNER (sama kuin ennen) */}
      {showQuestions && questions.length > 0 && (
         /* ... (pidä olemassa oleva koodi tässä) ... */
         <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl shadow-2xl p-6 relative">
                     <button
                        onClick={() => { setShowQuestions(false); setQuestions([]); setAnswers({}); }}
                        className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200"
                    >
                        <X className="w-4 h-4" />
                    </button>
                    <h3 className="font-bold text-lg mb-4">Vastaa kysymyksiin</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[50vh] overflow-y-auto mb-4">
                        {questions.map((q, idx) => (
                             <div key={q.id} className="bg-white p-4 rounded-xl border border-gray-200">
                                 <p className="font-semibold mb-2">{q.question}</p>
                                 <textarea 
                                    className="w-full border rounded p-2"
                                    value={answers[q.question] || ''}
                                    onChange={(e) => setAnswers({...answers, [q.question]: e.target.value})}
                                 />
                             </div>
                        ))}
                     </div>
                     <Button onClick={handleAnswerQuestions} disabled={isGenerating}>
                        {isGenerating ? <Loader2 className="animate-spin" /> : 'Lähetä vastaukset'}
                     </Button>
                </div>
            </div>
         </div>
      )}

      <div className="max-w-6xl mx-auto py-8 px-4 relative z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Luo Ammattimainen Hakukirje
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto mt-4">
            Valitse tilanteeseesi sopiva hakukirjetyyppi.
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl shadow-2xl p-8 relative overflow-hidden">
          
          <div className="space-y-8 relative z-10">

            {/* Version Selection */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-6 h-6 text-indigo-600" />
                VALITSE HAKUKIRJETYYPPI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Tavallinen (V1) */}
                <button
                  type="button"
                  onClick={() => setSelectedVersion("v1")}
                  disabled={isGenerating}
                  className={`p-5 text-left rounded-2xl border-2 transition-all ${
                    selectedVersion === 'v1' 
                      ? "bg-gradient-to-br from-indigo-100/80 to-purple-100/80 border-indigo-400/60 shadow-xl scale-[1.02]" 
                      : "bg-white/60 border-white/40 hover:bg-white/80 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                      <Sparkles className="h-6 w-6 text-white" />
                    </div>
                    {selectedVersion === 'v1' && <CheckCircle className="text-indigo-600 w-6 h-6" />}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">Työhakemus (Standardi)</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Persoonallinen hakukirje tiettyyn työpaikkaan.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                    {getActionCost('cover_letter_v1')} tokenia
                  </span>
                </button>

                {/* 2. ATS-Optimoitu (V2) */}
                <button
                  type="button"
                  onClick={() => features.canUseV2 ? setSelectedVersion("v2") : null}
                  disabled={isGenerating || !features.canUseV2}
                  className={`p-5 text-left rounded-2xl border-2 transition-all ${
                    !features.canUseV2 
                      ? "bg-gray-100/60 opacity-70 cursor-not-allowed" 
                      : selectedVersion === 'v2'
                      ? "bg-gradient-to-br from-purple-100/80 to-pink-100/80 border-purple-400/60 shadow-xl scale-[1.02]"
                      : "bg-white/60 border-white/40 hover:bg-white/80 hover:shadow-lg"
                  }`}
                >
                  {!features.canUseV2 && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white p-2 rounded-xl z-10">
                      <Crown className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-purple-500 to-pink-600">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    {selectedVersion === 'v2' && features.canUseV2 && <CheckCircle className="text-purple-600 w-6 h-6" />}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">ATS-Optimoitu</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Läpäisee automaattiset seulontajärjestelmät.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
                    <Crown className="w-3 h-3 mr-1" />
                    {getActionCost('cover_letter_v2')} tokenia
                  </span>
                </button>

                {/* 3. ✅ UUSI: Yleinen Esittely (General) */}
                <button
                  type="button"
                  onClick={() => setSelectedVersion("general")}
                  disabled={isGenerating}
                  className={`p-5 text-left rounded-2xl border-2 transition-all ${
                    selectedVersion === 'general'
                      ? "bg-gradient-to-br from-cyan-100/80 to-blue-100/80 border-cyan-400/60 shadow-xl scale-[1.02]"
                      : "bg-white/60 border-white/40 hover:bg-white/80 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-12 w-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                      <User className="h-6 w-6 text-white" />
                    </div>
                    {selectedVersion === 'general' && <CheckCircle className="text-cyan-600 w-6 h-6" />}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">Yleinen Esittely</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Esittelyteksti profiiliisi. Ei tiettyyn työpaikkaan.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-cyan-600 text-white text-xs font-bold">
                     Basic+ • {getActionCost('cover_letter_general') || 5} tokenia
                  </span>
                </button>

              </div>
            </div>

            {/* RAG Toggle (Available for ALL, check permissions) */}
            {features.canUseRAG && (
              <div className="p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                <div className="flex items-start gap-4">
                  <input
                    type="checkbox"
                    id="use-rag-letter"
                    checked={useRAG}
                    onChange={(e) => setUseRAG(e.target.checked)}
                    className="mt-1 h-5 w-5 text-amber-600"
                  />
                  <div className="flex-1">
                    <label htmlFor="use-rag-letter" className="font-bold text-gray-900 text-lg cursor-pointer flex items-center gap-2">
                      Käytä RAG-tietokantaa
                      <Crown className="w-5 h-5 text-amber-600" />
                      <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full font-bold">
                        PRO • {getActionCost('cover_letter_rag')} tokenia
                      </span>
                    </label>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedVersion === 'general' 
                        ? "AI hakee tietokannasta parhaat tavat esitellä osaamisesi ilman tiettyä työpaikkailmoitusta."
                        : "Konsultoi asiantuntija-artikkeleitamme. AI hakee parhaat käytännöt ja optimoi hakukirjeesi laadun."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* INPUT FIELDS - CHANGE BASED ON VERSION */}
            {selectedVersion !== 'general' ? (
              // ✅ V1 & V2: Näytä Työpaikkailmoitus
              <div className="animate-fade-in">
                <label className="block text-sm font-bold text-gray-900 mb-3 uppercase">
                  📋 Työpaikkailmoitus <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={isGenerating}
                  className="w-full p-5 bg-white/80 border-2 border-white/60 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-300/30 outline-none min-h-[200px] resize-y"
                  placeholder="Liitä tähän työpaikkailmoitus..."
                />
              </div>
            ) : (
              // ✅ GENERAL: Näytä Rooli & Toimiala
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase">
                        🎯 Tavoiteltu rooli (Valinnainen)
                    </label>
                    <input 
                        type="text"
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        placeholder="Esim. Myyntipäällikkö, Koodari..."
                        className="w-full p-4 bg-white/80 border-2 border-white/60 rounded-xl focus:border-cyan-400 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-2">Jos tyhjä, AI luo täysin yleisen esittelyn.</p>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-900 mb-3 uppercase">
                        🏭 Toimiala (Valinnainen)
                    </label>
                    <input 
                        type="text"
                        value={targetIndustry}
                        onChange={(e) => setTargetIndustry(e.target.value)}
                        placeholder="Esim. IT, Terveydenhuolto..."
                        className="w-full p-4 bg-white/80 border-2 border-white/60 rounded-xl focus:border-cyan-400 outline-none"
                    />
                </div>
              </div>
            )}

            {/* Personal Notes (Always visible) */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase">
                ✨ Henkilökohtaiset huomiot
              </label>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                disabled={isGenerating}
                className="w-full p-5 bg-white/80 border-2 border-white/60 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-300/30 outline-none min-h-[120px] resize-y"
                placeholder={selectedVersion === 'general' 
                  ? "Kerro itsestäsi vapaamuotoisesti, mitä haluat ehdottomasti tuoda esille..."
                  : "Kerro asioita joita haluat painottaa tässä haussa..."}
              />
            </div>

            {/* Settings */}
            <div className="bg-gradient-to-br from-indigo-100/50 to-purple-100/50 rounded-2xl p-6 border-2 border-white/40">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Asetukset
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">
                    🌐 Kieli
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    disabled={isGenerating}
                    className="w-full p-3 bg-white/90 border-2 border-white/60 rounded-xl focus:border-indigo-400"
                  >
                    <option value="finnish">🇫🇮 Suomi</option>
                    <option value="english">🇬🇧 English</option>
                    <option value="swedish">🇸🇪 Svenska</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">
                    🎨 Tyyli
                  </label>
                  <select
                    value={style}
                    onChange={(e) => setStyle(e.target.value as Style)}
                    disabled={isGenerating}
                    className="w-full p-3 bg-white/90 border-2 border-white/60 rounded-xl focus:border-purple-400"
                  >
                    <option value="formal">📋 Virallisempi</option>
                    <option value="casual">💬 Rennompi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {error && !showQuestions && (
            <div className="mt-6 bg-red-100/60 border-2 border-red-300/60 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="font-bold text-red-900">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-white/30 relative z-10">
            <Button
              onClick={handleSubmit}
              disabled={isGenerating || (selectedVersion !== 'general' && !jobDescription.trim())}
              className={`w-full py-5 px-8 text-lg font-extrabold rounded-2xl border-2 transition-all relative overflow-hidden ${
                isGenerating || (selectedVersion !== 'general' && !jobDescription.trim())
                  ? "bg-gray-300/60 text-gray-500 cursor-not-allowed border-gray-400/60"
                  : "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white border-white/40 shadow-2xl hover:shadow-indigo-500/50 hover:scale-[1.02]"
                }`}
            >
              <div className="flex items-center justify-center gap-3">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>PROSESSOIDAAN...</span>
                  </>
                ) : (
                  <>
                    {useRAG ? <Crown className="w-6 h-6" /> : 
                     selectedVersion === "v2" ? <Zap className="w-6 h-6" /> : 
                     selectedVersion === "general" ? <User className="w-6 h-6" /> :
                     <Sparkles className="w-6 h-6" />}
                    <span>
                      {selectedVersion === 'general'
                        ? `LUO ESITTELYKIRJE (${getActionCost('cover_letter_general')} tok)`
                        : useRAG 
                          ? `LUO RAG HAKUKIRJE (${getActionCost('cover_letter_rag')} tok)`
                          : selectedVersion === "v2"
                            ? `LUO ATS HAKUKIRJE (${getActionCost('cover_letter_v2')} tok)`
                            : `LUO HAKUKIRJE (${getActionCost('cover_letter_v1')} tok)`
                      }
                    </span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </div>
            </Button>
            <p className="text-sm text-gray-500 text-center mt-4">
               {isPremium
                 ? `${plan_type.toUpperCase()}: ${tokens} tokenia jäljellä`
                 : "Vaatii tilauksen"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}