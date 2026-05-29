'use client';
// lib/cover-letter/skins/Elegant.tsx
// ✅ A-tier skin: keskitetty, ilmava, klassinen. Serif-otsikko, harvennettu välistys,
//    hillitty kasviornamentti alareunassa. Tukee BackgroundLayeria (häilyvä kuva).
// Engine-yhteensopiva: vain { engine } -prop, jaetut komponentit.

import React from 'react';
import type { CLEngine } from '../engine/types';
import {
  EditableText,
  EditableParagraphs,
  Signature,
  ContactRow,
  DateRow,
  BackgroundLayer,
  ColorDot,
} from '../engine/components';

export default function Elegant({ engine }: { engine: CLEngine }) {
  const { data, fontStack, updateField, updateContact } = engine;
  const accent = data.style.accentColor;

  return (
    <div
      className="cover-letter-paper bg-white mx-auto relative"
      style={{
        width: '210mm',
        minHeight: '297mm',
        fontFamily: fontStack('classic'),
        color: data.style.text.textColor,
        overflow: 'hidden',
        padding: '64px 72px 48px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BackgroundLayer engine={engine} />
      <ColorDot engine={engine} />

      {/* ── OTSIKKO (keskitetty) ─────────────────────────────── */}
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <EditableText
          engine={engine}
          as="h1"
          value={data.contact.name}
          onCommit={(v) => updateContact('name', v)}
          style={{
            fontSize: '32px',
            fontWeight: 500,
            letterSpacing: '6px',
            textTransform: 'uppercase',
            color: '#1f2937',
            fontFamily: fontStack('classic'),
            margin: 0,
          }}
          placeholder="Nimi"
        />

        {(data.jobTitle || data.companyName) && (
          <p
            style={{
              margin: '12px 0 0',
              fontFamily: fontStack('serif'),
              fontStyle: 'italic',
              fontSize: '13pt',
              color: accent,
            }}
          >
            <EditableText
              engine={engine}
              value={data.jobTitle || ''}
              onCommit={(v) => updateField('jobTitle', v)}
              style={{ color: accent }}
              placeholder="Titteli"
            />
            {data.jobTitle && data.companyName ? '  ·  ' : ''}
            <EditableText
              engine={engine}
              value={data.companyName || ''}
              onCommit={(v) => updateField('companyName', v)}
              style={{ color: accent }}
              placeholder="Yritys"
            />
          </p>
        )}

        {/* Ohut viiva + keskellä vinoneliö */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            margin: '24px auto 0',
            maxWidth: '340px',
          }}
        >
          <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span
            style={{
              width: '7px',
              height: '7px',
              transform: 'rotate(45deg)',
              background: accent,
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          />
          <span style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>
      </div>

      {/* ── YHTEYSTIEDOT (keskitetty) ────────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          margin: '24px 0 34px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <ContactRow engine={engine} onDark={false} centered />
      </div>

      {/* ── PÄIVÄYS + LEIPÄTEKSTI ────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={48} centered closing="Ystävällisin terveisin" />
      </div>

      {/* ── KASVIORNAMENTTI (alareuna) ───────────────────────── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          marginTop: '28px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <svg width="120" height="36" viewBox="0 0 120 36" fill="none" aria-hidden="true">
          <g
            stroke={accent}
            strokeWidth="1.1"
            strokeLinecap="round"
            fill="none"
            opacity="0.7"
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          >
            <path d="M60 4 C 60 14, 60 24, 60 31" />
            <path d="M60 10 C 52 8, 46 10, 42 16" />
            <path d="M60 10 C 68 8, 74 10, 78 16" />
            <path d="M60 18 C 50 16, 42 18, 36 24" />
            <path d="M60 18 C 70 16, 78 18, 84 24" />
            <line x1="14" y1="30" x2="46" y2="30" />
            <line x1="74" y1="30" x2="106" y2="30" />
          </g>
          <circle
            cx="60"
            cy="33"
            r="2.2"
            fill={accent}
            style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
          />
        </svg>
      </div>
    </div>
  );
}