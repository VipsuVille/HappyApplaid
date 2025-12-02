// app/my-cover-letters/page.tsx
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
  Plus 
} from 'lucide-react';
import { fetchCoverLetters, deleteCoverLetter } from '@/services/coverLetterService-client';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

// Tyypitykset (sovellettu tarpeen mukaan)
interface CoverLetter {
  id: string;
  title: string;
  created_at: string;
  content: any;
  ai_data: any;
}

export default function MyCoverLettersPage() {
  const { getToken, userId } = useAuth();
  const [coverLetters, setCoverLetters] = useState<CoverLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [improvingATSId, setImprovingATSId] = useState<string | null>(null);
  const letterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const setLetterRef = useCallback((letterId: string) => (el: HTMLDivElement | null) => {
    letterRefs.current[letterId] = el;
  }, []);

  // ✅ Lataa hakukirjeet
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

  // ✅ Poista hakukirje
  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;

    setDeleteLoading(id);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const { error } = await deleteCoverLetter(id, token);
      if (error) throw error;
      
      // Päivitä lista ilman uutta hakua
      setCoverLetters(prev => prev.filter(letter => letter.id !== id));
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      alert('Hakukirjeen poistaminen epäonnistui');
    } finally {
      setDeleteLoading(null);
    }
  };

  // ✅ ATS Parannus logiikka
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

      // Päivitä tietokantaan (yksinkertaistettu tässä esimerkissä, oikeasti API kutsu)
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
      alert(`✅ ATS-pisteet parannettu! Lisättiin avainsanoja.`);
      
    } catch (error) {
      console.error('Error improving ATS:', error);
      alert('ATS-parannus epäonnistui.');
    } finally {
      setImprovingATSId(null);
    }
  };

  // ✅ PDF Lataus
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
        throw new Error(errorBody.error || 'PDF generation failed on server.');
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
      alert('PDF:n lataus epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
    } finally {
      setIsDownloading(null);
    }
  };

  // ✅ Apufunktiot otsikolle
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

  // --- RENDERÖINTI ---

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg font-bold text-gray-900">Ladataan hakukirjeitä...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-2xl p-8 text-center">
            <div className="h-16 w-16 bg-gradient-to-br from-red-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-xl">
              <span className="text-white text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Virhe hakukirjeiden lataamisessa</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button onClick={loadCoverLetters} className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all">
              Yritä uudelleen
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (coverLetters.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
         {/* Animated background blobs */}
         <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-br from-indigo-400/30 to-purple-400/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-pink-400/20 to-orange-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
        </div>

        <div className="max-w-2xl mx-auto py-16 px-4 relative z-10">
          <div className="backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-3xl shadow-2xl p-12 text-center backdrop-saturate-150">
            <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/30">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Ei vielä hakukirjeitä</h2>
            <p className="text-gray-600 mb-6">Luo ensimmäinen vakuuttava hakukirjeesi tekoälyn avulla.</p>
            <Link
              href="/create-cover-letter"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              <Plus className="w-5 h-5" />
              Luo hakukirje
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
            <div className="absolute inset-0 bg-gradient-to-br from-white/50 via-transparent to-blue-100/30 pointer-events-none rounded-3xl"></div>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-100/80 to-cyan-100/80 backdrop-blur-sm border border-white/40 shadow-lg shadow-blue-500/10 mb-3">
                  <FileText className="w-4 h-4 text-blue-700" />
                  <span className="text-xs font-extrabold text-blue-800 uppercase tracking-wider">
                    Cover Letter Collection
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                  Omat hakukirjeet
                </h1>
                <p className="text-gray-700 mt-2">
                  Hallinnoi, optimoi ja lataa hakukirjeesi
                </p>
              </div>

              <Link
                href="/create-cover-letter"
                className="group px-6 py-3 bg-gradient-to-r from-blue-500 via-cyan-600 to-teal-600 text-white font-extrabold rounded-2xl border-2 border-white/40 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                
                <div className="flex items-center gap-2 relative z-10">
                  <Plus className="w-5 h-5" />
                  <span>Luo uusi hakukirje</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Cover Letters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-1 gap-8">
          {coverLetters.map((letter) => {
            const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
            const displayTitle = letter.title || smartTitle;
            const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
            const isATSOptimized = !!letter.ai_data?.ats_optimization;
            const needsATSImprovement = isATSOptimized && atsScore > 0 && atsScore < 75;

            return (
              <div
                key={letter.id}
                className="group backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-blue-500/10 hover:shadow-2xl hover:shadow-blue-500/20 transition-all overflow-hidden backdrop-saturate-150 relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                {/* Delete Button */}
                <div className="absolute top-3 right-3 z-20">
                  <button
                    onClick={() => handleDelete(letter.id)}
                    disabled={deleteLoading === letter.id}
                    className="h-10 w-10 backdrop-blur-lg bg-white/90 border-2 border-white/60 rounded-full flex items-center justify-center shadow-lg hover:bg-red-50 transition-all hover:scale-110"
                    title="Poista hakukirje"
                  >
                    {deleteLoading === letter.id ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-red-500" />
                    )}
                  </button>
                </div>


{/* Preview - Scaled exactly like CV */}
<div
  className="relative md:h-[306mm] h-[130mm] w-full overflow-hidden bg-indigo-200/20"
  style={{
    boxShadow: "inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
  }}
>
  {/* MUUTOS: Palautettu items-center ja poistettu ylimääräiset paddingit */}
  <div className="absolute inset-0 flex items-center justify-center">
    <div className="w-full h-full flex items-center justify-center">
      <CoverLetterContainer
        ref={setLetterRef(letter.id)}
        data-template-type="standard"
        // MUUTOS: Lisätty min-w-[210mm] ja min-h-[297mm] varmistamaan A4-muoto
        // Palautettu origin-center, jotta se keskittyy nätisti kuten CV
        className="transform lg:scale-100 md:scale-[0.7] scale-[0.4] origin-center min-w-[210mm] min-h-[297mm] shadow-lg bg-white"
      >
        <CoverLetterTemplate 
          data={letter}
          ai_data={letter.ai_data}
          isPdfPreview={false}
          isEditing={false}
        />
      </CoverLetterContainer>
    </div>
  </div>
</div>

                {/* Info & Actions */}
                <div className="p-5 relative z-10 border-t-2 border-white/40">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {displayTitle}
                      </h3>
                      <p className="text-xs text-gray-500">
                        Luotu: {new Date(letter.created_at).toLocaleDateString("fi-FI")}
                      </p>
                    </div>
                    
                    {/* ATS Badge */}
                    {isATSOptimized && (
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold shadow-sm ${
                        atsScore >= 75 ? 'bg-green-100 text-green-700 border border-green-200' :
                        atsScore >= 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                        'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        <TrendingUp className="w-3 h-3" />
                        ATS: {atsScore}%
                      </div>
                    )}
                  </div>

                  {/* ATS Suggestion Alert */}
                  {needsATSImprovement && (
                    <div className="mb-4 p-3 bg-yellow-50/80 border border-yellow-200 rounded-xl flex items-center justify-between gap-2">
                       <span className="text-xs text-yellow-800 font-medium flex items-center gap-2">
                         <Sparkles className="w-3 h-3" />
                         Voidaan parantaa (Nykyinen: {atsScore}%)
                       </span>
                       <button 
                        onClick={() => handleImproveATS(letter.id)}
                        disabled={improvingATSId === letter.id}
                        className="text-xs bg-white/80 px-2 py-1 rounded-lg shadow-sm border border-yellow-200 text-yellow-700 hover:bg-white transition-colors"
                       >
                         {improvingATSId === letter.id ? "Parannetaan..." : "Paranna"}
                       </button>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDownloadPDF(letter.id, displayTitle)}
                      disabled={isDownloading === letter.id}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDownloading === letter.id ? (
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
                      href={`/edit-cover-letter/${letter.id}`}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all"
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
        <div className="mt-8 backdrop-blur-xl bg-white/70 border-2 border-white/40 rounded-2xl shadow-xl shadow-blue-500/10 p-6 backdrop-saturate-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-blue-500/30">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-blue-900">{coverLetters.length}</div>
              <div className="text-sm text-gray-600">Hakukirjettä luotu</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-green-500/30">
                <Download className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-green-900">∞</div>
              <div className="text-sm text-gray-600">Latauksia saatavilla</div>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg shadow-purple-500/30">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div className="text-2xl font-extrabold text-purple-900">Premium</div>
              <div className="text-sm text-gray-600">AI-optimointi käytössä</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}