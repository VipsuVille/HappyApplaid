'use client';
// lib/cover-letter/skins/Greeting.tsx
// ✅ Designer-skin (kuva 2): tumma yläbanneri ("Hello" + käsiala-nimi),
//    alla vaalea kolmen sarakkeen yhteystietopalkki, sans-leipäteksti.
//
// Kuva bannerin keskelle tulee KUMMASTA tahansa lähteestä:
//   1) data.style.image (placement 'banner-center')  ← AdaptiveControls-valitsin
//   2) data.style.background.imageUrl (generated/image-strong) ← vanha TAUSTAKUVA-paneeli
//
// Kyvykkyydet (capabilities.ts → 'greeting'):
//   • banner.color / banner.heightMm / banner.textColor
//   • band.color / band.heightMm
//   • regions.heading (nimen koko px), regions.body (leipäteksti pt)

import React from 'react';
import type { CLEngine } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
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

  // ── Banneri ──
  const bannerColor = data.style.banner?.color || 'linear-gradient(120deg, #232327 0%, #18181c 100%)';
  const bannerTextColor = data.style.banner?.textColor || '#ffffff';
  const bannerH = `${data.style.banner?.heightMm ?? data.style.divider?.sizeMm ?? 62}mm`;

  // ── Kuva keskelle banneria — kummasta tahansa lähteestä ──
  const img = data.style.image;
  const bg = data.style.background;
  const centerImage =
    (img?.placement === 'banner-center' && img.url) ? img.url :
    (bg?.imageUrl && (bg.mode === 'generated' || bg.mode === 'image-strong')) ? bg.imageUrl :
    null;
  const centerOpacity = img?.opacity ?? bg?.opacity ?? 1;

  // ── Vaalea yhteystietopalkki ──
  const bandColor = data.style.band?.color || '#eef1f7';
  const bandHeight = data.style.band?.heightMm ? `${data.style.band.heightMm}mm` : undefined;

  // ── Alueittainen typografia ──
  const headingSize = data.style.regions?.heading?.fontSize; // px

  const colLabel: React.CSSProperties = {
    margin: '0 0 8px', fontSize: '11pt', fontWeight: 700, letterSpacing: '2px',
    color: '#1f2937', fontFamily: fontStack('classic'),
  };
  const colValue: React.CSSProperties = { fontSize: '9.5pt', color: '#475569', lineHeight: 1.5 };

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm', minHeight: '297mm',
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
          position: 'relative', height: bannerH,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 56px', overflow: 'hidden',
          background: bannerColor,
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >
        {/* Kuva keskelle (banner-center) */}
        {centerImage && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
            <img
              src={centerImage}
              alt=""
              style={{
                height: '82%', width: 'auto', maxWidth: '40%', objectFit: 'cover',
                borderRadius: '8px',
                opacity: centerOpacity,
                WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
              }}
            />
          </div>
        )}

        {/* Iso haalea "Hello" (koristeteksti) */}
        <h2
          style={{
            position: 'relative', zIndex: 2, margin: 0,
            fontSize: '64px', fontWeight: 800,
            color: rgba(bannerTextColor, 0.16),
            letterSpacing: '-2px', lineHeight: 1, fontFamily: fontStack('sans'),
          }}
        >
          Hello
        </h2>

        {/* Oikealla: COVER LETTER + käsiala-nimi */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'right' }}>
          <p style={{ margin: '0 0 6px', fontSize: '10pt', letterSpacing: '4px', textTransform: 'uppercase', color: rgba(bannerTextColor, 0.7), fontFamily: fontStack('sans') }}>
            Cover Letter
          </p>
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              fontSize: headingSize ? `${headingSize}px` : '34px',
              fontWeight: 400, color: accent, lineHeight: 1.1,
              fontFamily: "'Brush Script MT', 'Segoe Script', cursive",
            }}
            placeholder="Nimi"
          />
        </div>
      </div>

      {/* ── VAALEA YHTEYSTIETOPALKKI ─────────────────────────── */}
      <div
        style={{
          position: 'relative', zIndex: 1,
          background: bandColor, padding: '26px 56px',
          ...(bandHeight ? { minHeight: bandHeight, display: 'flex', alignItems: 'center' } : {}),
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >
        <div style={{ width: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px' }}>
          <div>
            <p style={colLabel}>YHTEYS</p>
            {data.contact.phone && (
              <EditableText engine={engine} as="div" value={data.contact.phone} onCommit={(v) => updateContact('phone', v)} style={{ ...colValue, marginBottom: '4px' }} placeholder="puhelin" />
            )}
            {data.contact.email && (
              <EditableText engine={engine} as="div" value={data.contact.email} onCommit={(v) => updateContact('email', v)} style={{ ...colValue, wordBreak: 'break-word' }} placeholder="sähköposti" />
            )}
          </div>
          <div>
            <p style={colLabel}>OSOITE</p>
            <EditableText engine={engine} as="div" value={data.contact.location || ''} onCommit={(v) => updateContact('location', v)} style={colValue} placeholder="paikkakunta" />
          </div>
          <div>
            <p style={colLabel}>YRITYS</p>
            <EditableText engine={engine} as="div" value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={colValue} placeholder="yritys" />
          </div>
        </div>
      </div>

      {/* ── LEIPÄTEKSTI ──────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '36px 56px 56px' }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} region="body" />
        <Signature engine={engine} marginTop={48} closing="Ystävällisin terveisin" />
      </div>
    </div>
  );
}