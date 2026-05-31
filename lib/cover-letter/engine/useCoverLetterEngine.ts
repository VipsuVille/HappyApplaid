// lib/cover-letter/engine/useCoverLetterEngine.ts
// ✅ Yksi paikka kaikelle cover letter -muokkauslogiikalle.
// Skinit (templatet) eivät toista tätä — ne vain piirtävät engine.data:n.

import { useMemo, useCallback } from 'react';
import type {
  CLData, CLRawRecord, CLEngine, CLContactInfo, CLStyle,
  TextSettings, FontFamilyKey, DividerConfig, BackgroundConfig,
} from './types';
// (BannerStyle/BandStyle/SkinImage/RegionText kulkevat CLStyle:n sisällä, ei tarvitse erikseen)

// ─── Fonttipinot ──────────────────────────────────────────────
const FONT_STACKS: Record<FontFamilyKey, string> = {
  serif: "'Libre Baskerville', Georgia, serif",
  sans: "'DM Sans', 'Helvetica Neue', sans-serif",
  classic: "'Merriweather', Georgia, serif",
  modern: "'Inter', 'Segoe UI', sans-serif",
};

// ─── Oletukset ────────────────────────────────────────────────
const DEFAULT_DIVIDER: DividerConfig = { direction: 'horizontal', sizeMm: 70 };
const DEFAULT_BACKGROUND: BackgroundConfig = { mode: 'color' };
const DEFAULT_TEXT: TextSettings = {
  fontFamily: 'serif',
  fontSize: 10.8,
  lineHeight: 1.85,
  textAlign: 'justify',
  textColor: '#1a1a1a',
};

// ─── Raakadata → CLData (lukee nykyisen muodon) ───────────────
function buildCLData(raw: CLRawRecord): CLData {
  const content = raw.content || {};
  const ai = raw.ai_data || {};
  const ci = content.contactInfo || {};

  const contact: CLContactInfo = {
    name: ci.name || ai.name || '',
    email: ci.email || ai.email || '',
    phone: ci.phone || ai.phone || '',
    location: ci.location || ai.location || '',
  };

  // Johdetaan templateStyle vanhasta headerLayout:sta jos uutta ei ole
  const templateStyle =
    content.templateStyle ||
    (content.headerLayout === 'left' ? 'modern-left' : 'modern-top');

  const accentColor = content.accentColor || content.headerColor || '#1a1a2e';

  // Jakaja: käytä tallennettua tai johda templateStylesta
  const divider: DividerConfig = content.divider || (
    templateStyle === 'modern-left'
      ? { direction: 'vertical', sizeMm: 74 }
      : templateStyle === 'classic'
        ? { direction: 'horizontal', sizeMm: 0 } // classicilla ohut yläreuna, ei varsinaista bannerialuetta
        : { direction: 'horizontal', sizeMm: 70 }
  );

  const background: BackgroundConfig = content.background || DEFAULT_BACKGROUND;

  const text: TextSettings = {
    fontFamily: content.fontFamily || 'serif',
    fontSize: content.fontSize ?? DEFAULT_TEXT.fontSize,
    lineHeight: content.lineHeight ?? DEFAULT_TEXT.lineHeight,
    textAlign: content.textAlign || DEFAULT_TEXT.textAlign,
    textColor: content.textColor || DEFAULT_TEXT.textColor,
  };

 const style: CLStyle = {
    templateStyle,
    accentColor,
    divider,
    background,
    text,
    signatureStyle: content.signatureStyle || 'script',
    showDate: content.showDate ?? true,
    // ✅ uudet kentät — luetaan suoraan content:sta (undefined jos ei tallennettu)
    banner: content.banner,
    band: content.band,
    image: content.image,
    regions: content.regions,
  };

  return {
    contact,
    jobTitle: content.job_title || ai.job_title || '',
    companyName: content.company_name || ai.company_name || '',
    title: raw.title,
    body: content.body || '',
    keyHighlights: ai.key_highlights || [],
    language: content.language || 'finnish',
    style,
  };
}

interface UseCoverLetterEngineArgs {
  raw: CLRawRecord;
  isEditing: boolean;
  // Kutsutaan kun data muuttuu. Sivu päättää miten tallentaa (sama kuin nyt).
  onContactChange?: (field: keyof CLContactInfo, value: string) => void;
  onBodyChange?: (newBody: string) => void;
  onFieldChange?: (field: 'jobTitle' | 'companyName' | 'title', value: string) => void;
  onStyleChange?: (patch: Partial<CLStyle>) => void;
}

export function useCoverLetterEngine({
  raw,
  isEditing,
  onContactChange,
  onBodyChange,
  onFieldChange,
  onStyleChange,
}: UseCoverLetterEngineArgs): CLEngine {

  const data = useMemo(() => buildCLData(raw), [raw]);

  const updateContact = useCallback((field: keyof CLContactInfo, value: string) => {
    onContactChange?.(field, value);
  }, [onContactChange]);

  const updateBody = useCallback((newBody: string) => {
    onBodyChange?.(newBody);
  }, [onBodyChange]);

  const updateField = useCallback((field: 'jobTitle' | 'companyName' | 'title', value: string) => {
    onFieldChange?.(field, value);
  }, [onFieldChange]);

  const updateStyle = useCallback((patch: Partial<CLStyle>) => {
    onStyleChange?.(patch);
  }, [onStyleChange]);

  const updateText = useCallback((patch: Partial<TextSettings>) => {
    onStyleChange?.({ text: { ...data.style.text, ...patch } });
  }, [onStyleChange, data.style.text]);

  // ─── Johdetut apurit ────────────────────────────────────────
  const paragraphs = useMemo(
    () => (data.body || '').split('\n\n').filter(p => p.trim()),
    [data.body]
  );

  const initials = useMemo(() => {
    const parts = data.contact.name.trim().split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts.slice(1).join(' ')?.charAt(0) || parts[0]?.charAt(1) || '';
    return `${first}${last}`.toUpperCase();
  }, [data.contact.name]);

  const todayStr = useMemo(
    () => new Date().toLocaleDateString(
      data.language === 'english' ? 'en-US' : data.language === 'swedish' ? 'sv-SE' : 'fi-FI',
      { year: 'numeric', month: 'long', day: 'numeric' }
    ),
    [data.language]
  );

  const fontStack = useCallback(
    (key?: FontFamilyKey) => FONT_STACKS[key || data.style.text.fontFamily] || FONT_STACKS.serif,
    [data.style.text.fontFamily]
  );

  return {
    data,
    isEditing,
    updateContact,
    updateBody,
    updateField,
    updateStyle,
    updateText,
    paragraphs,
    initials,
    todayStr,
    fontStack,
  };
}

// Apu: hex → rgb (jaettu komponenttien kanssa)
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  if (hex.startsWith('rgb')) {
    const m = hex.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
    if (m) return { r: +m[1], g: +m[2], b: +m[3] };
  }
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : null;
}

export function rgba(hex: string, alpha: number): string {
  const c = hexToRgb(hex);
  return c ? `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})` : `rgba(26,26,46,${alpha})`;
}