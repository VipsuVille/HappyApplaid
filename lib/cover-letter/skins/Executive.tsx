'use client';
// lib/cover-letter/skins/Executive.tsx
// ✅ Korporaatio-skin (kuva 1): tumma yläbanneri + iso serif-nimi keskellä,
//    yhteystiedot bannerin yläreunassa, "Vastaanottaja"-lohko bannerin alla.
//    Bannerin korkeus = data.style.divider.sizeMm (editorin säädin).

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

  // Bannerin korkeus editorista (divider.sizeMm). Oletus 74mm.
  const bannerH = data.style.divider?.sizeMm ? `${data.style.divider.sizeMm}mm` : '74mm';

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

      {/* ── TUMMA YLÄBANNERI ─────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          minHeight: bannerH,
          display: 'flex',
          flexDirection: 'column',
          color: '#ffffff',
          overflow: 'hidden',
          background: `linear-gradient(135deg, #0f172a 0%, #14223f 55%, ${rgba(accent, 0.55)} 100%)`,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Hienovaraiset koristerenkaat oikealla */}
        <div aria-hidden style={{ position: 'absolute', top: '-90px', right: '-70px', width: '320px', height: '320px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.08)', pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', top: '24px', right: '70px', width: '170px', height: '170px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

        {/* Yhteystietorivi bannerin yläreunassa */}
        <div style={{ position: 'relative', zIndex: 1, padding: '16px 48px 0' }}>
          <ContactRow engine={engine} onDark centered />
        </div>

        {/* Nimi + titteli keskellä */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            padding: '20px 48px 30px',
          }}
        >
          <EditableText
            engine={engine}
            as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{
              fontSize: '40px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              margin: 0,
              color: '#ffffff',
              fontFamily: fontStack('classic'),
              textShadow: '0 2px 12px rgba(0,0,0,0.3)',
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
                color: '#e8d9b0',
                fontFamily: fontStack('sans'),
              }}
              placeholder="Titteli"
            />
          )}
        </div>
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
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} />
      </div>
    </div>
  );
}