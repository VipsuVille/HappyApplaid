'use client';
// components/cover-letter/AdaptiveControls.tsx
// ✅ Kyvykkyysohjautuva säädinpaneeli. Näyttää VAIN aktiivisen pohjan tukemat säätimet.
//    Kuvan valinta tapahtuu olemassa olevan kuvavalitsimen kautta (ei URL-kenttää).
//    ✅ Vesileima-region ('watermark') saa oman ISON kokoskaalan + opacity-liu'un.

import React, { useState } from 'react';
import { getCapabilities, type ImagePlacement } from '@/lib/cover-letter/engine/capabilities';

interface Props {
  styleSettings: any;
  onChange: (patch: any) => void;
  onPickImage?: () => void;
}

const card: React.CSSProperties = { background: '#252525', border: '1px solid #3a3a3a', borderRadius: '14px', padding: '14px', marginBottom: '12px' };
const head: React.CSSProperties = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9aa0a6', margin: '0 0 10px' };
const rowS: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' };
const lbl: React.CSSProperties = { fontSize: '12px', color: '#cbd0d4' };
const swatch = (v?: string): React.CSSProperties => ({ width: '34px', height: '30px', borderRadius: '8px', border: '1px solid #444', background: v || 'transparent', cursor: 'pointer', padding: 0 });

const PLACEMENT_LABEL: Record<ImagePlacement, string> = {
  'none': 'Ei kuvaa',
  'banner-full': 'Banneri täyteen',
  'banner-center': 'Banneri · keskelle',
  'edge': 'Reunaan',
  'body-faint': 'Taustalle (haalea)',
};

// Onko region "vesileima"-tyyppinen (iso koristekirjain)? → oma skaala
const isWatermark = (key?: string) => key === 'watermark';

export default function AdaptiveControls({ styleSettings, onChange, onPickImage }: Props) {
  const caps = getCapabilities(styleSettings.templateStyle);
  const [region, setRegion] = useState(caps.textRegions[0]?.key || 'body');

  const patchBanner = (p: any) => onChange({ banner: { ...styleSettings.banner, ...p } });
  const patchBand   = (p: any) => onChange({ band:   { ...styleSettings.band, ...p } });
  const patchImage  = (p: any) => onChange({ image:  { ...styleSettings.image, ...p } });
  const patchRegion = (key: string, p: any) =>
    onChange({ regions: { ...styleSettings.regions, [key]: { ...styleSettings.regions?.[key], ...p } } });

  const activeRegion = caps.textRegions.find(r => r.key === region) || caps.textRegions[0];
  const regionVal = styleSettings.regions?.[region] || {};
  const hasImage = styleSettings.image?.url;
  const placement = styleSettings.image?.placement || 'none';

  const watermark = isWatermark(region);
  // Vesileiman oletusväri = teemaväri; käyttäjä voi yliajaa
  const usingThemeColor = !regionVal.textColor;

  return (
    <div>
      {/* ── BANNERI ── */}
      {caps.banner && (
        <div style={card}>
          <p style={head}>{caps.banner.orientation === 'vertical' ? 'Sivupalsta' : 'Banneri / yläosa'}</p>

          {caps.banner.color && (
            <div style={rowS}>
              <span style={lbl}>Väri</span>
              <input type="color" style={swatch(styleSettings.banner?.color || '#18181c')}
                value={(styleSettings.banner?.color || '#18181c').startsWith('#') ? styleSettings.banner?.color || '#18181c' : '#18181c'}
                onChange={e => patchBanner({ color: e.target.value })} />
            </div>
          )}

          {caps.banner.height && (
            <div style={{ marginBottom: '10px' }}>
              <div style={rowS}><span style={lbl}>{caps.banner.orientation === 'vertical' ? 'Leveys' : 'Korkeus / ylätila'}</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{styleSettings.banner?.heightMm ?? 64} {caps.banner.orientation === 'vertical' ? 'mm' : 'px'}</span></div>
              <input type="range" min={20} max={160} step={1} style={{ width: '100%', accentColor: '#f97316' }}
                value={styleSettings.banner?.heightMm ?? 64}
                onChange={e => patchBanner({ heightMm: Number(e.target.value) })} />
            </div>
          )}

          {caps.banner.imagePlacements.length > 1 && (
            <>
              <div style={rowS}>
                <span style={lbl}>Kuvan paikka</span>
                <select value={placement}
                  onChange={e => patchImage({ placement: e.target.value as ImagePlacement })}
                  style={{ flex: 1, maxWidth: '170px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', fontSize: '12px' }}>
                  {caps.banner.imagePlacements.map(p => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
                </select>
              </div>

              {placement !== 'none' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hasImage && (
                    <img src={styleSettings.image.url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #444' }} />
                  )}
                  <button type="button" onClick={() => onPickImage?.()}
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #f97316', background: 'rgba(249,115,22,0.12)', color: '#f97316', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}>
                    {hasImage ? 'Vaihda kuva' : 'Valitse kuva'}
                  </button>
                  {hasImage && (
                    <button type="button" onClick={() => patchImage({ url: undefined, filePath: undefined })}
                      style={{ padding: '10px 12px', borderRadius: '8px', border: '1px solid #444', background: '#2a2a2a', color: '#999', fontSize: '12px', cursor: 'pointer' }}>
                      Poista
                    </button>
                  )}
                </div>
              )}

              {placement !== 'none' && hasImage && (
                <div style={{ marginTop: '10px' }}>
                  <div style={rowS}><span style={lbl}>Himmennys</span>
                    <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{Math.round((styleSettings.image?.opacity ?? 1) * 100)}%</span></div>
                  <input type="range" min={0.2} max={1} step={0.05} style={{ width: '100%', accentColor: '#f97316' }}
                    value={styleSettings.image?.opacity ?? 1}
                    onChange={e => patchImage({ opacity: Number(e.target.value) })} />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TOISSIJAINEN PALKKI ── */}
      {caps.band && (
        <div style={card}>
          <p style={head}>Yhteystietopalkki</p>
          {caps.band.color && (
            <div style={rowS}>
              <span style={lbl}>Väri</span>
              <input type="color" style={swatch(styleSettings.band?.color || '#eef1f7')}
                value={(styleSettings.band?.color || '#eef1f7')}
                onChange={e => patchBand({ color: e.target.value })} />
            </div>
          )}
          {caps.band.height && (
            <div>
              <div style={rowS}><span style={lbl}>Korkeus</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{styleSettings.band?.heightMm ? `${styleSettings.band.heightMm} mm` : 'auto'}</span></div>
              <input type="range" min={0} max={60} step={1} style={{ width: '100%', accentColor: '#f97316' }}
                value={styleSettings.band?.heightMm ?? 0}
                onChange={e => patchBand({ heightMm: Number(e.target.value) || undefined })} />
            </div>
          )}
        </div>
      )}

      {/* ── ALUEITTAINEN TYPOGRAFIA ── */}
      {caps.textRegions.length > 0 && (
        <div style={card}>
          <p style={head}>Tekstin koko alueittain</p>
          <div style={rowS}>
            <span style={lbl}>Alue</span>
            <select value={region} onChange={e => setRegion(e.target.value)}
              style={{ flex: 1, maxWidth: '170px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', fontSize: '12px' }}>
              {caps.textRegions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>

          {/* Koko — vesileimalle ISO skaala (100–600px), muuten normaali */}
          <div>
            <div style={rowS}>
              <span style={lbl}>{watermark ? 'Koko (px)' : `Koko (${activeRegion?.unit})`}</span>
              <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>
                {regionVal.fontSize ?? (watermark ? 420 : '—')}
              </span>
            </div>
            <input type="range"
              min={watermark ? 100 : activeRegion?.unit === 'px' ? 18 : 8}
              max={watermark ? 600 : activeRegion?.unit === 'px' ? 160 : 16}
              step={watermark ? 10 : activeRegion?.unit === 'px' ? 1 : 0.5}
              style={{ width: '100%', accentColor: '#f97316' }}
              value={regionVal.fontSize ?? (watermark ? 420 : activeRegion?.unit === 'px' ? 34 : 11)}
              onChange={e => patchRegion(region, { fontSize: Number(e.target.value) })} />
          </div>

          {/* Vesileimalle: vahvuus (opacity) */}
          {watermark && (
            <div style={{ marginTop: '8px' }}>
              <div style={rowS}><span style={lbl}>Vahvuus</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{Math.round((regionVal.opacity ?? 0.05) * 100)}%</span></div>
              <input type="range" min={0.02} max={0.4} step={0.01} style={{ width: '100%', accentColor: '#f97316' }}
                value={regionVal.opacity ?? 0.05}
                onChange={e => patchRegion(region, { opacity: Number(e.target.value) })} />
            </div>
          )}

          {/* Väri — vesileimalle "käytä teemaväriä" -valinta */}
          <div style={{ ...rowS, marginTop: '8px', marginBottom: 0 }}>
            <span style={lbl}>Väri{watermark && usingThemeColor ? ' (teemaväri)' : ''}</span>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {watermark && !usingThemeColor && (
                <button type="button" onClick={() => patchRegion(region, { textColor: undefined })}
                  style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #444', background: '#2a2a2a', color: '#999', fontSize: '10px', cursor: 'pointer' }}>
                  Teemaväri
                </button>
              )}
              <input type="color" style={swatch(regionVal.textColor || styleSettings.headerColor || '#1a1a1a')}
                value={regionVal.textColor || styleSettings.headerColor || '#1a1a1a'}
                onChange={e => patchRegion(region, { textColor: e.target.value })} />
            </div>
          </div>

          <p style={{ fontSize: '10px', color: '#666', margin: '10px 0 0', lineHeight: 1.5 }}>
            {watermark
              ? '💡 Iso koristekirjain. Oletuksena teemaväri — säädä kokoa, vahvuutta ja väriä.'
              : '💡 Yksittäisten sanojen väri: maalaa teksti paperilla ja käytä työkalupalkkia.'}
          </p>
        </div>
      )}
    </div>
  );
}