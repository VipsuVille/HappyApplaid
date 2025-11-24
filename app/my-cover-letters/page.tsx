// app/my-cover-letters/page.tsx - PÄIVITETTY ATS-PAINIKKEELLA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import { Edit, Trash2, FileText, Download, Loader2, Sparkles, TrendingUp, Zap } from 'lucide-react';
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

// Korvaa handleDownloadPDF funktio tällä versiolla

// app/my-cover-letters/page.tsx
// ✅ YKSINKERTAINEN RATKAISU: Kopioi DOM → PDF

const handleDownloadPDF = async (letter: any) => {
  setIsDownloading(letter.id);
  try {
    // 1️⃣ HAE RENDERÖITY ELEMENTTI
    const letterElement = letterRefs.current[letter.id];
    
    if (!letterElement) {
      throw new Error('Elementtiä ei löytynyt');
    }

    // 2️⃣ KLOONAA ELEMENTTI (jotta emme muuta näkyvää versiota)
    const clonedElement = letterElement.cloneNode(true) as HTMLElement;

    // 3️⃣ LUO HTML joka sisältää:
    // - Kaikki fontit
    // - Kaikki Tailwind CSS:t
    // - Renderöidyn sisällön
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          
          <!-- ✅ FONTIT -->
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Merriweather:wght@300;400;700&display=swap" rel="stylesheet">
          
          <!-- ✅ TAILWIND CSS (CDN) -->
          <script src="https://cdn.tailwindcss.com"></script>
          
          <style>
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
              padding: 0;
              width: 210mm;
              min-height: 297mm;
              background: white;
            }

            /* ✅ Kopioi kaikki tärkeät tyylit komponentin CSS:stä */
            .cover-letter-container {
              width: 210mm;
              min-height: 297mm;
              background-color: white;
              position: relative;
              overflow: hidden;
            }

            .cover-letter-accent {
              position: absolute;
              top: 0;
              left: 0;
              width: 12px;
              height: 100%;
              background: linear-gradient(to bottom, #3498db, #2980b9, #3498db);
              box-shadow: inset -1px 0 3px rgba(0,0,0,0.1);
            }

            .cover-letter-top-accent {
              position: absolute;
              top: 0;
              left: 12px;
              right: 0;
              height: 8px;
              background: linear-gradient(to right, #3498db, #ede7f6);
              opacity: 0.7;
            }

            /* ✅ Sisältöalueen tyyli */
            [style*="margin-left: 20px"] {
              margin-left: 20px;
              width: calc(100% - 20px);
              padding-top: 12px;
            }

            /* ✅ Template-tyylit */
            .cover-letter-template {
              font-family: 'Merriweather', serif;
              color: #333;
              line-height: 1.7;
            }

            .cover-letter-content h1 {
              color: #2c3e50;
              border-bottom: 3px solid #3498db;
              padding-bottom: 12px;
              margin-bottom: 30px;
              font-weight: 700;
              font-size: 24px;
              letter-spacing: 0.5px;
            }

            .cover-letter-content p {
              margin-bottom: 16px;
              line-height: 1.7;
              font-size: 11pt;
              letter-spacing: 0.2px;
            }

            .signature-section {
              margin-top: 50px;
            }

            .signature-line {
              border-bottom: 2px solid #3498db;
              width: 230px;
              margin: 8px 0 12px 0;
            }

            .signature-text {
              font-family: 'Dancing Script', cursive;
              font-size: 24px;
              color: #2c3e50;
              font-weight: 600;
            }

            /* ✅ Padding sisällölle */
            .cover-letter-template > div {
              padding: 20mm;
            }
          </style>
        </head>
        <body>
          ${clonedElement.outerHTML}
        </body>
      </html>
    `;

    // 4️⃣ LÄHETÄ PDF-GENEROINTIIN
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
      throw new Error(errorData.error || 'PDF generation failed');
    }

    // 5️⃣ LATAA PDF
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const smartTitle = generateSmartTitle(
      letter.content?.job_description,
      letter.title
    );
    const displayTitle = editedTitles[letter.id] || letter.title || smartTitle;
    const applicantName = letter.content?.applicant_info?.name || user?.fullName || 'Hakija';
    
    a.download = `hakukirje_${displayTitle.substring(0, 30)}_${applicantName.replace(/\s+/g, '_')}.pdf`;
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    
    console.log('✅ PDF ladattu onnistuneesti');
  } catch (error) {
    console.error('PDF-generointi epäonnistui:', error);
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
<div className="w-full lg:w-3/5 mx-auto mb-4 md:inline-block md:ml-64 pt-4">
<div className="flex justify-between items-center mb-6 mt-10 w-full">
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
          const smartTitle = generateSmartTitle(letter.content?.job_description, letter.title);
          const displayTitle = editedTitles[letter.id] || letter.title || smartTitle;
          const isEditingTitle = editingTitleId === letter.id;
          
          // ✅ TARKISTA ONKO ATS-OPTIMOITU
          const isATSOptimized = !!letter.ai_data?.ats_optimization;
          const atsScore = letter.ai_data?.ats_optimization?.report?.keyword_match_score || 0;
          const needsATSImprovement = isATSOptimized && atsScore > 0 && atsScore < 75;

          return (
            <div key={letter.id} className="m-4 rounded-lg p-4 shadow-lg relative group">
              {/* Title Section */}
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-semibold">{displayTitle}</h2>
                  
                  <div className="flex items-center gap-2">
                    {/* ✅ ATS-OPTIMOITU MERKKI */}
                    {isATSOptimized ? (
                      <div className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-purple-100 to-blue-100 border border-purple-300 rounded-full">
                        <Zap className="w-3 h-3 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">
                          ATS-optimoitu
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-3 py-1 bg-gray-100 border border-gray-300 rounded-full">
                        <Sparkles className="w-3 h-3 text-gray-600" />
                        <span className="text-xs font-semibold text-gray-700">
                          Ei Ats optimoitu
                        </span>
                      </div>
                    )}

                    {/* ✅ ATS-PISTEET (jos optimoitu) */}
                    {isATSOptimized && atsScore > 0 && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                        atsScore >= 75 
                          ? 'bg-green-100 text-green-700' 
                          : atsScore >= 50 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                      }`}>
                        <TrendingUp className="w-3 h-3" />
                        {atsScore}%
                      </div>
                    )}
                  </div>
                </div>
                
                <p className="text-gray-600 text-sm">
                  Luotu: {new Date(letter.created_at).toLocaleDateString('fi-FI')}
                </p>
              </div>

              {/* ✅ ATS-PARANNUS NAPPI (vain ATS-optimoiduille) */}
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
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm disabled:opacity-50"
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