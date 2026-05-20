"use client";

import { Download, Edit, Trash2, Loader2, Plus, FileText, ChevronLeft, ChevronRight, List, LayoutGrid, Sparkles, Clock } from "lucide-react";
import { useCallback, useEffect, useState, useRef } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { fetchCVs, deleteCV } from "@/services/cvService-client";
import CVTemplate from "@/components/cv/CVSimpleTemplate";
import TechnicalCVTemplate from "@/components/cv/CVTemplateTechnical";
import CreativeCVTemplate from "@/components/cv/CVCreativeTemplate";
import CVContainer from "@/components/cv/CVContainer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface BaseCV {
  id: string;
  user_id: string;
  created_at: string;
  content?: any;
  cv_data: any;
  ai_data: any;
  profile_image?: string;
  background_image?: string;
  metadata?: any;
}

type MobileView = 'carousel' | 'grid';

// ════════════════════════════════════════════════════════════════
// ✅ SHARED PARSERS — Same as edit-cv (consistent rendering)
// ════════════════════════════════════════════════════════════════

function parseAISkillsToStructured(aiData: any): any[] | null {
  const skillsHTML = aiData?.skills_section || aiData?.html?.skills_section;
  if (!skillsHTML || typeof skillsHTML !== 'string') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(skillsHTML, 'text/html');
    const categories: { category: string; items: string[] }[] = [];
    const sections = doc.querySelectorAll('h3, h4, strong');
    sections.forEach((heading) => {
      const category = heading.textContent?.trim() || 'Skills';
      const items: string[] = [];
      let nextElement = heading.nextElementSibling;
      while (nextElement && nextElement.tagName === 'UL') {
        nextElement.querySelectorAll('li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) items.push(text);
        });
        nextElement = nextElement.nextElementSibling;
      }
      if (items.length > 0) categories.push({ category, items });
    });
    if (categories.length === 0) {
      const lines = skillsHTML.replace(/<[^>]+>/g, '').split('\n').filter((l: string) => l.trim());
      if (lines.length > 0) categories.push({ category: 'Skills', items: lines });
    }
    return categories.length > 0 ? categories : null;
  } catch { return null; }
}

function parseAIExperienceToStructured(aiData: any): any[] | null {
  const expHTML = aiData?.experience_section || aiData?.html?.experience_section;
  if (!expHTML || typeof expHTML !== 'string') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(expHTML, 'text/html');
    const jobs: any[] = [];
    const jobDivs = doc.querySelectorAll('.job, .work-item, .experience-item');
    if (jobDivs.length > 0) {
      jobDivs.forEach(jobDiv => {
        const h4 = jobDiv.querySelector('h4');
        const titleText = h4?.textContent?.trim() || '';
        const [title, company] = titleText.split(' - ').map(s => s.trim());
        const dateP = jobDiv.querySelector('.date, p[class*="date"]');
        const period = dateP?.textContent?.trim() || '';
        const achievements: string[] = [];
        jobDiv.querySelectorAll('ul li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) achievements.push(text);
        });
        if (title || company) jobs.push({ title: title || 'Position', company: company || '', period, achievements });
      });
    } else {
      const allH4 = doc.querySelectorAll('h4');
      allH4.forEach(h4 => {
        const titleText = h4.textContent?.trim() || '';
        const [title, company] = titleText.split(' - ').map(s => s.trim());
        let period = '';
        let nextElement = h4.nextElementSibling;
        if (nextElement?.classList.contains('date') || nextElement?.tagName === 'P') {
          period = nextElement.textContent?.trim() || '';
          nextElement = nextElement.nextElementSibling;
        }
        const achievements: string[] = [];
        if (nextElement?.tagName === 'UL') {
          nextElement.querySelectorAll('li').forEach(li => {
            const text = li.textContent?.trim();
            if (text) achievements.push(text);
          });
        }
        if (title || company) jobs.push({ title: title || 'Position', company: company || '', period, achievements });
      });
    }
    return jobs.length > 0 ? jobs : null;
  } catch { return null; }
}

function parseAIEducationToStructured(aiData: any): any[] | null {
  const eduHTML = aiData?.education_section || aiData?.html?.education_section;
  if (!eduHTML || typeof eduHTML !== 'string') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(eduHTML, 'text/html');
    const eduList: any[] = [];
    const eduDivs = doc.querySelectorAll('.education, .education-item');
    if (eduDivs.length > 0) {
      eduDivs.forEach(eduDiv => {
        const h4 = eduDiv.querySelector('h4');
        const degree = h4?.textContent?.trim() || '';
        const paragraphs = eduDiv.querySelectorAll('p');
        let institution = '';
        let year = '';
        paragraphs.forEach((p, idx) => {
          const text = p.textContent?.trim() || '';
          if (idx === 0) institution = text;
          if (p.classList.contains('date') || text.match(/\d{4}/)) year = text;
        });
        const details: string[] = [];
        eduDiv.querySelectorAll('ul li').forEach(li => {
          const text = li.textContent?.trim();
          if (text) details.push(text);
        });
        if (degree) eduList.push({ degree, institution, year, details });
      });
    } else {
      const allH4 = doc.querySelectorAll('h4');
      allH4.forEach(h4 => {
        const degree = h4.textContent?.trim() || '';
        let institution = '';
        let year = '';
        const details: string[] = [];
        let nextElement = h4.nextElementSibling;
        if (nextElement?.tagName === 'P') { institution = nextElement.textContent?.trim() || ''; nextElement = nextElement.nextElementSibling; }
        if (nextElement?.tagName === 'P') { const text = nextElement.textContent?.trim() || ''; if (text.match(/\d{4}/)) { year = text; nextElement = nextElement.nextElementSibling; } }
        if (nextElement?.tagName === 'UL') { nextElement.querySelectorAll('li').forEach(li => { const text = li.textContent?.trim(); if (text) details.push(text); }); }
        if (degree) eduList.push({ degree, institution, year, details });
      });
    }
    return eduList.length > 0 ? eduList : null;
  } catch { return null; }
}

// ════════════════════════════════════════════════════════════════
// ✅ PROCESS CV DATA — Same logic as edit-cv
// Ensures template gets consistent structured data
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// ✅ SUPER-SAFE PROCESS CV — Estää kaikki undefined/map virheet
// ════════════════════════════════════════════════════════════════

function processCV(cv: any): BaseCV {
  let cvData = cv.cv_data;
  let aiData = cv.ai_data;

  // Parse content if needed
  if (cv.content) {
    try {
      const parsed = typeof cv.content === 'string' ? JSON.parse(cv.content) : cv.content;
      const contentCvData = parsed.cv_data || {};
      const contentAiData = parsed.ai_data || {};

      if (Object.keys(contentCvData).length > 0) {
        cvData = { ...(cvData || {}), ...contentCvData };
      }
      if (Object.keys(contentAiData).length > 0) {
        aiData = { ...(aiData || {}), ...contentAiData };
      }
    } catch { /* ignore */ }
  }

  if (!cvData) cvData = {};
  if (!aiData) aiData = {};

  // ✅ SUPER SAFE ARRAY HELPER — NEVER returns undefined!
  const ensureArray = (data: any, fallbackParser: () => any[] | null): any[] => {
    // 1. Null/undefined → try parser, then []
    if (!data) {
      const parsed = fallbackParser();
      return Array.isArray(parsed) ? parsed : [];
    }

    // 2. Already array → return
    if (Array.isArray(data)) {
      return data;
    }

    // 3. String data
    if (typeof data === 'string') {
      const trimmed = data.trim();
      
      // Empty or broken → try parser
      if (trimmed === '' || trimmed.includes('[object Object]')) {
        const parsed = fallbackParser();
        return Array.isArray(parsed) ? parsed : [];
      }

      // Try JSON parse
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
        if (parsed && typeof parsed === 'object') return [parsed];
        return [];
      } catch {
        // Fallback: split by comma
        const items = trimmed.split(',').map(s => s.trim()).filter(Boolean);
        return items.length > 0 ? items : [];
      }
    }

    // 4. Object → wrap in array or try parser
    if (typeof data === 'object') {
      const parsed = fallbackParser();
      return Array.isArray(parsed) ? parsed : [];
    }

    // 5. Unknown type → try parser, then []
    const parsed = fallbackParser();
    return Array.isArray(parsed) ? parsed : [];
  };

  // ✅ SKILLS — GUARANTEED ARRAY
  cvData.skills = ensureArray(cvData.skills, () => parseAISkillsToStructured(aiData));

  // ✅ EXPERIENCE — GUARANTEED ARRAY
  cvData.experience = ensureArray(cvData.experience, () => parseAIExperienceToStructured(aiData));

  // ✅ EDUCATION — GUARANTEED ARRAY
  cvData.education = ensureArray(cvData.education, () => parseAIEducationToStructured(aiData));

  // ✅ LANGUAGES — GUARANTEED ARRAY (Extra defensive!)
  cvData.languages = ensureArray(cvData.languages, () => {
    const langHTML = aiData?.languages_section || aiData?.html?.languages_section;
    if (langHTML && typeof langHTML === 'string') {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(langHTML, 'text/html');
        const items: string[] = [];
        doc.querySelectorAll('li').forEach(li => {
          const t = li.textContent?.trim();
          if (t) items.push(t);
        });
        if (items.length > 0) {
          return items.map(l => ({ language: l, proficiency: '' }));
        }
      } catch {}
    }
    return []; // ← NEVER return null!
  });

  // ✅ FINAL SAFETY CHECK — Make absolutely sure these are arrays
  cvData.skills = Array.isArray(cvData.skills) ? cvData.skills : [];
  cvData.experience = Array.isArray(cvData.experience) ? cvData.experience : [];
  cvData.education = Array.isArray(cvData.education) ? cvData.education : [];
  cvData.languages = Array.isArray(cvData.languages) ? cvData.languages : [];

  // ✅ IMAGE PROCESSING
  const processImageUrl = (url: string | null | undefined): string => {
    if (!url || url.trim() === "") return "";
    const trimmed = url.trim();
    if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) return trimmed;
    if (trimmed.includes('/')) {
      return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${trimmed}`;
    }
    return "";
  };

  const profileImage = processImageUrl(
    cv.profile_image || cvData?.profileImage || aiData?.profile_image || cvData?.photo
  );
  const backgroundImage = processImageUrl(
    cv.background_image || cvData?.backgroundImage || aiData?.background_image
  );

  cvData.profileImage = profileImage;
  cvData.backgroundImage = backgroundImage;
  if (aiData) {
    aiData.profile_image = profileImage;
    aiData.background_image = backgroundImage;
  }

  return {
    ...cv,
    cv_data: cvData,
    ai_data: aiData,
    profile_image: profileImage,
    background_image: backgroundImage,
  };
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function MyCVsPage() {
  const { userId, getToken } = useAuth();
  const { user } = useUser();
  const [cvs, setCvs] = useState<BaseCV[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => prev === cvs.length - 1 ? 0 : prev + 1);
  const prevSlide = () => setCurrentIndex((prev) => prev === 0 ? cvs.length - 1 : prev - 1);

  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) nextSlide();
      else prevSlide();
    }
  };

  const loadCVs = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    try {
      const token = await getToken({ template: "supabase" });
      if (!token) throw new Error("Autentikaatiotoken puuttuu");

      const { data, error: fetchError } = await fetchCVs(userId, token);
      if (fetchError) throw fetchError;

      // ✅ Use processCV for consistent data (same as edit-cv)
      const processedData = (data || []).map((cv: any) => processCV(cv));
      setCvs(processedData);
    } catch (error: any) {
      setError(error.message);
      toast.error("Virhe ladattaessa CV:itä");
    } finally {
      setLoading(false);
    }
  };

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
      toast.success("PDF ladattu!");
    } catch (error) {
      toast.error("Lataus epäonnistui");
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
      toast.success("CV poistettu");
    } catch (error) {
      toast.error("Poisto epäonnistui");
    } finally {
      setDeleteLoading(null);
    }
  };

  useEffect(() => { loadCVs(); }, [userId]);

  const renderCVCard = (cv: BaseCV, isCarousel: boolean = false) => {
    const templateType = cv.cv_data?.cvType || cv.ai_data?.cvType || cv.ai_data?.cv_type || cv.metadata?.cv_type || "simple";
    let TemplateComponent: any;
    switch (templateType) {
      case "technical": TemplateComponent = TechnicalCVTemplate; break;
      case "creative": TemplateComponent = CreativeCVTemplate; break;
      default: TemplateComponent = CVTemplate;
    }

    return (
      <div className="group bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:border-orange-500/30">

        {/* ✅ Preview Area — same sizing approach as edit-cv */}
        <div className="relative h-[420px] bg-gray-50 dark:bg-black/40 overflow-hidden border-b border-gray-100 dark:border-gray-800">
          <div className="absolute inset-0 flex justify-center items-start overflow-hidden">
            <div
              className="bg-white shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]"
              style={{
                width: '210mm',
                minHeight: '297mm',
                transform: 'scale(0.38)',
                transformOrigin: 'top center',
                marginTop: '16px',
              }}
            >
              <CVContainer>
                <TemplateComponent data={cv.cv_data} aiData={cv.ai_data} isEditing={false} />
              </CVContainer>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button
              onClick={() => handleDelete(cv.id)}
              className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white backdrop-blur-md rounded-2xl transition-all"
            >
              {deleteLoading === cv.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-1">
                {cv.cv_data?.name || "Nimetön CV"}
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                {new Date(cv.created_at).toLocaleDateString("fi-FI")}
              </div>
            </div>
            <div className="px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
              {templateType}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleDownloadPDF(cv.id, cv.cv_data?.name || "CV")}
              disabled={isDownloading === cv.id}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 font-bold"
            >
              {isDownloading === cv.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              PDF
            </Button>
            <Link href={`/edit-cv/${cv.id}`} className="w-full">
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-12 font-bold">
                <Edit className="w-4 h-4 mr-2" />
                Muokkaa
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan arkistoja...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc] transition-colors duration-500">

      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/10 border border-orange-500/20 rounded-full">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">Arkisto</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight dark:text-white leading-tight">
              Omat <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">CV:t</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-md font-medium">
              Kaikki luomasi ansioluettelot yhdessä paikassa. Muokkaa, lataa tai päivitä tyyliä lennosta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {isMobile && (
              <div className="flex bg-white dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                <button onClick={() => setMobileView('carousel')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${mobileView === 'carousel' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}><List className="w-4 h-4"/> Selaa</button>
                <button onClick={() => setMobileView('grid')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${mobileView === 'grid' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4"/> Ruudukko</button>
              </div>
            )}
            <Link href="/create-cv">
              <Button className="w-full sm:w-auto px-8 py-7 bg-white dark:bg-white text-black hover:bg-gray-100 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-transform hover:scale-[1.02]">
                <Plus className="w-5 h-5" />
                LUO UUSI
              </Button>
            </Link>
          </div>
        </div>

        {cvs.length === 0 ? (
          <div className="py-20 text-center bg-white/50 dark:bg-gray-900/20 border border-dashed border-gray-300 dark:border-gray-800 rounded-[3rem]">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ei vielä tallennettuja CV:itä</h3>
            <p className="text-gray-500 mb-8">Aloita luomalla ensimmäinen tekoälypohjainen ansioluettelosi.</p>
            <Link href="/create-cv">
              <Button variant="outline" className="rounded-xl px-8">Luo ensimmäinen CV</Button>
            </Link>
          </div>
        ) : (
          <>
            {isMobile && mobileView === 'carousel' ? (
              <div className="relative">
                <div className="overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                  <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                    {cvs.map((cv) => (
                      <div key={cv.id} className="w-full flex-shrink-0 px-2">
                        {renderCVCard(cv, true)}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-center items-center gap-6 mt-8">
                  <button onClick={prevSlide} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg"><ChevronLeft/></button>
                  <span className="font-black text-sm">{currentIndex + 1} / {cvs.length}</span>
                  <button onClick={nextSlide} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg"><ChevronRight/></button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                {cvs.map((cv) => (
                  <div key={cv.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {renderCVCard(cv, false)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 10px; }
      `}</style>
    </div>
  );
}