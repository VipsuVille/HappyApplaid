// app/create-cv/page.tsx - LISÄTTY GENERIC vs ATS-OPTIMIZED valinta

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

type CVTemplate = "technical" | "creative" | "simple";
type CVMode = "generic" | "ats-optimized";

interface SubscriptionStatus {
  plan_type: "free" | "premium";
  is_premium: boolean;
  has_used_free_cv: boolean;
  tokens: number;
  cv_count: number;
  can_create_cv: boolean;
  message: string;
}

export default function CreateCVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CVTemplate>("simple");
  const [cvMode, setCvMode] = useState<CVMode>("generic"); // ✅ UUSI STATE
  const [jobPosting, setJobPosting] = useState(""); 
  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadProfile();
    checkSubscription();
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      setSubscriptionLoading(true);
      const response = await fetch("/api/check-subscription");
      
      if (response.ok) {
        const data: SubscriptionStatus = await response.json();
        setSubscription(data);
        console.log("✅ Subscription status:", data);
      } else {
        console.error("Failed to check subscription");
        setSubscription(null);
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const loadProfile = async () => {
    if (!user) {
      console.log("⚠️ No user, skipping profile load");
      return;
    }

    try {
      setProfileLoading(true);
      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        console.error("❌ No Supabase token available");
        setProfileLoading(false);
        return;
      }
      
      const response = await fetch(`/api/user-profile/${user.id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
      } else if (response.status === 404) {
        console.warn("⚠️ No profile found");
        setProfileData(null);
      } else {
        const errorData = await response.json();
        console.error("❌ Error loading profile:", errorData);
        setProfileData(null);
      }
    } catch (error) {
      console.error("❌ Exception loading profile:", error);
      setProfileData(null);
    } finally {
      setProfileLoading(false);
    }
  };

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

    // ✅ PREMIUM: ATS-optimoitu CV vaatii job postingin
    if (subscription?.is_premium && cvMode === "ats-optimized" && !jobPosting) {
      const confirm = window.confirm(
        "ATS-optimoitu CV hyötyy työpaikkailmoituksesta.\n\nLuodaanko silti generic CV?"
      );
      if (!confirm) return;
      
      // Vaihda generic-tilaan jos käyttäjä haluaa jatkaa
      setCvMode("generic");
    }

    setIsLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("No auth token");

      // ✅ Lähetä CV-generointi job postingilla (vain jos ATS-mode)
      const response = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvType: selectedTemplate,
          forceGenerate: false,
          jobPosting: cvMode === "ats-optimized" ? jobPosting : undefined, // ✅ Vain ATS-tilassa
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (errorData.error === "free_limit_reached") {
          toast.error(errorData.message, { duration: 8000 });
          router.push("/pricing");
          return;
        }

        if (errorData.error === "free_tier_simple_only") {
          toast.error(errorData.message);
          setSelectedTemplate("simple");
          return;
        }

        if (errorData.error === "free_tier_no_ats") {
          toast.error(errorData.message);
          return;
        }
        
        if (errorData.error === "data_validation_failed") {
          toast.error(
            `Profiilisi tarvitsee lisätietoja:\n\n${errorData.message}`,
            { duration: 8000 }
          );
          router.push("/profile");
          return;
        }
        
        throw new Error(errorData.error || "CV generation failed");
      }

      const result = await response.json();
      
      toast.success(
        result.isPremium
          ? result.isAtsOptimized
            ? "🎯 ATS-optimoitu CV luotu!"
            : "✅ Premium CV luotu!"
          : "✅ Ilmainen CV luotu!"
      );
      
      router.push(`/edit-cv/${result.id}`);
      
    } catch (error) {
      console.error("CV creation failed:", error);
      toast.error(
        error instanceof Error ? error.message : "CV:n luonti epäonnistui"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!userLoaded || profileLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Ladataan...</p>
        </div>
      </div>
    );
  }

  const isPremium = subscription?.is_premium || false;
  const canCreateCV = subscription?.can_create_cv || false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Luo Ammattimainen CV
          </h1>
          <p className="text-lg text-gray-600">
            {isPremium
              ? "Valitse CV-tyyppi ja optimoi työpaikkailmoituksen mukaan"
              : "Luo ilmainen persoonallisuusvetoinen CV"}
          </p>
        </div>

        {/* ✅ UUSI: CV MODE SELECTION (Generic vs ATS-Optimized) */}
        {isPremium && (
          <div className="mb-12 bg-white rounded-3xl p-8 shadow-lg border-2 border-indigo-200">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Target className="h-7 w-7 text-indigo-600" />
              Valitse CV-Tyyppi
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Generic CV */}
              <button
                onClick={() => {
                  setCvMode("generic");
                  setJobPosting(""); // Tyhjennä job posting
                }}
                className={`p-6 border-3 rounded-2xl text-left transition-all ${
                  cvMode === "generic"
                    ? "border-indigo-500 bg-indigo-50 shadow-lg scale-105"
                    : "border-gray-300 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      Yleinen CV
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Sopii kaikenlaisiin työhakemuksiin. Korostaa vahvuuksiasi ja persoonallisuuttasi.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-indigo-700">
                      <Sparkles className="h-4 w-4" />
                      <span>Nopea luonti, monipuolinen käyttö</span>
                    </div>
                  </div>
                </div>
                {cvMode === "generic" && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-indigo-600">
                    <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                    Valittu
                  </div>
                )}
              </button>

              {/* ATS-Optimized CV */}
              <button
                onClick={() => setCvMode("ats-optimized")}
                className={`p-6 border-3 rounded-2xl text-left transition-all ${
                  cvMode === "ats-optimized"
                    ? "border-purple-500 bg-purple-50 shadow-lg scale-105"
                    : "border-gray-300 hover:border-purple-300"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-2">
                      ATS-Optimoitu CV
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Räätälöity tietylle työpaikalle. Maksimoi läpäisyaste ATS-järjestelmissä (60% → 90%+).
                    </p>
                    <div className="flex items-center gap-2 text-xs text-purple-700">
                      <Target className="h-4 w-4" />
                      <span>Vaatii työpaikkailmoituksen</span>
                    </div>
                  </div>
                </div>
                {cvMode === "ats-optimized" && (
                  <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-purple-600">
                    <div className="h-2 w-2 rounded-full bg-purple-600"></div>
                    Valittu
                  </div>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <strong>Vinkki:</strong>{" "}
                  {cvMode === "generic" 
                    ? "Yleinen CV toimii hyvin kun haet useita eri paikkoja samanaikaisesti."
                    : "ATS-optimoitu CV kasvattaa huomattavasti mahdollisuuksiasi päästä haastatteluun tiettyyn työpaikkaan."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ✅ JOB POSTING TEXTAREA (vain ATS-tilassa) */}
        {isPremium && cvMode === "ats-optimized" && (
          <div className="mb-12 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl p-8 border-2 border-purple-200 shadow-xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  🎯 Työpaikkailmoitus (ATS-Optimointi)
                </h3>
                <p className="text-gray-700">
                  Liitä työpaikkailmoitus alle, niin optimoimme CV:si läpäisemään
                  ATS-järjestelmät (Applicant Tracking Systems) ja nostamaan
                  profiilin relevanssipisteet 60% → 90%+.
                </p>
              </div>
            </div>

            <textarea
              value={jobPosting}
              onChange={(e) => setJobPosting(e.target.value)}
              placeholder="Kopioi työpaikkailmoitus tähän...&#10;&#10;Esimerkki:&#10;'Haemme Full Stack -kehittäjää React/Node.js osaamisella. Tehtävässä työskentelet modernin teknologian parissa ja kehität yrityksen digitaalisia palveluita...'"
              rows={12}
              className="w-full p-4 border-2 border-purple-300 rounded-xl focus:border-purple-500 focus:outline-none resize-none font-mono text-sm bg-white"
            />

            <div className="mt-4 flex items-start gap-2 text-sm text-gray-600">
              <AlertCircle className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Vinkki:</strong> Mitä tarkempi työpaikkailmoitus, sitä paremmin
                CV optimoituu. Sisällytä vaatimukset, toivottu osaaminen ja yrityksen arvot.
              </p>
            </div>

            {jobPosting.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-green-700">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span className="font-semibold">
                    Työpaikkailmoitus vastaanotettu ({jobPosting.length} merkkiä)
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Template Selection */}
        <div className="mb-12">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Valitse CV-Malli
            </h2>
            <p className="text-gray-600">
              {isPremium
                ? "Kaikki mallit saatavilla Premium-tilauksen kanssa"
                : "Ilmainen käyttäjä: vain Rento-malli saatavilla"}
            </p>
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
              <p className="text-sm text-gray-600">
                Persoonallinen ja lähestyttävä CV
              </p>
              {!isPremium && (
                <div className="mt-3 text-xs text-blue-600 font-semibold">
                  Ilmainen (1x)
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
              <p className="text-sm text-gray-600">
                Tekninen ja strukturoitu ammattilaisille
              </p>
              {!isPremium && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 font-semibold">
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
              <p className="text-sm text-gray-600">
                Luova ja visuaalinen portfolio-CV
              </p>
              {!isPremium && (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 font-semibold">
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
            <p className="text-lg text-gray-600 mb-8">
              {isPremium
                ? cvMode === "ats-optimized" && jobPosting
                  ? "Tekoäly optimoi CV:si annetun työpaikkailmoituksen mukaan"
                  : "Tekoäly luo ammattimaisen CV:n profiilitietojesi pohjalta"
                : "Tekoäly luo persoonallisen ilmaisen CV:n profiilitietojesi pohjalta"}
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
                  Luodaan CV:tä...
                </div>
              ) : (
                <div className="flex items-center">
                  <Sparkles className="h-6 w-6 mr-3" />
                  {isPremium 
                    ? cvMode === "ats-optimized"
                      ? "🎯 Luo ATS-Optimoitu CV"
                      : "Luo Premium CV"
                    : "Luo Ilmainen CV"}
                </div>
              )}
            </Button>

            <p className="text-sm text-gray-500 mt-4">
              {isPremium
                ? `CV:n luominen vie 30-60 sekuntia. ${
                    cvMode === "ats-optimized" 
                      ? "ATS-optimointi analysoi työpaikkailmoituksen." 
                      : `Tokenia jäljellä: ${subscription?.tokens || 0}`
                  }`
                : "Ilmainen CV ei ole ATS-optimoitu, mutta tuo persoonallisuutesi esille"}
            </p>

            {/* CTA Premium-päivitykseen (jos FREE) */}
            {!isPremium && (
              <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white">
                <h4 className="text-xl font-bold mb-2">
                  Haluatko ATS-optimoinnin?
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
  );
}