// app/edit-cover-letter/[id]/page.tsx - ✅ WYSIWYG: Word-tyylinen inline editing
'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, Palette, Edit3, Undo, RotateCcw, X, Eye
} from 'lucide-react';

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
  nameFontSize: number;
  contentFontSize: number;
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
  
  const [isEditMode, setIsEditMode] = useState(false);
  const [showStylePanel, setShowStylePanel] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ✅ EDITABLE FIELDS
  const [editedName, setEditedName] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  
  // ✅ ACTIVE EDITING
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);
  
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    nameFontSize: 48,
    contentFontSize: 11,
    lineHeight: 1.8,
    padding: 50,
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

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
          const name = data.content?.contactInfo?.name || data.ai_data?.name || 'Hakija';
          const content = data.content?.body || data.ai_data?.html?.content || '';
          
          setEditedName(name);
          setEditedContent(content);
          setOriginalName(name);
          setOriginalContent(content);
          
          // Load saved styles
          if (data.content?.nameFontSize) {
            setStyleSettings((prev) => ({ ...prev, nameFontSize: data.content.nameFontSize }));
          }
          if (data.content?.contentFontSize) {
            setStyleSettings((prev) => ({ ...prev, contentFontSize: data.content.contentFontSize }));
          }
          if (data.content?.headerColor) {
            setStyleSettings((prev) => ({ ...prev, headerColor: data.content.headerColor }));
          }
          if (data.content?.headerLayout) {
            setStyleSettings((prev) => ({ ...prev, headerLayout: data.content.headerLayout }));
          }
          if (data.content?.sidebarContent) {
            setStyleSettings((prev) => ({ ...prev, sidebarContent: data.content.sidebarContent }));
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
            contactInfo: {
              ...letterData.content?.contactInfo,
              name: editedName,
            },
            body: editedContent,
            nameFontSize: styleSettings.nameFontSize,
            contentFontSize: styleSettings.contentFontSize,
            headerColor: styleSettings.headerColor,
            headerLayout: styleSettings.headerLayout,
            sidebarContent: styleSettings.sidebarContent,
            lineHeight: styleSettings.lineHeight,
            padding: styleSettings.padding,
          },
          ai_data: {
            ...letterData.ai_data,
            name: editedName,
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
      setOriginalName(editedName);
      setOriginalContent(editedContent);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditMode(false);
      setIsEditingName(false);
      setIsEditingContent(false);
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
      setEditedName(originalName);
      setEditedContent(originalContent);
      setIsEditMode(false);
      setIsEditingName(false);
      setIsEditingContent(false);
      setShowStylePanel(false);
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
      nameFontSize: 48,
      contentFontSize: 11,
      lineHeight: 1.8,
      padding: 50,
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
    });
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

  const today = new Date().toLocaleDateString('fi-FI', { year: 'numeric', month: 'long', day: 'numeric' });

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
            
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="group p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
              >
                <ArrowLeft className="w-5 h-5 text-slate-300 group-hover:text-orange-400" />
              </button>
              
              <div>
                <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent">
                  {isEditMode ? 'Muokkaustila' : 'Esikatselu'}
                </h1>
                <p className="text-sm text-slate-400">{letterData.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                    title="Lataa PDF"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-orange-400" />
                    ) : (
                      <Download className="w-5 h-5 text-slate-300" />
                    )}
                  </button>
                  
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-red-500/20 transition-all"
                    title="Poista"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-5 h-5 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-5 h-5 text-slate-400" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsEditMode(true);
                      setShowStylePanel(true);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg transition-all"
                  >
                    <Edit3 className="w-4 h-4 inline mr-2" />
                    Muokkaa
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowStylePanel(!showStylePanel)}
                    className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                    title="Muotoilu"
                  >
                    <Type className="w-5 h-5 text-slate-300" />
                  </button>
                  
                  <button 
                    onClick={handleCancelEdit}
                    className="px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700/50 transition-all font-semibold"
                  >
                    <X className="w-4 h-4 inline mr-2" />
                    Peruuta
                  </button>
                  
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> Tallennetaan...</>
                    ) : (
                      <><Save className="w-4 h-4 inline mr-2" /> Tallenna</>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-green-500/20 border border-green-400/30 rounded-2xl shadow-2xl p-4">
            <p className="font-bold text-green-100">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-32 right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-2xl shadow-2xl p-4">
            <p className="font-bold text-red-100">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-8 relative z-10">
        <div className="flex gap-6">
          
          {/* ✅ FLOATING STYLE PANEL (kun edit mode ON) */}
          {isEditMode && showStylePanel && (
            <div className="w-80 backdrop-blur-2xl bg-slate-900/80 border border-slate-700/50 rounded-2xl shadow-2xl p-6 h-fit sticky top-40">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Type className="w-5 h-5 text-orange-400" />
                  Muotoilu
                </h3>
                <button
                  onClick={() => setShowStylePanel(false)}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Nimen koko */}
                <div>
                  <label className="text-sm font-bold text-slate-300 mb-2 block">
                    Nimen koko: {styleSettings.nameFontSize}px
                  </label>
                  <input
                    type="range"
                    min="32"
                    max="64"
                    value={styleSettings.nameFontSize}
                    onChange={(e) => setStyleSettings((prev) => ({ ...prev, nameFontSize: parseInt(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                </div>

                {/* Sisällön koko */}
                <div>
                  <label className="text-sm font-bold text-slate-300 mb-2 block">
                    Tekstin koko: {styleSettings.contentFontSize}pt
                  </label>
                  <input
                    type="range"
                    min="9"
                    max="14"
                    step="0.5"
                    value={styleSettings.contentFontSize}
                    onChange={(e) => setStyleSettings((prev) => ({ ...prev, contentFontSize: parseFloat(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                </div>

                {/* Riviväli */}
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

                {/* Marginaalit */}
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

                {/* Header väri */}
                <div>
                  <label className="text-sm font-bold text-slate-300 mb-2 block">Header-väri</label>
                  <input
                    type="color"
                    value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                    onChange={(e) => setStyleSettings((prev) => ({ ...prev, headerColor: e.target.value }))}
                    className="w-full h-10 rounded-lg cursor-pointer"
                  />
                </div>

                {/* Layout */}
                <div>
                  <label className="text-sm font-bold text-slate-300 mb-2 block">Layout</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'top' }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${
                        styleSettings.headerLayout === 'top'
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Vaaka
                    </button>
                    <button
                      onClick={() => setStyleSettings((prev) => ({ ...prev, headerLayout: 'left' }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${
                        styleSettings.headerLayout === 'left'
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      Pysty
                    </button>
                  </div>
                </div>

                {/* Sidebar sisältö */}
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
                        className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold ${
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
          )}

          {/* ✅ PREVIEW - WYSIWYG INLINE EDITING */}
          <div className="flex-1 backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-3xl shadow-2xl p-8 overflow-hidden">
            {isEditMode && (
              <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-sm text-orange-300">
                  💡 <strong>Klikkaa tekstiä muokataksesi sitä</strong> - Toimii kuin Word!
                </p>
              </div>
            )}
            
            <div className="overflow-x-auto flex justify-center bg-slate-950/30 rounded-2xl border border-slate-800/50">
              <div className="transform scale-[0.75] origin-top py-8">
                <div 
                  className="bg-white shadow-2xl"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    padding: `${styleSettings.padding}px`,
                    fontFamily: "'Merriweather', serif",
                    color: '#1a202c',
                  }}
                >
                  {/* ✅ HEADER - INLINE EDITABLE NAME */}
                  <div 
                    className="mb-8 p-6 rounded-lg"
                    style={{ backgroundColor: styleSettings.headerColor }}
                  >
                    {isEditMode && isEditingName ? (
                      <input
                        ref={nameInputRef}
                        type="text"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        onBlur={() => setIsEditingName(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                        className="w-full bg-white/50 border-2 border-orange-500 rounded px-2 py-1 font-bold outline-none"
                        style={{ fontSize: `${styleSettings.nameFontSize}px`, color: '#1a202c' }}
                        autoFocus
                      />
                    ) : (
                      <h1
                        onClick={() => isEditMode && setIsEditingName(true)}
                        className={isEditMode ? 'cursor-pointer hover:bg-white/20 rounded px-2 py-1 transition-colors' : ''}
                        style={{ fontSize: `${styleSettings.nameFontSize}px`, fontWeight: 'bold', color: '#1a202c' }}
                      >
                        {editedName}
                      </h1>
                    )}
                    
                    <div className="flex flex-wrap gap-4 text-sm mt-2" style={{ color: '#4a5568' }}>
                      {letterData.content?.contactInfo?.email && <span>📧 {letterData.content.contactInfo.email}</span>}
                      {letterData.content?.contactInfo?.phone && <span>📞 {letterData.content.contactInfo.phone}</span>}
                      {letterData.content?.contactInfo?.location && <span>📍 {letterData.content.contactInfo.location}</span>}
                    </div>
                  </div>

                  {/* DATE */}
                  <div className="mb-6 text-sm" style={{ color: '#4a5568' }}>
                    {today}
                  </div>

                  {/* ✅ CONTENT - INLINE EDITABLE */}
                  {isEditMode && isEditingContent ? (
                    <textarea
                      ref={contentTextareaRef}
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      onBlur={() => setIsEditingContent(false)}
                      className="w-full min-h-[500px] p-4 bg-blue-50 border-2 border-blue-500 rounded resize-none outline-none"
                      style={{
                        fontSize: `${styleSettings.contentFontSize}pt`,
                        lineHeight: styleSettings.lineHeight,
                        fontFamily: "'Merriweather', serif",
                      }}
                      autoFocus
                    />
                  ) : (
                    <div
                      onClick={() => isEditMode && setIsEditingContent(true)}
                      className={isEditMode ? 'cursor-pointer hover:bg-blue-50 p-4 rounded transition-colors min-h-[200px]' : 'min-h-[200px]'}
                      style={{
                        fontSize: `${styleSettings.contentFontSize}pt`,
                        lineHeight: styleSettings.lineHeight,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {editedContent.split('\n\n').map((paragraph, index) => (
                        <p key={index} className="mb-4" style={{ textAlign: 'justify' }}>
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* SIGNATURE */}
                  <div className="mt-12">
                    <p className="text-sm mb-2" style={{ fontStyle: 'italic', color: '#4a5568' }}>
                      Ystävällisin terveisin,
                    </p>
                    <p className="text-2xl" style={{ 
                      fontFamily: "'Brush Script MT', cursive",
                      color: '#3b82f6',
                    }}>
                      {editedName}
                    </p>
                  </div>
                </div>
              </div>
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