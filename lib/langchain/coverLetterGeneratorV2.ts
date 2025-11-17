// lib/langchain/coverLetterGeneratorV2.ts - ATS-OPTIMOITU
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

// ✅ STRUKTUROITU SCHEMA - 3 OSIOTA
const atsOptimizedCoverLetterSchema = z.object({
  // OSIO 1: ESITTELY (150-200 sanaa)
  introduction: z.object({
    opening_hook: z.string().describe("Vahva avaava lause joka herättää mielenkiinnon"),
    personality_summary: z.string().describe("2-3 lausetta persoonallisuudesta ja arvoista"),
    unique_value: z.string().describe("Mikä tekee sinut ainutlaatuiseksi tähän rooliin"),
  }),

  // OSIO 2: OSAAMINEN (200-250 sanaa)
  expertise: z.object({
    relevant_experience: z.string().describe("Työkokemus tai vastaava osaaminen"),
    skills_match: z.string().describe("Kuinka taitosi vastaavat työpaikan vaatimuksia"),
    achievements: z.string().describe("Konkreettiset saavutukset tai esimerkit"),
    gap_compensation: z.string().optional().describe("Jos ei kokemusta, korvaavat vahvuudet"),
  }),

  // OSIO 3: MOTIVAATIO (100-150 sanaa)
  motivation: z.object({
    why_this_job: z.string().describe("Miksi juuri tämä työpaikka kiinnostaa"),
    career_goals: z.string().describe("Miten tämä sopii urasuunnitelmiin"),
    call_to_action: z.string().describe("Innostunut lopetus + toimintakehotus"),
  }),

  // ATS-METADATA
  ats_data: z.object({
    matched_keywords: z.array(z.string()).describe("Työpaikkailmoituksen avainsanat"),
    missing_experience: z.boolean().describe("Onko työkokemus puutteellinen"),
    compensation_strategy: z.string().optional().describe("Miten puutteet kompensoitu"),
    readability_score: z.number().min(1).max(10).describe("Luettavuus 1-10"),
  }),
});

type ATSCoverLetter = z.infer<typeof atsOptimizedCoverLetterSchema>;

// ✅ ANALYSOI TYÖPAIKKAILMOITUS
async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const prompt = `
Analysoi tämä työpaikkailmoitus ATS-optimointia varten:

${jobDescription}

Palauta **VAIN RAADATA JSON-OBJEKTI ILMAN MITÄÄN MARKKDOWN-MUOTOILUA (EI \`\`\`json tai \`\`\`):**
{
  "keywords": ["avainsana1", "avainsana2", ...], // TÄRKEIMMÄT 10-15 sanaa
  "required_skills": ["taito1", "taito2", ...],
  "required_experience": "0-2 vuotta" tai "ei mainittu",
  "soft_skills": ["tiimityö", "kommunikaatio", ...],
  "company_values": ["innovatiivisuus", "asiakaslähtöisyys", ...]
}
`;

  const response = await model.invoke(prompt);
  
  // 🚨 KÄYTÄ CLEAN-funktiota ENNEN PARSINTAA
  const cleaned = cleanJsonResponse(response.content as string);
  
  return JSON.parse(cleaned); // Korjattu
}
function cleanJsonResponse(text: string): string {
  // Poista kaikki markdown koodilohkot: ```json...``` tai ```...```
  let cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Poista mahdolliset ylimääräiset lainausmerkit alusta/lopusta, jos malli ne lisää
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned;
}
// ✅ PÄÄGENERAATTORI - 3 OSIOTA + ATS
export async function generateATSOptimizedCoverLetter(input: {
  // Pakollinen
  jobDescription: string;
  name: string;
  email: string;
  phone: string;

  // Profiilitiedot
  workExperience?: string;
  education?: string;
  skills?: string;

  // PERSOONALLISUUS (Simple CV:n ydin!)
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;

  // Valinnainen
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual";
}) {
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);

  // ✅ TUNNISTA TYÖKOKEMUKSEN PUUTE
  const hasWorkExperience =
    input.workExperience && input.workExperience.length > 100;
  const needsCompensation = !hasWorkExperience;

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const outputParser = StructuredOutputParser.fromZodSchema(
    atsOptimizedCoverLetterSchema
  );

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
`Olet ATS-optimoitu hakukirjegeneraattori. Luo AINA 3-osainen rakenne.
**KRIITTISET SÄÄNNÖT:** Palauta **VAIN** JSON-objekti ilman mitään Markdown-muotoilua tai koodilohkoja (ei \`\`\`json tai \`\`\`):
1. **OSIO 1 (Esittely):** 150-200 sanaa - Persoonallisuus + ainutlaatuinen arvo
2. **OSIO 2 (Osaaminen):** 200-250 sanaa - Kokemus TAI persoonallinen osaaminen
3. **OSIO 3 (Motivaatio):** 100-150 sanaa - Miksi tämä työ + tavoitteet

**KIELI JA TYYLI:**
- Kirjoita KOKO hakukirje tällä kielellä: {language}
- Käytä {style} tyyliä
- {styleInstructions}

**ATS-OPTIMOINTI:**
- Käytä työpaikkailmoituksen avainsanoja: {keywords}
- Jos työkokemus puuttuu → korosta persoonallisuutta, oppimiskykyä, transferable skills
- Pidä yhden A4-sivun pituus (max 500 sanaa YHTEENSÄ)
- Vältä tyhjää puhetta - AINA konkreettiset esimerkit

**TYÖKOKEMUKSEN PUUTE:** {needsCompensation}
{compensationStrategy}

{format_instructions}`,
    ],
    [
      "human",
      `
TYÖPAIKKAILMOITUS:
{jobDescription}

HAKIJAN PROFIILI:
Nimi: {name}
Työkokemus: {workExperience}
Koulutus: {education}
Taidot: {skills}

PERSOONALLISUUS (SIMPLE CV:N YDIN):
- Työtyyli: {workingStyle}
- Ongelmanratkaisu: {problemSolving}
- Energianlähteet: {energySources}
- Ainutlaatuinen vahvuus: {uniqueStrength}
- Oppimistyyli: {learningStyle}
- Tiimirooli: {teamRole}
- Ammatti-identiteetti: {superpower}
- Arvoesimerkki: {valuesExample}

LISÄTIEDOT: {personalNotes}

LUO 3-OSAINEN, ATS-OPTIMOITU HAKUKIRJE.
`,
    ],
  ]);

  const formattedPrompt = await prompt.formatMessages({
    keywords: jobAnalysis.keywords.join(", "),
    needsCompensation: needsCompensation ? "KYLLÄ - EI TYÖKOKEMUSTA" : "EI",
    compensationStrategy: needsCompensation
      ? `
KOSKA TYÖKOKEMUS PUUTTUU:
1. Korosta persoonallisuutta (workingStyle, uniqueStrength, superpower)
2. Käytä problemSolving-esimerkkiä näyttämään kykyjä
3. Painota learningStyle - näytä oppimiskyky
4. Tuo esiin transferable skills (koulutus, harrastukset, vapaaehtoistoiminta)
5. Älä KOSKAAN mainitse "ei kokemusta" - keskity siihen mitä ON
`
      : "Työkokemus löytyy - käytä sitä pääargumenttina",
    language: input.language || "finnish",
    style: input.style || "formal",
    jobDescription: input.jobDescription,
    name: input.name,
    workExperience: input.workExperience || "Ei mainittavaa työkokemusta",
    education: input.education || "Ei mainittu",
    skills: input.skills || "Monipuolinen osaaminen",
    workingStyle: input.workingStyle || "Ei kerrottu",
    problemSolving: input.problemSolving || "Ei kerrottu",
    energySources: input.energySources || "Ei kerrottu",
    uniqueStrength: input.uniqueStrength || "Ei kerrottu",
    learningStyle: input.learningStyle || "Ei kerrottu",
    teamRole: input.teamRole || "Ei kerrottu",
    superpower: input.superpower || "Ei kerrottu",
    valuesExample: input.valuesExample || "Ei kerrottu",
    personalNotes: input.personalNotes || "Ei lisätietoja",
    format_instructions: outputParser.getFormatInstructions(),
  });

  const result = await model.invoke(formattedPrompt);
  const parsed = await outputParser.parse(result.content as string);

  return {
    ...parsed,
    jobAnalysis,
    hasWorkExperience,
  };
}

// ✅ MUOTOILE A4-HAKUKIRJEEKSI (max 1 sivu)
export function formatToA4CoverLetter(data: ATSCoverLetter) {
  return `
${data.introduction.opening_hook}

${data.introduction.personality_summary}

${data.introduction.unique_value}

---

${data.expertise.relevant_experience}

${data.expertise.skills_match}

${data.expertise.achievements}

${data.expertise.gap_compensation || ""}

---

${data.motivation.why_this_job}

${data.motivation.career_goals}

${data.motivation.call_to_action}
`.trim();
}

// ✅ ATS-RAPORTTI (näytä käyttäjälle)
export function generateATSReport(data: ATSCoverLetter) {
  return {
    keywords_used: data.ats_data.matched_keywords.length,
    total_keywords: data.ats_data.matched_keywords.length, // Tämä tulisi työpaikkailmoituksesta
    match_percentage: Math.round(
      (data.ats_data.matched_keywords.length / 15) * 100
    ),
    readability: data.ats_data.readability_score,
    missing_experience: data.ats_data.missing_experience,
    compensation_used: data.ats_data.compensation_strategy || "Ei tarpeen",
    recommendations: [
      data.ats_data.matched_keywords.length < 8
        ? "Lisää avainsanoja työpaikkailmoituksesta"
        : "Hyvä avainsanamäärä ✓",
      data.ats_data.readability_score < 6
        ? "Yksinkertaista kieltä parempaan luettavuuteen"
        : "Hyvä luettavuus ✓",
      data.ats_data.missing_experience && !data.ats_data.compensation_strategy
        ? "Korosta persoonallisuutta ja oppimiskykyä"
        : "Kokemus hyvin esitetty ✓",
    ],
  };
}