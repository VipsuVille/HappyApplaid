'use client';
// edit-cover-letter/[id]/page.tsx
// ✅ DESKTOP: suora paperimuokkaus + split-näkymä
// ✅ MOBIILI: välilehdet Teksti / Ulkoasu / Esikatselu
// ✅ Kyvykkyysohjautuva AdaptiveControls (banneri/palkki/kuva/alueet)
// ✅ Kuvavalitsin (ei URL-kenttää) + per-sana/merkki värit (desktop-työkalupalkki)

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  Save, ArrowLeft, Trash2, Download, Loader2,
  FileText, Sparkles,
  Bold, Italic, AlignLeft, AlignCenter, AlignJustify,
  Palette, CheckCircle, ZoomIn, ZoomOut, GripVertical,
  Edit3, Eye, SlidersHorizontal,
} from 'lucide-react';

import CoverLetterRenderer from '@/lib/cover-letter/Coverletterrenderer';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import IterativeFeedback from '@/components/IterativeFeedback';
import CoverLetterDesignPanel, { type BackgroundSettings } from '@/components/cover-letter/CoverLetterDesingPanel';
import AdaptiveControls from '@/components/cover-letter/AdaptiveControls';
import { useTokens } from '@/hooks/useTokens';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';
import type { ImagePlacement } from '@/lib/cover-letter/engine/capabilities';

interface CoverLetter {
  id: string; user_id: string; title: string;
  content: any; ai_data: any; created_at: string; updated_at: string;
}

interface StyleSettings {
  headerColor: string;
  headerLayout: 'top' | 'left';
  sidebarContent: 'contact' | 'highlights' | 'none';
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  paragraphSpacing: number;
  textAlign: 'left' | 'justify' | 'center';
  templateStyle: string;
  signatureStyle: 'script' | 'print' | 'bold';
  fontFamily: 'serif' | 'sans' | 'classic' | 'modern';
    closingText?: string;   // ✅ LISÄÄ
  textColor: string;
  banner?: { color?: string; heightMm?: number; textColor?: string };
  band?: { color?: string; heightMm?: number };
  image?: { url?: string; filePath?: string; placement?: ImagePlacement; opacity?: number };
  regions?: Record<string, { fontSize?: number; textColor?: string; letterSpacing?: number }>;
  background: BackgroundSettings;
  bannerHeightMm: number;
}

interface ToolbarPos { x: number; y: number; visible: boolean; hasSelection: boolean; }

const BANNER_TEMPLATES = ['aurora', 'modern-top', 'sidebar', 'executive', 'greeting'];

// Pikavärit valitulle tekstille
const QUICK_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#111827'];

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
  const [zoom, setZoom] = useState(75);
  const [isMobile, setIsMobile] = useState(false);

  const [rightTab, setRightTab] = useState<'design' | 'ai' | 'history'>('design');
  const [mobileTab, setMobileTab] = useState<'text' | 'design' | 'preview'>('text');

  const [showSuccess, setShowSuccess] = useState(false);
  const [latestChanges, setLatestChanges] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [content, setContent] = useState('');

  // Kuvavalitsin
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [availableImages, setAvailableImages] = useState<UserImage[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    headerColor: '#B59850',
    headerLayout: 'top',
    sidebarContent: 'contact',
    fontSize: 11,
    lineHeight: 1.8,
    letterSpacing: 0,
    paragraphSpacing: 16,
    textAlign: 'justify',
    templateStyle: 'modern-top',
    signatureStyle: 'script',
    fontFamily: 'serif',
    textColor: '#1a1a1a',
    background: { mode: 'color' },
    bannerHeightMm: 82,
  });

  const [toolbar, setToolbar] = useState<ToolbarPos>({ x: 0, y: 0, visible: false, hasSelection: false });
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [leftRatio, setLeftRatio] = useState(0.72);
  const [isDragging, setIsDragging] = useState(false);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const iterationCost = plan_type === 'premium' ? 30 : 50;
// Valitun tekstin nykyinen fonttikoko (px) työkalupalkkia varten
const [selFontSize, setSelFontSize] = useState<number | null>(null);



  // ── Responsive ──
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // ── Lataus ──
  useEffect(() => {
    const load = async () => {
      if (!userId || !id) { setIsLoading(false); return; }
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No token');
        const res = await fetch(`/api/cover-letters/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        if (data.coverLetter) {
          const l = data.coverLetter;
          setLetterData(l);
          setName(l.content?.contactInfo?.name || l.ai_data?.name || '');
          setEmail(l.content?.contactInfo?.email || l.ai_data?.email || '');
          setPhone(l.content?.contactInfo?.phone || l.ai_data?.phone || '');
          setLocation(l.content?.contactInfo?.location || l.ai_data?.location || '');
          setJobTitle(l.content?.job_title || l.ai_data?.job_title || '');
          setCompanyName(l.content?.company_name || l.ai_data?.company_name || '');
          setContent(l.content?.body || '');
          const tpl = l.content?.templateStyle
            || l.ai_data?.templateStyle
            || (l.content?.headerLayout === 'left' ? 'modern-left' : 'modern-top');
          setStyleSettings(prev => ({
            ...prev,
            headerColor: l.content?.headerColor || '#B59850',
            headerLayout: l.content?.headerLayout || 'top',
            sidebarContent: l.content?.sidebarContent || 'contact',
            fontSize: l.content?.fontSize || 11,
            lineHeight: l.content?.lineHeight || 1.8,
            closingText: l.content?.closingText,
            textAlign: l.content?.textAlign || 'justify',
            templateStyle: tpl,
            signatureStyle: l.content?.signatureStyle || 'script',
            fontFamily: l.content?.fontFamily || 'serif',
            textColor: l.content?.textColor || '#1a1a1a',
            background: l.content?.background || { mode: 'color' },
            bannerHeightMm: l.content?.divider?.sizeMm || (tpl === 'modern-left' ? 74 : 82),
            // ✅ uudet kentät kannasta (GET-reitti on jo hydratoinut image.url:n filePath:sta)
            banner: l.content?.banner,
            band: l.content?.band,
            image: l.content?.image,
            regions: l.content?.regions,
          }));
        }
      } catch {
        toast.error('Lataus epäonnistui');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, userId, getToken]);

  // ── Tekstivalinnan seuranta (desktop-työkalupalkki) ──
  const handleSelectionChange = useCallback(() => {
    if (isMobile) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setToolbar(t => (t.visible ? { ...t, visible: false } : t)); return; }
    const hasSelection = sel.toString().trim().length > 0;
    if (!hasSelection) { setToolbar(t => (t.visible ? { ...t, visible: false } : t)); return; }
    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    const isInEditor = editorRef.current?.contains(range.commonAncestorContainer as Node);
    if (!isInEditor || !editorRect) { setToolbar(t => (t.visible ? { ...t, visible: false } : t)); return; }
    setToolbar({ x: rect.left - editorRect.left + rect.width / 2, y: rect.top - editorRect.top - 8, visible: true, hasSelection: true });
      readSelectionFontSize();   // ✅ TÄHÄN — luetaan valinnan koko kun palkki näkyy

  }, [isMobile]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
    
  }, [handleSelectionChange]);

  // ── Split-raahaus ──
  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!mainAreaRef.current) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const ratio = Math.max(0.4, Math.min(0.85, (e.clientX - rect.left) / rect.width));
      setLeftRatio(ratio);
    };
    const handleUp = () => setIsDragging(false);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging]);

  // ── Tekstimuotoilu (execCommand) ──
// ── Tekstimuotoilu (execCommand) ──
  const execCmd = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

  const applyColor = (color: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand('foreColor', false, color);
  };

  // Lue valinnan alun efektiivinen fonttikoko (näytetään työkalupalkin kentässä)
  const readSelectionFontSize = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) { setSelFontSize(null); return; }
    let node: Node | null = sel.getRangeAt(0).startContainer;
    if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
    const el = node as HTMLElement | null;
    if (!el) { setSelFontSize(null); return; }
    const px = parseFloat(window.getComputedStyle(el).fontSize);
    setSelFontSize(Number.isFinite(px) ? Math.round(px) : null);
  };

  // Aseta valitulle tekstille TARKKA koko (px) — kääräisee valinnan <span>:iin
  const setSelectionFontSize = (px: number) => {
    const clamped = Math.max(6, Math.min(160, px));
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement('span');
    span.style.fontSize = `${clamped}px`;
    try {
      range.surroundContents(span);
    } catch {
      // surroundContents heittää jos valinta ylittää elementtirajat → fallback
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    // valinta takaisin span:in sisälle
    sel.removeAllRanges();
    const r = document.createRange();
    r.selectNodeContents(span);
    sel.addRange(r);
    setSelFontSize(clamped);
  };

  // ±1 px hienosäätö (− / + napit)
  const bumpSelectionFontSize = (deltaPx: number) => {
    const base = selFontSize ?? 16;
    setSelectionFontSize(base + deltaPx);
  };

  // ── Kuvavalitsin ──
  const openImagePicker = async () => {
    setImagePickerOpen(true);
    setImagesLoading(true);
    try {
      const { backgroundImages, profileImages } = await getAllAvailableImagesAction();
      // taustakuvat ensin, sitten profiilikuvat (käytä mitä haluat)
      setAvailableImages([...backgroundImages, ...profileImages]);
    } catch {
      toast.error('Kuvien lataus epäonnistui');
    } finally {
      setImagesLoading(false);
    }
  };

  const chooseImage = (img: UserImage) => {
    setStyleSettings(prev => ({
      ...prev,
      image: {
        ...prev.image,
        url: img.signedUrl,        // näyttöön (vanhenee — luodaan uudelleen latauksessa)
        filePath: img.file_path,   // pysyvä totuus kannassa
        placement: prev.image?.placement && prev.image.placement !== 'none'
          ? prev.image.placement
          : 'banner-center',
      },
    }));
    setImagePickerOpen(false);
  };

  // ── Sisällön rakennus (tallennus + esikatselu) ──
  const buildContent = () => ({
    ...letterData?.content,
    contactInfo: { name, email, phone, location },
    body: content,
    headerColor: styleSettings.headerColor,
    accentColor: styleSettings.headerColor,
    templateStyle: styleSettings.templateStyle,
    fontSize: styleSettings.fontSize,
    lineHeight: styleSettings.lineHeight,
    textAlign: styleSettings.textAlign,
    fontFamily: styleSettings.fontFamily,
    textColor: styleSettings.textColor,
    signatureStyle: styleSettings.signatureStyle,
    background: styleSettings.background,
    banner: styleSettings.banner,
    band: styleSettings.band,
    closingText: styleSettings.closingText,
    image: styleSettings.image,
    regions: styleSettings.regions,
    divider: {
      direction: styleSettings.templateStyle === 'modern-left' ? 'vertical' : 'horizontal',
      sizeMm: styleSettings.bannerHeightMm,
    },
    job_title: jobTitle,
    company_name: companyName,
    language: letterData?.content?.language,
    style: letterData?.content?.style,
  });

  const handleSave = async () => {
    if (!letterData || !userId) return;
    setIsSaving(true);
    try {
      const token = await getToken({ template: 'supabase' });
      const res = await fetch(`/api/cover-letters/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: buildContent() }),
      });
      if (!res.ok) throw new Error('Save failed');
      const result = await res.json();
      if (result.coverLetter) setLetterData(result.coverLetter);
      toast.success('✅ Tallennettu!');
    } catch {
      toast.error('Tallennus epäonnistui');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const token = await getToken({ template: 'supabase' });
      if (token) {
        await fetch(`/api/cover-letters/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: buildContent() }),
        });
      }
      const res = await fetch('/api/generate-cover-letter-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: id }),
      });
      if (!res.ok) throw new Error('PDF failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `hakukirje.pdf`;
      a.click(); URL.revokeObjectURL(url);
      toast.success('PDF ladattu!');
    } catch {
      toast.error('PDF epäonnistui');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Poistetaanko hakukirje?')) return;
    setIsDeleting(true);
    try {
      const token = await getToken({ template: 'supabase' });
      await fetch(`/api/cover-letters/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      toast.success('Poistettu');
      router.push('/my-cover-letters');
    } catch {
      toast.error('Poisto epäonnistui');
      setIsDeleting(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    switch (field) {
      case 'name': setName(value); break;
      case 'email': setEmail(value); break;
      case 'phone': setPhone(value); break;
      case 'location': setLocation(value); break;
      case 'headerColor': setStyleSettings(p => ({ ...p, headerColor: value })); break;
      case 'jobTitle': setJobTitle(value); break;
      case 'companyName': setCompanyName(value); break;
    }
  };

  const handleIterationSuccess = (newContent: string, summary: string) => {
    setContent(newContent);
    setLatestChanges(summary);
    setShowSuccess(true);
    toast.success('✅ Kirje päivitetty!', { description: summary });
    setTimeout(() => setShowSuccess(false), 8000);
  };

  if (isLoading || !letterData) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center">
        <Sparkles className="w-10 h-10 text-orange-500 animate-pulse mb-4" />
        <p className="text-xs font-bold tracking-[0.2em] text-gray-500 uppercase">Ladataan...</p>
      </div>
    );
  }

  const engineRaw = {
    title: letterData.title,
    content: {
      body: content,
      contactInfo: { name, email, phone, location },
      job_title: jobTitle,
      company_name: companyName,
      closingText: styleSettings.closingText,
      language: letterData.content?.language || 'finnish',
      headerColor: styleSettings.headerColor,
      accentColor: styleSettings.headerColor,
      templateStyle: styleSettings.templateStyle,
      fontSize: styleSettings.fontSize,
      lineHeight: styleSettings.lineHeight,
      textAlign: styleSettings.textAlign,
      fontFamily: styleSettings.fontFamily,
      textColor: styleSettings.textColor,
      signatureStyle: styleSettings.signatureStyle,
      showDate: true,
      background: styleSettings.background,
      banner: styleSettings.banner,
      band: styleSettings.band,
      image: styleSettings.image,
      regions: styleSettings.regions,
      divider: {
        direction: (styleSettings.templateStyle === 'modern-left' ? 'vertical' : 'horizontal') as 'vertical' | 'horizontal' | 'none',
        sizeMm: styleSettings.bannerHeightMm,
      },
    },
    ai_data: {
      job_title: letterData.ai_data?.job_title,
      company_name: letterData.ai_data?.company_name,
      key_highlights: letterData.ai_data?.key_highlights || [],
    },
  };

  const scaleValue = zoom / 100;
  const showBanner = BANNER_TEMPLATES.includes(styleSettings.templateStyle);

  const renderPaper = (editing: boolean) => (
    <CoverLetterContainer>
      <CoverLetterRenderer
        raw={engineRaw}
        isEditing={editing}
        onContactChange={(field, value) => {
          if (field === 'name') setName(value);
          else if (field === 'email') setEmail(value);
          else if (field === 'phone') setPhone(value);
          else if (field === 'location') setLocation(value);
        }}
        onBodyChange={setContent}
        onFieldChange={(field, value) => handleFieldChange(field, value)}
        onStyleChange={(patch) => {
          setStyleSettings(prev => ({
            ...prev,
            ...(patch.accentColor ? { headerColor: patch.accentColor } : {}),
            ...(patch.templateStyle ? { templateStyle: patch.templateStyle } : {}),
            ...(patch.signatureStyle ? { signatureStyle: patch.signatureStyle } : {}),
            ...(patch.background ? { background: patch.background } : {}),
            ...(patch.text?.fontFamily ? { fontFamily: patch.text.fontFamily } : {}),
            ...(patch.text?.fontSize ? { fontSize: patch.text.fontSize } : {}),
            ...(patch.text?.lineHeight ? { lineHeight: patch.text.lineHeight } : {}),
            ...(patch.text?.textAlign ? { textAlign: patch.text.textAlign } : {}),
            ...(patch.text?.textColor ? { textColor: patch.text.textColor } : {}),
            ...(patch.closingText !== undefined ? { closingText: patch.closingText } : {}),
          }));
        }}
      />
    </CoverLetterContainer>
  );

  const designPanel = (
    <CoverLetterDesignPanel
      background={styleSettings.background}
      onBackgroundChange={(bg) => setStyleSettings(p => ({ ...p, background: bg }))}
      bannerHeightMm={styleSettings.bannerHeightMm}
      onBannerHeightChange={(mm) => setStyleSettings(p => ({ ...p, bannerHeightMm: mm }))}
      showBanner={showBanner}
      fontSize={styleSettings.fontSize}
      lineHeight={styleSettings.lineHeight}
      onFontSizeChange={(v) => setStyleSettings(p => ({ ...p, fontSize: v }))}
      onLineHeightChange={(v) => setStyleSettings(p => ({ ...p, lineHeight: v }))}
    />
  );

  const adaptivePanel = (
    <AdaptiveControls
      styleSettings={styleSettings}
      onChange={(p) => setStyleSettings(prev => ({ ...prev, ...p }))}
      onPickImage={openImagePicker}
    />
  );

  // Kuvavalitsin-modal (jaettu desktop/mobiili)
  const imagePickerModal = imagePickerOpen && (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={() => setImagePickerOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#1e1e1e', border: '1px solid #3a3a3a', borderRadius: '16px', padding: '20px', maxWidth: '560px', width: '100%', maxHeight: '70vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ color: '#e8e3dc', fontSize: '15px', margin: 0 }}>Valitse kuva</h3>
          <button onClick={() => setImagePickerOpen(false)} style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', fontSize: '18px' }}>✕</button>
        </div>
        {imagesLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" style={{ color: '#f97316' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {availableImages.map(img => (
              <button key={img.id} onClick={() => chooseImage(img)}
                style={{ padding: 0, border: '2px solid transparent', borderRadius: '10px', overflow: 'hidden', cursor: 'pointer', background: '#2a2a2a' }}>
                {img.signedUrl && <img src={img.signedUrl} alt={img.name} style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }} />}
              </button>
            ))}
            {availableImages.length === 0 && (
              <p style={{ color: '#888', fontSize: '13px', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                Ei kuvia vielä. Generoi tai lataa kuva ensin.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const styleSelectors = (compact: boolean) => (
    <>
      <select value={styleSettings.templateStyle} onChange={e => setStyleSettings(p => ({ ...p, templateStyle: e.target.value }))}
        style={{ padding: compact ? '10px 12px' : '6px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: compact ? '100%' : undefined }}>
        <option value="modern-top">Moderni · banneri</option>
        <option value="modern-left">Moderni · sivupalsta</option>
        <option value="aurora">Aurora · banneri</option>
        <option value="sidebar">Sivupalsta+ · väripalsta</option>
        <option value="elegant">Elegantti · keskitetty</option>
        <option value="ribbon">Ribbon · nauha</option>
        <option value="monogram">Monogram · vesileima</option>
        <option value="creative-wave">Creative Wave 🌊</option>
        <option value="executive">Executive · tumma banneri</option>
        <option value="greeting">Greeting · Hello-banneri</option>
        <option value="spine">Spine · pystynimi (kraft)</option>
        <option value="classic">Klassinen</option>
      </select>
      <select value={styleSettings.signatureStyle} onChange={e => setStyleSettings(p => ({ ...p, signatureStyle: e.target.value as any }))}
        style={{ padding: compact ? '10px 12px' : '6px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: compact ? '100%' : undefined }}>
        <option value="script">Allek. · käsiala</option>
        <option value="print">Allek. · painettu</option>
        <option value="bold">Allek. · korostettu</option>
      </select>
      <select value={styleSettings.fontFamily} onChange={e => setStyleSettings(p => ({ ...p, fontFamily: e.target.value as any }))}
        style={{ padding: compact ? '10px 12px' : '6px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '13px', fontWeight: 600, width: compact ? '100%' : undefined }}>
        <option value="serif">Fontti · Serif</option>
        <option value="sans">Fontti · Sans</option>
        <option value="classic">Fontti · Klassinen</option>
        <option value="modern">Fontti · Moderni</option>
      </select>
    </>
  );

  // ════════════════════════════════════════════════════════════
  // MOBIILI
  // ════════════════════════════════════════════════════════════
  if (isMobile) {
    const mobileScale = Math.min(1, (typeof window !== 'undefined' ? window.innerWidth - 24 : 360) / 794);
    const inputCls = 'w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-3 py-2.5 text-sm text-[#e8e3dc] focus:outline-none focus:border-orange-500/60';
    const labelCls = 'block text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5';

    // Mobiilin textarea näyttää tekstin ilman HTML-tageja
    const plainForTextarea = content
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '');

    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', color: '#e8e3dc', fontFamily: "'DM Sans', sans-serif" }}>
        {imagePickerModal}
        {/* Top bar */}
        <div style={{ height: '52px', background: '#2a2a2a', borderBottom: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', padding: '0 12px', gap: '8px', flexShrink: 0, position: 'sticky', top: 0, zIndex: 50 }}>
          <button onClick={() => router.push('/my-cover-letters')} style={{ padding: '6px', background: 'transparent', border: 'none', color: '#999' }}><ArrowLeft size={18} /></button>
          <FileText size={15} style={{ color: '#f97316' }} />
          <span style={{ flex: 1, fontSize: '13px', fontWeight: 600, color: '#e0dbd4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{letterData.title}</span>
          <button onClick={handleDownloadPDF} disabled={isDownloading} style={{ padding: '7px', borderRadius: '8px', background: '#333', border: '1px solid #444', color: '#ccc' }}>
            {isDownloading ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          </button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '7px 14px', borderRadius: '8px', background: isSaving ? '#555' : 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: '#fff', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Tallenna
          </button>
        </div>

        {/* Mobiili-välilehdet */}
        <div style={{ display: 'flex', gap: '6px', padding: '10px 12px', background: '#1e1e1e', position: 'sticky', top: '52px', zIndex: 40, borderBottom: '1px solid #2a2a2a' }}>
          {([
            { k: 'text' as const, label: 'Teksti', icon: Edit3 },
            { k: 'design' as const, label: 'Ulkoasu', icon: SlidersHorizontal },
            { k: 'preview' as const, label: 'Esikatselu', icon: Eye },
          ]).map(({ k, label, icon: Icon }) => (
            <button key={k} onClick={() => setMobileTab(k)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px', borderRadius: '10px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 700,
                background: mobileTab === k ? '#f97316' : '#2a2a2a',
                color: mobileTab === k ? '#fff' : '#999',
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '16px 12px 40px' }}>

          {/* ── TEKSTI ── */}
          {mobileTab === 'text' && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Nimi</label>
                <input className={inputCls} value={name} onChange={e => setName(e.target.value)} placeholder="Nimi" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Titteli</label>
                  <input className={inputCls} value={jobTitle} onChange={e => setJobTitle(e.target.value)} placeholder="Titteli" />
                </div>
                <div>
                  <label className={labelCls}>Yritys</label>
                  <input className={inputCls} value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Yritys" />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className={labelCls}>Sähköposti</label>
                  <input className={inputCls} value={email} onChange={e => setEmail(e.target.value)} placeholder="sähköposti" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Puhelin</label>
                    <input className={inputCls} value={phone} onChange={e => setPhone(e.target.value)} placeholder="puhelin" />
                  </div>
                  <div>
                    <label className={labelCls}>Paikkakunta</label>
                    <input className={inputCls} value={location} onChange={e => setLocation(e.target.value)} placeholder="paikkakunta" />
                  </div>
                </div>
              </div>

              <div>
                <label className={labelCls}>Hakukirjeen teksti</label>
                <p className="text-[11px] text-gray-500 mb-2">Tyhjä rivi erottaa kappaleet. Tekstin värit muokataan tietokoneella.</p>
                <textarea
                  value={plainForTextarea}
                  onChange={e => setContent(e.target.value.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join(''))}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-3 py-3 text-sm text-[#e8e3dc] focus:outline-none focus:border-orange-500/60 leading-relaxed"
                  style={{ minHeight: '320px', resize: 'vertical' }}
                  placeholder="Kirjoita hakukirjeen teksti tähän…"
                />
              </div>

              {/* AI-muokkaus mobiilissa */}
              <div className="pt-2 border-t border-[#2a2a2a]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-400 mb-3 flex items-center gap-2">
                  <Sparkles size={13} /> AI-muokkaus
                </p>
                {showSuccess && (
                  <div className="mb-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex gap-2">
                    <CheckCircle size={15} className="text-green-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-green-300 m-0">{latestChanges}</p>
                  </div>
                )}
                <IterativeFeedback coverLetterId={id} iterationCost={iterationCost} currentTokens={tokens} onSuccess={handleIterationSuccess} />
              </div>
            </div>
          )}

          {/* ── ULKOASU ── */}
          {mobileTab === 'design' && (
            <div className="space-y-4">
              {/* Pohja / allek / fontti */}
              <div className="bg-[#252525] border border-[#3a3a3a] rounded-2xl p-4 space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1 flex items-center gap-2"><Palette size={13} /> Pohja & tyyli</p>
                {styleSelectors(true)}
                {/* Korostusväri + tasaus */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Korostus</span>
                    <input type="color" value={styleSettings.headerColor.startsWith('#') ? styleSettings.headerColor : '#B59850'}
                      onChange={e => setStyleSettings(p => ({ ...p, headerColor: e.target.value }))}
                      style={{ width: '36px', height: '32px', borderRadius: '8px', border: '1px solid #444', background: 'transparent', cursor: 'pointer' }} />
                  </div>
                  <div className="flex-1" />
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {(['left', 'center', 'justify'] as const).map(align => (
                      <button key={align} onClick={() => setStyleSettings(p => ({ ...p, textAlign: align }))}
                        style={{ padding: '8px', borderRadius: '8px', border: 'none', cursor: 'pointer', background: styleSettings.textAlign === align ? '#f97316' : '#333', color: styleSettings.textAlign === align ? '#fff' : '#aaa' }}>
                        {align === 'left' ? <AlignLeft size={15} /> : align === 'center' ? <AlignCenter size={15} /> : <AlignJustify size={15} />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Kyvykkyysohjautuvat säätimet */}
              {adaptivePanel}

              {/* Tausta + koot (jaettu paneeli) */}
              {designPanel}
            </div>
          )}

          {/* ── ESIKATSELU ── */}
          {mobileTab === 'preview' && (
            <div className="flex flex-col items-center">
              <p className="text-[11px] text-gray-500 mb-3">Tulostusasu · muokkaa Teksti- ja Ulkoasu-välilehdillä</p>
              <div style={{ width: `${794 * mobileScale}px`, overflow: 'hidden' }}>
                <div style={{ width: '210mm', transform: `scale(${mobileScale})`, transformOrigin: 'top left' }}>
                  <div className="bg-white shadow-2xl" style={{ width: '210mm', minHeight: '297mm' }}>
                    {renderPaper(false)}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // DESKTOP
  // ════════════════════════════════════════════════════════════
  const tabBtn = (key: typeof rightTab, label: string) => (
    <button onClick={() => setRightTab(key)}
      style={{ flex: 1, padding: '12px 6px', fontSize: '11px', fontWeight: 700,
        background: rightTab === key ? '#2e2e2e' : 'transparent',
        borderBottom: rightTab === key ? '2px solid #f97316' : '2px solid transparent',
        border: 'none', color: rightTab === key ? '#f97316' : '#888', cursor: 'pointer',
        letterSpacing: '0.03em', textTransform: 'uppercase' }}>{label}</button>
  );

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', color: '#e8e3dc', fontFamily: "'DM Sans', sans-serif" }}>
      {imagePickerModal}
      <div style={{ height: '56px', background: '#2a2a2a', borderBottom: '1px solid #3a3a3a', display: 'flex', alignItems: 'center', padding: '0 16px', gap: '8px', flexShrink: 0, zIndex: 50 }}>
        <button onClick={() => router.push('/my-cover-letters')} style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />
        <FileText size={16} style={{ color: '#f97316' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0dbd4', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{letterData.title}</span>
        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {(['left', 'center', 'justify'] as const).map(align => (
            <button key={align} onClick={() => setStyleSettings(p => ({ ...p, textAlign: align }))}
              title={align === 'left' ? 'Vasen' : align === 'center' ? 'Keskitetty' : 'Tasattu'}
              style={{ padding: '6px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: styleSettings.textAlign === align ? '#f97316' : 'transparent', color: styleSettings.textAlign === align ? '#fff' : '#aaa' }}>
              {align === 'left' ? <AlignLeft size={15} /> : align === 'center' ? <AlignCenter size={15} /> : <AlignJustify size={15} />}
            </button>
          ))}
          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={14} style={{ color: '#888' }} />
            <div onClick={() => colorInputRef.current?.click()} style={{ width: '28px', height: '28px', borderRadius: '6px', background: styleSettings.headerColor, border: '2px solid #555', cursor: 'pointer' }} title="Korostusväri" />
            <input ref={colorInputRef} type="color" value={styleSettings.headerColor.startsWith('#') ? styleSettings.headerColor : '#B59850'} onChange={e => setStyleSettings(p => ({ ...p, headerColor: e.target.value }))} style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }} />
          </div>
          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />
          {styleSelectors(false)}
        </div>
{/* Fonttikoko valitulle tekstille — numeerinen */}
<div style={{ width: '1px', height: '18px', background: '#444', margin: '0 4px' }} />
<div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
  <button onMouseDown={e => { e.preventDefault(); bumpSelectionFontSize(-1); }} title="Pienennä"
    style={{ padding: '4px 6px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer', fontWeight: 700 }}>−</button>
  <div style={{ display: 'flex', alignItems: 'center', background: '#1e1e1e', border: '1px solid #444', borderRadius: '5px', padding: '0 4px' }}>
    <input
      type="number"
      min={6}
      max={160}
      value={selFontSize ?? ''}
      placeholder="–"
      onMouseDown={e => e.stopPropagation()}
      onChange={e => {
        const v = parseInt(e.target.value, 10);
        if (Number.isFinite(v)) setSelectionFontSize(v);
      }}
      style={{ width: '34px', background: 'transparent', border: 'none', color: '#e0dbd4', fontSize: '12px', textAlign: 'right', outline: 'none', MozAppearance: 'textfield' }}
    />
    <span style={{ fontSize: '10px', color: '#888', marginLeft: '2px' }}>px</span>
  </div>
  <button onMouseDown={e => { e.preventDefault(); bumpSelectionFontSize(1); }} title="Suurenna"
    style={{ padding: '4px 6px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer', fontWeight: 700 }}>+</button>
</div>
       <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
            <button onClick={() => setZoom(z => Math.max(40, z - 10))} style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}><ZoomOut size={14} /></button>
            <span style={{ padding: '0 4px', fontSize: '12px', color: '#e0dbd4', minWidth: '38px', textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(150, z + 10))} style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}><ZoomIn size={14} /></button>
          </div>
          <div style={{ width: '1px', height: '24px', background: '#3a3a3a' }} />
          <button onClick={handleDownloadPDF} disabled={isDownloading} style={{ padding: '7px 14px', borderRadius: '8px', background: '#333', border: '1px solid #444', color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} PDF
          </button>
          <button onClick={handleDelete} disabled={isDeleting} style={{ padding: '7px 10px', borderRadius: '8px', background: 'transparent', border: '1px solid #3a3a3a', color: '#ef4444', cursor: 'pointer' }}>
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>
          <button onClick={handleSave} disabled={isSaving} style={{ padding: '7px 18px', borderRadius: '8px', background: isSaving ? '#555' : 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Tallenna
          </button>
        </div>
      </div>

      <div ref={mainAreaRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${leftRatio * 100}%`, overflow: 'auto', background: '#1e1e1e', display: 'flex', justifyContent: 'center', padding: '32px 24px', position: 'relative', transition: isDragging ? 'none' : 'width 0.05s linear' }}>
          {toolbar.visible && toolbar.hasSelection && (
            <div style={{ position: 'absolute', left: `calc(50% - 105mm + ${toolbar.x}px)`, top: `${32 + toolbar.y * scaleValue}px`, transform: 'translateX(-50%) translateY(-100%)', zIndex: 100, background: '#2a2a2a', border: '1px solid #444', borderRadius: '10px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <button onMouseDown={e => { e.preventDefault(); execCmd('bold'); }} style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer' }} title="Lihavointi"><Bold size={14} /></button>
              <button onMouseDown={e => { e.preventDefault(); execCmd('italic'); }} style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer' }} title="Kursiivi"><Italic size={14} /></button>
              {/* Pikavärit valitulle tekstille */}
              <div style={{ width: '1px', height: '18px', background: '#444', margin: '0 4px' }} />
              {QUICK_COLORS.map(c => (
                <button key={c} onMouseDown={(e) => { e.preventDefault(); applyColor(c); }} title={`Väri ${c}`}
                  style={{ width: '18px', height: '18px', borderRadius: '50%', background: c, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', padding: 0 }} />
              ))}
              <label style={{ position: 'relative', width: '18px', height: '18px', borderRadius: '50%', background: 'conic-gradient(red,orange,yellow,lime,cyan,blue,magenta,red)', cursor: 'pointer', display: 'inline-block', border: '1px solid rgba(255,255,255,0.3)' }} title="Vapaa väri">
                <input type="color" onChange={(e) => applyColor(e.target.value)} onMouseDown={(e) => e.stopPropagation()}
                  style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px' }} />
              </label>
            </div>
          )}

          <div ref={editorRef} style={{ transform: `scale(${scaleValue})`, transformOrigin: 'top center', marginBottom: `calc(${(scaleValue - 1) * 297}mm)` }}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '297mm', left: '-20px', right: '-20px', zIndex: 20, pointerEvents: 'none' }}>
                <div style={{ borderTop: '2px dashed rgba(239,68,68,0.6)', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: '-10px', right: '0', background: 'rgba(239,68,68,0.8)', color: 'white', fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700 }}>Sivu 1 / Sivu 2</span>
                </div>
              </div>
              {renderPaper(true)}
            </div>
          </div>
        </div>

        <div onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          style={{ width: '8px', background: isDragging ? '#f97316' : '#2a2a2a', borderLeft: '1px solid #333', borderRight: '1px solid #333', cursor: 'col-resize', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 10 }}
          title="Raahaa muuttaaksesi paneelin kokoa">
          <GripVertical size={14} style={{ color: isDragging ? '#fff' : '#666', pointerEvents: 'none' }} />
        </div>

        <div style={{ width: `${(1 - leftRatio) * 100}%`, background: '#1e1e1e', display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0, minWidth: '280px', transition: isDragging ? 'none' : 'width 0.05s linear' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
            {tabBtn('design', '🎨 Ulkoasu')}
            {tabBtn('ai', '✨ AI')}
            {tabBtn('history', 'Historia')}
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {rightTab === 'design' && (
              <>
                {adaptivePanel}
                {designPanel}
              </>
            )}

            {rightTab === 'ai' && (
              <>
                {showSuccess && (
                  <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '10px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '12px', color: '#86efac', margin: 0 }}>{latestChanges}</p>
                    </div>
                  </div>
                )}
                <IterativeFeedback coverLetterId={id} iterationCost={iterationCost} currentTokens={tokens} onSuccess={handleIterationSuccess} />
              </>
            )}

            {rightTab === 'history' && (
              <div>
                {letterData?.ai_data?.iterations?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {letterData.ai_data.iterations.map((iter: any, i: number) => (
                      <div key={i} style={{ padding: '12px', borderRadius: '10px', background: '#2e2e2e', border: '1px solid #3a3a3a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f97316' }}>Versio {iter.version}</span>
                          <span style={{ fontSize: '11px', color: '#666' }}>{new Date(iter.timestamp).toLocaleDateString('fi-FI')}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px', fontStyle: 'italic' }}>&quot;{iter.user_feedback}&quot;</p>
                        <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>✅ {iter.changes_made}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', marginTop: '40px' }}>Ei muutoshistoriaa vielä.</p>
                )}
              </div>
            )}
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid #333', background: '#1e1e1e' }}>
            <p style={{ fontSize: '11px', color: '#555', margin: 0, lineHeight: '1.5' }}>
              💡 Klikkaa tekstiä muokataksesi · Maalaa teksti → väri/lihavointi · Ulkoasu-välilehdeltä banneri, kuva & koot
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}