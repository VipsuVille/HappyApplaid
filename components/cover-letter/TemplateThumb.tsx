'use client';
// components/cover-letter/TemplateThumb.tsx
// ✅ Kevyt SVG-miniesikatselu jokaiselle skinille (ei renderöi koko engineä).
//    Käytetään create-cover-letter -sivun pohjavalitsimessa kortteina.

import React from 'react';

type Props = { id: string; accent?: string };

const LINE = '#dde3ec';   // leipätekstirivin väri
const NAME = '#1f2937';   // tumma nimipalkki

/** Rivipino leipätekstiä imitoimaan */
function Lines({
  x, y, count, w, gap = 10, last = 0.6, color = LINE,
}: { x: number; y: number; count: number; w: number; gap?: number; last?: number; color?: string }) {
  return (
    <g>
      {Array.from({ length: count }).map((_, i) => (
        <rect
          key={i}
          x={x}
          y={y + i * gap}
          width={i === count - 1 ? w * last : w}
          height={3.1}
          rx={1.55}
          fill={color}
        />
      ))}
    </g>
  );
}

/** Yhteystietorivi: pieni pallura + viiva */
function Contact({
  x, y, vertical = false, dot = '#94a3b8', line = LINE,
}: { x: number; y: number; vertical?: boolean; dot?: string; line?: string }) {
  const items = [0, 1, 2];
  return (
    <g>
      {items.map((i) =>
        vertical ? (
          <g key={i} transform={`translate(${x}, ${y + i * 13})`}>
            <circle cx={3} cy={3} r={3} fill={dot} />
            <rect x={10} y={1.5} width={34} height={3} rx={1.5} fill={line} />
          </g>
        ) : (
          <g key={i} transform={`translate(${x + i * 48}, ${y})`}>
            <circle cx={3} cy={3} r={3} fill={dot} />
            <rect x={10} y={1.5} width={30} height={3} rx={1.5} fill={line} />
          </g>
        )
      )}
    </g>
  );
}

export default function TemplateThumb({ id, accent = '#B59850' }: Props) {
  const W = 210;
  const H = 297;

  let content: React.ReactNode = null;
  let defs: React.ReactNode = null;

  switch (id) {
    // ── MODERN · BANNERI ───────────────────────────────────────
    case 'modern-top':
      content = (
        <>
          <rect x={0} y={0} width={W} height={72} fill={accent} />
          <circle cx={32} cy={36} r={13} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
          <rect x={54} y={26} width={92} height={9} rx={2} fill="#ffffff" />
          <rect x={54} y={42} width={56} height={4} rx={2} fill="rgba(255,255,255,0.65)" />
          <Contact x={24} y={92} dot={accent} />
          <rect x={24} y={108} width={60} height={3} rx={1.5} fill={LINE} />
          <Lines x={24} y={124} count={9} w={162} />
          <Lines x={24} y={228} count={4} w={162} />
        </>
      );
      break;

    // ── MODERN · SIVUPALSTA ────────────────────────────────────
    case 'modern-left':
      content = (
        <>
          <rect x={0} y={0} width={74} height={H} fill={accent} />
          <circle cx={37} cy={42} r={14} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={2} />
          <rect x={17} y={68} width={40} height={7} rx={2} fill="#ffffff" />
          <rect x={22} y={82} width={30} height={4} rx={2} fill="rgba(255,255,255,0.6)" />
          <Contact x={17} y={108} vertical dot="rgba(255,255,255,0.85)" line="rgba(255,255,255,0.4)" />
          <Lines x={90} y={40} count={11} w={100} />
          <Lines x={90} y={170} count={6} w={100} />
        </>
      );
      break;

    // ── AURORA · GRADIENT-BANNERI ──────────────────────────────
    case 'aurora':
      defs = (
        <defs>
          <linearGradient id="auroraThumb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="55%" stopColor="#f472b6" />
            <stop offset="100%" stopColor="#5eead4" />
          </linearGradient>
        </defs>
      );
      content = (
        <>
          <rect x={0} y={0} width={W} height={84} fill="url(#auroraThumb)" />
          <circle cx={176} cy={14} r={26} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
          <rect x={24} y={52} width={104} height={11} rx={2} fill="#ffffff" />
          <rect x={24} y={68} width={64} height={4} rx={2} fill="rgba(255,255,255,0.85)" />
          <Contact x={24} y={104} dot={accent} />
          <rect x={24} y={118} width={W - 48} height={1} fill="#eef2f7" />
          <Lines x={24} y={132} count={9} w={162} />
          <Lines x={24} y={236} count={4} w={162} />
        </>
      );
      break;

    // ── ELEGANT · KESKITETTY ───────────────────────────────────
    case 'elegant':
      content = (
        <>
          <rect x={105 - 50} y={40} width={100} height={9} rx={2} fill={NAME} />
          <rect x={105 - 30} y={56} width={60} height={4} rx={2} fill={accent} />
          {/* viiva + vinoneliö */}
          <line x1={62} y1={74} x2={92} y2={74} stroke="#e5e7eb" strokeWidth={1.5} />
          <rect x={102} y={71} width={6} height={6} transform="rotate(45 105 74)" fill={accent} />
          <line x1={118} y1={74} x2={148} y2={74} stroke="#e5e7eb" strokeWidth={1.5} />
          <Contact x={50} y={90} dot={accent} />
          <Lines x={28} y={120} count={9} w={154} />
          <Lines x={28} y={224} count={4} w={154} />
          {/* pieni kasviornamentti */}
          <g stroke={accent} strokeWidth={1} fill="none" opacity={0.7}>
            <path d="M105 262 V 280" />
            <path d="M105 266 C 99 264, 95 266, 92 270" />
            <path d="M105 266 C 111 264, 115 266, 118 270" />
            <line x1={80} y1={278} x2={98} y2={278} />
            <line x1={112} y1={278} x2={130} y2={278} />
          </g>
        </>
      );
      break;

    // ── CREATIVE WAVE ──────────────────────────────────────────
    case 'creative-wave':
      content = (
        <>
          <path d={`M0 0 H${W} V52 Q150 78 95 56 T0 66 Z`} fill={accent} />
          <rect x={24} y={20} width={96} height={9} rx={2} fill="#ffffff" />
          <rect x={24} y={35} width={58} height={4} rx={2} fill="rgba(255,255,255,0.7)" />
          <Contact x={24} y={92} dot={accent} />
          <Lines x={24} y={112} count={9} w={162} />
          <Lines x={24} y={216} count={4} w={162} />
        </>
      );
      break;

    // ── MONOGRAM ───────────────────────────────────────────────
    case 'monogram':
      content = (
        <>
          <rect x={7} y={7} width={W - 14} height={H - 14} fill="none" stroke={accent} strokeWidth={1} opacity={0.35} />
          {/* iso vesileima-kirjain */}
          <text x={W - 30} y={150} textAnchor="end" fontSize={210} fontWeight={700} fill={accent} opacity={0.06} fontFamily="Georgia, serif">A</text>
          <circle cx={42} cy={48} r={15} fill="none" stroke={accent} strokeWidth={1.5} />
          <rect x={24} y={78} width={104} height={9} rx={2} fill={NAME} />
          <rect x={24} y={94} width={60} height={4} rx={2} fill={accent} />
          <rect x={24} y={112} width={40} height={3} rx={1.5} fill={accent} />
          <Contact x={24} y={128} dot={accent} />
          <Lines x={24} y={156} count={9} w={150} />
          <Lines x={24} y={250} count={4} w={150} />
        </>
      );
      break;

    // ── SIDEBAR ────────────────────────────────────────────────
    case 'sidebar':
      content = (
        <>
          <rect x={0} y={0} width={80} height={H} fill={accent} />
          <circle cx={40} cy={44} r={16} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} />
          <rect x={18} y={72} width={44} height={7} rx={2} fill="#ffffff" />
          <rect x={24} y={86} width={32} height={4} rx={2} fill="rgba(255,255,255,0.6)" />
          <Contact x={16} y={112} vertical dot="rgba(255,255,255,0.85)" line="rgba(255,255,255,0.4)" />
          <Lines x={98} y={44} count={11} w={92} />
          <Lines x={98} y={176} count={6} w={92} />
        </>
      );
      break;

    // ── RIBBON ─────────────────────────────────────────────────
    case 'ribbon':
      defs = (
        <defs>
          <linearGradient id="ribbonThumb" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={accent} />
            <stop offset="100%" stopColor={accent} stopOpacity={0.55} />
          </linearGradient>
        </defs>
      );
      content = (
        <>
          <rect x={0} y={0} width={6} height={H} fill={accent} />
          {/* diagonaalinen nauha oikeaan yläkulmaan */}
          <path d={`M${W} 0 L${W} 96 L${W - 96} 0 Z`} fill="url(#ribbonThumb)" />
          <rect x={22} y={34} width={120} height={12} rx={2} fill={NAME} />
          <rect x={22} y={54} width={70} height={5} rx={2} fill={accent} />
          <line x1={22} y1={78} x2={50} y2={78} stroke={accent} strokeWidth={2} />
          <Contact x={58} y={75} dot={accent} />
          <Lines x={22} y={104} count={9} w={150} />
          <Lines x={22} y={208} count={4} w={150} />
        </>
      );
      break;

    // ── CLASSIC ────────────────────────────────────────────────
    case 'classic':
    default:
      content = (
        <>
          <rect x={0} y={0} width={W} height={7} fill={accent} />
          <rect x={24} y={30} width={96} height={9} rx={2} fill={NAME} />
          <rect x={24} y={46} width={54} height={4} rx={2} fill={accent} />
          <line x1={24} y1={64} x2={W - 24} y2={64} stroke="#e5e7eb" strokeWidth={1.5} />
          <Contact x={24} y={76} dot="#94a3b8" />
          <Lines x={24} y={104} count={9} w={162} />
          <Lines x={24} y={208} count={4} w={162} />
          <line x1={24} y1={262} x2={W - 24} y2={262} stroke="#e5e7eb" strokeWidth={1} />
          <Contact x={42} y={272} dot="#94a3b8" />
        </>
      );
      break;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      {defs}
      <rect width={W} height={H} fill="#ffffff" />
      {content}
    </svg>
  );
}