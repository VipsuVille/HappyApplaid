// lib/cover-letter/skins/Classic.tsx
// ✅ SKINI: Ella-tyyli. Hillitty, ammattimainen. Ohut yläreuna, ei bannerialuetta.

import React from 'react';
import type { CLSkinProps } from '../engine/types';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, BackgroundLayer, ColorDot,
} from '../engine/components';

export default function Classic({ engine }: CLSkinProps) {
  const { data, fontStack, updateField } = engine;
  const accent = data.style.accentColor;

  return (
    <div className="cover-letter-paper bg-white mx-auto relative"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: fontStack('serif'), color: data.style.text.textColor, display: 'flex', flexDirection: 'column' }}>

      <BackgroundLayer engine={engine} />

      {/* Ohut värillinen yläreuna */}
      <div style={{ height: '6px', background: accent, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', position: 'relative', zIndex: 1 }} />

      <ColorDot engine={engine} position="top-right" />

      {/* HEADER keskitettynä */}
      <div style={{ padding: '52px 56px 0', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <EditableText engine={engine} as="h1" value={data.contact.name}
          onCommit={(v) => engine.updateContact('name', v)}
          style={{ fontSize: '30px', fontWeight: 700, color: data.style.text.textColor, fontFamily: fontStack('serif'), letterSpacing: '1px', margin: 0 }}
          placeholder="Nimi" />

        {(data.jobTitle || data.companyName) && (
          <div style={{ display: 'inline-block', marginTop: '14px', padding: '5px 18px', border: `1px solid ${accent}`, borderRadius: '2px' }}>
            <span style={{ fontSize: '10pt', color: accent, fontFamily: fontStack('sans'), letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: accent }} placeholder="Titteli" />
              {data.jobTitle && data.companyName ? ' · ' : ''}
              <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: accent }} placeholder="Yritys" />
            </span>
          </div>
        )}
      </div>

      {/* BODY */}
      <div style={{ padding: '44px 64px 40px', flex: 1, position: 'relative', zIndex: 1 }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} />
      </div>

      {/* FOOTER: keskitetty yhteystietorivi */}
      <div style={{ padding: '0 56px 44px', position: 'relative', zIndex: 1 }}>
        <div style={{ height: '1px', background: '#e2e8f0', marginBottom: '20px' }} />
        <ContactRow engine={engine} centered />
      </div>
    </div>
  );
}