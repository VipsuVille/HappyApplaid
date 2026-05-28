'use client';

import React from 'react';
import type { CLRawRecord } from './engine/types';
import { useCoverLetterEngine } from './engine/useCoverLetterEngine';
import ModernTop from './skins/ModernTop';
import ModernLeft from './skins/ModernLeft';
import CreativeWave from './skins/CreativeWave'; // <-- Uusi tuonti
import {
  EditableText,
  EditableParagraphs,
  Signature,
  ContactRow,
  DateRow,
  BackgroundLayer,
} from './engine/components';

interface CoverLetterRendererProps {
  raw: CLRawRecord;
  isEditing: boolean;
  onContactChange?: (field: any, value: string) => void;
  onBodyChange?: (newBody: string) => void;
  onFieldChange?: (field: 'jobTitle' | 'companyName' | 'title', value: string) => void;
  onStyleChange?: (patch: any) => void;
}

/**
 * KLASSINEN SKIN (classic)
 */
function ClassicSkin({ engine }: { engine: any }) {
  const { data, fontStack, updateField } = engine;
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
        padding: '56px 56px 56px',
      }}
    >
      <BackgroundLayer engine={engine} />
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '6px',
          background: accent,
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      />
      <div style={{ marginBottom: '40px', position: 'relative', zIndex: 1 }}>
        <EditableText
          engine={engine}
          as="h1"
          value={data.contact.name}
          onCommit={(v) => engine.updateContact('name', v)}
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#111827',
            fontFamily: fontStack('classic'),
            letterSpacing: '-0.5px',
            margin: '0 0 4px',
          }}
          placeholder="Nimi"
        />
        {(data.jobTitle || data.companyName) && (
          <p style={{ margin: '0 0 20px', fontSize: '11pt', color: '#4b5563' }}>
            <EditableText
              engine={engine}
              value={data.jobTitle || ''}
              onCommit={(v) => updateField('jobTitle', v)}
              placeholder="Titteli"
            />
            {data.jobTitle && data.companyName ? '  |  ' : ''}
            <EditableText
              engine={engine}
              value={data.companyName || ''}
              onCommit={(v) => updateField('companyName', v)}
              placeholder="Yritys"
            />
          </p>
        )}
        <div style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
          <ContactRow engine={engine} onDark={false} />
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <DateRow engine={engine} />
        <EditableParagraphs engine={engine} />
        <Signature engine={engine} marginTop={56} closing="Kunnioittaen" />
      </div>
    </div>
  );
}

/**
 * PÄÄRENDERÖIJÄ
 */
export default function CoverLetterRenderer({
  raw,
  isEditing,
  onContactChange,
  onBodyChange,
  onFieldChange,
  onStyleChange,
}: CoverLetterRendererProps) {
  const engine = useCoverLetterEngine({
    raw,
    isEditing,
    onContactChange,
    onBodyChange,
    onFieldChange,
    onStyleChange,
  });

  const { templateStyle } = engine.data.style;

  // Reititetään valinnan mukaan oikealle pohjalle
  switch (templateStyle) {
    case 'creative-wave':
      return <CreativeWave engine={engine} />; // <-- Kytketty renderöintiin
    case 'modern-left':
      return <ModernLeft engine={engine} />;
    case 'classic':
      return <ClassicSkin engine={engine} />;
    case 'modern-top':
    default:
      return <ModernTop engine={engine} />;
  }
}