'use client';
// components/cover-letter/CoverLetterDesignPanel.tsx
// ✅ Editorin sivupaneeli: tausta (valitse storagesta / lataa oma) + himmennys
//    + bannerin korkeus + tekstin tilankäyttö (fontti, riviväli).
//    EI generoi kuvia — vain valinta/lataus. Generointi tapahtuu vain luonnissa.

import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Upload, X, Layers, Maximize2, Type, Sparkles, RotateCcw } from 'lucide-react';
import { getAllAvailableImagesAction, type UserImage } from '@/app/actions/userImages';

export interface BackgroundSettings {
  mode: 'color' | 'generated' | 'image-faint' | 'image-strong';
  imageUrl?: string;
  opacity?: number;
}

interface Props {
  // Tausta
  background: BackgroundSettings;
  onBackgroundChange: (bg: BackgroundSettings) => void;
  // Layout
  bannerHeightMm: number;            // divider.sizeMm
  onBannerHeightChange: (mm: number) => void;
  showBanner: boolean;               // näytä bannerikorkeus vain bannerillisille pohjille (aurora/modern-top)
  // Teksti
  fontSize: number;
  lineHeight: number;
  onFontSizeChange: (v: number) => void;
  onLineHeightChange: (v: number) => void;
}

const CARD = 'bg-[#252525] border border-[#3a3a3a] rounded-2xl p-4';
const LABEL = 'text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2';

export default function CoverLetterDesignPanel({
  background,
  onBackgroundChange,
  bannerHeightMm,
  onBannerHeightChange,
  showBanner,
  fontSize,
  lineHeight,
  onFontSizeChange,
  onLineHeightChange,
}: Props) {
  const [images, setImages] = useState<UserImage[]>([]);
  const [loadingImgs, setLoadingImgs] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const hasImage = !!background.imageUrl;
  const opacity = background.opacity ?? (background.mode === 'image-faint' ? 0.12 : 0.9);

  // Lataa storagessa olevat taustakuvat kun valitsin avataan
  useEffect(() => {
    if (!showPicker || images.length > 0) return;
    (async () => {
      setLoadingImgs(true);
      try {
        const all = await getAllAvailableImagesAction();
        setImages(all.backgroundImages || []);
      } catch {
        /* hiljaa */
      } finally {
        setLoadingImgs(false);
      }
    })();
  }, [showPicker, images.length]);

  const pickImage = (url: string) => {
    onBackgroundChange({
      mode: background.mode === 'image-faint' ? 'image-faint' : 'generated',
      imageUrl: url,
      opacity: background.opacity ?? (background.mode === 'image-faint' ? 0.12 : 0.9),
    });
    setShowPicker(false);
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      pickImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const setPlacement = (mode: 'image-faint' | 'generated') => {
    onBackgroundChange({
      ...background,
      mode,
      // järkevä oletus-opacity per sijoitus jos ei vielä asetettu
      opacity: background.opacity ?? (mode === 'image-faint' ? 0.12 : 0.9),
    });
  };

  const setOpacity = (v: number) => {
    onBackgroundChange({ ...background, opacity: v });
  };

  const removeImage = () => {
    onBackgroundChange({ mode: 'color' });
  };

  return (
    <div className="space-y-4">

      {/* ── TAUSTAKUVA ───────────────────────────────────────── */}
      <div className={CARD}>
        <p className={LABEL}><ImageIcon size={13} /> Taustakuva</p>

        {/* Esikatselu / tyhjä */}
        {hasImage ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-[#444] mb-3">
            <img src={background.imageUrl} alt="" className="w-full h-full object-cover" />
            <button
              onClick={removeImage}
              className="absolute top-1.5 right-1.5 bg-black/70 text-white rounded-full w-6 h-6 flex items-center justify-center"
              title="Poista taustakuva"
            >
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="w-full aspect-video rounded-xl border border-dashed border-[#444] mb-3 flex items-center justify-center text-gray-600 text-xs">
            Ei taustakuvaa
          </div>
        )}

        <div className="flex gap-2 mb-1">
          <button
            onClick={() => setShowPicker(true)}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs font-bold hover:bg-violet-500/25 transition-colors"
          >
            <ImageIcon size={13} /> Valitse kuvistasi
          </button>
          <label className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[#333] border border-[#444] text-gray-300 text-xs font-bold cursor-pointer hover:bg-[#3a3a3a] transition-colors">
            <Upload size={13} /> Lataa oma
            <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
          </label>
        </div>
        <p className="text-[10px] text-gray-600 mt-1">
          Uusia AI-taustoja luodaan vain kun generoit hakukirjeen. Tässä voit valita aiemmin luoduista tai ladata oman.
        </p>

        {/* Sijoitus + himmennys (vain jos kuva) */}
        {hasImage && (
          <div className="mt-4 pt-3 border-t border-[#3a3a3a] space-y-4">
            <div>
              <p className="text-[11px] font-bold text-gray-400 mb-2">Sijoitus</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPlacement('generated')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    background.mode !== 'image-faint'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-[#333] text-gray-400 border-[#444] hover:border-violet-500/40'
                  }`}
                  title="Kuva yläbanneriin / elementtiin"
                >
                  <Layers size={13} /> Banneri
                </button>
                <button
                  onClick={() => setPlacement('image-faint')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    background.mode === 'image-faint'
                      ? 'bg-violet-500 text-white border-violet-500'
                      : 'bg-[#333] text-gray-400 border-[#444] hover:border-violet-500/40'
                  }`}
                  title="Kuva koko sivun taustalle haaleana"
                >
                  <Maximize2 size={13} /> Koko sivu
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-bold text-gray-400">Himmennys</p>
                <span className="text-[11px] font-mono text-violet-300">{Math.round(opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={background.mode === 'image-faint' ? 4 : 20}
                max={100}
                step={1}
                value={Math.round(opacity * 100)}
                onChange={(e) => setOpacity(Number(e.target.value) / 100)}
                className="w-full"
                style={{ accentColor: '#8b5cf6' }}
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                <span>Haalea</span><span>Täysi</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── BANNERIN KORKEUS (vain bannerillisille pohjille) ─── */}
      {showBanner && (
        <div className={CARD}>
          <p className={LABEL}><Maximize2 size={13} /> Yläpalkin korkeus</p>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Korkeus</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-teal-400">{bannerHeightMm}mm</span>
              <button onClick={() => onBannerHeightChange(82)} title="Palauta oletus" className="text-gray-500 hover:text-teal-400">
                <RotateCcw size={12} />
              </button>
            </div>
          </div>
          <input
            type="range" min={45} max={130} step={1}
            value={bannerHeightMm}
            onChange={(e) => onBannerHeightChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#14b8a6' }}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>Matala</span><span>Korkea</span>
          </div>
        </div>
      )}

      {/* ── TEKSTIN TILA ─────────────────────────────────────── */}
      <div className={CARD}>
        <p className={LABEL}><Type size={13} /> Tekstin tila</p>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Fonttikoko</span>
            <span className="text-xs font-mono text-orange-400">{fontSize}pt</span>
          </div>
          <input
            type="range" min={8} max={16} step={0.5}
            value={fontSize}
            onChange={(e) => onFontSizeChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#f97316' }}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">Riviväli</span>
            <span className="text-xs font-mono text-orange-400">{lineHeight.toFixed(2)}</span>
          </div>
          <input
            type="range" min={1.1} max={2.5} step={0.05}
            value={lineHeight}
            onChange={(e) => onLineHeightChange(Number(e.target.value))}
            className="w-full"
            style={{ accentColor: '#f97316' }}
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>Tiivis</span><span>Väljä</span>
          </div>
        </div>
      </div>

      {/* ── KUVAVALITSIN-MODAALI ─────────────────────────────── */}
      {showPicker && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowPicker(false)}>
          <div
            className="bg-[#1e1e1e] border border-[#3a3a3a] rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#3a3a3a] flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-violet-400" /> Valitse taustakuva
              </h3>
              <button onClick={() => setShowPicker(false)} className="p-2 hover:bg-[#333] rounded-lg text-gray-400">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(85vh-80px)]">
              <label className="cursor-pointer w-full flex items-center justify-center gap-2 px-6 py-4 bg-violet-500/10 hover:bg-violet-500/20 border-2 border-dashed border-violet-500/30 text-violet-300 rounded-xl text-sm font-bold mb-6">
                <Upload size={18} /> Lataa uusi kuva
                <input type="file" className="hidden" accept="image/*" onChange={handleUpload} />
              </label>

              {loadingImgs ? (
                <p className="text-center text-gray-500 text-sm py-8">Ladataan kuvia…</p>
              ) : images.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-8">
                  Ei tallennettuja taustakuvia. Lataa oma, tai luo Aurora-hakukirje saadaksesi AI-taustan.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {images.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => pickImage(img.signedUrl || '')}
                      className={`aspect-video rounded-xl overflow-hidden border-2 transition-all relative ${
                        background.imageUrl === img.signedUrl
                          ? 'border-violet-500 ring-2 ring-violet-500/40'
                          : 'border-[#444] hover:border-violet-400'
                      }`}
                    >
                      <img src={img.signedUrl} alt="" className="w-full h-full object-cover" />
                      {img.is_ai_generated && (
                        <div className="absolute top-1.5 right-1.5 bg-purple-500 text-white text-[9px] px-1.5 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles size={9} /> AI
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}