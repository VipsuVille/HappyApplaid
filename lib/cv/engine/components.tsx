"use client";
// lib/cv/engine/components.tsx
// ════════════════════════════════════════════════════════════════════
//  JAETUT MUOKKAUSKOMPONENTIT (Tie B)
//  Kaikki templatet käyttävät näitä samoja. Ulkoasu (värit) tulee
//  propseina, jotta eri skinit voivat tyylitellä ne haluamallaan tavalla.
// ════════════════════════════════════════════════════════════════════

import React, { useState, useRef, useCallback, useEffect } from "react";

// ── INLINE EDITOR — uncontrolled, kursori ei hyppää ─────────────────
export interface InlineEditorProps {
  field: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
  isEditing: boolean;
  style?: React.CSSProperties;
  className?: string;
  tag?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  onCommit: (field: string, value: string) => void;
  /** Aksenttiväri editointikehykselle (skin voi vaihtaa) */
  accentColor?: string;
}

export const InlineEditor = React.memo(function InlineEditor({
  field, value, multiline = false, placeholder,
  isEditing, style, className, tag: Tag = "span", onCommit,
  accentColor = "rgba(249,115,22",
}: InlineEditorProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const savedValue = useRef(value);

  useEffect(() => {
    if (!active) savedValue.current = value;
  }, [value, active]);

  const activate = useCallback(() => {
    if (!isEditing) return;
    savedValue.current = value;
    setActive(true);
  }, [isEditing, value]);

  const commit = useCallback(() => {
    const v = inputRef.current?.value ?? savedValue.current;
    onCommit(field, v);
    setActive(false);
  }, [field, onCommit]);

  const cancel = useCallback(() => {
    if (inputRef.current) inputRef.current.value = savedValue.current;
    setActive(false);
  }, []);

  useEffect(() => {
    if (active && inputRef.current) {
      inputRef.current.focus();
      try { inputRef.current.select(); } catch {}
    }
  }, [active]);

  const inputStyle: React.CSSProperties = {
    ...style,
    display: "block", width: "100%",
    background: `${accentColor},0.07)`,
    border: `2px solid ${accentColor},0.55)`,
    borderRadius: "4px", padding: "2px 5px", outline: "none",
    boxSizing: "border-box",
    resize: multiline ? "vertical" : "none",
    minHeight: multiline ? "52px" : undefined,
    fontFamily: (style?.fontFamily as string) ?? "inherit",
    fontSize: (style?.fontSize as string) ?? "inherit",
    fontWeight: (style?.fontWeight as string | number) ?? "inherit",
    color: (style?.color as string) ?? "inherit",
    lineHeight: (style?.lineHeight as string | number) ?? "inherit",
  };

  if (isEditing && active) {
    const onKey = (e: React.KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); cancel(); }
      if (e.key === "Enter" && !multiline) { e.preventDefault(); commit(); }
    };
    return multiline
      ? <textarea ref={inputRef as any} defaultValue={value} style={inputStyle} onBlur={commit} onKeyDown={onKey} />
      : <input ref={inputRef as any} type="text" defaultValue={value} style={inputStyle} onBlur={commit} onKeyDown={onKey} />;
  }

  return (
    <Tag
      onClick={activate}
      style={{ ...style, ...(isEditing ? { cursor: "text", borderRadius: "3px" } : {}) }}
      className={`${className ?? ""} ${isEditing ? "cv-editable-hover" : ""}`}
    >
      {value || (isEditing ? (placeholder ?? "") : "")}
    </Tag>
  );
});

// ── DRAG ITEM — ▲▼ siirto + ✕ poisto ────────────────────────────────
export interface DragItemProps {
  index: number; total: number; isEditing: boolean;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
  children: React.ReactNode; style?: React.CSSProperties;
}
export const DragItem: React.FC<DragItemProps> = ({
  index, total, isEditing, onMoveUp, onMoveDown, onDelete, children, style,
}) => {
  if (!isEditing) return <div style={style}>{children}</div>;
  return (
    <div style={{ ...style, position: "relative", paddingLeft: "18px", paddingRight: "20px" }}>
      <div style={{ position: "absolute", left: "0px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "1px", zIndex: 15 }}>
        <button type="button" draggable={false} onClick={onMoveUp} disabled={index === 0} title="Ylös" style={arrowStyle(index === 0)}>▲</button>
        <button type="button" draggable={false} onClick={onMoveDown} disabled={index === total - 1} title="Alas" style={arrowStyle(index === total - 1)}>▼</button>
      </div>
      <button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Poista"
        style={{ position: "absolute", right: "0px", top: "50%", transform: "translateY(-50%)", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "16px", height: "16px", cursor: "pointer", fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 15, padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,.3)" }}>
        ✕
      </button>
      {children}
    </div>
  );
};
const arrowStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.8)",
  color: "white", border: "none", borderRadius: "3px",
  width: "14px", height: "13px", cursor: disabled ? "default" : "pointer",
  fontSize: "7px", display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, opacity: disabled ? 0.35 : 1,
});

// ── SECTION WRAP — ↑↓ koko osiolle ──────────────────────────────────
export interface SectionWrapProps {
  label: string; index: number; total: number; isEditing: boolean;
  onMoveUp: () => void; onMoveDown: () => void; children: React.ReactNode;
}
export const SectionWrap: React.FC<SectionWrapProps> = ({
  label, index, total, isEditing, onMoveUp, onMoveDown, children,
}) => {
  if (!isEditing) return <>{children}</>;
  return (
    <div style={{ position: "relative", marginBottom: "2px" }}>
      <div style={{ position: "absolute", top: "0px", right: "0px", display: "flex", alignItems: "center", gap: "3px", zIndex: 20 }}>
        <span style={{ fontSize: "7.5px", color: "rgba(249,115,22,.65)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</span>
        <button type="button" draggable={false} onClick={onMoveUp} disabled={index === 0} title="Siirrä osio ylös" style={sectionArrowStyle(index === 0)}>↑</button>
        <button type="button" draggable={false} onClick={onMoveDown} disabled={index === total - 1} title="Siirrä osio alas" style={sectionArrowStyle(index === total - 1)}>↓</button>
      </div>
      <div style={{ outline: "1px dashed rgba(249,115,22,.18)", borderRadius: "4px", padding: "4px 4px 4px 2px" }}>
        {children}
      </div>
    </div>
  );
};
const sectionArrowStyle = (disabled: boolean): React.CSSProperties => ({
  background: disabled ? "rgba(249,115,22,.12)" : "rgba(249,115,22,.75)",
  color: "white", border: "none", borderRadius: "3px",
  width: "15px", height: "15px", cursor: disabled ? "default" : "pointer",
  fontSize: "9px", display: "flex", alignItems: "center", justifyContent: "center",
  padding: 0, opacity: disabled ? 0.3 : 1,
});

// ── ADD BUTTON ──────────────────────────────────────────────────────
export const AddBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div onClick={onClick}
    style={{ padding: "3mm", border: "2px dashed #f97316", borderRadius: "4px", textAlign: "center", color: "#f97316", cursor: "pointer", fontSize: "9pt", marginTop: "3mm" }}
    onMouseEnter={e => (e.currentTarget.style.background = "rgba(249,115,22,.05)")}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
  >{label}</div>
);

// ── Jaettu hover-tyyli (skinit liittävät tämän kerran) ──────────────
export const EDITABLE_HOVER_CSS = `.cv-editable-hover:hover { outline: 2px dashed rgba(249,115,22,.45) !important; background: rgba(249,115,22,.04) !important; border-radius: 3px !important; }`;