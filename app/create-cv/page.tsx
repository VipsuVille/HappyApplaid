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
  ChevronDown,
} from "lucide-react";
import { useTokens } from "@/hooks/useTokens";
import type { TokenAction } from "@/lib/domain/tokens";
import { PRICING } from "@/lib/pricing";

type CVTemplate = "technical" | "creative" | "simple";

export default function CreateCVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<CVTemplate>("simple");
  const [jobPosting, setJobPosting] = useState("");
  const [profileData, setProfileData] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [useATS, setUseATS] = useState(false);
  const [useRAG, setUseRAG] = useState(false);

  const { user, isLoaded: userLoaded } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  const {
    tokens,
    isActive,
    plan_type,
    features,
    isLoading: tokensLoading,
    canUseAction,
    getActionCost,
  } = useTokens();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setProfileLoading(true);
        const res = await fetch(`/api/user-profile/${user.id}`);
        setProfileData(res.ok ? await res.json() : null);
      } catch {
        setProfileData(null);
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  const actions: TokenAction[] = ["cv_basic"];
  if (useATS) actions.push("cv_ats_addon");
  if (useRAG) actions.push("cv_rag_addon");

  const totalCost = actions.reduce(
    (sum, a) => sum + getActionCost(a),
    0
  );

  if (!userLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );
  }

  const generateCVFromProfile = async () => {
    if (!profileData) {
      toast.error("Täytä profiilisi ensin");
      router.push("/profile");
      return;
    }

    if (useATS && !jobPosting.trim()) {
      toast.error("ATS vaatii työpaikkailmoituksen");
      return;
    }

    for (const action of actions) {
      const v = canUseAction(action);
      if (!v.allowed) {
        toast.error(v.reason);
        return;
      }
    }

    setIsLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      const res = await fetch("/api/generate-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileData,
          action: actions,
          cvType: selectedTemplate,
          language: "finnish",
          jobPosting: useATS || useRAG ? jobPosting : undefined,
          enableRAG: useRAG,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/edit-cv/${data.id || data.cvId}`);
    } catch (e: any) {
      toast.error(e.message || "CV:n luonti epäonnistui");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 pb-32 sm:pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-10">

        {/* HEADER */}
        <div className="text-center space-y-3">
          <h1 className="text-2xl sm:text-4xl font-bold">
            Luo ammattimainen CV
          </h1>
          <p className="text-sm sm:text-lg text-gray-600">
            Generoi CV profiilitiedoistasi tekoälyn avulla
          </p>
        </div>

        {/* OPTIMOINNIT – ACCORDION */}
        {(features.canUseATS || features.canUseRAG) && (
          <div className="space-y-4">
            {features.canUseATS && (
              <details className="bg-white rounded-2xl border group">
                <summary className="flex justify-between items-center p-4 cursor-pointer">
                  <span className="font-bold flex items-center gap-2">
                    <Target className="w-5 h-5 text-indigo-600" />
                    ATS-optimointi
                  </span>
                  <ChevronDown className="group-open:rotate-180 transition" />
                </summary>
                <div className="p-4 border-t space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useATS}
                      onChange={(e) => setUseATS(e.target.checked)}
                    />
                    <span>Käytä ATS-optimointia</span>
                  </label>
                  {useATS && (
                    <textarea
                      className="w-full p-3 border rounded-lg"
                      rows={5}
                      placeholder="Liitä työpaikkailmoitus..."
                      value={jobPosting}
                      onChange={(e) => setJobPosting(e.target.value)}
                    />
                  )}
                </div>
              </details>
            )}

            {features.canUseRAG && (
              <details className="bg-white rounded-2xl border group">
                <summary className="flex justify-between items-center p-4 cursor-pointer">
                  <span className="font-bold flex items-center gap-2">
                    <Crown className="w-5 h-5 text-amber-600" />
                    RAG-tietokanta
                  </span>
                  <ChevronDown className="group-open:rotate-180 transition" />
                </summary>
                <div className="p-4 border-t space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={useRAG}
                      onChange={(e) => setUseRAG(e.target.checked)}
                    />
                    <span>Käytä RAG-optimointia</span>
                  </label>
                </div>
              </details>
            )}
          </div>
        )}

        {/* TEMPLATE VALINTA */}
        <div>
          <h2 className="text-xl sm:text-3xl font-bold text-center mb-6">
            Valitse CV-malli
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: "simple", icon: FileText, label: "Rento" },
              { id: "technical", icon: Sparkles, label: "Professional" },
              { id: "creative", icon: Zap, label: "Creative" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id as CVTemplate)}
                className={`p-4 sm:p-6 rounded-xl border transition ${
                  selectedTemplate === t.id
                    ? "border-indigo-500 bg-indigo-50"
                    : "bg-white"
                }`}
              >
                <t.icon className="w-8 h-8 mb-2" />
                <p className="font-bold">{t.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STICKY CTA – MOBIILI */}
      <div className="fixed bottom-0 left-0 right-0 sm:static bg-white border-t sm:border-0 p-4 z-40">
        <Button
          onClick={generateCVFromProfile}
          disabled={isLoading}
          className="w-full py-4 text-lg rounded-xl"
        >
          {isLoading ? "Luodaan CV:tä..." : `Luo CV (${totalCost} tok)`}
        </Button>
      </div>
    </div>
  );
}
