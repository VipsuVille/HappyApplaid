// lib/cover-letter/engine/types.ts
// ✅ Cover letter -enginen tyypit. Sopimus jonka jokainen skini (template) täyttää.
// Lukee nykyisen tallennusmuodon (content.body, content.contactInfo, ai_data) sellaisenaan.

// ─── Yhteystiedot ─────────────────────────────────────────────
export interface CLContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
}

// ─── Jakaja (pysty/vaaka/ei mitään) ───────────────────────────
export type DividerDirection = 'vertical' | 'horizontal' | 'none';

export interface DividerConfig {
  direction: DividerDirection;
  // Kuinka paljon "ensimmäinen" alue vie tilaa.
  // vertical → vasemman palstan leveys (mm)
  // horizontal → yläbannerin korkeus (mm)
  // none → ei merkitystä
  sizeMm: number;
}

// ─── Tausta ───────────────────────────────────────────────────
export type BackgroundMode =
  | 'color'         // pelkkä väri (accent tai valkoinen)
  | 'image-faint'   // oma kuva haaleana koko sivulla
  | 'image-strong'  // oma kuva vahvempana (rajatulla alueella, esim. banneri)
  | 'generated';    // profiilin mukaan generoitu kuva (toiminto on CV-puolella)

export interface BackgroundConfig {
  mode: BackgroundMode;
  imageUrl?: string;   // image-faint / image-strong / generated käyttää tätä
  opacity?: number;    // image-faint: häivytys 0..1 (oletus ~0.12)
}

// ─── Allekirjoitustyyli ───────────────────────────────────────
export type SignatureStyle = 'script' | 'print' | 'bold';

// ─── Tekstiasetukset ──────────────────────────────────────────
export type FontFamilyKey = 'serif' | 'sans' | 'classic' | 'modern';

export interface TextSettings {
  fontFamily: FontFamilyKey; // valittava fontti
  fontSize: number;          // leipätekstin koko (pt)
  lineHeight: number;
  textAlign: 'left' | 'justify' | 'center';
  textColor: string;         // oletus '#1a1a1a' (musta)
}

// ─── Tyyli (koko style-sopimus) ───────────────────────────────
export interface CLStyle {
  templateStyle: string;     // skinin tunniste, esim. 'modern-top' | 'modern-left' | 'classic'
  accentColor: string;       // korostusväri (banneri, jakaja, allekirjoitusviiva)
  divider: DividerConfig;
  background: BackgroundConfig;
  text: TextSettings;
  signatureStyle: SignatureStyle;
  showDate: boolean;
}

// ─── Koko data jonka engine lukee ─────────────────────────────
export interface CLData {
  contact: CLContactInfo;
  jobTitle?: string;
  companyName?: string;
  title?: string;
  body: string;              // leipäteksti (kappaleet \n\n-eroteltuna)
  keyHighlights?: string[];
  language?: string;
  style: CLStyle;
}

// ─── Skinin (templaten) propsit ───────────────────────────────
// Skini saa enginen palauttaman "engine"-objektin ja piirtää ulkoasun sen avulla.
export interface CLSkinProps {
  engine: CLEngine;
}

// ─── Mitä useCoverLetterEngine palauttaa ──────────────────────
export interface CLEngine {
  data: CLData;
  isEditing: boolean;

  // Muokkausfunktiot (skinit eivät toista näitä)
  updateContact: (field: keyof CLContactInfo, value: string) => void;
  updateBody: (newBody: string) => void;
  updateField: (field: 'jobTitle' | 'companyName' | 'title', value: string) => void;
  updateStyle: (patch: Partial<CLStyle>) => void;
  updateText: (patch: Partial<TextSettings>) => void;

  // Johdetut apurit
  paragraphs: string[];
  initials: string;
  todayStr: string;
  fontStack: (key?: FontFamilyKey) => string;
}

// ─── Raakadata tietokannasta (nykyinen muoto) ─────────────────
// Engine muuntaa tämän CLData:ksi. EI muuteta tallennusmuotoa.
export interface CLRawRecord {
  title?: string;
  content?: {
    body?: string;
    signature?: string;
    contactInfo?: Partial<CLContactInfo>;
    headerColor?: string;
    headerLayout?: 'top' | 'left';
    sidebarContent?: 'contact' | 'highlights' | 'none';
    fontSize?: number;
    lineHeight?: number;
    textAlign?: 'left' | 'justify' | 'center';
    // ✅ uudet engine-kentät (valinnaisia, tallennetaan content:iin)
    templateStyle?: string;
    accentColor?: string;
    divider?: DividerConfig;
    background?: BackgroundConfig;
    fontFamily?: FontFamilyKey;
    textColor?: string;
    signatureStyle?: SignatureStyle;
    showDate?: boolean;
    job_title?: string;
    company_name?: string;
    language?: string;
    style?: string;
  };
  ai_data?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    job_title?: string;
    company_name?: string;
    key_highlights?: string[];
  };
}