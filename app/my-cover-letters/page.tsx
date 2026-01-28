// app/my-cover-letters/page.tsx - TYPESCRIPT FIXED

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
  Zap,
  Plus,
  Database,
  LayoutGrid,
  Grid3x3,
  Square
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

const GRID_CONFIGS = {
  small: {
    cols: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    previewHeight: '300px',
    scale: { mobile: 0.20, tablet: 0.30, desktop: 0.40 },
    label: 'Pieni',
    icon: LayoutGrid
  },
  medium: {
    cols: 'grid-cols-1 md:grid-cols-1 lg:grid-cols-2',
    previewHeight: '450px',
    scale: { mobile: 0.30, tablet: 0.50, desktop: 0.65 },
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

  const setLetterRef = useCallback((letterId: string) => (el: HTMLDivElement | null) => {
    letterRefs.current[letterId] = el;
  }, []);

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

  // ✅ KORJATTU: Oikea data-mapping CoverLetterTemplate:lle
  const convertToCoverLetterData = (letter: CoverLetter) => ({
    name: letter.content?.contactInfo?.name || letter.content?.applicant_info?.name || "Hakija",
    email: letter.content?.contactInfo?.email || letter.content?.applicant_info?.email || "",
    phone: letter.content?.contactInfo?.phone || letter.content?.applicant_info?.phone || "",
    location: letter.content?.contactInfo?.location || "",
    jobTitle: letter.ai_data?.job_title || letter.content?.job_title || "",
    companyName: letter.ai_data?.company_name || letter.content?.company_name || "",
    title: letter.title,
    
    // ✅ KORJAUS: content (ei body!)
    content: letter.content?.body || letter.ai_data?.html?.content || "",
    
    keyHighlights: letter.ai_data?.key_highlights || [],
    language: letter.content?.language || "finnish",
    style: (letter.content?.style || letter.ai_data?.style || "professional") as "professional" | "casual" | "creative"
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#030711] flex items-center justify-center">
        <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-100">Ladataan...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030711] relative overflow-hidden">
        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-100 mb-4">Virhe</h2>
            <p className="text-red-400 mb-6">{error}</p>
            <button onClick={loadCoverLetters} className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl">
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (coverLetters.length === 0) {
    return (
      <div className="min-h-screen bg-[#030711] relative overflow-hidden">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-3xl p-12 text-center">
            <FileText className="h-20 w-20 text-orange-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-100 mb-3">Ei vielä hakukirjeitä</h2>
            <p className="text-gray-400 mb-6">Luo ensimmäinen hakukirjeesi.</p>
            <Link
              href="/create-cover-letter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl"
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

  return (
    <div className="min-h-screen bg-[#030711] text-[#e7e3dc] relative overflow-hidden">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 relative z-10">
        
        {/* Header */}
        <div className="mb-8">
          <div className="backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-3xl p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-orange-400 to-amber-500 bg-clip-text text-transparent">
                  Omat hakukirjeet
                </h1>
                <p className="text-gray-400 mt-2">
                  Hallinnoi ja lataa hakukirjeesi
                </p>
              </div>

              <Link
                href="/create-cover-letter"
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-extrabold rounded-2xl hover:scale-105 transition-all flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>Luo uusi</span>
              </Link>
            </div>

            {/* Grid controls */}
            <div className="mt-6 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <IconComponent className="w-4 h-4" />
                <span className="font-bold">Näkymä:</span>
              </div>
              
              <div className="flex gap-2">
                {(Object.keys(GRID_CONFIGS) as GridSize[]).map((size) => {
                  const Icon = GRID_CONFIGS[size].icon;
                  return (
                    <button
                      key={size}
                      onClick={() => setGridSize(size)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                        gridSize === size
                          ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                          : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{GRID_CONFIGS[size].label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className={`grid ${currentGrid.cols} gap-6`}>
          {coverLetters.map((letter) => {
            const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
            const displayTitle = letter.title || smartTitle;
            const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
            const isATSOptimized = !!letter.ai_data?.ats_optimization;
            const needsATSImprovement = isATSOptimized && atsScore > 0 && atsScore < 75;
            
            const isRAG = !!letter.ai_data?.rag_used;
            const letterVersion = letter.ai_data?.version || 'v1';

            return (
              <div
                key={letter.id}
                className="group backdrop-blur-xl bg-[#1a1a1a]/70 border border-gray-800 rounded-2xl overflow-hidden"
              >
                {/* Delete */}
                <div className="absolute top-3 right-3 z-20">
                  <button
                    onClick={() => handleDelete(letter.id)}
                    disabled={deleteLoading === letter.id}
                    className="h-10 w-10 backdrop-blur-lg bg-black/60 border border-red-800/50 rounded-full flex items-center justify-center hover:bg-red-900/30"
                  >
                    {deleteLoading === letter.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-red-400" />
                    )}
                  </button>
                </div>

                {/* Preview */}
                <div
                  className="relative w-full overflow-hidden bg-gray-900/20"
                  style={{ height: currentGrid.previewHeight }}
                >
                  <div className="absolute inset-0 overflow-y-auto flex justify-center py-4 px-2">
                    <div 
                      className="origin-top"
                      style={{
                        transform: `scale(${
                          typeof window !== 'undefined' && window.innerWidth < 640
                            ? currentGrid.scale.mobile
                            : typeof window !== 'undefined' && window.innerWidth < 1024
                            ? currentGrid.scale.tablet
                            : currentGrid.scale.desktop
                        })`
                      }}
                    >
                      <CoverLetterContainer
                        ref={setLetterRef(letter.id)}
                        className="shadow-lg bg-white"
                      >
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
                <div className="p-5 border-t border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-100 mb-1">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-gray-500 mb-2">
                        {new Date(letter.created_at).toLocaleDateString("fi-FI")}
                      </p>
                      
                      {/* Badges */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {isRAG && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-purple-900/30 text-purple-400">
                            <Database className="w-3 h-3" />
                            RAG
                          </span>
                        )}
                        
                        {isATSOptimized && (
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                            atsScore >= 75 ? 'bg-green-900/30 text-green-400' :
                            atsScore >= 50 ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            ATS: {atsScore}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ATS Improvement */}
                  {needsATSImprovement && (
                    <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-800/30 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-yellow-400">
                        <Sparkles className="w-3 h-3 inline mr-1" />
                        Parannetaan ({atsScore}%)
                      </span>
                      <button
                        onClick={() => handleImproveATS(letter.id)}
                        disabled={improvingATSId === letter.id}
                        className="text-xs bg-yellow-900/30 px-2 py-1 rounded-lg text-yellow-400"
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl"
                    >
                      {isDownloading === letter.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span className="text-sm">Lataa</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={`/edit-cover-letter/${letter.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-bold rounded-xl"
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
      </div>
    </div>
  );
}