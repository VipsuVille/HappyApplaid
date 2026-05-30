'use client';
// lib/cover-letter/skins/Sidebar.tsx
// ✅ WOW-skin: täysmittainen värillinen vasen palsta (monogrammi + yhteystiedot),
//    oikealla leipäteksti. Palsta tukee AI-taustaa (background.imageUrl) himmennettynä.
//    Palstan leveys = data.style.divider.sizeMm (editorin "yläpalkin korkeus" -säädin ohjaa).

import React from 'react';
import type { CLEngine } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, ColorDot,
} from '../engine/components';

export default function Sidebar({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact, initials } = engine;
  const accent = data.style.accentColor;
  const bg = data.style.background;

  // Palstan leveys: jaa divider.sizeMm:llä jos järkevä, muuten 78mm.
  const sideW = data.style.divider?.sizeMm && data.style.divider.sizeMm >= 55 && data.style.divider.sizeMm <= 95
    ? `${data.style.divider.sizeMm}mm`
    : '78mm';

  const sideImage =
    !!bg.imageUrl && (bg.mode === 'generated' || bg.mode === 'image-strong') ? bg.imageUrl : null;
  const sideOpacity = bg.opacity ?? 0.85;

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm', minHeight: '297mm',
        fontFamily: fontStack(),
        color: data.style.text.textColor,
        overflow: 'hidden',
        display: 'flex',
      }}
    >
      <ColorDot engine={engine} />

      {/* ── VASEN PALSTA ───────────────────────────────────── */}
      <div style={{
        width: sideW, flexShrink: 0, position: 'relative',
        background: accent, color: '#fff',
        padding: '52px 30px 40px',
        display: 'flex', flexDirection: 'column',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}>
        {/* AI-/oma kuva palstaan, himmennettynä */}
        {sideImage && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${sideImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
            opacity: sideOpacity, mixBlendMode: 'overlay',
            WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
          }} />
        )}
        {/* hienovarainen kuviointi */}
        <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(180deg, transparent, transparent 60px, rgba(255,255,255,0.03) 60px, rgba(255,255,255,0.03) 120px)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Monogrammi */}
          <div style={{
            width: '74px', height: '74px', borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.55)', alignSelf: 'center',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: 700, fontFamily: fontStack('sans'),
            letterSpacing: '1px', marginBottom: '26px',
          }}>
            {initials || 'CV'}
          </div>

          <EditableText
            engine={engine} as="h1"
            value={data.contact.name}
            onCommit={(v) => updateContact('name', v)}
            style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontFamily: fontStack('sans'), textAlign: 'center', margin: '0 0 8px', lineHeight: 1.25 }}
            placeholder="Nimi"
          />

          {(data.jobTitle || data.companyName) && (
            <p style={{ margin: '0 0 28px', fontSize: '8.5pt', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontFamily: fontStack('sans') }}>
              <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: 'rgba(255,255,255,0.7)' }} placeholder="Titteli" />
              {data.jobTitle && data.companyName ? ' · ' : ''}
              <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: 'rgba(255,255,255,0.7)' }} placeholder="Yritys" />
            </p>
          )}

          <div style={{ width: '40px', height: '1.5px', background: 'rgba(255,255,255,0.4)', margin: '0 auto 26px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

          <ContactRow engine={engine} vertical onDark />

          <div style={{ marginTop: 'auto', paddingTop: '30px', display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.4)' }} />
          </div>
        </div>
      </div>

      {/* ── OIKEA SISÄLTÖ ──────────────────────────────────── */}
      <div style={{ flex: 1, padding: '52px 48px', position: 'relative' }}>
        <div style={{ position: 'absolute', top: '28px', right: '28px', width: '56px', height: '56px', borderTop: `1.5px solid ${rgba(accent, 0.5)}`, borderRight: `1.5px solid ${rgba(accent, 0.5)}`, pointerEvents: 'none' }} />
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={46} />
      </div>
    </div>
  );
}