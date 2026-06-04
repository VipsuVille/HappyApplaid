'use client';
// lib/cover-letter/skins/Executive.tsx
// ✅ Korporaatio-skin: näyttävä accent-banneri + iso serif-nimi keskellä.
//    KORJAUS: banneri on nyt accent-vetoinen (teemaväri näkyy selvästi),
//    diagonaali-sheen + accent-hehku + voimakkaampi kaareva alareuna.

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

export default function Executive({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;

  const bannerH = `${data.style.banner?.heightMm ?? data.style.divider?.sizeMm ?? 74}mm`;

  // ✅ ACCENT-VETOINEN gradientti: teemaväri dominoi vasemmalla, syvenee
  //    tummaan oikealla → accent näkyy selvästi (ei enää vain 55% reunassa).
  const defaultGradient =
    `linear-gradient(120deg, ${accent} 0%, ${rgba(accent, 0.85)} 28%, #16243f 72%, #0f172a 100%)`;
  const bannerBg = data.style.banner?.color || defaultGradient;

  const img = data.style.image;
  const fullImage = img?.placement === 'banner-full' && img.url ? img.url : null;
  const centerImage = img?.placement === 'banner-center' && img.url ? img.url : null;
  const imgOpacity = img?.opacity ?? 0.5;

  const headingSize = data.style.regions?.heading?.fontSize; // px

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack('classic'),
        color: data.style.text.textColor,
        overflow: 'hidden',
      }}
    >
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* ── ACCENT-YLÄBANNERI ────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          minHeight: bannerH,
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
          overflow: 'hidden',
          background: bannerBg,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Kuva täyteen banneriin (banner-full) */}
        {fullImage && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${fullImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: imgOpacity,
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }} />
        )}

        {/* ✅ Diagonaali-sheen: vaalea accent-juova tuo syvyyttä */}
        {!fullImage && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(115deg, transparent 48%, ${rgba('#ffffff', 0.10)} 60%, transparent 72%)`,
            pointerEvents: 'none',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }} />
        )}

        {/* ✅ Pehmeä accent-hehku vasempaan yläkulmaan */}
        {!fullImage && (
          <div aria-hidden style={{
            position: 'absolute', top: '-120px', left: '-80px', width: '380px', height: '380px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${rgba('#ffffff', 0.18)} 0%, transparent 70%)`,
            pointerEvents: 'none',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }} />
        )}

        {/* Koristerenkaat oikealla (accent-sävyiset) */}
        <div aria-hidden style={{ position: 'absolute', top: '-90px', right: '-70px', width: '320px', height: '320px', borderRadius: '50%', border: `1px solid ${rgba('#ffffff', 0.14)}`, pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: '24px', right: '70px', width: '170px', height: '170px', borderRadius: '50%', border: `1px solid ${rgba('#ffffff', 0.10)}`, pointerEvents: 'none' }} />

        {/* Yhteystietorivi bannerin yläreunassa */}
        <div style={{ position: 'relative', zIndex: 2, padding: '16px 48px 0' }}>
          <ContactRow engine={engine} onDark centered />
        </div>

        {/* Nimi + titteli keskellä (+ valinnainen kuva keskellä) */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px 48px 34px',
          }}
        >
          {centerImage && (
            <img
              src={centerImage}
              alt=""
              style={{
                height: '70px', width: '70px', borderRadius: '50%', objectFit: 'cover',
                marginBottom: '14px', border: '2px solid rgba(255,255,255,0.5)',
                opacity: img?.opacity ?? 1,
                WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
              }}
            />
          )}
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              fontSize: headingSize ? `${headingSize}px` : '40px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              margin: 0,
              color: data.style.banner?.textColor || '#ffffff',
              fontFamily: fontStack('classic'),
              textShadow: '0 2px 16px rgba(0,0,0,0.35)',
            }}
            placeholder="Nimi"
          />
          {data.jobTitle && (
            <EditableText
              engine={engine}
              value={data.jobTitle}
              onCommit={(v) => updateField('jobTitle', v)}
              style={{
                marginTop: '12px',
                fontSize: '12pt',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.92)',
                fontFamily: fontStack('sans'),
              }}
              placeholder="Titteli"
            />
          )}
        </div>

        {/* ✅ Voimakkaampi kaareva alareuna (syvempi kaari) */}
        <svg viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden
          style={{ position: 'absolute', left: 0, right: 0, bottom: '-1px', width: '100%', height: '58px', zIndex: 3, display: 'block' }}>
          <path d="M0,120 L0,48 C280,118 1160,118 1440,40 L1440,120 Z" fill="#ffffff"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
        </svg>
      </div>

      {/* ── VASTAANOTTAJA-LOHKO ──────────────────────────────── */}
      {data.companyName && (
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '30px 56px 0' }}>
          <p style={{ margin: 0, fontSize: '9pt', letterSpacing: '3px', textTransform: 'uppercase', color: '#94a3b8', fontFamily: fontStack('sans') }}>
            Vastaanottaja
          </p>
          <EditableText
            engine={engine}
            as="p"
            value={data.companyName}
            onCommit={(v) => updateField('companyName', v)}
            style={{ margin: '6px 0 0', fontSize: '15pt', fontWeight: 600, color: accent, fontFamily: fontStack('classic') }}
            placeholder="Yritys"
          />
        </div>
      )}

      {/* ── LEIPÄTEKSTI ──────────────────────────────────────── */}
      <div style={{ position: 'relative', zIndex: 1, padding: '34px 56px 56px' }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} region="body" />
        <Signature engine={engine} marginTop={48} />
      </div>
    </div>
  );
}