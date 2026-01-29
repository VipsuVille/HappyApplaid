// app/my-cover-letters/page.tsx - WITH USER CHOICE FOR MOBILE VIEW

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

const GRID_CONFIGS = {
  small: {
    cols: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
    previewHeight: '250px',
    scale: { mobile: 0.18, tablet: 0.25, desktop: 0.35 },
    label: 'Pieni',
    icon: LayoutGrid
  },
  medium: {
    cols: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    previewHeight: '400px',
    scale: { mobile: 0.28, tablet: 0.45, desktop: 0.45 },
    label: 'Keskikokoinen',
    icon: Grid3x3
  },
  large: {
    cols: 'grid-cols-1',
    previewHeight: '600px',
    scale: { mobile: 0.40, tablet: 0.65, desktop: 0.90 },
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
  const [improvingATSId, setImprovingATSId] = useState<string | null>(null);
  const letterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [gridSize, setGridSize] = useState<GridSize>('medium');

  // ✅ MOBILE VIEW SELECTION
  const [mobileView, setMobileView] = useState<MobileView>('carousel');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const setLetterRef = useCallback((letterId: string) => (el: HTMLDivElement | null) => {
    letterRefs.current[letterId] = el;
  }, []);

  // ✅ MOBILE DETECTION
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ CAROUSEL NAVIGATION
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

  // ✅ TOUCH GESTURES
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

  const handleImproveATS = async (letterId: string) => {
    const letter = coverLetters.find(l => l.id === letterId);
    if (!letter) return;

    const currentScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
    
    if (!confirm(
      `Nykyiset ATS-pisteet: ${currentScore}%\n\n` +
      'Haluatko parantaa hakukirjettä automaattisesti?\n\n' +
      '⚠️ Huom: Tämä muokkaa hakukirjeen sisältöä.'
    )) return;

    setImprovingATSId(letterId);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/improve-ats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentContent: letter.content?.body || letter.ai_data?.html?.content,
          missingKeywords: letter.ai_data?.ats_optimization?.report?.missing_keywords || [],
          jobDescription: letter.content?.job_description,
        }),
      });

      if (!response.ok) throw new Error('ATS improvement failed');

      const data = await response.json();

      const updateResponse = await fetch(`/api/cover-letters/${letterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: { ...letter.content, body: data.improvedContent },
          ai_data: {
            ...letter.ai_data,
            html: { ...letter.ai_data.html, content: data.improvedContent },
            ats_optimization: {
              ...letter.ai_data.ats_optimization,
              last_improved: new Date().toISOString(),
            }
          }
        }),
      });

      if (!updateResponse.ok) throw new Error('Failed to save improved version');
      const updatedLetter = await updateResponse.json();
      
      setCoverLetters(prev => prev.map(l => l.id === letterId ? updatedLetter : l));
      alert(`✅ ATS-pisteet parannettu!`);
      
    } catch (error) {
      console.error('Error improving ATS:', error);
      alert('ATS-parannus epäonnistui.');
    } finally {
      setImprovingATSId(null);
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

  const convertToCoverLetterData = (letter: CoverLetter) => ({
    name: letter.content?.contactInfo?.name || letter.content?.applicant_info?.name || "Hakija",
    email: letter.content?.contactInfo?.email || letter.content?.applicant_info?.email || "",
    phone: letter.content?.contactInfo?.phone || letter.content?.applicant_info?.phone || "",
    location: letter.content?.contactInfo?.location || "",
    jobTitle: letter.ai_data?.job_title || letter.content?.job_title || "",
    companyName: letter.ai_data?.company_name || letter.content?.company_name || "",
    title: letter.title,
    content: letter.content?.body || letter.ai_data?.html?.content || "",
    keyHighlights: letter.ai_data?.key_highlights || [],
    language: letter.content?.language || "finnish",
    style: (letter.content?.style || letter.ai_data?.style || "professional") as "professional" | "casual" | "creative"
  });

  // ✅ RENDER LETTER CARD (käytetään sekä carousel:ssa että grid:ssä)
  const renderLetterCard = (letter: CoverLetter, isCarousel: boolean = false) => {
    const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
    const displayTitle = letter.title || smartTitle;
    const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
    const isATSOptimized = !!letter.ai_data?.ats_optimization;
    const needsATSImprovement = isATSOptimized && atsScore > 0 && atsScore < 75;
    const isRAG = !!letter.ai_data?.rag_used;

    const previewHeight = isCarousel ? '350px' : (isMobile && mobileView === 'grid' ? '280px' : currentGrid.previewHeight);
    const previewScale = isCarousel ? 0.35 : (
      isMobile && mobileView === 'grid' 
        ? currentGrid.scale.mobile 
        : typeof window !== 'undefined' && window.innerWidth < 640
        ? currentGrid.scale.mobile
        : typeof window !== 'undefined' && window.innerWidth < 1024
        ? currentGrid.scale.tablet
        : currentGrid.scale.desktop
    );

    return (
      <div className={`backdrop-blur-xl bg-card border border-border rounded-2xl overflow-hidden ${isCarousel ? '' : 'relative group'}`}>
        
        {/* Delete button */}
        {!isCarousel && (
          <div className="absolute top-3 right-3 z-20">
            <button
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="h-10 w-10 backdrop-blur-lg bg-destructive/10 border border-destructive/50 rounded-full flex items-center justify-center hover:bg-destructive/20 transition-colors"
            >
              {deleteLoading === letter.id ? (
                <Loader2 className="w-5 h-5 animate-spin text-destructive" />
              ) : (
                <Trash2 className="w-5 h-5 text-destructive" />
              )}
            </button>
          </div>
        )}

        {/* Preview */}
        <div
          className="relative w-full overflow-hidden bg-muted/20"
          style={{ height: previewHeight }}
        >
          <div className="absolute inset-0 overflow-y-auto flex justify-center py-4">
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
        <div className="p-4">
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

          {/* ATS Improvement */}
          {needsATSImprovement && (
            <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl flex items-center justify-between">
              <span className="text-xs text-yellow-600 dark:text-yellow-400">
                <Sparkles className="w-3 h-3 inline mr-1" />
                Parannetaan ({atsScore}%)
              </span>
              <button
                onClick={() => handleImproveATS(letter.id)}
                disabled={improvingATSId === letter.id}
                className="text-xs bg-yellow-500/20 px-2 py-1 rounded-lg text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/30 transition-colors"
              >
                {improvingATSId === letter.id ? "..." : "Paranna"}
              </button>
            </div>
          )}

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

          {/* Delete in carousel */}
          {isCarousel && (
            <button
              onClick={() => handleDelete(letter.id)}
              disabled={deleteLoading === letter.id}
              className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-xl text-sm font-bold hover:bg-destructive/20 transition-colors disabled:opacity-50"
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="backdrop-blur-xl bg-card border border-border rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg font-bold text-foreground">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-card border border-border rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">Virhe</h2>
            <p className="text-destructive mb-6">{error}</p>
            <button 
              onClick={loadCoverLetters} 
              className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-card border border-border rounded-3xl p-12 text-center">
            <FileText className="h-20 w-20 text-primary mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-foreground mb-3">Ei vielä hakukirjeitä</h2>
            <p className="text-muted-foreground mb-6">Luo ensimmäinen hakukirjeesi.</p>
            <Link
              href="/create-cover-letter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity"
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

  // ✅ PÄÄTÄ MITÄ NÄYTETÄÄN
  const showCarousel = isMobile && mobileView === 'carousel';
  const showGrid = !isMobile || mobileView === 'grid';

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-card border border-border rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Omat hakukirjeet
                </h1>
                <p className="text-muted-foreground mt-2">
                  Hallinnoi ja lataa hakukirjeesi
                </p>
              </div>

              <Link
                href="/create-cover-letter"
                className="px-6 py-3 bg-gradient-to-r from-primary to-accent text-primary-foreground font-extrabold rounded-2xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Luo uusi</span>
              </Link>
            </div>

            {/* ✅ VIEW CONTROLS - AINA NÄKYVISSÄ */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <IconComponent className="w-4 h-4" />
                <span className="font-bold">Näkymä:</span>
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {/* ✅ MOBILE: CAROUSEL VS GRID */}
                {isMobile && (
                  <>
                    <button
                      onClick={() => setMobileView('carousel')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        mobileView === 'carousel'
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <List className="w-4 h-4" />
                      <span>Carousel</span>
                    </button>
                    
                    <button
                      onClick={() => setMobileView('grid')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        mobileView === 'grid'
                          ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                      <span>Grid</span>
                    </button>
                  </>
                )}

                {/* ✅ GRID SIZE (näkyy kun grid on valittuna tai desktopissa) */}
                {showGrid && (
                  <>
                    {(Object.keys(GRID_CONFIGS) as GridSize[]).map((size) => {
                      const Icon = GRID_CONFIGS[size].icon;
                      return (
                        <button
                          key={size}
                          onClick={() => setGridSize(size)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                            gridSize === size
                              ? 'bg-gradient-to-r from-primary to-accent text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80'
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

        {/* ✅ MOBILE CAROUSEL */}
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

            {/* Navigation Arrows */}
            {coverLetters.length > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-card transition-colors"
                  aria-label="Previous"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>

                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-card/90 backdrop-blur-sm border border-border rounded-full flex items-center justify-center shadow-lg z-10 hover:bg-card transition-colors"
                  aria-label="Next"
                >
                  <ChevronRight className="w-6 h-6 text-foreground" />
                </button>
              </>
            )}

            {/* Dots Indicator */}
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
                    aria-label={`Go to slide ${index + 1}`}
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
          /* ✅ GRID VIEW */
          <div className={`grid ${currentGrid.cols} gap-4 md:gap-6`}>
            {coverLetters.map((letter) => (
              <div key={letter.id}>
                {renderLetterCard(letter, false)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}