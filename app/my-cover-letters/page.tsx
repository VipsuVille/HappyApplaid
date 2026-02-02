// app/my-cover-letters/page.tsx - ✅ KORJATTU (Grid-näkymä kuin CV:ssä, carousel mobiilissa)

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
} from 'lucide-react';
import { fetchCoverLetters, deleteCoverLetter } from '@/services/coverLetterService-client';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

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

  const nextSlide = () => {
    setCurrentIndex((prev) => 
      prev === coverLetters.length - 1 ? 0 : prev + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => 
      prev === 0 ? coverLetters.length - 1 : prev - 1
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
      
      if (mobileView === 'carousel' && currentIndex >= coverLetters.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      alert('Hakukirjeen poistaminen epäonnistui');
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
    } catch (error) {
      console.error('PDF download failed:', error);
      alert('PDF:n lataus epäonnistui');
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

  // ✅ KORJATTU: SAMA DATA KUIN EDIT-SIVU JA PDF!
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

    const previewHeight = isCarousel ? '500px' : '400px';
    const previewScale = isCarousel ? 0.38 : 0.45;

    return (
      <div className="group bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl shadow-xl overflow-hidden flex flex-col hover:shadow-2xl transition-all">
        
        {/* ✅ PREVIEW - Samanlainen kuin CV:ssä */}
        <div
          className="relative bg-indigo-50/50 dark:bg-muted/20 overflow-hidden border-b-2 border-white/40 dark:border-border"
          style={{ 
            height: previewHeight,
          }}
        >
          <div className="absolute inset-0 flex justify-center items-start pt-8">
            <div 
              className="origin-top shadow-2xl"
              style={{ transform: `scale(${previewScale})` }}
            >
              <CoverLetterContainer className="bg-white shadow-lg">
                <CoverLetterTemplate
                  data={convertToCoverLetterData(letter)}
                  isPdfPreview={false}
                  isEditing={false}
                />
              </CoverLetterContainer>
            </div>
          </div>
          
          {/* Poistopainike kulmassa - vain grid-näkymässä */}
          {!isCarousel && (
            <button 
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="absolute top-4 right-4 p-3 bg-white/90 dark:bg-card/90 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 shadow-lg z-20 transition-colors"
            >
              {deleteLoading === letter.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
            </button>
          )}
        </div>

        {/* Tiedot ja toiminnot */}
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-foreground mb-1">
                {displayTitle}
              </h3>
              <p className="text-sm text-gray-500 dark:text-muted-foreground">
                Päivitetty: {new Date(letter.created_at).toLocaleDateString('fi-FI')}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isRAG && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                  <Database className="w-3 h-3" />
                  RAG
                </span>
              )}
              
              {isATSOptimized && (
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  atsScore >= 75 
                    ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' 
                    : atsScore >= 50 
                    ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                    : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30'
                }`}>
                  <TrendingUp className="w-3 h-3" />
                  ATS {atsScore}%
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleDownloadPDF(letter.id, displayTitle)}
              disabled={isDownloading === letter.id}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-all"
            >
              {isDownloading === letter.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Lataa PDF
                </>
              )}
            </button>

            <Link
              href={`/edit-cover-letter/${letter.id}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-xl shadow-lg hover:bg-indigo-700 dark:hover:bg-primary/90 transition-all"
            >
              <Edit className="w-4 h-4" />
              Muokkaa
            </Link>
          </div>

          {/* Poistopainike carusellissa */}
          {isCarousel && (
            <button
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 dark:bg-destructive/10 text-red-600 dark:text-destructive rounded-xl text-sm font-bold hover:bg-red-500/20 dark:hover:bg-destructive/20 transition-colors"
            >
              {deleteLoading === letter.id ? (
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

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background">
        <div className="max-w-2xl mx-auto py-16 px-4">
          <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Virhe</h2>
            <p className="text-red-600 dark:text-destructive mb-6">{error}</p>
            <button 
              onClick={loadCoverLetters} 
              className="px-6 py-3 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-xl"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (coverLetters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:bg-background">
        <div className="max-w-2xl mx-auto py-16 px-4">
          <div className="bg-white/70 dark:bg-card/70 backdrop-blur-xl border-2 border-white/40 dark:border-border rounded-3xl p-12 text-center">
            <FileText className="h-20 w-20 text-indigo-500 dark:text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Ei vielä hakukirjeitä</h2>
            <p className="text-gray-600 dark:text-muted-foreground mb-6">Luo ensimmäinen hakukirjeesi.</p>
            <Link
              href="/create-cover-letter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-xl hover:scale-105 transition-transform"
            >
              <Plus className="w-5 h-5" />
              Luo hakukirje
            </Link>
          </div>
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 to-pink-600 dark:from-primary dark:to-accent bg-clip-text text-transparent">
                  Omat hakukirjeet
                </h1>
                <p className="text-gray-600 dark:text-muted-foreground mt-2">
                  Hallinnoi ja lataa ammattimaiset hakukirjeet
                </p>
              </div>

              <Link
                href="/create-cover-letter"
                className="flex items-center gap-2 px-8 py-4 bg-indigo-600 dark:bg-primary text-white dark:text-primary-foreground font-bold rounded-2xl shadow-xl hover:scale-105 transition-all"
              >
                <Plus className="w-5 h-5" />
                <span>Luo uusi</span>
              </Link>
            </div>

            {/* Näkymän valitsimet */}
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
                {coverLetters.map((letter) => (
                  <div key={letter.id} className="w-full flex-shrink-0 px-2">
                    {renderLetterCard(letter, true)}
                  </div>
                ))}
              </div>
            </div>

            {coverLetters.length > 1 && (
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

            {coverLetters.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {coverLetters.map((_, index) => (
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
              {currentIndex + 1} / {coverLetters.length}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-10">
            {coverLetters.map((letter) => (
              <div key={letter.id} className="relative">
                {renderLetterCard(letter, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}