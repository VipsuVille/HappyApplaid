'use client';
// edit-cover-letter/[id]/page.tsx
// ✅ CANVA-TYYLINEN EDITORI + ENGINE-KYTKENTÄ
// ✅ Kelluva fonttipalkki näkyy vain aidossa valinnassa
// ✅ Pohjavalitsin tukee myös 'creative-wave'
// ✅ AI-TAUSTA: nappi (vain Aurora), tallentuu content.background → engine näyttää sen

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import {
  Save, ArrowLeft, Trash2, Download, Loader2,
  RotateCcw, Clock, FileText, Sparkles,
  Bold, Italic, AlignLeft, AlignCenter, AlignJustify,
  Minus, Plus, Type, Palette, ChevronDown,
  CheckCircle, Undo, Redo, ZoomIn, ZoomOut,
  GripVertical, Image as ImageIcon,
} from 'lucide-react';

import CoverLetterRenderer from '@/lib/cover-letter/Coverletterrenderer';
import type { CLStyle, CLContactInfo } from '@/lib/cover-letter/engine/types';
import CoverLetterContainer from '@/components/cover-letter/CoverLetterContainer';
import IterativeFeedback from '@/components/IterativeFeedback';
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

interface BackgroundSettings {
  mode: 'color' | 'generated' | 'image-faint' | 'image-strong';
  imageUrl?: string;
  opacity?: number;
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
  textColor: string;
  background?: BackgroundSettings; // ✅ AI-tausta
}

interface ToolbarPos {
  x: number;
  y: number;
  visible: boolean;
  hasSelection: boolean;
}

// ✅ Pohjat joille AI-tausta-nappi näytetään (helppo laajentaa)
const BG_TEMPLATES = ['aurora'];

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
  const [isGenBg, setIsGenBg] = useState(false); // ✅ AI-tausta lataus
  const [zoom, setZoom] = useState(75);
  const [showHistory, setShowHistory] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [latestChanges, setLatestChanges] = useState('');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [content, setContent] = useState('');

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
    background: { mode: 'color' }, // ✅
  });

  const [toolbar, setToolbar] = useState<ToolbarPos>({
    x: 0, y: 0, visible: false, hasSelection: false
  });
  const [activeAlign, setActiveAlign] = useState<'left' | 'center' | 'justify'>('justify');
  const editorRef = useRef<HTMLDivElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const [leftRatio, setLeftRatio] = useState(0.75);
  const [isDragging, setIsDragging] = useState(false);
  const mainAreaRef = useRef<HTMLDivElement>(null);

  const iterationCost = plan_type === 'premium' ? 30 : 50;

  useEffect(() => {
    const load = async () => {
      if (!userId || !id) { setIsLoading(false); return; }
      try {
        const token = await getToken({ template: 'supabase' });
        if (!token) throw new Error('No token');
        const res = await fetch(`/api/cover-letters/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Load failed');
        const data = await res.json();
        if (data.coverLetter) {
          const l = data.coverLetter;
          setLetterData(l);
          setName(l.content?.contactInfo?.name || l.ai_data?.name || '');
          setEmail(l.content?.contactInfo?.email || l.ai_data?.email || '');
          setPhone(l.content?.contactInfo?.phone || l.ai_data?.phone || '');
          setLocation(l.content?.contactInfo?.location || l.ai_data?.location || '');
          setContent(l.content?.body || '');
          setStyleSettings(prev => ({
            ...prev,
            headerColor: l.content?.headerColor || '#B59850',
            headerLayout: l.content?.headerLayout || 'top',
            sidebarContent: l.content?.sidebarContent || 'contact',
            fontSize: l.content?.fontSize || 11,
            lineHeight: l.content?.lineHeight || 1.8,
            textAlign: l.content?.textAlign || 'justify',
            templateStyle: l.content?.templateStyle
              || l.ai_data?.templateStyle
              || (l.content?.headerLayout === 'left' ? 'modern-left' : 'modern-top'),
            signatureStyle: l.content?.signatureStyle || 'script',
            fontFamily: l.content?.fontFamily || 'serif',
            textColor: l.content?.textColor || '#1a1a1a',
            background: l.content?.background || { mode: 'color' }, // ✅ lue tallennettu tausta
          }));
        }
      } catch (e) {
        toast.error('Lataus epäonnistui');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, userId, getToken]);

  // ✅ Palkki vain aidossa valinnassa
  const handleSelectionChange = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) {
      setToolbar(t => (t.visible ? { ...t, visible: false } : t));
      return;
    }

    const hasSelection = sel.toString().trim().length > 0;
    if (!hasSelection) {
      setToolbar(t => (t.visible ? { ...t, visible: false } : t));
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current?.getBoundingClientRect();
    const container = range.commonAncestorContainer;
    const isInEditor = editorRef.current?.contains(container as Node);

    if (!isInEditor || !editorRect) {
      setToolbar(t => (t.visible ? { ...t, visible: false } : t));
      return;
    }

    setToolbar({
      x: rect.left - editorRect.left + rect.width / 2,
      y: rect.top - editorRect.top - 8,
      visible: true,
      hasSelection: true,
    });
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [handleSelectionChange]);

  useEffect(() => {
    if (!isDragging) return;
    const handleMove = (e: MouseEvent) => {
      if (!mainAreaRef.current) return;
      const rect = mainAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0.4, Math.min(0.9, x / rect.width));
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

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value);
  };

  const applyAlign = (align: 'left' | 'center' | 'justify') => {
    setActiveAlign(align);
    setStyleSettings(prev => ({ ...prev, textAlign: align }));
  };

  const buildContent = () => ({
    ...letterData?.content,
    contactInfo: { name, email, phone, location },
    body: content,
    ...styleSettings, // ✅ sisältää myös background
    job_title: letterData?.content?.job_title,
    company_name: letterData?.content?.company_name,
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

  // ✅ AI-TAUSTA: tallentaa nykytilan ensin, sitten generoi + tallentaa content.background
  const generateBackground = async () => {
    if (!id) return;
    setIsGenBg(true);
    try {
      const token = await getToken({ template: 'supabase' });
      // 1) tallenna nykytila, jottei tausta-merge ylikirjoita muokkauksia
      if (token) {
        await fetch(`/api/cover-letters/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ content: buildContent() }),
        });
      }
      // 2) generoi tausta (uploadaa storageen + tallentaa content.background:iin)
      const res = await fetch('/api/generate-cover-letter-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ letterId: id }),
      });
      const d = await res.json();
      if (res.ok && d.success && d.imageUrl) {
        setStyleSettings(p => ({
          ...p,
          background: { mode: 'generated', imageUrl: d.imageUrl, opacity: 1 },
        }));
        toast.success('🎨 AI-tausta luotu!');
      } else {
        throw new Error(d.error || 'fail');
      }
    } catch {
      toast.error('Taustan luonti epäonnistui');
    } finally {
      setIsGenBg(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Poistetaanko hakukirje?')) return;
    setIsDeleting(true);
    try {
      const token = await getToken({ template: 'supabase' });
      await fetch(`/api/cover-letters/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
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
      case 'jobTitle':
        setLetterData(p => p ? { ...p, content: { ...p.content, job_title: value } } : p);
        break;
      case 'companyName':
        setLetterData(p => p ? { ...p, content: { ...p.content, company_name: value } } : p);
        break;
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
      job_title: letterData.content?.job_title,
      company_name: letterData.content?.company_name,
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
      background: styleSettings.background || { mode: 'color' }, // ✅ engine näkee taustan
      divider: {
        direction: (styleSettings.templateStyle === 'modern-left' ? 'vertical'
                   : 'horizontal') as 'vertical' | 'horizontal' | 'none',
        sizeMm: styleSettings.templateStyle === 'modern-left' ? 74 : 70,
      },
    },
    ai_data: {
      job_title: letterData.ai_data?.job_title,
      company_name: letterData.ai_data?.company_name,
      key_highlights: letterData.ai_data?.key_highlights || [],
    },
  };

  const scaleValue = zoom / 100;
  const showBgButton = BG_TEMPLATES.includes(styleSettings.templateStyle);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', color: '#e8e3dc', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ══ TOP TOOLBAR ══════════════════════════ */}
      <div style={{
        height: '56px',
        background: '#2a2a2a',
        borderBottom: '1px solid #3a3a3a',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        gap: '8px',
        flexShrink: 0,
        zIndex: 50,
      }}>
        <button
          onClick={() => router.push('/my-cover-letters')}
          style={{ padding: '6px', borderRadius: '8px', background: 'transparent', border: 'none', color: '#999', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          onMouseEnter={e => (e.currentTarget.style.background = '#3a3a3a')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />

        <FileText size={16} style={{ color: '#f97316' }} />
        <span style={{ fontSize: '14px', fontWeight: 600, color: '#e0dbd4', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {letterData.title}
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

          <div style={{ display: 'flex', alignItems: 'center', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setStyleSettings(p => ({ ...p, fontSize: Math.max(8, p.fontSize - 0.5) }))}
              style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '14px' }}
            >−</button>
            <span style={{ padding: '0 4px', fontSize: '13px', color: '#e0dbd4', minWidth: '32px', textAlign: 'center' }}>
              {styleSettings.fontSize}
            </span>
            <button
              onClick={() => setStyleSettings(p => ({ ...p, fontSize: Math.min(16, p.fontSize + 0.5) }))}
              style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer', fontSize: '14px' }}
            >+</button>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />

          {(['left', 'center', 'justify'] as const).map(align => (
            <button
              key={align}
              onClick={() => applyAlign(align)}
              title={align === 'left' ? 'Vasen' : align === 'center' ? 'Keskitetty' : 'Tasattu'}
              style={{
                padding: '6px 8px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                background: styleSettings.textAlign === align ? '#f97316' : 'transparent',
                color: styleSettings.textAlign === align ? '#fff' : '#aaa',
              }}
            >
              {align === 'left' ? <AlignLeft size={15} /> : align === 'center' ? <AlignCenter size={15} /> : <AlignJustify size={15} />}
            </button>
          ))}

          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Type size={14} style={{ color: '#888' }} />
            <input
              type="range" min="1.1" max="2.5" step="0.05"
              value={styleSettings.lineHeight}
              onChange={e => setStyleSettings(p => ({ ...p, lineHeight: parseFloat(e.target.value) }))}
              style={{ width: '70px', accentColor: '#f97316' }}
              title={`Riviväli: ${styleSettings.lineHeight}`}
            />
            <span style={{ fontSize: '11px', color: '#888', minWidth: '28px' }}>{styleSettings.lineHeight.toFixed(1)}</span>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Palette size={14} style={{ color: '#888' }} />
            <div
              onClick={() => colorInputRef.current?.click()}
              style={{
                width: '28px', height: '28px', borderRadius: '6px',
                background: styleSettings.headerColor,
                border: '2px solid #555', cursor: 'pointer',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.1)',
              }}
              title="Korostusväri"
            />
            <input
              ref={colorInputRef}
              type="color"
              value={styleSettings.headerColor.startsWith('#') ? styleSettings.headerColor : '#B59850'}
              onChange={e => setStyleSettings(p => ({ ...p, headerColor: e.target.value }))}
              style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
            />
          </div>

          <div style={{ width: '1px', height: '24px', background: '#3a3a3a', margin: '0 4px' }} />

          {/* Template (skini) */}
          <select
            value={styleSettings.templateStyle}
            onChange={e => setStyleSettings(p => ({ ...p, templateStyle: e.target.value }))}
            style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid #444',
              background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
            title="Valitse pohja"
          >
            <option value="modern-top">Moderni · banneri</option>
            <option value="modern-left">Moderni · sivupalsta</option>
            <option value="aurora">Aurora · banneri</option>
            <option value="elegant">Elegantti · keskitetty</option>
            <option value="creative-wave">Creative Wave 🌊</option>
            <option value="classic">Klassinen</option>
          </select>

          {/* ✅ AI-TAUSTA -nappi (vain Aurora) */}
          {showBgButton && (
            <button
              onClick={generateBackground}
              disabled={isGenBg}
              style={{
                padding: '6px 12px', borderRadius: '6px',
                border: '1px solid #6d28d9', background: 'rgba(139,92,246,0.15)',
                color: '#c4b5fd', cursor: isGenBg ? 'wait' : 'pointer',
                fontSize: '12px', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: '6px',
                opacity: isGenBg ? 0.7 : 1,
              }}
              title="Luo AI-taustakuva tälle pohjalle"
            >
              {isGenBg ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              {isGenBg ? 'Luodaan…' : 'AI-tausta'}
            </button>
          )}

          {/* Allekirjoitustyyli */}
          <select
            value={styleSettings.signatureStyle}
            onChange={e => setStyleSettings(p => ({ ...p, signatureStyle: e.target.value as 'script' | 'print' | 'bold' }))}
            style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid #444',
              background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
            title="Allekirjoitustyyli"
          >
            <option value="script">Allek. · käsiala</option>
            <option value="print">Allek. · painettu</option>
            <option value="bold">Allek. · korostettu</option>
          </select>

          {/* Fontti */}
          <select
            value={styleSettings.fontFamily}
            onChange={e => setStyleSettings(p => ({ ...p, fontFamily: e.target.value as 'serif' | 'sans' | 'classic' | 'modern' }))}
            style={{
              padding: '6px 10px', borderRadius: '6px', border: '1px solid #444',
              background: '#333', color: '#e0dbd4', cursor: 'pointer', fontSize: '12px', fontWeight: 600,
            }}
            title="Fontti"
          >
            <option value="serif">Fontti · Serif</option>
            <option value="sans">Fontti · Sans</option>
            <option value="classic">Fontti · Klassinen</option>
            <option value="modern">Fontti · Moderni</option>
          </select>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>

          <div style={{ display: 'flex', alignItems: 'center', background: '#333', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setZoom(z => Math.max(40, z - 10))}
              style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}
            ><ZoomOut size={14} /></button>
            <span style={{ padding: '0 4px', fontSize: '12px', color: '#e0dbd4', minWidth: '38px', textAlign: 'center' }}>{zoom}%</span>
            <button
              onClick={() => setZoom(z => Math.min(150, z + 10))}
              style={{ padding: '6px 8px', background: 'transparent', border: 'none', color: '#ccc', cursor: 'pointer' }}
            ><ZoomIn size={14} /></button>
          </div>

          <div style={{ width: '1px', height: '24px', background: '#3a3a3a' }} />

          <button
            onClick={handleDownloadPDF}
            disabled={isDownloading}
            style={{
              padding: '7px 14px', borderRadius: '8px',
              background: '#333', border: '1px solid #444',
              color: '#ccc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
            }}
          >
            {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            PDF
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            style={{
              padding: '7px 10px', borderRadius: '8px',
              background: 'transparent', border: '1px solid #3a3a3a',
              color: '#ef4444', cursor: 'pointer',
            }}
          >
            {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              padding: '7px 18px', borderRadius: '8px',
              background: isSaving ? '#555' : 'linear-gradient(135deg, #22c55e, #16a34a)',
              border: 'none', color: '#fff', cursor: 'pointer',
              fontWeight: 700, fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '6px',
              boxShadow: '0 2px 8px rgba(34,197,94,0.25)',
            }}
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Tallenna
          </button>
        </div>
      </div>

      {/* ══ MAIN AREA ═════════════════════════════════════════════ */}
      <div ref={mainAreaRef} style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        <div
          style={{
            width: `${leftRatio * 100}%`,
            overflow: 'auto',
            background: '#1e1e1e',
            display: 'flex',
            justifyContent: 'center',
            padding: '32px 24px',
            position: 'relative',
            transition: isDragging ? 'none' : 'width 0.05s linear',
          }}
        >
          {toolbar.visible && toolbar.hasSelection && (
            <div
              style={{
                position: 'absolute',
                left: `calc(50% - 105mm + ${toolbar.x}px)`,
                top: `${32 + toolbar.y * scaleValue}px`,
                transform: 'translateX(-50%) translateY(-100%)',
                zIndex: 100,
                background: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '10px',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'auto',
              }}
            >
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('bold'); }}
                style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}
                title="Lihavointi"
              ><Bold size={14} /></button>
              <button
                onMouseDown={e => { e.preventDefault(); execCmd('italic'); }}
                style={{ padding: '4px 8px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#e0dbd4', cursor: 'pointer', fontSize: '14px', fontStyle: 'italic' }}
                title="Kursiivi"
              ><Italic size={14} /></button>
              <div style={{ width: '1px', height: '18px', background: '#444' }} />

              <button
                onMouseDown={e => { e.preventDefault(); setStyleSettings(p => ({ ...p, fontSize: Math.max(8, p.fontSize - 0.5) })); }}
                style={{ padding: '4px 6px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer' }}
              ><Minus size={12} /></button>
              <span style={{ fontSize: '12px', color: '#e0dbd4', minWidth: '28px', textAlign: 'center' }}>{styleSettings.fontSize}pt</span>
              <button
                onMouseDown={e => { e.preventDefault(); setStyleSettings(p => ({ ...p, fontSize: Math.min(16, p.fontSize + 0.5) })); }}
                style={{ padding: '4px 6px', borderRadius: '5px', border: 'none', background: 'transparent', color: '#aaa', cursor: 'pointer' }}
              ><Plus size={12} /></button>
            </div>
          )}

          <div
            ref={editorRef}
            style={{
              transform: `scale(${scaleValue})`,
              transformOrigin: 'top center',
              marginBottom: `calc(${(scaleValue - 1) * 297}mm)`,
            }}
          >
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', top: '297mm', left: '-20px', right: '-20px',
                zIndex: 20, pointerEvents: 'none',
              }}>
                <div style={{ borderTop: '2px dashed rgba(239,68,68,0.6)', position: 'relative' }}>
                  <span style={{
                    position: 'absolute', top: '-10px', right: '0',
                    background: 'rgba(239,68,68,0.8)', color: 'white',
                    fontSize: '10px', padding: '1px 8px', borderRadius: '4px', fontWeight: 700,
                  }}>Sivu 1 / Sivu 2</span>
                </div>
              </div>

              <CoverLetterContainer>
                <CoverLetterRenderer
                  raw={engineRaw}
                  isEditing={true}
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
                    }));
                  }}
                />
              </CoverLetterContainer>
            </div>
          </div>
        </div>

        {/* Raahattava väliseinä */}
        <div
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
          style={{
            width: '8px',
            background: isDragging ? '#f97316' : '#2a2a2a',
            borderLeft: '1px solid #333',
            borderRight: '1px solid #333',
            cursor: 'col-resize',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: isDragging ? 'none' : 'background 0.15s',
            zIndex: 10,
          }}
          title="Raahaa muuttaaksesi paneelin kokoa"
          onMouseEnter={(e) => { if (!isDragging) e.currentTarget.style.background = '#3a3a3a'; }}
          onMouseLeave={(e) => { if (!isDragging) e.currentTarget.style.background = '#2a2a2a'; }}
        >
          <GripVertical size={14} style={{ color: isDragging ? '#fff' : '#666', pointerEvents: 'none' }} />
        </div>

        <div style={{
          width: `${(1 - leftRatio) * 100}%`,
          background: '#252525',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flexShrink: 0,
          minWidth: '200px',
          transition: isDragging ? 'none' : 'width 0.05s linear',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
            <button
              style={{
                flex: 1, padding: '12px', fontSize: '12px', fontWeight: 700,
                background: !showHistory ? '#2e2e2e' : 'transparent',
                borderBottom: !showHistory ? '2px solid #f97316' : '2px solid transparent',
                border: 'none', color: !showHistory ? '#f97316' : '#888', cursor: 'pointer',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
              onClick={() => setShowHistory(false)}
            >AI Muokkaus</button>
            <button
              style={{
                flex: 1, padding: '12px', fontSize: '12px', fontWeight: 700,
                background: showHistory ? '#2e2e2e' : 'transparent',
                borderBottom: showHistory ? '2px solid #f97316' : '2px solid transparent',
                border: 'none', color: showHistory ? '#f97316' : '#888', cursor: 'pointer',
                letterSpacing: '0.05em', textTransform: 'uppercase',
              }}
              onClick={() => setShowHistory(true)}
            >Historia</button>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
            {!showHistory ? (
              <>
                {showSuccess && (
                  <div style={{
                    marginBottom: '16px', padding: '12px', borderRadius: '10px',
                    background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                  }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <CheckCircle size={16} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
                      <p style={{ fontSize: '12px', color: '#86efac', margin: 0 }}>{latestChanges}</p>
                    </div>
                  </div>
                )}
                <IterativeFeedback
                  coverLetterId={id}
                  iterationCost={iterationCost}
                  currentTokens={tokens}
                  onSuccess={handleIterationSuccess}
                />
              </>
            ) : (
              <div>
                {letterData?.ai_data?.iterations?.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {letterData.ai_data.iterations.map((iter: any, i: number) => (
                      <div key={i} style={{
                        padding: '12px', borderRadius: '10px',
                        background: '#2e2e2e', border: '1px solid #3a3a3a',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#f97316' }}>Versio {iter.version}</span>
                          <span style={{ fontSize: '11px', color: '#666' }}>{new Date(iter.timestamp).toLocaleDateString('fi-FI')}</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#999', margin: '0 0 4px', fontStyle: 'italic' }}>"{iter.user_feedback}"</p>
                        <p style={{ fontSize: '11px', color: '#666', margin: 0 }}>✅ {iter.changes_made}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', marginTop: '40px' }}>
                    Ei muutoshistoriaa vielä.
                  </p>
                )}
              </div>
            )}
          </div>

          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid #333',
            background: '#1e1e1e',
          }}>
            <p style={{ fontSize: '11px', color: '#555', margin: 0, lineHeight: '1.5' }}>
              💡 Klikkaa tekstiä muokataksesi · Valitse teksti muotoiluun · Monogrammi = väri
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}