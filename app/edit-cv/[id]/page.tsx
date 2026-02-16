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
  id: string; user_id: string; title?: string; created_at: string;
  content?: any; cv_data: any; ai_data: any;
  profile_image?: string; background_image?: string; metadata?: any;
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
    profileImages: UserImage[]; backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  // ── Typography controls ────────────────────────────────────────────
  // ✅ FIX: These are now synced with cv_data so they persist to DB
  const [fontScale, setFontScale] = useState(1.0);
  const [lineScale, setLineScale] = useState(1.0);

  // ── Undo history ───────────────────────────────────────────────────
  const historyRef = useRef<string[]>([]);
  const MAX_HISTORY = 50;

  const pushHistory = useCallback((data: BaseCV) => {
    const snap = JSON.stringify(data);
    const h = historyRef.current;
    if (h.length && h[h.length - 1] === snap) return;
    h.push(snap);
    if (h.length > MAX_HISTORY) h.shift();
  }, []);

  const undo = useCallback(() => {
    const h = historyRef.current;
    if (!h.length) { toast.info('Ei enempää kumottavaa'); return; }
    const prev = h.pop()!;
    try {
      const parsed = JSON.parse(prev);
      setCvData(parsed);
      // ✅ Also restore fontScale/lineScale from undo state
      setFontScale(parsed.cv_data?.fontScale ?? 1.0);
      setLineScale(parsed.cv_data?.lineScale ?? 1.0);
      toast.success('Kumottu!');
    } catch { toast.error('Kumoaminen epäonnistui'); }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && isEditing) { e.preventDefault(); undo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, isEditing]);

  // ── Responsive ─────────────────────────────────────────────────────
  useEffect(() => {
    const update = () => {
      setIsMobile(window.innerWidth < 768);
      if (previewContainerRef.current) setPreviewWidth(previewContainerRef.current.offsetWidth);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      if (previewContainerRef.current) setPreviewWidth(previewContainerRef.current.offsetWidth);
    }, 120);
    return () => clearTimeout(t);
  }, [cvData, isEditing]);

  // ── Load CV ────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      if (!userId || !id) return;
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No token');
        const { data: rawData, error } = await fetchCVById(id, userId, token);
        if (error) throw error;
        const data = rawData as any;
        if (!data) return;

        let cvDataParsed = data.cv_data;
        let aiDataParsed = data.ai_data;
        if (!cvDataParsed && data.content) {
          try {
            const p = typeof data.content === 'string' ? JSON.parse(data.content) : data.content;
            cvDataParsed = p.cv_data || {}; aiDataParsed = p.ai_data || {};
          } catch { cvDataParsed = data.content?.cv_data || {}; aiDataParsed = data.content?.ai_data || {}; }
        }

        // Ensure arrays
        for (const k of ['experience', 'education']) {
          if (typeof cvDataParsed?.[k] === 'string') {
            try { cvDataParsed[k] = JSON.parse(cvDataParsed[k]); } catch { cvDataParsed[k] = []; }
          }
          if (!Array.isArray(cvDataParsed?.[k])) cvDataParsed[k] = [];
        }
        if (typeof cvDataParsed?.skills === 'string') {
          try { cvDataParsed.skills = JSON.parse(cvDataParsed.skills); }
          catch { cvDataParsed.skills = cvDataParsed.skills.split(',').map((s: string) => s.trim()).filter(Boolean); }
        }
        if (!Array.isArray(cvDataParsed?.skills)) cvDataParsed.skills = [];

        const processImg = (url?: string | null): string => {
          if (!url?.trim()) return '';
          const t = url.trim();
          if (t.startsWith('data:image') || t.startsWith('http')) return t;
          if (t.includes('/')) return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cv_files/${t}`;
          return '';
        };

        const profileImage = processImg(data.profile_image || cvDataParsed?.profileImage || aiDataParsed?.profile_image || cvDataParsed?.photo);
        const backgroundImage = processImg(data.background_image || cvDataParsed?.backgroundImage || aiDataParsed?.background_image);

        cvDataParsed.profileImage = profileImage;
        cvDataParsed.backgroundImage = backgroundImage;
        if (aiDataParsed) { aiDataParsed.profile_image = profileImage; aiDataParsed.background_image = backgroundImage; }

        // ✅ FIX: Load saved fontScale/lineScale from DB
        setFontScale(cvDataParsed.fontScale ?? 1.0);
        setLineScale(cvDataParsed.lineScale ?? 1.0);

        const processed: BaseCV = {
          ...data, cv_data: cvDataParsed, ai_data: aiDataParsed,
          content: { ...(data.content || {}), cv_data: cvDataParsed, ai_data: aiDataParsed },
        };
        setCvData(processed);
        historyRef.current = [];

        const images = await getAllAvailableImagesAction();
        setAvailableImages(images);
      } catch (err) {
        console.error('Load error:', err);
        toast.error('CV:n lataaminen epäonnistui');
      } finally { setIsLoading(false); }
    };
    init();
  }, [id, userId, getToken]);

  // ── handleUpdate ───────────────────────────────────────────────────
  const handleUpdate = useCallback((field: string, value: any) => {
    setCvData(prev => {
      if (!prev) return prev;
      pushHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated.cv_data) updated.cv_data = {};
      if (!updated.content) updated.content = {};
      if (!updated.content.cv_data) updated.content.cv_data = {};

      const setAt = (root: any, path: string, val: any) => {
        const parts = path.split('.');
        if (parts.length === 1) { root[parts[0]] = val; return; }
        let cur = root;
        for (let i = 0; i < parts.length - 1; i++) {
          const p = parts[i];
          const nextIsIndex = !isNaN(Number(parts[i + 1]));
          if (cur[p] === undefined || cur[p] === null) {
            cur[p] = nextIsIndex ? [] : {};
          } else if (typeof cur[p] === 'string') {
            try { const parsed = JSON.parse(cur[p]); cur[p] = typeof parsed === 'object' ? parsed : (nextIsIndex ? [] : {}); }
            catch { cur[p] = nextIsIndex ? [] : {}; }
          }
          if (nextIsIndex && !Array.isArray(cur[p])) cur[p] = [];
          if (!nextIsIndex && Array.isArray(cur[p])) cur[p] = {};
          cur = cur[p];
        }
        const last = parts[parts.length - 1];
        if (!isNaN(Number(last))) {
          const idx = Number(last);
          if (Array.isArray(cur)) { while (cur.length <= idx) cur.push(undefined); cur[idx] = val; }
        } else { cur[last] = val; }
      };

      setAt(updated.cv_data, field, value);
      setAt(updated.content.cv_data, field, value);

      if (field === 'profileImage') {
        updated.cv_data.profileImage = value;
        updated.content.cv_data.profileImage = value;
        if (updated.ai_data) updated.ai_data.profile_image = value;
        if (updated.content.ai_data) updated.content.ai_data.profile_image = value;
      }
      if (field === 'backgroundImage') {
        updated.cv_data.backgroundImage = value;
        updated.content.cv_data.backgroundImage = value;
        if (updated.ai_data) updated.ai_data.background_image = value;
        if (updated.content.ai_data) updated.content.ai_data.background_image = value;
      }

      return updated;
    });
  }, [pushHistory]);

  // ── handleDelete ───────────────────────────────────────────────────
  const handleDelete = useCallback((field: string, index: number) => {
    setCvData(prev => {
      if (!prev) return prev;
      pushHistory(prev);
      const updated = JSON.parse(JSON.stringify(prev));
      if (!updated.cv_data) updated.cv_data = {};
      if (!updated.content) updated.content = {};
      if (!updated.content.cv_data) updated.content.cv_data = {};

      const spliceAt = (root: any) => {
        const parts = field.split('.');
        let cur = root;
        for (const p of parts) {
          if (cur && typeof cur === 'object' && p in cur) cur = cur[p];
          else return;
        }
        if (Array.isArray(cur) && index >= 0 && index < cur.length) cur.splice(index, 1);
      };

      spliceAt(updated.cv_data);
      spliceAt(updated.content.cv_data);
      return updated;
    });
    toast.success('Poistettu!');
  }, [pushHistory]);

  // ── Image handlers ─────────────────────────────────────────────────
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'profileImage' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5 MB'); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdate(type, reader.result as string);
      setShowProfileModal(false); setShowBgModal(false);
      toast.success('Kuva ladattu!');
    };
    reader.readAsDataURL(file);
  };

  const handleSelectImage = (img: UserImage, type: 'profileImage' | 'backgroundImage') => {
    handleUpdate(type, img.signedUrl || '');
    setShowProfileModal(false); setShowBgModal(false);
    toast.success('Kuva valittu!');
  };

  // ✅ FIX: fontScale/lineScale update also writes to cv_data
  const updateFontScale = useCallback((val: number) => {
    setFontScale(val);
    handleUpdate('fontScale', val);
  }, [handleUpdate]);

  const updateLineScale = useCallback((val: number) => {
    setLineScale(val);
    handleUpdate('lineScale', val);
  }, [handleUpdate]);

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      // ✅ FIX: Include fontScale/lineScale in saved data
      const final = {
        ...(cvData.cv_data || cvData.content?.cv_data || {}),
        fontScale,
        lineScale,
      };

      await updateCV(id, {
        content: { cv_data: final, ai_data: cvData.ai_data || {} },
        profile_image: final.profileImage || '',
        background_image: final.backgroundImage || '',
      }, token);

      toast.success('✅ CV tallennettu!');
      setIsEditing(false);
    } catch (err) { console.error(err); toast.error('Tallennus epäonnistui'); }
    finally { setIsSaving(false); }
  };

  // ── PDF ────────────────────────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!cvData || !userId) return;

    // ✅ FIX: Save first to ensure PDF sees latest data
    setIsDownloading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const final = {
          ...(cvData.cv_data || cvData.content?.cv_data || {}),
          fontScale,
          lineScale,
        };
        await updateCV(id, {
          content: { cv_data: final, ai_data: cvData.ai_data || {} },
          profile_image: final.profileImage || '',
          background_image: final.backgroundImage || '',
        }, token);
      }

      const res = await fetch(`/api/cvs/${id}/pdf`);
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `CV_${cvData.title || 'cv'}.pdf`;
      document.body.appendChild(a); a.click(); URL.revokeObjectURL(url); a.remove();
      toast.success('PDF ladattu!');
    } catch { toast.error('PDF:n luonti epäonnistui'); }
    finally { setIsDownloading(false); }
  };

  // ── Delete CV ──────────────────────────────────────────────────────
  const handleDeleteCV = async () => {
    if (!confirm('Poista tämä CV?')) return;
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token || !userId) return;
      await deleteCV(id, userId, token);
      toast.success('Poistettu'); router.push('/my-cvs');
    } catch { toast.error('Poisto epäonnistui'); }
  };

  // ── Template render ────────────────────────────────────────────────
  const renderTemplate = () => {
    if (!cvData) return null;
    const cvd = cvData.cv_data || cvData.content?.cv_data || {};
    const aid = cvData.ai_data || cvData.content?.ai_data || {};
    const type = cvd?.cvType || aid?.cv_type || cvData.metadata?.cv_type || 'simple';
    const Comp: any = type === 'technical' ? TechnicalCVTemplate : type === 'creative' ? CreativeCVTemplate : SimpleCVTemplate;
    return (
      <CVContainer>
        <Comp data={cvd} aiData={aid} isEditing={isEditing}
          onUpdate={handleUpdate} onDelete={handleDelete}
          showEditControls={false} editMode={null}
          fontScale={fontScale} lineScale={lineScale} />
      </CVContainer>
    );
  };

  // ── Scale ──────────────────────────────────────────────────────────
  const A4_PX = 794;
  const scale = isMobile ? 0.42 : previewWidth > 0 ? Math.min(1, (previewWidth - 32) / A4_PX) : 0.78;

  if (isLoading || !cvData) return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] flex flex-col items-center justify-center">
      <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
      <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan...</p>
    </div>
  );

  const currentProfile = cvData.cv_data?.profileImage || cvData.ai_data?.profile_image || '';
  const currentBg = cvData.cv_data?.backgroundImage || cvData.ai_data?.background_image || '';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#030711] text-gray-900 dark:text-[#e7e3dc]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* TOP BAR */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button onClick={() => router.push('/my-cvs')} className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <FileText className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <h1 className="text-sm sm:text-lg font-black truncate">{cvData.title || cvData.cv_data?.name || 'Nimetön CV'}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isEditing && (
              <button onClick={undo} title="Kumoa (Ctrl+Z)" className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all flex items-center justify-center">
                <Undo2 className="w-4 h-4" />
              </button>
            )}
            {!isEditing
              ? <button onClick={() => setIsEditing(true)} className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl flex items-center gap-2 shadow-lg text-xs sm:text-sm font-bold">
                <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Muokkaa</span>
              </button>
              : <>
                <button onClick={() => setIsEditing(false)} className="px-3 h-9 sm:h-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 text-xs sm:text-sm font-semibold flex items-center gap-1">
                  <Eye className="w-3 h-3 sm:w-4 sm:h-4" /><span className="hidden sm:inline">Esikatsele</span>
                </button>
                <button onClick={handleSave} disabled={isSaving} className="px-3 sm:px-4 h-9 sm:h-11 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50 text-xs sm:text-sm font-bold">
                  {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 sm:w-4 sm:h-4" />}
                  <span className="hidden sm:inline">Tallenna</span>
                </button>
              </>
            }
            <button onClick={handleDownloadPDF} disabled={isDownloading} className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center">
              {isDownloading ? <Loader2 className="w-4 h-4 animate-spin text-orange-500" /> : <Download className="w-4 h-4" />}
            </button>
            <button onClick={handleDeleteCV} className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center">
              <Trash2 className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isEditing && (
          <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border-2 border-orange-200 dark:border-orange-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-1">✏️ Muokkaustila</h4>
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  Klikkaa tekstiä muokataksesi · <strong>▲▼</strong> järjestelee · <strong>✕</strong> poistaa · <strong>Ctrl+Z</strong> kumoaa
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-3 space-y-4">
            {/* Profile image */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded-xl"><User className="w-4 h-4 text-orange-500" /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Profiilikuva</h3>
              </div>
              <div className={`relative w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-4 border-orange-500/20 shadow-lg bg-gray-100 dark:bg-gray-800 ${isEditing ? 'cursor-pointer group' : ''}`}
                onClick={() => isEditing && setShowProfileModal(true)}>
                {currentProfile
                  ? <><img src={currentProfile} alt="Profile" className="w-full h-full object-cover" />{isEditing && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>}</>
                  : <div className="w-full h-full flex items-center justify-center"><User className="w-12 h-12 text-gray-400" /></div>}
              </div>
              {isEditing && (
                <button onClick={() => setShowProfileModal(true)} className="w-full px-4 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/20 text-orange-600 dark:text-orange-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Vaihda kuva
                </button>
              )}
            </div>

            {/* Background image */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-amber-500/10 border border-amber-500/20 p-2 rounded-xl"><ImageIconLucide className="w-4 h-4 text-amber-500" /></div>
                <h3 className="text-sm font-black uppercase tracking-wider">Taustakuva</h3>
              </div>
              {currentBg && (
                <div className={`relative w-full aspect-video mb-4 rounded-xl overflow-hidden border-2 border-amber-500/20 ${isEditing ? 'cursor-pointer group' : ''}`}
                  onClick={() => isEditing && setShowBgModal(true)}>
                  <img src={currentBg} alt="Background" className="w-full h-full object-cover" />
                  {isEditing && <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><Camera className="w-8 h-8 text-white" /></div>}
                </div>
              )}
              {isEditing && (
                <button onClick={() => setShowBgModal(true)} className="w-full px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  <Camera className="w-4 h-4" /> Vaihda taustakuva
                </button>
              )}
            </div>

            {/* Typography controls */}
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-violet-500/10 border border-violet-500/20 p-2 rounded-xl">
                  <svg className="w-4 h-4 text-violet-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V4h16v3M9 20h6M12 4v16" />
                  </svg>
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider">Typografia</h3>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Tiivistä sisältö yhdelle sivulle</p>

              {/* Font size — ✅ FIX: uses updateFontScale to save to cv_data */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Fonttikoko</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-violet-600 dark:text-violet-400 w-10 text-right">{Math.round(fontScale * 100)}%</span>
                    <button onClick={() => updateFontScale(1.0)} title="Palauta oletukseksi"
                      className="text-xs text-gray-400 hover:text-violet-500 transition-colors ml-1">↺</button>
                  </div>
                </div>
                <input type="range" min="70" max="115" step="1"
                  value={Math.round(fontScale * 100)}
                  onChange={e => updateFontScale(Number(e.target.value) / 100)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#8b5cf6' }}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>70%</span><span>Oletus (100%)</span><span>115%</span>
                </div>
              </div>

              {/* Line height — ✅ FIX: uses updateLineScale */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Riviväli</label>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-mono text-violet-600 dark:text-violet-400 w-10 text-right">{Math.round(lineScale * 100)}%</span>
                    <button onClick={() => updateLineScale(1.0)} title="Palauta oletukseksi"
                      className="text-xs text-gray-400 hover:text-violet-500 transition-colors ml-1">↺</button>
                  </div>
                </div>
                <input type="range" min="70" max="130" step="1"
                  value={Math.round(lineScale * 100)}
                  onChange={e => updateLineScale(Number(e.target.value) / 100)}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: '#8b5cf6' }}
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>Tiivis</span><span>Oletus</span><span>Väljä</span>
                </div>
              </div>

              {/* Quick presets — ✅ FIX: uses updateFontScale/updateLineScale */}
              <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 mb-2 font-semibold">Pikaasetukset</p>
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => { updateFontScale(0.85); updateLineScale(0.82); }}
                    className="text-xs px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg font-semibold transition-colors">
                    Kompakti
                  </button>
                  <button onClick={() => { updateFontScale(1.0); updateLineScale(1.0); }}
                    className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg font-semibold transition-colors">
                    Oletus
                  </button>
                  <button onClick={() => { updateFontScale(1.08); updateLineScale(1.15); }}
                    className="text-xs px-3 py-1.5 bg-violet-500/10 hover:bg-violet-500/20 text-violet-600 dark:text-violet-400 rounded-lg font-semibold transition-colors">
                    Väljä
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-9">
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-4">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs text-gray-400 font-mono">{Math.round(scale * 100)}% · A4</span>
                {isEditing && <span className="text-xs text-orange-500 font-semibold">▲▼ järjestele · ✕ poista · klikkaa muokkaa</span>}
              </div>

              <div ref={previewContainerRef} className="relative bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800" style={{ overflowX: 'hidden', overflowY: 'auto' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `calc(${scale * 100}% - 100%)` }}>
                  {/* Page boundary overlays */}
                  {[1, 2].map(p => (
                    <div key={p} style={{ position: 'absolute', top: `${p * 297}mm`, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
                      <div style={{ borderTop: `2px dashed ${p === 1 ? '#ef4444' : '#3b82f6'}`, position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-11px', right: '8px', background: p === 1 ? '#ef4444' : '#3b82f6', color: 'white', fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {p === 1 ? '↑ Sivu 1 · Sivu 2 ↓' : 'Sivu 3 ↓'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className={`bg-white shadow-2xl ${isEditing ? 'ring-2 ring-orange-400/30' : ''}`} style={{ width: '210mm', minHeight: '297mm' }}>
                    {renderTemplate()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Profile image */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2"><User className="w-6 h-6 text-orange-500" />Profiilikuva</h3>
              <button onClick={() => setShowProfileModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 border-2 border-dashed border-orange-500/30 text-orange-600 rounded-xl text-sm font-bold mb-6">
                <Upload className="w-5 h-5" />Lataa uusi kuva
                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'profileImage')} />
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {availableImages.profileImages.map(img => (
                  <button key={img.id} onClick={() => handleSelectImage(img, 'profileImage')}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all relative ${currentProfile === img.signedUrl ? 'border-orange-500 ring-4 ring-orange-500/30 scale-95' : 'border-gray-200 hover:border-orange-300 hover:scale-105'}`}>
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && <div className="absolute bottom-1 right-1 bg-purple-500 rounded-lg p-1"><Sparkles className="w-3 h-3 text-white" /></div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Background image */}
      {showBgModal && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2"><ImageIconLucide className="w-6 h-6 text-amber-500" />Taustakuva</h3>
              <button onClick={() => setShowBgModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-amber-500/10 hover:bg-amber-500/20 border-2 border-dashed border-amber-500/30 text-amber-600 rounded-xl text-sm font-bold mb-6">
                <Upload className="w-5 h-5" />Lataa uusi taustakuva
                <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'backgroundImage')} />
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {availableImages.backgroundImages.map(img => (
                  <button key={img.id} onClick={() => handleSelectImage(img, 'backgroundImage')}
                    className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${currentBg === img.signedUrl ? 'border-amber-500 ring-4 ring-amber-500/30 scale-95' : 'border-gray-200 hover:border-amber-300 hover:scale-105'}`}>
                    <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                    {img.is_ai_generated && <div className="absolute top-2 right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI</div>}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}