// app/create-cv/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { FileText, Sparkles, Zap, Target, Info, Crown, AlertCircle } from "lucide-react";
import SmartHeader from "@/components/ui/smartHeader";
import { useTokens } from "@/hooks/useTokens";

type CVTemplate = "technical" | "creative" | "simple";

export default function CreateCVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  
  // ✅ TOGGLET
  const [useATS, setUseATS] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();
  const { canUseFeature, getTierInfo, isLoading: tierLoading } = useTokens();

  // ✅ TIER INFO
  const tierInfo = getTierInfo();
  const canUseATSFeature = canUseFeature('ats');
  const canUseRAGFeature = canUseFeature('rag');

  useEffect(() => {
    if (isLoading) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = '';
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [isLoading]);

  const generateCVFromProfile = async () => {
    if (!user) {
      toast.error("Kirjaudu sisään luodaksesi CV:n");
      return;
    }

    // ✅ VALIDOI ATS/RAG KÄYTTÖ
    if (useATS && !canUseATSFeature) {
      toast.error("ATS-optimointi vaatii Semi-Pro tai Pro -tason");
      return;
    }

    if (useRAG && !canUseRAGFeature) {
      toast.error("RAG-tietokanta vaatii Pro-tason");
      return;
    }

    if (useATS && !jobPosting.trim()) {
      toast.error("Anna työpaikkailmoitus ATS-optimointia varten");
      return;
    }

    setIsLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No auth token");

      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvType: selectedTemplate,
          forceGenerate: false,
          
          // ✅ LÄHETÄ ATS/RAG FLAGS
          jobPosting: useATS ? jobPosting : undefined,
          enableRAG: useRAG
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "CV generation failed");
      }

      const result = await response.json();
      
      toast.success(
        useRAG ? "🎯 RAG-optimoitu CV luotu!" :
        useATS ? "✅ ATS-optimoitu CV luotu!" :
        "✅ CV luotu!"
      );

      router.push(`/edit-cv/${result.id}`);
      
    } catch (error) {
      console.error("CV creation failed:", error);
      toast.error(error instanceof Error ? error.message : "CV:n luonti epäonnistui");
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLoaded || tierLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <SmartHeader />
      
      {/* ✅ GENEROINTI ILMOITUS */}
      {isLoading && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-lg animate-fade-in">
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

      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <div className="max-w-5xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Luo Ammattimainen CV
            </h1>
            <p className="text-lg text-gray-600">
              {tierInfo.name === 'pro'
                ? "Pro-taso: Kaikki ominaisuudet käytössäsi"
                : tierInfo.name === 'semi-pro'
                ? "Semi-Pro: ATS-optimointi käytössä"
                : "Aloita ilmaiseksi tai päivitä lisää ominaisuuksia varten"}
            </p>
          </div>

          {/* ✅ ATS/RAG TOGGLET (Semi-Pro+) */}
          {(canUseATSFeature || canUseRAGFeature) && (
            <div className="mb-12 bg-white rounded-3xl p-8 border-2 border-indigo-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Target className="h-7 w-7 text-indigo-600" />
                Optimointiominaisuudet
              </h3>
              
              <div className="space-y-6">
                
                {/* ATS Toggle (Semi-Pro+) */}
                {canUseATSFeature && (
                  <div className="flex items-start gap-4 p-6 bg-purple-50 rounded-xl border-2 border-purple-200">
                    <input
                      type="checkbox"
                      id="use-ats"
                      checked={useATS}
                      onChange={(e) => setUseATS(e.target.checked)}
                      className="mt-1 h-5 w-5 text-purple-600"
                    />
                    <div className="flex-1">
                      <label htmlFor="use-ats" className="font-bold text-gray-900 text-lg cursor-pointer">
                        Käytä ATS-optimointia
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Optimoi CV työpaikkailmoituksen mukaan. Maksimoi läpäisyaste ATS-järjestelmissä (60% → 90%+).
                      </p>
                      {useATS && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Liitä työpaikkailmoitus:
                          </label>
                          <textarea
                            value={jobPosting}
                            onChange={(e) => setJobPosting(e.target.value)}
                            placeholder="Kopioi työpaikkailmoitus tähän..."
                            rows={6}
                            className="w-full p-3 border-2 border-purple-300 rounded-lg focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* RAG Toggle (Pro only) */}
                {canUseRAGFeature && (
                  <div className="flex items-start gap-4 p-6 bg-amber-50 rounded-xl border-2 border-amber-200">
                    <input
                      type="checkbox"
                      id="use-rag"
                      checked={useRAG}
                      onChange={(e) => setUseRAG(e.target.checked)}
                      className="mt-1 h-5 w-5 text-amber-600"
                    />
                    <div className="flex-1">
                      <label htmlFor="use-rag" className="font-bold text-gray-900 text-lg cursor-pointer flex items-center gap-2">
                        Käytä RAG-tietokantaa
                        <Crown className="w-5 h-5 text-amber-600" />
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full font-bold">PRO</span>
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Konsultoi asiantuntija-artikkeleitamme. AI hakee parhaat käytännöt ja optimoi CV:si laadun.
                      </p>
                      <div className="mt-3 p-3 bg-amber-100 border border-amber-200 rounded-lg">
                        <div className="flex items-start gap-2 text-sm text-amber-800">
                          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <p>
                            <strong>RAG-teknologia:</strong> Hakee tietokannastamme 3-5 asiantuntija-artikkelia, 
                            jotka liittyvät sinun profiiliisi ja työpaikkaasi. Näin CV:stäsi tulee laadukkaampi ja 
                            ammattimaisempi.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info-laatikko */}
              <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <strong>Vinkki:</strong>{" "}
                    {canUseRAGFeature 
                      ? "Voit käyttää RAG:ia ja ATS:ää yhdessä saadaksesi parhaan mahdollisen CV:n!"
                      : canUseATSFeature
                      ? "ATS-optimointi kasvattaa huomattavasti mahdollisuuksiasi päästä haastatteluun."
                      : "Päivitä Semi-Pro tai Pro -tasoon saadaksesi ATS-optimoinnin ja RAG-teknologian."}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Template Selection */}
          <div className="mb-12">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Valitse CV-Malli
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Simple CV */}
              <button
                onClick={() => setSelectedTemplate("simple")}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "simple"
                    ? "border-indigo-500 bg-indigo-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg"
                }`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rento</h3>
                <p className="text-sm text-gray-600">
                  Persoonallinen ja lähestyttävä CV
                </p>
              </button>

              {/* Professional CV */}
              <button
                onClick={() => setSelectedTemplate("technical")}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "technical"
                    ? "border-purple-500 bg-purple-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white hover:border-purple-300"
                }`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-sm text-gray-600">
                  Tekninen ja strukturoitu ammattilaisille
                </p>
              </button>

              {/* Creative CV */}
              <button
                onClick={() => setSelectedTemplate("creative")}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "creative"
                    ? "border-pink-500 bg-pink-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white hover:border-pink-300"
                }`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Creative</h3>
                <p className="text-sm text-gray-600">
                  Luova ja visuaalinen portfolio-CV
                </p>
              </button>
            </div>
          </div>

          {/* Action Button */}
          <div className="bg-gradient-to-br from-white to-indigo-50 rounded-3xl p-12 border-2 border-indigo-200 shadow-2xl">
            <div className="max-w-2xl mx-auto text-center">
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                Valmis Luomaan CV:si?
              </h3>
              
              <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                <div className="flex items-center justify-center gap-2 text-amber-800">
                  <AlertCircle className="h-5 w-5" />
                  <p className="font-semibold">
                    Generointi kestää 30-60 sekuntia. Älä sulje sivua!
                  </p>
                </div>
              </div>

              <p className="text-lg text-gray-600 mb-8">
                {useRAG && useATS
                  ? "Tekoäly luo RAG-optimoidun ATS-CV:n asiantuntija-artikkeleiden ja työpaikkailmoituksen avulla"
                  : useRAG
                  ? "Tekoäly konsultoi asiantuntija-artikkeleitamme luodessaan CV:si"
                  : useATS
                  ? "Tekoäly optimoi CV:si annetun työpaikkailmoituksen mukaan"
                  : "Tekoäly luo ammattimaisen CV:n profiilitietojesi pohjalta"}
              </p>

              <Button
                onClick={generateCVFromProfile}
                disabled={isLoading || !user}
                size="lg"
                className="px-12 py-6 text-lg bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all disabled:opacity-70 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Luodaan CV:tä... (30-60s)
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Sparkles className="h-6 w-6 mr-3" />
                    {useRAG ? "🎯 Luo RAG-CV" : useATS ? "Luo ATS-CV" : "Luo CV"}
                  </div>
                )}
              </Button>

              <p className="text-sm text-gray-500 mt-4">
                {tierInfo.name === 'pro'
                  ? `PRO-taso: ${tierInfo.tokens} tokenia jäljellä`
                  : tierInfo.name === 'semi-pro'
                  ? `Semi-Pro: ${tierInfo.tokens} tokenia jäljellä`
                  : "Ilmainen CV (1x)"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}