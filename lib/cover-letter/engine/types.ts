// lib/cover-letter/engine/types.ts
// ════════════════════════════════════════════════════════════════════
//  COVER LETTER -MOOTTORIN JAETUT TYYPIT
//  Yksi totuuden lähde. Kaikki skinit (templatet) lukevat näitä.
//  Uudet kentät (banner / band / image / regions) ovat VALINNAISIA →
//  vanhat tallennukset ja vanhat pohjat eivät rikkoudu.
// ════════════════════════════════════════════════════════════════════

// ── Perusliteraalit ────────────────────────────────────────────────
export type FontFamilyKey = 'serif' | 'sans' | 'classic' | 'modern';
export type SignatureStyle = 'script' | 'print' | 'bold';
export type TextAlign = 'left' | 'justify' | 'center';

/** Mihin skinin kuva voi sijoittua. Pidetään synkassa capabilities.ts:n kanssa. */
export type ImagePlacement = 'none' | 'banner-full' | 'banner-center' | 'edge' | 'body-faint';

// ── Leipätekstin perusasetukset ─────────────────────────────────────
export interface TextSettings {
  fontFamily: FontFamilyKey;
  fontSize: number;        // pt
  lineHeight: number;
  textAlign: TextAlign;
  textColor: string;
}

// ── Jakaja / bannerin suunta+koko (vanha kenttä, säilyy) ────────────
export interface DividerConfig {
  direction: 'horizontal' | 'vertical' | 'none';
  sizeMm: number;
}

// ── Tausta (väri / kuva eri moodeissa) ──────────────────────────────
export type BackgroundMode = 'color' | 'generated' | 'image-strong' | 'image-faint';
export interface BackgroundConfig {
  mode: BackgroundMode;
  imageUrl?: string;
  opacity?: number;
}

// ── ✅ UUDET: kyvykkyysohjautuvat tyylikentät ───────────────────────

/** Pääbanneri. Vaaka = yläbanneri, pysty = sivupalsta (skini päättää). */
export interface BannerStyle {
  color?: string;       // taustaväri (hex tai gradient-string)
  heightMm?: number;    // korkeus (vaaka) / leveys (pysty)
  textColor?: string;   // bannerin tekstien perusväri
}

/** Toissijainen palkki, esim. Greetingin vaalea yhteystietopalkki. */
export interface BandStyle {
  color?: string;
  heightMm?: number;    // undefined → auto (sisällön mukaan)
}

/** Skinikohtainen kuva (erillinen background-kuvasta). */
export interface SkinImage {
  url?: string;
  placement?: ImagePlacement;
  opacity?: number;
}

/** Alueittainen typografia. Avain = region-tunniste (esim. 'heading', 'body', 'name'). */
export interface RegionText {
  fontSize?: number;        // yksikkö skinin/capabilityn mukaan (px tai pt)
  textColor?: string;
  letterSpacing?: number;
}

// ── Koko tyylimalli ─────────────────────────────────────────────────
export interface CLStyle {
  templateStyle: string;
  accentColor: string;
  divider: DividerConfig;
  background: BackgroundConfig;
  text: TextSettings;
  signatureStyle: SignatureStyle;
  showDate: boolean;
  closingText?: string;

  // ✅ uudet, valinnaiset
  banner?: BannerStyle;
  band?: BandStyle;
  image?: SkinImage;
  regions?: Record<string, RegionText>;
}

// ── Yhteystiedot ────────────────────────────────────────────────────
export interface CLContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

// ── Moottorin näkemä "siisti" data ──────────────────────────────────
export interface CLData {
  contact: CLContactInfo;
  jobTitle: string;
  companyName: string;
  title: string;
  body: string;
  keyHighlights: string[];
  language: string;
  style: CLStyle;
}

// ── Raakatallenne (Supabasen content/ai_data) ──────────────────────
export interface CLRawRecord {
  title: string;
  content?: any;     // tallennettu sisältö (contactInfo, body, templateStyle, banner, …)
  ai_data?: any;
}

// ── Moottorin julkinen rajapinta (skinit + komponentit käyttävät) ──
export interface CLEngine {
  data: CLData;
  isEditing: boolean;
  updateContact: (field: keyof CLContactInfo, value: string) => void;
  updateBody: (newBody: string) => void;
  updateField: (field: 'jobTitle' | 'companyName' | 'title', value: string) => void;
  updateStyle: (patch: Partial<CLStyle>) => void;
  updateText: (patch: Partial<TextSettings>) => void;
  paragraphs: string[];
  initials: string;
  todayStr: string;
  fontStack: (key?: FontFamilyKey) => string;
}

export interface CLSkinProps {
  engine: CLEngine;
}