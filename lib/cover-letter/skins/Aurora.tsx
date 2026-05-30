'use client';
// lib/cover-letter/skins/Aurora.tsx
// ✅ A-tier skin: täysleveä yläbanneri.
//    - background.mode 'generated' | 'image-strong' → kuva banneriin (opacity = himmennys)
//    - background.mode 'image-faint' → kuva koko sivun taustalle haaleana
//    - muuten: aurora-gradient accentColorista (nolla AI-kulua)
//    - bannerin korkeus = data.style.divider.sizeMm (editorin säädin)

import React from 'react';
import type { CLEngine } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText,
  EditableParagraphs,
  Signature,
  ContactRow,
  DateRow,
  BackgroundLayer,
  ColorDot,
} from '../engine/components';

export default function Aurora({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;
  const bg = data.style.background;

  // Banneriin sijoittuva kuva (generoitu/vahva). image-faint hoidetaan BackgroundLayerilla.
  const bannerImage =
    !!bg.imageUrl && (bg.mode === 'generated' || bg.mode === 'image-strong')
      ? bg.imageUrl
      : null;

  const bannerOpacity = bg.opacity ?? 0.9;

  // ✅ Bannerin korkeus editorista (divider.sizeMm). Oletus 82mm.
  const bannerH = data.style.divider?.sizeMm
    ? `${data.style.divider.sizeMm}mm`
    : '82mm';

  const auroraGradient = `
    radial-gradient(60% 90% at 78% 12%, ${rgba(accent, 0.92)}, transparent 60%),
    radial-gradient(55% 70% at 98% 45%, rgba(244,114,182,0.55), transparent 62%),
    radial-gradient(75% 80% at 55% 78%, rgba(45,212,191,0.42), transparent 60%),
    radial-gradient(50% 60% at 12% 25%, rgba(129,140,248,0.40), transparent 60%),
    linear-gradient(135deg, ${rgba(accent, 0.30)}, #ffffff)
  `;

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack(),
        color: data.style.text.textColor,
        overflow: 'hidden',
      }}
    >
      {/* image-faint: koko sivun haalea tausta (BackgroundLayer hoitaa opacityn) */}
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* ── YLÄBANNERI ───────────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          height: bannerH,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '0 56px 30px',
          background: bannerImage ? '#ffffff' : auroraGradient,
          backgroundColor: '#ffffff',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Kuvataso bannerissa — oma opacity (himmennys) */}
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

        {/* Koristerenkaat */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '180px', height: '180px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '24px', right: '40px', width: '90px', height: '90px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.20)', pointerEvents: 'none' }} />

        {/* Tummennusliuku → valkoinen nimi luettavissa */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0) 38%, rgba(0,0,0,0.18) 70%, rgba(0,0,0,0.50) 100%)',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              fontSize: '40px',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              lineHeight: 1.05,
              margin: 0,
              color: '#ffffff',
              fontFamily: fontStack('sans'),
              textShadow: '0 2px 14px rgba(0,0,0,0.30)',
            }}
            placeholder="Nimi"
          />
          {(data.jobTitle || data.companyName) && (
            <p
              style={{
                margin: '10px 0 0',
                fontSize: '10.5pt',
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.92)',
                fontFamily: fontStack('sans'),
                textShadow: '0 1px 8px rgba(0,0,0,0.30)',
              }}
            >
              <EditableText
                engine={engine}
                value={data.jobTitle || ''}
                onCommit={(v) => updateField('jobTitle', v)}
                style={{ color: 'rgba(255,255,255,0.92)' }}
                placeholder="Titteli"
              />
              {data.jobTitle && data.companyName ? ' · ' : ''}
              <EditableText
                engine={engine}
                value={data.companyName || ''}
                onCommit={(v) => updateField('companyName', v)}
                style={{ color: 'rgba(255,255,255,0.92)' }}
                placeholder="Yritys"
              />
            </p>
          )}
        </div>
      </div>

      {/* ── YHTEYSTIETORIVI ──────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '22px 56px', borderBottom: '1px solid #eef2f7' }}>
        <ContactRow engine={engine} onDark={false} />
      </div>

      {/* ── LEIPÄTEKSTI ──────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '36px 56px 56px' }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} />
      </div>
    </div>
  );
}