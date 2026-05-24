"use client";
// components/cv/CVSimpleTemplate.tsx
// ════════════════════════════════════════════════════════════════════
//  SIMPLE CV — TIE B SKIN
//  Ohut ulkoasu moottorin (useCVEngine) päällä.
//  Säilyttää nykyisen indigo/violetti-ilmeen täsmälleen.
//  Uutta vs. vanha: projektit, fontScale/lineScale/sectionScales,
//  kursori-stabiili InlineEditor, headerin korkeuden säätö,
//  monisivuvalmius (break-inside: avoid).
// ════════════════════════════════════════════════════════════════════

import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";
import { useCVEngine } from "@/lib/cv/engine/useCVEngine";
import {
  InlineEditor, AddBtn, EDITABLE_HOVER_CSS,
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

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = (props) => {
  const { isEditing, onUpdate, onDelete } = props;

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
    bannerMm,
    profileImg, bgImage, getAI,
    skillCategories, workExperience, education, projects, name, cvTitle,
  } = eng;

  // Headerin korkeus: layout.bannerHeightMm (oletus 70mm Simple-tyylille)
  const headerMm = (props.layout?.bannerHeightMm ?? (props.data as any)?.layout?.bannerHeightMm ?? 70);

  // E = InlineEditor jolla isEditing + onCommit valmiiksi sidottu.
  // Simple käyttää sinistä aksenttia editointikehykseen (oranssin sijaan).
  const E = (p: Omit<InlineEditorProps, "isEditing" | "onCommit">) => (
    <InlineEditor {...p} isEditing={isEditing} onCommit={commit} accentColor="rgba(59,130,246" />
  );

  // Osio-otsikko (sininen, harvennettu — kuten alkuperäinen)
  const H2: React.FC<{ children: React.ReactNode; sectionId: string }> = ({ children, sectionId }) => (
    <h2 style={{
      color: "#2563eb", fontSize: fsS("12px", sectionId, "right"), fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: fs("18px"),
      borderBottom: "1px solid #e5e7eb", paddingBottom: fs("8px"),
    }}>{children}</h2>
  );

  // Pieni poistonappi (säilyttää alkuperäisen tyylin)
  const Del: React.FC<{ onClick: () => void; title?: string }> = ({ onClick, title }) =>
    !isEditing ? null : (
      <button onClick={e => { e.stopPropagation(); onClick(); }} title={title || "Poista"}
        style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "50%", width: "18px", height: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "10px", color: "#ef4444", flexShrink: 0, marginLeft: "4px", padding: 0 }}>
        ✕
      </button>
    );

  const personalDesc = getAI("personal_description");
  const langHtml = getAI("languages_section");
  const avoidBreak: React.CSSProperties = { breakInside: "avoid", pageBreakInside: "avoid" };

  return (
    <div
      className="cv-paper bg-white mx-auto relative overflow-visible shadow-2xl"
      style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Inter','Helvetica',sans-serif", color: "#1a202c" }}
    >
      <style>{`
        ${EDITABLE_HOVER_CSS}
        .cv-paper section { break-inside: avoid; page-break-inside: avoid; }
        .cv-paper .cv-item { break-inside: avoid; page-break-inside: avoid; }
      `}</style>

      {/* 1. HEADER + BACKGROUND */}
      <div className="relative bg-indigo-900" style={{ height: `${headerMm}mm` }}>
        {bgImage
          ? <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt="" onError={e => { e.currentTarget.style.display = "none"; }} />
          : <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,#1e40af 0%,#7e22ce 100%)" }} />}
        <div className="absolute inset-0 bg-black/20" />

        <div className="absolute bottom-10 left-12 z-10" style={{ color: "white" }}>
          {E({ field: "name", value: name, tag: "h1", style: { fontSize: fs("42px"), fontWeight: 800, letterSpacing: "-0.02em", textShadow: "2px 2px 4px rgba(0,0,0,0.3)", color: "white", display: "block", marginBottom: "8px" } })}
          {E({ field: "title", value: cvTitle, tag: "p", style: { fontSize: fs("20px"), opacity: 0.95, fontWeight: 300, color: "white", display: "block" } })}
        </div>

        <div className="absolute -bottom-10 right-12 z-20 rounded-full border-[6px] border-white overflow-hidden shadow-xl bg-gray-100"
          style={{ width: "50mm", height: "50mm" }}>
          {profileImg
            ? <img src={profileImg} className="w-full h-full object-cover" alt="Profiili" onError={e => { e.currentTarget.style.display = "none"; }} />
            : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-200" style={{ fontSize: "36px" }}>{name.substring(0, 2).toUpperCase()}</div>}
        </div>
      </div>

      {/* 2. CONTACT BAR */}
      <div className="bg-[#1a202c] text-white py-4 px-12 flex items-center gap-8 flex-wrap" style={{ fontSize: fs("14px") }}>
        {(props.data?.phone || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Puh:</span>
            {E({ field: "phone", value: props.data?.phone || "", placeholder: "+358...", style: { color: "white" } })}
          </div>
        )}
        {(props.data?.email || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Email:</span>
            {E({ field: "email", value: props.data?.email || "", placeholder: "email@example.com", style: { color: "white" } })}
          </div>
        )}
        {(props.data?.location || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 uppercase" style={{ fontSize: fs("12px") }}>Sijainti:</span>
            {E({ field: "location", value: props.data?.location || "", placeholder: "Helsinki", style: { color: "white" } })}
          </div>
        )}
      </div>

      {/* 3. CONTENT */}
      <div className="px-12 py-16 flex flex-col" style={{ gap: fs("40px") }}>

        {/* PROFILE DESCRIPTION */}
        {personalDesc && !getSec("profile").hidden && (
          <section style={avoidBreak}>
            <H2 sectionId="profile">Profiili</H2>
            <p style={{ color: "#374151", lineHeight: lh(1.7), fontSize: fsS("18px", "profile", "right"), fontStyle: "italic", borderLeft: "4px solid #dbeafe", paddingLeft: "24px" }}>
              {personalDesc}
            </p>
          </section>
        )}

        {/* WORK EXPERIENCE */}
        {(workExperience.length > 0 || isEditing) && !getSec("experience").hidden && (
          <section style={{ marginBottom: sectionGap("experience") }}>
            <H2 sectionId="experience">Työkokemus</H2>
            {workExperience.map((exp, idx) => (
              <div key={idx} className="cv-item" style={{ marginBottom: fsS("24px", "experience", "right"), position: "relative", ...avoidBreak }}>
                {isEditing && <div style={{ position: "absolute", top: 0, right: 0 }}><Del onClick={() => onDelete?.("experience", idx)} title="Poista työkokemus" /></div>}
                <h4 style={{ fontWeight: 600, color: "#111827", paddingRight: isEditing ? "24px" : 0, fontSize: fsS("15px", "experience", "right") }}>
                  {E({ field: `experience.${idx}.title`, value: exp.title, style: { fontWeight: 600, fontSize: fsS("15px", "experience", "right") } })}
                  {(exp.company || isEditing) && <> — {E({ field: `experience.${idx}.company`, value: exp.company, style: { fontWeight: 400, color: "#555", fontSize: fsS("15px", "experience", "right") } })}</>}
                </h4>
                {(exp.period || isEditing) && E({ field: `experience.${idx}.period`, value: exp.period, tag: "p", placeholder: "Ajanjakso", style: { fontSize: fsS("13px", "experience", "right"), color: "#666", fontStyle: "italic", marginBottom: "4px" } })}
                <ul className="mt-2 ml-5" style={{ listStyleType: "disc", fontSize: fsS("14px", "experience", "right"), lineHeight: lh(1.6), color: "#374151" }}>
                  {exp.bullets.map((b, bi) => (
                    <li key={bi} style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
                      <span style={{ flex: 1 }}>{E({ field: `experience.${idx}.bullets.${bi}`, value: b, multiline: true, style: { fontSize: fsS("14px", "experience", "right"), lineHeight: lh(1.6) } })}</span>
                      <Del onClick={() => onDelete?.(`experience.${idx}.bullets`, bi)} />
                    </li>
                  ))}
                  {isEditing && <li onClick={() => onUpdate?.(`experience.${idx}.bullets.${exp.bullets.length}`, "Uusi kuvaus")} style={{ color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: 0.7, fontSize: fs("14px"), listStyle: "none" }}>+ Lisää kohta…</li>}
                </ul>
              </div>
            ))}
            {isEditing && <AddBtn label="+ Lisää työkokemus" onClick={() => onUpdate?.(`experience.${workExperience.length}`, { title: "Uusi tehtävä", company: "Yritys", period: "2024 – Nykyinen", bullets: ["Kuvaus tehtävästä"] })} />}
          </section>
        )}

        {/* AI experience fallback */}
        {workExperience.length === 0 && !isEditing && getAI("experience_section") && (
          <section style={avoidBreak}>
            <H2 sectionId="experience">Työkokemus</H2>
            <div style={{ color: "#1f2937", fontSize: fs("14px"), lineHeight: lh(1.6) }} dangerouslySetInnerHTML={{ __html: getAI("experience_section") }} />
          </section>
        )}

        {/* PROJECTS (uusi!) */}
        {(projects.length > 0 || isEditing) && !getSec("projects").hidden && (
          <section style={{ marginBottom: sectionGap("projects") }}>
            <H2 sectionId="projects">Projektit</H2>
            {projects.map((proj, idx) => (
              <div key={idx} className="cv-item" style={{ marginBottom: fsS("18px", "projects", "right"), position: "relative", ...avoidBreak }}>
                {isEditing && <div style={{ position: "absolute", top: 0, right: 0 }}><Del onClick={() => onDelete?.("projects", idx)} title="Poista projekti" /></div>}
                <h4 style={{ fontWeight: 600, color: "#111827", paddingRight: isEditing ? "24px" : 0, fontSize: fsS("15px", "projects", "right") }}>
                  {E({ field: `projects.${idx}.title`, value: proj.title, style: { fontWeight: 600, fontSize: fsS("15px", "projects", "right") } })}
                </h4>
                {(proj.description || isEditing) && E({ field: `projects.${idx}.description`, value: proj.description, tag: "p", multiline: true, placeholder: "Kuvaus", style: { fontSize: fsS("14px", "projects", "right"), color: "#374151", lineHeight: lh(1.6), marginTop: "2px" } })}
                {(proj.link || isEditing) && E({ field: `projects.${idx}.link`, value: proj.link, tag: "p", placeholder: "https://...", style: { fontSize: fsS("13px", "projects", "right"), color: "#2563eb", marginTop: "2px" } })}
              </div>
            ))}
            {isEditing && <AddBtn label="+ Lisää projekti" onClick={() => onUpdate?.(`projects.${projects.length}`, { title: "Projektin nimi", description: "Lyhyt kuvaus", link: "" })} />}
          </section>
        )}

        {/* EDUCATION + SKILLS rinnakkain */}
        <div className="grid grid-cols-2" style={{ gap: fs("48px") }}>
          {/* EDUCATION */}
          {(education.length > 0 || isEditing) && !getSec("education").hidden ? (
            <section style={avoidBreak}>
              <H2 sectionId="education">Koulutus</H2>
              {education.map((edu, idx) => (
                <div key={idx} className="cv-item" style={{ marginBottom: fsS("16px", "education", "right"), position: "relative", ...avoidBreak }}>
                  {isEditing && <div style={{ position: "absolute", top: 0, right: 0 }}><Del onClick={() => onDelete?.("education", idx)} title="Poista koulutus" /></div>}
                  {E({ field: `education.${idx}.degree`, value: edu.degree, tag: "h4", style: { fontWeight: 600, fontSize: fsS("14px", "education", "right"), paddingRight: isEditing ? "24px" : 0 } })}
                  {(edu.institution || isEditing) && E({ field: `education.${idx}.institution`, value: edu.institution, tag: "p", placeholder: "Oppilaitos", style: { fontSize: fsS("13px", "education", "right"), color: "#444" } })}
                  {(edu.year || isEditing) && E({ field: `education.${idx}.year`, value: edu.year, tag: "p", placeholder: "2020 – 2024", style: { fontSize: fsS("12px", "education", "right"), color: "#666", fontStyle: "italic" } })}
                  {edu.details.length > 0 && (
                    <ul className="mt-1 ml-4" style={{ listStyleType: "disc", fontSize: fsS("13px", "education", "right"), color: "#4b5563" }}>
                      {edu.details.map((d, di) => (
                        <li key={di} style={{ display: "flex", alignItems: "flex-start" }}>
                          <span style={{ flex: 1 }}>{E({ field: `education.${idx}.details.${di}`, value: d, style: { fontSize: fsS("13px", "education", "right") } })}</span>
                          <Del onClick={() => onDelete?.(`education.${idx}.details`, di)} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {isEditing && <AddBtn label="+ Lisää koulutus" onClick={() => onUpdate?.(`education.${education.length}`, { degree: "Uusi tutkinto", institution: "Oppilaitos", year: "2020 – 2024", details: [] })} />}
            </section>
          ) : (!isEditing && getAI("education_section") && (
            <section style={avoidBreak}>
              <H2 sectionId="education">Koulutus</H2>
              <div style={{ color: "#1f2937", fontSize: fs("13px") }} dangerouslySetInnerHTML={{ __html: getAI("education_section") }} />
            </section>
          ))}

          {/* SKILLS */}
          {(skillCategories.length > 0 || isEditing) && !getSec("skills").hidden ? (
            <section style={avoidBreak}>
              <H2 sectionId="skills">Osaaminen</H2>
              {skillCategories.map((cat, ci) => (
                <div key={ci} style={{ marginBottom: fs("8px") }}>
                  {skillCategories.length > 1 && E({ field: `skills.${ci}.category`, value: cat.category, tag: "h4", style: { fontSize: fsS("13px", "skills", "right"), fontWeight: 600, color: "#2563eb", marginBottom: "4px" } })}
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {cat.items.map((skill, si) => (
                      <li key={si} style={{ display: "flex", alignItems: "center", marginBottom: "6px", fontSize: fsS("14px", "skills", "right") }}>
                        <span style={{ color: "#3b82f6", marginRight: "8px" }}>•</span>
                        <span style={{ flex: 1 }}>{E({ field: `skills.${ci}.items.${si}`, value: skill, style: { fontSize: fsS("14px", "skills", "right") } })}</span>
                        <Del onClick={() => {
                          const newCats = skillCategories.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== si) } : c);
                          onUpdate?.("skills", newCats);
                        }} title="Poista taito" />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {isEditing && <AddBtn label="+ Lisää taito" onClick={() => {
                const first = skillCategories[0];
                if (first) {
                  const newCats = skillCategories.map((c, i) => i === 0 ? { ...c, items: [...c.items, "Uusi taito"] } : c);
                  onUpdate?.("skills", newCats);
                } else {
                  onUpdate?.("skills", [{ category: "Skills", items: ["Uusi taito"] }]);
                }
              }} />}
            </section>
          ) : (!isEditing && getAI("skills_section") && (
            <section style={avoidBreak}>
              <H2 sectionId="skills">Osaaminen</H2>
              <div style={{ color: "#1f2937", fontSize: fs("13px") }} dangerouslySetInnerHTML={{ __html: getAI("skills_section") }} />
            </section>
          ))}
        </div>

        {/* LANGUAGES */}
        {langHtml && !getSec("languages").hidden && (
          <section style={avoidBreak}>
            <H2 sectionId="languages">Kielet</H2>
            <div style={{ color: "#1f2937", fontSize: fs("14px") }} dangerouslySetInnerHTML={{ __html: langHtml }} />
          </section>
        )}

        {/* SIGNATURE */}
        <div className="mt-8 border-t pt-8" style={avoidBreak}>
          <p style={{ fontSize: fs("36px"), color: "#1d4ed8", opacity: 0.8, fontFamily: "'Brush Script MT',cursive" }}>{name}</p>
        </div>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;