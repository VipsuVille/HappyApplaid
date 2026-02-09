// app/edit-cv/[id]/page.tsx - LOPULLINEN VERSIO
// ✅ Vaihtoehto A: cv.content.cv_data = ainoa totuuden lähde
// ✅ Vapaa tekstinmuokkaus: Klikkaa mitä tahansa tekstiä
// ✅ Kuvien vaihto klikkaamalla
// ✅ Data näkyy kuten my-cvs:ssä

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles, 
  Eye, Edit3, FileText, X, Camera, Check
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';
import CVContainer from '@/components/cv/CVContainer';
import { toast } from 'sonner';

// ✅ PAIKALLINEN TYYPPI (sama kuin my-cvs)
interface BaseCV {
  id: string;
  user_id: string;
  title?: string;
  created_at: string;
  content?: any;
  cv_data: any;
  ai_data: any;
  profile_image?: string;
  background_image?: string;
  metadata?: any;
}

// ════════════════════════════════════════════════════════════════
// EDITABLE OVERLAY - Klikkaa mitä tahansa tekstiä muokataksesi
// ════════════════════════════════════════════════════════════════

interface EditableOverlayProps {
  isEditing: boolean;
  cvData: BaseCV;
  onSave: (path: string, value: string) => void;
}

function EditableOverlay({ isEditing, cvData, onSave }: EditableOverlayProps) {
  const [activeField, setActiveField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [fieldRect, setFieldRect] = useState<DOMRect | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setActiveField(null);
      return;
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      if (target.closest('.edit-field-popup')) return;
      
      const previewContainer = document.querySelector('[data-cv-preview]');
      if (!previewContainer?.contains(target)) return;
      
      if (target.tagName === 'IMG' || target.tagName === 'DIV' && !target.textContent?.trim()) return;
      
      const text = target.textContent?.trim();
      if (!text || text.length < 1) return;
      
      const fieldInfo = identifyField(target, text, cvData);
      if (!fieldInfo) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const rect = target.getBoundingClientRect();
      setFieldRect(rect);
      setActiveField(fieldInfo.path);
      setTempValue(fieldInfo.value);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [isEditing, cvData]);

  useEffect(() => {
    if (activeField) {
      setTimeout(() => {
        if (tempValue.length > 80) {
          textareaRef.current?.focus();
          textareaRef.current?.select();
        } else {
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }, 50);
    }
  }, [activeField, tempValue]);

  const handleSave = () => {
    if (activeField) {
      onSave(activeField, tempValue);
      setActiveField(null);
    }
  };

  const handleCancel = () => {
    setActiveField(null);
    setTempValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (!activeField || !fieldRect) return null;

  const isMultiline = tempValue.length > 80;

  return (
    <div 
      className="edit-field-popup fixed z-[200] animate-in fade-in zoom-in-95 duration-200"
      style={{
        top: Math.min(fieldRect.top - 8, window.innerHeight - 200),
        left: Math.max(8, fieldRect.left - 8),
        width: Math.min(Math.max(fieldRect.width + 16, 300), window.innerWidth - 32),
      }}
    >
      <div className="fixed inset-0 bg-black/20 -z-10" onClick={handleCancel} />
      
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border-2 border-orange-400 overflow-hidden">
        <div className="px-3 py-2 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 flex items-center justify-between">
          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
            {getFieldLabel(activeField)}
          </span>
          <div className="flex gap-1">
            <button onClick={handleCancel} className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors">
              <X className="w-3.5 h-3.5 text-red-500" />
            </button>
            <button onClick={handleSave} className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors">
              <Check className="w-3.5 h-3.5 text-green-600" />
            </button>
          </div>
        </div>
        
        {isMultiline ? (
          <textarea
            ref={textareaRef}
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={Math.min(8, Math.ceil(tempValue.length / 50))}
            className="w-full px-3 py-2 text-sm bg-transparent border-none outline-none resize-y text-gray-900 dark:text-gray-100"
          />
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 text-sm bg-transparent border-none outline-none text-gray-900 dark:text-gray-100"
          />
        )}
        
        <div className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <span className="text-[10px] text-gray-400">Enter = tallenna · Esc = peruuta</span>
          <button 
            onClick={handleSave}
            className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Tallenna
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// FIELD IDENTIFICATION
// ════════════════════════════════════════════════════════════════

function identifyField(
  element: HTMLElement, 
  text: string, 
  cvData: BaseCV
): { path: string; value: string } | null {
  const cvDataContent = cvData.content?.cv_data || cvData.cv_data || {};
  const aiData = cvData.content?.ai_data || cvData.ai_data || {};
  
  // Suorat kentät
  if (text === cvDataContent.name) return { path: 'cv_data.name', value: text };
  if (text === cvDataContent.title) return { path: 'cv_data.title', value: text };
  if (text === cvDataContent.email) return { path: 'cv_data.email', value: text };
  if (text === cvDataContent.phone) return { path: 'cv_data.phone', value: text };
  if (text === cvDataContent.location) return { path: 'cv_data.location', value: text };
  
  // Kaikki muu teksti
  if (text.length > 0) {
    return { path: `inline.${generateId(text)}`, value: text };
  }
  
  return null;
}

function generateId(text: string): string {
  return text.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
}

function getFieldLabel(path: string): string {
  if (path.includes('name')) return 'Nimi';
  if (path.includes('title')) return 'Ammattinimike';
  if (path.includes('email')) return 'Sähköposti';
  if (path.includes('phone')) return 'Puhelin';
  if (path.includes('location')) return 'Sijainti';
  return 'Muokkaa tekstiä';
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function EditCVPage() {
  const params = useParams();
  const router = useRouter();
  const { userId, getToken } = useAuth();
  const id = params?.id as string;

  const [cvData, setCvData] = useState<BaseCV | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[];
    backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  const [inlineEdits, setInlineEdits] = useState<Record<string, string>>({});

  // ── DETECT MOBILE ──
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── LOAD CV (SAMA KUIN MY-CVS) ──
  useEffect(() => {
    const init = async () => {
      if (!userId || !id) return;

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No authentication token');

        const { data: rawData, error } = await fetchCVById(id, userId, token);
        if (error) throw error;
        
        const data = rawData as any;
        
        if (data) {
          // ✅ SAMA PARSINTA KUIN MY-CVS
          let cvDataParsed = data.cv_data;
          let aiDataParsed = data.ai_data;

          if (!cvDataParsed && data.content) {
            try {
              const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
              cvDataParsed = parsed.cv_data || {};
              aiDataParsed = parsed.ai_data || {};
            } catch (e) {
              cvDataParsed = data.content?.cv_data || {};
              aiDataParsed = data.content?.ai_data || {};
            }
          }

          const processImageUrl = (url: string | null | undefined): string => {
            if (!url || url.trim() === '') return '';
            const trimmed = url.trim();
            if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) return trimmed;
            if (trimmed.includes('/')) {
              return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${trimmed}`;
            }
            return '';
          };

          const profileImage = processImageUrl(
            data.profile_image || cvDataParsed?.profileImage || aiDataParsed?.profile_image || cvDataParsed?.photo
          );
          const backgroundImage = processImageUrl(
            data.background_image || cvDataParsed?.backgroundImage || aiDataParsed?.background_image
          );

          if (cvDataParsed) {
            cvDataParsed.profileImage = profileImage;
            cvDataParsed.backgroundImage = backgroundImage;
          }
          if (aiDataParsed) {
            aiDataParsed.profile_image = profileImage;
            aiDataParsed.background_image = backgroundImage;
          }

          const processedData = {
            ...data,
            cv_data: cvDataParsed,
            ai_data: aiDataParsed,
            content: {
              ...(data.content || {}),
              cv_data: cvDataParsed,
              ai_data: aiDataParsed,
            }
          };

          console.log('✅ CV Data loaded:', processedData);
          console.log('📊 AI Data keys:', Object.keys(aiDataParsed || {}));
          console.log('📄 CV Data keys:', Object.keys(cvDataParsed || {}));
          
          setCvData(processedData);
        }

        const images = await getAllAvailableImagesAction();
        setAvailableImages(images);
      } catch (err) {
        console.error('Error loading CV:', err);
        toast.error('CV:n lataaminen epäonnistui');
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [id, userId, getToken]);

  // ── INLINE EDIT SAVE ──
  const handleInlineEdit = useCallback((path: string, value: string) => {
    if (!cvData) return;

    setInlineEdits(prev => ({ ...prev, [path]: value }));

    setCvData(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      
      if (path.startsWith('cv_data.')) {
        const field = path.replace('cv_data.', '');
        if (updated.cv_data) updated.cv_data[field] = value;
        if (updated.content?.cv_data) updated.content.cv_data[field] = value;
      } else if (path.startsWith('ai_data.')) {
        const field = path.replace('ai_data.', '');
        if (updated.ai_data) updated.ai_data[field] = value;
        if (updated.content?.ai_data) updated.content.ai_data[field] = value;
      }
      
      return updated;
    });

    toast.success('Muutos tehty - muista tallentaa!', { duration: 1500 });
  }, [cvData, inlineEdits]);

  // ── IMAGE HANDLERS ──
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    type: 'profileImage' | 'backgroundImage'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kuva on liian suuri (max 5MB)');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      
      setCvData(prev => {
        if (!prev) return prev;
        const updated = JSON.parse(JSON.stringify(prev));
        
        const aiKey = type === 'profileImage' ? 'profile_image' : 'background_image';
        
        if (updated.cv_data) updated.cv_data[type] = base64;
        if (updated.ai_data) updated.ai_data[aiKey] = base64;
        if (updated.content?.cv_data) updated.content.cv_data[type] = base64;
        if (updated.content?.ai_data) updated.content.ai_data[aiKey] = base64;
        
        return updated;
      });
      
      setShowProfileModal(false);
      setShowBgModal(false);
      toast.success('Kuva ladattu!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (image: UserImage, type: 'profileImage' | 'backgroundImage') => {
    const imageUrl = image.signedUrl || '';
    
    setCvData(prev => {
      if (!prev) return prev;
      const updated = JSON.parse(JSON.stringify(prev));
      
      const aiKey = type === 'profileImage' ? 'profile_image' : 'background_image';
      
      if (updated.cv_data) updated.cv_data[type] = imageUrl;
      if (updated.ai_data) updated.ai_data[aiKey] = imageUrl;
      if (updated.content?.cv_data) updated.content.cv_data[type] = imageUrl;
      if (updated.content?.ai_data) updated.content.ai_data[aiKey] = imageUrl;
      
      return updated;
    });
    
    setShowProfileModal(false);
    setShowBgModal(false);
    toast.success('Kuva valittu!');
  };

  // ── SAVE (VAIHTOEHTO A) ──
  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      // ✅ VAIHTOEHTO A: Tallenna vain cv.content.cv_data
      const finalCvData = {
        ...(cvData.cv_data || cvData.content?.cv_data || {}),
      };

      const finalContent = {
        cv_data: finalCvData,
        ai_data: cvData.ai_data || cvData.content?.ai_data || {},
      };

      console.log('✅ SAVING CV CONTENT:', finalContent);

      await updateCV(id, { content: finalContent }, token);
      
      toast.success('✅ CV tallennettu!');
      setIsEditing(false);
      setInlineEdits({});
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  // ── PDF DOWNLOAD ──
  const handleDownloadPDF = async () => {
    if (!cvData || !userId) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/cvs/${id}/pdf`, { method: 'GET' });
      if (!response.ok) throw new Error('PDF generation failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${cvData.title || 'dokumentti'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('✅ PDF ladattu!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── DELETE ──
  const handleDelete = async () => {
    if (!confirm('Haluatko varmasti poistaa tämän CV:n?')) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token || !userId) throw new Error('No token');
      await deleteCV(id, userId, token);
      toast.success('CV poistettu');
      router.push('/my-cvs');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Poisto epäonnistui');
    }
  };

  // ── RENDER TEMPLATE (SAMA KUIN MY-CVS) ──
  const renderTemplate = () => {
    if (!cvData) return null;

    const cvDataProps = cvData.cv_data || cvData.content?.cv_data || {};
    const aiDataProps = cvData.ai_data || cvData.content?.ai_data || {};
    
    const templateType = cvDataProps?.cvType || aiDataProps?.cv_type || cvData.metadata?.cv_type || 'simple';

    let TemplateComponent: any;
    switch (templateType) {
      case 'technical': TemplateComponent = TechnicalCVTemplate; break;
      case 'creative': TemplateComponent = CreativeCVTemplate; break;
      default: TemplateComponent = SimpleCVTemplate;
    }

    console.log('🎨 Rendering template:', templateType);

    return (
      <CVContainer>
        <TemplateComponent 
          data={cvDataProps} 
          aiData={aiDataProps} 
          isEditing={false}
        />
      </CVContainer>
    );
  };

  // ── LOADING ──
  if (isLoading || !cvData) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan CV:tä...</p>
      </div>
    );
  }

  const currentProfile = cvData.cv_data?.profileImage || cvData.ai_data?.profile_image || '';
  const currentBg = cvData.cv_data?.backgroundImage || cvData.ai_data?.background_image || '';

  // ── MAIN RENDER ──
  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc] transition-colors duration-500">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 dark:bg-emerald-500/5 rounded-full blur-[120px]" />
      </div>

      {/* TOP BAR */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button 
                onClick={() => router.push('/my-cvs')}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex-shrink-0"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <h1 className="text-sm sm:text-lg font-black truncate">
                    {cvData.title || cvData.cv_data?.name || 'Nimetön CV'}
                  </h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {!isEditing ? (
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all text-xs sm:text-sm font-bold"
                >
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => { setIsEditing(false); setInlineEdits({}); }}
                    className="px-3 h-9 sm:h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs sm:text-sm font-bold"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              
              <button 
                onClick={handleDownloadPDF}
                disabled={isDownloading}
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center"
              >
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Download className="w-4 h-4" />}
              </button>
              
              <button 
                onClick={handleDelete} 
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex items-center justify-center"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {/* Info Banner */}
        {isEditing && (
          <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm sm:text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">
                  ✏️ Muokkaustila päällä
                </h4>
                <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• <strong>Klikkaa mitä tahansa tekstiä</strong> CV:ssä muokataksesi sitä</li>
                  <li>• <strong>Klikkaa kuvia</strong> vasemmalla vaihtaaksesi ne</li>
                  <li>• Paina <strong>Tallenna</strong> kun olet valmis</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-3 space-y-4">
            
            {/* Profile Image */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl">
                  <User className="w-4 h-4 text-orange-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Profiilikuva</h3>
              </div>
              
              <div 
                className={`relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-orange-500/20 shadow-lg bg-gray-100 dark:bg-gray-800 ${isEditing ? 'cursor-pointer group' : ''}`}
                onClick={() => isEditing && setShowProfileModal(true)}
              >
                {currentProfile ? (
                  <>
                    <img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />
                    {isEditing && (
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>

              {isEditing && (
                <button
                  onClick={() => setShowProfileModal(true)}
                  className="w-full px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Vaihda kuva
                </button>
              )}
            </div>

            {/* Background Image */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl">
                  <ImageIconLucide className="w-4 h-4 text-amber-500" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Taustakuva</h3>
              </div>

              {currentBg && (
                <div 
                  className={`relative w-full aspect-video mb-4 rounded-xl overflow-hidden border-2 border-amber-500/20 shadow-lg ${isEditing ? 'cursor-pointer group' : ''}`}
                  onClick={() => isEditing && setShowBgModal(true)}
                >
                  <img src={currentBg} alt="Background" className="w-full h-full object-cover" />
                  {isEditing && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <button
                  onClick={() => setShowBgModal(true)}
                  className="w-full px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Vaihda taustakuva
                </button>
              )}
            </div>

            {/* Unsaved changes */}
            {Object.keys(inlineEdits).length > 0 && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-300 dark:border-yellow-800 rounded-xl p-4">
                <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                  <Edit3 className="w-4 h-4" />
                  {Object.keys(inlineEdits).length} tallentamatonta muutosta
                </p>
              </div>
            )}
          </div>

          {/* CENTER: CV PREVIEW */}
          <div className="lg:col-span-9">
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-6 overflow-hidden">
              <div 
                className="overflow-x-auto custom-scrollbar flex justify-center bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800"
                data-cv-preview
              >
                <div 
                  className={`origin-top transition-transform duration-300 bg-white shadow-2xl my-4 ${
                    isEditing ? 'ring-2 ring-orange-400/30' : ''
                  }`}
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    transform: isMobile ? 'scale(0.35)' : window.innerWidth < 1024 ? 'scale(0.6)' : 'scale(0.75)',
                    transformOrigin: 'top center',
                    cursor: isEditing ? 'text' : 'default',
                  }}
                >
                  {renderTemplate()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EDITABLE OVERLAY */}
      {cvData && (
        <EditableOverlay 
          isEditing={isEditing} 
          cvData={cvData} 
          onSave={handleInlineEdit} 
        />
      )}

      {/* MODALS (sama koodi kuin aikaisemmin...) */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <User className="w-6 h-6 text-orange-500" />
                Valitse profiilikuva
              </h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 border-2 border-dashed border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" />
                Lataa uusi kuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {availableImages.profileImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img, 'profileImage')}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${
                      currentProfile === img.signedUrl 
                        ? 'border-orange-500 ring-4 ring-orange-500/30 scale-95' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:scale-105'
                    }`}
                  >
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && (
                      <div className="absolute bottom-1 right-1 bg-purple-500 rounded-lg p-1">
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showBgModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <ImageIconLucide className="w-6 h-6 text-amber-500" />
                Valitse taustakuva
              </h3>
              <button onClick={() => setShowBgModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" />
                Lataa uusi taustakuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableImages.backgroundImages.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img, 'backgroundImage')}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${
                      currentBg === img.signedUrl 
                        ? 'border-amber-500 ring-4 ring-amber-500/30 scale-95' 
                        : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:scale-105'
                    }`}
                  >
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && (
                      <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        [data-cv-preview] * {
          ${isEditing ? 'cursor: text !important;' : ''}
        }
        [data-cv-preview] *:hover {
          ${isEditing ? 'outline: 1px dashed rgba(249, 115, 22, 0.4); outline-offset: 2px; border-radius: 4px;' : ''}
        }
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(156, 163, 175, 0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(156, 163, 175, 0.5); }
      `}</style>
    </div>
  );
}