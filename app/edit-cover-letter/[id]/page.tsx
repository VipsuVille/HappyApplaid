'use client';
//edit-cover-letter/[id]/page.tsx
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Palette, RotateCcw, X, Eye, Settings, 
  AlignLeft, AlignCenter, AlignJustify,
  CheckCircle, Clock, FileText, Sparkles, Pencil
} from 'lucide-react';

import IterativeFeedback from '@/components/IterativeFeedback';
import CoverLetterTemplate from '@/components/cover-letter/CoverLetterTemplate';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import { useTokens } from '@/hooks/useTokens';

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
  headerColor: string;
  headerLayout: 'top' | 'left';
  sidebarContent: 'contact' | 'highlights' | 'none';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  textAlign: 'left' | 'justify' | 'center';
}

export default function EditCoverLetterPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken, userId } = useAuth();
  const { tokens, plan_type } = useTokens();
  const id = params?.id as string;

  const [letterData, setLetterData] = useState<CoverLetter | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [showSuccess, setShowSuccess] = useState(false);
  const [latestChanges, setLatestChanges] = useState('');

  // ✅ UUSI: Fullscreen editing modal
  const [isEditingContent, setIsEditingContent] = useState(false);

  // Inline editing states (pidetään yhteensopivuuden vuoksi)
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');

  // Content fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');
  
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: 'rgb(181, 152, 79)',
    headerLayout: 'top',
    sidebarContent: 'contact',
    fontSize: 11,
    lineHeight: 1.8,
    letterSpacing: 0,
    paragraphSpacing: 16,
    margins: {
      top: 50,
      right: 50,
      bottom: 50,
      left: 50,
    },
    textAlign: 'justify',
  });

  const iterationCost = plan_type === 'premium' ? 30 : 50;

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Lukitse scroll kun editointitila on auki
  useEffect(() => {
    if (isEditingContent) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isEditingContent]);

  // Load cover letter
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

        const data = await response.json();
        
        if (data.coverLetter) {
          const letter = data.coverLetter;
          setLetterData(letter);
          
          setName(letter.content?.contactInfo?.name || letter.ai_data?.name || 'Hakija');
          setEmail(letter.content?.contactInfo?.email || letter.ai_data?.email || '');
          setPhone(letter.content?.contactInfo?.phone || letter.ai_data?.phone || '');
          setLocation(letter.content?.contactInfo?.location || letter.ai_data?.location || '');
          setContent(letter.content?.body || letter.ai_data?.html?.content || '');
          
          const loadedStyle: StyleSettings = {
            headerColor: letter.content?.headerColor || 'rgb(181, 152, 79)',
            headerLayout: letter.content?.headerLayout || 'top',
            sidebarContent: letter.content?.sidebarContent || 'contact',
            fontSize: letter.content?.fontSize || 11,
            lineHeight: letter.content?.lineHeight || 1.8,
            letterSpacing: letter.content?.letterSpacing || 0,
            paragraphSpacing: letter.content?.paragraphSpacing || 16,
            margins: letter.content?.margins || {
              top: 50,
              right: 50,
              bottom: 50,
              left: 50,
            },
            textAlign: letter.content?.textAlign || 'justify',
          };
          
          setStyleSettings(loadedStyle);
        } else {
          throw new Error('Hakukirjettä ei löytynyt');
        }

      } catch (err) {
        console.error('❌ [LOAD] Error:', err);
        toast.error(
          err instanceof Error ? err.message : 'Hakukirjeen lataaminen epäonnistui'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadCoverLetter();
  }, [id, userId, getToken]);

  // ✅ Build save content (reusable for save + PDF)
  const buildSaveContent = () => {
    return {
      ...letterData?.content,
      contactInfo: { name, email, phone, location },
      body: content,
      ...styleSettings,
      job_description: letterData?.content?.job_description,
      job_title: letterData?.content?.job_title,
      company_name: letterData?.content?.company_name,
      language: letterData?.content?.language,
      style: letterData?.content?.style,
    };
  };

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);

    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No authentication token');

      const finalContent = buildSaveContent();

      const response = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: finalContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Save failed');
      }

      const result = await response.json();
      if (result.coverLetter) {
        setLetterData(result.coverLetter);
      }
      
      toast.success('✅ Hakukirje tallennettu!');
      setEditingField(null);
      
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ FIX: Save FIRST, then generate PDF so styles are persisted
  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token && letterData) {
        const finalContent = buildSaveContent();
        const saveRes = await fetch(`/api/cover-letters/${id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content: finalContent }),
        });
        if (saveRes.ok) {
          const result = await saveRes.json();
          if (result.coverLetter) setLetterData(result.coverLetter);
        }
      }

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
      toast.success('PDF ladattu!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui');
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
      
      toast.success('Hakukirje poistettu');
      router.push('/my-cover-letters');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  const handleIterationSuccess = (
    newContent: string, 
    summary: string,
    affectedSections: string[]
  ) => {
    setContent(newContent);
    setLatestChanges(summary);
    setShowSuccess(true);
    
    toast.success('✅ Kirje päivitetty!', {
      description: summary
    });
    
    setTimeout(() => setShowSuccess(false), 10000);
  };

  // ✅ Tallenna editoinnin jälkeen ja sulje modal
  const handleFinishEditing = () => {
    setIsEditingContent(false);
    toast.success('Muokkaukset tallennettu — muista painaa Tallenna!', {
      duration: 3000,
    });
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
  };

  const saveField = (field: string) => {
    switch (field) {
      case 'name': setName(tempValue); break;
      case 'email': setEmail(tempValue); break;
      case 'phone': setPhone(tempValue); break;
      case 'location': setLocation(tempValue); break;
      case 'content': setContent(tempValue); break;
    }
    setEditingField(null);
    setTempValue('');
  };
const handleFieldChange = (field: keyof typeof templateData, value: string) => {
  switch (field) {
    case 'name':        setName(value); break;
    case 'email':       setEmail(value); break;
    case 'phone':       setPhone(value); break;
    case 'location':    setLocation(value); break;
    case 'jobTitle':    // tallenna letterData kautta jos tarvitaan
      setLetterData(prev => prev ? {
        ...prev,
        content: { ...prev.content, job_title: value }
      } : prev);
      break;
    case 'companyName':
      setLetterData(prev => prev ? {
        ...prev,
        content: { ...prev.content, company_name: value }
      } : prev);
      break;
    case 'headerColor':
      setStyleSettings(prev => ({ ...prev, headerColor: value }));
      break;
    default: break;
  }
};
  const handleResetStyles = () => {
    setStyleSettings({
      headerColor: 'rgb(181, 152, 79)',
      headerLayout: 'top',
      sidebarContent: 'contact',
      fontSize: 11,
      lineHeight: 1.8,
      letterSpacing: 0,
      paragraphSpacing: 16,
      margins: {
        top: 50,
        right: 50,
        bottom: 50,
        left: 50,
      },
      textAlign: 'justify',
    });
    toast.success('Tyylit palautettu oletuksiin');
  };

  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan hakukirjettä...</p>
      </div>
    );
  }

  const templateData = {
    name,
    email,
    phone,
    location,
    content,
    jobTitle: letterData.content?.job_title || letterData.ai_data?.job_title || '',
    companyName: letterData.content?.company_name || letterData.ai_data?.company_name || '',
    title: letterData.title,
    keyHighlights: letterData.ai_data?.key_highlights || [],
    language: letterData.content?.language || 'finnish',
    style: (letterData.content?.style || 'professional') as 'professional' | 'casual' | 'creative',
    headerColor: styleSettings.headerColor,
    headerLayout: styleSettings.headerLayout,
    sidebarContent: styleSettings.sidebarContent,
    fontSize: styleSettings.fontSize,
    lineHeight: styleSettings.lineHeight,
    textAlign: styleSettings.textAlign,
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc] transition-colors duration-500">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 dark:bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* ✅ FULLSCREEN EDITING MODAL — Canva-tyylinen */}
      {isEditingContent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(8px)',
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Modal toolbar */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 201,
              width: '100%',
              background: 'rgba(15, 15, 20, 0.95)',
              borderBottom: '1px solid rgba(249, 115, 22, 0.3)',
              padding: '12px 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Pencil style={{ width: '18px', height: '18px', color: '#f97316' }} />
              <span style={{ 
                color: '#f97316', 
                fontWeight: 700, 
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}>
                Muokkaustila — klikkaa mitä tahansa kappaletta
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ 
                fontSize: '12px', 
                color: 'rgba(255,255,255,0.4)',
                display: isMobile ? 'none' : 'block',
              }}>
                Klikkaa kappale → kirjoita → klikkaa muualle tallentaaksesi
              </span>
              <button
                onClick={handleFinishEditing}
                style={{
                  padding: '8px 20px',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '14px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
                }}
              >
                <CheckCircle style={{ width: '16px', height: '16px' }} />
                Valmis
              </button>
            </div>
          </div>

          {/* Dokumentti täysikokoisena — EI skaalattuna */}
          <div
            style={{
              padding: '40px 20px 80px',
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
            }}
          >
            {/* Ohjevihje dokumentin yläpuolella */}
            <div style={{ width: '210mm', maxWidth: '100%' }}>
              <div style={{
                marginBottom: '12px',
                padding: '8px 16px',
                background: 'rgba(249, 115, 22, 0.1)',
                border: '1px solid rgba(249, 115, 22, 0.2)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'rgba(249, 115, 22, 0.9)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <Pencil style={{ width: '12px', height: '12px', flexShrink: 0 }} />
                Oranssi reunus = muokattava kappale. Klikkaa kappaletta aloittaaksesi muokkauksen.
              </div>

              {/* ✅ TÄYSIKOKO template — 1:1, ei skaalattuna */}
    <CoverLetterTemplate
  data={templateData}
  isEditing={false}
  isPdfPreview={false}
/>
            </div>
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cover-letters')}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <h1 className="text-sm sm:text-lg font-black truncate">
                    {letterData.title}
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={() => setShowStylePanel(!showStylePanel)}
                className={`p-2 sm:p-3 rounded-xl transition-all ${
                  showStylePanel 
                    ? 'bg-orange-500 text-white shadow-lg' 
                    : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 sm:p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-orange-500" />
                ) : (
                  <Download className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
              
              <button 
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 sm:p-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm"
              >
                {isDeleting ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-red-500" />
                ) : (
                  <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
                )}
              </button>
              
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-3 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-bold disabled:opacity-50 shadow-lg transition-all text-xs sm:text-sm"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                    <span className="hidden sm:inline">Tallennetaan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 inline mr-2" />
                    <span className="hidden sm:inline">Tallenna</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* SUCCESS BANNER */}
        {showSuccess && (
          <div className="mb-6 p-4 sm:p-6 bg-green-500/10 border-2 border-green-500/30 rounded-2xl animate-in slide-in-from-top-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 shrink-0" />
              <div>
                <h4 className="text-sm sm:text-lg font-bold text-green-600 dark:text-green-400 mb-1">
                  ✅ Kirje päivitetty onnistuneesti!
                </h4>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {latestChanges}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          
          {/* STYLE PANEL */}
          {showStylePanel && (
            <div className="lg:w-80 bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-6 shadow-xl lg:sticky lg:top-24 lg:h-fit">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm sm:text-lg font-black flex items-center gap-2 uppercase tracking-wider">
                  <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                  Muotoilu
                </h3>
                <button
                  onClick={() => setShowStylePanel(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors lg:hidden"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Header Color */}
                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider">Header-väri</label>
                  <input
                    type="color"
                    value={styleSettings.headerColor.startsWith('rgb') ? '#B59850' : styleSettings.headerColor}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, headerColor: e.target.value }))}
                    className="w-full h-12 rounded-lg cursor-pointer border-2 border-gray-200 dark:border-gray-700"
                  />
                </div>

                {/* Header Layout */}
                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider">Asettelu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'top' }))}
                      className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        styleSettings.headerLayout === 'top'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Yläosa
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, headerLayout: 'left' }))}
                      className={`p-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        styleSettings.headerLayout === 'left'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      Vasen
                    </button>
                  </div>
                </div>

                {/* Font Size */}
                <div>
                  <label className="text-xs font-bold mb-2 flex justify-between uppercase tracking-wider">
                    <span>Fonttikoko</span>
                    <span className="text-orange-500">{styleSettings.fontSize}pt</span>
                  </label>
                  <input
                    type="range"
                    min="8"
                    max="14"
                    step="0.5"
                    value={styleSettings.fontSize}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, fontSize: parseFloat(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>8pt (tiivis)</span>
                    <span>11pt</span>
                    <span>14pt (iso)</span>
                  </div>
                </div>

                {/* Line Height */}
                <div>
                  <label className="text-xs font-bold mb-2 flex justify-between uppercase tracking-wider">
                    <span>Riviväli</span>
                    <span className="text-orange-500">{styleSettings.lineHeight}</span>
                  </label>
                  <input
                    type="range"
                    min="1.1"
                    max="2.5"
                    step="0.05"
                    value={styleSettings.lineHeight}
                    onChange={(e) => setStyleSettings(prev => ({ ...prev, lineHeight: parseFloat(e.target.value) }))}
                    className="w-full accent-orange-500"
                  />
                  <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                    <span>Tiivis</span>
                    <span>Oletus (1.8)</span>
                    <span>Väljä</span>
                  </div>
                </div>

                {/* Text Alignment */}
                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider">Tekstin tasaus</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'left' }))}
                      className={`flex-1 p-2 rounded-xl border-2 transition-all ${
                        styleSettings.textAlign === 'left'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <AlignLeft className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'center' }))}
                      className={`flex-1 p-2 rounded-xl border-2 transition-all ${
                        styleSettings.textAlign === 'center'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <AlignCenter className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setStyleSettings(prev => ({ ...prev, textAlign: 'justify' }))}
                      className={`flex-1 p-2 rounded-xl border-2 transition-all ${
                        styleSettings.textAlign === 'justify'
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <AlignJustify className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-xs text-gray-500 mb-2 font-semibold">Pikaasetukset</p>
                  <div className="flex gap-2 flex-wrap">
                    <button 
                      onClick={() => setStyleSettings(prev => ({ ...prev, fontSize: 9.5, lineHeight: 1.4 }))}
                      className="text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg font-semibold transition-colors"
                    >
                      Kompakti
                    </button>
                    <button 
                      onClick={() => setStyleSettings(prev => ({ ...prev, fontSize: 11, lineHeight: 1.8 }))}
                      className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-semibold transition-colors"
                    >
                      Oletus
                    </button>
                    <button 
                      onClick={() => setStyleSettings(prev => ({ ...prev, fontSize: 12, lineHeight: 2.1 }))}
                      className="text-xs px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg font-semibold transition-colors"
                    >
                      Väljä
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleResetStyles}
                  className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Palauta oletukset
                </button>
              </div>
            </div>
          )}

          {/* PREVIEW & EDIT */}
          <div className="flex-1 space-y-4 sm:space-y-6">
            
            {/* PREVIEW */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-800">
              <div className="relative flex items-center justify-center p-4 sm:p-6 bg-gray-50 dark:bg-black/20">
                <div
                  style={{
                    transform: isMobile ? 'scale(0.35)' : 'scale(0.65)',
                    transformOrigin: isMobile ? 'top center' : 'center',
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', top: '297mm', left: '-10px', right: '-10px', zIndex: 20, pointerEvents: 'none' }}>
                      <div style={{ borderTop: '2px dashed #ef4444', position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-11px', right: '8px', background: '#ef4444', color: 'white', fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>
                          ↑ Sivu 1 · Sivu 2 ↓
                        </span>
                      </div>
                    </div>
                    <CoverLetterContainer>
                      {/* ✅ Preview ei ole editoitava — isEditing=false */}
   <CoverLetterTemplate
  data={templateData}
  isEditing={true}
  isPdfPreview={false}
  onChange={(newContent) => setContent(newContent)}
  onFieldChange={handleFieldChange}   // ← LISÄÄ TÄMÄ
/>
                    </CoverLetterContainer>
                  </div>
                </div>
              </div>
              
              {/* ✅ UUSI: Muokkaa-nappi avaa fullscreen modalin */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/60">
                <button
                  onClick={() => setIsEditingContent(true)}
                  className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-lg"
                >
                  <Pencil className="w-4 h-4" />
                  ✏️ Muokkaa tekstiä — avaa muokkaustila
                </button>
              </div>
            </div>

            {/* ITERATIVE FEEDBACK */}
            <IterativeFeedback
              coverLetterId={id}
              iterationCost={iterationCost}
              currentTokens={tokens}
              onSuccess={handleIterationSuccess}
            />

            {/* CHANGE HISTORY */}
            {letterData?.ai_data?.iterations?.length > 0 && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-4 sm:p-8 shadow-xl">
                <h3 className="text-lg sm:text-xl font-black mb-6 flex items-center gap-2 uppercase tracking-wider">
                  <Clock className="w-5 h-5 text-gray-400" />
                  Muutoshistoria
                </h3>
                <div className="space-y-4">
                  {letterData.ai_data.iterations.map((iter: any, i: number) => (
                    <div 
                      key={i}
                      className="p-4 bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl"
                    >
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <p className="text-sm font-bold">Versio {iter.version}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(iter.timestamp).toLocaleString('fi-FI')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        💬 <span className="italic">&quot;{iter.user_feedback}&quot;</span>
                      </p>
                      <p className="text-xs text-gray-500">✅ {iter.changes_made}</p>
                      {iter.affected_sections && (
                        <div className="mt-2 flex gap-2 flex-wrap">
                          {iter.affected_sections.map((section: string) => (
                            <span 
                              key={section}
                              className="px-2 py-1 bg-purple-500/20 border border-purple-500/30 rounded text-[10px] font-bold text-purple-600 dark:text-purple-400"
                            >
                              {section}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Info */}
            <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <p className="text-sm font-bold text-orange-900 dark:text-orange-100 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Klikkaa &quot;Muokkaa tekstiä&quot; avataksesi muokkaustilan · Säädä muotoilua ⚙️ Muotoilu-paneelista
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(156, 163, 175, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
}