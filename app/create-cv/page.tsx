"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Sparkles,
  Zap,
  Target,
  Info,
  Crown,
  AlertCircle,
  ChevronDown,
  Check,
} from "lucide-react";
import { TokenAction, useTokens } from "@/hooks/useTokens";

type CVTemplate = "technical" | "creative" | "simple";

export default function CreateCVPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [useATS, setUseATS] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  const currentActions: TokenAction[] = ['cv_basic'];
  if (useATS) currentActions.push('cv_ats_addon');
  if (useRAG) currentActions.push('cv_rag_addon');

  const totalCost = currentActions.reduce(
    (sum, action) => sum + getActionCost(action),
    0
  );

  // ✅ OIKEA CV-GENEROINTI
  const handleGenerateCV = async () => {
    console.log('🚀 [FRONTEND] Generate CV button clicked');
    console.log('   - Template:', selectedTemplate);
    console.log('   - ATS:', useATS);
    console.log('   - RAG:', useRAG);
    console.log('   - Total cost:', totalCost);
    
    if (tokens < totalCost) {
      toast({
        title: "Ei tarpeeksi tokeneita",
        description: `Tarvitset ${totalCost} tokenia, mutta sinulla on vain ${tokens}.`,
        variant: "destructive",
      });
      return;
    }

    if (useATS && !jobPosting.trim()) {
      toast({
        title: "Puuttuva työpaikkailmoitus",
        description: "Syötä työpaikkailmoitus ATS-optimointia varten.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log('   → Starting API call...');

    try {
      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvType: selectedTemplate,
          jobPosting: useATS ? jobPosting : undefined,
          enableRAG: useRAG,
          language: "finnish",
          skipQuestions: false,
        }),
      });

      console.log('   → API response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('   ❌ API error:', error);
        throw new Error(error.message || "CV-generointi epäonnistui");
      }

      const data = await response.json();
      console.log('   ✅ API success:', data);

      // Tarkista tarvitaanko kysymyksiä
      if (data.needsMoreInfo && data.questions) {
        console.log('   ❓ Questions needed:', data.questions.length);
        
        toast({
          title: "Tarvitaan lisätietoja",
          description: `${data.questions.length} kysymystä vastattavana.`,
        });

        // TODO: Ohjaa kysymyssivulle tai näytä modaali
        router.push(`/questions?cvId=${data.cvId || 'new'}`);
        return;
      }

      // CV valmis!
      toast({
        title: "CV valmis! 🎉",
        description: `Generointi kesti ${Math.round((data.generationTime || 0) / 1000)}s`,
      });

      console.log('   → Redirecting to CV page...');
      router.push(`/cvs/${data.cvId}`);

    } catch (error) {
      console.error('❌ [FRONTEND] Generation failed:', error);
      
      toast({
        title: "Virhe CV:n luonnissa",
        description: error instanceof Error ? error.message : "Tuntematon virhe",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      console.log('   → Loading state reset');
    }
  };

  const templates = [
    {
      id: "simple" as CVTemplate,
      icon: FileText,
      label: "Rento",
      description: "Persoonallinen ja lähestyttävä CV",
      gradient: "from-blue-500 to-cyan-600",
      bg: "bg-blue-50",
      border: "border-blue-500",
    },
    {
      id: "technical" as CVTemplate,
      icon: Sparkles,
      label: "Professional",
      description: "Tekninen ja strukturoitu ammattilaisille",
      gradient: "from-indigo-500 to-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-500",
    },
    {
      id: "creative" as CVTemplate,
      icon: Zap,
      label: "Creative",
      description: "Luova ja visuaalinen portfolio-CV",
      gradient: "from-pink-500 to-rose-600",
      bg: "bg-pink-50",
      border: "border-pink-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Loading Banner */}
      {isLoading && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4 animate-fade-in">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-5 rounded-2xl shadow-2xl border-2 border-white/20">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-white border-t-transparent"></div>
                  <div className="absolute inset-0 rounded-full bg-white/10 animate-ping"></div>
                </div>
              </div>
              <div className="flex-1">
                <p className="font-bold text-lg mb-1">CV:tä luodaan...</p>
                <p className="text-sm text-indigo-100 leading-relaxed">
                  ⏱️ Kestää 30-60 sekuntia. Älä sulje sivua.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center pt-12 pb-8 px-4">
        <h1 className="text-3xl lg:text-5xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          Luo Ammattimainen CV
        </h1>
        <p className="text-lg lg:text-xl text-gray-600 mb-2">
          {plan_type === "pro"
            ? "Pro-taso: Kaikki ominaisuudet käytössäsi"
            : plan_type === "semi-pro"
            ? "Semi-Pro: ATS-optimointi käytössä"
            : plan_type === "basic"
            ? "Basic: Rajattomat perus CV:t"
            : "Free: 1 ilmainen CV"}
        </p>
        <p className="text-sm text-gray-500">{tokens} tokenia jäljellä</p>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-32 lg:pb-16">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT: Templates + Settings */}
          <div className="lg:col-span-2 space-y-8">
            {/* Template Selection */}
            <div className="bg-white rounded-3xl p-6 lg:p-8 border-2 border-indigo-200 shadow-lg">
              <h2 className="text-2xl lg:text-3xl font-bold mb-6 flex items-center gap-3">
                <FileText className="text-indigo-600 w-7 h-7" />
                Valitse CV-Malli
              </h2>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`p-6 rounded-2xl border-2 text-left transition-all transform hover:scale-105 ${
                      selectedTemplate === t.id
                        ? `${t.border} ${t.bg} shadow-xl scale-105`
                        : "border-gray-200 bg-white hover:shadow-lg"
                    }`}
                  >
                    <div className={`h-14 w-14 bg-gradient-to-br ${t.gradient} rounded-2xl flex items-center justify-center mb-4`}>
                      <t.icon className="h-7 w-7 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{t.label}</h3>
                    <p className="text-sm text-gray-600">{t.description}</p>
                    {selectedTemplate === t.id && (
                      <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                        <Check className="w-4 h-4" />
                        Valittu
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Optimization Settings */}
            <div className="hidden lg:block bg-white rounded-3xl p-8 border-2 border-indigo-200 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <Target className="text-indigo-600 w-7 h-7" />
                Optimointiominaisuudet
              </h2>

              <div className="space-y-6">
                {/* ATS Option */}
                {features.canUseATS && (
                  <div className={`p-6 rounded-xl border-2 transition-all ${
                    useATS ? "bg-purple-50 border-purple-300 shadow-md" : "bg-gray-50 border-gray-200"
                  }`}>
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useATS}
                        onChange={(e) => setUseATS(e.target.checked)}
                        className="mt-1 h-5 w-5 text-purple-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          ATS-optimointi
                          <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            +10 tokenia
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          Optimoi CV työpaikkailmoituksen mukaan. Maksimoi läpäisyaste.
                        </p>
                        {useATS && (
                          <textarea
                            value={jobPosting}
                            onChange={(e) => setJobPosting(e.target.value)}
                            placeholder="Kopioi työpaikkailmoitus tähän..."
                            rows={5}
                            className="w-full p-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
                          />
                        )}
                      </div>
                    </label>
                  </div>
                )}

                {/* RAG Option */}
                {features.canUseRAG && (
                  <div className={`p-6 rounded-xl border-2 transition-all ${
                    useRAG ? "bg-amber-50 border-amber-300 shadow-md" : "bg-gray-50 border-gray-200"
                  }`}>
                    <label className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={useRAG}
                        onChange={(e) => setUseRAG(e.target.checked)}
                        className="mt-1 h-5 w-5 text-amber-600 rounded"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1 flex items-center gap-2">
                          RAG-tietokanta
                          <Crown className="w-5 h-5 text-amber-600" />
                          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">
                            Pro • +20 tok
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          AI konsultoi CV-asiantuntija-artikkeleitamme.
                        </p>
                        <div className="p-3 bg-amber-100 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-2 text-xs text-amber-800">
                            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <p>
                              <strong>Hakee vain CV-materiaaleja:</strong> 3-5 asiantuntija-artikkelia
                            </p>
                          </div>
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Summary Card (Desktop Sticky) */}
          <div className="hidden lg:block">
            <div className="sticky top-24 bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-8 border-2 border-indigo-200 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Tilauksen Yhteenveto
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-200">
                  <span className="font-semibold text-gray-700">Perus CV</span>
                  <span className="font-bold text-indigo-600">15 tok</span>
                </div>

                {useATS && (
                  <div className="flex justify-between items-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                    <span className="font-semibold text-gray-700">ATS-lisä</span>
                    <span className="font-bold text-purple-600">+10 tok</span>
                  </div>
                )}

                {useRAG && (
                  <div className="flex justify-between items-center p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="font-semibold text-gray-700">RAG-lisä</span>
                    <span className="font-bold text-amber-600">+20 tok</span>
                  </div>
                )}

                <div className="h-px bg-gray-300 my-4"></div>

                <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-xl border-2 border-indigo-300">
                  <span className="text-lg font-bold text-gray-900">Yhteensä</span>
                  <span className="text-2xl font-bold text-indigo-600">{totalCost} tok</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-center gap-2 text-amber-800 mb-2">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-semibold text-sm">Huomio</p>
                </div>
                <p className="text-xs text-amber-700">
                  Generointi kestää 30-60 sekuntia. Älä sulje sivua!
                </p>
              </div>

              <Button
                onClick={handleGenerateCV}
                disabled={isLoading || tokensLoading}
                className="w-full py-6 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-70 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Luodaan...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <Sparkles className="h-6 w-6 mr-2" />
                    Luo CV ({totalCost} tok)
                  </div>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500 mt-4">
                {tokens} tokenia jäljellä tilauksen jälkeen: {tokens - totalCost}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-indigo-200 shadow-2xl z-40">
        <button
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="w-full p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 rounded-full p-2">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-bold text-gray-900">Yhteensä: {totalCost} tokenia</p>
              <p className="text-xs text-gray-500">{tokens - totalCost} jäljellä</p>
            </div>
          </div>
          <ChevronDown className={`w-6 h-6 text-gray-600 transition-transform ${showMobileMenu ? "rotate-180" : ""}`} />
        </button>

        {showMobileMenu && (
          <div className="border-t border-gray-200 p-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-4 mb-4">
              {features.canUseATS && (
                <label className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <input
                    type="checkbox"
                    checked={useATS}
                    onChange={(e) => setUseATS(e.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm">ATS-optimointi (+10 tok)</p>
                    <p className="text-xs text-gray-600">Työpaikkakohtainen optimointi</p>
                    {useATS && (
                      <textarea
                        value={jobPosting}
                        onChange={(e) => setJobPosting(e.target.value)}
                        placeholder="Työpaikkailmoitus..."
                        rows={3}
                        className="w-full mt-2 p-2 border rounded text-xs"
                      />
                    )}
                  </div>
                </label>
              )}

              {features.canUseRAG && (
                <label className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <input
                    type="checkbox"
                    checked={useRAG}
                    onChange={(e) => setUseRAG(e.target.checked)}
                    className="mt-1 h-5 w-5"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-sm flex items-center gap-2">
                      RAG-tietokanta <Crown className="w-4 h-4 text-amber-600" />
                    </p>
                    <p className="text-xs text-gray-600">Asiantuntija-artikkeleita (+20 tok)</p>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        <div className="p-4 pt-0">
          <Button
            onClick={handleGenerateCV}
            disabled={isLoading || tokensLoading}
            className="w-full py-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl font-bold"
          >
            {isLoading ? "Luodaan..." : `Luo CV (${totalCost} tok)`}
          </Button>
        </div>
      </div>
    </div>
  );
}