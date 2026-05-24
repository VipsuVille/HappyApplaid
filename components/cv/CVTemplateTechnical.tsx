"use client";
// components/cv/CVTemplateTechnical.tsx
// ════════════════════════════════════════════════════════════════════
//  TECHNICAL CV — TIE B SKIN
//  Tämä on nyt OHUT ulkoasu (skin) moottorin päällä.
//  Kaikki muokkauslogiikka, parserit ja skaalat tulevat useCVEngine:stä.
//  Tämä tiedosto määrittää vain: värit, asettelu, otsikkotyylit.
// ════════════════════════════════════════════════════════════════════

import React, { useState } from "react";
import { UserFormData, AIData, EditMode } from "@/types";
import { useCVEngine } from "@/lib/cv/engine/useCVEngine";
import {
  InlineEditor, DragItem, SectionWrap, AddBtn, EDITABLE_HOVER_CSS,
  type InlineEditorProps,
} from "@/lib/cv/engine/components";
import {
  type SectionScales, type ColumnScales, type LayoutConfig,
} from "@/lib/cv/engine/types";

// Re-export tyypit jotta edit-cv:n importit pysyvät ennallaan
export type { SectionScales, ColumnScales, LayoutConfig };

interface TechnicalCVTemplateProps {
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

const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = (props) => {
  const {
    isEditing, showEditControls, editMode,
    onUpdate, onDelete,
  } = props;

  // Moottori tarjoaa kaiken: parsittu data, skaalat, apurit
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
    fs, fsS, lh, getSec, sectionGap, move, commit,
    leftMm, rightMm, bannerMm,
    profileImg, bgImage, getAI,
    skillCategories, workExperience, education, projects, name, cvTitle,
  } = eng;

  const [sectionOrder, setSectionOrder] = useState(["experience", "projects", "education", "languages"]);
  const [skillsTop, setSkillsTop] = useState(0);

  const moveSec = (i: number, dir: -1 | 1) =>
    setSectionOrder(prev => move(prev, i, i + dir));

  // E = InlineEditor jolla isEditing + onCommit valmiiksi sidottu
  const E = (p: Omit<InlineEditorProps, "isEditing" | "onCommit">) => (
    <InlineEditor {...p} isEditing={isEditing} onCommit={commit} />
  );

  // Osio-otsikkotyyli (skin määrittää ulkoasun, moottori skaalan)
  const sH2For = (sectionId: string): React.CSSProperties => ({
    fontSize: fsS("11.5pt", sectionId, "right"), fontWeight: 600, textTransform: "uppercase",
    borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm", marginBottom: "4mm",
    letterSpacing: ".12em", fontFamily: "'Inter',sans-serif", color: "#1a1a1a",
  });

  // ══════════════════════════════════════════════════════════════════
  //  SECTION RENDERERS
  // ══════════════════════════════════════════════════════════════════
  const renderExperience = () => {
    if (getSec("experience").hidden) return null;
    return (
    <section style={{ marginBottom: sectionGap("experience") }}>
      <h2 style={sH2For("experience")}>Work Experience</h2>
      {workExperience.map((job, idx) => (
        <DragItem key={`exp-${idx}`} index={idx} total={workExperience.length} isEditing={isEditing}
          onMoveUp={() => onUpdate?.("experience", move(workExperience, idx, idx - 1))}
          onMoveDown={() => onUpdate?.("experience", move(workExperience, idx, idx + 1))}
          onDelete={() => onDelete?.("experience", idx)}
          style={{ marginBottom: fsS("5.5mm", "experience", "right") }}
        >
          <h4 style={{ fontSize: fsS("10.5pt", "experience", "right"), fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", lineHeight: lh(1.3) }}>
            {E({ field: `experience.${idx}.title`, value: job.title, style: { fontWeight: 600, color: "#1a1a1a", fontSize: fsS("10.5pt", "experience", "right") } })}
            <span style={{ fontWeight: 400, color: "#555" }}> — </span>
            {E({ field: `experience.${idx}.company`, value: job.company, style: { fontWeight: 600, color: "#1a1a1a", fontSize: fsS("10.5pt", "experience", "right") } })}
          </h4>
          {(job.period || isEditing) && E({ field: `experience.${idx}.period`, value: job.period, tag: "p", placeholder: "Ajanjakso", style: { fontSize: fsS("8.5pt", "experience", "right"), color: "#666", fontStyle: "italic", marginBottom: fs("2mm"), fontWeight: 300, lineHeight: lh(1.4) } })}
          <ul style={{ marginTop: fs("2mm"), paddingLeft: "5mm", fontSize: fsS("9pt", "experience", "right"), lineHeight: lh(1.6), fontWeight: 300 }}>
            {job.bullets.map((b, bi) => (
              <DragItem key={`exp-${idx}-b-${bi}`} index={bi} total={job.bullets.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi - 1))}
                onMoveDown={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi + 1))}
                onDelete={() => onDelete?.(`experience.${idx}.bullets`, bi)}
                style={{ marginBottom: fs("1.5mm") }}
              >
                <li style={{ color: "#333", listStyle: "disc" }}>
                  {E({ field: `experience.${idx}.bullets.${bi}`, value: b, multiline: true, style: { color: "#333", fontSize: fsS("9pt", "experience", "right"), lineHeight: lh(1.6) } })}
                </li>
              </DragItem>
            ))}
            {isEditing && (
              <li style={{ color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: .7, listStyle: "none", marginTop: "2mm" }}
                onClick={() => onUpdate?.(`experience.${idx}.bullets.${job.bullets.length}`, "Uusi kuvaus")}>
                + Lisää kohta…
              </li>
            )}
          </ul>
        </DragItem>
      ))}
      {isEditing && <AddBtn label="+ Lisää työkokemus" onClick={() => onUpdate?.(`experience.${workExperience.length}`, { title: "Uusi tehtävä", company: "Yritys", period: "2024 – nyt", bullets: ["Kuvaus"] })} />}
    </section>
    );
  };

  const renderEducation = () => {
    if (getSec("education").hidden) return null;
    return (
    <section style={{ marginBottom: sectionGap("education") }}>
      <h2 style={sH2For("education")}>Education</h2>
      {education.map((edu, idx) => (
        <DragItem key={`edu-${idx}`} index={idx} total={education.length} isEditing={isEditing}
          onMoveUp={() => onUpdate?.("education", move(education, idx, idx - 1))}
          onMoveDown={() => onUpdate?.("education", move(education, idx, idx + 1))}
          onDelete={() => onDelete?.("education", idx)}
          style={{ marginBottom: fsS("5mm", "education", "right") }}
        >
          {E({ field: `education.${idx}.degree`, value: edu.degree, tag: "h4", style: { fontSize: fsS("10pt", "education", "right"), fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", lineHeight: lh(1.3) } })}
          {(edu.institution || isEditing) && E({ field: `education.${idx}.institution`, value: edu.institution, tag: "p", placeholder: "Oppilaitos", style: { fontSize: fsS("9pt", "education", "right"), margin: "1mm 0", fontWeight: 400, color: "#444", lineHeight: lh(1.4) } })}
          {(edu.year || isEditing) && E({ field: `education.${idx}.year`, value: edu.year, tag: "p", placeholder: "2020 – 2024", style: { fontSize: fsS("8.5pt", "education", "right"), color: "#666", fontStyle: "italic", margin: "1mm 0", fontWeight: 300, lineHeight: lh(1.3) } })}
          <ul style={{ marginTop: fs("2mm"), paddingLeft: "5mm", fontSize: fsS("8.5pt", "education", "right"), lineHeight: lh(1.6), fontWeight: 300 }}>
            {edu.details.map((d, di) => (
              <DragItem key={`edu-${idx}-d-${di}`} index={di} total={edu.details.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di - 1))}
                onMoveDown={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di + 1))}
                onDelete={() => onDelete?.(`education.${idx}.details`, di)}
                style={{ marginBottom: fs("1mm") }}
              >
                <li style={{ color: "#333", listStyle: "disc" }}>
                  {E({ field: `education.${idx}.details.${di}`, value: d, multiline: true, style: { color: "#333", fontSize: fsS("8.5pt", "education", "right"), lineHeight: lh(1.5) } })}
                </li>
              </DragItem>
            ))}
            {isEditing && (
              <li style={{ color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: .7, listStyle: "none", marginTop: "2mm" }}
                onClick={() => onUpdate?.(`education.${idx}.details.${edu.details.length}`, "Lisätieto")}>
                + Lisää lisätieto…
              </li>
            )}
          </ul>
        </DragItem>
      ))}
      {isEditing && <AddBtn label="+ Lisää koulutus" onClick={() => onUpdate?.(`education.${education.length}`, { degree: "Tutkinto", institution: "Oppilaitos", year: "2020 – 2024", details: [] })} />}
    </section>
    );
  };

  const renderLanguages = () => {
    if (getSec("languages").hidden) return null;
    const html = getAI("languages_section");
    if (!html) return null;
    return (
      <section style={{ marginBottom: sectionGap("languages") }}>
        <h2 style={sH2For("languages")}>Languages</h2>
        <div style={{ fontSize: fsS("9.5pt", "languages", "right"), lineHeight: lh(1.6), color: "#333", fontWeight: 300 }} dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    );
  };

  const renderProjects = () => {
    if (getSec("projects").hidden) return null;
    if (projects.length === 0) return null;
    return (
      <section style={{ marginBottom: sectionGap("projects") }}>
        <h2 style={sH2For("projects")}>Projects</h2>
        {projects.map((proj, idx) => (
          <DragItem key={`proj-${idx}`} index={idx} total={projects.length} isEditing={isEditing}
            onMoveUp={() => onUpdate?.("projects", move(projects, idx, idx - 1))}
            onMoveDown={() => onUpdate?.("projects", move(projects, idx, idx + 1))}
            onDelete={() => onDelete?.("projects", idx)}
            style={{ marginBottom: fsS("5mm", "projects", "right") }}
          >
            <h4 style={{ fontSize: fsS("10.5pt", "projects", "right"), fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", lineHeight: lh(1.3) }}>
              {E({ field: `projects.${idx}.title`, value: proj.title, style: { fontWeight: 600, color: "#1a1a1a", fontSize: fsS("10.5pt", "projects", "right") } })}
            </h4>
            {(proj.description || isEditing) && E({ field: `projects.${idx}.description`, value: proj.description, tag: "p", multiline: true, placeholder: "Kuvaus", style: { fontSize: fsS("9pt", "projects", "right"), color: "#333", lineHeight: lh(1.6), fontWeight: 300, marginBottom: fs("1mm") } })}
            {(proj.link || isEditing) && E({ field: `projects.${idx}.link`, value: proj.link, tag: "p", placeholder: "https://...", style: { fontSize: fsS("8.5pt", "projects", "right"), color: "#2563eb", lineHeight: lh(1.4) } })}
          </DragItem>
        ))}
        {isEditing && <AddBtn label="+ Lisää projekti" onClick={() => onUpdate?.(`projects.${projects.length}`, { title: "Projektin nimi", description: "Lyhyt kuvaus", link: "" })} />}
      </section>
    );
  };

  const sectionMap: Record<string, () => React.ReactNode | null> = {
    experience: renderExperience,
    projects: renderProjects,
    education: renderEducation,
    languages: renderLanguages,
  };

  // ══════════════════════════════════════════════════════════════════
  //  RENDER (ulkoasu / skin)
  // ══════════════════════════════════════════════════════════════════
  const skillsHidden = getSec("skills").hidden;
  return (
    <div style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: "relative", background: "white" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      <style>{EDITABLE_HOVER_CSS}</style>

      {/* LEFT COLUMN */}
      <div style={{ position: "absolute", left: 0, top: 0, width: `${leftMm}mm`, minHeight: "297mm", background: "linear-gradient(180deg,#1a1a1a 0%,#2d2d2d 100%)", color: "white" }}>
        {/* Photo */}
        <div style={{ width: "100%", height: `${bannerMm}mm`, overflow: "hidden" }}>
          {profileImg
            ? <img src={profileImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) brightness(.95)" }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48pt", fontWeight: 300, background: "linear-gradient(135deg,#4a4a4a,#2a2a2a)", letterSpacing: ".05em" }}>
              {name.substring(0, 2).toUpperCase()}
            </div>
          }
        </div>

        {/* Skills position controls (showEditControls mode) */}
        {isEditing && showEditControls && editMode === "content" && (
          <div style={{ position: "fixed", right: "1.5rem", top: "50%", transform: "translateY(-50%)", zIndex: 50, background: "white", padding: "8px", borderRadius: "12px", boxShadow: "0 4px 24px rgba(0,0,0,.15)", display: "flex", flexDirection: "column", gap: "4px" }}>
            <button onClick={() => setSkillsTop(v => Math.max(-20, v - 5))} style={{ padding: "4px 8px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>↑ Up</button>
            <button onClick={() => setSkillsTop(v => Math.min(40, v + 5))} style={{ padding: "4px 8px", background: "#1a1a1a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>↓ Down</button>
          </div>
        )}

        {/* Skills */}
        {!skillsHidden && (skillCategories.length > 0 || isEditing) && (
          <div style={{ padding: "7mm 8mm", position: "relative", top: `${skillsTop}mm` }}>
            <h2 style={{ fontSize: fsS("13pt", "skills", "left"), fontWeight: 600, textTransform: "uppercase", letterSpacing: ".18em", borderBottom: "1.5px solid rgba(255,255,255,.25)", paddingBottom: "3.5mm", marginBottom: "5mm" }}>
              Skills
            </h2>
            {skillCategories.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: fsS("4.5mm", "skills", "left") }}>
                {skillCategories.length > 1 && E({ field: `skills.${ci}.category`, value: cat.category, tag: "h3", style: { fontSize: fsS("9.5pt", "skills", "left"), fontWeight: 600, marginBottom: "2mm", color: "#f0c674", letterSpacing: ".03em" } })}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: fsS("8.5pt", "skills", "left"), lineHeight: lh(1.65), fontWeight: 300 }}>
                  {cat.items.map((skill, si) => (
                    <DragItem key={`sk-${ci}-${si}`} index={si} total={cat.items.length} isEditing={isEditing}
                      onMoveUp={() => { const newCats = skillCategories.map((c, i) => i === ci ? { ...c, items: move(c.items, si, si - 1) } : c); onUpdate?.("skills", newCats); }}
                      onMoveDown={() => { const newCats = skillCategories.map((c, i) => i === ci ? { ...c, items: move(c.items, si, si + 1) } : c); onUpdate?.("skills", newCats); }}
                      onDelete={() => { const newCats = skillCategories.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== si) } : c); onUpdate?.("skills", newCats); }}
                      style={{ marginBottom: fsS("2mm", "skills", "left"), paddingLeft: "4mm", position: "relative" }}
                    >
                      <li style={{ listStyle: "none", color: "rgba(255,255,255,.92)" }}>
                        <span style={{ position: "absolute", left: 0, color: "#f0c674", fontSize: "10pt" }}>•</span>
                        {E({ field: `skills.${ci}.items.${si}`, value: skill, style: { color: "rgba(255,255,255,.92)", fontSize: fsS("8.5pt", "skills", "left") } })}
                      </li>
                    </DragItem>
                  ))}
                  {isEditing && (
                    <li style={{ paddingLeft: "4mm", color: "#f0c674", cursor: "pointer", fontStyle: "italic", opacity: .7, marginBottom: "2mm", listStyle: "none" }}
                      onClick={() => {
                        const newCats = skillCategories.map((c, i) =>
                          i === ci ? { ...c, items: [...c.items, "Uusi taito"] } : c);
                        onUpdate?.("skills", newCats);
                      }}>
                      + Lisää taito…
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT COLUMN */}
      <div style={{ marginLeft: `${leftMm}mm`, width: `${rightMm}mm`, minHeight: "297mm" }}>
        {/* Banner */}
        <div style={{ height: `${bannerMm}mm`, position: "relative", backgroundImage: bgImage ? `url(${bgImage})` : "linear-gradient(135deg,#2c3e50,#34495e)", backgroundSize: "cover", backgroundPosition: "center", color: "white" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,0,0,.5),rgba(0,0,0,.35))" }} />
          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "10mm" }}>
            {E({ field: "name", value: name, tag: "h1", style: { fontSize: "30pt", fontWeight: 700, marginBottom: "2mm", fontFamily: "'Playfair Display',serif", letterSpacing: ".02em", textShadow: "2px 2px 4px rgba(0,0,0,.3)", color: "white" } })}
            {E({ field: "title", value: cvTitle, tag: "p", style: { fontSize: "13pt", marginTop: "2mm", marginBottom: "4mm", fontWeight: 400, letterSpacing: ".08em", textTransform: "uppercase", opacity: .95, color: "white" } })}
            <div style={{ marginTop: "4mm", fontSize: "8.5pt", opacity: .92, display: "flex", gap: "7mm", flexWrap: "wrap", justifyContent: "center", fontWeight: 300 }}>
              {(props.data?.email || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  {E({ field: "email", value: props.data.email || "", placeholder: "email@example.com", style: { color: "white", fontSize: "8.5pt" } })}
                </span>
              )}
              {(props.data?.phone || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  {E({ field: "phone", value: props.data.phone || "", placeholder: "+358 40 123 4567", style: { color: "white", fontSize: "8.5pt" } })}
                </span>
              )}
              {(props.data?.location || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  {E({ field: "location", value: props.data.location || "", placeholder: "Helsinki", style: { color: "white", fontSize: "8.5pt" } })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div style={{ padding: "9mm 10mm", fontSize: fs("9.5pt"), lineHeight: lh(1.55), fontWeight: 300 }}>
          {sectionOrder.map((id, si) => {
            const render = sectionMap[id]; if (!render) return null;
            const node = render(); if (!node) return null;
            return (
              <SectionWrap key={id} label={id} index={si} total={sectionOrder.length} isEditing={isEditing}
                onMoveUp={() => moveSec(si, -1)}
                onMoveDown={() => moveSec(si, 1)}
              >
                {node}
              </SectionWrap>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCVTemplate;