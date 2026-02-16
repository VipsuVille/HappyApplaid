"use client";
import React, { useState, useRef, useCallback, useEffect } from "react";
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
}

// ═══════════════════════════════════════════════════════════════════════
// STABLE EDITABLE TEXT — defined OUTSIDE component to prevent re-creation
// This is the fix for cursor-jumping: the component identity never changes
// ═══════════════════════════════════════════════════════════════════════
interface EditableTextProps {
  field: string;
  value: string;
  style?: React.CSSProperties;
  className?: string;
  tag?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "li" | "div";
  multiline?: boolean;
  placeholder?: string;
  isEditing: boolean;
  editingField: string | null;
  tempValue: string;
  onStartEdit: (field: string, value: string) => void;
  onSave: (field: string) => void;
  onTempChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent, field: string, multiline?: boolean) => void;
}

const EditableText: React.FC<EditableTextProps> = ({
  field,
  value,
  style,
  className,
  tag: Tag = "span",
  multiline = false,
  placeholder,
  isEditing,
  editingField,
  tempValue,
  onStartEdit,
  onSave,
  onTempChange,
  onKeyDown,
}) => {
  const isActive = editingField === field;
  const displayValue = value || placeholder || "";

  if (isEditing && isActive) {
    const inputStyle: React.CSSProperties = {
      ...style,
      width: "100%",
      background: "rgba(249, 115, 22, 0.08)",
      border: "2px solid rgba(249, 115, 22, 0.5)",
      borderRadius: "4px",
      padding: "2px 4px",
      outline: "none",
      boxSizing: "border-box" as const,
      resize: multiline ? ("vertical" as const) : ("none" as const),
      fontFamily: style?.fontFamily || "inherit",
      fontSize: style?.fontSize || "inherit",
      fontWeight: style?.fontWeight || "inherit",
      color: style?.color || "inherit",
    };

    if (multiline) {
      return (
        <textarea
          value={tempValue}
          onChange={(e) => onTempChange(e.target.value)}
          onBlur={() => onSave(field)}
          onKeyDown={(e) => onKeyDown(e, field, true)}
          style={{ ...inputStyle, minHeight: "60px" }}
          className={className}
          autoFocus
        />
      );
    }
    return (
      <input
        type="text"
        value={tempValue}
        onChange={(e) => onTempChange(e.target.value)}
        onBlur={() => onSave(field)}
        onKeyDown={(e) => onKeyDown(e, field, false)}
        style={inputStyle}
        className={className}
        autoFocus
      />
    );
  }

  return (
    <Tag
      onClick={() => isEditing && onStartEdit(field, value)}
      style={{
        ...style,
        ...(isEditing
          ? { cursor: "pointer", borderRadius: "4px", transition: "background 0.15s, outline 0.15s" }
          : {}),
      }}
      className={`${className || ""} ${isEditing ? "editable-field" : ""}`}
    >
      {displayValue || (isEditing ? "(klikkaa muokataksesi)" : "")}
    </Tag>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// DRAGGABLE SECTION WRAPPER
// ═══════════════════════════════════════════════════════════════════════
interface DraggableSectionProps {
  id: string;
  index: number;
  isEditing: boolean;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const DraggableSection: React.FC<DraggableSectionProps> = ({
  id,
  index,
  isEditing,
  onMove,
  children,
  style,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartIndex = useRef(0);

  if (!isEditing) {
    return <div style={style}>{children}</div>;
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag from the handle (drag icon area)
    const target = e.target as HTMLElement;
    if (!target.closest("[data-drag-handle]")) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartIndex.current = index;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !ref.current) return;
    const delta = e.clientY - dragStartY.current;
    const threshold = 40;
    if (delta > threshold) {
      onMove(index, index + 1);
      dragStartY.current = e.clientY;
    } else if (delta < -threshold) {
      onMove(index, index - 1);
      dragStartY.current = e.clientY;
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      style={{
        ...style,
        position: "relative",
        opacity: isDragging ? 0.7 : 1,
        transition: "opacity 0.15s",
        outline: isEditing ? "1px dashed rgba(249,115,22,0.25)" : "none",
        borderRadius: "4px",
        padding: "2px",
      }}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        style={{
          position: "absolute",
          left: "-14px",
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "grab",
          color: "rgba(249,115,22,0.5)",
          fontSize: "12px",
          userSelect: "none",
          lineHeight: 1,
          padding: "2px",
          zIndex: 10,
        }}
        title="Vedä siirtääksesi"
      >
        ⠿
      </div>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// DELETE BUTTON
// ═══════════════════════════════════════════════════════════════════════
const DeleteBtn: React.FC<{
  onClick: () => void;
  isEditing: boolean;
  label?: string;
}> = ({ onClick, isEditing, label = "Poista" }) => {
  if (!isEditing) return null;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={label}
      style={{
        position: "absolute",
        top: "-6px",
        right: "-6px",
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: "18px",
        height: "18px",
        cursor: "pointer",
        fontSize: "11px",
        lineHeight: "18px",
        textAlign: "center",
        zIndex: 20,
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
      }}
    >
      ✕
    </button>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
const TechnicalCVTemplate: React.FC<TechnicalCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  showEditControls,
  editMode,
  onContentChange,
  onUpdate,
  onDelete,
  profileImage,
  backgroundImage,
}) => {
  const [skillsTop, setSkillsTop] = useState(0);

  // ── Stable editing state ──────────────────────────────────────────
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  // Section order for drag-to-reorder
  const [sectionOrder, setSectionOrder] = useState<string[]>(["experience", "education", "languages"]);

  const startEditing = useCallback((field: string, currentValue: string) => {
    if (!isEditing) return;
    setEditingField(field);
    setTempValue(currentValue ?? "");
  }, [isEditing]);

  const cancelEditing = useCallback(() => {
    setEditingField(null);
    setTempValue("");
  }, []);

  const saveField = useCallback((field: string) => {
    if (onUpdate && tempValue !== undefined) {
      onUpdate(field, tempValue);
    }
    setEditingField(null);
    setTempValue("");
  }, [onUpdate, tempValue]);

  const handleKeyDown = useCallback((
    e: React.KeyboardEvent,
    field: string,
    multiline: boolean = false
  ) => {
    if (e.key === "Escape") { cancelEditing(); return; }
    if (e.key === "Enter" && !multiline) {
      e.preventDefault();
      saveField(field);
    }
  }, [cancelEditing, saveField]);

  // Shared props for EditableText (avoids re-render issue)
  const editProps = {
    isEditing,
    editingField,
    tempValue,
    onStartEdit: startEditing,
    onSave: saveField,
    onTempChange: setTempValue,
    onKeyDown: handleKeyDown,
  };

  // ── Move section in order ──────────────────────────────────────────
  const moveSection = useCallback((dragIdx: number, hoverIdx: number) => {
    if (hoverIdx < 0 || hoverIdx >= sectionOrder.length) return;
    setSectionOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(hoverIdx, 0, moved);
      return next;
    });
  }, [sectionOrder.length]);

  // ── Move item within array (drag within section) ───────────────────
  const moveExperienceItem = useCallback((dragIdx: number, hoverIdx: number) => {
    if (!onUpdate) return;
    const exp = [...workExperience];
    if (hoverIdx < 0 || hoverIdx >= exp.length) return;
    const [moved] = exp.splice(dragIdx, 1);
    exp.splice(hoverIdx, 0, moved);
    onUpdate("experience", exp);
  }, []);

  const moveEducationItem = useCallback((dragIdx: number, hoverIdx: number) => {
    if (!onUpdate) return;
    const edu = [...education];
    if (hoverIdx < 0 || hoverIdx >= edu.length) return;
    const [moved] = edu.splice(dragIdx, 1);
    edu.splice(hoverIdx, 0, moved);
    onUpdate("education", edu);
  }, []);

  // ── Image helpers ──────────────────────────────────────────────────
  const isValidImage = (src?: string | null) => {
    if (!src) return false;
    const s = String(src).trim();
    return s !== "" && !s.includes("cv_files/default") &&
      (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image"));
  };

  const getProfileImage = (): string | null => {
    const sources = [profileImage, (data as any)?.profile_image, data?.profileImage, (data as any)?.photo, aiData?.profile_image];
    for (const src of sources) { if (isValidImage(src)) return String(src).trim(); }
    return null;
  };

  const getBackgroundImage = (): string | null => {
    const sources = [backgroundImage, (data as any)?.background_image, data?.backgroundImage, aiData?.background_image, aiData?.background_image_url];
    for (const src of sources) { if (isValidImage(src)) return String(src).trim(); }
    return null;
  };

  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();

  // ── AI content helper ──────────────────────────────────────────────
  const getAIContent = (field: keyof AIData): string => {
    let content = aiData?.[field];
    if (!content && aiData?.html) content = aiData.html[field as keyof typeof aiData.html];
    if (typeof content === "string" && content.trim()) {
      if (content.toLowerCase().includes("error generating")) return "";
      if (content.trim().length < 20) return "";
      return content;
    }
    return "";
  };

  // ── Parse helpers ──────────────────────────────────────────────────
  const parseSkills = (): { category: string; items: string[] }[] => {
    if (data?.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      if (typeof data.skills[0] === "string") return [{ category: "Skills", items: data.skills as string[] }];
      return data.skills as { category: string; items: string[] }[];
    }
    const skillsHTML = getAIContent("skills_section");
    if (!skillsHTML) {
      const skillsText = data?.skills || "";
      if (!skillsText || typeof skillsText !== "string") return [];
      return [{ category: "Skills", items: skillsText.split(",").map(s => s.trim()).filter(Boolean) }];
    }
    const categories: { category: string; items: string[] }[] = [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(skillsHTML, "text/html");
    doc.querySelectorAll("h3, h4, strong").forEach(heading => {
      const category = heading.textContent?.trim() || "Skills";
      const items: string[] = [];
      let next = heading.nextElementSibling;
      while (next && next.tagName === "UL") {
        next.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) items.push(t); });
        next = next.nextElementSibling;
      }
      if (items.length > 0) categories.push({ category, items });
    });
    if (categories.length === 0) {
      const lines = skillsHTML.replace(/<[^>]+>/g, "").split("\n").filter(l => l.trim());
      if (lines.length > 0) categories.push({ category: "Skills", items: lines });
    }
    return categories;
  };

  const parseWorkExperience = () => {
    if (data?.experience && Array.isArray(data.experience) && data.experience.length > 0) {
      return data.experience.map((exp: any) => ({
        title: exp.title || exp.position || "Position",
        company: exp.company || "Company",
        period: exp.period || exp.duration || "",
        achievements: Array.isArray(exp.bullets) ? exp.bullets : Array.isArray(exp.achievements) ? exp.achievements : [exp.description].filter(Boolean),
      }));
    }
    const expHTML = getAIContent("experience_section");
    if (!expHTML) {
      try {
        const rawExp = data?.work_experience || (data as any)?.workExperience;
        if (!rawExp) return [];
        const parsed = typeof rawExp === "string" ? JSON.parse(rawExp) : rawExp;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((job: any) => ({
          title: job.position || "Position", company: job.company || "Company", period: job.duration || "",
          achievements: [job.description, job.biggestAchievement, job.whatYouLearned, job.howYourStrengthShowed].filter(Boolean).map((t: string) => t.trim()),
        }));
      } catch { return []; }
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(expHTML, "text/html");
    const jobs: any[] = [];
    const jobDivs = doc.querySelectorAll(".job, .work-item, .experience-item");
    if (jobDivs.length > 0) {
      jobDivs.forEach(jobDiv => {
        const h4 = jobDiv.querySelector("h4");
        const [title, company] = (h4?.textContent?.trim() || "").split(" - ").map(s => s.trim());
        const period = jobDiv.querySelector('.date, p[class*="date"]')?.textContent?.trim() || "";
        const achievements: string[] = [];
        jobDiv.querySelectorAll("ul li").forEach(li => { const t = li.textContent?.trim(); if (t) achievements.push(t); });
        if (title || company) jobs.push({ title: title || "Position", company: company || "Company", period, achievements });
      });
    } else {
      doc.querySelectorAll("h4").forEach(h4 => {
        const [title, company] = (h4.textContent?.trim() || "").split(" - ").map(s => s.trim());
        let period = ""; let next = h4.nextElementSibling;
        if (next?.classList.contains("date") || next?.tagName === "P") { period = next.textContent?.trim() || ""; next = next.nextElementSibling; }
        const achievements: string[] = [];
        if (next?.tagName === "UL") next.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) achievements.push(t); });
        if (title || company) jobs.push({ title: title || "Position", company: company || "Company", period, achievements });
      });
    }
    return jobs;
  };

  const parseEducation = () => {
    if (data?.education && Array.isArray(data.education) && data.education.length > 0) {
      return data.education.map((edu: any) => ({
        degree: edu.degree || "Degree", institution: edu.institution || edu.school || "Institution",
        year: edu.year || edu.period || "",
        details: Array.isArray(edu.details) ? edu.details : [edu.description].filter(Boolean),
      }));
    }
    const eduHTML = getAIContent("education_section");
    if (!eduHTML) {
      try {
        const rawEdu = data?.education || (data as any)?.education_history;
        if (!rawEdu) return [];
        const parsed = typeof rawEdu === "string" ? JSON.parse(rawEdu) : rawEdu;
        if (!Array.isArray(parsed)) return [];
        return parsed.map((edu: any) => ({
          degree: edu.degree || "Degree", institution: edu.school || edu.institution || "Institution", year: edu.year || "",
          details: [edu.whyThisField, edu.specialization, edu.proudestMoment, edu.favoriteSubjects].filter(Boolean).map((t: string) => t.trim()),
        }));
      } catch { return []; }
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(eduHTML, "text/html");
    const eduList: any[] = [];
    const eduDivs = doc.querySelectorAll(".education, .education-item");
    if (eduDivs.length > 0) {
      eduDivs.forEach(eduDiv => {
        const degree = eduDiv.querySelector("h4")?.textContent?.trim() || "";
        let institution = ""; let year = "";
        eduDiv.querySelectorAll("p").forEach((p, idx) => { const t = p.textContent?.trim() || ""; if (idx === 0) institution = t; if (p.classList.contains("date") || t.match(/\d{4}/)) year = t; });
        const details: string[] = [];
        eduDiv.querySelectorAll("ul li").forEach(li => { const t = li.textContent?.trim(); if (t) details.push(t); });
        if (degree) eduList.push({ degree, institution, year, details });
      });
    } else {
      doc.querySelectorAll("h4").forEach(h4 => {
        const degree = h4.textContent?.trim() || "";
        let institution = ""; let year = ""; const details: string[] = [];
        let next = h4.nextElementSibling;
        if (next?.tagName === "P") { institution = next.textContent?.trim() || ""; next = next.nextElementSibling; }
        if (next?.tagName === "P") { const t = next.textContent?.trim() || ""; if (t.match(/\d{4}/)) { year = t; next = next.nextElementSibling; } }
        if (next?.tagName === "UL") next.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) details.push(t); });
        if (degree) eduList.push({ degree, institution, year, details });
      });
    }
    return eduList;
  };

  const skillCategories = parseSkills();
  const workExperience = parseWorkExperience();
  const education = parseEducation();
  const name = data?.name || "Name";
  const title = data?.title || "Professional Title";

  // ── Section renderers ──────────────────────────────────────────────
  const renderExperienceSection = () => (
    <section style={{ marginBottom: "7mm" }}>
      <h2 style={{ fontSize: "11.5pt", fontWeight: 600, textTransform: "uppercase", borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm", marginBottom: "4mm", letterSpacing: "0.12em", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }}>
        Work Experience
      </h2>
      {workExperience.map((job, idx) => (
        <DraggableSection key={`exp-${idx}`} id={`exp-${idx}`} index={idx} isEditing={isEditing} onMove={moveExperienceItem} style={{ marginBottom: "5.5mm", position: "relative" }}>
          {/* Delete job button */}
          <DeleteBtn isEditing={isEditing} onClick={() => onDelete?.("experience", idx)} label="Poista työpaikka" />

          <h4 style={{ fontSize: "10.5pt", fontWeight: 600, marginBottom: "1mm", color: "#1a1a1a", fontFamily: "'Inter', sans-serif" }}>
            <EditableText field={`experience.${idx}.title`} value={job.title} style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "10.5pt" }} {...editProps} />
            <span style={{ fontWeight: 400, color: "#555" }}> — </span>
            <EditableText field={`experience.${idx}.company`} value={job.company} style={{ fontWeight: 600, color: "#1a1a1a", fontSize: "10.5pt" }} {...editProps} />
          </h4>

          {(job.period || isEditing) && (
            <EditableText field={`experience.${idx}.period`} value={job.period} tag="p" placeholder="Ajanjakso" style={{ fontSize: "8.5pt", color: "#666", fontStyle: "italic", marginBottom: "2mm", fontWeight: 300 }} {...editProps} />
          )}

          {(job.achievements.length > 0 || isEditing) && (
            <ul style={{ marginTop: "2mm", paddingLeft: "5mm", fontSize: "9pt", lineHeight: 1.6, fontWeight: 300 }}>
              {job.achievements.map((achievement: string, achIdx: number) => (
                <li key={achIdx} style={{ marginBottom: "1.5mm", color: "#333", position: "relative" }}>
                  <DeleteBtn isEditing={isEditing} onClick={() => onDelete?.(`experience.${idx}.bullets`, achIdx)} label="Poista kohta" />
                  <EditableText field={`experience.${idx}.bullets.${achIdx}`} value={achievement} multiline style={{ color: "#333", fontSize: "9pt" }} {...editProps} />
                </li>
              ))}
              {isEditing && (
                <li onClick={() => onUpdate?.(`experience.${idx}.bullets.${job.achievements.length}`, "Uusi kuvaus")}
                  style={{ marginBottom: "1.5mm", color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: 0.7 }}>
                  + Lisää kohta...
                </li>
              )}
            </ul>
          )}
        </DraggableSection>
      ))}
      {isEditing && (
        <div onClick={() => onUpdate?.(`experience.${workExperience.length}`, { title: "Uusi tehtävä", company: "Yritys", period: "2024 - Nykyinen", bullets: ["Kuvaus tehtävästä"] })}
          style={{ padding: "3mm", border: "2px dashed #f97316", borderRadius: "4px", textAlign: "center", color: "#f97316", cursor: "pointer", fontSize: "9pt", marginTop: "3mm" }}>
          + Lisää työkokemus
        </div>
      )}
    </section>
  );

  const renderEducationSection = () => (
    <section style={{ marginBottom: "7mm" }}>
      <h2 style={{ fontSize: "11.5pt", fontWeight: 600, textTransform: "uppercase", borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm", marginBottom: "4mm", letterSpacing: "0.12em", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }}>
        Education
      </h2>
      {education.map((edu: any, idx: number) => (
        <DraggableSection key={`edu-${idx}`} id={`edu-${idx}`} index={idx} isEditing={isEditing} onMove={moveEducationItem} style={{ marginBottom: "5mm", position: "relative" }}>
          <DeleteBtn isEditing={isEditing} onClick={() => onDelete?.("education", idx)} label="Poista koulutus" />

          <EditableText field={`education.${idx}.degree`} value={edu.degree} tag="h4" style={{ fontSize: "10pt", fontWeight: 600, marginBottom: "1mm", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }} {...editProps} />
          {(edu.institution || isEditing) && (
            <EditableText field={`education.${idx}.institution`} value={edu.institution} tag="p" placeholder="Oppilaitos" style={{ fontSize: "9pt", margin: "1mm 0", fontWeight: 400, color: "#444" }} {...editProps} />
          )}
          {(edu.year || isEditing) && (
            <EditableText field={`education.${idx}.year`} value={edu.year} tag="p" placeholder="2020 - 2024" style={{ fontSize: "8.5pt", color: "#666", fontStyle: "italic", margin: "1mm 0", fontWeight: 300 }} {...editProps} />
          )}
          {(edu.details.length > 0 || isEditing) && (
            <ul style={{ marginTop: "2mm", paddingLeft: "5mm", fontSize: "8.5pt", lineHeight: 1.6, fontWeight: 300 }}>
              {edu.details.map((detail: string, detIdx: number) => (
                <li key={detIdx} style={{ color: "#333", position: "relative" }}>
                  <DeleteBtn isEditing={isEditing} onClick={() => onDelete?.(`education.${idx}.details`, detIdx)} label="Poista lisätieto" />
                  <EditableText field={`education.${idx}.details.${detIdx}`} value={detail} multiline style={{ color: "#333", fontSize: "8.5pt" }} {...editProps} />
                </li>
              ))}
              {isEditing && (
                <li onClick={() => onUpdate?.(`education.${idx}.details.${edu.details.length}`, "Uusi lisätieto")}
                  style={{ color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: 0.7 }}>
                  + Lisää lisätieto...
                </li>
              )}
            </ul>
          )}
        </DraggableSection>
      ))}
      {isEditing && (
        <div onClick={() => onUpdate?.(`education.${education.length}`, { degree: "Uusi tutkinto", institution: "Oppilaitos", year: "2020 - 2024", details: ["Kuvaus"] })}
          style={{ padding: "3mm", border: "2px dashed #f97316", borderRadius: "4px", textAlign: "center", color: "#f97316", cursor: "pointer", fontSize: "9pt", marginTop: "3mm" }}>
          + Lisää koulutus
        </div>
      )}
    </section>
  );

  const renderLanguagesSection = () => {
    const content = getAIContent("languages_section");
    if (!content) return null;
    return (
      <section>
        <h2 style={{ fontSize: "11.5pt", fontWeight: 600, textTransform: "uppercase", borderBottom: "2px solid #1a1a1a", paddingBottom: "2mm", marginBottom: "4mm", letterSpacing: "0.12em", fontFamily: "'Inter', sans-serif", color: "#1a1a1a" }}>
          Languages
        </h2>
        <div style={{ fontSize: "9.5pt", lineHeight: 1.6, color: "#333", fontWeight: 300 }} dangerouslySetInnerHTML={{ __html: content }} />
      </section>
    );
  };

  const sectionMap: Record<string, () => React.ReactNode> = {
    experience: renderExperienceSection,
    education: renderEducationSection,
    languages: renderLanguagesSection,
  };

  // ── Render ──────────────────────────────────────────────────────────
  return (
    <div
      className="bg-white mx-auto relative overflow-visible shadow-2xl"
      style={{ width: "210mm", minHeight: "297mm", fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap" rel="stylesheet" />
      <style>{`
        .editable-field:hover {
          outline: 2px dashed rgba(249, 115, 22, 0.4) !important;
          background: rgba(249, 115, 22, 0.04) !important;
        }
      `}</style>

      {/* LEFT COLUMN */}
      <div style={{ position: "absolute", left: 0, top: 0, width: "70mm", minHeight: "297mm", background: "linear-gradient(180deg, #1a1a1a 0%, #2d2d2d 100%)", color: "white" }}>
        {/* Profile image */}
        <div style={{ width: "100%", height: "85mm", overflow: "hidden" }}>
          {profileImg ? (
            <img src={profileImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", filter: "contrast(1.05) brightness(0.95)" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "48pt", fontWeight: 300, background: "linear-gradient(135deg, #4a4a4a 0%, #2a2a2a 100%)", fontFamily: "'Inter', sans-serif", letterSpacing: "0.05em" }}>
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>

        {/* Skills */}
        {(skillCategories.length > 0 || isEditing) && (
          <div style={{ padding: "7mm 8mm", position: "relative", top: `${skillsTop}mm` }}>
            <h2 style={{ fontSize: "13pt", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.18em", borderBottom: "1.5px solid rgba(255,255,255,0.25)", paddingBottom: "3.5mm", marginBottom: "5mm", fontFamily: "'Inter', sans-serif" }}>
              {skillCategories[0]?.category || "Skills"}
            </h2>
            {skillCategories.map((category, catIdx) => (
              <div key={catIdx} style={{ marginBottom: "4.5mm" }}>
                {skillCategories.length > 1 && (
                  <EditableText field={`skills.${catIdx}.category`} value={category.category} tag="h3"
                    style={{ fontSize: "9.5pt", fontWeight: 600, marginBottom: "2mm", color: "#f0c674", fontFamily: "'Inter', sans-serif", letterSpacing: "0.03em" }}
                    {...editProps} />
                )}
                <ul style={{ listStyleType: "none", padding: 0, margin: 0, fontSize: "8.5pt", lineHeight: 1.65, fontWeight: 300, fontFamily: "'Inter', sans-serif" }}>
                  {category.items.map((skill, skillIdx) => (
                    <li key={skillIdx} style={{ marginBottom: "2mm", paddingLeft: "4mm", position: "relative", color: "rgba(255,255,255,0.92)" }}>
                      <span style={{ position: "absolute", left: 0, color: "#f0c674", fontSize: "10pt" }}>•</span>
                      {/* Delete skill button */}
                      {isEditing && (
                        <button onClick={(e) => { e.stopPropagation(); onDelete?.(`skills.${catIdx}.items`, skillIdx); }}
                          title="Poista taito"
                          style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", background: "#ef4444", color: "white", border: "none", borderRadius: "50%", width: "14px", height: "14px", cursor: "pointer", fontSize: "9px", lineHeight: "14px", textAlign: "center", zIndex: 10, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          ✕
                        </button>
                      )}
                      <EditableText field={`skills.${catIdx}.items.${skillIdx}`} value={skill} tag="span"
                        style={{ color: "rgba(255,255,255,0.92)", fontSize: "8.5pt" }}
                        {...editProps} />
                    </li>
                  ))}
                  {isEditing && (
                    <li onClick={() => onUpdate?.(`skills.${catIdx}.items.${category.items.length}`, "Uusi taito")}
                      style={{ marginBottom: "2mm", paddingLeft: "4mm", color: "#f0c674", cursor: "pointer", fontStyle: "italic", opacity: 0.7, position: "relative" }}>
                      <span style={{ position: "absolute", left: 0 }}>+</span>
                      Lisää taito...
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
        {/* Header */}
        <div style={{ height: "85mm", position: "relative", backgroundImage: bgImage ? `url(${bgImage})` : "linear-gradient(135deg, #2c3e50 0%, #34495e 100%)", backgroundSize: "cover", backgroundPosition: "center", color: "white" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.35) 100%)" }} />
          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "10mm" }}>
            <EditableText field="name" value={name} tag="h1"
              style={{ fontSize: "30pt", fontWeight: 700, marginBottom: "2mm", fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em", textShadow: "2px 2px 4px rgba(0,0,0,0.3)", color: "white" }}
              {...editProps} />
            <EditableText field="title" value={title} tag="p"
              style={{ fontSize: "13pt", marginTop: "2mm", marginBottom: "4mm", fontWeight: 400, fontFamily: "'Inter', sans-serif", letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.95, color: "white" }}
              {...editProps} />
            <div style={{ marginTop: "4mm", fontSize: "8.5pt", opacity: 0.92, display: "flex", gap: "7mm", flexWrap: "wrap", justifyContent: "center", fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
              {(data?.email || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  <EditableText field="email" value={data.email || ""} placeholder="sähköposti@esimerkki.fi" style={{ color: "white", fontSize: "8.5pt" }} {...editProps} />
                </span>
              )}
              {(data?.phone || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  <EditableText field="phone" value={data.phone || ""} placeholder="+358 40 123 4567" style={{ color: "white", fontSize: "8.5pt" }} {...editProps} />
                </span>
              )}
              {(data?.location || isEditing) && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: "2mm" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  <EditableText field="location" value={data.location || ""} placeholder="Helsinki" style={{ color: "white", fontSize: "8.5pt" }} {...editProps} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content area — draggable sections */}
        <div style={{ padding: "9mm 10mm", fontSize: "9.5pt", lineHeight: 1.55, fontFamily: "'Inter', sans-serif", fontWeight: 300 }}>
          {/* Drag-to-reorder section wrapper for main sections */}
          {sectionOrder.map((sectionId, sIdx) => {
            const render = sectionMap[sectionId];
            if (!render) return null;
            const rendered = render();
            if (!rendered) return null;
            return (
              <DraggableSection key={sectionId} id={sectionId} index={sIdx} isEditing={isEditing} onMove={moveSection} style={{ position: "relative" }}>
                {rendered}
              </DraggableSection>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TechnicalCVTemplate;