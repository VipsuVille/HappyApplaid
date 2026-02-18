"use client";
import React, { useState } from "react";
import { UserFormData, AIData, EditMode } from "@/types";

interface SimpleCVTemplateProps {
  data: UserFormData;
  aiData: AIData;
  isEditing: boolean;
  showEditControls: boolean;
  editMode: EditMode | null;
  onContentChange?: (field: keyof UserFormData, value: any) => void;
  onUpdate?: (field: string, value: any) => void;
  onDelete?: (field: string, index: number) => void;
}

const SimpleCVTemplate: React.FC<SimpleCVTemplateProps> = ({
  data,
  aiData,
  isEditing,
  onContentChange,
  onUpdate,
  onDelete,
}) => {
  // ═══════════════════════════════════════════════════════════
  // CLICK-TO-EDIT STATE
  // ═══════════════════════════════════════════════════════════
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>("");

  const startEditing = (field: string, currentValue: string) => {
    if (!isEditing) return;
    setEditingField(field);
    setTempValue(currentValue);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setTempValue("");
  };

  const saveField = (field: string) => {
    if (onUpdate && tempValue !== undefined) {
      onUpdate(field, tempValue);
    }
    setEditingField(null);
    setTempValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: string, multiline: boolean = false) => {
    if (e.key === "Escape") cancelEditing();
    if (e.key === "Enter" && !multiline) { e.preventDefault(); saveField(field); }
  };

  const handleDeleteItem = (field: string, index: number) => {
    if (onDelete) onDelete(field, index);
  };

  // ═══════════════════════════════════════════════════════════
  // IMAGE HANDLING
  // ═══════════════════════════════════════════════════════════
  const isValidImage = (src?: string | null) => {
    if (!src) return false;
    const s = String(src).trim();
    return s !== "" && !s.includes("cv_files/default") &&
      (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image"));
  };

  const getProfileImage = (): string | null => {
    const sources = [(data as any)?.profile_image, data?.profileImage, (data as any)?.photo, aiData?.profile_image, (aiData?.html as any)?.profile_image];
    for (const src of sources) {
      if (!isValidImage(src)) continue;
      const srcStr = String(src).trim();
      if (srcStr.startsWith("http") && srcStr.includes("data:image")) continue;
      return srcStr;
    }
    return null;
  };

  const getBackgroundImage = (): string | null => {
    const sources = [(data as any)?.background_image, data?.backgroundImage, aiData?.background_image, aiData?.background_image_url, (aiData?.html as any)?.background_image];
    for (const src of sources) {
      if (!isValidImage(src)) continue;
      const srcStr = String(src).trim();
      if (srcStr.startsWith("http") && srcStr.includes("data:image")) continue;
      return srcStr;
    }
    return null;
  };

  const profileImg = getProfileImage();
  const bgImage = getBackgroundImage();
  const name = data?.name || "Nimi";
  const title = data?.title || "Ammattinimike";

  // ═══════════════════════════════════════════════════════════
  // AI CONTENT
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // EditableText + DeleteBtn components
  // ═══════════════════════════════════════════════════════════
  const EditableText = ({ field, value, style, className, tag: Tag = "span", multiline = false, placeholder }: {
    field: string; value: string; style?: React.CSSProperties; className?: string;
    tag?: "span" | "p" | "h1" | "h2" | "h3" | "h4" | "li" | "div"; multiline?: boolean; placeholder?: string;
  }) => {
    const isActive = editingField === field;
    if (isEditing && isActive) {
      const inputStyle: React.CSSProperties = {
        ...style, width: "100%", background: "rgba(249,115,22,0.08)",
        border: "2px solid rgba(249,115,22,0.5)", borderRadius: "4px", padding: "4px 6px",
        outline: "none", boxSizing: "border-box" as const, fontFamily: "inherit",
        resize: multiline ? ("vertical" as const) : ("none" as const), color: "#1a202c",
      };
      if (multiline) {
        return <textarea value={tempValue} onChange={e => setTempValue(e.target.value)} onBlur={() => saveField(field)}
          onKeyDown={e => handleKeyDown(e, field, true)} style={{ ...inputStyle, minHeight: "60px" }} className={className} autoFocus />;
      }
      return <input type="text" value={tempValue} onChange={e => setTempValue(e.target.value)} onBlur={() => saveField(field)}
        onKeyDown={e => handleKeyDown(e, field, false)} style={inputStyle} className={className} autoFocus />;
    }
    const displayValue = value || "";
    if (!displayValue && !isEditing) return null;
return (
<Tag onClick={() => startEditing(field, value)}
style={{
...style,
...(multiline ? { whiteSpace: 'pre-line' as const } : {}),
...(isEditing ? { cursor: "pointer", borderRadius: "4px", transition: "background 0.15s" } : {}),
}}
className={${className || ""} ${isEditing ? "editable-field" : ""}}>
{displayValue || placeholder || "..."}
</Tag>
);
  };

  const DeleteBtn = ({ onClick, title: t }: { onClick: () => void; title?: string }) => {
    if (!isEditing) return null;
    return (
      <button onClick={e => { e.stopPropagation(); onClick(); }} title={t || "Poista"}
        className="delete-btn"
        style={{
          background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "50%",
          width: "18px", height: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", fontSize: "10px", color: "#ef4444", flexShrink: 0, marginLeft: "4px", padding: 0,
        }}>✕</button>
    );
  };

  // ═══════════════════════════════════════════════════════════
  // PARSE DATA (experience, education, skills from structured data)
  // ═══════════════════════════════════════════════════════════
  const experience = Array.isArray(data?.experience) ? data.experience : [];
  const education = Array.isArray(data?.education) ? data.education : [];
  const skills = Array.isArray(data?.skills) ? data.skills : [];

  const hasStructuredExperience = experience.length > 0;
  const hasStructuredEducation = education.length > 0;
  const hasStructuredSkills = skills.length > 0;

  return (
    <div
      className="cv-paper bg-white mx-auto relative overflow-visible shadow-2xl"
      style={{
        width: "210mm",
        minHeight: "297mm",
        fontFamily: "'Inter', 'Helvetica', sans-serif",
        color: "#1a202c",
      }}
    >
      <style>{`
        .editable-field:hover { outline: 2px dashed rgba(249,115,22,0.4) !important; background: rgba(249,115,22,0.04) !important; }
        .delete-btn:hover { background: rgba(239,68,68,0.3) !important; }
      `}</style>

      {/* 1. HEADER & BACKGROUND IMAGE */}
      <div className="relative bg-indigo-900" style={{ height: "70mm" }}>
        {bgImage ? (
          <img src={bgImage} className="absolute inset-0 w-full h-full object-cover" alt=""
            onError={(e) => { e.currentTarget.style.display = 'none'; }} />
        ) : (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e40af 0%, #7e22ce 100%)" }} />
        )}
        <div className="absolute inset-0 bg-black/20" />

        {/* NAME AND TITLE */}
        <div className="absolute bottom-10 left-12 text-white z-10">
          <EditableText field="name" value={name} tag="h1"
            style={{ fontSize: "42px", fontWeight: 800, letterSpacing: "-0.02em", textShadow: "2px 2px 4px rgba(0,0,0,0.3)", color: "white", display: "block", marginBottom: "8px" }} />
          <EditableText field="title" value={title} tag="p"
            style={{ fontSize: "20px", opacity: 0.95, fontWeight: 300, color: "white", display: "block" }} />
        </div>

        {/* PROFILE IMAGE */}
        <div className="absolute -bottom-10 right-12 z-20 w-[50mm] h-[50mm] rounded-full border-[6px] border-white overflow-hidden shadow-xl bg-gray-100">
          {profileImg ? (
            <img src={profileImg} className="w-full h-full object-cover" alt="Profiili"
              onError={(e) => { e.currentTarget.style.display = 'none'; }} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl font-bold bg-gray-200">
              {name.substring(0, 2).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      {/* 2. CONTACT INFORMATION BAR */}
      <div className="bg-[#1a202c] text-white py-4 px-12 mt-0 flex items-center gap-8 text-sm flex-wrap">
        {(data?.phone || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 text-xs uppercase">Puh:</span>
            <EditableText field="phone" value={data?.phone || ""} placeholder="+358..." style={{ color: "white" }} />
          </div>
        )}
        {(data?.email || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 text-xs uppercase">Email:</span>
            <EditableText field="email" value={data?.email || ""} placeholder="email@example.com" style={{ color: "white" }} />
          </div>
        )}
        {(data?.location || isEditing) && (
          <div className="flex items-center gap-2">
            <span className="opacity-60 text-xs uppercase">Sijainti:</span>
            <EditableText field="location" value={data?.location || ""} placeholder="Helsinki" style={{ color: "white" }} />
          </div>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="px-12 py-16 grid grid-cols-12 gap-12">
        <div className="col-span-12 flex flex-col gap-10">
          
          {/* PROFILE DESCRIPTION */}
          {getAIContent("personal_description") && (
            <section>
              <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-4">Profiili</h2>
              <p className="text-gray-700 leading-relaxed text-lg italic border-l-4 border-blue-100 pl-6">
                {getAIContent("personal_description")}
              </p>
            </section>
          )}

          <div className="grid grid-cols-1 gap-12">
            
            {/* STRUCTURED WORK EXPERIENCE */}
            {(hasStructuredExperience || isEditing) && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Työkokemus</h2>
                {experience.map((exp: any, idx: number) => (
                  <div key={idx} className="mb-6 relative">
                    {isEditing && <div className="absolute top-0 right-0"><DeleteBtn onClick={() => handleDeleteItem("experience", idx)} title="Poista työkokemus" /></div>}
                    <h4 className="font-semibold text-gray-900" style={{ paddingRight: isEditing ? "24px" : "0" }}>
                      <EditableText field={`experience.${idx}.title`} value={exp.title || exp.position || ""} style={{ fontWeight: 600 }} />
                      {(exp.company || isEditing) && (
                        <> — <EditableText field={`experience.${idx}.company`} value={exp.company || ""} style={{ fontWeight: 400, color: "#555" }} /></>
                      )}
                    </h4>
                    {(exp.period || exp.duration || isEditing) && (
                      <EditableText field={`experience.${idx}.period`} value={exp.period || exp.duration || ""} tag="p" placeholder="Ajanjakso"
                        style={{ fontSize: "13px", color: "#666", fontStyle: "italic", marginBottom: "4px" }} />
                    )}
                    {(Array.isArray(exp.bullets) && exp.bullets.length > 0 || isEditing) && (
                      <ul className="mt-2 ml-5 text-gray-700" style={{ listStyleType: "disc", fontSize: "14px", lineHeight: "1.6" }}>
                        {(exp.bullets || []).map((bullet: string, bIdx: number) => (
                          <li key={bIdx} style={{ display: "flex", alignItems: "flex-start", marginBottom: "4px" }}>
                            <span style={{ flex: 1 }}><EditableText field={`experience.${idx}.bullets.${bIdx}`} value={bullet} multiline style={{ fontSize: "14px" }} /></span>
                            <DeleteBtn onClick={() => handleDeleteItem(`experience.${idx}.bullets`, bIdx)} />
                          </li>
                        ))}
                        {isEditing && <li onClick={() => onUpdate?.(`experience.${idx}.bullets.${(exp.bullets || []).length}`, "Uusi kuvaus")}
                          style={{ color: "#f97316", cursor: "pointer", fontStyle: "italic", opacity: 0.7, fontSize: "14px" }}>+ Lisää kohta...</li>}
                      </ul>
                    )}
                  </div>
                ))}
                {isEditing && (
                  <div onClick={() => onUpdate?.(`experience.${experience.length}`, { title: "Uusi tehtävä", company: "Yritys", period: "2024 - Nykyinen", bullets: ["Kuvaus tehtävästä"] })}
                    className="p-3 border-2 border-dashed border-orange-400 rounded-lg text-center text-orange-500 cursor-pointer text-sm font-semibold hover:bg-orange-50 transition-colors">
                    + Lisää työkokemus
                  </div>
                )}
              </section>
            )}

            {/* AI-generated experience (fallback) */}
            {!hasStructuredExperience && !isEditing && getAIContent("experience_section") && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Työkokemus</h2>
                <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: getAIContent("experience_section") }} />
              </section>
            )}

            <div className="grid grid-cols-2 gap-12">
              
              {/* STRUCTURED EDUCATION */}
              {(hasStructuredEducation || isEditing) ? (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Koulutus</h2>
                  {education.map((edu: any, idx: number) => (
                    <div key={idx} className="mb-4 relative">
                      {isEditing && <div className="absolute top-0 right-0"><DeleteBtn onClick={() => handleDeleteItem("education", idx)} title="Poista koulutus" /></div>}
                      <EditableText field={`education.${idx}.degree`} value={edu.degree || ""} tag="h4"
                        style={{ fontWeight: 600, fontSize: "14px", paddingRight: isEditing ? "24px" : "0" }} />
                      {(edu.institution || edu.school || isEditing) && (
                        <EditableText field={`education.${idx}.institution`} value={edu.institution || edu.school || ""} tag="p" placeholder="Oppilaitos"
                          style={{ fontSize: "13px", color: "#444" }} />
                      )}
                      {(edu.year || edu.period || isEditing) && (
                        <EditableText field={`education.${idx}.year`} value={edu.year || edu.period || ""} tag="p" placeholder="2020 - 2024"
                          style={{ fontSize: "12px", color: "#666", fontStyle: "italic" }} />
                      )}
                      {(Array.isArray(edu.details) && edu.details.length > 0) && (
                        <ul className="mt-1 ml-4 text-gray-600" style={{ listStyleType: "disc", fontSize: "13px" }}>
                          {edu.details.map((detail: string, dIdx: number) => (
                            <li key={dIdx} style={{ display: "flex", alignItems: "flex-start" }}>
                              <span style={{ flex: 1 }}><EditableText field={`education.${idx}.details.${dIdx}`} value={detail} style={{ fontSize: "13px" }} /></span>
                              <DeleteBtn onClick={() => handleDeleteItem(`education.${idx}.details`, dIdx)} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {isEditing && (
                    <div onClick={() => onUpdate?.(`education.${education.length}`, { degree: "Uusi tutkinto", institution: "Oppilaitos", year: "2020 - 2024", details: [] })}
                      className="p-2 border-2 border-dashed border-orange-400 rounded-lg text-center text-orange-500 cursor-pointer text-xs font-semibold hover:bg-orange-50 transition-colors">
                      + Lisää koulutus
                    </div>
                  )}
                </section>
              ) : (
                getAIContent("education_section") && (
                  <section>
                    <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Koulutus</h2>
                    <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: getAIContent("education_section") }} />
                  </section>
                )
              )}

              {/* STRUCTURED SKILLS */}
              {(hasStructuredSkills || isEditing) ? (
                <section>
                  <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Osaaminen</h2>
                  <ul style={{ listStyleType: "none", padding: 0 }}>
                    {skills.map((skill: any, idx: number) => {
                      const skillText = typeof skill === "string" ? skill : skill?.name || skill?.category || "";
                      return (
                        <li key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "6px", fontSize: "14px" }}>
                          <span style={{ color: "#3b82f6", marginRight: "8px" }}>•</span>
                          <span style={{ flex: 1 }}>
                            <EditableText field={`skills.${idx}`} value={skillText} style={{ fontSize: "14px" }} />
                          </span>
                          <DeleteBtn onClick={() => handleDeleteItem("skills", idx)} title="Poista taito" />
                        </li>
                      );
                    })}
                  </ul>
                  {isEditing && (
                    <div onClick={() => onUpdate?.(`skills.${skills.length}`, "Uusi taito")}
                      className="mt-2 p-2 border-2 border-dashed border-orange-400 rounded-lg text-center text-orange-500 cursor-pointer text-xs font-semibold hover:bg-orange-50 transition-colors">
                      + Lisää taito
                    </div>
                  )}
                </section>
              ) : (
                getAIContent("skills_section") && (
                  <section>
                    <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Osaaminen</h2>
                    <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: getAIContent("skills_section") }} />
                  </section>
                )
              )}
            </div>

            {/* LANGUAGES */}
            {getAIContent("languages_section") && (
              <section>
                <h2 className="text-blue-600 text-xs font-bold uppercase tracking-[0.2em] mb-6 border-b pb-2">Kielet</h2>
                <div className="prose prose-sm max-w-none text-gray-800" dangerouslySetInnerHTML={{ __html: getAIContent("languages_section") }} />
              </section>
            )}
          </div>

          {/* SIGNATURE */}
          <div className="mt-8 border-t pt-8">
            <p className="text-4xl text-blue-700 opacity-80" style={{ fontFamily: "'Brush Script MT', cursive" }}>
              {name}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCVTemplate;