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