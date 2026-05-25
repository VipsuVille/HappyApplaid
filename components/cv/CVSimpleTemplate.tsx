"use client";
// components/cv/CVSimpleTemplate.tsx
// ════════════════════════════════════════════════════════════════════
//  SIMPLE CV — TIE B SKIN (kertova, ei listamainen)
//  Idea: kuva + kertova teksti käyttäjästä (kuten General-hakukirje).
//  EI luettelomaisia koulutus/osaaminen/projektit-osioita.
//  Lohkot: pääkertomus + valinnaiset (esittely, vahvuudet, tavoitteet).
//  Tekstit: AI:lta jos on, muuten itse täytettävissä (ilmainen polku).
//  Asettelu: liukurit (koko + järjestys) moottorin sectionScales-kautta.
// ════════════════════════════════════════════════════════════════════

import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";
import { useCVEngine } from "@/lib/cv/engine/useCVEngine";
import {
  InlineEditor, EDITABLE_HOVER_CSS,
  type InlineEditorProps,
} from "@/lib/cv/engine/components";
import {
  type SectionScales, type ColumnScales, type LayoutConfig,
} from "@/lib/cv/engine/types";

export type { SectionScales, ColumnScales, LayoutConfig };

interface SimpleCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls?: boolean;
  editMode?: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
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

// Valinnaiset lisälohkot — kiinteä joukko, jokainen voidaan piilottaa
const OPTIONAL_BLOCKS = [
  { id: "intro",     heading: "Esittely",   aiField: "personal_description" as keyof AIData },
  { id: "strengths", heading: "Vahvuudet",  aiField: "strengths_section" as keyof AIData },
  { id: "goals",     heading: "Tavoitteet", aiField: "goals_section" as keyof AIData },
];

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = (props) => {
  const { isEditing } = props;

  const eng = useCVEngine({
    data: props.data,
    aiData: props.aiData,
    isEditing: props.isEditing,
    onUpdate: props.onUpdate,
    onDelete: props.onDelete,
    profileImage: props.profileImage,
    backgroundImage: props.backgroundImage,
    fontScale: props.fontScale,
    lineScale: props.lineScale,
    sectionScales: props.sectionScales,
    columnScales: props.columnScales,
    layout: props.layout,
  });

  const {
    fs, fsS, lh, getSec, sectionGap, commit,
    profileImg, bgImage, getAI, data,
    name, cvTitle,
  } = eng;

  const headerMm = (props.layout?.bannerHeightMm ?? (props.data as any)?.layout?.bannerHeightMm ?? 70);

  const E = (p: Omit<InlineEditorProps, "isEditing" | "onCommit">) => (
    <InlineEditor {...p} isEditing={isEditing} onCommit={commit} accentColor="rgba(59,130,246" />
  );

  // Hae lohkon teksti: 1) oma cv_data-kenttä  2) AI-teksti  3) tyhjä
  const blockText = (id: string, aiField: keyof AIData): string => {
    const own = (data as any)?.simpleBlocks?.[id];
    if (typeof own === "string") return own;
    const ai = getAI(aiField);
    return ai || "";
  };

  const avoidBreak: React.CSSProperties = { breakInside: "avoid", pageBreakInside: "avoid" };
  const mainStory = blockText("main", "personal_description" as keyof AIData);

  const H2: React.FC<{ children: React.ReactNode; sectionId: string }> = ({ children, sectionId }) => (
    <h2 style={{
      color: "#2563eb", fontSize: fsS("12px", sectionId, "right"), fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: fs("14px"),
    }}>{children}</h2>
  );

  return (
    <div className="cv-paper bg-white mx-auto relative overflow-visible shadow-2xl"
      style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Inter','Helvetica',sans-serif", color: "#1a202c" }}>
      <style>{`
        ${EDITABLE_HOVER_CSS}
        .cv-paper section { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      {/* 1. HEADER + BACKGROUND */}
      <div className="relative bg-indigo-900" style={{ height: headerMm + "mm" }}>
        {bgImage
          ? <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt="" onError={e => { e.currentTarget.style.display = "none"; }} />
          : <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1e40af 0%,#7e22ce 100%)" }} />}
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute bottom-10 left-12 z-10" style={{ color: "white" }}>
          {E({ field: "name", value: name, tag: "h1", style: { fontSize: fs("42px"), fontWeight: 800, letterSpacing: "-0.02em", textShadow: "2px 2px 4px rgba(0,0,0,0.3)", color: "white", display: "block", marginBottom: "8px" } })}
          {E({ field: "title", value: cvTitle, tag: "p", style: { fontSize: fs("20px"), opacity: 0.95, fontWeight: 300, color: "white", display: "block" } })}
        </div>

        <div className="absolute -bottom-10 right-12 z-20 rounded-full border-[6px] border-white overflow-hidden shadow-xl bg-gray-100"
          style={{ width: (50 * (getSec("photo").fontScale || 1)) + "mm", height: (50 * (getSec("photo").fontScale || 1)) + "mm" }}>
          {profileImg
            ? <img src={profileImg} className="w-full h-full object-cover" alt="Profiili" onError={e => { e.currentTarget.style.display = "none"; }} />
            : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-200" style={{ fontSize: "36px" }}>{name.substring(0, 2).toUpperCase()}</div>}
        </div>
      </div>

      {/* 2. CONTACT BAR */}
      <div className="bg-[#1a202c] text-white py-4 px-12 flex items-center gap-8 flex-wrap" style={{ fontSize: fs("14px") }}>
        {(data?.phone || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Puh:</span>
            {E({ field: "phone", value: data?.phone || "", placeholder: "+358...", style: { color: "white" } })}
          </div>
        )}
        {(data?.email || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Email:</span>
            {E({ field: "email", value: data?.email || "", placeholder: "email@example.com", style: { color: "white" } })}
          </div>
        )}
        {(data?.location || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Sijainti:</span>
            {E({ field: "location", value: data?.location || "", placeholder: "Helsinki", style: { color: "white" } })}
          </div>
        )}
      </div>

      {/* 3. KERTOVA SISÄLTÖ */}
      <div className="px-12 py-16 flex flex-col" style={{ gap: fs("36px") }}>

        {/* PÄÄKERTOMUS */}
        {!getSec("main").hidden && (mainStory || isEditing) && (
          <section style={{ marginBottom: sectionGap("main"), ...avoidBreak }}>
            <p style={{ color: "#374151", lineHeight: lh(1.8), fontSize: fsS("18px", "main", "right"), fontStyle: "italic", borderLeft: "4px solid #dbeafe", paddingLeft: "24px" }}>
              {E({ field: "simpleBlocks.main", value: mainStory, multiline: true, placeholder: "Kerro itsestäsi: kuka olet, mikä sinua motivoi, mitä haet. Tämä on CV:si sydän.", style: { color: "#374151", lineHeight: lh(1.8), fontSize: fsS("18px", "main", "right"), fontStyle: "italic" } })}
            </p>
          </section>
        )}

        {/* VALINNAISET LOHKOT */}
        {OPTIONAL_BLOCKS.map(block => {
          const txt = blockText(block.id, block.aiField);
          if (getSec(block.id).hidden) return null;
          if (!txt && !isEditing) return null;
          return (
            <section key={block.id} style={{ marginBottom: sectionGap(block.id), ...avoidBreak }}>
              <H2 sectionId={block.id}>{block.heading}</H2>
              <p style={{ color: "#374151", lineHeight: lh(1.7), fontSize: fsS("15px", block.id, "right") }}>
                {E({ field: "simpleBlocks." + block.id, value: txt, multiline: true, placeholder: "Kirjoita lohkoon " + block.heading + "…", style: { color: "#374151", lineHeight: lh(1.7), fontSize: fsS("15px", block.id, "right") } })}
              </p>
            </section>
          );
        })}

        {/* SIGNATURE */}
        <div className="mt-8 border-t pt-8" style={avoidBreak}>
          <p style={{ fontSize: fs("36px"), color: "#1d4ed8", opacity: 0.8, fontFamily: "'Brush Script MT',cursive" }}>{name}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;