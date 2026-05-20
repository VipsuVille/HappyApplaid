"use client";
import React, {
  useState, useRef, useCallback, useEffect, useMemo
} from "react";
import { UserFormData, AIData, EditMode } from "@/types";

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
}

// ══════════════════════════════════════════════════════════════════════
//  INLINE EDITOR  — uncontrolled so cursor never jumps
//
//  The key insight: a controlled <input value={state}> re-renders every
//  keystroke → React diffs → cursor position resets.
//  An uncontrolled <input defaultValue={…}> only reads the initial value
//  once; afterwards the DOM owns the value and cursor is stable.
//  We flush to parent state only on blur / Enter.
// ══════════════════════════════════════════════════════════════════════
interface InlineEditorProps {
  field: string;
  value: string;
  multiline?: boolean;
  placeholder?: string;
  isEditing: boolean;
  style?: React.CSSProperties;
  className?: string;
  tag?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "div";
  onCommit: (field: string, value: string) => void;
}

const InlineEditor = React.memo(function InlineEditor({
  field, value, multiline = false, placeholder,
  isEditing, style, className, tag: Tag = "span", onCommit,
}: InlineEditorProps) {
  const [active, setActive] = useState(false);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const savedValue = useRef(value);

  // when value prop changes while NOT active, update our saved ref
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
    background: "rgba(249,115,22,0.07)",
    border: "2px solid rgba(249,115,22,0.55)",
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
      className={`${className ?? ""} ${isEditing ? "editable-hover" : ""}`}
    >
      {value || (isEditing ? (placeholder ?? "") : "")}
    </Tag>
  );
});

// ══════════════════════════════════════════════════════════════════════
//  DRAG ITEM  — ▲ ▼ reorder + ✕ delete for any list item
// ══════════════════════════════════════════════════════════════════════
interface DragItemProps {
  index: number; total: number; isEditing: boolean;
  onMoveUp: () => void; onMoveDown: () => void; onDelete: () => void;
  children: React.ReactNode; style?: React.CSSProperties;
}
const DragItem: React.FC<DragItemProps> = ({
  index, total, isEditing, onMoveUp, onMoveDown, onDelete, children, style,
}) => {
  if (!isEditing) return <div style={style}>{children}</div>;
  return (
    <div style={{ ...style, position: "relative", paddingLeft: "18px", paddingRight: "20px" }}>
      <div style={{ position: "absolute", left: "0px", top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: "1px", zIndex: 15 }}>
        <button onClick={onMoveUp} disabled={index === 0} title="Ylös" style={arrowStyle(index === 0)}>▲</button>
        <button onClick={onMoveDown} disabled={index === total - 1} title="Alas" style={arrowStyle(index === total - 1)}>▼</button>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Poista"
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

// ══════════════════════════════════════════════════════════════════════
//  SECTION WRAP  — ↑ ↓ for whole sections
// ══════════════════════════════════════════════════════════════════════
interface SectionWrapProps {
  label: string; index: number; total: number; isEditing: boolean;
  onMoveUp: () => void; onMoveDown: () => void; children: React.ReactNode;
}
const SectionWrap: React.FC<SectionWrapProps> = ({
  label, index, total, isEditing, onMoveUp, onMoveDown, children,
}) => {
  if (!isEditing) return <>{children}</>;
  return (
    <div style={{ position: "relative", marginBottom: "2px" }}>
      <div style={{ position: "absolute", top: "0px", right: "0px", display: "flex", alignItems: "center", gap: "3px", zIndex: 20 }}>
        <span style={{ fontSize: "7.5px", color: "rgba(249,115,22,.65)", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>{label}</span>
        <button onClick={onMoveUp} disabled={index === 0} title="Siirrä osio ylös" style={sectionArrowStyle(index === 0)}>↑</button>
        <button onClick={onMoveDown} disabled={index === total - 1} title="Siirrä osio alas" style={sectionArrowStyle(index === total - 1)}>↓</button>
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


const AddBtn: React.FC<{ label: string; onClick: () => void }> = ({ label, onClick }) => (
  <div onClick={onClick}
    style={{ padding: "3mm", border: "2px dashed #f97316", borderRadius: "4px", textAlign: "center", color: "#f97316", cursor: "pointer", fontSize: "9pt", marginTop: "3mm" }}
    onMouseEnter={e => (e.currentTarget.style.background = "rgba(249,115,22,.05)")}
    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
  >{label}</div>
);

// ══════════════════════════════════════════════════════════════════════
//  MAIN TEMPLATE
// ══════════════════════════════════════════════════════════════════════
const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data, aiData, isEditing, showEditControls, editMode,
  onContentChange, onUpdate, onDelete, profileImage, backgroundImage,
  fontScale: fontScaleProp, lineScale: lineScaleProp,
}) => {
  const [sectionOrder, setSectionOrder] = useState(["experience", "education", "languages"]);
  const [skillsTop, setSkillsTop] = useState(0);

  // Use prop values when provided (controlled from parent), otherwise internal defaults
   const fontScale = fontScaleProp ?? (data as any)?.fontScale ?? 1.0;
  const lineScale = lineScaleProp ?? (data as any)?.lineScale ?? 1.0;

  // Scale a pt/mm value by fontScale
  const fs = (base: string): string => {
    const match = base.match(/^([\d.]+)(pt|mm|px|em|rem)$/);
    if (!match) return base;
    return `${(parseFloat(match[1]) * fontScale).toFixed(2)}${match[2]}`;
  };
  // Scale a unitless line-height number
  const lh = (base: number): number => parseFloat((base * lineScale).toFixed(3));

  // stable commit — only recreated if onUpdate reference changes
  const handleCommit = useCallback((field: string, val: string) => {
    onUpdate?.(field, val);
  }, [onUpdate]);

  // move helper (pure)
  const move = <T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr;
    const n = [...arr]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n;
  };

  const moveSec = (i: number, dir: -1 | 1) =>
    setSectionOrder(prev => move(prev, i, i + dir));

  // ── Image helpers ────────────────────────────────────────────────
  const isValidImg = (s?: string | null) => {
    if (!s) return false;
    const t = s.trim();
    return t && !t.includes("cv_files/default") && (t.startsWith("http") || t.startsWith("data:image"));
  };
  const profileImg = useMemo(() => {
    for (const s of [profileImage, (data as any)?.profile_image, data?.profileImage, (data as any)?.photo, aiData?.profile_image])
      if (isValidImg(s)) return s!.trim();
    return null;
  }, [profileImage, data, aiData]);
  const bgImage = useMemo(() => {
    for (const s of [backgroundImage, (data as any)?.background_image, data?.backgroundImage, aiData?.background_image, aiData?.background_image_url])
      if (isValidImg(s)) return s!.trim();
    return null;
  }, [backgroundImage, data, aiData]);

  // ── AI content ───────────────────────────────────────────────────
  const getAI = useCallback((field: keyof AIData): string => {
    let c: any = aiData?.[field];
    if (!c && aiData?.html) c = (aiData.html as any)[field];
    if (typeof c === "string" && c.trim().length > 20 && !c.toLowerCase().includes("error generating")) return c;
    return "";
  }, [aiData]);

  // ── Parse skills ─────────────────────────────────────────────────
const skillCategories = useMemo((): { category: string; items: string[] }[] => {
  if (data?.skills && Array.isArray(data.skills) && data.skills.length > 0) {
    // Stringitaulukko → yksi kategoria
    if (typeof data.skills[0] === "string") {
      return [{ category: "Skills", items: data.skills as string[] }];
    }
    // Objektitaulukko: voi olla joko {category, items} TAI {name, proficiency...}
    const first: any = data.skills[0];
    // Jos jo oikeassa kategoria-muodossa
    if (first && Array.isArray(first.items)) {
      return (data.skills as any[]).map((c: any) => ({
        category: c.category || "Skills",
        items: Array.isArray(c.items) ? c.items : [],
      }));
    }
    // Muuten: profiili-skill-objektit ({name, proficiency, ...}) → yksi kategoria
    const items = (data.skills as any[])
      .map((s: any) => (typeof s === "string" ? s : s?.name || s?.skill || s?.title || ""))
      .filter(Boolean);
    return items.length ? [{ category: "Skills", items }] : [];
  }
    const html = getAI("skills_section");
    if (!html) {
      const t = (data?.skills as any) ?? "";
      if (typeof t !== "string") return [];
      return [{ category: "Skills", items: t.split(",").map((s: string) => s.trim()).filter(Boolean) }];
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const cats: { category: string; items: string[] }[] = [];
    doc.querySelectorAll("h3,h4,strong").forEach(h => {
      const cat = h.textContent?.trim() || "Skills"; const items: string[] = [];
      let nx = h.nextElementSibling;
      while (nx?.tagName === "UL") { nx.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) items.push(t); }); nx = nx.nextElementSibling; }
      if (items.length) cats.push({ category: cat, items });
    });
    if (!cats.length) { const lines = html.replace(/<[^>]+>/g, "").split("\n").filter(l => l.trim()); if (lines.length) cats.push({ category: "Skills", items: lines }); }
    return cats;
  }, [data?.skills, getAI]);

  // ── Parse experience ─────────────────────────────────────────────
  const workExperience = useMemo(() => {
    if (data?.experience && Array.isArray(data.experience) && data.experience.length > 0)
      return data.experience.map((e: any) => ({
        title: e.title || e.position || "Position", company: e.company || "Company", period: e.period || e.duration || "",
        bullets: Array.isArray(e.bullets) ? e.bullets : Array.isArray(e.achievements) ? e.achievements : [e.description].filter(Boolean),
      }));
    const html = getAI("experience_section");
    if (!html) {
      try {
        const raw = data?.work_experience || (data as any)?.workExperience;
        if (!raw) return [];
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(p) ? p.map((j: any) => ({ title: j.position || "Position", company: j.company || "Company", period: j.duration || "", bullets: [j.description, j.biggestAchievement, j.whatYouLearned, j.howYourStrengthShowed].filter(Boolean).map((t: string) => t.trim()) })) : [];
      } catch { return []; }
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const jobs: any[] = [];
    doc.querySelectorAll(".job, .work-item, .experience-item").forEach(jobDiv => {
      const h4 = jobDiv.querySelector("h4");
      const titleText = h4?.textContent?.trim() || "";
      const [title, company] = titleText.split(" - ").map((s: string) => s.trim());
      const dateEl = jobDiv.querySelector('.date, p[class*="date"]');
      const period = dateEl?.textContent?.trim() || "";
      const bullets: string[] = [];
      jobDiv.querySelectorAll("ul li").forEach(li => { const t = li.textContent?.trim(); if (t) bullets.push(t); });
      if (title || company) jobs.push({ title: title || "Position", company: company || "Company", period, bullets });
    });
    if (jobs.length === 0) {
      doc.querySelectorAll("h4").forEach(h4 => {
        const titleText = h4.textContent?.trim() || "";
        const [title, company] = titleText.split(" - ").map((s: string) => s.trim());
        let period = "";
        let nx: Element | null = h4.nextElementSibling;
        if (nx !== null && (nx.tagName === "P" || (nx as HTMLElement).classList?.contains("date"))) {
          period = nx.textContent?.trim() || "";
          nx = nx.nextElementSibling;
        }
        const bullets: string[] = [];
        if (nx !== null && nx.tagName === "UL") {
          nx.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) bullets.push(t); });
        }
        if (title || company) jobs.push({ title: title || "Position", company: company || "Company", period, bullets });
      });
    }
    return jobs;
  }, [data?.experience, (data as any)?.work_experience, getAI]);

  // ── Parse education ──────────────────────────────────────────────
  const education = useMemo(() => {
    if (data?.education && Array.isArray(data.education) && data.education.length > 0)
      return data.education.map((e: any) => ({
        degree: e.degree || "Degree", institution: e.institution || e.school || "Institution",
        year: e.year || e.period || "", details: Array.isArray(e.details) ? e.details : [e.description].filter(Boolean),
      }));
    const html = getAI("education_section");
    if (!html) {
      try {
        const raw = data?.education || (data as any)?.education_history;
        if (!raw) return [];
        const p = typeof raw === "string" ? JSON.parse(raw) : raw;
        return Array.isArray(p) ? p.map((e: any) => ({ degree: e.degree || "Degree", institution: e.school || e.institution || "Institution", year: e.year || "", details: [e.whyThisField, e.specialization, e.proudestMoment, e.favoriteSubjects].filter(Boolean).map((t: string) => t.trim()) })) : [];
      } catch { return []; }
    }
    const doc = new DOMParser().parseFromString(html, "text/html");
    const list: any[] = [];
    const eduDivs = doc.querySelectorAll(".education, .education-item");
    if (eduDivs.length > 0) {
      eduDivs.forEach(eduDiv => {
        const h4 = eduDiv.querySelector("h4");
        const degree = h4?.textContent?.trim() || "";
        let institution = "", year = "";
        eduDiv.querySelectorAll("p").forEach((p, idx) => {
          const text = p.textContent?.trim() || "";
          if (idx === 0) institution = text;
          if (p.classList.contains("date") || text.match(/\d{4}/)) year = text;
        });
        const details: string[] = [];
        eduDiv.querySelectorAll("ul li").forEach(li => { const t = li.textContent?.trim(); if (t) details.push(t); });
        if (degree) list.push({ degree, institution, year, details });
      });
    } else {
      doc.querySelectorAll("h4").forEach(h4 => {
        const degree = h4.textContent?.trim() || "";
        let institution = "", year = "";
        const details: string[] = [];
        let nx: Element | null = h4.nextElementSibling;
        if (nx !== null && nx.tagName === "P") {
          institution = nx.textContent?.trim() || "";
          nx = nx.nextElementSibling;
        }
        if (nx !== null && nx.tagName === "P" && nx.textContent?.match(/\d{4}/)) {
          year = nx.textContent.trim();
          nx = nx.nextElementSibling;
        }
        if (nx !== null && nx.tagName === "UL") {
          nx.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) details.push(t); });
        }
        if (degree) list.push({ degree, institution, year, details });
      });
    }
    return list;
  }, [data?.education, getAI]);

  const name = data?.name || "Name";
  const cvTitle = data?.title || "Professional Title";

  // ── E shorthand ──────────────────────────────────────────────────
  // InlineEditor with isEditing + onCommit already bound
  // Using a render function (not a component) so it doesn't create new
  // component type on each render → no unmount/remount
  const E = (props: Omit<InlineEditorProps, "isEditing" | "onCommit">) => (
    <InlineEditor {...props} isEditing={isEditing} onCommit={handleCommit} />
  );

  // ── Section heading style (uses fs() for scaling) ───────────────
  const sH2: React.CSSProperties = {
    fontSize: fs("11.5pt"), fontWeight: 600, textTransform: "uppercase",
    borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm", marginBottom: "4mm",
    letterSpacing: ".12em", fontFamily: "'Inter',sans-serif", color: "#1a1a1a",
  };

  // ══════════════════════════════════════════════════════════════════
  //  SECTION RENDERERS
  // ══════════════════════════════════════════════════════════════════
  const renderExperience = () => (
    <section style={{ marginBottom: fs("7mm") }}>
      <h2 style={sH2}>Work Experience</h2>
      {workExperience.map((job: any, idx: number) => (
        <DragItem key={`exp-${idx}`} index={idx} total={workExperience.length} isEditing={isEditing}
          onMoveUp={() => onUpdate?.("experience", move(workExperience, idx, idx - 1))}
          onMoveDown={() => onUpdate?.("experience", move(workExperience, idx, idx + 1))}
          onDelete={() => onDelete?.("experience", idx)}
          style={{ marginBottom: fs("5.5mm") }}
        >
          <h4 style={{ fontSize: fs("10.5pt"), fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", lineHeight: lh(1.3) }}>
            {E({ field: `experience.${idx}.title`, value: job.title, style: { fontWeight: 600, color: "#1a1a1a", fontSize: fs("10.5pt") } })}
            <span style={{ fontWeight: 400, color: "#555" }}> — </span>
            {E({ field: `experience.${idx}.company`, value: job.company, style: { fontWeight: 600, color: "#1a1a1a", fontSize: fs("10.5pt") } })}
          </h4>
          {(job.period || isEditing) && E({ field: `experience.${idx}.period`, value: job.period, tag: "p", placeholder: "Ajanjakso", style: { fontSize: fs("8.5pt"), color: "#666", fontStyle: "italic", marginBottom: fs("2mm"), fontWeight: 300, lineHeight: lh(1.4) } })}
          <ul style={{ marginTop: fs("2mm"), paddingLeft: "5mm", fontSize: fs("9pt"), lineHeight: lh(1.6), fontWeight: 300 }}>
            {job.bullets.map((b: string, bi: number) => (
              <DragItem key={`exp-${idx}-b-${bi}`} index={bi} total={job.bullets.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi - 1))}
                onMoveDown={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi + 1))}
                onDelete={() => onDelete?.(`experience.${idx}.bullets`, bi)}
                style={{ marginBottom: fs("1.5mm") }}
              >
                <li style={{ color: "#333", listStyle: "disc" }}>
                  {E({ field: `experience.${idx}.bullets.${bi}`, value: b, multiline: true, style: { color: "#333", fontSize: fs("9pt"), lineHeight: lh(1.6) } })}
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

  const renderEducation = () => (
    <section style={{ marginBottom: fs("7mm") }}>
      <h2 style={sH2}>Education</h2>
      {education.map((edu: any, idx: number) => (
        <DragItem key={`edu-${idx}`} index={idx} total={education.length} isEditing={isEditing}
          onMoveUp={() => onUpdate?.("education", move(education, idx, idx - 1))}
          onMoveDown={() => onUpdate?.("education", move(education, idx, idx + 1))}
          onDelete={() => onDelete?.("education", idx)}
          style={{ marginBottom: fs("5mm") }}
        >
          {E({ field: `education.${idx}.degree`, value: edu.degree, tag: "h4", style: { fontSize: fs("10pt"), fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", lineHeight: lh(1.3) } })}
          {(edu.institution || isEditing) && E({ field: `education.${idx}.institution`, value: edu.institution, tag: "p", placeholder: "Oppilaitos", style: { fontSize: fs("9pt"), margin: "1mm 0", fontWeight: 400, color: "#444", lineHeight: lh(1.4) } })}
          {(edu.year || isEditing) && E({ field: `education.${idx}.year`, value: edu.year, tag: "p", placeholder: "2020 – 2024", style: { fontSize: fs("8.5pt"), color: "#666", fontStyle: "italic", margin: "1mm 0", fontWeight: 300, lineHeight: lh(1.3) } })}
          <ul style={{ marginTop: fs("2mm"), paddingLeft: "5mm", fontSize: fs("8.5pt"), lineHeight: lh(1.6), fontWeight: 300 }}>
            {edu.details.map((d: string, di: number) => (
              <DragItem key={`edu-${idx}-d-${di}`} index={di} total={edu.details.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di - 1))}
                onMoveDown={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di + 1))}
                onDelete={() => onDelete?.(`education.${idx}.details`, di)}
                style={{ marginBottom: fs("1mm") }}
              >
                <li style={{ color: "#333", listStyle: "disc" }}>
                  {E({ field: `education.${idx}.details.${di}`, value: d, multiline: true, style: { color: "#333", fontSize: fs("8.5pt"), lineHeight: lh(1.5) } })}
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

  const renderLanguages = () => {
    const html = getAI("languages_section");
    if (!html) return null;
    return (
      <section style={{ marginBottom: fs("7mm") }}>
        <h2 style={sH2}>Languages</h2>
        <div style={{ fontSize: fs("9.5pt"), lineHeight: lh(1.6), color: "#333", fontWeight: 300 }} dangerouslySetInnerHTML={{ __html: html }} />
      </section>
    );
  };

  const sectionMap: Record<string, () => React.ReactNode | null> = {
    experience: renderExperience,
    education: renderEducation,
    languages: renderLanguages,
  };

  // ══════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════
  return (
    <div style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", position: "relative", background: "white" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      <style>{`.editable-hover:hover { outline: 2px dashed rgba(249,115,22,.45) !important; background: rgba(249,115,22,.04) !important; border-radius: 3px !important; }`}</style>

      {/* LEFT COLUMN */}
      <div style={{ position: "absolute", left: 0, top: 0, width: "70mm", minHeight: "297mm", background: "linear-gradient(180deg,#1a1a1a 0%,#2d2d2d 100%)", color: "white" }}>
        {/* Photo */}
        <div style={{ width: "100%", height: "85mm", overflow: "hidden" }}>
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
        {(skillCategories.length > 0 || isEditing) && (
          <div style={{ padding: "7mm 8mm", position: "relative", top: `${skillsTop}mm` }}>
            <h2 style={{ fontSize: fs("13pt"), fontWeight: 600, textTransform: "uppercase", letterSpacing: ".18em", borderBottom: "1.5px solid rgba(255,255,255,.25)", paddingBottom: "3.5mm", marginBottom: "5mm" }}>
              Skills
            </h2>
            {skillCategories.map((cat: any, ci: number) => (
              <div key={ci} style={{ marginBottom: fs("4.5mm") }}>
                {skillCategories.length > 1 && E({ field: `skills.${ci}.category`, value: cat.category, tag: "h3", style: { fontSize: fs("9.5pt"), fontWeight: 600, marginBottom: "2mm", color: "#f0c674", letterSpacing: ".03em" } })}
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: fs("8.5pt"), lineHeight: lh(1.65), fontWeight: 300 }}>
                  {cat.items.map((skill: string, si: number) => (
                    <DragItem key={`sk-${ci}-${si}`} index={si} total={cat.items.length} isEditing={isEditing}
                      onMoveUp={() => { const newCats = skillCategories.map((c: any, i: number) => i === ci ? { ...c, items: move(c.items, si, si - 1) } : c); onUpdate?.("skills", newCats); }}
                      onMoveDown={() => { const newCats = skillCategories.map((c: any, i: number) => i === ci ? { ...c, items: move(c.items, si, si + 1) } : c); onUpdate?.("skills", newCats); }}
                      onDelete={() => { const newCats = skillCategories.map((c: any, i: number) => i === ci ? { ...c, items: c.items.filter((_: any, j: number) => j !== si) } : c); onUpdate?.("skills", newCats); }}
                      style={{ marginBottom: fs("2mm"), paddingLeft: "4mm", position: "relative" }}
                    >
                      <li style={{ listStyle: "none", color: "rgba(255,255,255,.92)" }}>
                        <span style={{ position: "absolute", left: 0, color: "#f0c674", fontSize: "10pt" }}>•</span>
                        {E({ field: `skills.${ci}.items.${si}`, value: skill, style: { color: "rgba(255,255,255,.92)", fontSize: fs("8.5pt") } })}
                      </li>
                    </DragItem>
                  ))}
                  {isEditing && (
                    <li style={{ paddingLeft: "4mm", color: "#f0c674", cursor: "pointer", fontStyle: "italic", opacity: .7, marginBottom: "2mm", listStyle: "none" }}
                      onClick={() => {
                        const newCats = skillCategories.map((c: any, i: number) =>
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
      <div style={{ marginLeft: "70mm", width: "140mm", minHeight: "297mm" }}>
        {/* Banner */}
        <div style={{ height: "85mm", position: "relative", backgroundImage: bgImage ? `url(${bgImage})` : "linear-gradient(135deg,#2c3e50,#34495e)", backgroundSize: "cover", backgroundPosition: "center", color: "white" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,rgba(0,0,0,.5),rgba(0,0,0,.35))" }} />
          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "10mm" }}>
            {E({ field: "name", value: name, tag: "h1", style: { fontSize: "30pt", fontWeight: 700, marginBottom: "2mm", fontFamily: "'Playfair Display',serif", letterSpacing: ".02em", textShadow: "2px 2px 4px rgba(0,0,0,.3)", color: "white" } })}
            {E({ field: "title", value: cvTitle, tag: "p", style: { fontSize: "13pt", marginTop: "2mm", marginBottom: "4mm", fontWeight: 400, letterSpacing: ".08em", textTransform: "uppercase", opacity: .95, color: "white" } })}
            <div style={{ marginTop: "4mm", fontSize: "8.5pt", opacity: .92, display: "flex", gap: "7mm", flexWrap: "wrap", justifyContent: "center", fontWeight: 300 }}>
              {(data?.email || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  {E({ field: "email", value: data.email || "", placeholder: "email@example.com", style: { color: "white", fontSize: "8.5pt" } })}
                </span>
              )}
              {(data?.phone || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  {E({ field: "phone", value: data.phone || "", placeholder: "+358 40 123 4567", style: { color: "white", fontSize: "8.5pt" } })}
                </span>
              )}
              {(data?.location || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  {E({ field: "location", value: data.location || "", placeholder: "Helsinki", style: { color: "white", fontSize: "8.5pt" } })}
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