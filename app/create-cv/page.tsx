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

  const { user, isLoaded } = useUser();
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
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [user]);

  const actions: TokenAction[] = ["cv_basic"];
  if (useATS) actions.push("cv_ats_addon");
  if (useRAG) actions.push("cv_rag_addon");
  const totalCost = actions.reduce((s, a) => s + getActionCost(a), 0);

  if (!isLoaded || profileLoading || tokensLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-b-2 border-indigo-600 rounded-full" />
      </div>
    );
  }

  const generateCV = async () => {
    if (!profileData) {
      toast.error("Täytä profiilisi ensin");
      router.push("/profile");
      return;
    }
    if (useATS && !jobPosting.trim()) {
      toast.error("ATS vaatii työpaikkailmoituksen");
      return;
    }
    for (const a of actions) {
      const v = canUseAction(a);
      if (!v.allowed) return toast.error(v.reason);
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">

      {/* HEADER */}
      <div className="text-center py-12 px-4">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3">
          Luo ammattimainen CV
        </h1>
        <p className="text-gray-600 text-lg">
          Räätälöi CV tekoälyn avulla työpaikkaasi varten
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-32 lg:pb-16 space-y-12">

        {/* DESKTOP OPTIMOINNIT */}
        <div className="hidden lg:block bg-white p-8 rounded-3xl border shadow-lg">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Target className="text-indigo-600" /> Optimointi
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {features.canUseATS && (
              <div className="p-6 bg-purple-50 rounded-xl border">
                <label className="flex gap-3 items-start">
                  <input
                    type="checkbox"
                    checked={useATS}
                    onChange={(e) => setUseATS(e.target.checked)}
                  />
                  <div>
                    <p className="font-bold">ATS-optimointi</p>
                    <p className="text-sm text-gray-600">
                      Optimoi CV työpaikkailmoituksen mukaan
                    </p>
                  </div>
                </label>
                {useATS && (
                  <textarea
                    className="mt-4 w-full p-3 border rounded-lg"
                    rows={5}
                    value={jobPosting}
                    onChange={(e) => setJobPosting(e.target.value)}
                  />
                )}
              </div>
            )}

            {features.canUseRAG && (
              <div className="p-6 bg-amber-50 rounded-xl border">
                <label className="flex gap-3 items-start">
                  <input
                    type="checkbox"
                    checked={useRAG}
                    onChange={(e) => setUseRAG(e.target.checked)}
                  />
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      RAG-tietokanta <Crown className="w-4 h-4 text-amber-600" />
                    </p>
                    <p className="text-sm text-gray-600">
                      Konsultoi CV-asiantuntija-artikkeleita
                    </p>
                  </div>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* TEMPLATE */}
        <div>
          <h2 className="text-2xl font-bold text-center mb-6">
            Valitse CV-malli
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: "simple", icon: FileText, label: "Rento" },
              { id: "technical", icon: Sparkles, label: "Professional" },
              { id: "creative", icon: Zap, label: "Creative" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTemplate(t.id as CVTemplate)}
                className={`p-6 rounded-2xl border text-left transition ${
                  selectedTemplate === t.id
                    ? "border-indigo-500 bg-indigo-50 shadow-lg"
                    : "bg-white hover:shadow"
                }`}
              >
                <t.icon className="w-10 h-10 mb-4" />
                <p className="font-bold text-lg">{t.label}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STICKY CTA */}
      <div className="fixed bottom-0 left-0 right-0 lg:static bg-white border-t p-4">
        <Button
          onClick={generateCV}
          disabled={isLoading}
          className="w-full py-4 text-lg rounded-xl"
        >
          {isLoading ? "Luodaan CV:tä..." : `Luo CV (${totalCost} tok)`}
        </Button>
      </div>
    </div>
  );
}
