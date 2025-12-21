// lib/langchain/coverLetterGenerator.ts - V1 FORMAATTI KORJATTU

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface CoverLetterInput {
  jobDescription: string;
  name: string;
  email?: string;
  phone?: string;
  jobTitle?: string;
  education?: any;
  workExperience?: any;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual";
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  groundTruthWarning?: string;
  skipQuestions?: boolean;
}

export interface CoverLetterOutput {
  content: string;
  title: string;
  signature: string;
  questions?: any[];
  job_match_score?: number;
  personality_hooks?: string[];
  key_differentiators?: string[];
  data_quality?: any;
}

export async function generateCoverLetterV1(
  input: CoverLetterInput
): Promise<CoverLetterOutput> {
  
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const targetLanguage = (input.language || 'finnish').toLowerCase();
  const isFinnish = targetLanguage.includes('fi') || targetLanguage.includes('suom');
  const languageName = isFinnish ? 'suomi' : 'englanti';
  
  console.log(`🌍 Kieli: ${languageName} (input: ${input.language})`);

  // EXTRACT REAL PROJECTS
  const realProjects = [];
  
  if (input.bestProjectExample && input.bestProjectExample.length > 20) {
    realProjects.push(input.bestProjectExample);
  }
  
  if (input.workExperience) {
    try {
      const workExp = typeof input.workExperience === 'string' 
        ? JSON.parse(input.workExperience) 
        : input.workExperience;
      
      if (Array.isArray(workExp)) {
        workExp.forEach((job: any) => {
          if (job.description && job.description.length > 20) {
            realProjects.push(`${job.position}: ${job.description}`);
          }
        });
      }
    } catch (e) {
      console.warn('⚠️ Work experience parse failed');
    }
  }

  const hasRealProjects = realProjects.length > 0;
  const projectsText = hasRealProjects 
    ? realProjects.join('\n\n') 
    : 'Ei yksityiskohtaisia projektikuvauksia - käytä yleisiä vahvuuksia';

  console.log(`📋 Todellisia projekteja: ${realProjects.length}`);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Olet ammattimainen hakukirjeen kirjoittaja. Kirjoitat MODERNEJA, SELKEITÄ hakukirjeitä.

# ════════════════════════════════════════════════════════════════
# KRIITTINEN: MODERNI HAKUKIRJEEN FORMAATTI
# ════════════════════════════════════════════════════════════════

**HAKUKIRJE SISÄLTÄÄ VAIN:**
1. Otsikko (työn nimi)
2. Tervehdys
3. Leipäteksti (3-4 kappaletta)
4. Lopetus
5. Allekirjoitus

**ÄLÄ KOSKAAN KIRJOITA:**
❌ Hakijan osoitetta
❌ Hakijan puhelinnumeroa
❌ Hakijan sähköpostia
❌ Yrityksen osoitetta
❌ [Paikkamerkkejä hakasulkeissa]
❌ Päivämäärää tekstiin (se lisätään automaattisesti)

**KRIITTINEN: NIMEN KÄYTTÖ**
- Hakijan nimi on: {name}
- ÄLÄ KOSKAAN kirjoita "Hakija"
- ÄLÄ KOSKAAN kirjoita "[Your Name]"
- Käytä AINA nimeä {name}

# ════════════════════════════════════════════════════════════════
# OIKEA FORMAATTI (ESIMERKKI)
# ════════════════════════════════════════════════════════════════

Hyvä [Yritys]-tiimi,

[Ensimmäinen kappale - miksi kiinnostaa]

[Toinen kappale - taidot ja kokemus]

[Kolmas kappale - arvo yritykselle]

[Neljäs kappale - lopetus ja kiitos]

Ystävällisin terveisin,

{name}

# ════════════════════════════════════════════════════════════════
# REPRESENTATION, NOT FABRICATION
# ════════════════════════════════════════════════════════════════

**HAKUKIRJE EI OLE CV** - Se on MYYNTIPUHE jossa:
✅ Tuodaan vahvuudet ELOON kiinnostavasti
✅ Kuvataan todellisia taitoja VAKUUTTAVASTI
✅ Näytetään ARVO työnantajalle
❌ EI listata kuivia faktoja

**SÄÄNTÖ 1: KIELI**
KOHDEKIELI: {languageName}
- JOKAINEN SANA kielellä: {languageName}

**SÄÄNTÖ 2: EDUSTAMINEN (EI VALEHTELU)**

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ SAA TEHDÄ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jos käyttäjällä on taito/kokemus:

✅ "Olen kehittänyt ohjelmointitaitojani käytännön projekteissa"
   → OK kun skills sisältää "ohjelmointi"

✅ "Minulla on kokemusta asiakaspalvelusta"
   → OK kun workExperience sisältää asiakastyötä

✅ "Olen työskennellyt projektien parissa joissa..."
   → OK kun workExperience tai bestProject kuvaa työtä

✅ "Hallitsen [taidon] ja olen soveltanut sitä..."
   → OK kun taito on skills-listassa

✅ "Olen innostunut oppimaan lisää [aiheesta]"
   → AINA OK

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ EI SAA TEHDÄ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Kehitin automaattisen järjestelmän joka..."
   → EI OK jos ei ole realProjects:issa

❌ "Loin 50-käyttäjän sovelluksen..."
   → EI OK jos ei ole yksityiskohtia

❌ Mitään yksityiskohtaisia projektikuvauksia jos niitä ei ole annettu

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**RAKENNE (280-350 sanaa):**

**KAPPALE 1: AVAUS (2-3 lausetta)**
- Miksi juuri TÄMÄ rooli kiinnostaa
- Yhteys omaan taustaan

**KAPPALE 2-3: VAHVUUDET (4-6 lausetta)**
- Todelliset taidot kiinnostavasti
- Persoonallisuus työssä
- Konkreettiset esimerkit

**KAPPALE 4: LOPETUS (2-3 lausetta)**
- Innostus roolista
- Halukkuus keskustella
- Kiitos

Kirjoita PUHTAASTI kielellä {languageName}. Käytä nimeä {name}.`],

    ['human', `Kirjoita MODERNI hakukirje kielellä {languageName}.

**TYÖPAIKAN KUVAUS:**
{jobDescription}

**HAKIJAN TIEDOT:**
NIMI: {name} (KÄYTÄ TÄTÄ, EI "Hakija")
Taidot: {skills}
Työkokemus: {workExperience}
Koulutus: {education}

**TODELLISET PROJEKTIT:**
{realProjects}

**PERSOONALLISUUS:**
- Työskentelytyyli: {workingStyle}
- Ongelmanratkaisu: {problemSolving}
- Vahvuus: {uniqueStrength}
- Supervoima: {superpower}

**MOTIVAATIO:**
- Tavoitteet: {careerGoals}
- Arvot: {valuesExample}

**HUOMIOT:**
{personalNotes}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TÄRKEÄÄ - MUISTA NÄMÄ!
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ÄLÄ kirjoita osoitteita tai yhteystietoja
2. ÄLÄ kirjoita [hakasulkeita]
3. KÄYTÄ nimeä {name} (EI "Hakija")
4. Kirjoita VAIN:
   - Tervehdys
   - Leipäteksti (3-4 kappaletta)
   - Lopetus
   - Allekirjoitus: "Ystävällisin terveisin,\n\n{name}"

Luo hakukirje NYT kielellä {languageName}.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      languageName,
      name: input.name || 'Hakija',
      jobDescription: input.jobDescription || 'Ei määritelty',
      skills: input.skills || 'Kehittyvät taidot',
      workExperience: typeof input.workExperience === 'string' 
        ? input.workExperience 
        : JSON.stringify(input.workExperience || 'Rakentaa kokemusta'),
      education: typeof input.education === 'string'
        ? input.education
        : JSON.stringify(input.education || 'Jatkuva oppija'),
      realProjects: projectsText,
      workingStyle: input.workingStyle || 'Mukautuva',
      problemSolving: input.problemSolving || 'Looginen',
      uniqueStrength: input.uniqueStrength || 'Sitoutunut',
      superpower: input.superpower || 'Motivoitunut',
      careerGoals: input.careerGoals || 'Ammatillinen kasvu',
      valuesExample: input.valuesExample || 'Rehellisyys',
      personalNotes: input.personalNotes || 'Ei lisätietoja'
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // ✅ POISTA KAIKKI PLACEHOLDER-TEKSTIT
    content = content
      // Poista [hakasulkeissa] oleva teksti
      .replace(/\[Osoite\]/g, '')
      .replace(/\[Puhelinnumero\]/g, '')
      .replace(/\[Sähköposti\]/g, '')
      .replace(/\[Paikkakunta\]/g, '')
      .replace(/\[Päivämäärä\]/g, '')
      .replace(/\[Your Name\]/g, input.name || '')
      .replace(/\[Nimi\]/g, input.name || '')
      .replace(/\[Nimesi\]/g, input.name || '')
      // Poista "Hakija" jos sitä käytetty
      .replace(/^Hakija(?=\s|$)/gm, input.name || '')
      // Poista tyhjät rivit jotka jäävät jäljelle
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    // ✅ VARMISTA ALLEKIRJOITUS
    const signatureFinnish = `Ystävällisin terveisin,\n\n${input.name || 'Hakija'}`;
    const signatureEnglish = `Best regards,\n\n${input.name || 'Applicant'}`;
    
    if (!content.includes(input.name || 'Hakija')) {
      content += '\n\n' + (isFinnish ? signatureFinnish : signatureEnglish);
    }

    console.log(`✅ Luotu ${content.length} merkkiä kielellä ${languageName}`);

    return {
      content,
      title: input.jobDescription?.substring(0, 80) || 'Hakukirje',
      signature: input.name || 'Hakija',
      questions: [],
      job_match_score: 8,
      personality_hooks: [],
      key_differentiators: [],
      data_quality: null
    };

  } catch (error) {
    console.error('❌ Hakukirjeen luonti epäonnistui:', error);
    throw error;
  }
}