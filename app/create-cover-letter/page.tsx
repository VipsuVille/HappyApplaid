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
  ArrowRight
} from "lucide-react";

type Language = "finnish" | "english" | "swedish" | "custom";
type Style = "formal" | "casual";
type CoverLetterVersion = "v1" | "v2";

export default function CreateCoverLetterDemo() {
  const [jobDescription, setJobDescription] = useState("");
  const [personalNotes, setPersonalNotes] = useState("");
  const [language, setLanguage] = useState<Language>("finnish");
  const [customLanguage, setCustomLanguage] = useState("");
  const [style, setStyle] = useState<Style>("formal");
  const [selectedVersion, setSelectedVersion] = useState<CoverLetterVersion>("v1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isPremium] = useState(true);

  useEffect(() => {
    if (isGenerating) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isGenerating]);

  const handleSubmit = async () => {
    if (!jobDescription.trim()) {
      setError("Työpaikkailmoitus on pakollinen");
      return;
    }

    setIsGenerating(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsGenerating(false);
    alert("✅ Hakukirje luotu! (Demo-tilassa)");
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
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      {/* Floating notification */}
      {isGenerating && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md animate-fade-in px-4">
          <div className={`${glassEffect} border border-white/40 text-gray-900 px-6 py-4 shadow-2xl shadow-indigo-500/20 flex items-center gap-4 rounded-2xl backdrop-saturate-150`}>
            <div className="h-10 w-10 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <Loader2 className="h-5 w-5 animate-spin text-white" />
            </div>
            <div>
              <p className="font-bold text-lg text-indigo-900">Luodaan hakukirjettä...</p>
              <p className="text-sm text-gray-600">Tämä kestää n. 20-40 sekuntia</p>
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

        {/* MAIN CARD - Liquid Glass Effect */}
        <div className={`${glassEffect} border border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-6 md:p-8 relative overflow-hidden backdrop-saturate-150`}>
          
          {/* Inner glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
          
          <div className="space-y-8 relative z-10">

            {/* 1. Version Selection */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/50">
                  <Target className="w-5 h-5 text-white" />
                </div>
                VALITSE HAKUKIRJETYYPPI
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* V1 - Tavallinen */}
                <button
                  type="button"
                  onClick={() => setSelectedVersion("v1")}
                  className={`group relative p-5 text-left rounded-2xl border transition-all duration-300 ${
                    selectedVersion === 'v1' 
                      ? "bg-gradient-to-br from-indigo-100/80 to-purple-100/80 backdrop-blur-xl border-indigo-400/60 shadow-xl shadow-indigo-500/20 scale-[1.02]" 
                      : "bg-white/60 backdrop-blur-lg border-white/40 hover:bg-white/80 hover:shadow-lg hover:shadow-indigo-500/10"
                  }`}
                >
                  {/* Glass shimmer effect */}
                  <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none`}></div>
                  
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-all
                      ${selectedVersion === 'v1' 
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/50 text-white" 
                        : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700"
                      }`}>
                      <Sparkles className="h-6 w-6" />
                    </div>
                    {selectedVersion === 'v1' && (
                      <div className="h-8 w-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/50">
                        <CheckCircle className="text-white w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-2 ${selectedVersion === 'v1' ? 'text-indigo-900' : 'text-gray-900'}`}>
                    Tavallinen Hakukirje
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    Nopea ja persoonallinen. Sopii pienille yrityksille ja luoviin hakuihin.
                  </p>
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-green-500/30">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    BASIC
                  </span>
                </button>

                {/* V2 - ATS-Optimoitu */}
                <button
                  type="button"
                  onClick={() => isPremium ? setSelectedVersion("v2") : setError("Vaatii Premium-tilauksen!")}
                  className={`group relative p-5 text-left rounded-2xl border transition-all duration-300 ${
                    !isPremium 
                      ? "bg-gray-100/60 backdrop-blur-lg border-white/40 opacity-70 cursor-not-allowed" 
                      : selectedVersion === 'v2'
                      ? "bg-gradient-to-br from-purple-100/80 to-pink-100/80 backdrop-blur-xl border-purple-400/60 shadow-xl shadow-purple-500/20 scale-[1.02]"
                      : "bg-white/60 backdrop-blur-lg border-white/40 hover:bg-white/80 hover:shadow-lg hover:shadow-purple-500/10"
                  }`}
                >
                  {/* Glass shimmer effect */}
                  {isPremium && (
                    <div className={`absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none`}></div>
                  )}
                  
                  {!isPremium && (
                    <div className="absolute top-3 right-3 bg-gradient-to-br from-amber-400 to-orange-500 text-white p-2 rounded-xl z-10 shadow-lg shadow-amber-500/50">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shadow-lg transition-all
                      ${selectedVersion === 'v2' && isPremium
                        ? "bg-gradient-to-br from-purple-500 to-pink-600 shadow-purple-500/50 text-white" 
                        : "bg-gradient-to-br from-gray-200 to-gray-300 text-gray-700"
                      }`}>
                      <Zap className="h-6 w-6" />
                    </div>
                    {selectedVersion === 'v2' && isPremium && (
                      <div className="h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                        <CheckCircle className="text-white w-5 h-5" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className={`text-lg font-bold mb-2 ${selectedVersion === 'v2' ? 'text-purple-900' : 'text-gray-900'}`}>
                    ATS-Optimoitu Hakukirje
                  </h3>
                  <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                    Läpäisee automaattiset järjestelmät. Suurille yrityksille ja virallisiin hakuihin.
                  </p>
                  
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${
                    isPremium 
                      ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-purple-500/30"
                      : "bg-gray-300 text-gray-600 shadow-gray-500/20"
                  }`}>
                    <Crown className="w-3 h-3 mr-1" />
                    PREMIUM
                  </span>
                </button>
              </div>

              {/* Info Box - Glassmorphism */}
              {selectedVersion === "v2" && isPremium && (
                <div className="mt-4 bg-gradient-to-br from-purple-100/60 to-pink-100/60 backdrop-blur-lg border border-purple-300/40 rounded-2xl p-5 shadow-lg shadow-purple-500/10">
                  <p className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5" />
                    ATS-OPTIMOINTI SISÄLTÄÄ:
                  </p>
                  <ul className="text-sm text-purple-800 space-y-2 ml-6">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span>Avainsanojen automaattinen tunnistus työpaikkailmoituksesta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span>3-osainen rakenne (Esittely, Osaaminen, Motivaatio)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span>Master Guardian -validointi (ei väärää tietoa)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-500 font-bold">✓</span>
                      <span>Monikielinen synonym matching</span>
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* 2. Job Description - Liquid Glass Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                📋 Työpaikkailmoitus <span className="text-red-600 font-extrabold">*</span>
              </label>
              <div className="relative">
                <textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="w-full p-5 bg-white/80 backdrop-blur-sm border-2 border-white/60 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-300/30 outline-none transition-all text-gray-700 placeholder-gray-500 min-h-[200px] text-base resize-y shadow-xl shadow-indigo-500/5"
                  placeholder="Liitä tähän työpaikkailmoitus...&#10;&#10;Esimerkki:&#10;'Haemme Full Stack -kehittäjää React/Node.js osaamisella. Tehtävässä työskentelet modernin teknologian parissa...'"
                />
                {/* Glow effect on focus */}
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
              </div>
              
              {jobDescription.length > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white text-sm font-semibold shadow-lg shadow-green-500/30">
                  <div className="h-2 w-2 rounded-full bg-white animate-pulse"></div>
                  <span>Vastaanotettu ({jobDescription.length} merkkiä)</span>
                </div>
              )}
            </div>

            {/* 3. Personal Notes - Liquid Glass Input */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                ✨ Henkilökohtaiset huomiot
              </label>
              <textarea
                value={personalNotes}
                onChange={(e) => setPersonalNotes(e.target.value)}
                className="w-full p-5 bg-white/80 backdrop-blur-sm border-2 border-white/60 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-300/30 outline-none transition-all text-gray-700 placeholder-gray-500 min-h-[120px] text-base resize-y shadow-xl shadow-purple-500/5"
                placeholder="Kerro asioita, joita haluat painottaa (valinnainen)..."
              />
            </div>

            {/* 4. Settings Panel - Enhanced Glassmorphism */}
            <div className="bg-gradient-to-br from-indigo-100/50 to-purple-100/50 backdrop-blur-xl rounded-2xl p-6 border border-white/40 shadow-xl shadow-indigo-500/10">
              <h3 className="text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/50">
                  <Info className="h-5 w-5 text-white" />
                </div>
                Asetukset
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    🌍 Kieli
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as Language)}
                      className="w-full p-3 bg-white/90 backdrop-blur-sm border-2 border-white/60 rounded-xl appearance-none text-gray-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-300/30 font-medium cursor-pointer shadow-lg shadow-indigo-500/5 transition-all"
                    >
                      <option value="finnish">🇫🇮 Suomi</option>
                      <option value="english">🇬🇧 English</option>
                      <option value="swedish">🇸🇪 Svenska</option>
                      <option value="custom">🌍 Muu kieli</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Style */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                    🎨 Tyyli
                  </label>
                  <div className="relative">
                    <select
                      value={style}
                      onChange={(e) => setStyle(e.target.value as Style)}
                      className="w-full p-3 bg-white/90 backdrop-blur-sm border-2 border-white/60 rounded-xl appearance-none text-gray-700 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300/30 font-medium cursor-pointer shadow-lg shadow-purple-500/5 transition-all"
                    >
                      <option value="formal">📋 Virallisempi</option>
                      <option value="casual">💬 Rennompi</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-800">
                      ▼
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Message - Glassmorphism */}
          {error && (
            <div className="mt-6 bg-red-100/60 backdrop-blur-lg border border-red-300/60 rounded-2xl p-4 flex items-center gap-3 shadow-xl shadow-red-500/20 relative z-10">
              <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50">
                <AlertCircle className="h-5 w-5 text-white" />
              </div>
              <p className="font-bold text-red-900">{error}</p>
            </div>
          )}

          {/* Action Area */}
          <div className="mt-8 pt-6 border-t border-white/30 relative z-10">
            <div className="mb-6 bg-amber-100/60 backdrop-blur-lg border border-amber-300/60 rounded-2xl p-4 shadow-lg shadow-amber-500/10">
              <div className="flex items-center gap-3 text-amber-900">
                <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <p className="font-semibold text-sm">
                  Generointi kestää 20-40 sekuntia. Älä sulje sivua!
                </p>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isGenerating || !jobDescription.trim()}
              className={`w-full py-5 px-8 text-lg font-extrabold rounded-2xl border-2 transition-all duration-300 relative overflow-hidden group
                ${
                isGenerating || !jobDescription.trim()
                  ? "bg-gray-300/60 backdrop-blur-sm text-gray-500 cursor-not-allowed border-gray-400/60 shadow-lg"
                  : "bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white border-white/40 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] active:scale-[0.98]"
                }`}
            >
              {/* Liquid glass shimmer effect */}
              {!isGenerating && jobDescription.trim() && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
              )}
              
              <div className="flex items-center justify-center gap-3 relative z-10">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>PROSESSOIDAAN... (20-40s)</span>
                  </>
                ) : (
                  <>
                    {selectedVersion === "v2" ? (
                      <>
                        <Zap className="w-6 h-6" />
                        <span>🎯 LUO ATS-OPTIMOITU HAKUKIRJE</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        <span>✨ LUO HAKUKIRJE</span>
                      </>
                    )}
                    <ArrowRight className="w-6 h-6" />
                  </>
                )}
              </div>
            </button>

            {/* Status Badge - Enhanced Glass */}
            <div className="mt-6 text-center">
              {isPremium ? (
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-green-500/30">
                  <CheckCircle className="w-5 h-5" />
                  PREMIUM AKTIIVINEN
                </div>
              ) : (
                <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all hover:scale-105">
                  <Crown className="w-5 h-5" />
                  PÄIVITÄ PREMIUMIIN
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CTA for non-premium users - Premium Glass Card */}
        {!isPremium && (
          <div className="mt-8 bg-gradient-to-br from-indigo-500/80 to-purple-600/80 backdrop-blur-xl border border-white/30 rounded-3xl p-10 text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-indigo-500/20 opacity-50"></div>
            
            <div className="relative z-10">
              <h4 className="text-3xl font-extrabold mb-4 flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-xl shadow-amber-500/50">
                  <Target className="h-6 w-6 text-white" />
                </div>
                Haluatko ATS-optimoinnin?
              </h4>
              <p className="mb-6 text-indigo-100 text-lg leading-relaxed">
                Päivitä Premium-tiliin ja saat rajattomasti ATS-optimoituja hakukirjeitä + tekoälyavusteista sisältöä
              </p>
              <button
                onClick={() => alert("Ohjataan hinnoittelusivulle...")}
                className="bg-white text-indigo-600 hover:bg-indigo-50 px-8 py-4 rounded-xl font-extrabold transition-all inline-flex items-center gap-3 shadow-xl hover:shadow-2xl hover:scale-105"
              >
                <Crown className="h-6 w-6" />
                KATSO PREMIUM-HINNAT
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}