// app/my-cover-letters/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
  Edit,
  Trash2,
  FileText,
  Download,
  Loader2,
  TrendingUp,
  Plus,
  Database,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  List,
  Clock,
  Sparkles,
} from 'lucide-react';
import { fetchCoverLetters, deleteCoverLetter } from '@/services/coverLetterService-client';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CoverLetter {
  id: string;
  title: string;
  created_at: string;
  content: any;
  ai_data: any;
}

type MobileView = 'carousel' | 'grid';

export default function MyCoverLettersPage() {
  const { getToken, userId } = useAuth();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const nextSlide = () => setCurrentIndex((prev) => prev === coverLetters.length - 1 ? 0 : prev + 1);
  const prevSlide = () => setCurrentIndex((prev) => prev === 0 ? coverLetters.length - 1 : prev - 1);

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

  const loadCoverLetters = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');
      
      const { data, error } = await fetchCoverLetters(token, userId);
      
      if (error) throw error;
      
      setCoverLetters(data || []);
    } catch (error) {
      console.error('Error loading cover letters:', error);
      setError('Hakukirjeiden lataaminen epäonnistui');
      toast.error('Virhe ladattaessa hakukirjeitä');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoverLetters();
  }, [userId]);

  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;

    setDeleteLoading(id);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const { error } = await deleteCoverLetter(id, token);
      if (error) throw error;
      
      setCoverLetters(prev => prev.filter(letter => letter.id !== id));
      toast.success('Hakukirje poistettu');
      
      if (mobileView === 'carousel' && currentIndex >= coverLetters.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      toast.error('Poisto epäonnistui');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleDownloadPDF = async (letterId: string, letterName: string) => {
    setIsDownloading(letterId);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'PDF generation failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${letterName.replace(/[^\w-]/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('PDF ladattu!');
    } catch (error) {
      console.error('PDF download failed:', error);
      toast.error('Lataus epäonnistui');
    } finally {
      setIsDownloading(null);
    }
  };

  const generateSmartTitle = (jobDescription: string, fallback: string = 'Työhakemus'): string => {
    if (!jobDescription || jobDescription.trim().length === 0) return fallback;
    const firstLine = jobDescription.split('\n')[0].trim();
    if (firstLine.length < 20) {
      const twoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
      return cleanTitle(twoLines);
    }
    return cleanTitle(firstLine);
  };

  const cleanTitle = (title: string): string => {
    let cleaned = title.replace(/\s+/g, ' ').replace(/[^\w\såäöÅÄÖ\-]/g, '').trim();
    if (cleaned.length > 60) cleaned = cleaned.substring(0, 60).trim() + '...';
    return cleaned || 'Työhakemus';
  };

  function convertToCoverLetterData(letter: CoverLetter) {
    return {
      name: letter.content?.contactInfo?.name || 
            letter.ai_data?.name || 
            letter.content?.name || 
            "Hakija",
      
      email: letter.content?.contactInfo?.email || 
             letter.ai_data?.email || 
             letter.content?.email || 
             "",
      
      phone: letter.content?.contactInfo?.phone || 
             letter.ai_data?.phone || 
             letter.content?.phone || 
             "",
      
      location: letter.content?.contactInfo?.location || 
                letter.ai_data?.location || 
                letter.content?.location || 
                "",
      
      jobTitle: letter.content?.job_title || 
                letter.ai_data?.job_title || 
                "",
      
      companyName: letter.content?.company_name || 
                   letter.ai_data?.company_name || 
                   "",
      
      title: letter.title,
      
      content: letter.content?.body || 
               letter.ai_data?.html?.content || 
               '',
      
      keyHighlights: letter.ai_data?.key_highlights || [],
      language: letter.content?.language || "finnish",
      style: (letter.content?.style || letter.ai_data?.style || "professional") as "professional" | "casual" | "creative",
      
      headerColor: letter.content?.headerColor || 'rgb(181, 152, 79)',
      headerLayout: (letter.content?.headerLayout || 'top') as 'top' | 'left',
      sidebarContent: (letter.content?.sidebarContent || 'contact') as 'contact' | 'highlights' | 'none',
    };
  }

  const renderLetterCard = (letter: CoverLetter, isCarousel: boolean = false) => {
    const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
    const displayTitle = letter.title || smartTitle;
    const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
    const isATSOptimized = !!letter.ai_data?.ats_optimization;
    const isRAG = !!letter.ai_data?.rag_used;

    return (
      <div className="group bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[2rem] overflow-hidden flex flex-col transition-all duration-300 hover:shadow-2xl hover:border-orange-500/30">
        
        {/* Preview Area */}
        <div className="relative h-[400px] bg-gray-50 dark:bg-black/40 overflow-hidden border-b border-gray-100 dark:border-gray-800">
          <div className="absolute inset-0 flex justify-center items-start pt-6">
            <div className="origin-top shadow-2xl scale-[0.4] sm:scale-[0.45] transition-transform duration-500 group-hover:scale-[0.47]">
              <CoverLetterContainer>
                <CoverLetterTemplate
                  data={convertToCoverLetterData(letter)}
                  isPdfPreview={false}
                  isEditing={false}
                />
              </CoverLetterContainer>
            </div>
          </div>
          
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
              onClick={() => handleDelete(letter.id)}
              className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white backdrop-blur-md rounded-2xl transition-all"
            >
              {deleteLoading === letter.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 line-clamp-1">
                {displayTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" />
                {new Date(letter.created_at).toLocaleDateString("fi-FI")}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              {isRAG && (
                <div className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  RAG
                </div>
              )}
              {isATSOptimized && (
                <div className={`px-3 py-1 border rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1 ${
                  atsScore >= 75 
                    ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400' 
                    : atsScore >= 50 
                    ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                    : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  ATS {atsScore}%
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => handleDownloadPDF(letter.id, displayTitle)}
              disabled={isDownloading === letter.id}
              className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl h-12 font-bold"
            >
              {isDownloading === letter.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              PDF
            </Button>
            <Link href={`/edit-cover-letter/${letter.id}`} className="w-full">
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
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan hakukirjeitä...</p>
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
              Omat <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">Hakukirjeet</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-md font-medium">
              Kaikki luomasi hakukirjeet yhdessä paikassa. Muokkaa, lataa tai päivitä tyyliä lennosta.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {isMobile && (
              <div className="flex bg-white dark:bg-gray-900/50 p-1 rounded-2xl border border-gray-200 dark:border-gray-800">
                <button onClick={() => setMobileView('carousel')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${mobileView === 'carousel' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}><List className="w-4 h-4"/> Selaa</button>
                <button onClick={() => setMobileView('grid')} className={`px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-bold transition-all ${mobileView === 'grid' ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-500'}`}><LayoutGrid className="w-4 h-4"/> Ruudukko</button>
              </div>
            )}
            <Link href="/create-cover-letter">
              <Button className="w-full sm:w-auto px-8 py-7 bg-white dark:bg-white text-black hover:bg-gray-100 rounded-2xl font-black flex items-center gap-2 shadow-xl transition-transform hover:scale-[1.02]">
                <Plus className="w-5 h-5" />
                LUO UUSI
              </Button>
            </Link>
          </div>
        </div>

        {coverLetters.length === 0 ? (
          <div className="py-20 text-center bg-white/50 dark:bg-gray-900/20 border border-dashed border-gray-300 dark:border-gray-800 rounded-[3rem]">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">Ei vielä tallennettuja hakukirjeitä</h3>
            <p className="text-gray-500 mb-8">Aloita luomalla ensimmäinen tekoälypohjainen hakukirjeesi.</p>
            <Link href="/create-cover-letter">
              <Button variant="outline" className="rounded-xl px-8">Luo ensimmäinen hakukirje</Button>
            </Link>
          </div>
        ) : (
          <>
            {isMobile && mobileView === 'carousel' ? (
              <div className="relative">
                <div className="overflow-hidden" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
                  <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                    {coverLetters.map((letter) => (
                      <div key={letter.id} className="w-full flex-shrink-0 px-2">
                        {renderLetterCard(letter, true)}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-center items-center gap-6 mt-8">
                  <button onClick={prevSlide} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg"><ChevronLeft/></button>
                  <span className="font-black text-sm">{currentIndex + 1} / {coverLetters.length}</span>
                  <button onClick={nextSlide} className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-lg"><ChevronRight/></button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
                {coverLetters.map((letter) => (
                  <div key={letter.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {renderLetterCard(letter, false)}
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