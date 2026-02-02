"use client";

import { Download, Edit, Trash2, Loader2, Plus, FileText, ChevronLeft, ChevronRight, List, LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import { fetchCVs, deleteCV } from "@/services/cvService-client";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";

interface BaseCV {
  id: string;
  user_id: string;
  created_at: string;
  content?: any;
  cv_data: any;
  ai_data: any;
  profile_image?: string;
  background_image?: string;
}

type MobileView = 'carousel' | 'grid';

export default function MyCVsPage() {
  const { userId, getToken } = useAuth();
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const cvRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev === cvs.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? cvs.length - 1 : prev - 1
    );
  };

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

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
      
      const processedData = (data || []).map((cv: any) => {
        let cvData = cv.cv_data;
        let aiData = cv.ai_data;

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
        
        const processImageUrl = (url: string | null | undefined): string => {
          if (!url || url.trim() === "") return "";
          const trimmed = url.trim();
          
          if (trimmed.startsWith('data:image') && !trimmed.includes('svg+xml')) {
            return trimmed;
          }
          
          if (trimmed.startsWith('http')) {
            return trimmed;
          }
          
          if (trimmed.includes('/')) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (!supabaseUrl) return "";
            return `${supabaseUrl}/storage/v1/object/public/cv_files/${trimmed}`;
          }
          
          return "";
        };
        
        const profileImage = processImageUrl(
          cv.profile_image || 
          cvData?.profileImage || 
          aiData?.profile_image || 
          cvData?.photo
        );
        
        const backgroundImage = processImageUrl(
          cv.background_image || 
          cvData?.backgroundImage || 
          aiData?.background_image
        );
        
        if (profileImage) {
          cvData.profileImage = profileImage;
          cvData.photo = profileImage;
          if (aiData) aiData.profile_image = profileImage;
        }
        
        if (backgroundImage) {
          cvData.backgroundImage = backgroundImage;
          if (aiData) aiData.background_image = backgroundImage;
        }
        
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
      
      if (mobileView === 'carousel' && currentIndex >= cvs.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      alert("Poisto epäonnistui");
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => {
    loadCVs();
  }, [userId]);

  const renderCVCard = (cv: BaseCV, isCarousel: boolean = false) => {
    const templateType = cv.cv_data?.cvType || cv.ai_data?.cv_type || "simple";
    let TemplateComponent: any;
    
    switch (templateType) {
      case "technical": TemplateComponent = TechnicalCVTemplate; break;
      case "creative": TemplateComponent = CreativeCVTemplate; break;
      default: TemplateComponent = CVTemplate;
    }

    const previewHeight = isCarousel ? '500px' : '400px';
    const previewScale = isCarousel ? 0.38 : 0.45;

    return (
      <div className="group bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl shadow-xl overflow-hidden flex flex-col hover:shadow-2xl transition-all">
        
        {/* CV Esikatselu */}
        <div 
          className="relative bg-indigo-50/50 dark:bg-muted/20 overflow-hidden border-b-2 border-white/40 dark:border-border" 
          style={{ height: previewHeight }}
        >
          <div className="absolute inset-0 flex justify-center items-start pt-8">
            <div 
              className="origin-top shadow-2xl" 
              style={{ transform: `scale(${previewScale})` }}
            >
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
          
          {/* Poistopainike kulmassa - vain grid-näkymässä */}
          {!isCarousel && (
            <button 
              onClick={() => handleDelete(cv.id)}
              className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-card/90 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-lg z-20 transition-colors"
            >
              {deleteLoading === cv.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          )}
        </div>

        {/* Tiedot ja toiminnot */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground mb-1">
                {cv.cv_data?.name || "Nimetön CV"}
              </h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Päivitetty: {new Date(cv.created_at).toLocaleDateString("fi-FI")}
              </p>
            </div>
            <div className="px-3 py-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold uppercase tracking-wider">
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
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-indigo-700 dark:hover:bg-primary/90 transition-all"
            >
              <Edit className="w-4 h-4" />
              Muokkaa
            </Link>
          </div>

          {/* Poistopainike carusellissa */}
          {isCarousel && (
            <button
              onClick={() => handleDelete(cv.id)}
              disabled={deleteLoading === cv.id}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 dark:bg-destructive/10 text-red-600 dark:text-destructive rounded-xl text-sm font-bold hover:bg-red-500/20 dark:hover:bg-destructive/20 transition-colors"
            >
              {deleteLoading === cv.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Poista
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background flex items-center justify-center">
        <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 dark:text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (error || cvs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background flex items-center justify-center p-4">
        <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-12 text-center max-w-lg">
          <FileText className="w-16 h-16 text-indigo-500 dark:text-primary mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">{error ? "Hups! Jotain meni pieleen" : "Ei vielä CV:itä"}</h2>
          <p className="text-gray-600 dark:text-muted-foreground mb-8">{error || "Luo ensimmäinen ammattimainen CV:si nyt."}</p>
          <Link href="/create-cv" className="bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform inline-block">
            Luo uusi CV
          </Link>
        </div>
      </div>
    );
  }

  const showCarousel = isMobile && mobileView === 'carousel';
  const showGrid = !isMobile || mobileView === 'grid';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background text-gray-900 dark:text-foreground relative overflow-hidden">
      
      {/* Koristeelliset taustapallot */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-400/20 dark:bg-indigo-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-pink-400/10 dark:bg-pink-400/5 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 relative z-10">
        
        <div className="mb-12">
          <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-primary dark:to-accent bg-clip-text text-transparent">
                  Omat CV:t
                </h1>
                <p className="text-gray-600 dark:text-muted-foreground mt-2">Hallinnoi ja lataa ammattimaiset CV:si</p>
              </div>
              <Link 
                href="/create-cv" 
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-2xl shadow-xl hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                Luo uusi CV
              </Link>
            </div>

            {/* Näkymän valitsimet mobiilissa */}
            {isMobile && (
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => setMobileView('carousel')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
                    mobileView === 'carousel'
                      ? 'bg-indigo-600 dark:bg-primary text-white'
                      : 'bg-white/50 dark:bg-muted/50 text-gray-600 dark:text-muted-foreground'
                  }`}
                >
                  <List className="w-4 h-4" />
                  Carousel
                </button>
                
                <button
                  onClick={() => setMobileView('grid')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
                    mobileView === 'grid'
                      ? 'bg-indigo-600 dark:bg-primary text-white'
                      : 'bg-white/50 dark:bg-muted/50 text-gray-600 dark:text-muted-foreground'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                  Grid
                </button>
              </div>
            )}
          </div>
        </div>

        {showCarousel ? (
          <div className="relative px-2">
            <div
              className="overflow-hidden rounded-2xl"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div
                className="flex transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(-${currentIndex * 100}%)`
                }}
              >
                {cvs.map((cv) => (
                  <div key={cv.id} className="w-full flex-shrink-0 px-2">
                    {renderCVCard(cv, true)}
                  </div>
                ))}
              </div>
            </div>

            {cvs.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-card/90 border-2 border-white/40 dark:border-border rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 dark:bg-card/90 border-2 border-white/40 dark:border-border rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {cvs.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {cvs.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-indigo-600 dark:bg-primary w-6'
                        : 'bg-gray-400 dark:bg-muted-foreground/30 w-2'
                    }`}
                  />
                ))}
              </div>
            )}

            <p className="text-center mt-2 text-sm text-gray-600 dark:text-muted-foreground">
              {currentIndex + 1} / {cvs.length}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
            {cvs.map((cv) => (
              <div key={cv.id} className="relative">
                {renderCVCard(cv, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}