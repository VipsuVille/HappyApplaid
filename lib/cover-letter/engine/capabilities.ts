// lib/cover-letter/engine/capabilities.ts
// ✅ Kyvykkyysohjautuva malli: jokainen skini ilmoittaa mitä se tukee.
//    Muokkauspaneeli (AdaptiveControls) renderöi VAIN nämä säätimet.
//    Skini itse lukee data.style-kentät fallbackeilla — manifesti ohjaa vain UI:ta.

export type BannerOrientation = 'horizontal' | 'vertical';
export type ImagePlacement = 'none' | 'banner-full' | 'banner-center' | 'edge' | 'body-faint';

export interface SkinCapabilities {
  /** Pääbanneri (vaaka = yläbanneri, pysty = sivupalsta). */
  banner?: {
    orientation: BannerOrientation;
    color: boolean;                    // bannerin taustaväri muokattavissa
    height: boolean;                   // korkeus (vaaka) / leveys (pysty), mm
    imagePlacements: ImagePlacement[]; // mihin kuva voi sijoittua tässä pohjassa
  };
  /** Toissijainen palkki, esim. Greetingin vaalea yhteystietopalkki. */
  band?: { color: boolean; height: boolean };
  /** Tekstialueet joilla oma typografia (koko + väri). */
  textRegions: { key: string; label: string; unit: 'pt' | 'px' }[];
  signature: boolean;
}

const BODY = { key: 'body', label: 'Leipäteksti', unit: 'pt' as const };

export const SKIN_CAPABILITIES: Record<string, SkinCapabilities> = {
  greeting: {
    banner: { orientation: 'horizontal', color: true, height: true, imagePlacements: ['none', 'banner-center'] },
    band:   { color: true, height: true },
    textRegions: [
      { key: 'heading', label: 'Nimi (banneri)', unit: 'px' },
      BODY,
    ],
    signature: true,
  },
  executive: {
    banner: { orientation: 'horizontal', color: true, height: true, imagePlacements: ['none', 'banner-full', 'banner-center'] },
    textRegions: [{ key: 'heading', label: 'Nimi (banneri)', unit: 'px' }, BODY],
    signature: true,
  },
  spine: {
    banner: { orientation: 'vertical', color: true, height: true, imagePlacements: ['none', 'edge'] },
    textRegions: [{ key: 'name', label: 'Pystynimi', unit: 'px' }, BODY],
    signature: true,
  },
  aurora: {
    banner: { orientation: 'horizontal', color: true, height: true, imagePlacements: ['none', 'banner-full', 'body-faint'] },
    textRegions: [{ key: 'heading', label: 'Nimi (banneri)', unit: 'px' }, BODY],
    signature: true,
  },
'monogram': {
  banner: {color: true, orientation: 'horizontal', height: true, imagePlacements: ['none'] },
  textRegions: [
    { key: 'watermark', label: 'Iso kirjain', unit: 'px' },
    { key: 'body', label: 'Leipäteksti', unit: 'pt' },
  ],
  signature: true,
},

  // ── Keskitetyt / bannerittomat pohjat: vain tekstialueet ──
  elegant: {
    textRegions: [{ key: 'heading', label: 'Nimi', unit: 'px' }, BODY],
    signature: true,
  },
  classic: {
    textRegions: [{ key: 'heading', label: 'Nimi', unit: 'px' }, BODY],
    signature: true,
  },
  'creative-wave': {
    textRegions: [{ key: 'heading', label: 'Nimi', unit: 'px' }, BODY],
    signature: true,
  },
};

export const DEFAULT_CAPABILITIES: SkinCapabilities = {
  textRegions: [BODY],
  signature: true,
};

export const getCapabilities = (templateStyle: string): SkinCapabilities =>
  SKIN_CAPABILITIES[templateStyle] ?? DEFAULT_CAPABILITIES;