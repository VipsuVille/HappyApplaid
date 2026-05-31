'use client';
// lib/cover-letter/skins/Greeting.tsx
// ✅ Designer-skin (kuva 2): tumma yläbanneri jossa iso "Hello" + käsiala-nimi,
//    alla kolmen sarakkeen yhteystiedot (YHTEYS / OSOITE / YRITYS), sans-leipäteksti.
//    background.mode 'generated' | 'image-strong' → kuva banneriin (opacity = himmennys).

import React from 'react';
import type { CLEngine } from '../engine/types';
import {
  EditableText,
  EditableParagraphs,
  Signature,
  DateRow,
  BackgroundLayer,
  ColorDot,
} from '../engine/components';

export default function Greeting({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;
  const bg = data.style.background;

  const bannerImage =
    !!bg.imageUrl && (bg.mode === 'generated' || bg.mode === 'image-strong') ? bg.imageUrl : null;
  const bannerOpacity = bg.opacity ?? 0.5;

  // Bannerin korkeus editorista (divider.sizeMm). Oletus 62mm.
  const bannerH = data.style.divider?.sizeMm ? `${data.style.divider.sizeMm}mm` : '62mm';

  const colLabel: React.CSSProperties = {
    margin: '0 0 8px',
    fontSize: '11pt',
    fontWeight: 700,
    letterSpacing: '2px',
    color: '#1f2937',
    fontFamily: fontStack('classic'),
  };
  const colValue: React.CSSProperties = { fontSize: '9.5pt', color: '#475569', lineHeight: 1.5 };

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack('sans'),
        color: data.style.text.textColor,
        overflow: 'hidden',
      }}
    >
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* ── TUMMA YLÄBANNERI ─────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: bannerH,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 56px',
          overflow: 'hidden',
          background: bannerImage ? '#1c1c20' : 'linear-gradient(120deg, #232327 0%, #18181c 100%)',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {bannerImage && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `url(${bannerImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: bannerOpacity,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />
        )}

        {/* Iso haalea "Hello" */}
        <h2
          style={{
            position: 'relative',
            zIndex: 1,
            margin: 0,
            fontSize: '64px',
            fontWeight: 800,
            color: 'rgba(255,255,255,0.16)',
            letterSpacing: '-2px',
            lineHeight: 1,
            fontFamily: fontStack('sans'),
          }}
        >
          Hello
        </h2>

        {/* Oikealla: COVER LETTER -label + käsiala-nimi */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'right' }}>
          <p style={{ margin: '0 0 6px', fontSize: '10pt', letterSpacing: '4px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', fontFamily: fontStack('sans') }}>
            Cover Letter
          </p>
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              fontSize: '34px',
              fontWeight: 400,
              color: accent,
              lineHeight: 1.1,
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
            }}
            placeholder="Nimi"
          />
        </div>
      </div>

      {/* ── KOLMEN SARAKKEEN YHTEYSTIEDOT ────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          background: '#eef1f7',
          padding: '26px 56px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '24px',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* YHTEYS */}
        <div>
          <p style={colLabel}>YHTEYS</p>
          {data.contact.phone && (
            <EditableText engine={engine} as="div" value={data.contact.phone} onCommit={(v) => updateContact('phone', v)} style={{ ...colValue, marginBottom: '4px' }} placeholder="puhelin" />
          )}
          {data.contact.email && (
            <EditableText engine={engine} as="div" value={data.contact.email} onCommit={(v) => updateContact('email', v)} style={{ ...colValue, wordBreak: 'break-word' }} placeholder="sähköposti" />
          )}
        </div>

        {/* OSOITE */}
        <div>
          <p style={colLabel}>OSOITE</p>
          <EditableText engine={engine} as="div" value={data.contact.location || ''} onCommit={(v) => updateContact('location', v)} style={colValue} placeholder="paikkakunta" />
        </div>

        {/* YRITYS */}
        <div>
          <p style={colLabel}>YRITYS</p>
          <EditableText engine={engine} as="div" value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={colValue} placeholder="yritys" />
        </div>
      </div>

      {/* ── LEIPÄTEKSTI ──────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '36px 56px 56px' }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} closing="Ystävällisin terveisin" />
      </div>
    </div>
  );
}