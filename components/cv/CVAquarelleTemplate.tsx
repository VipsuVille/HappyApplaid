"use client";
// components/cv/CVAquarelleTemplate.tsx
// ════════════════════════════════════════════════════════════════════
//  AQUARELLE CV — TIE B SKIN
//  Ulkoasu käyttäjän luonnoksen mukaan:
//   • Vasen valkoinen palsta: käsialanimi, titteli-pilleri, iso kuva,
//     yhteystiedot (puhelin / email / synt.aika), OSAAMINEN/TAIDOT.
//   • Oikea akvarellisininen palsta: PROFIILI, KOULUTUS, TYÖKOKEMUS,
//     TYÖHARJOITTELUT/KESÄTYÖT.
//  Kaikki muokkaus + parserit tulevat useCVEngine:stä — tämä on vain skin.
//  Käyttää samoja kenttiä kuin muut skinit → tallennus/lataus toimii
//  sellaisenaan. Lisäkentät: simpleBlocks.profile (profiiliteksti),
//  birthDate (synt.aika), internships[] (harjoittelut/kesätyöt).
// ════════════════════════════════════════════════════════════════════

import React from "react";
import { UserFormData, AIData, EditMode } from "@/types";
import { useCVEngine } from "@/lib/cv/engine/useCVEngine";
import {
  InlineEditor, DragItem, AddBtn, EDITABLE_HOVER_CSS,
  type InlineEditorProps,
} from "@/lib/cv/engine/components";
import {
  type SectionScales, type ColumnScales, type LayoutConfig,
} from "@/lib/cv/engine/types";

export type { SectionScales, ColumnScales, LayoutConfig };

interface AquarelleCVTemplateProps {
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
  /** CV:n kieli — ohjaa otsikot. Jos ei anneta, luetaan datasta. */
  language?: string;
}

interface Internship {
  title: string;
  company: string;
  period: string;
  description: string;
}

// ── Kielikohtaiset tekstit (otsikot, paikkamerkit, napit) ───────────
const LABELS = {
  fi: {
    titlePlaceholder: "Titteli",
    taglinePlaceholder: "Lyhyt kuvaus itsestäsi…",
    photoPlaceholder: "Profiilikuva",
    phone: "Puhelinnumero",
    email: "sähköposti@esimerkki.fi",
    location: "Paikkakunta",
    birth: "1.1.2000",
    skills: "Osaaminen / Taidot",
    addSkill: "+ Lisää taito…",
    profile: "Profiili",
    profilePlaceholder: "Kerro lyhyesti kuka olet ja mitä haet.",
    education: "Koulutus",
    institution: "Oppilaitos",
    eduYear: "2020 – 2024",
    addEduDetail: "+ Lisää lisätieto…",
    addEdu: "+ Lisää koulutus",
    experience: "Työkokemus",
    period: "Ajanjakso",
    addBullet: "+ Lisää kohta…",
    addExp: "+ Lisää työkokemus",
    internships: "Työharjoittelut / Kesätyöt",
    intTitle: "Tehtävä",
    intCompany: "Paikka",
    intPeriod: "Kesä 2023",
    intDesc: "Lyhyt kuvaus",
    addInt: "+ Lisää harjoittelu / kesätyö",
    // siemenarvot uusille riveille
    seedSkill: "Uusi taito",
    seedDegree: "Tutkinto",
    seedInstitution: "Oppilaitos",
    seedYear: "2020 – 2024",
    seedDetail: "Lisätieto",
    seedExpTitle: "Tehtävä",
    seedCompany: "Yritys",
    seedPeriodNow: "2024 – nyt",
    seedBullet: "Kuvaus",
    seedIntTitle: "Tehtävä",
    seedIntCompany: "Paikka",
    seedIntPeriod: "Kesä 2024",
    seedIntDesc: "Kuvaus",
  },
  en: {
    titlePlaceholder: "Title",
    taglinePlaceholder: "A short summary about yourself…",
    photoPlaceholder: "Profile photo",
    phone: "Phone number",
    email: "email@example.com",
    location: "Location",
    birth: "1.1.2000",
    skills: "Skills",
    addSkill: "+ Add skill…",
    profile: "Profile",
    profilePlaceholder: "Briefly describe who you are and what you're looking for.",
    education: "Education",
    institution: "Institution",
    eduYear: "2020 – 2024",
    addEduDetail: "+ Add detail…",
    addEdu: "+ Add education",
    experience: "Work Experience",
    period: "Period",
    addBullet: "+ Add item…",
    addExp: "+ Add work experience",
    internships: "Internships / Summer Jobs",
    intTitle: "Role",
    intCompany: "Place",
    intPeriod: "Summer 2023",
    intDesc: "Short description",
    addInt: "+ Add internship / summer job",
    seedSkill: "New skill",
    seedDegree: "Degree",
    seedInstitution: "Institution",
    seedYear: "2020 – 2024",
    seedDetail: "Detail",
    seedExpTitle: "Role",
    seedCompany: "Company",
    seedPeriodNow: "2024 – now",
    seedBullet: "Description",
    seedIntTitle: "Role",
    seedIntCompany: "Place",
    seedIntPeriod: "Summer 2024",
    seedIntDesc: "Description",
  },
} as const;

const AquarelleCVTemplate: React.FC<AquarelleCVTemplateProps> = (props) => {
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
    fs, fsS, lh, getSec, sectionGap, move, commit,
    leftMm, rightMm,
    profileImg, getAI, data,
    skillCategories, workExperience, education, name, cvTitle,
  } = eng;

  const onUpdate = props.onUpdate;
  const onDelete = props.onDelete;

  // ── Kieli: prop > cv_data.language > ai_data.language/cv_language > fi ──
  const langRaw =
    props.language ||
    (data as any)?.language ||
    (props.aiData as any)?.language ||
    (props.aiData as any)?.cv_language ||
    "finnish";
  const isEn = String(langRaw).toLowerCase().startsWith("en");
  const L = isEn ? LABELS.en : LABELS.fi;

  // E = InlineEditor jolla isEditing + onCommit valmiiksi sidottu (sininen aksentti)
  const E = (p: Omit<InlineEditorProps, "isEditing" | "onCommit">) => (
    <InlineEditor {...p} isEditing={isEditing} onCommit={commit} accentColor="rgba(56,132,182" />
  );

  // ── Lisäkentät (luetaan suoraan cv_data:sta, tallennus säilyttää ne) ──
  const birthDate: string = (data as any)?.birthDate || "";
  const profileText: string =
    (data as any)?.simpleBlocks?.profile ?? getAI("personal_description" as keyof AIData) ?? "";
  const internships: Internship[] = Array.isArray((data as any)?.internships)
    ? (data as any).internships
    : [];

  // ── Tyylit ───────────────────────────────────────────────────────────
  const NAVY = "#1f3a4d";
  const ACCENT = "#3884b6";

  // Oikean palstan akvarelli-tausta (käytä taustakuvaa jos asetettu)
  const watercolor = props.backgroundImage || (eng as any).bgImage
    ? undefined
    : `
      radial-gradient(120% 80% at 85% 0%, rgba(120,190,225,0.55) 0%, rgba(120,190,225,0) 55%),
      radial-gradient(90% 70% at 15% 25%, rgba(86,165,210,0.45) 0%, rgba(86,165,210,0) 50%),
      radial-gradient(130% 90% at 70% 80%, rgba(150,205,230,0.50) 0%, rgba(150,205,230,0) 60%),
      radial-gradient(80% 60% at 30% 95%, rgba(70,150,200,0.35) 0%, rgba(70,150,200,0) 55%),
      linear-gradient(160deg, #dff0f8 0%, #bfe2f1 45%, #9fd2ea 100%)
    `;
  const bgImg = (eng as any).bgImage as string | null;

  // Oikean palstan osio-otsikko
  const RH: React.FC<{ children: React.ReactNode; sectionId: string }> = ({ children, sectionId }) => (
    <h2 style={{
      fontSize: fsS("12pt", sectionId, "right"), fontWeight: 800, color: NAVY,
      textTransform: "uppercase", letterSpacing: ".14em",
      marginBottom: fs("3.5mm"), fontFamily: "'Inter',sans-serif",
    }}>{children}</h2>
  );

  const contactRow = (
    icon: React.ReactNode, field: string, value: string, placeholder: string
  ) => (
    (value || isEditing) ? (
      <div style={{ display: "flex", alignItems: "center", gap: "3mm", marginBottom: fs("3.5mm") }}>
        <span style={{ color: ACCENT, display: "inline-flex", flexShrink: 0 }}>{icon}</span>
        {E({ field, value, placeholder, style: { fontSize: fs("9.5pt"), color: "#33444f", lineHeight: lh(1.3) } })}
      </div>
    ) : null
  );

  return (
    <div style={{ width: "210mm", minHeight: "297mm", position: "relative", background: "white", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Dancing+Script:wght@600;700&display=swap" rel="stylesheet" />
      <style>{EDITABLE_HOVER_CSS}</style>

      {/* ══ VASEN PALSTA (valkoinen) ══ */}
      <div style={{ position: "absolute", left: 0, top: 0, width: `${leftMm}mm`, minHeight: "297mm", background: "white", padding: "14mm 9mm 10mm", boxSizing: "border-box" }}>
        {/* Käsialanimi */}
        {E({ field: "name", value: name, tag: "h1", style: {
          fontFamily: "'Dancing Script',cursive", fontSize: fs("34pt"), fontWeight: 700,
          color: NAVY, lineHeight: 1.05, marginBottom: fs("4mm"), display: "block",
        } })}

        {/* Titteli-pilleri */}
        <div style={{ display: "inline-block", background: "#dcebf3", borderRadius: "999px", padding: "2mm 6mm", marginBottom: fs("4mm") }}>
          {E({ field: "title", value: cvTitle, placeholder: L.titlePlaceholder, style: {
            fontSize: fs("11pt"), fontWeight: 600, color: NAVY, letterSpacing: ".02em",
          } })}
        </div>

        {/* Kuvaava rivi (valinnainen tagline) */}
        {((data as any)?.simpleBlocks?.tagline || isEditing) && (
          <p style={{ marginBottom: fs("6mm") }}>
            {E({ field: "simpleBlocks.tagline", value: (data as any)?.simpleBlocks?.tagline || "", multiline: true,
              placeholder: L.taglinePlaceholder,
              style: { fontSize: fs("9.5pt"), color: "#55656e", lineHeight: lh(1.5), fontStyle: "italic" } })}
          </p>
        )}

        {/* Profiilikuva (iso, portrait) */}
        <div style={{ width: "100%", aspectRatio: "3 / 4", borderRadius: "3px", overflow: "hidden", background: "#111", marginBottom: fs("7mm") }}>
          {profileImg
            ? <img src={profileImg} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#9aa", fontSize: fs("11pt"), letterSpacing: ".05em" }}>{L.photoPlaceholder}</div>}
        </div>

        {/* Yhteystiedot */}
        <div style={{ marginBottom: fs("8mm") }}>
          {contactRow(
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
            "phone", data?.phone || "", L.phone
          )}
          {contactRow(
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
            "email", data?.email || "", L.email
          )}
          {contactRow(
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>,
            "location", data?.location || "", L.location
          )}
          {contactRow(
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 21h16M4 21V10h16v11M4 10l8-6 8 6M9 14h.01M15 14h.01"/></svg>,
            "birthDate", birthDate, L.birth
          )}
        </div>

        {/* OSAAMINEN / TAIDOT */}
        {!getSec("skills").hidden && (skillCategories.length > 0 || isEditing) && (
          <div>
            <h2 style={{ fontSize: fsS("11.5pt", "skills", "left"), fontWeight: 800, color: NAVY, textTransform: "uppercase", letterSpacing: ".12em", borderBottom: `2px solid ${NAVY}`, paddingBottom: "1.5mm", marginBottom: fs("4mm") }}>
              {L.skills}
            </h2>
            {skillCategories.map((cat, ci) => (
              <div key={ci} style={{ marginBottom: fsS("4mm", "skills", "left") }}>
                {skillCategories.length > 1 && E({ field: `skills.${ci}.category`, value: cat.category, tag: "h3", style: { fontSize: fsS("9.5pt", "skills", "left"), fontWeight: 700, color: ACCENT, marginBottom: "1.5mm" } })}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {cat.items.map((skill, si) => (
                    <DragItem key={`sk-${ci}-${si}`} index={si} total={cat.items.length} isEditing={isEditing}
                      onMoveUp={() => { const n = skillCategories.map((c, i) => i === ci ? { ...c, items: move(c.items, si, si - 1) } : c); onUpdate?.("skills", n); }}
                      onMoveDown={() => { const n = skillCategories.map((c, i) => i === ci ? { ...c, items: move(c.items, si, si + 1) } : c); onUpdate?.("skills", n); }}
                      onDelete={() => { const n = skillCategories.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== si) } : c); onUpdate?.("skills", n); }}
                      style={{ marginBottom: fsS("2mm", "skills", "left"), paddingLeft: "4mm", position: "relative" }}
                    >
                      <li style={{ listStyle: "none", color: "#33444f", fontSize: fsS("9pt", "skills", "left"), lineHeight: lh(1.5) }}>
                        <span style={{ position: "absolute", left: 0, color: ACCENT, fontWeight: 700 }}>•</span>
                        {E({ field: `skills.${ci}.items.${si}`, value: skill, style: { color: "#33444f", fontSize: fsS("9pt", "skills", "left") } })}
                      </li>
                    </DragItem>
                  ))}
                  {isEditing && (
                    <li style={{ paddingLeft: "4mm", color: ACCENT, cursor: "pointer", fontStyle: "italic", opacity: .75, fontSize: fsS("9pt", "skills", "left"), listStyle: "none", marginTop: "1.5mm" }}
                      onClick={() => { const n = skillCategories.map((c, i) => i === ci ? { ...c, items: [...c.items, L.seedSkill] } : c); onUpdate?.("skills", n); }}>
                      {L.addSkill}
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══ OIKEA PALSTA (akvarelli) ══ */}
      <div style={{
        marginLeft: `${leftMm}mm`, width: `${rightMm}mm`, minHeight: "297mm",
        background: bgImg ? undefined : watercolor,
        backgroundImage: bgImg ? `linear-gradient(rgba(223,240,248,0.78),rgba(159,210,234,0.78)), url(${bgImg})` : undefined,
        backgroundSize: "cover", backgroundPosition: "center",
        padding: "14mm 11mm 12mm", boxSizing: "border-box",
      }}>
        {/* PROFIILI */}
        {!getSec("profile").hidden && (profileText || isEditing) && (
          <section style={{ marginBottom: sectionGap("profile") }}>
            <RH sectionId="profile">{L.profile}</RH>
            <p style={{ fontSize: fsS("9.5pt", "profile", "right"), color: "#2b3b44", lineHeight: lh(1.7) }}>
              {E({ field: "simpleBlocks.profile", value: profileText, multiline: true,
                placeholder: L.profilePlaceholder,
                style: { fontSize: fsS("9.5pt", "profile", "right"), color: "#2b3b44", lineHeight: lh(1.7) } })}
            </p>
          </section>
        )}

        {/* KOULUTUS */}
        {!getSec("education").hidden && (
          <section style={{ marginBottom: sectionGap("education") }}>
            <RH sectionId="education">{L.education}</RH>
            {education.map((edu, idx) => (
              <DragItem key={`edu-${idx}`} index={idx} total={education.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.("education", move(education, idx, idx - 1))}
                onMoveDown={() => onUpdate?.("education", move(education, idx, idx + 1))}
                onDelete={() => onDelete?.("education", idx)}
                style={{ marginBottom: fsS("5mm", "education", "right") }}
              >
                {E({ field: `education.${idx}.degree`, value: edu.degree, tag: "h4", style: { fontSize: fsS("10pt", "education", "right"), fontWeight: 700, color: NAVY, lineHeight: lh(1.3), marginBottom: "0.5mm" } })}
                {(edu.institution || isEditing) && E({ field: `education.${idx}.institution`, value: edu.institution, tag: "p", placeholder: L.institution, style: { fontSize: fsS("9pt", "education", "right"), color: "#33444f", lineHeight: lh(1.4) } })}
                {(edu.year || isEditing) && E({ field: `education.${idx}.year`, value: edu.year, tag: "p", placeholder: L.eduYear, style: { fontSize: fsS("8.5pt", "education", "right"), color: "#5a6b73", fontStyle: "italic", lineHeight: lh(1.3) } })}
                <ul style={{ marginTop: fs("1.5mm"), paddingLeft: "5mm", fontSize: fsS("8.5pt", "education", "right"), lineHeight: lh(1.6) }}>
                  {edu.details.map((d, di) => (
                    <DragItem key={`edu-${idx}-d-${di}`} index={di} total={edu.details.length} isEditing={isEditing}
                      onMoveUp={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di - 1))}
                      onMoveDown={() => onUpdate?.(`education.${idx}.details`, move(edu.details, di, di + 1))}
                      onDelete={() => onDelete?.(`education.${idx}.details`, di)}
                      style={{ marginBottom: fs("1mm") }}
                    >
                      <li style={{ color: "#33444f", listStyle: "disc" }}>
                        {E({ field: `education.${idx}.details.${di}`, value: d, multiline: true, style: { color: "#33444f", fontSize: fsS("8.5pt", "education", "right"), lineHeight: lh(1.5) } })}
                      </li>
                    </DragItem>
                  ))}
                  {isEditing && (
                    <li style={{ color: ACCENT, cursor: "pointer", fontStyle: "italic", opacity: .7, listStyle: "none", marginTop: "1.5mm" }}
                      onClick={() => onUpdate?.(`education.${idx}.details.${edu.details.length}`, L.seedDetail)}>{L.addEduDetail}</li>
                  )}
                </ul>
              </DragItem>
            ))}
            {isEditing && <AddBtn label={L.addEdu} onClick={() => onUpdate?.(`education.${education.length}`, { degree: L.seedDegree, institution: L.seedInstitution, year: L.seedYear, details: [] })} />}
          </section>
        )}

        {/* TYÖKOKEMUS */}
        {!getSec("experience").hidden && (
          <section style={{ marginBottom: sectionGap("experience") }}>
            <RH sectionId="experience">{L.experience}</RH>
            {workExperience.map((job, idx) => (
              <DragItem key={`exp-${idx}`} index={idx} total={workExperience.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.("experience", move(workExperience, idx, idx - 1))}
                onMoveDown={() => onUpdate?.("experience", move(workExperience, idx, idx + 1))}
                onDelete={() => onDelete?.("experience", idx)}
                style={{ marginBottom: fsS("5.5mm", "experience", "right") }}
              >
                <h4 style={{ fontSize: fsS("10pt", "experience", "right"), fontWeight: 700, color: NAVY, lineHeight: lh(1.3), marginBottom: "0.5mm" }}>
                  {E({ field: `experience.${idx}.title`, value: job.title, style: { fontWeight: 700, color: NAVY, fontSize: fsS("10pt", "experience", "right") } })}
                  <span style={{ fontWeight: 400, color: "#5a6b73" }}> — </span>
                  {E({ field: `experience.${idx}.company`, value: job.company, style: { fontWeight: 600, color: NAVY, fontSize: fsS("10pt", "experience", "right") } })}
                </h4>
                {(job.period || isEditing) && E({ field: `experience.${idx}.period`, value: job.period, tag: "p", placeholder: L.period, style: { fontSize: fsS("8.5pt", "experience", "right"), color: "#5a6b73", fontStyle: "italic", marginBottom: fs("1mm"), lineHeight: lh(1.4) } })}
                <ul style={{ marginTop: fs("1.5mm"), paddingLeft: "5mm", fontSize: fsS("9pt", "experience", "right"), lineHeight: lh(1.6) }}>
                  {job.bullets.map((b, bi) => (
                    <DragItem key={`exp-${idx}-b-${bi}`} index={bi} total={job.bullets.length} isEditing={isEditing}
                      onMoveUp={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi - 1))}
                      onMoveDown={() => onUpdate?.(`experience.${idx}.bullets`, move(job.bullets, bi, bi + 1))}
                      onDelete={() => onDelete?.(`experience.${idx}.bullets`, bi)}
                      style={{ marginBottom: fs("1mm") }}
                    >
                      <li style={{ color: "#33444f", listStyle: "disc" }}>
                        {E({ field: `experience.${idx}.bullets.${bi}`, value: b, multiline: true, style: { color: "#33444f", fontSize: fsS("9pt", "experience", "right"), lineHeight: lh(1.6) } })}
                      </li>
                    </DragItem>
                  ))}
                  {isEditing && (
                    <li style={{ color: ACCENT, cursor: "pointer", fontStyle: "italic", opacity: .7, listStyle: "none", marginTop: "1.5mm" }}
                      onClick={() => onUpdate?.(`experience.${idx}.bullets.${job.bullets.length}`, L.seedBullet)}>{L.addBullet}</li>
                  )}
                </ul>
              </DragItem>
            ))}
            {isEditing && <AddBtn label={L.addExp} onClick={() => onUpdate?.(`experience.${workExperience.length}`, { title: L.seedExpTitle, company: L.seedCompany, period: L.seedPeriodNow, bullets: [L.seedBullet] })} />}
          </section>
        )}

        {/* TYÖHARJOITTELUT / KESÄTYÖT */}
        {!getSec("internships").hidden && (
          <section style={{ marginBottom: sectionGap("internships") }}>
            <RH sectionId="internships">{L.internships}</RH>
            {internships.map((it, idx) => (
              <DragItem key={`int-${idx}`} index={idx} total={internships.length} isEditing={isEditing}
                onMoveUp={() => onUpdate?.("internships", move(internships, idx, idx - 1))}
                onMoveDown={() => onUpdate?.("internships", move(internships, idx, idx + 1))}
                onDelete={() => onDelete?.("internships", idx)}
                style={{ marginBottom: fsS("5mm", "internships", "right") }}
              >
                <h4 style={{ fontSize: fsS("10pt", "internships", "right"), fontWeight: 700, color: NAVY, lineHeight: lh(1.3), marginBottom: "0.5mm" }}>
                  {E({ field: `internships.${idx}.title`, value: it.title, placeholder: L.intTitle, style: { fontWeight: 700, color: NAVY, fontSize: fsS("10pt", "internships", "right") } })}
                  <span style={{ fontWeight: 400, color: "#5a6b73" }}> — </span>
                  {E({ field: `internships.${idx}.company`, value: it.company, placeholder: L.intCompany, style: { fontWeight: 600, color: NAVY, fontSize: fsS("10pt", "internships", "right") } })}
                </h4>
                {(it.period || isEditing) && E({ field: `internships.${idx}.period`, value: it.period, tag: "p", placeholder: L.intPeriod, style: { fontSize: fsS("8.5pt", "internships", "right"), color: "#5a6b73", fontStyle: "italic", marginBottom: fs("1mm"), lineHeight: lh(1.4) } })}
                {(it.description || isEditing) && E({ field: `internships.${idx}.description`, value: it.description, tag: "p", multiline: true, placeholder: L.intDesc, style: { fontSize: fsS("9pt", "internships", "right"), color: "#33444f", lineHeight: lh(1.6) } })}
              </DragItem>
            ))}
            {isEditing && <AddBtn label={L.addInt} onClick={() => onUpdate?.(`internships.${internships.length}`, { title: L.seedIntTitle, company: L.seedIntCompany, period: L.seedIntPeriod, description: L.seedIntDesc })} />}
          </section>
        )}
      </div>
    </div>
  );
};

export default AquarelleCVTemplate;