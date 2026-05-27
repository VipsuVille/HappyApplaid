// lib/cover-letter/skins/ModernLeft.tsx
// ✅ SKINI: pystysuora sivupalsta. Leveys säädettävä (divider.sizeMm).

import React from 'react';
import type { CLSkinProps } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, BackgroundLayer,
} from '../engine/components';

export default function ModernLeft({ engine }: CLSkinProps) {
  const { data, isEditing, initials, fontStack, updateField } = engine;
  const accent = data.style.accentColor;
  const sidebarW = data.style.divider.sizeMm || 74;

  return (
    <div className="cover-letter-paper bg-white mx-auto relative"
      style={{ width: '210mm', minHeight: '297mm', fontFamily: fontStack('serif'), color: data.style.text.textColor, display: 'flex', overflow: 'hidden' }}>

      <BackgroundLayer engine={engine} />

      {/* SIVUPALSTA */}
      <div style={{ width: `${sidebarW}mm`, background: accent, padding: '48px 24px 40px', display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Monogrammi = värinvalitsin */}
          <div
            onClick={() => isEditing && (document.getElementById('cl-accent-input-left') as HTMLInputElement)?.click()}
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              border: isEditing ? '3px solid rgba(255,255,255,0.7)' : '2px solid rgba(255,255,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px', fontWeight: 700, color: 'rgba(255,255,255,0.85)',
              fontFamily: fontStack('sans'), letterSpacing: '1px',
              marginBottom: '24px', alignSelf: 'center',
              cursor: isEditing ? 'pointer' : 'default', position: 'relative',
            }}
            title={isEditing ? '🎨 Klikkaa vaihtaaksesi väriä' : ''}
          >
            {initials}
            {isEditing && (
              <>
                <span style={{ position: 'absolute', bottom: '-2px', right: '-2px', background: '#f97316', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', border: '2px solid white' }}>🎨</span>
                <input id="cl-accent-input-left" type="color" value={accent.startsWith('#') ? accent : '#1a1a2e'}
                  onChange={(e) => engine.updateStyle({ accentColor: e.target.value })}
                  style={{ position: 'absolute', opacity: 0, width: '1px', height: '1px', pointerEvents: 'none' }} />
              </>
            )}
          </div>

          <EditableText engine={engine} as="h1" value={data.contact.name}
            onCommit={(v) => engine.updateContact('name', v)}
            style={{ fontSize: '22px', fontWeight: 700, color: '#fff', fontFamily: fontStack('serif'), lineHeight: '1.3', margin: '0 0 8px', textAlign: 'center' }}
            placeholder="Nimi" />

          {(data.jobTitle || data.companyName) && (
            <p style={{ margin: '0 0 24px', fontSize: '8.5pt', color: 'rgba(255,255,255,0.45)', fontFamily: fontStack('sans'), textAlign: 'center', letterSpacing: '0.5px' }}>
              <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: 'rgba(255,255,255,0.45)' }} placeholder="Titteli" />
              {data.jobTitle && data.companyName ? ' · ' : ''}
              <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: 'rgba(255,255,255,0.45)' }} placeholder="Yritys" />
            </p>
          )}

          <div style={{ width: '40px', height: '1.5px', background: 'rgba(255,255,255,0.15)', margin: '0 auto 28px' }} />
          <ContactRow engine={engine} vertical onDark />
        </div>
      </div>

      {/* SISÄLTÖ */}
      <div style={{ flex: 1, padding: '48px 44px', position: 'relative', zIndex: 1 }}>
        <div style={{ position: 'absolute', top: '24px', right: '24px', width: '60px', height: '60px', borderTop: `1.5px solid ${rgba(accent, 0.15)}`, borderRight: `1.5px solid ${rgba(accent, 0.15)}`, opacity: 0.5, pointerEvents: 'none' }} />
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} />
      </div>
    </div>
  );
}