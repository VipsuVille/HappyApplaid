'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { 
  Save, ArrowLeft, Trash2, Download, Loader2, 
  Upload, User, Image as ImageIconLucide, Sparkles, 
  Eye, Edit3, FileText, X, Camera, Undo2
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';
import CVContainer from '@/components/cv/CVContainer';
import { toast } from 'sonner';

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
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[];
    backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  // ════════════════════════════════════════════════════════════════
  // UNDO HISTORY (Ctrl+Z / Cmd+Z)
  // ════════════════════════════════════════════════════════════════
  const historyRef = useRef<string[]>([]);
  const MAX_HISTORY = 50;

  const pushHistory = useCallback((data: BaseCV) => {
    const snapshot = JSON.stringify(data);
    const history = historyRef.current;
    if (history.length > 0 && history[history.length - 1] === snapshot) return;
    history.push(snapshot);
    if (history.length > MAX_HISTORY) history.shift();
  }, []);

  const undo = useCallback(() => {
    const history = historyRef.current;
    if (history.length === 0) { toast.info('Ei enempää kumottavaa'); return; }
    const previous = history.pop();
    if (previous) {
      try { setCvData(JSON.parse(previous)); toast.success('Kumottu!'); }
      catch { toast.error('Kumoaminen epäonnistui'); }
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && isEditing) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, isEditing]);

  // ════════════════════════════════════════════════════════════════
  // MOBILE + PREVIEW WIDTH DETECT
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
      if (previewContainerRef.current) {
        setPreviewWidth(previewContainerRef.current.offsetWidth);
      }
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Recalculate after layout
  useEffect(() => {
    const t = setTimeout(() => {
      if (previewContainerRef.current) {
        setPreviewWidth(previewContainerRef.current.offsetWidth);
      }
    }, 100);
    return () => clearTimeout(t);
  }, [cvData, isEditing]);

  // ════════════════════════════════════════════════════════════════
  // LOAD CV
  // ════════════════════════════════════════════════════════════════
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
          let cvDataParsed = data.cv_data;
          let aiDataParsed = data.ai_data;
          if (!cvDataParsed && data.content) {
            try {
              const parsed = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
              cvDataParsed = parsed.cv_data || {};
              aiDataParsed = parsed.ai_data || {};
            } catch {
              cvDataParsed = data.content?.cv_data || {};
              aiDataParsed = data.content?.ai_data || {};
            }
          }
          // Ensure arrays
          for (const key of ['skills', 'experience', 'education']) {
            if (typeof cvDataParsed?.[key] === 'string') {
              try { cvDataParsed[key] = JSON.parse(cvDataParsed[key]); }
              catch { cvDataParsed[key] = key === 'skills' ? cvDataParsed[key].split(',').map((s: string) => s.trim()).filter(Boolean) : []; }
            }
            if (!Array.isArray(cvDataParsed?.[key])) cvDataParsed[key] = [];
          }

          const processImageUrl = (url: string | null | undefined): string => {
            if (!url || url.trim() === '') return '';
            const trimmed = url.trim();
            if (trimmed.startsWith('data:image') || trimmed.startsWith('http')) return trimmed;
            if (trimmed.includes('/')) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${trimmed}`;
            return '';
          };

          const profileImage = processImageUrl(data.profile_image || cvDataParsed?.profileImage || aiDataParsed?.profile_image || cvDataParsed?.photo);
          const backgroundImage = processImageUrl(data.background_image || cvDataParsed?.backgroundImage || aiDataParsed?.background_image);

          if (cvDataParsed) { cvDataParsed.profileImage = profileImage; cvDataParsed.backgroundImage = backgroundImage; }
          if (aiDataParsed) { aiDataParsed.profile_image = profileImage; aiDataParsed.background_image = backgroundImage; }

          const processedData = {
            ...data, cv_data: cvDataParsed, ai_data: aiDataParsed,
            content: { ...(data.content || {}), cv_data: cvDataParsed, ai_data: aiDataParsed }
          };
          setCvData(processedData);
          historyRef.current = [];
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

  // ════════════════════════════════════════════════════════════════
  // INLINE EDIT
  // ════════════════════════════════════════════════════════════════
  const handleUpdate = useCallback((field: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      pushHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated.cv_data) updated.cv_data = {};
      if (!updated.content) updated.content = {};
      if (!updated.content.cv_data) updated.content.cv_data = {};

      const parts = field.split('.');
      const ensurePath = (obj: any, pathParts: string[]) => {
        let current = obj;
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          const nextPart = pathParts[i + 1];
          const isNextArrayIndex = !isNaN(Number(nextPart));
          if (!(part in current)) { current[part] = isNextArrayIndex ? [] : {}; }
          else if (typeof current[part] === 'string') {
            try {
              const parsed = JSON.parse(current[part]);
              current[part] = (Array.isArray(parsed) || typeof parsed === 'object') ? parsed : (isNextArrayIndex ? [] : {});
            } catch { current[part] = isNextArrayIndex ? [] : {}; }
          }
          if (isNextArrayIndex && !Array.isArray(current[part])) current[part] = [];
          else if (!isNextArrayIndex && typeof current[part] !== 'object') current[part] = {};
          current = current[part];
        }
        return current;
      };

      const setAtPath = (root: any) => {
        const target = ensurePath(root, parts);
        const lastPart = parts[parts.length - 1];
        if (!isNaN(Number(lastPart))) {
          const index = Number(lastPart);
          if (Array.isArray(target)) {
            if (index < target.length) target[index] = value;
            else target.push(value);
          }
        } else {
          target[lastPart] = value;
        }
      };

      setAtPath(updated.cv_data);
      setAtPath(updated.content.cv_data);

      // ✅ FIX: Also update profile/background images at top level for immediate preview
      if (field === 'profileImage') {
        updated.cv_data.profileImage = value;
        updated.content.cv_data.profileImage = value;
        if (updated.ai_data) updated.ai_data.profile_image = value;
      }
      if (field === 'backgroundImage') {
        updated.cv_data.backgroundImage = value;
        updated.content.cv_data.backgroundImage = value;
        if (updated.ai_data) updated.ai_data.background_image = value;
      }

      return updated;
    });
  }, [pushHistory]);

  // ════════════════════════════════════════════════════════════════
  // DELETE HANDLER
  // ════════════════════════════════════════════════════════════════
  const handleDelete = useCallback((field: string, index: number) => {
    setCvData(prev => {
      if (!prev) return prev;
      pushHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated.cv_data) updated.cv_data = {};
      if (!updated.content) updated.content = {};
      if (!updated.content.cv_data) updated.content.cv_data = {};

      const spliceFromPath = (root: any) => {
        const parts = field.split('.');
        let current = root;
        for (const part of parts) {
          if (current && typeof current === 'object' && part in current) current = current[part];
          else return;
        }
        if (Array.isArray(current) && index >= 0 && index < current.length) {
          current.splice(index, 1);
        }
      };

      spliceFromPath(updated.cv_data);
      spliceFromPath(updated.content.cv_data);
      return updated;
    });
    toast.success('Poistettu!');
  }, [pushHistory]);

  // ════════════════════════════════════════════════════════════════
  // IMAGE HANDLERS — ✅ FIXED: use handleUpdate so image shows immediately
  // ════════════════════════════════════════════════════════════════
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profileImage' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Kuva on liian suuri (max 5MB)'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      handleUpdate(type, base64);  // goes through full state update path
      setShowProfileModal(false);
      setShowBgModal(false);
      toast.success('Kuva ladattu!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (image: UserImage, type: 'profileImage' | 'backgroundImage') => {
    handleUpdate(type, image.signedUrl || '');
    setShowProfileModal(false);
    setShowBgModal(false);
    toast.success('Kuva valittu!');
  };

  // ════════════════════════════════════════════════════════════════
  // SAVE
  // ════════════════════════════════════════════════════════════════
  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');
      const finalCvData = cvData.cv_data || cvData.content?.cv_data || {};
      const finalContent = { cv_data: finalCvData, ai_data: cvData.ai_data || cvData.content?.ai_data || {} };
      await updateCV(id, { content: finalContent, profile_image: finalCvData.profileImage || '', background_image: finalCvData.backgroundImage || '' }, token);
      toast.success('✅ CV tallennettu!');
      setIsEditing(false);
    } catch (error) {
      console.error('❌ Save error:', error);
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // PDF DOWNLOAD
  // ════════════════════════════════════════════════════════════════
  const handleDownloadPDF = async () => {
    if (!cvData || !userId) return;
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/cvs/${id}/pdf`, { method: 'GET' });
      if (!response.ok) throw new Error('PDF generation failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `CV_${cvData.title || 'dokumentti'}.pdf`;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); a.remove();
      toast.success('✅ PDF ladattu!');
    } catch (error) {
      console.error('PDF error:', error);
      toast.error('PDF:n luonti epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  // ════════════════════════════════════════════════════════════════
  // DELETE CV
  // ════════════════════════════════════════════════════════════════
  const handleDeleteCV = async () => {
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

  // ════════════════════════════════════════════════════════════════
  // RENDER TEMPLATE
  // ════════════════════════════════════════════════════════════════
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

    return (
      <CVContainer>
        <TemplateComponent
          data={cvDataProps}
          aiData={aiDataProps}
          isEditing={isEditing}
          onUpdate={handleUpdate}
          onDelete={handleDelete}        // ✅ FIX: was missing
          showEditControls={false}
          editMode={null}
        />
      </CVContainer>
    );
  };

  // ════════════════════════════════════════════════════════════════
  // SCALE CALCULATION — fits A4 width into container
  // ════════════════════════════════════════════════════════════════
  // A4 width = 210mm = ~794px at 96dpi
  const A4_PX = 794;
  const computeScale = () => {
    if (isMobile) return 0.42;
    if (previewWidth > 0) {
      const padding = 32; // 16px each side
      return Math.min(1, (previewWidth - padding) / A4_PX);
    }
    return 0.78;
  };
  const scale = computeScale();

  // ════════════════════════════════════════════════════════════════
  // LOADING
  // ════════════════════════════════════════════════════════════════
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

  // Compute scaled container height so it doesn't clip
  // A4 page = 297mm ≈ 1123px. We show ALL content (minHeight), so compute wrapper height dynamically.
  const scaledWrapperStyle: React.CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: 'top center',
    // Pull the scaled content up so there's no giant gap
    marginBottom: `calc(${scale * 100}% - 100%)`,
  };

  // ════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ════════════════════════════════════════════════════════════════
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
              <button onClick={() => router.push('/my-cvs')}
                className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex-shrink-0">
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <h1 className="text-sm sm:text-lg font-black truncate">{cvData.title || cvData.cv_data?.name || 'Nimetön CV'}</h1>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 flex-shrink-0">
              {isEditing && (
                <button onClick={undo} title="Kumoa (Ctrl+Z)"
                  className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center">
                  <Undo2 className="w-4 h-4" />
                </button>
              )}
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)}
                  className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl flex items-center gap-2 shadow-lg transition-all text-xs sm:text-sm font-bold">
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Muokkaa</span>
                </button>
              ) : (
                <>
                  <button onClick={() => setIsEditing(false)}
                    className="px-3 h-9 sm:h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-xs sm:text-sm font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Esikatsele</span>
                  </button>
                  <button onClick={handleSave} disabled={isSaving}
                    className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 transition-all text-xs sm:text-sm font-bold">
                    {isSaving ? <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />}
                    <span className="hidden sm:inline">Tallenna</span>
                  </button>
                </>
              )}
              <button onClick={handleDownloadPDF} disabled={isDownloading}
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm flex items-center justify-center">
                {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Download className="w-4 h-4" />}
              </button>
              <button onClick={handleDeleteCV}
                className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        
        {isEditing && (
          <div className="mb-6 p-4 sm:p-6 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm sm:text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">✏️ Muokkaustila päällä</h4>
                <ul className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 space-y-1">
                  <li>• <strong>Klikkaa tekstiä</strong> muokataksesi sitä</li>
                  <li>• <strong>✕-nappi</strong> poistaa kohdan (näkyy kohdassa hover)</li>
                  <li>• <strong>⠿-ikoni</strong> vasemmalla — vedä siirtääksesi osion paikkaa</li>
                  <li>• <strong>Ctrl+Z</strong> kumoaa viimeisen muutoksen</li>
                  <li>• Klikkaa kuvia vasemmalla vaihtaaksesi ne</li>
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
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl"><User className="w-4 h-4 text-orange-500" /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Profiilikuva</h3>
              </div>
              <div className={`relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-orange-500/20 shadow-lg bg-gray-100 dark:bg-gray-800 ${isEditing ? 'cursor-pointer group' : ''}`}
                onClick={() => isEditing && setShowProfileModal(true)}>
                {currentProfile ? (
                  <>
                    <img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />
                    {isEditing && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-gray-400" /></div>
                )}
              </div>
              {isEditing && (
                <button onClick={() => setShowProfileModal(true)}
                  className="w-full px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Vaihda kuva
                </button>
              )}
            </div>

            {/* Background Image */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl"><ImageIconLucide className="w-4 h-4 text-amber-500" /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Taustakuva</h3>
              </div>
              {currentBg && (
                <div className={`relative w-full aspect-video mb-4 rounded-xl overflow-hidden border-2 border-amber-500/20 shadow-lg ${isEditing ? 'cursor-pointer group' : ''}`}
                  onClick={() => isEditing && setShowBgModal(true)}>
                  <img src={currentBg} alt="Background" className="w-full h-full object-cover" />
                  {isEditing && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>}
                </div>
              )}
              {isEditing && (
                <button onClick={() => setShowBgModal(true)}
                  className="w-full px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Vaihda taustakuva
                </button>
              )}
            </div>
          </div>

          {/* CENTER: CV PREVIEW — FULL HEIGHT, NO CLIP */}
          <div className="lg:col-span-9">
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-4">
              
              {/* Scale info badge */}
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs text-gray-400 font-mono">{Math.round(scale * 100)}% · A4 (210×297mm)</span>
                {isEditing && <span className="text-xs text-orange-500 font-semibold">⠿ vedä osiota siirtääksesi</span>}
              </div>

              {/* 
                  ✅ KEY FIX: No overflow:hidden, no maxHeight clipping.
                  Content scrolls naturally. Page boundary shown as overlay.
              */}
              <div
                ref={previewContainerRef}
                className="relative bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800"
                style={{ overflowX: 'hidden', overflowY: 'auto' }}
              >
                {/* Scaled CV */}
                <div style={scaledWrapperStyle}>
                  
                  {/* ✅ Page 1 boundary indicator — shown OVER the content, not hiding it */}
                  <div
                    style={{
                      position: 'absolute',
                      // 297mm at 96dpi ≈ 1122px. But we use CSS mm directly.
                      top: '297mm',
                      left: 0,
                      right: 0,
                      zIndex: 30,
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ position: 'relative', borderTop: '2px dashed #ef4444' }}>
                      <span style={{
                        position: 'absolute', top: '-11px', right: '8px',
                        background: '#ef4444', color: 'white', fontSize: '10px',
                        padding: '1px 8px', borderRadius: '4px', fontWeight: 700,
                        whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                      }}>
                        ↑ Sivu 1 loppuu · Sivu 2 alkaa ↓
                      </span>
                    </div>
                  </div>

                  {/* ✅ Page 2 boundary */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '594mm',
                      left: 0, right: 0,
                      zIndex: 30,
                      pointerEvents: 'none',
                    }}
                  >
                    <div style={{ position: 'relative', borderTop: '2px dashed #3b82f6' }}>
                      <span style={{
                        position: 'absolute', top: '-11px', right: '8px',
                        background: '#3b82f6', color: 'white', fontSize: '10px',
                        padding: '1px 8px', borderRadius: '4px', fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}>
                        Sivu 3 alkaa ↓
                      </span>
                    </div>
                  </div>

                  {/* The actual CV — white paper */}
                  <div
                    className={`bg-white shadow-2xl ${isEditing ? 'ring-2 ring-orange-400/30' : ''}`}
                    style={{ width: '210mm', minHeight: '297mm' }}
                  >
                    {renderTemplate()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL - Profile Image */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2"><User className="w-6 h-6 text-orange-500" /> Valitse profiilikuva</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 border-2 border-dashed border-orange-500/30 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" /> Lataa uusi kuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'profileImage')} />
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {availableImages.profileImages.map((img) => (
                  <button key={img.id} onClick={() => handleSelectImage(img, 'profileImage')}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${currentProfile === img.signedUrl ? 'border-orange-500 ring-4 ring-orange-500/30 scale-95' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:scale-105'}`}>
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && <div className="absolute bottom-1 right-1 bg-purple-500 rounded-lg p-1"><Sparkles className="w-3 h-3 text-white" /></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL - Background Image */}
      {showBgModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2"><ImageIconLucide className="w-6 h-6 text-amber-500" /> Valitse taustakuva</h3>
              <button onClick={() => setShowBgModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors mb-6">
                <Upload className="w-5 h-5" /> Lataa uusi taustakuva
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'backgroundImage')} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableImages.backgroundImages.map((img) => (
                  <button key={img.id} onClick={() => handleSelectImage(img, 'backgroundImage')}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${currentBg === img.signedUrl ? 'border-amber-500 ring-4 ring-amber-500/30 scale-95' : 'border-gray-200 dark:border-gray-700 hover:border-amber-300 hover:scale-105'}`}>
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(156,163,175,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156,163,175,0.3); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(156,163,175,0.5); }
      `}</style>
    </div>
  );
}