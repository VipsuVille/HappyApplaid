// app/create-cover-letter/page.tsx
"use client";

import { useState, useEffect } from "react";
import { SignedIn, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Loader2,
  Sparkles,
  Zap,
  CheckCircle,
  Crown,
  AlertCircle,
  Target,
  Info,
  ArrowRight,
  X
} from "lucide-react";
import SmartHeader from "@/components/ui/smartHeader";
import { useTokens } from "@/hooks/useTokens";

type Language = "finnish" | "english" | "swedish";
type Style = "formal" | "casual";
type CoverLetterVersion = "v1" | "v2";

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
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [style, setStyle] = useState<Style>("formal");
  const [selectedVersion, setSelectedVersion] = useState<CoverLetterVersion>("v1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ RAG TOGGLE
  const [useRAG, setUseRAG] = useState(false);
  
  // ✅ KYSYMYSFLOW STATE
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
const { user, isLoaded, isSignedIn } = useUser();
  const router = useRouter();

  // ✅ KÄYTÄ SINUN useTokens HOOKIA
  const { 
    tokens,
    isActive,
    plan_type,
    features,
    isLoading: tokensLoading,
    consumeTokens,
    canUseAction,
    getActionCost
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

 // create-cover-letter/page.tsx
const handleSubmit = async () => {
  // ✅ KORJAA: SignedIn → isSignedIn
  if (!isLoaded || !isSignedIn || !user?.id) {
    console.error('❌ Clerk not ready');
    toast.error('Odota hetki, kirjautuminen käynnissä...');
    return;
  }

  if (!jobDescription.trim()) {
    setError("Työpaikkailmoitus on pakollinen");
    return;
  }

  // ✅ VALIDOI V2/RAG KÄYTTÖ
  if (selectedVersion === 'v2' && !features.canUseV2) {
    toast.error("V2 ATS Generator vaatii Semi-Pro tai Pro -tason");
    return;
  }

  if (useRAG && !features.canUseRAG) {
    toast.error("RAG-tietokanta vaatii Pro-tason");
    return;
  }

  // ✅ TARKISTA TOKENIT
  const action = useRAG 
    ? 'cover_letter_rag' 
    : selectedVersion === 'v2' 
      ? 'cover_letter_v2' 
      : 'cover_letter_v1';
  
  const validation = canUseAction(action);
  if (!validation.allowed && plan_type !== 'free') {
    toast.error(validation.reason || 'Ei voi generoida hakukirjettä');
    return;
  }

  const cost = getActionCost(action);

  setIsGenerating(true);
  setError(null);

  try {
    const endpoint = selectedVersion === 'v2' 
      ? '/api/generate-cover-letter-v2'
      : '/api/generate-cover-letter';

    console.log("🚀 Generating cover letter:", { 
      version: selectedVersion, 
      useRAG, 
      cost,
      userId: user.id // ✅ Varmista että tämä on olemassa
    });

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobDescription,
        personalNotes,
        language,
        style,
        enableRAG: useRAG
      })
    });

    const data = await response.json();

    // ✅ JOS 401 → AUTH ONGELMA
    if (response.status === 401) {
      toast.error('Kirjautuminen vanhentunut. Lataa sivu uudelleen.');
      return;
    }

    // ✅ JOS AI PALAUTTAA KYSYMYKSIÄ
    if (data.needsMoreInfo && data.questions) {
      setQuestions(data.questions);
      setShowQuestions(true);
      setIsGenerating(false);
      return;
    }

    // ✅ SUCCESS
    if (data.success && data.coverLetterId) {
      // ✅ KULUTA TOKENIT
      if (plan_type !== 'free' && isActive) {
        console.log(`💰 Consuming ${cost} tokens for action: ${action}`);
        const consumed = await consumeTokens(action);
        
        if (!consumed) {
          console.warn("⚠️ Token consumption failed, but letter was created");
        } else {
          console.log(`✅ Tokens consumed. Remaining: ${tokens - cost}`);
        }
      }

      toast.success(
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

  const handleAnswerQuestions = async () => {
    const criticalQuestions = questions.filter(q => q.priority === 'critical');
    const unansweredCritical = criticalQuestions.filter(q => !answers[q.id]?.trim());
    
    if (unansweredCritical.length > 0) {
      setError('Vastaa kaikkiin pakollisiin kysymyksiin');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const endpoint = selectedVersion === 'v2' 
        ? '/api/generate-cover-letter-v2'
        : '/api/generate-cover-letter';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          personalNotes,
          language,
          style,
          answeredQuestions: answers,
          enableRAG: useRAG
        })
      });

      const data = await response.json();

      if (data.success) {
        const action = useRAG 
          ? 'cover_letter_rag' 
          : selectedVersion === 'v2' 
            ? 'cover_letter_v2' 
            : 'cover_letter_v1';
        
        if (plan_type !== 'free' && isActive) {
          await consumeTokens(action);
        }

        setShowQuestions(false);
        setQuestions([]);
        setAnswers({});
        toast.success('✅ Hakukirje luotu!');
        router.push(`/edit-cover-letter/${data.coverLetterId}`);
      }

    } catch (err) {
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
      
      <SmartHeader />

      {/* ✅ GENEROINTI ILMOITUS */}
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
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">Älä sulje sivua! Generointi keskeytyy.</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ KYSYMYS BANNER */}
      {showQuestions && questions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white/90 backdrop-blur-xl border-2 border-white/40 rounded-3xl shadow-2xl overflow-hidden">
              
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                      <AlertCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">AI tarvitsee lisätietoja</h3>
                      <p className="text-purple-100 text-sm">Vastaa näihin kysymyksiin</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowQuestions(false);
                      setQuestions([]);
                      setAnswers({});
                    }}
                    className="h-8 w-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>

              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white/60 backdrop-blur-sm border-2 border-white/60 rounded-2xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          q.priority === 'critical' 
                            ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white' 
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        }`}>
                          <span className="text-sm font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          {q.priority === 'critical' && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                              PAKOLLINEN
                            </span>
                          )}
                          <h4 className="font-bold text-gray-900 text-sm mb-1">{q.question}</h4>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {q.why}
                          </p>
                        </div>
                      </div>

                      {q.suggestions && q.suggestions.length > 0 ? (
                        <div className="space-y-2">
                          {q.suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => setAnswers({...answers, [q.id]: suggestion})}
                              className={`w-full p-2 text-left text-sm rounded-lg border-2 transition-all ${
                                answers[q.id] === suggestion
                                  ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-indigo-400'
                                  : 'bg-white/80 text-gray-700 border-white/60 hover:border-indigo-300'
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                          placeholder={q.helpText || "Kirjoita vastauksesi..."}
                          className="w-full p-3 bg-white/80 border-2 border-white/60 rounded-lg focus:border-indigo-400 outline-none text-sm resize-y"
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              <div className="p-4 bg-gray-50 border-t border-white/30 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {questions.filter(q => q.priority === 'critical').length} pakollista kysymystä
                </div>
                <button
                  onClick={handleAnswerQuestions}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      LUODAAN...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      VASTAA JA LUO
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
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
            {plan_type === 'pro'
              ? "Pro-taso: RAG + ATS-optimointi käytössä"
              : plan_type === 'semi-pro'
              ? "Semi-Pro: ATS-optimointi käytössä"
              : "Valitse tyyli ja anna tekoälyn muotoilla täydellinen hakemus"}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* V1 */}
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
                    {selectedVersion === 'v1' && (
                      <CheckCircle className="text-indigo-600 w-6 h-6" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    Tavallinen Hakukirje (V1)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Persoonallinen. Sopii pienille yrityksille.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                    {getActionCost('cover_letter_v1')} tokenia
                  </span>
                </button>

                {/* V2 */}
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
                    {selectedVersion === 'v2' && features.canUseV2 && (
                      <CheckCircle className="text-purple-600 w-6 h-6" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    ATS-Optimoitu (V2)
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Läpäisee automaattiset järjestelmät.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
                    <Crown className="w-3 h-3 mr-1" />
                    Semi-Pro+ • {getActionCost('cover_letter_v2')} tokenia
                  </span>
                </button>
              </div>
            </div>

            {/* RAG Toggle (Pro only) */}
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
                      Konsultoi asiantuntija-artikkeleitamme. AI hakee parhaat käytännöt ja optimoi hakukirjeesi laadun.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Job Description */}
            <div>
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

            {/* Personal Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase">
                ✨ Henkilökohtaiset huomiot
              </label>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                disabled={isGenerating}
                className="w-full p-5 bg-white/80 border-2 border-white/60 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-300/30 outline-none min-h-[120px] resize-y"
                placeholder="Kerro asioita joita haluat painottaa..."
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
              disabled={isGenerating || !jobDescription.trim()}
              className={`w-full py-5 px-8 text-lg font-extrabold rounded-2xl border-2 transition-all relative overflow-hidden ${
                isGenerating || !jobDescription.trim()
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
                     <Sparkles className="w-6 h-6" />}
                    <span>
                      {useRAG 
                        ? `LUO RAG HAKUKIRJE (${getActionCost('cover_letter_rag')} tok)`
                        : selectedVersion === "v2"
                        ? `LUO ATS HAKUKIRJE (${getActionCost('cover_letter_v2')} tok)`
                        : `LUO HAKUKIRJE (${getActionCost('cover_letter_v1')} tok)`}
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