'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Save, ArrowLeft, Trash2, Download, Loader2,
  Upload, User, Image as ImageIconLucide, Sparkles,
  Eye, Edit3, FileText, X, Camera, Undo2, Briefcase, Plus
} from 'lucide-react';
import { fetchCVById, updateCV, deleteCV } from '@/services/cvService-client';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import SimpleCVTemplate from '@/components/cv/CVSimpleTemplate';
import TechnicalCVTemplate, { type SectionScales, type ColumnScales, type LayoutConfig } from '@/components/cv/CVTemplateTechnical';
import CreativeCVTemplate from '@/components/cv/CVCreativeTemplate';
import CVContainer from '@/components/cv/CVContainer';
import { toast } from 'sonner';

import { mapProfileJobToStructured, jobLikelyExists, mapProfileProjectToStructured, projectLikelyExists, mapProfileEducationToStructured, educationLikelyExists, type StructuredExperience, type StructuredProject, type StructuredEducation, experienceKey } from '@/lib/cv/profileToStructured';
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
const [profileProjects, setProfileProjects] = useState<StructuredProject[]>([]);
  const [cvData, setCvData] = useState<BaseCV | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [previewWidth, setPreviewWidth] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  // A4-mittaus: viittaus CV-sisältöön + mitattu korkeus
  const cvInnerRef = useRef<HTMLDivElement>(null);
  const [contentHeightPx, setContentHeightPx] = useState(0);
const [loadKey, setLoadKey] = useState(0);
const [profileJobs, setProfileJobs] = useState<StructuredExperience[]>([]);
const [profileEducation, setProfileEducation] = useState<StructuredEducation[]>([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showBgModal, setShowBgModal] = useState(false);
  // Vaihe 3: esikatselu-bongahdus + mobiilivälilehti
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [mobileTab, setMobileTab] = useState<'edit' | 'preview'>('edit');
  const [showMiniPreview, setShowMiniPreview] = useState(true);
  // Ehdotusten pudotusvalikot (työ / projektit)
  const [openSuggest, setOpenSuggest] = useState<null | 'jobs' | 'projects' | 'education'>(null);
  const [availableImages, setAvailableImages] = useState<{
    profileImages: UserImage[]; backgroundImages: UserImage[];
  }>({ profileImages: [], backgroundImages: [] });

  // ── Typography controls ────────────────────────────────────────────
  const [fontScale, setFontScale] = useState(1.0);
  const [lineScale, setLineScale] = useState(1.0);

  // ── Per-osio / per-palsta tilankäyttö ──────────────────────────────
  const [sectionScales, setSectionScales] = useState<SectionScales>({});
  const [columnScales, setColumnScales] = useState<ColumnScales>({ left: 1, right: 1 });
  const [layout, setLayout] = useState<LayoutConfig>({ leftColumnMm: 70, bannerHeightMm: 85 });

  // Osiot joita voi säätää (tunniste + näyttönimi)
  const SECTION_DEFS: { id: string; label: string; column: 'left' | 'right' }[] = [
    { id: 'experience', label: 'Työkokemus', column: 'right' },
    { id: 'education', label: 'Koulutus', column: 'right' },
    { id: 'projects', label: 'Projektit', column: 'right' },
    { id: 'languages', label: 'Kielet', column: 'right' },
    { id: 'skills', label: 'Taidot (vasen palsta)', column: 'left' },
  ];

  // Simple-templaten lohkot (kertova rakenne, vapaa asettelu)
  const SIMPLE_BLOCK_DEFS: { id: string; label: string; column: 'left' | 'right' }[] = [
    { id: 'photo', label: 'Profiilikuvan koko', column: 'right' },
    { id: 'main', label: 'Pääkertomus', column: 'right' },
    { id: 'intro', label: 'Esittely', column: 'right' },
    { id: 'strengths', label: 'Vahvuudet', column: 'right' },
    { id: 'goals', label: 'Tavoitteet', column: 'right' },
  ];

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
      setFontScale(parsed.cv_data?.fontScale ?? 1.0);
      setLineScale(parsed.cv_data?.lineScale ?? 1.0);
      setSectionScales(parsed.cv_data?.sectionScales ?? {});
      setColumnScales(parsed.cv_data?.columnScales ?? { left: 1, right: 1 });
      setLayout(parsed.cv_data?.layout ?? { leftColumnMm: 70, bannerHeightMm: 85 });
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
  // ÄLÄ lataa uudelleen kun käyttäjä muokkaa — se ylikirjoittaisi muokkaukset
  if (isEditing) return;

  const onFocus = () => setLoadKey(k => k + 1);
  const onVisibility = () => {
    if (document.visibilityState === 'visible') setLoadKey(k => k + 1);
  };
  window.addEventListener('focus', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
  };
}, [isEditing]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (previewContainerRef.current) setPreviewWidth(previewContainerRef.current.offsetWidth);
    }, 120);
    return () => clearTimeout(t);
  }, [cvData, isEditing]);

  // ── Esikatselumodaali: takaisin-painike sulkee (mobiili) ───────────
  useEffect(() => {
    if (!showPreviewModal) return;
    window.history.pushState({ previewModal: true }, '');
    const onPop = () => setShowPreviewModal(false);
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (window.history.state?.previewModal) {
        window.history.back();
      }
    };
  }, [showPreviewModal]);

  // ── A4-mahtuvuusmittari: mittaa CV-sisällön todellinen korkeus ──────
  // scrollHeight antaa sisällön korkeuden pikseleinä ENNEN scale-transformia.
  useEffect(() => {
    const measure = () => {
      if (cvInnerRef.current) {
        setContentHeightPx(cvInnerRef.current.scrollHeight);
      }
    };
    // Pieni viive jotta DOM ehtii renderöityä uusilla skaaloilla
    const t = setTimeout(measure, 150);
    return () => clearTimeout(t);
  }, [cvData, fontScale, lineScale, sectionScales, columnScales, layout, isEditing]);

  // ── Load CV ────────────────────────────────────────────────────────
    useEffect(() => {
    const init = async () => {
      if (!userId || !id) return;
      // Jos käyttäjä muokkaa parhaillaan, ÄLÄ lataa kannasta päälle
      if (isEditing && loadKey > 0) return;
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

        setFontScale(cvDataParsed.fontScale ?? 1.0);
        setLineScale(cvDataParsed.lineScale ?? 1.0);
        setSectionScales(cvDataParsed.sectionScales ?? {});
        setColumnScales(cvDataParsed.columnScales ?? { left: 1, right: 1 });
        setLayout(cvDataParsed.layout ?? { leftColumnMm: 70, bannerHeightMm: 85 });

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
}, [id, userId, getToken, loadKey]);
useEffect(() => {
    const loadProfileData = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/user-profile/${userId}`);
        if (!res.ok) return;
        const profile = await res.json();
        const jobs = Array.isArray(profile?.work_experience) ? profile.work_experience : [];
        setProfileJobs(jobs.map(mapProfileJobToStructured));
        const ports = Array.isArray(profile?.portfolio_links) ? profile.portfolio_links : [];
        setProfileProjects(ports.map(mapProfileProjectToStructured));
        const edus = Array.isArray(profile?.education) ? profile.education : [];
setProfileEducation(edus.map(mapProfileEducationToStructured));
      } catch {
      }
    };
    loadProfileData();
  }, [userId]);
  // ── handleUpdate ───────────────────────────────────────────────────
 const handleUpdate = useCallback((field: string, value: any) => {
  console.log('UPDATE field:', field, 'value:', value);
  setCvData(prev => {
    console.log('  education BEFORE:', JSON.stringify(prev?.cv_data?.education));
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
            // String → yritä parsia JSON:ksi; säilytä data jos mahdollista
            try { const parsed = JSON.parse(cur[p]); cur[p] = (parsed && typeof parsed === 'object') ? parsed : (nextIsIndex ? [] : {}); }
            catch { cur[p] = nextIsIndex ? [] : {}; }
          }
          // ── KRIITTINEN: ÄLÄ tuhoa olemassa olevaa dataa. Muunna se. ──
          if (nextIsIndex && !Array.isArray(cur[p]) && typeof cur[p] === 'object') {
            // Objekti jossa numeroavaimet → taulukko (säilyttää sisällön)
            const keys = Object.keys(cur[p]);
            const allNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
            if (allNumeric) {
              const arr: any[] = [];
              keys.map(Number).sort((a, b) => a - b).forEach(n => { arr[n] = cur[p][n]; });
              cur[p] = arr;
            } else {
              // Tyhjä objekti → turvallista tehdä taulukko
              cur[p] = [];
            }
          }
          if (!nextIsIndex && Array.isArray(cur[p])) {
            // Taulukko mutta seuraava on nimetty avain → muunna objektiksi vain jos tyhjä
            if (cur[p].length === 0) cur[p] = {};
            // (jos taulukossa on dataa, jätetään se — nimetty avain lisätään taulukko-objektiin)
          }
          cur = cur[p];
        }
      const last = parts[parts.length - 1];
if (!isNaN(Number(last))) {
  const idx = Number(last);
  if (Array.isArray(cur)) {
    while (cur.length < idx) cur.push({});
    cur[idx] = val;
  } else if (cur && typeof cur === 'object') {
    cur[last] = val;
  }
} else { if (cur && typeof cur === 'object') cur[last] = val; }      };

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
    console.log('  education AFTER:', JSON.stringify(updated.cv_data?.education));

      return updated;
    });
  }, [pushHistory]);
  const handleAddJobFromProfile = useCallback((job: StructuredExperience) => {
    const len = Array.isArray(cvData?.cv_data?.experience)
      ? cvData.cv_data.experience.length
      : 0;
    handleUpdate(`experience.${len}`, job);
    toast.success(`Lisätty: ${job.title}${job.company ? ` — ${job.company}` : ''}`);
  }, [cvData, handleUpdate]);
  const handleAddProjectFromProfile = useCallback((proj: StructuredProject) => {
    const len = Array.isArray(cvData?.cv_data?.projects)
      ? cvData.cv_data.projects.length
      : 0;
    handleUpdate(`projects.${len}`, proj);
    toast.success(`Lisätty projekti: ${proj.title}`);
  }, [cvData, handleUpdate]);
  const handleAddEducationFromProfile = useCallback((edu: StructuredEducation) => {
  const len = Array.isArray(cvData?.cv_data?.education)
    ? cvData.cv_data.education.length
    : 0;
  handleUpdate(`education.${len}`, edu);
  toast.success(`Lisätty koulutus: ${edu.degree || edu.school || ''}`);
}, [cvData, handleUpdate]);
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

  const updateFontScale = useCallback((val: number) => {
    setFontScale(val);
    handleUpdate('fontScale', val);
  }, [handleUpdate]);

  const updateLineScale = useCallback((val: number) => {
    setLineScale(val);
    handleUpdate('lineScale', val);
  }, [handleUpdate]);

  // ── Per-osio / per-palsta säätö ────────────────────────────────────
  const updateSectionScale = useCallback((sectionId: string, key: 'fontScale' | 'gap' | 'widthPct', val: number) => {
    setSectionScales(prev => {
      const cur = prev[sectionId] ?? { fontScale: 1, gap: 1, hidden: false };
      const next = { ...prev, [sectionId]: { ...cur, [key]: val } };
      handleUpdate('sectionScales', next);
      return next;
    });
  }, [handleUpdate]);

  const updateSectionAlign = useCallback((sectionId: string, align: 'left' | 'right' | 'full') => {
    setSectionScales(prev => {
      const cur = prev[sectionId] ?? { fontScale: 1, gap: 1, hidden: false };
      // Kun valitaan full, leveys 100%; muuten oletus 50% jos ei vielä asetettu
      const widthPct = align === 'full' ? 100 : (cur.widthPct && cur.widthPct < 100 ? cur.widthPct : 50);
      const next = { ...prev, [sectionId]: { ...cur, align, widthPct } };
      handleUpdate('sectionScales', next);
      return next;
    });
  }, [handleUpdate]);

  const toggleSectionHidden = useCallback((sectionId: string) => {
    setSectionScales(prev => {
      const cur = prev[sectionId] ?? { fontScale: 1, gap: 1, hidden: false };
      const next = { ...prev, [sectionId]: { ...cur, hidden: !cur.hidden } };
      handleUpdate('sectionScales', next);
      return next;
    });
  }, [handleUpdate]);

  const updateColumnScale = useCallback((col: 'left' | 'right', val: number) => {
    setColumnScales(prev => {
      const next = { ...prev, [col]: val };
      handleUpdate('columnScales', next);
      return next;
    });
  }, [handleUpdate]);

  const updateLayout = useCallback((key: 'leftColumnMm' | 'bannerHeightMm', val: number) => {
    setLayout(prev => {
      const next = { ...prev, [key]: val };
      handleUpdate('layout', next);
      return next;
    });
  }, [handleUpdate]);

  const resetSectionScales = useCallback(() => {
    setSectionScales({});
    setColumnScales({ left: 1, right: 1 });
    setLayout({ leftColumnMm: 70, bannerHeightMm: 85 });
    handleUpdate('sectionScales', {});
    handleUpdate('columnScales', { left: 1, right: 1 });
    handleUpdate('layout', { leftColumnMm: 70, bannerHeightMm: 85 });
  }, [handleUpdate]);

  // ── Save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cvData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (!token) throw new Error('No token');

      const final = {
        ...(cvData.cv_data || cvData.content?.cv_data || {}),
        fontScale,
        lineScale,
        sectionScales,
        columnScales,
        layout,
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

    setIsDownloading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        const final = {
          ...(cvData.cv_data || cvData.content?.cv_data || {}),
          fontScale,
          lineScale,
          sectionScales,
          columnScales,
          layout,
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
  const renderTemplate = (editingOverride?: boolean) => {
    if (!cvData) return null;
    const cvd = cvData.cv_data || cvData.content?.cv_data || {};
    const aid = cvData.ai_data || cvData.content?.ai_data || {};
    const type = cvd?.cvType || aid?.cv_type || cvData.metadata?.cv_type || 'simple';
    const Comp: any = type === 'technical' ? TechnicalCVTemplate : type === 'creative' ? CreativeCVTemplate : SimpleCVTemplate;
    const editing = editingOverride ?? isEditing;
    return (
      <CVContainer>
        <Comp data={cvd} aiData={aid} isEditing={editing}
          onUpdate={handleUpdate} onDelete={handleDelete}
          showEditControls={false} editMode={null}
          fontScale={fontScale} lineScale={lineScale}
          sectionScales={sectionScales} columnScales={columnScales}
          layout={layout} />
      </CVContainer>
    );
  };
  const cvType = cvData?.cv_data?.cvType || cvData?.ai_data?.cv_type || cvData?.metadata?.cv_type || 'simple';
  const isCreative = cvType === 'creative';

  const currentExperience: any[] = Array.isArray(cvData?.cv_data?.experience)
    ? cvData.cv_data.experience
    : [];

  const existingKeys = new Set(
    currentExperience.map((e: any) => experienceKey(e?.company, e?.title || e?.position))
  );

  const missingJobs = profileJobs.filter(
    (job) => !jobLikelyExists(job, currentExperience)
  );
  const currentProjects: any[] = Array.isArray(cvData?.cv_data?.projects)
    ? cvData.cv_data.projects
    : [];

  const missingProjects = profileProjects.filter(
    (proj) => !projectLikelyExists(proj, currentProjects)
  );
  const currentEducation: any[] = Array.isArray(cvData?.cv_data?.education)
  ? cvData.cv_data.education
  : [];

const missingEducation = profileEducation.filter(
  (edu) => !educationLikelyExists(edu, currentEducation)
);
  // ── Scale ──────────────────────────────────────────────────────────
  const A4_PX = 794;
  const scale = isMobile ? 0.42 : previewWidth > 0 ? Math.min(1, (previewWidth - 32) / A4_PX) : 0.78;

  // ── A4-mahtuvuus ────────────────────────────────────────────────────
  // Yksi A4 = 297mm. Selaimessa 1mm ≈ 3.7795px → 297mm ≈ 1122.5px.
  const A4_HEIGHT_PX = 1122.5;
  // Pieni toleranssi (n. 1 %) jotta rajatapaus ei vilku turhaan
  const TOLERANCE = A4_HEIGHT_PX * 0.01;
  const pages = contentHeightPx > 0 ? contentHeightPx / A4_HEIGHT_PX : 1;
  const fitsOnePage = contentHeightPx > 0 && contentHeightPx <= (A4_HEIGHT_PX + TOLERANCE);
  // Kuinka monta prosenttia yli/ali yhden sivun
  const fillPercent = contentHeightPx > 0 ? Math.round((contentHeightPx / A4_HEIGHT_PX) * 100) : 0;

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
            <button onClick={() => setShowPreviewModal(true)} title="Esikatsele tulostusasu" className="p-2 h-9 sm:h-11 w-9 sm:w-11 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-500" />
            </button>
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

        {/* Mobiilivälilehdet: Muokkaa / Esikatselu (vain mobiili, vain muokkaustila) */}
        {isEditing && (
          <div className="lg:hidden mb-4 flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl">
            <button
              onClick={() => setMobileTab('edit')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mobileTab === 'edit'
                  ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 shadow'
                  : 'text-gray-500'
              }`}
            >
              <Edit3 className="w-4 h-4" /> Muokkaa
            </button>
            <button
              onClick={() => setMobileTab('preview')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mobileTab === 'preview'
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow'
                  : 'text-gray-500'
              }`}
            >
              <Eye className="w-4 h-4" /> Esikatselu
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          {/* Sidebar — desktopissa vasemmalla (order-2), mobiilissa previewn jälkeen (order-2) */}
          <div className={`lg:col-span-3 space-y-4 order-2 lg:order-1 ${isEditing && mobileTab === 'preview' ? 'hidden lg:block' : ''}`}>
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

            {/* Osioiden tilankäyttö — technical ja simple */}
            {isEditing && (cvType === 'technical' || cvType === 'simple') && (
              <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-teal-500/10 border border-teal-500/20 p-2 rounded-xl">
                      <svg className="w-4 h-4 text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="7" rx="1" /><rect x="3" y="14" width="18" height="7" rx="1" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Osioiden tila</h3>
                  </div>
                  <button onClick={resetSectionScales} title="Palauta kaikki oletuksiksi"
                    className="text-xs text-gray-400 hover:text-teal-500 transition-colors">↺ Nollaa</button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Säädä kuinka paljon tilaa kukin osio vie</p>

                {/* Palstojen mitat: leveys (vain technical) + bannerin korkeus (molemmat) */}
                <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Asettelu</p>
                  {cvType === 'technical' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Vasemman palstan leveys</label>
                      <span className="text-xs font-mono text-teal-600 dark:text-teal-400">{layout.leftColumnMm}mm</span>
                    </div>
                    <input type="range" min="50" max="95" step="1"
                      value={layout.leftColumnMm}
                      onChange={e => updateLayout('leftColumnMm', Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: '#14b8a6' }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>Kapea</span><span>Leveä (kuva + taidot)</span>
                    </div>
                  </div>
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Yläbannerin korkeus</label>
                      <span className="text-xs font-mono text-teal-600 dark:text-teal-400">{layout.bannerHeightMm}mm</span>
                    </div>
                    <input type="range" min="50" max="120" step="1"
                      value={layout.bannerHeightMm}
                      onChange={e => updateLayout('bannerHeightMm', Number(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: '#14b8a6' }}
                    />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                      <span>Matala</span><span>Korkea (kuva + nimi)</span>
                    </div>
                  </div>
                </div>

                {/* Palstakohtainen fonttiskaala — vain technical */}
                {cvType === 'technical' && (
                <div className="mb-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">Palstojen fonttikoko</p>
                  {([
                    { col: 'left' as const, label: 'Vasen (taidot)' },
                    { col: 'right' as const, label: 'Oikea (sisältö)' },
                  ]).map(({ col, label }) => (
                    <div key={col} className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</label>
                        <span className="text-xs font-mono text-teal-600 dark:text-teal-400">{Math.round((columnScales[col] ?? 1) * 100)}%</span>
                      </div>
                      <input type="range" min="70" max="120" step="1"
                        value={Math.round((columnScales[col] ?? 1) * 100)}
                        onChange={e => updateColumnScale(col, Number(e.target.value) / 100)}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: '#14b8a6' }}
                      />
                    </div>
                  ))}
                </div>
                )}

                {/* Osiokohtainen säätö */}
                <p className="text-xs font-bold text-gray-600 dark:text-gray-400 mb-3 uppercase tracking-wide">{cvType === 'simple' ? 'Lohkot' : 'Osiot'}</p>
                <div className="space-y-4">
                  {(cvType === 'simple' ? SIMPLE_BLOCK_DEFS : SECTION_DEFS).map(({ id: sid, label }) => {
                    const sec = sectionScales[sid] ?? { fontScale: 1, gap: 1, hidden: false };
                    const isSimpleBlock = cvType === 'simple' && sid !== 'photo';
                    return (
                      <div key={sid} className={`p-3 rounded-xl border ${sec.hidden ? 'border-gray-200 dark:border-gray-800 opacity-60' : 'border-teal-500/20 bg-teal-500/[0.03]'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}</span>
                          <button onClick={() => toggleSectionHidden(sid)}
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md transition-colors ${sec.hidden ? 'bg-gray-200 dark:bg-gray-700 text-gray-500' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'}`}>
                            {sec.hidden ? 'Piilotettu' : 'Näkyvissä'}
                          </button>
                        </div>
                        {!sec.hidden && (
                          <>
                            <div className="mb-2">
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] text-gray-500">{sid === 'photo' ? 'Kuvan koko' : 'Fonttikoko'}</label>
                                <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">{Math.round((sec.fontScale ?? 1) * 100)}%</span>
                              </div>
                              <input type="range" min={sid === 'photo' ? 50 : 70} max={sid === 'photo' ? 160 : 120} step="1"
                                value={Math.round((sec.fontScale ?? 1) * 100)}
                                onChange={e => updateSectionScale(sid, 'fontScale', Number(e.target.value) / 100)}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: '#14b8a6' }}
                              />
                            </div>
                            {sid !== 'photo' && (
                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-[11px] text-gray-500">Väli osion jälkeen</label>
                                <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">{Math.round((sec.gap ?? 1) * 100)}%</span>
                              </div>
                              <input type="range" min="30" max="180" step="5"
                                value={Math.round((sec.gap ?? 1) * 100)}
                                onChange={e => updateSectionScale(sid, 'gap', Number(e.target.value) / 100)}
                                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                style={{ accentColor: '#14b8a6' }}
                              />
                            </div>
                            )}

                            {/* Sijainti + leveys — vain Simplen tekstilohkoille */}
                            {isSimpleBlock && (
                              <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                                <label className="text-[11px] text-gray-500 block mb-1">Sijainti</label>
                                <div className="flex gap-1 mb-2">
                                  {([
                                    { v: 'full' as const, t: 'Täysi' },
                                    { v: 'left' as const, t: 'Vasen' },
                                    { v: 'right' as const, t: 'Oikea' },
                                  ]).map(({ v, t }) => (
                                    <button key={v} onClick={() => updateSectionAlign(sid, v)}
                                      className={`flex-1 text-[10px] font-bold py-1 rounded-md transition-colors ${
                                        (sec.align ?? 'full') === v
                                          ? 'bg-teal-500 text-white'
                                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-teal-500/15'
                                      }`}>
                                      {t}
                                    </button>
                                  ))}
                                </div>
                                {(sec.align ?? 'full') !== 'full' && (
                                  <div>
                                    <div className="flex items-center justify-between mb-0.5">
                                      <label className="text-[11px] text-gray-500">Leveys</label>
                                      <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400">{sec.widthPct ?? 50}%</span>
                                    </div>
                                    <input type="range" min="30" max="100" step="5"
                                      value={sec.widthPct ?? 50}
                                      onChange={e => updateSectionScale(sid, 'widthPct', Number(e.target.value))}
                                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                                      style={{ accentColor: '#14b8a6' }}
                                    />
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* OIKEA SARAKE: preview (sticky) + ehdotukset.
              Mobiilissa ensin (order-1), desktopissa oikealla (order-2). */}
          <div className={`lg:col-span-9 order-1 lg:order-2 space-y-4 ${isEditing && mobileTab === 'edit' ? 'hidden lg:block' : ''}`}>
          {/* Ehdotukset profiilista — kompaktit plus-napit (näkyy previewn yläpuolella) */}
          {isEditing && (missingJobs.length > 0 || missingProjects.length > 0  || missingEducation.length > 0) && (
            <div className="flex flex-wrap items-start gap-2">

              {/* Työkokemus + */}
              {missingJobs.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOpenSuggest(openSuggest === 'jobs' ? null : 'jobs')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      openSuggest === 'jobs'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    Työkokemus
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500/20 text-[10px]">{missingJobs.length}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {openSuggest === 'jobs' && (
                    <div className="absolute left-0 top-full mt-1 z-30 w-72 max-w-[80vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto">
                      <p className="text-[11px] text-gray-500 px-2 py-1">Profiilistasi löytyi, ei vielä CV:ssä:</p>
                      {isCreative && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 px-2 py-1">Huom: luova pohja ei näytä erikseen lisättyä työkokemusta esikatselussa.</p>
                      )}
                      {missingJobs.map((job, idx) => (
                        <button
                          key={idx}
                          onClick={() => { handleAddJobFromProfile(job); }}
                          className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-blue-500/10 text-left transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{job.title}{job.company ? ` — ${job.company}` : ''}</span>
                            {job.period && <span className="block text-xs text-gray-500 truncate">{job.period}</span>}
                          </span>
                          <Plus className="w-4 h-4 text-blue-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Projektit + */}
              {missingProjects.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setOpenSuggest(openSuggest === 'projects' ? null : 'projects')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                      openSuggest === 'projects'
                        ? 'bg-violet-500 text-white border-violet-500'
                        : 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Projektit
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-violet-500/20 text-[10px]">{missingProjects.length}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {openSuggest === 'projects' && (
                    <div className="absolute left-0 top-full mt-1 z-30 w-72 max-w-[80vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto">
                      <p className="text-[11px] text-gray-500 px-2 py-1">Profiilisi projektit, ei vielä CV:ssä:</p>
                      {missingProjects.map((proj, idx) => (
                        <button
                          key={idx}
                          onClick={() => { handleAddProjectFromProfile(proj); }}
                          className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-violet-500/10 text-left transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{proj.title}</span>
                            {proj.link && <span className="block text-xs text-violet-500 truncate">{proj.link}</span>}
                          </span>
                          <Plus className="w-4 h-4 text-violet-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
{/* Koulutus + */}
{missingEducation.length > 0 && (
  <div className="relative">
    <button
      onClick={() => setOpenSuggest(openSuggest === 'education' ? null : 'education')}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
        openSuggest === 'education'
          ? 'bg-emerald-500 text-white border-emerald-500'
          : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
      }`}
    >
      <FileText className="w-3.5 h-3.5" />
      Koulutus
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500/20 text-[10px]">{missingEducation.length}</span>
      <Plus className="w-3.5 h-3.5" />
    </button>
    {openSuggest === 'education' && (
      <div className="absolute left-0 top-full mt-1 z-50 w-72 max-w-[80vw] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 max-h-72 overflow-y-auto">
        <p className="text-[11px] text-gray-500 px-2 py-1">Profiilisi koulutukset, ei vielä CV:ssä:</p>
        {missingEducation.map((edu, idx) => (
          <button
            key={idx}
            onClick={() => { handleAddEducationFromProfile(edu); setOpenSuggest(null); }}
            className="w-full flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-emerald-500/10 text-left transition-colors"
          >
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-gray-900 dark:text-white truncate">{edu.degree || edu.school}</span>
              {edu.school && edu.degree && <span className="block text-xs text-gray-500 truncate">{edu.school}{edu.year ? ` · ${edu.year}` : ''}</span>}
            </span>
            <Plus className="w-4 h-4 text-emerald-500 shrink-0" />
          </button>
        ))}
      </div>
    )}
  </div>
)}
            </div>
            
          )}
          {/* Preview — sticky, pysyy näkyvissä kun säätimet vierivät */}
          <div className="lg:sticky lg:top-24 self-start">
            <div className="bg-white/80 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl p-2 sm:p-4">
              <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-xs text-gray-400 font-mono">{Math.round(scale * 100)}% · A4</span>
                {isEditing && <span className="text-xs text-orange-500 font-semibold">▲▼ järjestele · ✕ poista · klikkaa muokkaa</span>}
              </div>

              {/* A4-mahtuvuusmittari */}
              {contentHeightPx > 0 && (
                <div className={`mx-2 mb-3 px-3 py-2 rounded-xl border flex items-center gap-3 ${
                  fitsOnePage
                    ? 'bg-green-500/10 border-green-500/30'
                    : pages <= 1.15
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <div className="shrink-0">
                    {fitsOnePage ? (
                      <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center text-green-600 dark:text-green-400 text-sm font-bold">✓</div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 text-sm font-bold">!</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${
                      fitsOnePage ? 'text-green-700 dark:text-green-400' : pages <= 1.15 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {fitsOnePage
                        ? 'Mahtuu yhdelle A4-sivulle'
                        : pages <= 1.15
                          ? 'Hieman yli yhden sivun'
                          : `Sisältö vie ~${Math.ceil(pages)} sivua`}
                    </p>
                    {!fitsOnePage && (
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                        Pienennä fonttia, rivivälejä tai osioiden tilaa saadaksesi yhdelle sivulle.
                      </p>
                    )}
                    {/* Täyttöpalkki: kuinka täynnä A4 on */}
                    <div className="mt-1.5 w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${
                        fitsOnePage ? 'bg-green-500' : pages <= 1.15 ? 'bg-amber-500' : 'bg-red-500'
                      }`} style={{ width: `${Math.min(100, fillPercent)}%` }} />
                    </div>
                  </div>
                  <span className={`shrink-0 text-xs font-mono font-bold ${
                    fitsOnePage ? 'text-green-600 dark:text-green-400' : pages <= 1.15 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                  }`}>{fillPercent}%</span>
                </div>
              )}

              <div ref={previewContainerRef} className="relative bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-200 dark:border-gray-800" style={{ overflowX: 'hidden', overflowY: 'auto', maxHeight: 'calc(100vh - 8rem)' }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center', marginBottom: `calc(${scale * 100}% - 100%)` }}>
                  {[1, 2].map(p => (
                    <div key={p} style={{ position: 'absolute', top: `${p * 297}mm`, left: 0, right: 0, zIndex: 30, pointerEvents: 'none' }}>
                      <div style={{ borderTop: `2px dashed ${p === 1 ? '#ef4444' : '#3b82f6'}`, position: 'relative' }}>
                        <span style={{ position: 'absolute', top: '-11px', right: '8px', background: p === 1 ? '#ef4444' : '#3b82f6', color: 'white', fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          {p === 1 ? '↑ Sivu 1 · Sivu 2 ↓' : 'Sivu 3 ↓'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div ref={cvInnerRef} className={`bg-white shadow-2xl ${isEditing ? 'ring-2 ring-orange-400/30' : ''}`} style={{ width: '210mm', minHeight: '297mm' }}>
                    {renderTemplate()}
                  </div>
                </div>
              </div>
            </div>
          </div>


          </div>{/* /oikea sarake */}
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
      {/* Mobiili-pikkukuva: kelluva pieni CV oikeassa alakulmassa muokatessa.
          Näkyy vain mobiilissa, muokkaus-välilehdellä, ja jos käyttäjä ei ole sulkenut. */}
      {isEditing && mobileTab === 'edit' && showMiniPreview && (
        <div className="lg:hidden fixed bottom-4 right-4 z-[90]">
          <div className="relative">
            <button
              onClick={() => setShowMiniPreview(false)}
              className="absolute -top-2 -left-2 z-10 bg-gray-800 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-lg text-xs"
              title="Piilota pikkukuva"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowPreviewModal(true)}
              className="block rounded-xl overflow-hidden border-2 border-orange-400/60 shadow-2xl bg-white"
              style={{ width: '90px', height: '127px' }}
              title="Avaa esikatselu"
            >
              <div style={{ width: '210mm', transform: 'scale(0.114)', transformOrigin: 'top left', pointerEvents: 'none' }}>
                <div className="bg-white" style={{ width: '210mm', minHeight: '297mm' }}>
                  {renderTemplate(false)}
                </div>
              </div>
            </button>
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
              Esikatselu
            </span>
          </div>
        </div>
      )}

      {/* Pieni "näytä pikkukuva" -nappi jos suljettu */}
      {isEditing && mobileTab === 'edit' && !showMiniPreview && (
        <button
          onClick={() => setShowMiniPreview(true)}
          className="lg:hidden fixed bottom-4 right-4 z-[90] bg-orange-500 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-2xl"
          title="Näytä pikkukuva"
        >
          <Eye className="w-5 h-5" />
        </button>
      )}

      {/* Esikatselu-bongahdus: koko CV puhtaana (ei edit-merkkejä).
          Klikkaus taustaan sulkee. Itse CV:tä klikatessa ei sulje. */}
      {showPreviewModal && (() => {
        const previewScale = isMobile
          ? Math.min((typeof window !== 'undefined' ? window.innerWidth - 32 : 360) / 794, 0.45)
          : Math.min(0.85, (typeof window !== 'undefined' ? window.innerHeight - 100 : 900) / 1122.5);
        // A4 = 794px × 1122.5px (96dpi). Skaalatut mitat wräpperille:
        const wrapW = 794 * previewScale;
        const wrapH = 1122.5 * previewScale;
        return (
        <div
          className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-auto"
          onClick={() => setShowPreviewModal(false)}
        >
          <div
            className="relative my-auto"
            style={{ width: `${wrapW}px`, height: `${wrapH}px` }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sulkunappi */}
            <button
              onClick={() => setShowPreviewModal(false)}
              className="absolute -top-2 -right-2 sm:-top-3 sm:-right-3 z-10 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full w-9 h-9 flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              title="Sulje"
            >
              <X className="w-5 h-5" />
            </button>
            {/* A4 puhtaana, skaalattuna — wräpperi rajaa todellisen koon */}
            <div
              style={{
                width: '210mm',
                transform: `scale(${previewScale})`,
                transformOrigin: 'top left',
              }}
            >
              <div className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
                {renderTemplate(false)}
              </div>
            </div>
          </div>
          <p className="fixed bottom-4 left-0 right-0 text-center text-white/70 text-xs pointer-events-none">
            Klikkaa mistä tahansa sulkeaksesi · tämä on tulostusasu
          </p>
        </div>
        );
      })()}
    </div>
  );
}