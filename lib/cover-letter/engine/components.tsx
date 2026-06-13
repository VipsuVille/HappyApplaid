// lib/cover-letter/engine/components.tsx
// ✅ Jaetut muokattavat palaset. Skinit käyttävät näitä — eivät toista muokkauslogiikkaa.
// Exportit: EditableText, EditableField, EditableParagraphs, Signature,
//           ContactRow, DateRow, BackgroundLayer, ColorDot

import React, { useRef, useEffect } from 'react';
import type { CLEngine, CLContactInfo, SignatureStyle } from './types';
import { rgba } from './useCoverLetterEngine';

// HTML-escape plain-text-sisällölle
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Onko merkkijono jo HTML:ää (sisältää muotoilutageja)?
function hasHtml(s: string): boolean {
  return /<\/?(span|b|i|strong|em|br|u|font|p|div)\b/i.test(s);
}

// ─── Muokkaustyylit ───────────────────────────────────────────
const editOutline = (editing: boolean): React.CSSProperties => editing ? {
  outline: '2px solid #f97316',
  borderRadius: '4px',
  padding: '2px 6px',
  cursor: 'text',
  transition: 'outline 0.15s',
} : {};

// ─── EditableText: yksittäinen muokattava kenttä (PELKKÄ TEKSTI) ──
export function EditableText({
  engine,
  value,
  onCommit,
  style,
  as = 'span',
  placeholder,
}: {
  engine: CLEngine;
  value: string;
  onCommit: (v: string) => void;
  style?: React.CSSProperties;
  as?: 'span' | 'div' | 'h1' | 'p';
  placeholder?: string;
}) {
  const Tag = as as any;
  if (!engine.isEditing) {
    return <Tag style={style}>{value || placeholder || ''}</Tag>;
  }
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      onBlur={(e: React.FocusEvent<HTMLElement>) => onCommit(e.currentTarget.innerText)}
      style={{ ...style, ...editOutline(true), minWidth: '40px', display: 'inline-block' }}
      title={placeholder ? `Klikkaa muokataksesi: ${placeholder}` : 'Klikkaa muokataksesi'}
    >
      {value}
    </Tag>
  );
}

// ─── EditableField: HTML-säilyttävä kenttä (koko/väri maalaamalla) ──
export function EditableField({
  engine,
  value,
  onCommit,
  style,
  as = 'span',
  placeholder,
}: {
  engine: CLEngine;
  value: string;
  onCommit: (v: string) => void;
  style?: React.CSSProperties;
  as?: 'span' | 'div' | 'p';
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const html = hasHtml(value) ? value : escapeHtml(value || '');

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [html]);

  if (!engine.isEditing) {
    const Tag = as as any;
    return <Tag style={style} dangerouslySetInnerHTML={{ __html: html || (placeholder ? escapeHtml(placeholder) : '') }} />;
  }

  const Tag = as as any;
  return (
    <Tag
      ref={ref as any}
      contentEditable
      suppressContentEditableWarning
      onInput={(e: React.FormEvent<HTMLElement>) => onCommit((e.currentTarget as HTMLElement).innerHTML)}
      style={{ ...style, ...editOutline(true), minWidth: '40px', display: 'inline-block' }}
      title={placeholder ? `Klikkaa muokataksesi: ${placeholder}` : 'Klikkaa muokataksesi'}
    />
  );
}

// ─── EditableParagraphs: leipäteksti ──────────────────────────
export function EditableParagraphs({ engine, region }: { engine: CLEngine; region?: string }) {
  const { isEditing, data, fontStack, updateBody } = engine;
  const base = data.style.text;
  const ov = (region && data.style.regions?.[region]) || {};
  const fontSize = ov.fontSize ?? base.fontSize;   // pt
  const textColor = ov.textColor ?? base.textColor;
  const { lineHeight, textAlign } = base;
  const paragraphSpacing = Math.round(fontSize * 1.6);

  const raw = data.body || '';
  const looksLikeHtml = hasHtml(raw);
  const html = looksLikeHtml
    ? raw
    : (raw.split('\n\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('') || '<p></p>');

  const ref = useRef<HTMLDivElement>(null);
  const cls = `cl-paras-${region || 'body'}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [html]);

  const wrapStyle: React.CSSProperties = {
    lineHeight, fontSize: `${fontSize}pt`, fontFamily: fontStack(), color: textColor, textAlign,
  };
  const spacingStyle = `.${cls} p { margin: 0 0 ${paragraphSpacing}px; } .${cls} p:last-child { margin-bottom: 0; }`;

  if (!isEditing) {
    return (
      <>
        <style>{spacingStyle}</style>
        <div className={cls} style={wrapStyle} dangerouslySetInnerHTML={{ __html: html }} />
      </>
    );
  }

  return (
    <>
      <style>{spacingStyle}</style>
      <div
        ref={ref}
        className={cls}
        contentEditable
        suppressContentEditableWarning
        onInput={(e) => updateBody(e.currentTarget.innerHTML)}
        style={{ ...wrapStyle, outline: '2px solid #f97316', borderRadius: '4px', padding: '6px', minHeight: '1.5em' }}
      />
    </>
  );
}

// ─── Signature: 3 tyyliä, muokattava nimi + valinnainen muokattava tervehdys ──
export function Signature({
  engine,
  centered = false,
  marginTop = 48,
  closing = 'Ystävällisin terveisin',
  editableClosing = false,
  onClosingCommit,
}: {
  engine: CLEngine;
  centered?: boolean;
  marginTop?: number;
  closing?: string;
  editableClosing?: boolean;
  onClosingCommit?: (v: string) => void;
}) {
  const { data, fontStack, updateContact, updateStyle } = engine;
  const accent = data.style.accentColor;
  const sig = data.style.signatureStyle;

  const sigStyles: Record<SignatureStyle, React.CSSProperties> = {
    script: { fontSize: '17pt', fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontWeight: 400, color: accent },
    print: { fontSize: '13pt', fontFamily: fontStack('sans'), fontWeight: 600, letterSpacing: '0.5px', color: data.style.text.textColor },
    bold: { fontSize: '15pt', fontFamily: fontStack('serif'), fontStyle: 'italic', fontWeight: 700, color: data.style.text.textColor },
  };
  const nameStyle = sigStyles[sig] || sigStyles.script;

  const closingStyle: React.CSSProperties = {
    marginBottom: '8px', fontSize: '9pt', color: '#94a3b8',
    fontFamily: fontStack('sans'), letterSpacing: '1px', textTransform: 'uppercase',
  };

  const commitClosing = (v: string) => {
    if (onClosingCommit) onClosingCommit(v);
    else updateStyle({ closingText: v } as any);
  };

  return (
    <div style={{ marginTop: `${marginTop}px`, textAlign: centered ? 'center' : 'left' }}>
      <div style={{ width: '40px', height: '2px', background: accent, margin: centered ? '0 auto 16px' : '0 0 16px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
      {editableClosing && engine.isEditing ? (
        <p style={closingStyle}>
          <EditableText engine={engine} value={closing} onCommit={commitClosing} style={{ ...closingStyle, marginBottom: 0 }} placeholder="Lopputervehdys" />
        </p>
      ) : (
        <p style={closingStyle}>{closing}</p>
      )}
      <EditableText
        engine={engine}
        value={data.contact.name}
        onCommit={(v) => updateContact('name', v)}
        style={nameStyle}
        placeholder="Nimi"
      />
    </div>
  );
}

// ─── ContactIcon: inline-SVG (ei fonttiriippuvuutta) ──────────
function ContactIcon({ type, color }: { type: 'email' | 'phone' | 'location'; color: string }) {
  const p = {
    width: 14, height: 14, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, strokeWidth: 2,
    strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    style: { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' } as React.CSSProperties,
  };
  if (type === 'email') {
    return <svg {...p}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" /></svg>;
  }
  if (type === 'phone') {
    return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
  }
  return <svg {...p}><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>;
}

// ─── ContactRow: yhteystiedot (SVG-ikonit + HTML-säilyttävät kentät) ──
export function ContactRow({
  engine,
  vertical = false,
  centered = false,
  onDark = false,
}: {
  engine: CLEngine;
  vertical?: boolean;
  centered?: boolean;
  onDark?: boolean;
}) {
  const { data, fontStack, updateContact } = engine;
  const accent = data.style.accentColor;
  const txt = onDark ? 'rgba(255,255,255,0.75)' : '#64748b';
  const iconColor = onDark ? 'rgba(255,255,255,0.9)' : accent;
  const chip = onDark ? 'rgba(255,255,255,0.12)' : rgba(accent, 0.12);
  const fs = Math.max(8, data.style.text.fontSize * 0.88);

  const items: { field: keyof CLContactInfo; type: 'email' | 'phone' | 'location'; ph: string }[] = [
    { field: 'email', type: 'email', ph: 'sähköposti' },
    { field: 'phone', type: 'phone', ph: 'puhelin' },
    { field: 'location', type: 'location', ph: 'paikkakunta' },
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      gap: vertical ? '14px' : '28px',
      flexWrap: 'wrap',
      justifyContent: centered ? 'center' : 'flex-start',
      fontSize: `${fs}pt`,
      fontFamily: fontStack('sans'),
    }}>
      {items.map(({ field, type, ph }) =>
        data.contact[field] ? (
          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: txt }}>
            <span style={{
              width: '26px', height: '26px', borderRadius: '7px', background: chip,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
            }}>
              <ContactIcon type={type} color={iconColor} />
            </span>
            <EditableField engine={engine} value={data.contact[field]} onCommit={(v) => updateContact(field, v)} style={{ color: txt, wordBreak: 'break-word' }} placeholder={ph} />
          </div>
        ) : null
      )}
    </div>
  );
}

// ─── DateRow: päiväys + ohut viiva ────────────────────────────
export function DateRow({
  engine,
  centered = false,
  onDark = false,
}: {
  engine: CLEngine;
  centered?: boolean;
  onDark?: boolean;
}) {
  const { data, fontStack } = engine;
  const accent = data.style.accentColor;

  // Näytä päiväys vain jos engine sallii (showDate oletuksena true)
  const show = (data.style as any).showDate ?? (data as any).showDate ?? true;
  if (!show) return null;

  const dateText =
    (data as any).dateText ||
    new Date().toLocaleDateString('fi-FI', { day: 'numeric', month: 'long', year: 'numeric' });

  const color = onDark ? 'rgba(255,255,255,0.8)' : '#64748b';
  const fs = Math.max(8, data.style.text.fontSize * 0.9);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      justifyContent: centered ? 'center' : 'flex-start',
      margin: '6px 0',
    }}>
      <span style={{ fontSize: `${fs}pt`, fontFamily: fontStack('sans'), color }}>{dateText}</span>
      <span style={{
        flex: centered ? 'unset' : 1, height: '1px', minWidth: centered ? '40px' : undefined,
        background: rgba(accent, 0.4),
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }} />
    </div>
  );
}

// ─── BackgroundLayer: koko sivun taustakuva (background.mode === 'image-faint') ──
export function BackgroundLayer({ engine }: { engine: CLEngine }) {
  const bg = (engine.data.style as any).background as
    | { mode?: string; imageUrl?: string; opacity?: number }
    | undefined;

  if (!bg || bg.mode !== 'image-faint' || !bg.imageUrl) return null;

  return (
    <div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        opacity: bg.opacity ?? 0.08,
        pointerEvents: 'none',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    />
  );
}

// ─── ColorDot: kelluva korostusvärin valitsin (vain muokkaustilassa) ──
// ─── ColorDot: kelluva korostusvärin valitsin (vain muokkaustilassa) ──
export function ColorDot({
  engine,
  position = 'top-right',
}: {
  engine: CLEngine;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}) {
  const { isEditing, data, updateStyle } = engine;
  if (!isEditing) return null;

  const accent = data.style.accentColor;

  // position → sijoittelu
  const pos: React.CSSProperties =
    position === 'top-left'     ? { top: '12px', left: '12px' }
    : position === 'bottom-right' ? { bottom: '12px', right: '12px' }
    : position === 'bottom-left'  ? { bottom: '12px', left: '12px' }
    : { top: '12px', right: '12px' }; // top-right (oletus)

  return (
    <label
      title="Vaihda korostusväri"
      style={{
        position: 'absolute',
        ...pos,
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        background: accent,
        border: '2px solid #fff',
        boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
        cursor: 'pointer',
        zIndex: 30,
        display: 'inline-block',
      }}
    >
      <input
        type="color"
        value={accent?.startsWith('#') ? accent : '#B59850'}
        onChange={(e) => updateStyle({ accentColor: e.target.value } as any)}
        style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
      />
    </label>
  );
}