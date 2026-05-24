"use client";
// lib/cv/engine/useCVEngine.ts
// ════════════════════════════════════════════════════════════════════
//  CV-MUOKKAUSMOOTTORI (Tie B)
//  Tarjoaa parsitun datan + skaalafunktiot + muokkausapurit.
//  EI tiedä miltä CV näyttää — templatet (skinit) hoitavat ulkoasun.
//  EI vaadi ai_data:a toimiakseen — mahdollistaa ilmaisen ei-AI-polun.
// ════════════════════════════════════════════════════════════════════

import { useCallback, useMemo } from "react";
import type { AIData } from "@/types";
import {
  type CVEngineConfig,
  type SectionScale, type SectionScales, type ColumnScales, type LayoutConfig,
  type EngineExperience, type EngineEducation, type EngineProject, type EngineSkillCategory,
  DEFAULT_SECTION_SCALE, DEFAULT_COLUMN_SCALES, DEFAULT_LAYOUT, PAGE_WIDTH_MM,
} from "./types";

export function useCVEngine(config: CVEngineConfig) {
  const {
    data, aiData, isEditing, onUpdate, onDelete,
    profileImage, backgroundImage,
    fontScale: fontScaleProp, lineScale: lineScaleProp,
    sectionScales: sectionScalesProp, columnScales: columnScalesProp, layout: layoutProp,
  } = config;

  // ── Skaalat ───────────────────────────────────────────────────────
  const fontScale = fontScaleProp ?? (data as any)?.fontScale ?? 1.0;
  const lineScale = lineScaleProp ?? (data as any)?.lineScale ?? 1.0;

  const sectionScales: SectionScales =
    sectionScalesProp ?? (data as any)?.sectionScales ?? {};
  const columnScales: ColumnScales =
    columnScalesProp ?? (data as any)?.columnScales ?? DEFAULT_COLUMN_SCALES;

  const layout: LayoutConfig = {
    ...DEFAULT_LAYOUT,
    ...((data as any)?.layout || {}),
    ...(layoutProp || {}),
  };
  const leftMm = layout.leftColumnMm;
  const rightMm = PAGE_WIDTH_MM - leftMm;
  const bannerMm = layout.bannerHeightMm;

  const getSec = useCallback((id: string): SectionScale => ({
    ...DEFAULT_SECTION_SCALE,
    ...(sectionScales[id] || {}),
  }), [sectionScales]);

  const fsFor = useCallback((sectionId: string, column: "left" | "right") => {
    const sec = { ...DEFAULT_SECTION_SCALE, ...(sectionScales[sectionId] || {}) };
    const col = column === "left" ? columnScales.left : columnScales.right;
    return fontScale * (col ?? 1) * (sec.fontScale ?? 1);
  }, [sectionScales, columnScales, fontScale]);

  const scaleVal = (base: string, mult: number): string => {
    const match = base.match(/^([\d.]+)(pt|mm|px|em|rem)$/);
    if (!match) return base;
    return `${(parseFloat(match[1]) * mult).toFixed(2)}${match[2]}`;
  };

  const fs = useCallback((base: string): string => scaleVal(base, fontScale), [fontScale]);
  const fsS = useCallback((base: string, sectionId: string, column: "left" | "right"): string =>
    scaleVal(base, fsFor(sectionId, column)), [fsFor]);
  const lh = useCallback((base: number): number => parseFloat((base * lineScale).toFixed(3)), [lineScale]);
  const sectionGap = useCallback((sectionId: string): string =>
    scaleVal("7mm", fontScale * ({ ...DEFAULT_SECTION_SCALE, ...(sectionScales[sectionId] || {}) }.gap ?? 1)),
    [fontScale, sectionScales]);

  // ── Muokkausapurit ─────────────────────────────────────────────────
  const commit = useCallback((field: string, val: string) => {
    onUpdate?.(field, val);
  }, [onUpdate]);

  const move = useCallback(<T,>(arr: T[], from: number, to: number): T[] => {
    if (to < 0 || to >= arr.length) return arr;
    const n = [...arr]; const [x] = n.splice(from, 1); n.splice(to, 0, x); return n;
  }, []);

  // ── Kuvat ───────────────────────────────────────────────────────────
  const isValidImg = (s?: string | null) => {
    if (!s) return false;
    const t = s.trim();
    return !!t && !t.includes("cv_files/default") && (t.startsWith("http") || t.startsWith("data:image"));
  };
  const profileImg = useMemo(() => {
    for (const s of [profileImage, (data as any)?.profile_image, (data as any)?.profileImage, (data as any)?.photo, aiData?.profile_image])
      if (isValidImg(s)) return (s as string).trim();
    return null;
  }, [profileImage, data, aiData]);
  const bgImage = useMemo(() => {
    for (const s of [backgroundImage, (data as any)?.background_image, (data as any)?.backgroundImage, aiData?.background_image, aiData?.background_image_url])
      if (isValidImg(s)) return (s as string).trim();
    return null;
  }, [backgroundImage, data, aiData]);

  // ── AI-sisältö (valinnainen — moottori toimii ilmankin) ─────────────
  const getAI = useCallback((field: keyof AIData): string => {
    let c: any = aiData?.[field];
    if (!c && aiData?.html) c = (aiData.html as any)[field];
    if (typeof c === "string" && c.trim().length > 20 && !c.toLowerCase().includes("error generating")) return c;
    return "";
  }, [aiData]);

  // ── Parse: skills ───────────────────────────────────────────────────
  const skillCategories = useMemo((): EngineSkillCategory[] => {
    if (data?.skills && Array.isArray(data.skills) && data.skills.length > 0) {
      if (typeof data.skills[0] === "string") {
        return [{ category: "Skills", items: data.skills as string[] }];
      }
      const first: any = data.skills[0];
      if (first && Array.isArray(first.items)) {
        return (data.skills as any[]).map((c: any) => ({
          category: c.category || "Skills",
          items: Array.isArray(c.items) ? c.items : [],
        }));
      }
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
    const cats: EngineSkillCategory[] = [];
    doc.querySelectorAll("h3,h4,strong").forEach(h => {
      const cat = h.textContent?.trim() || "Skills"; const items: string[] = [];
      let nx = h.nextElementSibling;
      while (nx?.tagName === "UL") { nx.querySelectorAll("li").forEach(li => { const t = li.textContent?.trim(); if (t) items.push(t); }); nx = nx.nextElementSibling; }
      if (items.length) cats.push({ category: cat, items });
    });
    if (!cats.length) { const lines = html.replace(/<[^>]+>/g, "").split("\n").filter(l => l.trim()); if (lines.length) cats.push({ category: "Skills", items: lines }); }
    return cats;
  }, [data?.skills, getAI]);

  // ── Parse: experience ───────────────────────────────────────────────
  const workExperience = useMemo((): EngineExperience[] => {
    if (data?.experience && Array.isArray(data.experience) && data.experience.length > 0)
      return data.experience.filter((e: any) => e != null).map((e: any) => ({
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
    const jobs: EngineExperience[] = [];
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

  // ── Parse: education ────────────────────────────────────────────────
  const education = useMemo((): EngineEducation[] => {
    if (data?.education && Array.isArray(data.education) && data.education.length > 0)
      return data.education.filter((e: any) => e != null).map((e: any) => ({
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
    const list: EngineEducation[] = [];
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

  // ── Parse: projects ─────────────────────────────────────────────────
  const projects = useMemo((): EngineProject[] => {
    const raw = (data as any)?.projects ?? (data as any)?.portfolioLinks ?? (data as any)?.portfolio_links;
    if (Array.isArray(raw)) {
      return raw
        .filter((p: any) => p != null)
        .map((p: any) => ({
          title: p.title || p.name || "Projekti",
          description: p.description || "",
          link: p.url || p.link || "",
        }))
        .filter((p: EngineProject) => p.title || p.description || p.link);
    }
    return [];
  }, [(data as any)?.projects, (data as any)?.portfolioLinks]);

  const name = data?.name || "Name";
  const cvTitle = data?.title || "Professional Title";

  return {
    // raaka konfiguraatio
    data, aiData, isEditing, onUpdate, onDelete,
    // skaalat & layout
    fontScale, lineScale, leftMm, rightMm, bannerMm,
    getSec, fsFor, fs, fsS, lh, sectionGap,
    // apurit
    commit, move, getAI,
    // kuvat
    profileImg, bgImage,
    // parsittu data
    skillCategories, workExperience, education, projects, name, cvTitle,
  };
}

export type CVEngine = ReturnType<typeof useCVEngine>;