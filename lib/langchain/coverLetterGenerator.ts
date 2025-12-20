// ════════════════════════════════════════════════════════════════
// TIEDOSTO 2: lib/langchain/coverLetterGenerator.ts
// KOPIOI TÄMÄ KOKONAAN → lib/langchain/coverLetterGenerator.ts
// ════════════════════════════════════════════════════════════════

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
    : 'Ei mainittuja projekteja - käytä vain yleistä kieltä';

  console.log(`📋 Todellisia projekteja: ${realProjects.length}`);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `Kirjoitat hakukirjeen. KRIITTISET SÄÄNNÖT:

**SÄÄNTÖ 1: KIELI (TÄRKEIN)**
KOHDEKIELI: {languageName}
- Kirjoita JOKAINEN SANA kielellä: {languageName}
- Avaus kielellä {languageName}
- Leipäteksti kielellä {languageName}
- Lopetus kielellä {languageName}
- ÄLÄ KOSKAAN käytä englantia jos kohde on suomi
- ÄLÄ KOSKAAN käytä suomea jos kohde on englanti

**SÄÄNTÖ 2: NIMI**
- Hakijan nimi: {name}
- AINA käytä tätä tarkkaa nimeä
- ÄLÄ KOSKAAN kirjoita "[Your Name]" tai paikkamerkkiä
- Laita nimi allekirjoitukseen loppuun

**SÄÄNTÖ 3: ABSOLUUTTINEN TOTUUS**

Käytä VAIN SELKEÄSTI annettuja tietoja:

**SAA MAINITA:**
✅ Taidot listasta: {skills}
✅ Työkokemus: {workExperience}
✅ Projektit: {realProjects}
✅ Koulutus: {education}
✅ Persoonallisuuspiirteet profiilista
✅ Motivaatio ja innostus (aina ok)
✅ Uratoiveet profiilista

**ÄLÄ KOSKAAN MAINITSE:**
❌ "Kehitin automaattisen raportointijärjestelmän" (jos EI realProjects-listassa)
❌ "Loin tiedonkeruutyökalun" (jos EI realProjects-listassa)
❌ "Rakensin järjestelmän joka teki X" (jos EI realProjects-listassa)
❌ Mitään projektiyksityiskohtia jotka EIVÄT ole realProjects-listassa
❌ Mitään teknologioita jotka EIVÄT ole skills-listassa
❌ Mitään saavutuksia joita EI ole mainittu

**JOS EI PROJEKTEJA:**
Käytä yleistä kieltä:
✅ "Olen oppinut ohjelmointia käytännön kautta"
✅ "Olen kiinnostunut oppimaan lisää"
✅ "Haluan kehittyä tällä alalla"

**ÄLÄ KOSKAAN keksi projektiyksityiskohtia jos niitä ei ole annettu.**

**RAKENNE (kielellä {languageName}):**
1. Avaus: Ilmaise kiinnostus TÄHÄN rooliin
2. Tausta: SINUN todellinen kokemus (annetusta datasta)
3. Taidot: SINUN taidot (kohteesta {skills}) sovitettuna työn tarpeisiin
4. Motivaatio: Miksi SINÄ haluat TÄHÄN rooliin
5. Lopetus: Kiitos

Kirjoita kokonaan kielellä {languageName}. Käytä nimeä {name}. Vain totuus.`],

    ['human', `Kirjoita hakukirje kielellä {languageName}.

**KRIITTISET OHJEET:**
1. Kieli: {languageName} (jokainen sana!)
2. Nimi: {name} (käytä allekirjoituksessa)
3. Käytä VAIN alla annettuja tietoja

**TYÖPAIKAN KUVAUS:**
{jobDescription}

**HAKIJAN NIMI:**
{name}

**HAKIJAN TAIDOT (voi mainita nämä):**
{skills}

**TYÖKOKEMUS (voi kuvata tätä):**
{workExperience}

**KOULUTUS (voi mainita tämän):**
{education}

**TODELLISET PROJEKTIT (mainitse VAIN jos listattu tässä):**
{realProjects}

**PERSOONALLISUUS:**
- Työskentelytyyli: {workingStyle}
- Ongelmanratkaisu: {problemSolving}
- Ainutlaatuinen vahvuus: {uniqueStrength}
- Supervoima: {superpower}

**URATOIVEET:**
{careerGoals}

**HENKILÖKOHTAISET HUOMIOT:**
{personalNotes}

**KRIITTINEN TARKISTUS ENNEN KIRJOITTAMISTA:**
1. Onko kohdekieli {languageName}? → KYLLÄ, kirjoita kielellä {languageName}
2. Onko hakijan nimi {name}? → KYLLÄ, käytä {name} allekirjoituksessa
3. Onko yllä todellisia projekteja? → Jos EI, käytä vain yleistä kieltä
4. Voinko keksiä projektiyksityiskohtia? → EI, en koskaan

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
      personalNotes: input.personalNotes || 'Ei lisätietoja'
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    if (content.includes('[Your Name]') || content.includes('[Nimi]')) {
      console.warn('⚠️ Korvataan paikkamerkki');
      content = content
        .replace(/\[Your Name\]/g, input.name || 'Hakija')
        .replace(/\[Nimi\]/g, input.name || 'Hakija')
        .replace(/\[Nimesi\]/g, input.name || 'Hakija');
    }

    const signatureFinnish = `\n\nYstävällisin terveisin,\n${input.name || 'Hakija'}`;
    const signatureEnglish = `\n\nBest regards,\n${input.name || 'Applicant'}`;
    
    if (!content.includes(input.name || 'Hakija')) {
      content += isFinnish ? signatureFinnish : signatureEnglish;
    }

    console.log(`✅ Luotu ${content.length} merkkiä kielellä ${languageName}`);

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