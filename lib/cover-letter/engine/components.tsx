// lib/cover-letter/engine/components.tsx
// ✅ Jaetut muokattavat palaset. Skinit käyttävät näitä — eivät toista muokkauslogiikkaa.

import React, { useRef, useEffect } from 'react';
import type { CLEngine, CLContactInfo, SignatureStyle } from './types';
import { rgba } from './useCoverLetterEngine';

// HTML-escape plain-text-kappaleille
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Muokkaustyylit ───────────────────────────────────────────
const editOutline = (editing: boolean): React.CSSProperties => editing ? {
  outline: '2px solid #f97316',
  borderRadius: '4px',
  padding: '2px 6px',
  cursor: 'text',
  transition: 'outline 0.15s',
} : {};

// ─── EditableText: yksittäinen muokattava kenttä ──────────────
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

// ─── EditableParagraphs: leipäteksti ──────────────────────────
// ✅ KONTROLLOIMATON contentEditable: DOM-sisältö asetetaan vain kun teksti
//    muuttuu ULKOPUOLELTA (lataus / AI / pohjanvaihto). Editoinnin aikana
//    React EI kosketa sisältöä → kohdistin ja tekstivalinta eivät nollaudu.
//    Säilyttää inline-muotoilun (värit/lihavointi/kursiivi) HTML:nä.
export function EditableParagraphs({ engine, region }: { engine: CLEngine; region?: string }) {
  const { isEditing, data, fontStack, updateBody } = engine;
  const base = data.style.text;
  const ov = (region && data.style.regions?.[region]) || {};
  const fontSize = ov.fontSize ?? base.fontSize;   // pt
  const textColor = ov.textColor ?? base.textColor;
  const { lineHeight, textAlign } = base;
  const paragraphSpacing = Math.round(fontSize * 1.6);

  const raw = data.body || '';
  const looksLikeHtml = /<\/?(p|span|b|i|strong|em|br|u|font|div)\b/i.test(raw);

  // Yhtenäinen sisäinen HTML-muoto (kappaleet <p>-tageissa)
  const html = looksLikeHtml
    ? raw
    : (raw.split('\n\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('') || '<p></p>');

  const ref = useRef<HTMLDivElement>(null);
  const cls = `cl-paras-${region || 'body'}`;

  // Aseta sisältö vain kun ULKOINEN html eroaa DOM:sta (ei editoinnin aikana)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [html]);

  const wrapStyle: React.CSSProperties = {
    lineHeight,
    fontSize: `${fontSize}pt`,
    fontFamily: fontStack(),
    color: textColor,
    textAlign,
  };

  // Kappaleväli sisäisille <p>-tageille (dynaaminen)
  const spacingStyle = `.${cls} p { margin: 0 0 ${paragraphSpacing}px; } .${cls} p:last-child { margin-bottom: 0; }`;

  // Esikatselu / PDF (ei muokattava)
  if (!isEditing) {
    return (
      <>
        <style>{spacingStyle}</style>
        <div className={cls} style={wrapStyle} dangerouslySetInnerHTML={{ __html: html }} />
      </>
    );
  }

  // Muokkaustila — kontrolloimaton, commit onInput (pitää tilan synkassa nollaamatta valintaa)
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

// ─── Signature: 3 tyyliä, muokattava nimi ─────────────────────
export function Signature({
  engine,
  centered = false,
  marginTop = 48,
  closing = 'Ystävällisin terveisin',
}: {
  engine: CLEngine;
  centered?: boolean;
  marginTop?: number;
  closing?: string;
}) {
  const { data, fontStack, updateContact } = engine;
  const accent = data.style.accentColor;
  const sig = data.style.signatureStyle;

  const sigStyles: Record<SignatureStyle, React.CSSProperties> = {
    script: { fontSize: '17pt', fontFamily: "'Brush Script MT', 'Segoe Script', cursive", fontWeight: 400, color: accent },
    print: { fontSize: '13pt', fontFamily: fontStack('sans'), fontWeight: 600, letterSpacing: '0.5px', color: data.style.text.textColor },
    bold: { fontSize: '15pt', fontFamily: fontStack('serif'), fontStyle: 'italic', fontWeight: 700, color: data.style.text.textColor },
  };
  const nameStyle = sigStyles[sig] || sigStyles.script;

  return (
    <div style={{ marginTop: `${marginTop}px`, textAlign: centered ? 'center' : 'left' }}>
      <div style={{ width: '40px', height: '2px', background: accent, margin: centered ? '0 auto 16px' : '0 0 16px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
      <p style={{ marginBottom: '8px', fontSize: '9pt', color: '#94a3b8', fontFamily: fontStack('sans'), letterSpacing: '1px', textTransform: 'uppercase' }}>
        {closing}
      </p>
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

// ─── ContactRow: yhteystiedot (vaaka/pysty/keskitetty) ────────
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
  const chip = onDark ? 'rgba(255,255,255,0.12)' : rgba(accent, 0.08);
  const fs = Math.max(8, data.style.text.fontSize * 0.88);

  const items: { field: keyof CLContactInfo; icon: string; ph: string }[] = [
    { field: 'email', icon: '✉', ph: 'sähköposti' },
    { field: 'phone', icon: '☎', ph: 'puhelin' },
    { field: 'location', icon: '⌖', ph: 'paikkakunta' },
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
      {items.map(({ field, icon, ph }) =>
        data.contact[field] ? (
          <div key={field} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: txt }}>
            <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: chip, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>{icon}</span>
            <EditableText engine={engine} value={data.contact[field]} onCommit={(v) => updateContact(field, v)} style={{ color: txt, wordBreak: 'break-word' }} placeholder={ph} />
          </div>
        ) : null
      )}
    </div>
  );
}

// ─── DateRow: päiväys + viiva ─────────────────────────────────
export function DateRow({ engine }: { engine: CLEngine }) {
  const { data, todayStr, fontStack } = engine;
  if (!data.style.showDate) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
      <span style={{ fontSize: '9pt', color: '#94a3b8', fontFamily: fontStack('sans'), letterSpacing: '1px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
        {todayStr}
      </span>
      <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
    </div>
  );
}

// ─── BackgroundLayer: väri / häilyvä kuva / vahva kuva / generoitu ─
export function BackgroundLayer({ engine }: { engine: CLEngine }) {
  const { mode, imageUrl, opacity } = engine.data.style.background;

  // Vain image-faint piirtyy koko sivulle. Muut moodit → skin hoitaa.
  if (mode !== 'image-faint' || !imageUrl) return null;

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
      backgroundImage: `url(${imageUrl})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      opacity: opacity ?? 0.12,
      WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
    }} />
  );
}

// ─── ColorDot: pieni värinvalitsin (muokkaustilassa) ──────────
export function ColorDot({ engine, position = 'top-right' }: { engine: CLEngine; position?: 'top-right' | 'inline' }) {
  if (!engine.isEditing) return null;
  const accent = engine.data.style.accentColor;
  const posStyle: React.CSSProperties = position === 'top-right'
    ? { position: 'absolute', top: '16px', right: '18px', zIndex: 5 }
    : { display: 'inline-block' };
  return (
    <div style={posStyle}>
      <label style={{ cursor: 'pointer', display: 'inline-flex' }} title="🎨 Vaihda korostusväri">
        <span style={{ width: '26px', height: '26px', borderRadius: '50%', background: accent, border: '2px solid #fff', boxShadow: '0 0 0 1px #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>🎨</span>
        <input
          type="color"
          value={accent.startsWith('#') ? accent : '#1a1a2e'}
          onChange={(e) => engine.updateStyle({ accentColor: e.target.value })}
          style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }}
        />
      </label>
    </div>
  );
}