// app/edit-cover-letter/[id]/page.tsx - ✅ FINAL: Doc#3 tyyli + Popup + Vapaa tekstieditori
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, AlignLeft, Palette, Edit3, X,
  RotateCcw, Undo
} from 'lucide-react';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetter {
  id: string;
  user_id: string;
  title: string;
  content: any;
  ai_data: any;
  created_at: string;
  updated_at: string;
}

interface StyleSettings {
  fontSize: number;
  lineHeight: number;
  padding: number;
  headerColor: string;
  headerLayout: 'top' | 'left';
  sidebarContent: 'contact' | 'highlights' | 'none';
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // ✅ POPUP EDIT MODE
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ✅ VAPAA TEKSTIEDITORI (ei kappalejakoa)
  const [editedContent, setEditedContent] = useState('');
  const [originalContent, setOriginalContent] = useState(''); // Peruutusta varten
  
  // ✅ UNDO HISTORY
  const [undoHistory, setUndoHistory] = useState<string[]>([]);
  const [undoIndex, setUndoIndex] = useState(-1);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    fontSize: 11,
    lineHeight: 1.8,
    padding: 50,
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
  });

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!userId || !id) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');

        const response = await fetch(`/api/cover-letters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load cover letter');
        }

        const { coverLetter: data } = await response.json();
        
        if (data) {
          setLetterData(data);
          const content = data.content?.body || data.ai_data?.html?.content || '';
          setEditedContent(content);
          setOriginalContent(content);
          
          // Load saved styles
          if (data.content?.headerColor) {
            setStyleSettings((prev) => ({ ...prev, headerColor: data.content.headerColor }));
          }
          if (data.content?.headerLayout) {
            setStyleSettings((prev) => ({ ...prev, headerLayout: data.content.headerLayout }));
          }
          if (data.content?.sidebarContent) {
            setStyleSettings((prev) => ({ ...prev, sidebarContent: data.content.sidebarContent }));
          }
          if (data.content?.fontSize) {
            setStyleSettings((prev) => ({ ...prev, fontSize: data.content.fontSize }));
          }
          if (data.content?.lineHeight) {
            setStyleSettings((prev) => ({ ...prev, lineHeight: data.content.lineHeight }));
          }
          if (data.content?.padding) {
            setStyleSettings((prev) => ({ ...prev, padding: data.content.padding }));
          }
        } else {
          setErrorMessage('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('Error loading cover letter:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Hakukirjeen lataaminen epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId, getToken]);

  // ✅ UNDO FUNCTIONALITY
  const handleContentChange = (newContent: string) => {
    // Lisää nykyinen sisältö undo-historiaan
    if (undoIndex === -1 || undoHistory[undoIndex] !== editedContent) {
      const newHistory = undoHistory.slice(0, undoIndex + 1);
      newHistory.push(editedContent);
      setUndoHistory(newHistory);
      setUndoIndex(newHistory.length - 1);
    }
    
    setEditedContent(newContent);
  };

  const handleUndo = () => {
    if (undoIndex > 0) {
      setUndoIndex(undoIndex - 1);
      setEditedContent(undoHistory[undoIndex - 1]);
    } else if (originalContent !== editedContent) {
      setEditedContent(originalContent);
    }
  };

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: {
            ...letterData.content,
            body: editedContent,
            headerColor: styleSettings.headerColor,
            headerLayout: styleSettings.headerLayout,
            sidebarContent: styleSettings.sidebarContent,
            fontSize: styleSettings.fontSize,
            lineHeight: styleSettings.lineHeight,
            padding: styleSettings.padding,
          },
          ai_data: {
            ...letterData.ai_data,
            html: {
              ...letterData.ai_data?.html,
              content: editedContent,
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const updated = await response.json();
      setLetterData(updated);
      setOriginalContent(editedContent); // Päivitä alkuperäinen
      setUndoHistory([]); // Tyhjennä historia tallennuksen jälkeen
      setUndoIndex(-1);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setShowEditModal(false);
    } catch (error) {
      console.error('Save error:', error);
      setErrorMessage('Tallennus epäonnistui');
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (confirm('Hylätäänkö tallentamattomat muutokset?')) {
      setEditedContent(originalContent);
      setUndoHistory([]);
      setUndoIndex(-1);
      setShowEditModal(false);
    }
  };

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
      a.download = `hakukirje_${letterData?.title || 'document'}.pdf`;
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

  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän hakukirjeen?')) return;
    
    setIsDeleting(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
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

  const handleResetStyles = () => {
    setStyleSettings({
      fontSize: 11,
      lineHeight: 1.8,
      padding: 50,
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
    });
  };

  // ✅ KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && showEditModal) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && showEditModal) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showEditModal, undoIndex, undoHistory]);

  // --- LOADING STATE ---
  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/20 to-amber-500/20 blur-3xl rounded-full"></div>
          <div className="relative backdrop-blur-2xl bg-slate-900/80 border border-slate-700/50 rounded-3xl shadow-2xl p-12 text-center">
            <div className="relative">
              <Loader2 className="w-16 h-16 animate-spin text-orange-400 mx-auto mb-6" />
              <div className="absolute inset-0 bg-orange-400/20 blur-2xl rounded-full"></div>
            </div>
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

  const coverLetterData = {
    name: letterData.content?.contactInfo?.name || letterData.ai_data?.name || 'Hakija',
    email: letterData.content?.contactInfo?.email || letterData.ai_data?.email || '',
    phone: letterData.content?.contactInfo?.phone || letterData.ai_data?.phone || '',
    location: letterData.content?.contactInfo?.location || letterData.ai_data?.location || '',
    jobTitle: letterData.content?.job_title || '',
    companyName: letterData.content?.company_name || '',
    title: letterData.title,
    content: editedContent,
    keyHighlights: letterData.ai_data?.key_highlights || [],
    language: letterData.content?.language || 'finnish',
    style: (letterData.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
    headerColor: styleSettings.headerColor,
    headerLayout: styleSettings.headerLayout,
    sidebarContent: styleSettings.sidebarContent,
    fontSize: styleSettings.fontSize,
    lineHeight: styleSettings.lineHeight,
    padding: styleSettings.padding,
  };

  // --- MAIN RENDER ---
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans text-slate-100 relative overflow-hidden">
      
      {/* ANIMATED BACKGROUND */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/8 to-slate-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-br from-amber-500/8 to-orange-600/8 rounded-full blur-3xl animate-pulse" style={{animationDelay: '3s'}}></div>
      </div>

      {/* TOP BAR */}
      <div className="px-4 md:px-8 py-4 mt-20 sticky top-20 z-40">
        <div className="max-w-[1400px] mx-auto backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl shadow-2xl p-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all duration-300 flex-shrink-0 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-orange-400 relative z-10 transition-colors" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  {letterData.title || 'Nimetön hakukirje'}
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={() => setShowEditModal(true)}
                className="group relative px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-amber-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <div className="relative flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </div>
              </button>
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all overflow-hidden"
                title="Lataa PDF"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                {isDownloading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-orange-400 relative z-10" />
                ) : (
                  <Download className="w-5 h-5 text-slate-300 group-hover:text-blue-400 relative z-10 transition-colors" />
                )}
              </button>
              
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="group relative p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-red-500/20 hover:border-red-500/50 transition-all overflow-hidden"
                title="Poista hakukirje"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-red-400 relative z-10" />
                ) : (
                  <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-red-400 relative z-10 transition-colors" />
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

      {/* ✅ EDIT POPUP MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-6xl max-h-[90vh] backdrop-blur-2xl bg-slate-900/95 border border-slate-700/50 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-amber-400 bg-clip-text text-transparent">
                Muokkaustila
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUndo}
                  disabled={undoIndex <= 0 && editedContent === originalContent}
                  className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all disabled:opacity-30"
                  title="Peruuta (Ctrl+Z)"
                >
                  <Undo className="w-5 h-5 text-slate-300" />
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                >
                  <X className="w-5 h-5 text-slate-300" />
                </button>
              </div>
            </div>

            {/* Modal Body - TWO COLUMNS */}
            <div className="flex-1 overflow-hidden flex">
              
              {/* LEFT: Text Editor */}
              <div className="flex-1 p-6 overflow-y-auto border-r border-slate-700/50">
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <AlignLeft className="w-5 h-5 text-orange-400" />
                  Sisältö
                </h3>
                <textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-[500px] p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-100 focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all resize-none font-serif"
                  style={{
                    fontSize: `${styleSettings.fontSize}pt`,
                    lineHeight: styleSettings.lineHeight,
                  }}
                  placeholder="Kirjoita hakukirjeen sisältö tähän..."
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Vinkki: Käytä Ctrl+Z peruuttaaksesi muutoksia
                </p>
              </div>

              {/* RIGHT: Style Controls */}
              <div className="w-80 p-6 overflow-y-auto bg-slate-900/50">
                <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
                  <Type className="w-5 h-5 text-orange-400" />
                  Muotoilu
                </h3>

                <div className="space-y-6">
                  {/* Font Size */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">
                      Fonttikoko: {styleSettings.fontSize}pt
                    </label>
                    <input
                      type="range"
                      min="9"
                      max="14"
                      step="0.5"
                      value={styleSettings.fontSize}
                      onChange={(e) => setStyleSettings((prev) => ({ ...prev, fontSize: parseFloat(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </div>

                  {/* Line Height */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">
                      Riviväli: {styleSettings.lineHeight.toFixed(1)}
                    </label>
                    <input
                      type="range"
                      min="1.4"
                      max="2.0"
                      step="0.1"
                      value={styleSettings.lineHeight}
                      onChange={(e) => setStyleSettings((prev) => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </div>

                  {/* Padding */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">
                      Marginaalit: {styleSettings.padding}px
                    </label>
                    <input
                      type="range"
                      min="30"
                      max="70"
                      step="5"
                      value={styleSettings.padding}
                      onChange={(e) => setStyleSettings((prev) => ({ ...prev, padding: parseInt(e.target.value) }))}
                      className="w-full accent-orange-500"
                    />
                  </div>

                  {/* Header Color */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">Header-väri</label>
                    <input
                      type="color"
                      value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                      onChange={(e) => setStyleSettings((prev) => ({ ...prev, headerColor: e.target.value }))}
                      className="w-full h-10 rounded-lg border border-slate-700 bg-slate-800 cursor-pointer"
                    />
                  </div>

                  {/* Layout */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">Layout</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'top' }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          styleSettings.headerLayout === 'top'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Vaaka
                      </button>
                      <button
                        onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'left' }))}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          styleSettings.headerLayout === 'left'
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Pysty
                      </button>
                    </div>
                  </div>

                  {/* Sidebar Content */}
                  <div>
                    <label className="text-sm font-bold text-slate-300 mb-2 block">Sisältö</label>
                    <div className="flex gap-2">
                      {[
                        { value: 'contact', label: 'Yhteys' },
                        { value: 'highlights', label: 'Vahv.' },
                        { value: 'none', label: 'Tyhjä' }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => setStyleSettings((prev) => ({ ...prev, sidebarContent: value as any }))}
                          className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all ${
                            styleSettings.sidebarContent === value
                              ? 'bg-orange-500 text-white'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reset */}
                  <button
                    onClick={handleResetStyles}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-xl text-sm font-semibold text-slate-300 hover:bg-slate-700/50 transition-all flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Palauta oletukset
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700/50 bg-slate-900/50">
              <button
                onClick={handleCancelEdit}
                className="px-6 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700/50 transition-all font-semibold"
              >
                Älä tallenna
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 disabled:opacity-50 transition-all"
              >
                {isSaving ? (
                  <><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Tallennetaan...</>
                ) : (
                  <><Save className="w-4 h-4 inline mr-2" /> Tallenna</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW */}
      <div className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 relative z-10">
        <div className="backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-3xl shadow-2xl p-8 overflow-hidden">
          <div className="overflow-x-auto pb-6 flex justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50">
            <div className="transform scale-[0.75] origin-top py-8">
              <CoverLetterContainer
                data-template-type="standard"
                className="shadow-2xl bg-white"
              >
                <CoverLetterTemplate 
                  data={coverLetterData} 
                  isPdfPreview={false} 
                  isEditing={false} 
                />
              </CoverLetterContainer>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
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