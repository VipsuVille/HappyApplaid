// app/my-cvs/page.tsx
"use client";

import { Download, Edit, Trash2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { BaseCV } from "@/types";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import Link from "next/link";
import CVContainer from "@/components/cv/CVContainer";
import { supabase } from "@/lib/supabase-client";
import { fetchCVs, deleteCV } from "@/services/cvService-client";
import SmartHeader from "@/components/ui/smartHeader";

export default function MyCVsPage() {
  const { userId, getToken } = useAuth(); // ✅ HAE getToken
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const cvRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})


  // ✅ KORJATTU loadCVs
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
      
      // ✅ Käytä tokenia
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
  // ✅ KORJATTU handleDelete
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

  // ✅ Realtime-päivitykset
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
          loadCVs(); // Lataa uudelleen
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [userId]); // ✅ LISÄÄ getToken riippuvuuteen jos tarvitaan

  // Lataa CV:t kun sivu latautuu
  useEffect(() => {
    loadCVs();
  }, [userId]);

  // ... loput koodista pysyy samana
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ladataan CV:itä...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <SmartHeader />
        <h1 className="text-2xl font-bold mb-4">Omat CV:t</h1>
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={loadCVs}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Yritä uudelleen
          </button>
        </div>
      </div>
    );
  }

  if (cvs.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <SmartHeader />
        <h1 className="text-2xl font-bold mb-4">Omat CV:t</h1>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">Ei vielä luotuja CV:itä</p>
          <Link
            href="/create-cv"
            className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Luo ensimmäinen CV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="container mx-auto mb-4 md:inline-block md:ml-64 md:-10 pt-4 md:pt-0"
      style={{ maxWidth: "230mm" }}
    >
      <SmartHeader />
      <div className="flex justify-between items-center mb-6 mt-20">
        <h1 className="text-2xl font-bold">Omat CV:t</h1>
        <Link
          href="/"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          + Luo uusi CV
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
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
              className="m-4 rounded-lg p-1 md:p-4 shadow-lg relative group md:h-full h-auto"
            >
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => handleDelete(cv.id)}
                  disabled={deleteLoading === cv.id}
                  className="p-2 rounded-full bg-white shadow hover:bg-red-50 transition-colors"
                  title="Poista CV"
                >
                  <Trash2
                    className={`w-5 h-5 ${
                      deleteLoading === cv.id ? "text-gray-400" : "text-red-500"
                    }`}
                  />
                </button>
              </div>

              <div className="mb-4">
                <h2 className="text-xl font-semibold">
                  {cv.content.cv_data?.name || "Nimetön CV"}
                </h2>
                <p className="text-gray-600">
                  Luotu: {new Date(cv.created_at).toLocaleDateString("fi-FI")}
                </p>
              </div>
              
              <div
                className="relative md:h-[306mm] h-[130mm] w-auto md:w-full ml-4 mr-4 md:ml-0 md:mr-0 overflow-hidden rounded-lg shadow-inner"
                style={{
                  boxShadow:
                    "inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              >
                <div className="absolute top-4 right-2 bottom-4 left-2 md:top-4 md:right-4 md:bottom-4 md:left-4 flex items-center justify-center">
                  <div className="w-full h-full flex items-center justify-center">
                    <CVContainer
                      ref={setCvRef(cv.id)}
                      data-template-type={templateType}
                      className="transform md:scale-100 scale-[0.4]"
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
              
              <div className="space-y-2 flex justify-between items-center mt-4">
                <button
                  onClick={() =>
                    handleDownloadPDF(cv.id, cv.content.cv_data.name || "CV")
                  }
                  disabled={isDownloading === cv.id}
                  className="flex items-center text-blue-500 hover:text-blue-600"
                >
                  {isDownloading === cv.id ? (
                    <Loader2 className="w-8 h-8 animate-spin" />
                  ) : (
                    <Download className="w-8 h-8" />
                  )}
                </button>
                <Link
                  href={`/edit-cv/${cv.id}`}
                  className="flex items-center text-blue-500 hover:underline"
                >
                  <Edit className="w-8 h-8" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}