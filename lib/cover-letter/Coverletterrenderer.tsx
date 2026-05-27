// lib/cover-letter/CoverLetterRenderer.tsx
// ✅ Yhdistää enginen + skinit. Tämä on se mitä edit-sivu kutsuu.
// Korvaa vanhan <CoverLetterTemplate> -kutsun. Lukee nykyisen datan, ei migraatiota.

import React from 'react';
import { useCoverLetterEngine } from './engine/useCoverLetterEngine';
import type { CLRawRecord, CLContactInfo, CLStyle } from './engine/types';

import ModernTop from './skins/ModernTop';
import ModernLeft from './skins/ModernLeft';
import Classic from './skins/Classic';

// Skinirekisteri — uuden pohjan lisääminen: tee skini + lisää tähän yksi rivi.
const SKINS: Record<string, React.ComponentType<{ engine: ReturnType<typeof useCoverLetterEngine> }>> = {
  'modern-top': ModernTop,
  'modern-left': ModernLeft,
  'classic': Classic,
};

interface CoverLetterRendererProps {
  raw: CLRawRecord;
  isEditing?: boolean;
  // Muutoskäsittelijät — sivu päättää miten tallentaa (sama logiikka kuin nyt)
  onContactChange?: (field: keyof CLContactInfo, value: string) => void;
  onBodyChange?: (newBody: string) => void;
  onFieldChange?: (field: 'jobTitle' | 'companyName' | 'title', value: string) => void;
  onStyleChange?: (patch: Partial<CLStyle>) => void;
}

export default function CoverLetterRenderer({
  raw,
  isEditing = false,
  onContactChange,
  onBodyChange,
  onFieldChange,
  onStyleChange,
}: CoverLetterRendererProps) {
  const engine = useCoverLetterEngine({
    raw, isEditing, onContactChange, onBodyChange, onFieldChange, onStyleChange,
  });

  const SkinComponent = SKINS[engine.data.style.templateStyle] || ModernTop;
  return <SkinComponent engine={engine} />;
}

// Apu: lista käytettävissä olevista skineistä (editorin valitsinta varten)
export const AVAILABLE_SKINS: { id: string; label: string }[] = [
  { id: 'modern-top', label: 'Moderni (banneri)' },
  { id: 'modern-left', label: 'Moderni (sivupalsta)' },
  { id: 'classic', label: 'Klassinen' },
];