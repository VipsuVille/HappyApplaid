// lib/cv/profileToStructured.ts
// Muuntaa profiilin (user_profiles) alkiot CV-templaten strukturoituun muotoon.
// Sama bullet-logiikka kuin cvGenerator.humanizeWorkExperience, jotta
// käsin lisätty kokemus näyttää samalta kuin AI:n tuottama.

export interface StructuredExperience {
  title: string;
  company: string;
  period: string;
  bullets: string[];
}

/** Yksi profiilin work_experience -alkio → template-muoto */
export function mapProfileJobToStructured(job: any): StructuredExperience {
  const title = job?.position || job?.title || job?.role || "Tehtävä";
  const company = job?.company || job?.employer || job?.organization || "";
  const period = job?.duration || job?.period || job?.dates || "";

  // Kokoa bulletit samoista kentistä kuin cvGenerator
  const bullets = [
    job?.description,
    job?.biggestAchievement,
    job?.whatYouLearned,
    job?.howYourStrengthShowed,
  ]
    .filter((b: any) => typeof b === "string" && b.trim().length > 0)
    .map((b: string) => b.trim());

  return { title, company, period, bullets };
}

/** Vakaa avain duplikaattien tunnistukseen: yritys + tehtävä, pienaakkosin */
export function experienceKey(company?: string, title?: string): string {
  return `${(company || "").trim().toLowerCase()}|${(title || "").trim().toLowerCase()}`;
}

/** Normalisoi vertailua varten: pienaakkoset, poista yhtiömuodot ja välimerkit */
function normalizeForMatch(s?: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/\b(oy|oyj|ab|ltd|inc|ky|tmi)\b/g, "")
    .replace(/[^\wäöå\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Onko tämä profiilin työ todennäköisesti jo CV:n työlistalla? */
export function jobLikelyExists(
  job: { company: string; title: string },
  cvJobs: any[]
): boolean {
  const jc = normalizeForMatch(job.company);
  const jt = normalizeForMatch(job.title);

  return (cvJobs || []).some((e: any) => {
    const ec = normalizeForMatch(e?.company);
    const et = normalizeForMatch(e?.title || e?.position);

    // Yritys täsmää (kumpi tahansa sisältää toisen) → osuma
    if (jc && ec && (ec.includes(jc) || jc.includes(ec))) return true;
    // Tai tehtävänimike täsmää selvästi
    if (jt && et && (et.includes(jt) || jt.includes(et))) return true;
    return false;
  });
}

// ── PROJEKTIT (portfolioLinks) ──────────────────────────────────────

export interface StructuredProject {
  title: string;
  description: string;
  link: string;
}

/** Profiilin portfolioLinks-alkio → template-muoto */
export function mapProfileProjectToStructured(p: any): StructuredProject {
  return {
    title: p?.title || p?.name || "Projekti",
    description: p?.description || "",
    link: p?.url || p?.link || "",
  };
}

/** Onko projekti todennäköisesti jo CV:ssä? (otsikko tai linkki täsmää) */
export function projectLikelyExists(
  project: StructuredProject,
  cvProjects: any[]
): boolean {
  const pt = normalizeForMatch(project.title);
  const pl = (project.link || "").toLowerCase().replace(/\/+$/, "").trim();

  return (cvProjects || []).some((e: any) => {
    const et = normalizeForMatch(e?.title);
    const el = (e?.link || "").toLowerCase().replace(/\/+$/, "").trim();
    if (pt && et && (et.includes(pt) || pt.includes(et))) return true;
    if (pl && el && pl === el) return true;
    return false;
  });
}

// ── KOULUTUS (education) ─────────────────────────────────────────────

export interface StructuredEducation {
  degree: string;        // tutkinto / nimike, esim. "Datanomi"
  institution: string;   // oppilaitos, esim. "HAMK" — TEMPLATE lukee tätä
  school: string;        // alias institutionille (ehdotuslistan näyttöä varten)
  year: string;          // ajankohta, esim. "2021" tai "2021–2024"
  details: string[];     // lisätiedot — TEMPLATE lukee tätä
  bullets: string[];     // alias details:ille
}

/** Yksi profiilin education-alkio → template-muoto.
 *  Joustava kenttänimien suhteen (eri lähteet käyttävät eri nimiä). */
export function mapProfileEducationToStructured(edu: any): StructuredEducation {
  const degree = edu?.degree || edu?.title || edu?.qualification || edu?.program || edu?.field || "Tutkinto";
  const institution = edu?.school || edu?.institution || edu?.organization || edu?.university || edu?.name || "";
  const year = edu?.year || edu?.period || edu?.duration || edu?.dates || edu?.graduationYear || "";

  const details = [
    edu?.description,
    typeof edu?.details === "string" ? edu.details : undefined,
    edu?.thesis,
  ]
    .filter((b: any) => typeof b === "string" && b.trim().length > 0)
    .map((b: string) => b.trim());

  // Palauta sekä template-kentät (institution, details) että aliakset (school, bullets)
  return { degree, institution, school: institution, year, details, bullets: details };
}

/** Onko koulutus todennäköisesti jo CV:ssä? (oppilaitos + tutkinto täsmää) */
export function educationLikelyExists(
  education: { degree: string; school: string },
  cvEducation: any[]
): boolean {
  const ed = normalizeForMatch(education.degree);
  const es = normalizeForMatch(education.school);

  return (cvEducation || []).some((e: any) => {
    const cd = normalizeForMatch(e?.degree || e?.title || e?.qualification);
    const cs = normalizeForMatch(e?.school || e?.institution || e?.university);

    // Oppilaitos täsmää (kumpi tahansa sisältää toisen) → osuma
    if (es && cs && (cs.includes(es) || es.includes(cs))) return true;
    // Tai tutkintonimike täsmää selvästi
    if (ed && cd && (cd.includes(ed) || ed.includes(cd))) return true;
    return false;
  });
}