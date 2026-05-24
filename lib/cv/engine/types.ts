// lib/cv/engine/types.ts
// ════════════════════════════════════════════════════════════════════
//  CV-MUOKKAUSMOOTTORIN JAETUT TYYPIT (Tie B)
//  Kaikki templatet käyttävät näitä. Yksi totuuden lähde.
// ════════════════════════════════════════════════════════════════════

import type { UserFormData, AIData } from "@/types";

// ── Per-osio ja per-palsta skaalat ──────────────────────────────────
export interface SectionScale {
  fontScale: number;
  gap: number;
  hidden: boolean;
}
export type SectionScales = Record<string, SectionScale>;
export interface ColumnScales {
  left: number;
  right: number;
}
export const DEFAULT_SECTION_SCALE: SectionScale = { fontScale: 1, gap: 1, hidden: false };
export const DEFAULT_COLUMN_SCALES: ColumnScales = { left: 1, right: 1 };

// ── Palstojen mitat (mm) ────────────────────────────────────────────
export interface LayoutConfig {
  leftColumnMm: number;
  bannerHeightMm: number;
}
export const DEFAULT_LAYOUT: LayoutConfig = { leftColumnMm: 70, bannerHeightMm: 85 };
export const PAGE_WIDTH_MM = 210;
export const PAGE_HEIGHT_MM = 297;

// ── Parsitut datatyypit ─────────────────────────────────────────────
// Nämä ovat templaten näkemä "siisti" muoto, johon moottori normalisoi
// cv_data:n (joka voi olla strukturoitua tai AI-HTML:ää).
export interface EngineExperience {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}
export interface EngineEducation {
  degree: string;
  institution: string;
  year: string;
  details: string[];
}
export interface EngineProject {
  title: string;
  description: string;
  link: string;
}
export interface EngineSkillCategory {
  category: string;
  items: string[];
}

// ── Moottorin asetukset (props jotka edit-cv antaa) ─────────────────
export interface CVEngineConfig {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  onUpdate?: (field: string, value: any) => void;
  onDelete?: (field: string, index: number) => void;
  profileImage?: string;
  backgroundImage?: string;
  fontScale?: number;
  lineScale?: number;
  sectionScales?: SectionScales;
  columnScales?: ColumnScales;
  layout?: LayoutConfig;
}