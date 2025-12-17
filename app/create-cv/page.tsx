// app/create-cv/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  FileText,
  Sparkles,
  Zap,
  Target,
  Info,
  Crown,
  AlertCircle,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";

type CVTemplate = "technical" | "creative" | "simple";



export default function CreateCVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  
  // ✅ TOGGLET
  const [useATS, setUseATS] = useState(false);
  const [useRAG, setUseRAG] = useState(false);
  
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
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


  // Hae profiili
  const loadProfile = async () => {
    if (!user) return;

    try {
      setProfileLoading(true);
      const token = await getToken({ template: "supabase" });
      if (!token) return;
      
      const response = await fetch(`/api/user-profile/${user.id}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      } else if (response.status === 404) {
        setProfileData(null);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (userLoaded && user) {
      loadProfile();
    }
  }, [userLoaded, user]);

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

    if (!profileData) {
      toast.error("Täytä ensin profiilisi!");
      router.push("/profile");
      return;
    }

    //  FREE-käyttäjät: tarkista onko jo käytetty ilmainen CV
if (plan_type === 'free' && !canUseAction('cv_v1').allowed) {
  toast.error(
    "Olet jo käyttänyt ilmaisen CV:n! Päivitä Premium-tiliin luodaksesi lisää.",
    { duration: 6000 }
  );
  router.push("/pricing");
  return;
}

    // ✅ VALIDOI ATS/RAG KÄYTTÖ
    if (useATS && !features.canUseATS) {
      toast.error("ATS-optimointi vaatii Semi-Pro tai Pro -tason");
      return;
    }

    if (useRAG && !features.canUseRAG) {
      toast.error("RAG-tietokanta vaatii Pro-tason");
      return;
    }

    if (useATS && !jobPosting.trim()) {
      toast.error("Anna työpaikkailmoitus ATS-optimointia varten");
      return;
    }

    // ✅ TARKISTA TOKENIT ENNEN GENEROINTIA
    const action = useRAG ? 'cv_rag' : useATS ? 'cv_ats' : 'cv_v1';
    const validation = canUseAction(action);
    
    if (!validation.allowed && plan_type !== 'free') {
      toast.error(validation.reason || 'Ei voi generoida CV:tä');
      return;
    }

    const cost = getActionCost(action);

    setIsLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No auth token");

      console.log("🚀 Generating CV with:", { 
        cvType: selectedTemplate, 
        useATS, 
        useRAG,
        cost 
      });

      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvType: selectedTemplate,
          forceGenerate: false,
          jobPosting: useATS ? jobPosting : undefined,
          enableRAG: useRAG
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error === "free_limit_reached") {
          toast.error(errorData.message, { duration: 8000 });
          router.push("/pricing");
          return;
        }

        throw new Error(errorData.error || "CV generation failed");
      }

      const result = await response.json();
      
      // ✅ KULUTA TOKENIT (vain premium-käyttäjille)
      if (plan_type !== 'free' && isActive) {
        console.log(`💰 Consuming ${cost} tokens for action: ${action}`);
        const consumed = await consumeTokens(action);
        
        if (!consumed) {
          console.warn("⚠️ Token consumption failed, but CV was created");
        } else {
          console.log(`✅ Tokens consumed successfully. Remaining: ${tokens - cost}`);
        }
      }
      
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

if (!userLoaded || profileLoading || tokensLoading) {
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
const canCreateCV = canUseAction('cv_v1').allowed;


  return (
    <div>
      
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
              {plan_type === 'pro'
                ? "Pro-taso: Kaikki ominaisuudet käytössäsi"
                : plan_type === 'semi-pro'
                ? "Semi-Pro: ATS-optimointi käytössä"
                : plan_type === 'basic'
                ? "Basic: Rajattomat yksinkertaiset CV:t"
                : "Aloita ilmaiseksi tai päivitä lisää ominaisuuksia varten"}
            </p>
          </div>

          {/* ✅ ATS/RAG TOGGLET (Semi-Pro+) */}
          {(features.canUseATS || features.canUseRAG) && (
            <div className="mb-12 bg-white rounded-3xl p-8 border-2 border-indigo-200 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Target className="h-7 w-7 text-indigo-600" />
                Optimointiominaisuudet
              </h3>
              
              <div className="space-y-6">
                
                {/* ATS Toggle (Semi-Pro+) */}
                {features.canUseATS && (
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
                        <span className="ml-2 text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                          {getActionCost('cv_ats')} tokenia
                        </span>
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
                {features.canUseRAG && (
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
                        <span className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full font-bold">
                          PRO - {getActionCost('cv_rag')} tokenia
                        </span>
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
                    {features.canUseRAG 
                      ? "Voit käyttää RAG:ia ja ATS:ää yhdessä saadaksesi parhaan mahdollisen CV:n!"
                      : features.canUseATS
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
                disabled={!canCreateCV && !isPremium}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "simple"
                    ? "border-indigo-500 bg-indigo-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg"
                } ${!canCreateCV && !isPremium ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mb-4">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rento</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Persoonallinen ja lähestyttävä CV
                </p>
                {!isPremium && (
                  <div className="text-xs text-blue-600 font-semibold">
                    {getActionCost('cv_v1')} tokenia
                  </div>
                )}
              </button>

              {/* Professional CV */}
              <button
                onClick={() => isPremium && setSelectedTemplate("technical")}
                disabled={!isPremium}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "technical" && isPremium
                    ? "border-purple-500 bg-purple-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white"
                } ${!isPremium ? "opacity-50 cursor-not-allowed" : "hover:border-purple-300"}`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Professional</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Tekninen ja strukturoitu ammattilaisille
                </p>
                {!isPremium && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold">
                    <Crown className="h-4 w-4" />
                    Premium
                  </div>
                )}
              </button>

              {/* Creative CV */}
              <button
                onClick={() => isPremium && setSelectedTemplate("creative")}
                disabled={!isPremium}
                className={`p-8 rounded-2xl border-2 transition-all text-left ${
                  selectedTemplate === "creative" && isPremium
                    ? "border-pink-500 bg-pink-50 shadow-xl scale-105"
                    : "border-gray-200 bg-white"
                } ${!isPremium ? "opacity-50 cursor-not-allowed" : "hover:border-pink-300"}`}
              >
                <div className="h-16 w-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Creative</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Luova ja visuaalinen portfolio-CV
                </p>
                {!isPremium && (
                  <div className="flex items-center gap-2 text-xs text-amber-600 font-semibold">
                    <Crown className="h-4 w-4" />
                    Premium
                  </div>
                )}
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
                disabled={isLoading || !user || !canCreateCV}
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
                    {useRAG ? `🎯 Luo RAG-CV (${getActionCost('cv_rag')} tok)` : 
                     useATS ? `Luo ATS-CV (${getActionCost('cv_ats')} tok)` : 
                     `Luo CV (${getActionCost('cv_v1')} tok)`}
                  </div>
                )}
              </Button>

              <p className="text-sm text-gray-500 mt-4">
        {isPremium
  ? `${plan_type.toUpperCase()}-taso: ${tokens} tokenia jäljellä`
  : canCreateCV
    ? "✅ Ilmainen CV käytettävissä (1x)"
    : "❌ Olet jo käyttänyt ilmaisen CV:n"}
              </p>

              {/* CTA Premium-päivitykseen (jos FREE) */}
{!isPremium && (
<div className="mt-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white">
<h4 className="text-xl font-bold mb-2">
Haluatko ATS-optimoinnin ja RAG:in?
</h4>
<p className="mb-4 text-indigo-100">
Päivitä Premium-tiliin ja saat rajattomasti ATS-optimoituja CV:itä + hakukirjeet
</p>
<Button
onClick={() => router.push("/pricing")}
variant="outline"
className="bg-white text-indigo-600 hover:bg-indigo-50 border-0"
>
<Crown className="h-5 w-5 mr-2" />
Katso Premium-hinnat
</Button>
</div>
)}
</div>
</div>
</div>
</div>
</div>
);
}