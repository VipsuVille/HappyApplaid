'use client';
// components/cover-letter/AdaptiveControls.tsx
// ✅ Kyvykkyysohjautuva säädinpaneeli. Näyttää VAIN aktiivisen pohjan tukemat säätimet.
//    Kuvan valinta tapahtuu olemassa olevan kuvavalitsimen kautta (ei URL-kenttää).

import React, { useState } from 'react';
import { getCapabilities, type ImagePlacement } from '@/lib/cover-letter/engine/capabilities';

interface Props {
  styleSettings: any;
  onChange: (patch: any) => void;
  /** Avaa olemassa olevan kuvavalitsimen (sama kuin CV-puolella). 
   *  Palauttaa valitun kuvan signed URL:n + pysyvän file_path:n. */
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

  return (
    <div>
      {/* ── BANNERI ── */}
      {caps.banner && (
        <div style={card}>
          <p style={head}>{caps.banner.orientation === 'vertical' ? 'Sivupalsta' : 'Banneri'}</p>

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
              <div style={rowS}><span style={lbl}>{caps.banner.orientation === 'vertical' ? 'Leveys' : 'Korkeus'}</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{styleSettings.banner?.heightMm ?? 62} mm</span></div>
              <input type="range" min={30} max={130} step={1} style={{ width: '100%', accentColor: '#f97316' }}
                value={styleSettings.banner?.heightMm ?? 62}
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

              {/* ✅ Kuvan valinta: nappi joka avaa olemassa olevan kuvavalitsimen */}
              {placement !== 'none' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {hasImage && (
                    <img src={styleSettings.image.url} alt="" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #444' }} />
                  )}
                  <button
                    type="button"
                    onClick={() => onPickImage?.()}
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

              {/* Kuvan himmennys (opacity) jos kuva valittu */}
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
          <div>
            <div style={rowS}><span style={lbl}>Koko ({activeRegion?.unit})</span>
              <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{regionVal.fontSize ?? '—'}</span></div>
            <input type="range"
              min={activeRegion?.unit === 'px' ? 18 : 8}
              max={activeRegion?.unit === 'px' ? 160 : 16}
              step={activeRegion?.unit === 'px' ? 1 : 0.5}
              style={{ width: '100%', accentColor: '#f97316' }}
              value={regionVal.fontSize ?? (activeRegion?.unit === 'px' ? 34 : 11)}
              onChange={e => patchRegion(region, { fontSize: Number(e.target.value) })} />
          </div>
          <div style={{ ...rowS, marginTop: '8px', marginBottom: 0 }}>
            <span style={lbl}>Väri</span>
            <input type="color" style={swatch(regionVal.textColor || '#1a1a1a')}
              value={regionVal.textColor || '#1a1a1a'}
              onChange={e => patchRegion(region, { textColor: e.target.value })} />
          </div>
          <p style={{ fontSize: '10px', color: '#666', margin: '10px 0 0', lineHeight: 1.5 }}>
            💡 Yksittäisten sanojen tai kirjainten väri: maalaa teksti paperilla ja käytä työkalupalkkia.
          </p>
        </div>
      )}
    </div>
  );
}