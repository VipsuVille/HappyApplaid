// app/edit-cover-letter/[id]/page.tsx - ✅ TÄYSIN KORJATTU
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, AlignLeft, Palette, Eye, Edit3,
  GripVertical, Plus, Minus, RotateCcw
} from 'lucide-react';

// ✅ KÄYTÄ OIKEAA TEMPLATEA
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetterData {
  id: string;
  user_id: string;
  title: string;
  language: string;
  content: {
    body: string;
    signature?: string;
    contactInfo?: {
      name: string;
      email: string;
      phone: string;
      location: string;
    };
  };
  ai_data?: {
    style?: 'professional' | 'casual' | 'creative';
    key_highlights?: string[];
    name?: string; // Fallback jos contactInfo puuttuu
    email?: string;
    phone?: string;
    location?: string;
  };
  created_at: string;
  updated_at: string;
}

interface StyleSettings {
  headerColor: string; // ✅ UUSI: Harmaan laatikon väri
  headerLayout: 'top' | 'left'; // ✅ UUSI: Layout vaihto
  fontSize: number;
  lineHeight: number;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { userId } = useAuth();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetterData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingParagraph, setEditingParagraph] = useState<number | null>(null);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: '#E8E6E1', // ✅ Default harmaa
    headerLayout: 'top', // ✅ Default ylhäällä
    fontSize: 11,
    lineHeight: 1.8,
  });

  const [paragraphs, setParagraphs] = useState<string[]>([]);

  useEffect(() => {
    if (letterData?.content?.body) {
      setParagraphs(letterData.content.body.split('\n\n').filter(p => p.trim()));
    }
  }, [letterData?.content?.body]);

  // ✅ LOAD DATA
  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!userId || !id) {
        console.log('⏭️ Missing userId or id');
        setIsLoading(false);
        return;
      }

      try {
        console.log(`🔍 Loading cover letter: ${id}`);

        const response = await fetch(`/api/cover-letters/${id}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load');
        }

        const { coverLetter: data } = await response.json();
        
        if (data) {
          console.log('✅ Cover letter loaded:', data.title);
          setLetterData(data);
        } else {
          setErrorMessage('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('❌ Error loading:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Lataus epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId]);

  // ✅ HANDLERS
  const handleParagraphChange = (index: number, value: string) => {
    const newParagraphs = [...paragraphs];
    newParagraphs[index] = value;
    setParagraphs(newParagraphs);
  };

  const handleParagraphDelete = (index: number) => {
    setParagraphs(paragraphs.filter((_, i) => i !== index));
  };

  const handleParagraphAdd = (index: number) => {
    const newParagraphs = [...paragraphs];
    newParagraphs.splice(index + 1, 0, '');
    setParagraphs(newParagraphs);
    setEditingParagraph(index + 1);
  };

  const handleParagraphMove = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === paragraphs.length - 1) return;

    const newParagraphs = [...paragraphs];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newParagraphs[index], newParagraphs[targetIndex]] = [newParagraphs[targetIndex], newParagraphs[index]];
    setParagraphs(newParagraphs);
  };

  const handleStyleChange = (setting: keyof StyleSettings, value: any) => {
    setStyleSettings(prev => ({ ...prev, [setting]: value }));
  };

  const handleResetStyles = () => {
    setStyleSettings({
      headerColor: '#E8E6E1',
      headerLayout: 'top',
      fontSize: 11,
      lineHeight: 1.8,
    });
  };

  // ✅ SAVE
  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const updatedContent = {
        ...letterData.content,
        body: paragraphs.join('\n\n'),
      };

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: letterData.title,
          content: updatedContent,
          updated_at: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const updated = await response.json();

      setLetterData(updated);
      setSuccessMessage('✅ Tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditing(false);
      setEditingParagraph(null);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Tallennus epäonnistui');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ DOWNLOAD PDF
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: id }),
      });

      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Hakukirje_${letterData?.title || 'document'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('PDF error:', error);
      alert('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  // ✅ DELETE
  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
      
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  // --- LOADING STATE ---
  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl rounded-full"></div>
          <div className="relative backdrop-blur-2xl bg-slate-900/80 border border-slate-700/50 rounded-3xl shadow-2xl p-12 text-center">
            <Loader2 className="w-16 h-16 animate-spin text-orange-400 mx-auto mb-6" />
            <p className="text-xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
              {errorMessage || 'Ladataan hakukirjettä...'}
            </p>
            {errorMessage && (
              <button
                onClick={() => router.push('/my-cover-letters')}
                className="mt-6 px-6 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-700 transition-all"
              >
                ← Takaisin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ✅ KORJATTU DATA-MAPPING (sama kuin my-cover-letters)
  const coverLetterData = {
    name: letterData.content?.contactInfo?.name || letterData.ai_data?.name || "Hakija",
    email: letterData.content?.contactInfo?.email || letterData.ai_data?.email || "",
    phone: letterData.content?.contactInfo?.phone || letterData.ai_data?.phone || "",
    location: letterData.content?.contactInfo?.location || letterData.ai_data?.location || "",
    jobTitle: "",
    companyName: "",
    title: letterData.title,
    content: paragraphs.join('\n\n'), // ✅ Live-päivitys
    keyHighlights: letterData.ai_data?.key_highlights || [],
    language: letterData.language || 'finnish',
    style: (letterData.ai_data?.style || 'professional') as 'professional' | 'casual' | 'creative',
    
    // ✅ LISÄÄ UUDET ASETUKSET
    headerColor: styleSettings.headerColor,
    headerLayout: styleSettings.headerLayout,
  };

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans text-slate-100 relative overflow-hidden">
      
      {/* ANIMATED BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/8 to-slate-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* TOP BAR */}
      <div className="px-4 md:px-8 py-4 mt-20 sticky top-20 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-orange-400 transition-colors" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  {letterData.title || 'Nimetön hakukirje'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <div className="relative flex items-center gap-2">
                    <Edit3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Muokkaa</span>
                  </div>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditingParagraph(null);
                    }}
                    className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all font-semibold flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="group relative px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                  >
                    <div className="relative flex items-center gap-2">
                      {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      <span className="hidden sm:inline">Tallenna</span>
                    </div>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                title="Lataa PDF"
              >
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                ) : (
                  <Download className="w-5 h-5 text-slate-300 group-hover:text-blue-400 transition-colors" />
                )}
              </button>
              
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all"
                title="Poista"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                ) : (
                  <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-400 transition-colors" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-green-500/20 border border-green-400/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <p className="font-bold text-green-100">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-2xl shadow-2xl p-4 flex items-center gap-3">
            <p className="font-bold text-red-100">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT SIDEBAR - STYLE CONTROLS */}
          {isEditing && (
            <div className="lg:col-span-3 space-y-6">
              
              {/* ✅ UUSI: Header Customization */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-purple-400" />
                  Header Asetukset
                </h3>
                
                <div className="space-y-4">
                  {/* Värinvalitsin */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      Taustaväri
                    </label>
                    <input
                      type="color"
                      value={styleSettings.headerColor}
                      onChange={(e) => handleStyleChange('headerColor', e.target.value)}
                      className="w-full h-12 rounded-lg cursor-pointer"
                    />
                    <p className="text-xs text-gray-500 mt-1">{styleSettings.headerColor}</p>
                  </div>

                  {/* Layout toggle */}
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      Layout
                    </label>
                    <select
                      value={styleSettings.headerLayout}
                      onChange={(e) => handleStyleChange('headerLayout', e.target.value as 'top' | 'left')}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 focus:outline-none focus:border-orange-500/50"
                    >
                      <option value="top">Ylhäällä (vaaka)</option>
                      <option value="left">Vasemmalla (pysty)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-slate-100 mb-4">Pika-toiminnot</h3>
                <button 
                  onClick={handleResetStyles}
                  className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-all flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Palauta oletusarvot
                </button>
              </div>

            </div>
          )}

          {/* CENTER: COVER LETTER PREVIEW */}
          <div className={isEditing ? "lg:col-span-9" : "lg:col-span-12"}>
            <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-3xl shadow-2xl p-8 overflow-hidden">
              <div className="overflow-x-auto overflow-y-auto pb-6 custom-scrollbar flex justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50 inner-shadow max-h-[80vh]">
                
                {/* ✅ KÄYTÄ OIKEAA TEMPLATEA + KORJATTU SKAALAUS */}
                <div className="transform lg:scale-[0.85] md:scale-[0.6] scale-[0.35] origin-top min-w-[210mm] min-h-[297mm]">
                  <CoverLetterContainer
                    data-template-type="standard"
                    className="shadow-2xl bg-white mt-6 mb-6"
                  >
                    <CoverLetterTemplate
                      data={coverLetterData}
                      isPdfPreview={false}
                      isEditing={false}
                    />
                  </CoverLetterContainer>
                </div>

              </div>

              {/* ✅ MUOKKAUS-UI */}
              {isEditing && (
                <div className="mt-8 p-6 bg-slate-800/30 border border-slate-700/50 rounded-2xl">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-400" />
                    Muokkaa tekstiä
                  </h3>
                  
                  <div className="space-y-4">
                    {paragraphs.map((paragraph, index) => (
                      <div key={index} className="relative group">
                        
                        {/* Toiminnot */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-400">Kappale {index + 1}</span>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleParagraphMove(index, 'up')}
                              disabled={index === 0}
                              className="p-1 bg-slate-700 rounded hover:bg-slate-600 disabled:opacity-30"
                              title="Siirrä ylös"
                            >
                              <GripVertical className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => handleParagraphAdd(index)}
                              className="p-1 bg-green-600 rounded hover:bg-green-700"
                              title="Lisää kappale"
                            >
                              <Plus className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => handleParagraphDelete(index)}
                              className="p-1 bg-red-600 rounded hover:bg-red-700"
                              title="Poista"
                            >
                              <Minus className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Textarea */}
                        <textarea
                          value={paragraph}
                          onChange={(e) => handleParagraphChange(index, e.target.value)}
                          className="w-full p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-orange-500/50 resize-none min-h-[100px]"
                          placeholder="Kirjoita kappale..."
                        />
                      </div>
                    ))}
                    
                    {/* Lisää uusi kappale */}
                    <button
                      onClick={() => {
                        setParagraphs([...paragraphs, '']);
                        setEditingParagraph(paragraphs.length);
                      }}
                      className="w-full py-3 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:border-orange-500/50 hover:text-orange-400 transition-all flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Lisää uusi kappale
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 4px;
        }
        .inner-shadow {
          box-shadow: inset 0 0 30px rgba(0,0,0,0.3);
        }
        @keyframes slide-in-right {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}