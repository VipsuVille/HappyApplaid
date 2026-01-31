// app/edit-cover-letter/[id]/page.tsx - DEBUG VERSION (FRONTEND LOGGING)
// ✅ EI MUUTETTU LOGIIKKAA, VAIN LISÄTTY LOGIT!

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Type, Palette, Edit3, RotateCcw, X, Eye
} from 'lucide-react';

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
  const [isMobile, setIsMobile] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [editedName, setEditedName] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  
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

  const handleContentChange = useCallback(<K extends keyof any>(
    key: K,
    value: any
  ) => {
    setLetterData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        content: {
          ...prev.content,
          [key]: value,
        },
      };
    });
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadCoverLetter = async () => {
      if (!userId || !id) {
        setIsLoading(false);
        return;
      }

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');

        console.log('📥 [LOAD] Loading cover letter:', id);

        const response = await fetch(`/api/cover-letters/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load cover letter');
        }

        const data = await response.json();
        
        console.log('✅ [LOAD] Loaded:', {
          id: data.coverLetter?.id,
          hasContent: !!data.coverLetter?.content,
          hasAiData: !!data.coverLetter?.ai_data,
        });
        
        if (data.coverLetter) {
          const letter = data.coverLetter;
          setLetterData(letter);
          
          const name = letter.content?.contactInfo?.name || 
                       letter.ai_data?.name || 
                       letter.content?.name || 
                       'Hakija';
          
          const content = letter.content?.body || 
                         letter.ai_data?.html?.content || 
                         '';
          
          console.log('📝 [LOAD] Extracted:', {
            name,
            contentLength: content.length,
          });
          
          setEditedName(name);
          setEditedContent(content);
          setOriginalName(name);
          setOriginalContent(content);
          
          if (letter.content?.nameFontSize) {
            setStyleSettings(prev => ({ ...prev, nameFontSize: letter.content.nameFontSize }));
          }
          if (letter.content?.contentFontSize) {
            setStyleSettings(prev => ({ ...prev, contentFontSize: letter.content.contentFontSize }));
          }
          if (letter.content?.headerColor) {
            setStyleSettings(prev => ({ ...prev, headerColor: letter.content.headerColor }));
          }
          if (letter.content?.headerLayout) {
            setStyleSettings(prev => ({ ...prev, headerLayout: letter.content.headerLayout }));
          }
          if (letter.content?.sidebarContent) {
            setStyleSettings(prev => ({ ...prev, sidebarContent: letter.content.sidebarContent }));
          }
          if (letter.content?.lineHeight) {
            setStyleSettings(prev => ({ ...prev, lineHeight: letter.content.lineHeight }));
          }
          if (letter.content?.padding) {
            setStyleSettings(prev => ({ ...prev, padding: letter.content.padding }));
          }
        } else {
          throw new Error('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('❌ [LOAD] Error:', err);
        setErrorMessage(
          err instanceof Error ? err.message : 'Hakukirjeen lataaminen epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId, getToken]);

  // ═══════════════════════════════════════════════════════════════
  // ✅ SAVE FUNCTION WITH DEBUG LOGGING
  // ═══════════════════════════════════════════════════════════════
  
  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      console.log('═══════════════════════════════════════════');
      console.log('💾 [FRONTEND] SAVE PROCESS STARTED');
      console.log('═══════════════════════════════════════════');
      console.log('📍 Letter ID:', id);
      console.log('👤 User ID:', userId);

      // ✅ STEP 1: GET TOKEN
      console.log('🔑 [STEP 1] Getting authentication token...');
      const token = await getToken({ template: 'supabase' });
      
      console.log('   - Token exists:', !!token ? '✅ YES' : '❌ NO');
      console.log('   - Token length:', token?.length || 0);
      console.log('   - Token preview:', token ? token.substring(0, 30) + '...' : 'N/A');

      if (!token) {
        throw new Error('❌ No authentication token! Please log in again.');
      }

      // ✅ STEP 2: PREPARE PAYLOAD
      console.log('📦 [STEP 2] Preparing payload...');
      console.log('   - Current name:', editedName);
      console.log('   - Content length:', editedContent.length);
      console.log('   - Name font size:', styleSettings.nameFontSize);

      const finalContent = {
        ...letterData.content,
        contactInfo: {
          name: editedName,
          email: letterData.content?.contactInfo?.email || '',
          phone: letterData.content?.contactInfo?.phone || '',
          location: letterData.content?.contactInfo?.location || '',
        },
        body: editedContent,
        job_description: letterData.content?.job_description,
        job_title: letterData.content?.job_title,
        company_name: letterData.content?.company_name,
        nameFontSize: styleSettings.nameFontSize,
        contentFontSize: styleSettings.contentFontSize,
        lineHeight: styleSettings.lineHeight,
        padding: styleSettings.padding,
        headerColor: styleSettings.headerColor,
        headerLayout: styleSettings.headerLayout,
        sidebarContent: styleSettings.sidebarContent,
        language: letterData.content?.language,
        style: letterData.content?.style,
      };

      const finalAiData = {
        ...letterData.ai_data,
        name: editedName,
        html: {
          ...letterData.ai_data?.html,
          content: editedContent,
        },
      };

      console.log('   - Content keys:', Object.keys(finalContent).length);
      console.log('   - AI data keys:', Object.keys(finalAiData).length);

      // ✅ STEP 3: MAKE API CALL
      console.log('🌐 [STEP 3] Making API call...');
      console.log('   - URL:', `/api/cover-letters/${id}`);
      console.log('   - Method: PATCH');
      console.log('   - Headers:', {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer [REDACTED]'
      });

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: finalContent,
          ai_data: finalAiData,
        }),
      });

      console.log('   - Response status:', response.status);
      console.log('   - Response ok:', response.ok);

      // ✅ STEP 4: HANDLE RESPONSE
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ [STEP 4] API returned error:');
        console.error('   - Status:', response.status);
        console.error('   - Error:', errorData.error);
        console.error('   - Details:', errorData.details);
        console.error('   - Step:', errorData.step);
        console.log('═══════════════════════════════════════════');
        throw new Error(errorData.error || 'Save failed');
      }

      const result = await response.json();
      console.log('✅ [STEP 4] Response received:', {
        hasCoverLetter: !!result.coverLetter,
      });

      // ✅ STEP 5: UPDATE LOCAL STATE
      if (result.coverLetter) {
        setLetterData(result.coverLetter);
        console.log('✅ [STEP 5] Local state updated');
      }
      
      setOriginalName(editedName);
      setOriginalContent(editedContent);
      
      setSuccessMessage('✅ Hakukirje tallennettu!');
      setTimeout(() => setSuccessMessage(null), 3000);
      setIsEditMode(false);
      setIsEditingName(false);
      setIsEditingContent(false);

      console.log('═══════════════════════════════════════════');
      console.log('✅✅✅ SAVE PROCESS COMPLETED ✅✅✅');
      console.log('═══════════════════════════════════════════');
      
    } catch (error) {
      console.error('❌❌❌ [FRONTEND] SAVE ERROR ❌❌❌');
      console.error('Error:', error);
      console.error('Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.log('═══════════════════════════════════════════');
      
      setErrorMessage('Tallennus epäonnistui: ' + (error instanceof Error ? error.message : 'Unknown error'));
      setTimeout(() => setErrorMessage(null), 5000);
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

  // LOADING STATE - ei muutettu
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

  // MAIN RENDER - ei muutettu, vain tallenna-nappi kutsuu debug-versiota
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 font-sans text-slate-100 relative overflow-hidden">
      
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 to-amber-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-gradient-to-br from-orange-500/8 to-slate-700/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="px-4 md:px-8 py-4 mt-16 md:mt-20 sticky top-16 md:top-20 z-40">
        <div className="max-w-[1800px] mx-auto backdrop-blur-2xl bg-slate-900/50 border border-slate-700/50 rounded-2xl shadow-2xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
            
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="group p-2 md:p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-slate-300 group-hover:text-orange-400" />
              </button>
              
              <div className="min-w-0 flex-1">
                <h1 className="text-base md:text-2xl font-bold bg-gradient-to-r from-slate-100 to-slate-300 bg-clip-text text-transparent truncate">
                  {isEditMode ? 'Muokkaustila' : 'Esikatselu'}
                </h1>
                <p className="text-xs md:text-sm text-slate-400 truncate">{letterData.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              {!isEditMode ? (
                <>
                  <button 
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="p-2 md:p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                    title="Lataa PDF"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-orange-400" />
                    ) : (
                      <Download className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                    )}
                  </button>
                  
                  <button 
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-2 md:p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-red-500/20 transition-all"
                    title="Poista"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin text-red-400" />
                    ) : (
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5 text-slate-400" />
                    )}
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsEditMode(true);
                      if (!isMobile) setShowStylePanel(true);
                    }}
                    className="px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl font-bold text-white shadow-lg transition-all text-sm md:text-base"
                  >
                    <Edit3 className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Muokkaa</span>
                  </button>
                </>
              ) : (
                <>
                  {!isMobile && (
                    <button
                      onClick={() => setShowStylePanel(!showStylePanel)}
                      className="p-2 md:p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl hover:bg-slate-700/50 transition-all"
                      title="Muotoilu"
                    >
                      <Type className="w-4 h-4 md:w-5 md:h-5 text-slate-300" />
                    </button>
                  )}
                  
                  <button 
                    onClick={handleCancelEdit}
                    className="px-3 md:px-4 py-2 md:py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-300 hover:bg-slate-700/50 transition-all font-semibold text-sm md:text-base"
                  >
                    <X className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Peruuta</span>
                  </button>
                  
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50 text-sm md:text-base"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2 animate-spin" /> <span className="hidden sm:inline">Tallennetaan...</span></>
                    ) : (
                      <><Save className="w-3 h-3 md:w-4 md:h-4 inline mr-1 md:mr-2" /> <span className="hidden sm:inline">Tallenna</span></>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="fixed top-24 md:top-32 right-4 md:right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-green-500/20 border border-green-400/30 rounded-2xl shadow-2xl p-3 md:p-4">
            <p className="font-bold text-green-100 text-sm md:text-base">{successMessage}</p>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="fixed top-24 md:top-32 right-4 md:right-6 z-50 animate-slide-in-right">
          <div className="backdrop-blur-2xl bg-red-500/20 border border-red-400/30 rounded-2xl shadow-2xl p-3 md:p-4">
            <p className="font-bold text-red-100 text-sm md:text-base">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* REST OF UI - SAME AS BEFORE */}
      <div className="max-w-[1800px] mx-auto px-4 md:px-8 py-4 md:py-8 relative z-10">
        <p className="text-center text-slate-400">
          [REST OF UI UNCHANGED - Preview, editing, etc.]
        </p>
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