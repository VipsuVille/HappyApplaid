'use client';
// lib/cover-letter/skins/Ribbon.tsx
// ✅ WOW-skin: diagonaalinen accent-nauha yläkulmassa + suuri serif-nimi.
//    KORJAUS: kulmakoriste pienennetty (320→230) + nimen maxWidth varaa
//    turva-alueen, jotta nauha EI mene leipätekstin päälle.

import React from 'react';
import type { CLEngine } from '../engine/types';
import { rgba } from '../engine/useCoverLetterEngine';
import {
  EditableText, EditableParagraphs, Signature, ContactRow, DateRow, BackgroundLayer, ColorDot,
} from '../engine/components';

export default function Ribbon({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;

  // Kulmakoristeen koko (px). Pienempi kuin etäisyys leipätekstin alkuun.
  const CORNER = 230;

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

      {/* Diagonaalinen accent-nauha oikeaan yläkulmaan (rajattu kulmaan) */}
      <div aria-hidden style={{
        position: 'absolute', top: 0, right: 0, width: `${CORNER}px`, height: `${CORNER}px`,
        overflow: 'hidden', zIndex: 0, pointerEvents: 'none',
      }}>
        {/* Täytetty kolmio */}
        <div style={{
          position: 'absolute', top: `${-CORNER * 0.55}px`, right: `${-CORNER * 0.55}px`,
          width: `${CORNER * 1.6}px`, height: `${CORNER * 1.6}px`, transform: 'rotate(45deg)',
          background: `linear-gradient(135deg, ${accent}, ${rgba(accent, 0.55)})`,
          WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
        }} />
        {/* Ohut viivakehys — pysyy kulman sisällä (overflow hidden rajaa) */}
        <div style={{
          position: 'absolute', top: `${-CORNER * 0.35}px`, right: `${-CORNER * 0.62}px`,
          width: `${CORNER * 1.6}px`, height: `${CORNER * 1.6}px`, transform: 'rotate(45deg)',
          border: `2px solid ${rgba(accent, 0.28)}`,
        }} />
      </div>

      {/* Vasen accent-pylväs */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '10px', background: accent, zIndex: 1, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

      <div style={{ position: 'relative', zIndex: 2, padding: '70px 64px 56px 74px' }}>
        {/* Suuri serif-nimi (maxWidth varaa turva-alueen kulmalle) */}
        <EditableText
          engine={engine} as="h1"
          value={data.contact.name}
          onCommit={(v) => updateContact('name', v)}
          style={{ fontSize: '46px', fontWeight: 700, color: '#111827', fontFamily: fontStack('classic'), margin: 0, lineHeight: 1.05, letterSpacing: '-1px', maxWidth: `calc(100% - ${CORNER - 30}px)` }}
          placeholder="Nimi"
        />

        {(data.jobTitle || data.companyName) && (
          <p style={{ margin: '14px 0 0', fontSize: '12pt', fontStyle: 'italic', color: accent, fontFamily: fontStack('serif') }}>
            <EditableText engine={engine} value={data.jobTitle || ''} onCommit={(v) => updateField('jobTitle', v)} style={{ color: accent }} placeholder="Titteli" />
            {data.jobTitle && data.companyName ? '  —  ' : ''}
            <EditableText engine={engine} value={data.companyName || ''} onCommit={(v) => updateField('companyName', v)} style={{ color: accent }} placeholder="Yritys" />
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '28px 0 30px' }}>
          <div style={{ width: '40px', height: '2px', background: accent, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          <ContactRow engine={engine} onDark={false} />
        </div>

        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} />
      </div>
    </div>
  );
}