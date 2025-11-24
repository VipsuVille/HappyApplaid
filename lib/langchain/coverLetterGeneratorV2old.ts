// lib/langchain/coverLetterGeneratorV2.ts - TYYLI VAIKUTTAA SISÄLTÖÖN

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const atsOptimizedCoverLetterSchema = z.object({
  introduction: z.object({
    opening_hook: z.string().describe("Vahva avaava lause (MAX 40 sanaa)"),
    personality_summary: z.string().describe("2-3 lausetta persoonallisuudesta (MAX 50 sanaa)"),
    unique_value: z.string().describe("Ainutlaatuinen arvo (MAX 30 sanaa)"),
  }),
  expertise: z.object({
    relevant_experience: z.string().describe("Työkokemus tai vastaava osaaminen (MAX 70 sanaa)"),
    skills_match: z.string().describe("Kuinka taidot vastaavat vaatimuksia (MAX 60 sanaa)"),
    achievements: z.string().describe("Konkreettiset saavutukset (MAX 50 sanaa)"),
    gap_compensation: z.string().optional().describe("Jos ei kokemusta, korvaavat vahvuudet"),
  }),
  motivation: z.object({
    why_this_job: z.string().describe("Miksi TÄMÄ työpaikka kiinnostaa (MAX 40 sanaa)"),
    career_goals: z.string().describe("Urasuunnitelmat (MAX 25 sanaa)"),
    call_to_action: z.string().describe("Innostunut lopetus (MAX 15 sanaa)"),
  }),
  ats_data: z.object({
    matched_keywords: z.array(z.string()).describe("Työpaikkailmoituksen avainsanat"),
    missing_experience: z.boolean().describe("Onko työkokemus puutteellinen"),
    compensation_strategy: z.string().optional().describe("Miten puutteet kompensoitu"),
    readability_score: z.number().min(1).max(10).describe("Luettavuus 1-10"),
  }),
});

type ATSCoverLetter = z.infer<typeof atsOptimizedCoverLetterSchema>;

async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.3,
  });

  const prompt = `
Analysoi työpaikkailmoitus ATS-optimointia varten:

${jobDescription}

Palauta JSON:
{
  "keywords": ["avainsana1", "avainsana2"],
  "required_skills": ["taito1", "taito2"],
  "required_experience": "0-2 vuotta",
  "soft_skills": ["tiimityö", "kommunikaatio"],
  "company_values": ["innovatiivisuus"],
  "key_challenges": ["mitä työntekijä tulee tekemään"],
  "company_name": "Yrityksen nimi",
  "job_title": "Työnimike",
  "work_environment": "toimisto/etä/hybridi"
}
`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      return {
        keywords: [], required_skills: [], required_experience: "ei mainittu",
        soft_skills: [], company_values: [], key_challenges: [],
        company_name: "tämä yritys", job_title: "tämä työ", work_environment: "monipuolinen"
      };
    }
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return {
      keywords: [], required_skills: [], required_experience: "ei mainittu",
      soft_skills: [], company_values: [], key_challenges: [],
      company_name: "tämä yritys", job_title: "tämä työ", work_environment: "monipuolinen"
    };
  }
}

export async function generateATSOptimizedCoverLetter(input: {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  workExperience?: string;
  education?: string;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual"; // ✅ TYYLI VAIKUTTAA
  groundTruthWarning?: string;
}) {
  console.log('🔍 Analyzing job posting...');
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);

  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;
  const needsCompensation = !hasWorkExperience;

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const outputParser = StructuredOutputParser.fromZodSchema(
    atsOptimizedCoverLetterSchema
  );

  // ✅ TYYLI MÄÄRITTÄÄ SÄVYN JA RAKENTEEN
  const styleInstructions = input.style === 'casual' 
    ? `**RENNOMPI TYYLI (VERSIO 1):**
- Henkilökohtainen, "oma ääni"
- Yksinkertainen virkerakenne
- Ei liikaa ammattitermejä
- Lämminhenkinen mutta ammattimainen
- Esimerkki: "Olen innostunut... koska haluan rakentaa järjestelmiä..."
- Kappaleet virtaavat luonnollisesti
- Ei liikaa rakenteellista jäykkyyttä`
    : `**VIRALLISEMPI TYYLI (VERSIO 2):**
- Strukturoitu ja ammattimainen
- Selkeät osiot ja otsikointi (vain tekstissä, ei markdown)
- Lyhyet, napakat lauseet
- Enemmän ammattitermejä
- Esimerkki: "Hakemus [Yritys] [Työnimike]-tehtävään"
- Listaa teknologiat ja vaatimukset suoraan
- Bisnesmainen sävy, aggressiivisempi myynti
- Strukturoidumpi: "Tekniset taidot: ...", "Kompensaatio: ...", "Miksi [Yritys]?"`;

  const ageInstruction = input.age 
    ? `ALOITA: "Olen ${input.age}-vuotias [ammatti], joka..."`
    : 'ALOITA: "Olen innostunut [ammatti], joka..." (ÄLÄ mainitse ikää)';

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `Olet ATS-optimoitu hakukirjegeneraattori. Luo 3-osainen rakenne:

**KRIITTISET RAJOITUKSET:**
- MAX 380 sanaa YHTEENSÄ
- EI viivoja (---)
- EI markdown-otsikoita
- Virtaava proosa

**TYYLI:**
{styleInstructions}

**TYÖPAIKKASPESIFISYYS (PAKOLLINEN):**
Jokainen kappale vastaa: "MIKSI JUURI TÄHÄN TYÖHÖN?"

**YRITYSVIITTAUKSET:**
- Mainitse yrityksen nimi: {companyName}
- Mainitse työnimike: {jobTitle}
- Viittaa työympäristöön: {workEnvironment}
- Mainitse spesifit vaatimukset: {requiredSkills}

**OSIO 2 (Osaaminen) - KRIITTINEN:**
${input.style === 'casual' 
  ? `RENNOMPI (Versio 1):
"Työpaikkailmoitus painottaa [X, Y, Z]. Osaan [X] ja [Y] käytännössä – olen rakentanut [projekti], jossa käytin [teknologia]. Minulla on perustiedot [Z]:sta ja vahva halu oppia lisää."

- Luonnollinen virtaus
- Kerro tarina, älä listaa
- "Osaan", "Olen rakentanut", "Opettelin"`
  : `VIRALLISEMPI (Versio 2):
"Tekniset taidot vastaavat tarpeitanne: Työpaikkailmoitus mainitsee [listatut teknologiat]. Osaan [X] ja [Y] käytännössä. Minulla on perustiedot [Z]:sta. Valmis oppimaan [puuttuvat] nopeasti."

- Listat ja rakenne
- Suorat viittaukset
- "Tekniset taidot:", "Kompensaatio:", "Miksi [Yritys]?"`
}

**KOMPENSAATIOSTRATEGIA (jos ei kokemusta):**
- ÄLÄ sano "ei kokemusta"
- Käytä: "Vaikka työkokemukseni on [X], [projekti/harjoittelu] opetti minulle [Y]"
- Korvaavat vahvuudet: ahkeruus, oppimiskyky, luotettavuus, työmoraali
- Transfer skills: "Varastotyö opetti vastuullisuutta ja ongelmanratkaisua"

**ALOITUS:**
${ageInstruction}

**KIELLETYT:**
❌ "Olen [Nimi], innokas..."
❌ Viivat (---)
❌ Markdown-otsikot

**KIELI:**
- {language}

**ATS-OPTIMOINTI:**
- Käytä avainsanoja: {keywords}

{format_instructions}`,
    ],
    [
      "human",
      `
TYÖPAIKKAILMOITUS:
{jobDescription}

HAKIJAN PROFIILI:
Nimi: {name}
Ikä: {age}
Työkokemus: {workExperience}
Koulutus: {education}
Taidot: {skills}

PERSOONALLISUUS:
- Työtyyli: {workingStyle}
- Ongelmanratkaisu: {problemSolving}
- Energianlähteet: {energySources}
- Ainutlaatuinen vahvuus: {uniqueStrength}
- Oppimistyyli: {learningStyle}
- Tiimirooli: {teamRole}
- Ammatti-identiteetti: {superpower}
- Arvoesimerkki: {valuesExample}

LISÄTIEDOT: {personalNotes}

LUO {styleType} HAKUKIRJE JSON-MUODOSSA.
MUISTA: MAX 380 SANAA, EI VIIVOJA, YRITYSVIITTAUKSET
`,
    ],
  ]);

  try {
    const formattedPrompt = await prompt.formatMessages({
      styleInstructions,
      styleType: input.style === 'casual' ? 'RENNOMPI (Versio 1 tyylinen)' : 'VIRALLISEMPI (Versio 2 tyylinen)',
      keywords: jobAnalysis.keywords.join(", ") || "yleiset taidot",
      companyName: jobAnalysis.company_name || "tämä yritys",
      jobTitle: jobAnalysis.job_title || "tämä työ",
      workEnvironment: jobAnalysis.work_environment || "monipuolinen työympäristö",
      requiredSkills: jobAnalysis.required_skills.join(", ") || "monipuolinen osaaminen",
      language: input.language || "finnish",
      jobDescription: input.jobDescription,
      name: input.name,
      age: input.age ? `${input.age} vuotta` : 'Ei kerrottu',
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
      groundTruthWarning: input.groundTruthWarning || "",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formattedPrompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    let cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .replace(/^[^{]*/, '')
      .replace(/[^}]*$/, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in AI response.');
    }

    const parsed = await outputParser.parse(jsonMatch[0]);

    return {
      ...parsed,
      jobAnalysis,
      hasWorkExperience,
    };
  } catch (error) {
    console.error('❌ Generator error:', error);
    throw new Error(
      `ATS generator failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

export function formatToA4CoverLetter(data: ATSCoverLetter) {
  return `
${data.introduction.opening_hook}

${data.introduction.personality_summary}

${data.introduction.unique_value}

${data.expertise.relevant_experience}

${data.expertise.skills_match}

${data.expertise.achievements}

${data.expertise.gap_compensation || ""}

${data.motivation.why_this_job}

${data.motivation.career_goals}

${data.motivation.call_to_action}
`.trim();
}

export function generateATSReport(data: ATSCoverLetter) {
  return {
    keywords_used: data.ats_data.matched_keywords.length,
    total_keywords: data.ats_data.matched_keywords.length,
    keyword_match_score: Math.round(
      (data.ats_data.matched_keywords.length / 15) * 100
    ),
    ats_compatibility_score: data.ats_data.readability_score * 10,
    critical_keywords_used: data.ats_data.matched_keywords,
    missing_keywords: [],
    improvement_suggestions: [
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