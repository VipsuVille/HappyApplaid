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

// ✅ KORJATTU TYYPITYS
interface BaseCV {
  id: string;
  user_id: string;
  created_at: string;
  content?: any;
  cv_data: any;
  ai_data: any;
}

export default function MyCVsPage() {
  const { userId, getToken } = useAuth();
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const cvRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // app/my-cvs/page.tsx - KUVAN HAKU KORJAUS

const loadCVs = async () => {
  if (!userId) {
    setLoading(false);
    setError("Käyttäjä ei ole kirjautunut sisään");
    return;
  }

  setLoading(true);
  setError(null);

  try {
    const token = await getToken({ template: "supabase" });
    if (!token) throw new Error("Autentikaatiotoken puuttuu");
    
    const { data, error: fetchError } = await fetchCVs(userId, token);
    if (fetchError) throw fetchError;
    
    // ✅ PARANNETTU DATAN PUHDISTUS: Varmistetaan kuvat
    const processedData = (data || []).map((cv: any) => {
      let cvData = cv.cv_data;
      let aiData = cv.ai_data;

      // Jos sarakkeet ovat tyhjiä, pura content-merkkijonosta
      if (!cvData && cv.content) {
        try {
          const parsed = typeof cv.content === 'string' ? JSON.parse(cv.content) : cv.content;
          cvData = parsed.cv_data || {};
          aiData = parsed.ai_data || {};
        } catch (e) {
          console.error("Datan parsiminen epäonnistui ID:lle:", cv.id);
          cvData = {};
          aiData = {};
        }
      }
      
      // ✅ UUSI: Varmista että kuvat ovat oikeassa muodossa
      const processImageUrl = (url: string | null | undefined): string => {
        if (!url || url.trim() === "") return "";
        const trimmed = url.trim();
        
        // Base64 → OK
        if (trimmed.startsWith('data:image') && !trimmed.includes('svg+xml')) {
          return trimmed;
        }
        
        // HTTP URL → OK
        if (trimmed.startsWith('http')) {
          return trimmed;
        }
        
        // Supabase path → Rakenna public URL
        if (trimmed.includes('/')) {
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
          if (!supabaseUrl) return "";
          return `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
        }
        
        return "";
      };
      
      // ✅ PROSESSOI PROFIILIKUVA
      const profileImage = processImageUrl(
        cv.profile_image || 
        cvData?.profileImage || 
        aiData?.profile_image || 
        cvData?.photo
      );
      
      // ✅ PROSESSOI TAUSTAKUVA
      const backgroundImage = processImageUrl(
        cv.background_image || 
        cvData?.backgroundImage || 
        aiData?.background_image
      );
      
      // ✅ TALLENNA TAKAISIN KAIKKIIN PAIKKOIHIN
      if (profileImage) {
        cvData.profileImage = profileImage;
        cvData.photo = profileImage;
        if (aiData) aiData.profile_image = profileImage;
      }
      
      if (backgroundImage) {
        cvData.backgroundImage = backgroundImage;
        if (aiData) aiData.background_image = backgroundImage;
      }
      
      console.log(`CV ${cv.id}:`, {
        hasProfile: !!profileImage,
        hasBackground: !!backgroundImage
      });
      
      return {
        ...cv,
        profile_image: profileImage,
        background_image: backgroundImage,
        cv_data: cvData,
        ai_data: aiData
      };
    });

    console.log(`✅ Loaded ${processedData.length} CVs with processed images`);
    setCvs(processedData);
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

      if (!response.ok) throw new Error("PDF:n luonti epäonnistui");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv_${cvName.replace(/[^\w-]/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      alert("PDF:n lataus epäonnistui");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleDelete = async (cvId: string) => {
    if (!confirm("Haluatko varmasti poistaa tämän CV:n?")) return;
    setDeleteLoading(cvId);
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("Token puuttuu");
      await deleteCV(cvId, userId!, token);
      setCvs(prev => prev.filter(c => c.id !== cvId));
    } catch (error) {
      alert("Poisto epäonnistui");
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    loadCVs();
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  // Virhe- ja tyhjä-näkymät (pidetty alkuperäisinä)
  if (error || cvs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white/70 backdrop-blur-xl p-12 rounded-3xl shadow-2xl text-center max-w-lg">
          <FileText className="w-16 h-16 text-indigo-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">{error ? "Hups! Jotain meni pieleen" : "Ei vielä CV:itä"}</h2>
          <p className="text-gray-600 mb-8">{error || "Luo ensimmäinen ammattimainen CV:si nyt."}</p>
          <Link href="/create-cv" className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform inline-block">
            Luo uusi CV
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 font-sans text-gray-900 relative overflow-hidden">
      {/* Koristeelliset taustapallot */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 relative z-10">
        <div className="mb-12 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-600 bg-clip-text text-transparent">Omat CV:t</h1>
            <p className="text-gray-600 mt-2">Hallinnoi ja lataa ammattimaiset CV:si</p>
          </div>
          <Link href="/create-cv" className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:scale-105 transition-all">
            <Plus className="w-5 h-5" />
            Luo uusi CV
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
          {cvs.map((cv) => {
            const templateType = cv.cv_data?.cvType || cv.ai_data?.cv_type || "simple";
            let TemplateComponent: any;
            
            switch (templateType) {
              case "technical": TemplateComponent = TechnicalCVTemplate; break;
              case "creative": TemplateComponent = CreativeCVTemplate; break;
              default: TemplateComponent = CVTemplate;
            }

            return (
              <div key={cv.id} className="group bg-white/70 backdrop-blur-xl border-2 border-white/40 rounded-3xl shadow-xl overflow-hidden flex flex-col hover:shadow-2xl transition-all">
                {/* CV Esikatselu */}
                <div className="relative h-[400px] bg-indigo-50/50 overflow-hidden border-b-2 border-white/40">
                  <div className="absolute inset-0 flex justify-center items-start pt-8">
                    <div className="origin-top scale-[0.45] w-[210mm] shadow-2xl">
                       <CVContainer ref={setCvRef(cv.id)}>
                          <TemplateComponent 
                            data={cv.cv_data} 
                            aiData={cv.ai_data} 
                            isEditing={false}
                            editMode="content"
                            showEditControls={false}
                          />
                       </CVContainer>
                    </div>
                  </div>
                  
                  {/* Poistopainike kulmassa */}
                  <button 
                    onClick={() => handleDelete(cv.id)}
                    className="absolute top-4 right-4 p-3 bg-white/90 rounded-full text-red-500 hover:bg-red-50 shadow-lg z-20"
                  >
                    {deleteLoading === cv.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                  </button>
                </div>

                {/* Tiedot ja toiminnot */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{cv.cv_data?.name || "Nimetön CV"}</h3>
                      <p className="text-sm text-gray-500">Päivitetty: {new Date(cv.created_at).toLocaleDateString("fi-FI")}</p>
                    </div>
                    <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider">
                      {templateType}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleDownloadPDF(cv.id, cv.cv_data?.name || "CV")}
                      disabled={isDownloading === cv.id}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all"
                    >
                      {isDownloading === cv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Lataa PDF
                    </button>
                    <Link 
                      href={`/edit-cv/${cv.id}`}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                    >
                      <Edit className="w-4 h-4" />
                      Muokkaa
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}