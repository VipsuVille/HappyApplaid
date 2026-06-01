'use client';
// lib/cover-letter/skins/Spine.tsx
// ✅ Editorial-skin (kuva 3): lämmin kraft-palsta vasemmalla, jossa pystyyn
//    käännetty ISO nimi + titteli. Yhteystiedot palstan yläreunassa.
//    Leipäteksti oikealla vaalealla palstalla.
//
// Kyvykkyydet (capabilities.ts → 'spine'):
//   • banner.color   → data.style.banner.color    (kraft-palstan väri)
//   • banner.heightMm→ palstan LEVEYS (pystysuunta)
//   • image edge     → data.style.image (placement 'edge') palstan taustakuvaksi
//   • regions.name   → pystynimen koko (px)
//   • regions.body   → leipätekstin koko (pt)

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

export default function Spine({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;

  // Kraft-palstan väri: banner.color → oletus kraft-sävy
  const kraft = data.style.banner?.color || '#c8a87a';
  // Palstan leveys: banner.heightMm (mm) → oletus 64mm
  const sidebarW = `${data.style.banner?.heightMm ?? 64}mm`;

  // Kuva palstan taustaksi (placement 'edge')
  const img = data.style.image;
  const edgeImage = img?.placement === 'edge' && img.url ? img.url : null;
  const edgeOpacity = img?.opacity ?? 1;

  // Pystynimen koko (regions.name, px)
  const nameSize = data.style.regions?.name?.fontSize;
  const nameColor = data.style.regions?.name?.textColor || '#1a1208';

  // Pystyteksti: luetaan alhaalta ylös.
  const vertical: React.CSSProperties = {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    whiteSpace: 'nowrap',
  };

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack('classic'),
        color: data.style.text.textColor,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* ── VASEN KRAFT-PALSTA ───────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: sidebarW,
          flexShrink: 0,
          background: kraft,
          overflow: 'hidden',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Kuva palstan taustaksi (edge) */}
        {edgeImage && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${edgeImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: edgeOpacity,
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }} />
        )}

        {/* Yhteystiedot palstan yläreunassa (vaaka) */}
        <div style={{ position: 'absolute', top: '28px', left: '20px', right: '20px', zIndex: 2, fontFamily: fontStack('sans'), fontSize: '8pt', color: '#3a2e1f', lineHeight: 1.7 }}>
          {data.contact.phone && (
            <EditableText engine={engine} as="div" value={data.contact.phone} onCommit={(v) => updateContact('phone', v)} style={{ color: '#3a2e1f' }} placeholder="puhelin" />
          )}
          {data.contact.email && (
            <EditableText engine={engine} as="div" value={data.contact.email} onCommit={(v) => updateContact('email', v)} style={{ color: '#3a2e1f', wordBreak: 'break-word' }} placeholder="sähköposti" />
          )}
          {data.contact.location && (
            <EditableText engine={engine} as="div" value={data.contact.location} onCommit={(v) => updateContact('location', v)} style={{ color: '#3a2e1f' }} placeholder="paikkakunta" />
          )}
        </div>

        {/* Pystyyn käännetty nimi + titteli */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '130px',
            bottom: '40px',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
          }}
        >
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              ...vertical,
              fontSize: nameSize ? `${nameSize}px` : '44px',
              fontWeight: 800,
              color: nameColor,
              letterSpacing: '1px',
              margin: 0,
              fontFamily: fontStack('classic'),
            }}
            placeholder="Nimi"
          />
          {data.jobTitle && (
            <EditableText
              engine={engine}
              value={data.jobTitle}
              onCommit={(v) => updateField('jobTitle', v)}
              style={{
                ...vertical,
                fontSize: '13pt',
                fontWeight: 600,
                color: accent,
                letterSpacing: '1px',
                fontFamily: fontStack('sans'),
              }}
              placeholder="Titteli"
            />
          )}
        </div>
      </div>

      {/* ── OIKEA LEIPÄTEKSTIPALSTA ──────────────────────────── */}
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          padding: '48px 48px 48px 40px',
          background: '#fffdf8',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {data.companyName && (
          <p style={{ margin: '0 0 18px', fontSize: '11pt', fontWeight: 600, fontFamily: fontStack('classic') }}>
            <EditableText engine={engine} value={data.companyName} onCommit={(v) => updateField('companyName', v)} style={{ color: accent }} placeholder="Yritys" />
          </p>
        )}
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} region="body" />
        <Signature engine={engine} marginTop={40} />
      </div>
    </div>
  );
}