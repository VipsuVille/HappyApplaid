// app/my-cover-letters/page.tsx - ✅ FIXED (NO EXPORT ERROR + BETTER PREVIEW)

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
  Sparkles,
  TrendingUp,
  Plus,
  Database,
  LayoutGrid,
  Grid3x3,
  Square,
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

type GridSize = 'small' | 'medium' | 'large';
type MobileView = 'carousel' | 'grid';

// ✅ PAREMMAT PREVIEW-KOOT (näkyy koko kirje)
const GRID_CONFIGS = {
  small: {
    cols: 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    previewHeight: '400px', // ✅ Kasvatettu
    scale: 0.28, // ✅ Yksi scale kaikille
    label: 'Pieni',
    icon: LayoutGrid
  },
  medium: {
    cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    previewHeight: '550px', // ✅ Kasvatettu
    scale: 0.40,
    label: 'Keskikokoinen',
    icon: Grid3x3
  },
  large: {
    cols: 'grid-cols-1 lg:grid-cols-2',
    previewHeight: '700px', // ✅ Kasvatettu
    scale: 0.55,
    label: 'Iso',
    icon: Square
  }
};

export default function MyCoverLettersPage() {
  const { getToken, userId } = useAuth();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const letterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [gridSize, setGridSize] = useState<GridSize>('medium');

  // Mobile
  const [mobileView, setMobileView] = useState<MobileView>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const setLetterRef = useCallback((letterId: string) => (el: HTMLDivElement | null) => {
    letterRefs.current[letterId] = el;
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Carousel navigation
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

  // Touch gestures
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

  // ✅ HELPER FUNCTION (EI EXPORT!)
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

  // ✅ RENDER LETTER CARD
  const renderLetterCard = (letter: CoverLetter, isCarousel: boolean = false) => {
    const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
    const displayTitle = letter.title || smartTitle;
    const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
    const isATSOptimized = !!letter.ai_data?.ats_optimization;
    const isRAG = !!letter.ai_data?.rag_used;

    const currentGrid = GRID_CONFIGS[gridSize];
    const previewHeight = isCarousel ? '500px' : currentGrid.previewHeight;
    const previewScale = isCarousel ? 0.38 : currentGrid.scale;

    return (
      <div className={`backdrop-blur-xl bg-card border border-border rounded-2xl overflow-hidden ${!isCarousel ? 'group' : ''}`}>
        
        {/* Delete button (grid only) */}
        {!isCarousel && (
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="h-10 w-10 backdrop-blur-lg bg-destructive/10 border border-destructive/50 rounded-full flex items-center justify-center hover:bg-destructive/20 transition-colors"
            >
              {deleteLoading === letter.id ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5 text-destructive" />
              )}
            </button>
          </div>
        )}

        {/* ✅ PREVIEW (KOKO KIRJE NÄKYY!) */}
        <div
          className="relative w-full overflow-hidden bg-muted/20"
          style={{ height: previewHeight }}
        >
          <div className="absolute inset-0 overflow-y-auto flex justify-center items-start py-4 px-2">
            <div 
              className="origin-top"
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
        </div>

        {/* Info */}
        <div className="p-4 border-t border-border">
          <h3 className="text-base md:text-lg font-bold mb-2 text-foreground truncate">
            {displayTitle}
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            {new Date(letter.created_at).toLocaleDateString('fi-FI')}
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {isRAG && (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                <Database className="w-3 h-3" />
                RAG
              </span>
            )}
            
            {isATSOptimized && (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold border ${
                atsScore >= 75 
                  ? 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30' 
                  : atsScore >= 50 
                  ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30'
                  : 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30'
              }`}>
                <TrendingUp className="w-3 h-3" />
                ATS: {atsScore}%
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => handleDownloadPDF(letter.id, displayTitle)}
              disabled={isDownloading === letter.id}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
            >
              {isDownloading === letter.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Lataa</span>
                </>
              )}
            </button>

            <Link
              href={`/edit-cover-letter/${letter.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-xl font-bold text-sm"
            >
              <Edit className="w-4 h-4" />
              <span className="hidden sm:inline">Muokkaa</span>
            </Link>
          </div>

          {/* Delete (carousel only) */}
          {isCarousel && (
            <button
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/20 transition-colors"
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

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold">Ladataan...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto py-16 px-4">
          <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Virhe</h2>
            <p className="text-destructive mb-6">{error}</p>
            <button 
              onClick={loadCoverLetters} 
              className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-xl"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty
  if (coverLetters.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto py-16 px-4">
          <div className="backdrop-blur-xl bg-card border border-border rounded-3xl p-12 text-center">
            <FileText className="h-20 w-20 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold mb-3">Ei vielä hakukirjeitä</h2>
            <p className="text-muted-foreground mb-6">Luo ensimmäinen hakukirjeesi.</p>
            <Link
              href="/create-cover-letter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl"
            >
              <Plus className="w-5 h-5" />
              Luo hakukirje
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentGrid = GRID_CONFIGS[gridSize];
  const IconComponent = currentGrid.icon;
  const showCarousel = isMobile && mobileView === 'carousel';
  const showGrid = !isMobile || mobileView === 'grid';

  return (
    <div className="min-h-screen bg-background text-foreground">
      
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
        
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-card border border-border rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Omat hakukirjeet
                </h1>
                <p className="text-muted-foreground mt-2">
                  {coverLetters.length} hakukirjettä
                </p>
              </div>

              <Link
                href="/create-cover-letter"
                className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold rounded-2xl hover:scale-105 transition-all flex items-center gap-2 w-fit"
              >
                <Plus className="w-5 h-5" />
                <span>Luo uusi</span>
              </Link>
            </div>

            {/* View controls */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconComponent className="w-4 h-4" />
                <span className="font-bold">Näkymä:</span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {/* Mobile: Carousel vs Grid */}
                {isMobile && (
                  <>
                    <button
                      onClick={() => setMobileView('carousel')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
                        mobileView === 'carousel'
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      Carousel
                    </button>
                    
                    <button
                      onClick={() => setMobileView('grid')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
                        mobileView === 'grid'
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      Grid
                    </button>
                  </>
                )}

                {/* Grid sizes */}
                {showGrid && (
                  <>
                    {(Object.keys(GRID_CONFIGS) as GridSize[]).map((size) => {
                      const Icon = GRID_CONFIGS[size].icon;
                      return (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${
                            gridSize === size
                              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="hidden sm:inline">{GRID_CONFIGS[size].label}</span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Carousel */}
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

            {/* Arrows */}
            {coverLetters.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 border border-border rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 border border-border rounded-full flex items-center justify-center shadow-lg z-10"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Dots */}
            {coverLetters.length > 1 && (
              <div className="flex justify-center gap-2 mt-4">
                {coverLetters.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-primary w-6'
                        : 'bg-muted-foreground/30 w-2'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Counter */}
            <p className="text-center mt-2 text-sm text-muted-foreground">
              {currentIndex + 1} / {coverLetters.length}
            </p>
          </div>
        ) : (
          /* Grid */
          <div className={`grid ${currentGrid.cols} gap-4 md:gap-6`}>
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