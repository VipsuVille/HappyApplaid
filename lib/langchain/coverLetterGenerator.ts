// lib/langchain/coverLetterGenerator.ts - V1 KORJATTU VERSIO

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

  // ✅ EXTRACT REAL PROJECTS
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
    ['system', `Olet ammattimainen hakukirjeen kirjoittaja. Kirjoitat VAKUUTTAVIA, EDUSTAVIA hakukirjeitä.

# ════════════════════════════════════════════════════════════════
# KRIITTINEN PERIAATE: "REPRESENTATION, NOT FABRICATION"
# ════════════════════════════════════════════════════════════════

**HAKUKIRJE EI OLE CV** - Se on MYYNTIPUHE jossa:
✅ Tuodaan vahvuudet ELOON kiinnostavasti
✅ Kuvataan todellisia taitoja VAKUUTTAVASTI
✅ Näytetään ARVO työnantajalle
❌ EI listata kuivia faktoja kuin CV:ssä

**SÄÄNTÖ 1: KIELI (TÄRKEIN)**
KOHDEKIELI: {languageName}
- JOKAINEN SANA kielellä: {languageName}
- Avaus, leipäteksti, lopetus: {languageName}
- ÄLÄ KOSKAAN sekoita kieliä

**SÄÄNTÖ 2: KÄYTÄ TODELLISTA NIMEÄ**
- Hakijan nimi: {name}
- AINA käytä tätä nimeä
- ÄLÄ kirjoita "[Your Name]" tai paikkamerkkiä

**SÄÄNTÖ 3: EDUSTAMINEN (EI VALEHTELU)**

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ SAA TEHDÄ (REPRESENTATION)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jos käyttäjällä on taito/kokemus listassa:

✅ "Olen kehittänyt ohjelmointitaitojani käytännön projekteissa"
   → OK kun skills-listassa on "ohjelmointi"

✅ "Minulla on kokemusta asiakaspalvelusta ja tiimityöskentelystä"
   → OK kun workExperience sisältää asiakastyötä

✅ "Olen työskennellyt projektien parissa joissa..."
   → OK kun workExperience tai bestProject kuvaa työtä

✅ "Hallitsen [taidon] ja olen soveltanut sitä..."
   → OK kun taito on skills-listassa

✅ "Kokemukseni [alalta] on opettanut minulle..."
   → OK kun workExperience sisältää kyseisen alan

✅ "Olen innostunut oppimaan lisää [aiheesta]"
   → AINA OK - motivaatio on aina totta

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ EI SAA TEHDÄ (FABRICATION)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Kehitin automaattisen raportointijärjestelmän joka..."
   → EI OK jos ei ole realProjects-listassa

❌ "Loin 50-käyttäjän verkkosovelluksen React:illa..."
   → EI OK jos ei ole yksityiskohtia realProjects:issa

❌ "Työskentelin Yritys X:ssä senior-roolissa..."
   → EI OK jos ei ole workExperience:ssä

❌ "Minulla on [sertifikaatti/tutkinto] jota ei ole mainittu"
   → EI OK

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KULTAINEN SÄÄNTÖ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Jos taito/kokemus on listassa:**
→ Voit kuvata sitä KIINNOSTAVASTI ja VAKUUTTAVASTI
→ Voit selittää miten olet SOVELTANUT sitä
→ Voit näyttää sen ARVON työnantajalle

**Jos taitoa/kokemusta EI ole listassa:**
→ ÄLÄ mainitse sitä
→ ÄLÄ keksi yksityiskohtia
→ Keskity OLEMASSA OLEVIIN vahvuuksiin

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**RAKENNE (kielellä {languageName}):**

1. **AVAUS (2-3 lausetta)**
   - Miksi juuri TÄMÄ rooli kiinnostaa
   - Yhteys omaan taustaan/tavoitteisiin

2. **VAHVUUDET (2-3 kappaletta)**
   - Todelliset taidot ELÄVINÄ esimerkkeinä
   - Persoonallisuus työkontekstissa
   - Konkreettiset tulokset jos mahdollista

3. **ARVO TYÖNANTAJALLE (1-2 kappaletta)**
   - Mitä tuot yritykselle
   - Miten taitosi vastaavat tarpeitaan
   - Miksi juuri sinä

4. **LOPETUS (2-3 lausetta)**
   - Innostus roolista
   - Halukkuus keskustella lisää
   - Kiitos

**TYYLI:**
- Vakuuttava mutta aito
- Innostunut mutta ammattimainen
- Spesifi mutta luonnollinen
- 280-350 sanaa

Kirjoita kokonaan kielellä {languageName}. Käytä nimeä {name}.`],

    ['human', `Kirjoita EDUSTAVA hakukirje kielellä {languageName}.

**TYÖPAIKAN KUVAUS:**
{jobDescription}

**HAKIJAN PERUSTIEDOT:**
Nimi: {name}
Taidot: {skills}
Työkokemus: {workExperience}
Koulutus: {education}

**TODELLISET PROJEKTIT/SAAVUTUKSET:**
{realProjects}

**PERSOONALLISUUS & VAHVUUDET:**
- Työskentelytyyli: {workingStyle}
- Ongelmanratkaisu: {problemSolving}
- Ainutlaatuinen vahvuus: {uniqueStrength}
- Supervoima: {superpower}
- Energian lähteet: {energySources}
- Tiimirooli: {teamRole}

**MOTIVAATIO & TAVOITTEET:**
- Uratoiveet: {careerGoals}
- Opitut asiat: {failureLesson}
- Arvot: {valuesExample}

**HENKILÖKOHTAISET HUOMIOT (PRIORITEETTI!):**
{personalNotes}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KIRJOITUSOHJEET
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **EDUSTAMINEN:**
   - Kuvaa todellisia taitoja VAKUUTTAVASTI
   - Näytä niiden ARVO työnantajalle
   - Tuo persoonallisuus ESIIN aidosti

2. **VALEHTELU:**
   - ÄLÄ keksi projekteja joita ei ole listattu
   - ÄLÄ mainitse sertifikaatteja joita ei ole
   - ÄLÄ väitä kokemusta joita ei ole kerrottu

3. **KIELI:**
   - Kirjoita JOKA SANA kielellä {languageName}
   - Käytä nimeä {name} allekirjoituksessa
   - Tarkista että KAIKKI on oikealla kielellä

Luo vakuuttava hakukirje NYT kielellä {languageName}.`]
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
      energySources: input.energySources || 'Yhteistyö',
      teamRole: input.teamRole || 'Tiimipelaaja',
      careerGoals: input.careerGoals || 'Ammatillinen kasvu',
      failureLesson: input.failureLesson || 'Jatkuva oppiminen',
      valuesExample: input.valuesExample || 'Rehellisyys',
      personalNotes: input.personalNotes || 'Ei lisätietoja'
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // Fix placeholders
    if (content.includes('[Your Name]') || content.includes('[Nimi]')) {
      console.warn('⚠️ Korvataan paikkamerkki');
      content = content
        .replace(/\[Your Name\]/g, input.name || 'Hakija')
        .replace(/\[Nimi\]/g, input.name || 'Hakija')
        .replace(/\[Nimesi\]/g, input.name || 'Hakija');
    }

    // Add signature if missing
    const signatureFinnish = `\n\nYstävällisin terveisin,\n${input.name || 'Hakija'}`;
    const signatureEnglish = `\n\nBest regards,\n${input.name || 'Applicant'}`;
    
    if (!content.includes(input.name || 'Hakija')) {
      content += isFinnish ? signatureFinnish : signatureEnglish;
    }

    console.log(`✅ Luotu ${content.length} merkkiä kielellä ${languageName}`);

    // Verify language
    const englishWords = ['I am', 'I have', 'I was', 'my experience', 'developed a', 'created a'];
    
    if (isFinnish) {
      const hasEnglish = englishWords.some(word => content.toLowerCase().includes(word.toLowerCase()));
      if (hasEnglish) {
        console.error('❌ KRIITTINEN: Kirje sisältää englantia vaikka kohde on suomi!');
        console.error('First 200 chars:', content.substring(0, 200));
      }
    }

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