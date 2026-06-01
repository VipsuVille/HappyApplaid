'use client';
// lib/cover-letter/skins/Monogram.tsx
// ✅ WOW-skin: jättimäinen nimikirjain-vesileima + ohut accent-kehys.
//    Premium / lakitoimisto-henki. Gradient-first, ei vaadi kuvaa.
//
// Kyvykkyydet (capabilities.ts → 'monogram'):
//   • regions.watermark.fontSize  → ison kirjaimen koko (px)
//   • regions.watermark.textColor → ison kirjaimen väri (oletus accent)
//   • regions.watermark.opacity-tyyppinen säätö hoidetaan fontSizen rinnalla
//   • regions.body → leipäteksti (pt)
//   Iso kirjain ottaa AINA accent-värin ellei regionissa toisin määrätä.

import React from 'react';
import type { CLEngine } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, BackgroundLayer, ColorDot,
} from '../engine/components';

export default function Monogram({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact, initials } = engine;
  const accent = data.style.accentColor;

  // Vesileiman säädöt (regions.watermark)
  const wmRegion = data.style.regions?.watermark;
  const wmSize = wmRegion?.fontSize ?? 420;                 // px
  // "vahvuus" = opacity. Käytetään regionin letterSpacing-kenttää opacityn
  // kantajana EI — sen sijaan annetaan oma kenttä jos on, muuten oletus 0.05.
  // Tallennamme vahvuuden regions.watermark.fontSize:n rinnalle kentällä
  // jota AdaptiveControls ohjaa; tässä luetaan turvallisella fallbackilla.
  const wmOpacity = (wmRegion as any)?.opacity ?? 0.05;
  const wmColor = wmRegion?.textColor || accent;
console.log('MONOGRAM wm:', data.style.regions?.watermark, 'initials:', initials);

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm', minHeight: '297mm',
        fontFamily: fontStack('classic'),
        color: data.style.text.textColor,
        overflow: 'hidden',
        padding: '0',
      }}
    >
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* Jättimäinen monogrammi-vesileima oikeaan reunaan — accent-väri, säädettävä */}
      <div
        aria-hidden
        style={{
          position: 'absolute', top: '-30px', right: '-40px', zIndex: 0,
          fontFamily: fontStack('classic'), fontWeight: 700,
          fontSize: `${wmSize}px`, lineHeight: 1, letterSpacing: '-10px',
          color: rgba(wmColor, wmOpacity),
          userSelect: 'none', pointerEvents: 'none',
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}
      >
        {(initials || 'CV').charAt(0)}
        
      </div>

      {/* Ohut accent-kehys */}
      <div style={{ position: 'absolute', inset: '14px', border: `1px solid ${rgba(accent, 0.35)}`, pointerEvents: 'none', zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

      <div style={{ position: 'relative', zIndex: 2, padding: '64px 64px 56px' }}>
        {/* Pieni monogrammi-merkki */}
        <div style={{
          width: '54px', height: '54px', borderRadius: '50%',
          border: `1.5px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontStack('classic'), fontWeight: 700, fontSize: '20px', color: accent,
          marginBottom: '28px', letterSpacing: '1px',
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }}>
          {initials || 'CV'}
        </div>

        {/* Nimi */}
        <EditableText
          engine={engine} as="h1"
          value={data.contact.name}
          onCommit={(v) => updateContact('name', v)}
          style={{ fontSize: '38px', fontWeight: 700, letterSpacing: '0.5px', color: '#111827', fontFamily: fontStack('classic'), margin: 0, lineHeight: 1.1 }}
          placeholder="Nimi"
        />

        {(data.jobTitle || data.companyName) && (
          <p style={{ margin: '12px 0 0', fontSize: '10pt', letterSpacing: '3px', textTransform: 'uppercase', color: accent }}>
            <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: accent }} placeholder="Titteli" />
            {data.jobTitle && data.companyName ? '  ·  ' : ''}
            <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: accent }} placeholder="Yritys" />
          </p>
        )}

        {/* Accent-viiva */}
        <div style={{ width: '56px', height: '3px', background: accent, margin: '26px 0 30px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

        <ContactRow engine={engine} onDark={false} />

        <div style={{ marginTop: '36px' }}>
          <DateRow engine={engine} />
          <EditableParagraphs engine={engine} region="body" />
          <Signature engine={engine} marginTop={48} closing="Kunnioittavasti" />
        </div>
      </div>
    </div>
  );
}