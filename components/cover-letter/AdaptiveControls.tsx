'use client';
// components/cover-letter/AdaptiveControls.tsx
// ✅ Kyvykkyysohjautuva säädinpaneeli. Lukee getCapabilities(templateStyle) ja
//    näyttää VAIN ne säätimet jotka aktiivinen pohja tukee (banneri/palkki/kuva/alueet).
//    Päivittää edit-sivun styleSettings-tilaa onChange-callbackilla.

import React, { useState } from 'react';
import { getCapabilities, type ImagePlacement } from '@/lib/cover-letter/engine/capabilities';

interface Props {
  styleSettings: any;                 // edit-sivun StyleSettings
  onChange: (patch: any) => void;     // (p) => setStyleSettings(prev => ({ ...prev, ...p }))
}

const card: React.CSSProperties = { background: '#252525', border: '1px solid #3a3a3a', borderRadius: '14px', padding: '14px', marginBottom: '12px' };
const head: React.CSSProperties = { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#9aa0a6', margin: '0 0 10px' };
const row: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' };
const lbl: React.CSSProperties = { fontSize: '12px', color: '#cbd0d4' };
const swatch = (v?: string): React.CSSProperties => ({ width: '34px', height: '30px', borderRadius: '8px', border: '1px solid #444', background: v || 'transparent', cursor: 'pointer', padding: 0 });

const PLACEMENT_LABEL: Record<ImagePlacement, string> = {
  'none': 'Ei kuvaa',
  'banner-full': 'Banneri täyteen',
  'banner-center': 'Banneri · keskelle',
  'edge': 'Reunaan',
  'body-faint': 'Taustalle (haalea)',
};

export default function AdaptiveControls({ styleSettings, onChange }: Props) {
  const caps = getCapabilities(styleSettings.templateStyle);
  const [region, setRegion] = useState(caps.textRegions[0]?.key || 'body');

  // sulava nested-merge (estää banner/band/image/regions -objektien ylikirjoituksen)
  const patchBanner = (p: any) => onChange({ banner: { ...styleSettings.banner, ...p } });
  const patchBand   = (p: any) => onChange({ band:   { ...styleSettings.band, ...p } });
  const patchImage  = (p: any) => onChange({ image:  { ...styleSettings.image, ...p } });
  const patchRegion = (key: string, p: any) =>
    onChange({ regions: { ...styleSettings.regions, [key]: { ...styleSettings.regions?.[key], ...p } } });

  const activeRegion = caps.textRegions.find(r => r.key === region) || caps.textRegions[0];
  const regionVal = styleSettings.regions?.[region] || {};

  return (
    <div>
      {/* ── BANNERI ── */}
      {caps.banner && (
        <div style={card}>
          <p style={head}>{caps.banner.orientation === 'vertical' ? 'Sivupalsta' : 'Banneri'}</p>

          {caps.banner.color && (
            <div style={row}>
              <span style={lbl}>Väri</span>
              <input type="color" style={swatch(styleSettings.banner?.color || '#18181c')}
                value={(styleSettings.banner?.color || '#18181c').startsWith('#') ? styleSettings.banner?.color || '#18181c' : '#18181c'}
                onChange={e => patchBanner({ color: e.target.value })} />
            </div>
          )}

          {caps.banner.height && (
            <div style={{ marginBottom: '10px' }}>
              <div style={row}><span style={lbl}>{caps.banner.orientation === 'vertical' ? 'Leveys' : 'Korkeus'}</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{styleSettings.banner?.heightMm ?? 62} mm</span></div>
              <input type="range" min={30} max={130} step={1} style={{ width: '100%', accentColor: '#f97316' }}
                value={styleSettings.banner?.heightMm ?? 62}
                onChange={e => patchBanner({ heightMm: Number(e.target.value) })} />
            </div>
          )}

          {caps.banner.imagePlacements.length > 1 && (
            <>
              <div style={row}>
                <span style={lbl}>Kuva</span>
                <select value={styleSettings.image?.placement || 'none'}
                  onChange={e => patchImage({ placement: e.target.value as ImagePlacement })}
                  style={{ flex: 1, maxWidth: '170px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', fontSize: '12px' }}>
                  {caps.banner.imagePlacements.map(p => <option key={p} value={p}>{PLACEMENT_LABEL[p]}</option>)}
                </select>
              </div>
              {styleSettings.image?.placement && styleSettings.image.placement !== 'none' && (
                <input placeholder="Kuvan URL (tai kytke kuvanvalitsin)" value={styleSettings.image?.url || ''}
                  onChange={e => patchImage({ url: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid #444', background: '#2a2a2a', color: '#e8e3dc', fontSize: '12px' }} />
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
            <div style={row}>
              <span style={lbl}>Väri</span>
              <input type="color" style={swatch(styleSettings.band?.color || '#eef1f7')}
                value={(styleSettings.band?.color || '#eef1f7')}
                onChange={e => patchBand({ color: e.target.value })} />
            </div>
          )}
          {caps.band.height && (
            <div>
              <div style={row}><span style={lbl}>Korkeus</span>
                <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{styleSettings.band?.heightMm ?? 0 ? `${styleSettings.band?.heightMm} mm` : 'auto'}</span></div>
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
          <div style={row}>
            <span style={lbl}>Alue</span>
            <select value={region} onChange={e => setRegion(e.target.value)}
              style={{ flex: 1, maxWidth: '170px', padding: '7px 10px', borderRadius: '8px', border: '1px solid #444', background: '#333', color: '#e0dbd4', fontSize: '12px' }}>
              {caps.textRegions.map(r => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>
          <div>
            <div style={row}><span style={lbl}>Koko ({activeRegion?.unit})</span>
              <span style={{ fontSize: '12px', color: '#f97316', fontWeight: 700 }}>{regionVal.fontSize ?? '—'}</span></div>
            <input type="range"
              min={activeRegion?.unit === 'px' ? 18 : 8}
              max={activeRegion?.unit === 'px' ? 60 : 16}
              step={activeRegion?.unit === 'px' ? 1 : 0.5}
              style={{ width: '100%', accentColor: '#f97316' }}
              value={regionVal.fontSize ?? (activeRegion?.unit === 'px' ? 34 : 11)}
              onChange={e => patchRegion(region, { fontSize: Number(e.target.value) })} />
          </div>
          <div style={{ ...row, marginTop: '8px', marginBottom: 0 }}>
            <span style={lbl}>Väri</span>
            <input type="color" style={swatch(regionVal.textColor || '#1a1a1a')}
              value={regionVal.textColor || '#1a1a1a'}
              onChange={e => patchRegion(region, { textColor: e.target.value })} />
          </div>
        </div>
      )}
    </div>
  );
}