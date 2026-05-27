// lib/cover-letter/skins/ModernTop.tsx
// ✅ SKINI: vaakabanneri. Ei muokkauslogiikkaa — käyttää engine-komponentteja.

import React from 'react';
import type { CLSkinProps } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, BackgroundLayer,
} from '../engine/components';

export default function ModernTop({ engine }: CLSkinProps) {
  const { data, isEditing, initials, fontStack, updateField } = engine;
  const accent = data.style.accentColor;
  const bannerH = data.style.divider.sizeMm;

  return (
    <div className="cover-letter-paper bg-white mx-auto relative"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: fontStack('serif'), color: data.style.text.textColor, overflow: 'hidden' }}>

      <BackgroundLayer engine={engine} />

      {/* Koristeympyrät */}
      <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '180px', height: '180px', borderRadius: '50%', border: `2px solid ${rgba(accent, 0.15)}`, opacity: 0.4, pointerEvents: 'none' }} />

      {/* BANNERI */}
      <div style={{ background: accent, padding: '44px 56px 40px', position: 'relative', minHeight: bannerH ? `${bannerH}mm` : undefined, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '8px' }}>
            {/* Monogrammi = värinvalitsin */}
            <div
              onClick={() => isEditing && (document.getElementById('cl-accent-input') as HTMLInputElement)?.click()}
              style={{
                width: '68px', height: '68px', borderRadius: '50%',
                border: isEditing ? '3px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px', fontWeight: 700, color: 'rgba(255,255,255,0.9)',
                fontFamily: fontStack('sans'), letterSpacing: '1px', flexShrink: 0,
                cursor: isEditing ? 'pointer' : 'default', position: 'relative',
              }}
              title={isEditing ? '🎨 Klikkaa vaihtaaksesi väriä' : ''}
            >
              {initials}
              {isEditing && (
                <>
                  <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#f97316', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🎨</span>
                  <input id="cl-accent-input" type="color" value={accent.startsWith('#') ? accent : '#1a1a2e'}
                    onChange={(e) => engine.updateStyle({ accentColor: e.target.value })}
                    style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />
                </>
              )}
            </div>

            <div>
              <EditableText engine={engine} as="h1" value={data.contact.name}
                onCommit={(v) => engine.updateContact('name', v)}
                style={{ fontSize: '34px', fontWeight: 700, color: '#fff', fontFamily: fontStack('serif'), lineHeight: '1.15', margin: 0, letterSpacing: '-0.5px' }}
                placeholder="Nimi" />
              {(data.jobTitle || data.companyName) && (
                <p style={{ margin: '6px 0 0', fontSize: '10.5pt', color: 'rgba(255,255,255,0.55)', fontFamily: fontStack('sans'), letterSpacing: '0.5px' }}>
                  <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: 'rgba(255,255,255,0.55)' }} placeholder="Titteli" />
                  {data.jobTitle && data.companyName ? ' · ' : ''}
                  <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: 'rgba(255,255,255,0.55)' }} placeholder="Yritys" />
                </p>
              )}
            </div>
          </div>
          <div style={{ width: '60px', height: '2px', background: 'rgba(255,255,255,0.2)', margin: '20px 0' }} />
          <ContactRow engine={engine} onDark />
        </div>
      </div>

      {/* BODY */}
      <div style={{ padding: '48px 56px 56px', position: 'relative', zIndex: 1 }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={52} />
      </div>

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${accent}, transparent)`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
    </div>
  );
}