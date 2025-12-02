// app/my-cvs/page.tsx
"use client";

import { Download, Edit, Trash2, Loader2, Plus, FileText, Sparkles } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { fetchCVs, deleteCV } from "@/services/cvService-client";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";

// Tyypitykset
interface BaseCV {
  id: string;
  user_id: string;
  created_at: string;
  content: {
    cv_data: any;
    ai_data?: any;
  };
}

export default function MyCVsPage() {
  const { userId, getToken } = useAuth();
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const cvRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // ✅ ALKUPERÄINEN loadCVs funktio
  const loadCVs = async () => {
    if (!userId) {
      setLoading(false);
      setError("Käyttäjä ei ole kirjautunut sisään");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Haetaan CV:t käyttäjälle:", userId);
      
      // ✅ HAE CLERK TOKEN
      const token = await getToken({ template: "supabase" });
      
      if (!token) {
        throw new Error("Autentikaatiotoken puuttuu");
      }
      
      console.log("🔑 Token saatu");
      
      // ✅ Käytä alkuperäistä fetchCVs-funktiota
      const { data, error: fetchError } = await fetchCVs(userId, token);
      
      if (fetchError) throw fetchError;
      
      setCvs(data || []);
      console.log(`✅ Ladattu ${data?.length || 0} CV:tä`);
      
    } catch (error) {
      console.error("Virhe CV:iden haussa:", error);
      setError(error instanceof Error ? error.message : "Tuntematon virhe");
    } finally {
      setLoading(false);
    }
  };

  const setCvRef = useCallback(
    (cvId: string) => (el: HTMLDivElement | null) => {
      cvRefs.current[cvId] = el;
    },
    []
  );

  const handleDownloadPDF = async (cvId: string, cvName: string) => {
    setIsDownloading(cvId);
    try {
      const response = await fetch("/api/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cvId }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        alert("PDF:n luonti epäonnistui! Virhe: " + (errorBody.error || "Tuntematon palvelinvirhe"));
        throw new Error(errorBody.error || "PDF generation failed on server.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv_${cvName.replace(/[^\w-]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      console.log("PDF download completed successfully");
    } catch (error) {
      console.error("PDF download failed:", error);
      alert("PDF:n lataus epäonnistui: " + (error instanceof Error ? error.message : "Tuntematon virhe"));
    } finally {
      setIsDownloading(null);
    }
  };

  // ✅ ALKUPERÄINEN handleDelete funktio
  const handleDelete = async (cvId: string) => {
    if (!confirm("Haluatko varmasti poistaa tämän CV:n?")) return;
    if (!userId) return;

    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("Token puuttuu");
      
      await deleteCV(cvId, userId, token);
      await loadCVs();
    } catch (error) {
      console.error("Poisto epäonnistui:", error);
      alert(error instanceof Error ? error.message : "Poisto epäonnistui");
    }
  };

  // ✅ Realtime-päivitykset (alkuperäinen)
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("cv_list_updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cvs",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          console.log("🔔 Realtime päivitys");
          loadCVs();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]);

  // Lataa CV:t kun sivu latautuu
  useEffect(() => {
    loadCVs();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Ladataan CV:itä...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        </div>
        
        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Virhe CV:iden lataamisessa</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={loadCVs}
              className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (cvs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-12 text-center backdrop-saturate-150">
            <div className="h-20 w-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/30">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ei vielä CV:itä</h2>
            <p className="text-gray-600 mb-6">Luo ensimmäinen ammattimainen CV:si muutamassa minuutissa</p>
            <Link
              href="/create-cv"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              Luo ensimmäinen CV
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 selection:bg-amber-300 selection:text-gray-900 relative overflow-hidden">
      
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-gradient-to-br from-amber-400/20 to-yellow-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl shadow-indigo-500/10 p-6 md:p-8 backdrop-saturate-150 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-purple-100/30 pointer-events-none rounded-3xl"></div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-100/80 to-purple-100/80 backdrop-blur-sm border border-white/40 shadow-lg shadow-indigo-500/10 mb-3">
                  <FileText className="w-4 h-4 text-indigo-700" />
                  <span className="text-xs font-extrabold text-indigo-800 uppercase tracking-wider">
                    CV Collection
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Omat CV:t
                </h1>
                <p className="text-gray-700 mt-2">
                  Hallinnoi ja lataa ammattimaiset CV:si
                </p>
              </div>

              <Link
                href="/create-cv"
                className="group px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-600 text-white font-extrabold rounded-2xl border-2 border-white/40 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <div className="flex items-center gap-2 relative z-10">
                  <Plus className="w-5 h-5" />
                  <span>Luo uusi CV</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* CVs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
          {cvs.map((cv) => {
            const templateType = cv.content?.cv_data?.cvType || cv.content?.ai_data?.cvType || "simple";
            let TemplateComponent;
            
            switch (templateType) {
              case "technical":
                TemplateComponent = TechnicalCVTemplate;
                break;
              case "creative":
                TemplateComponent = CreativeCVTemplate;
                break;
              default:
                TemplateComponent = CVTemplate;
            }

            return (
              <div
                key={cv.id}
                className="group backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 hover:shadow-2xl hover:shadow-indigo-500/20 transition-all overflow-hidden backdrop-saturate-150 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Delete Button */}
                <div className="absolute top-3 right-3 z-20">
                  <button
                    onClick={() => handleDelete(cv.id)}
                    disabled={deleteLoading === cv.id}
                    className="h-10 w-10 backdrop-blur-lg bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-all hover:scale-110"
                    title="Poista CV"
                  >
                    {deleteLoading === cv.id ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-red-500" />
                    )}
                  </button>
                </div>

                {/* CV Preview - Full A4 on desktop, scaled on mobile */}
                <div
                  className="relative md:h-[306mm] h-[130mm] w-full overflow-hidden"
                  style={{
                    boxShadow: "inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div className="absolute inset-4 flex items-center justify-center">
                    <div className="w-full h-full flex items-center justify-center bg-indigo-400/20">
                      <CVContainer
                        ref={setCvRef(cv.id)}
                        data-template-type={templateType}
                        className="transform lg:scale-100 md:scale-[0.7] scale-[0.4] origin-center"
                      >
                        <TemplateComponent
                          data={cv.content.cv_data}
                          aiData={cv.content.ai_data}
                          isEditing={false}
                          editMode="content"
                          showEditControls={false}
                        />
                      </CVContainer>
                    </div>
                  </div>
                </div>

                {/* CV Info & Actions */}
                <div className="p-5 relative z-10 border-t-2 border-white/40">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {cv.content.cv_data?.name || "Nimetön CV"}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Luotu: {new Date(cv.created_at).toLocaleDateString("fi-FI")}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadPDF(cv.id, cv.content.cv_data?.name || "CV")}
                      disabled={isDownloading === cv.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading === cv.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Ladataan...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span className="text-sm">Lataa</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/edit-cv/${cv.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      <span className="text-sm">Muokkaa</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="mt-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-indigo-500/10 p-6 backdrop-saturate-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-indigo-500/30">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-indigo-900">{cvs.length}</div>
              <div className="text-sm text-gray-600">CV:tä luotu</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-green-500/30">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-green-900">∞</div>
              <div className="text-sm text-gray-600">Latauksia saatavilla</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-amber-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-amber-900">Premium</div>
              <div className="text-sm text-gray-600">Aktiivinen tilaus</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}