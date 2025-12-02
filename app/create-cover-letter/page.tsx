"use client";
import { useState, useEffect } from "react";
import { 
  Loader2, 
  Sparkles, 
  Zap, 
  CheckCircle, 
  Lock, 
  Crown,
  AlertCircle,
  Target,
  Info,
  ArrowRight,
  HelpCircle,
  X
} from "lucide-react";

type Language = "finnish" | "english" | "swedish" | "custom";
type Style = "formal" | "casual";
type CoverLetterVersion = "v1" | "v2";

// ✅ KYSYMYS TYYPPI (yhteensopiva APIin)
interface Question {
  id: string;
  question: string;
  why: string;
  priority: 'critical' | 'important' | 'optional';
  suggestions?: string[];
  helpText?: string;
}

export default function CreateCoverLetterDemo() {
  const [jobDescription, setJobDescription] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [customLanguage, setCustomLanguage] = useState("");
  const [style, setStyle] = useState<Style>("formal");
  const [selectedVersion, setSelectedVersion] = useState<CoverLetterVersion>("v1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ✅ KYSYMYSFLOW STATE
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showQuestions, setShowQuestions] = useState(false);
  
  const [isPremium] = useState(true);

  // ✅ ESTÄ SULKEMINEN GENEROINNIN AIKANA
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

  // ✅ SUBMIT - KUTSUU OIKEAA API:A
  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      setError("Työpaikkailmoitus on pakollinen");
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
          // ... muut kentät profiilista
        })
      });

      const data = await response.json();

      // ✅ JOS API PALAUTTAA KYSYMYKSIÄ
      if (data.needsMoreInfo && data.questions) {
        setQuestions(data.questions);
        setShowQuestions(true);
        setIsGenerating(false);
        return;
      }

      // ✅ SUCCESS
      if (data.success) {
        alert(`✅ Hakukirje luotu! ID: ${data.coverLetterId}`);
        // Ohjaa tarkastelussivulle
        // router.push(`/cover-letters/${data.coverLetterId}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
    } finally {
      setIsGenerating(false);
    }
  };

  // ✅ VASTAA KYSYMYKSIIN JA GENEROI UUDESTAAN
  const handleAnswerQuestions = async () => {
    // Tarkista että kriittiset kysymykset vastattu
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
          answeredQuestions: answers, // ✅ VASTAUKSET MUKANA
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowQuestions(false);
        setQuestions([]);
        setAnswers({});
        alert(`✅ Hakukirje luotu! ID: ${data.coverLetterId}`);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tuntematon virhe');
    } finally {
      setIsGenerating(false);
    }
  };

  const shadowClass = "shadow-[3px_3px_0px_rgba(0,0,0,0.1)]";
  const borderClass = "border-2 border-white/20";
  const glassEffect = "backdrop-blur-xl bg-white/70";

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden">
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      {/* ✅ GENEROINTI ILMOITUS (EI VOI SULKEA) */}
      {isGenerating && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-fade-in px-4">
          <div className={`${glassEffect} border border-white/40 text-gray-900 px-6 py-4 shadow-2xl shadow-indigo-500/20 rounded-2xl backdrop-saturate-150`}>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg text-indigo-900">Luodaan hakukirjettä...</p>
                <p className="text-sm text-gray-600">Tämä kestää n. 20-40 sekuntia</p>
              </div>
              {/* ❌ EI RAKSSI - Ei voi keskeyttää */}
            </div>
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-xs text-amber-800">Älä sulje sivua! Generointi keskeytyy.</p>
            </div>
          </div>
        </div>
      )}

      {/* ✅ KYSYMYS BANNER (EVÄSTEPALKIN TYYLINEN) */}
      {showQuestions && questions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className={`${glassEffect} border border-white/40 rounded-3xl shadow-2xl backdrop-saturate-150 overflow-hidden`}>
              
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/20 rounded-full flex items-center justify-center">
                      <HelpCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">AI tarvitsee lisätietoja</h3>
                      <p className="text-purple-100 text-sm">Vastaa näihin kysymyksiin varmistaaksesi totuudenmukaisuuden</p>
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

              {/* Questions (Max height with scroll) */}
              <div className="p-6 max-h-[50vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className="bg-white/60 backdrop-blur-sm border-2 border-white/60 rounded-2xl p-4">
                      
                      {/* Question Header */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                          q.priority === 'critical' 
                            ? 'bg-gradient-to-br from-red-500 to-pink-600 text-white' 
                            : 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
                        }`}>
                          <span className="text-sm font-bold">{idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {q.priority === 'critical' && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                                PAKOLLINEN
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-gray-900 text-sm mb-1">{q.question}</h4>
                          <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Info className="w-3 h-3" />
                            {q.why}
                          </p>
                        </div>
                      </div>

                      {/* Answer Input */}
                      {q.suggestions && q.suggestions.length > 0 ? (
                        // Buttons
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
                        // Free text
                        <textarea
                          value={answers[q.id] || ''}
                          onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                          placeholder={q.helpText || "Kirjoita vastauksesi..."}
                          className="w-full p-3 bg-white/80 border-2 border-white/60 rounded-lg focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/30 outline-none text-sm resize-y"
                          rows={3}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="px-6 py-3 bg-red-50 border-t border-red-200 flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Actions */}
              <div className="p-4 bg-gray-50 border-t border-white/30 flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  {questions.filter(q => q.priority === 'critical').length} pakollista kysymystä
                </div>
                <button
                  onClick={handleAnswerQuestions}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 px-6 py-2 rounded-full ${glassEffect} border border-white/40 shadow-xl shadow-indigo-500/10 mb-4 backdrop-saturate-150`}>
            <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-extrabold text-indigo-800 uppercase tracking-wider">
              AI Cover Letter Generator
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent drop-shadow-sm">
            Luo Ammattimainen Hakukirje
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            {isPremium
              ? "Valitse tyyli ja anna tekoälyn muotoilla täydellinen hakemus sekunneissa."
              : "Luo erottuva ja persoonallinen hakukirje helposti."}
          </p>
        </div>

        {/* MAIN CARD */}
        <div className={`${glassEffect} border border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-6 md:p-8 relative overflow-hidden backdrop-saturate-150`}>
          
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
          
          <div className="space-y-8 relative z-10">

            {/* Version Selection */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/50">
                  <Target className="w-5 h-5 text-white" />
                </div>
                VALITSE HAKUKIRJETYYPPI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* V1 */}
                <button
                  type="button"
                  onClick={() => setSelectedVersion("v1")}
                  disabled={isGenerating}
                  className={`group relative p-5 text-left rounded-2xl border transition-all duration-300 ${
                    selectedVersion === 'v1' 
                      ? "bg-gradient-to-br from-indigo-100/80 to-purple-100/80 backdrop-blur-xl border-indigo-400/60 shadow-xl shadow-indigo-500/20 scale-[1.02]" 
                      : "bg-white/60 backdrop-blur-lg border-white/40 hover:bg-white/80 hover:shadow-lg"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
                      selectedVersion === 'v1' 
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white" 
                        : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700"
                    }`}>
                      <Sparkles className="h-6 w-6" />
                    </div>
                    {selectedVersion === 'v1' && (
                      <CheckCircle className="text-indigo-600 w-6 h-6" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    Tavallinen Hakukirje
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Persoonallinen. Sopii pienille yrityksille.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                    BASIC
                  </span>
                </button>

                {/* V2 */}
                <button
                  type="button"
                  onClick={() => isPremium ? setSelectedVersion("v2") : null}
                  disabled={isGenerating || !isPremium}
                  className={`group relative p-5 text-left rounded-2xl border transition-all duration-300 ${
                    !isPremium 
                      ? "bg-gray-100/60 opacity-70 cursor-not-allowed" 
                      : selectedVersion === 'v2'
                      ? "bg-gradient-to-br from-purple-100/80 to-pink-100/80 backdrop-blur-xl border-purple-400/60 shadow-xl shadow-purple-500/20 scale-[1.02]"
                      : "bg-white/60 backdrop-blur-lg border-white/40 hover:bg-white/80 hover:shadow-lg"
                  } disabled:opacity-50`}
                >
                  {!isPremium && (
                    <div className="absolute top-3 right-3 bg-amber-500 text-white p-2 rounded-xl z-10">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg ${
                      selectedVersion === 'v2' && isPremium
                        ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white" 
                        : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700"
                    }`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    {selectedVersion === 'v2' && isPremium && (
                      <CheckCircle className="text-purple-600 w-6 h-6" />
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold mb-2 text-gray-900">
                    ATS-Optimoitu
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Läpäisee automaattiset järjestelmät.
                  </p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-purple-600 text-white text-xs font-bold">
                    <Crown className="w-3 h-3 mr-1" />
                    PREMIUM
                  </span>
                </button>
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                📋 Työpaikkailmoitus <span className="text-red-600">*</span>
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={isGenerating}
                className="w-full p-5 bg-white/80 border-2 border-white/60 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-300/30 outline-none min-h-[200px] resize-y disabled:opacity-50"
                placeholder="Liitä tähän työpaikkailmoitus..."
              />
            </div>

            {/* Personal Notes */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">
                ✨ Henkilökohtaiset huomiot
              </label>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                disabled={isGenerating}
                className="w-full p-5 bg-white/80 border-2 border-white/60 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-300/30 outline-none min-h-[120px] resize-y disabled:opacity-50"
                placeholder="Kerro asioita joita haluat painottaa..."
              />
            </div>

            {/* Settings */}
            <div className="bg-gradient-to-br from-indigo-100/50 to-purple-100/50 backdrop-blur-xl rounded-2xl p-6 border border-white/40">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <Info className="h-5 w-5" />
                Asetukset
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase">
                    🌍 Kieli
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as Language)}
                    disabled={isGenerating}
                    className="w-full p-3 bg-white/90 border-2 border-white/60 rounded-xl focus:border-indigo-400 disabled:opacity-50"
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
                    className="w-full p-3 bg-white/90 border-2 border-white/60 rounded-xl focus:border-purple-400 disabled:opacity-50"
                  >
                    <option value="formal">📋 Virallisempi</option>
                    <option value="casual">💬 Rennompi</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && !showQuestions && (
            <div className="mt-6 bg-red-100/60 backdrop-blur-lg border border-red-300/60 rounded-2xl p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="font-bold text-red-900">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-8 pt-6 border-t border-white/30 relative z-10">
            <button
              onClick={handleSubmit}
              disabled={isGenerating || !jobDescription.trim()}
              className={`w-full py-5 px-8 text-lg font-extrabold rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group
                ${
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
                    {selectedVersion === "v2" ? <Zap className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
                    <span>LUO HAKUKIRJE</span>
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
        
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -20px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}