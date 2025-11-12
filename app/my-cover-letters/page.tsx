// app/my-cover-letters/page.tsx - PÄIVITETTY ATS-PAINIKKEELLA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Edit, Trash2, FileText, Download, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { fetchCoverLetters, deleteCoverLetter } from '@/services/coverLetterService-client';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import ATSReport from '@/components/ats-raportti';
import SmartHeader from '@/components/ui/smartHeader';

export default function MyCoverLettersPage() {
  const { user } = useUser();
  const { getToken, userId } = useAuth();
  const [coverLetters, setCoverLetters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [improvingATSId, setImprovingATSId] = useState<string | null>(null);
  const letterRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editedTitles, setEditedTitles] = useState<Record<string, string>>({});

  const setLetterRef = useCallback((letterId: string) => (el: HTMLDivElement | null) => {
    letterRefs.current[letterId] = el;
  }, []);

  useEffect(() => {
    const loadCoverLetters = async () => {
      if (!userId) return;

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

    loadCoverLetters();
  }, [userId, getToken]);

  const handleDelete = async (id: string) => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;

    setDeletingId(id);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const { error } = await deleteCoverLetter(id, token);
      if (error) throw error;
      
      setCoverLetters(prev => prev.filter(letter => letter.id !== id));
    } catch (error) {
      console.error('Error deleting cover letter:', error);
      setError('Hakukirjeen poistaminen epäonnistui');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSaveTitle = async (letterId: string, newTitle: string) => {
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${letterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) throw new Error('Failed to update title');

      setCoverLetters(prev => 
        prev.map(letter => 
          letter.id === letterId ? { ...letter, title: newTitle } : letter
        )
      );
      
      setEditingTitleId(null);
      setEditedTitles(prev => ({ ...prev, [letterId]: newTitle }));
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Otsikon tallentaminen epäonnistui');
    }
  };

  // ✅ UUSI: Paranna ATS-pisteitä automaattisesti
  const handleImproveATS = async (letterId: string) => {
    const letter = coverLetters.find(l => l.id === letterId);
    if (!letter) return;

    const currentScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
    
    if (!confirm(
      `Nykyiset ATS-pisteet: ${currentScore}%\n\n` +
      'Haluatko parantaa hakukirjettä automaattisesti?\n\n' +
      '⚠️ Huom: Tämä muokkaa hakukirjeen sisältöä. Tarkista tulokset huolellisesti.'
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

      // Päivitä hakukirje tietokannassa
      const updateResponse = await fetch(`/api/cover-letters/${letterId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: {
            ...letter.content,
            body: data.improvedContent,
          },
          ai_data: {
            ...letter.ai_data,
            html: {
              ...letter.ai_data.html,
              content: data.improvedContent,
            },
            ats_optimization: {
              ...letter.ai_data.ats_optimization,
              last_improved: new Date().toISOString(),
            }
          }
        }),
      });

      if (!updateResponse.ok) throw new Error('Failed to save improved version');

      // Päivitä state
      const updatedLetter = await updateResponse.json();
      setCoverLetters(prev => 
        prev.map(l => l.id === letterId ? updatedLetter : l)
      );

      alert(
        '✅ ATS-pisteet parannettu!\n\n' +
        'Käy tarkistamassa muutokset "Muokkaa"-sivulla.\n' +
        `Lisättiin avainsanoja: ${data.addedKeywords?.join(', ') || 'useita'}`
      );
      
    } catch (error) {
      console.error('Error improving ATS:', error);
      alert('ATS-parannuksen luonti epäonnistui. Yritä manuaalista muokkausta.');
    } finally {
      setImprovingATSId(null);
    }
  };

  const generateSmartTitle = (jobDescription: string, fallback: string = 'Työhakemus'): string => {
    if (!jobDescription || jobDescription.trim().length === 0) {
      return fallback;
    }

    const firstLine = jobDescription.split('\n')[0].trim();
    
    if (firstLine.length < 20) {
      const twoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
      return cleanTitle(twoLines);
    }
    
    return cleanTitle(firstLine);
  };

  const cleanTitle = (title: string): string => {
    let cleaned = title
      .replace(/\s+/g, ' ')
      .replace(/[^\w\såäöÅÄÖ\-]/g, '')
      .trim();
    
    if (cleaned.length > 60) {
      cleaned = cleaned.substring(0, 60).trim();
      
      const lastSpace = cleaned.lastIndexOf(' ');
      if (lastSpace > 40) {
        cleaned = cleaned.substring(0, lastSpace);
      }
      
      cleaned += '...';
    }
    
    return cleaned || 'Työhakemus';
  };

  const handleDownloadPDF = async (letter: any) => {
    setIsDownloading(letter.id);
    try {
      const smartTitle = generateSmartTitle(
        letter.content?.job_description,
        letter.title
      );
      const displayTitle = editedTitles[letter.id] || letter.title || smartTitle;

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&display=swap');
              
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }

              @page {
                size: A4;
                margin: 0;
              }

              body { 
                margin: 0;
                padding: 20mm 25mm 20mm 35mm;
                font-family: 'Merriweather', serif;
                line-height: 1.7;
                font-size: 11pt;
                color: #333;
                width: 210mm;
                height: 297mm;
                position: relative;
              }
              
              .cover-letter-accent {
                position: fixed;
                top: 0;
                left: 0;
                width: 12px;
                height: 100%;
                background: linear-gradient(to bottom, #3498db, #2980b9, #3498db);
              }
              
              .cover-letter-top-accent {
                position: fixed;
                top: 0;
                left: 12px;
                right: 0;
                height: 8px;
                background: linear-gradient(to right, #3498db, #ede7f6);
                opacity: 0.7;
              }
              
              .cover-letter-content {
                position: relative;
                z-index: 1;
              }
              
              h1 {
                color: #2c3e50;
                border-bottom: 3px solid #3498db;
                padding-bottom: 12px;
                margin-bottom: 30px;
                font-weight: 700;
                font-size: 18pt;
                line-height: 1.3;
              }
              
              p {
                margin-bottom: 16px;
                line-height: 1.7;
                text-align: justify;
                font-size: 11pt;
              }
              
              .signature-section {
                margin-top: 50px;
                page-break-inside: avoid;
              }
              
              .closing-text {
                font-size: 11pt;
                color: #555;
                margin-bottom: 8px;
              }
              
              .signature-line {
                border-bottom: 2px solid #3498db;
                width: 230px;
                margin-bottom: 12px;
              }
              
              .signature-text {
                font-family: 'Dancing Script', cursive;
                font-size: 18pt;
                color: #2c3e50;
              }
            </style>
          </head>
          <body>
            <div class="cover-letter-accent"></div>
            <div class="cover-letter-top-accent"></div>
            
            <div class="cover-letter-content">
              <h1>${displayTitle}</h1>
              ${letter.content?.body || letter.ai_data?.html?.content || ''}
              
              <div class="signature-section">
                <div class="closing-text">Ystävällisin terveisin,</div>
                <div class="signature-line"></div>
                <div class="signature-text">${letter.content?.applicant_info?.name || user?.fullName || 'Hakija'}</div>
              </div>
            </div>
          </body>
        </html>
      `;

      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          htmlContent: html,
          letterId: letter.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('PDF error:', errorData);
        throw new Error(errorData.error || 'PDF generation failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hakukirje_${letter.content?.jobTitle}_${letter.content?.applicant_info?.name || 'cv'}.pdf`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      console.log('✅ PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('PDF:n luonti epäonnistui: ' + (error instanceof Error ? error.message : 'Tuntematon virhe'));
    } finally {
      setIsDownloading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Ladataan hakukirjeitä...</div>
      </div>
    );
  }

  if (error) {
    return (
      <>
        <SmartHeader />
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Omat hakukirjeet</h1>
          <div className="text-center py-8">
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Yritä uudelleen
            </button>
          </div>
        </div>
      </>
    );
  }

  if (coverLetters.length === 0) {
    return (
      <>
        <SmartHeader />
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Omat hakukirjeet</h1>
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">Ei vielä luotuja hakukirjeitä</p>
            <Link 
              href="/create-cover-letter" 
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Luo ensimmäinen hakukirje
            </Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SmartHeader />
      <div
        className="container mx-auto mb-4 md:inline-block md:ml-64 md:-10 pt-4 md:pt-0"
        style={{ maxWidth: '230mm' }}
      >
        <div className="flex justify-between items-center mb-6 mt-20">
          <h1 className="text-2xl font-bold">Omat hakukirjeet</h1>
          <Link
            href="/create-cover-letter"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            + Luo uusi hakukirje
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
          {coverLetters.map((letter) => {
            const smartTitle = generateSmartTitle(
              letter.content?.job_description,
              letter.title
            );
            
            const displayTitle = editedTitles[letter.id] || letter.title || smartTitle;
            const isEditingTitle = editingTitleId === letter.id;
            
            // ✅ TARKISTA ATS-PISTEET
            const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
            const needsATSImprovement = atsScore > 0 && atsScore < 75;

            return (
              <div 
                key={letter.id} 
                className="m-4 rounded-lg p-1 md:p-4 shadow-lg relative group md:h-full h-auto"
              >
                {/* Delete Button */}
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={() => handleDelete(letter.id)}
                    disabled={deletingId === letter.id}
                    className="p-2 rounded-full bg-white shadow hover:bg-red-50 transition-colors"
                    title="Poista hakukirje"
                  >
                    <Trash2 
                      className={`w-5 h-5 ${deletingId === letter.id ? 'text-gray-400' : 'text-red-500'}`}
                    />
                  </button>
                </div>

                {/* Title Section */}
                <div className="mb-4">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        defaultValue={displayTitle}
                        onBlur={(e) => handleSaveTitle(letter.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveTitle(letter.id, e.currentTarget.value);
                          }
                          if (e.key === 'Escape') {
                            setEditingTitleId(null);
                          }
                        }}
                        autoFocus
                        className="text-xl font-semibold border-2 border-blue-500 rounded px-2 py-1 w-full"
                      />
                      <button
                        onClick={() => setEditingTitleId(null)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <h2 
                        className="text-xl font-semibold cursor-pointer hover:text-blue-600 transition-colors"
                        onClick={() => setEditingTitleId(letter.id)}
                        title="Klikkaa muokataksesi otsikkoa"
                      >
                        {displayTitle}
                      </h2>
                      
                      {/* ✅ ATS-PISTEMERKKARI */}
                      {atsScore > 0 && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                          atsScore >= 75 
                            ? 'bg-green-100 text-green-700' 
                            : atsScore >= 50 
                              ? 'bg-yellow-100 text-yellow-700' 
                              : 'bg-red-100 text-red-700'
                        }`}>
                          <TrendingUp className="w-3 h-3" />
                          ATS: {atsScore}%
                        </div>
                      )}
                    </div>
                  )}
                  <p className="text-gray-600">
                    Luotu: {new Date(letter.created_at).toLocaleDateString('fi-FI')}
                  </p>
                </div>

                {/* ✅ PARANNA ATS-PISTEITÄ NAPPI */}
                {needsATSImprovement && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-500 rounded">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800 mb-1">
                          💡 ATS-pisteet voidaan parantaa
                        </p>
                        <p className="text-xs text-gray-600 mb-2">
                          Nykyiset pisteet: {atsScore}%. Tavoite: 75%+
                        </p>
                      </div>
                      <button
                        onClick={() => handleImproveATS(letter.id)}
                        disabled={improvingATSId === letter.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {improvingATSId === letter.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Parannetaan...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            Paranna ATS
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* ATS Report */}
                {letter.ai_data?.ats_optimization?.report && (
                  <div className="mb-4">
                    <ATSReport report={letter.ai_data.ats_optimization.report} />
                  </div>
                )}
                
                {/* Preview Container */}
                <div
                  className="relative md:h-[306mm] h-[130mm] w-auto md:w-full ml-4 mr-4 md:ml-0 md:mr-0 overflow-hidden rounded-lg shadow-inner"
                  style={{
                    boxShadow:
                      "inset 0 4px 6px -1px rgba(0, 0, 0, 0.1), inset 0 -4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div className="absolute top-4 right-2 bottom-4 left-2 md:top-4 md:right-4 md:bottom-4 md:left-4 flex items-center justify-center">
                    <div className="h-full flex items-center justify-center">
                      <CoverLetterContainer 
                        ref={setLetterRef(letter.id)} 
                        data-template-type="standard"
                        className="transform md:scale-100 scale-[0.4]"
                      >
                        <CoverLetterTemplate 
                          data={letter}
                          ai_data={letter.ai_data}
                          isPdfPreview={false}
                        />
                      </CoverLetterContainer>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-2 flex justify-between items-center mt-4">
                  <button
                    onClick={() => handleDownloadPDF(letter)}
                    disabled={isDownloading === letter.id}
                    className="flex items-center text-blue-500 hover:text-blue-600"
                  >
                    {isDownloading === letter.id ? (
                      <Loader2 className="w-8 h-8 animate-spin" /> 
                    ) : (
                      <Download className="w-8 h-8" /> 
                    )}
                  </button>
                  <Link
                    href={`/edit-cover-letter/${letter.id}`}
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
    </>
  );
}