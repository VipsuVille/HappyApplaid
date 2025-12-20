// lib/langchain/generalCoverLetterGenerator.ts - KORJATTU VERSIO

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

const generalCoverLetterSchema = z.object({
  content: z.string().describe("Full cover letter text"),
  title: z.string().describe("Letter title"),
  keyHighlights: z.object({
    professionalIdentity: z.string().describe("Who I am professionally"),
    coreStrengths: z.array(z.string()).describe("Top 3-5 strengths"),
    careerGoals: z.string().describe("What I'm looking for"),
    uniqueValue: z.string().describe("What makes me different"),
  }).optional(),
});

type GeneralCoverLetterOutput = z.infer<typeof generalCoverLetterSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(generalCoverLetterSchema);

export interface GeneralCoverLetterInput {
  name: string;
  email: string;
  phone: string;
  jobTitle?: string;
  workExperience?: string;
  education?: string;
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
  targetIndustry?: string;
  targetRole?: string;
  language?: string;
  style?: 'formal' | 'casual';
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
}

export interface GeneralCoverLetterResult {
  content: string;
  title: string;
  signature: string;
  keyHighlights?: {
    professionalIdentity: string;
    coreStrengths: string[];
    careerGoals: string;
    uniqueValue: string;
  };
}

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  
  console.log('🎯 Generating GENERAL cover letter...');
  console.log(`   Language: ${input.language || 'finnish'}`);
  console.log(`   Style: ${input.style || 'formal'}`);
  console.log(`   RAG: ${input.enableRAG ? '✅' : '❌'}`);

  // LOAD RAG CONTEXT
  let knowledgeContext = '';
  
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: `General introduction letter for ${input.targetRole || 'professional opportunities'}`,
        userProfile: {
          workExperience: input.workExperience,
          education: input.education,
          skills: input.skills,
          workingStyle: input.workingStyle,
          problemSolving: input.problemSolving,
          uniqueStrength: input.uniqueStrength,
          learningStyle: input.learningStyle,
          teamRole: input.teamRole,
          superpower: input.superpower,
          careerGoals: input.careerGoals,
          bestProjectExample: input.bestProjectExample,
          failureLesson: input.failureLesson,
        },
        enableRAG: true,
        contentType: 'cover_letter'
      });
      console.log('✅ RAG context loaded');
    } catch (error) {
      console.warn('⚠️ RAG failed, continuing without:', error);
    }
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const styleInstructions = input.style === 'casual'
    ? 'TONE: Conversational, approachable yet professional. Use "I" naturally.'
    : 'TONE: Professional, confident. Use "I" with authority.';

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Olet ammattimainen kirjoittaja joka luo VAKUUTTAVIA yleisiä esittelykirjeitä.

# ════════════════════════════════════════════════════════════════
# KONTEKSTI: YLEINEN ESITTELYKIRJE
# ════════════════════════════════════════════════════════════════

Tämä EI ole hakukirje tiettyyn työpaikkaan.
Tämä on YLEINEN AMMATILLINEN ESITTELY jota voi lähettää useille työnantajille.

# ════════════════════════════════════════════════════════════════
# KRIITTINEN PERIAATE: "REPRESENTATION, NOT FABRICATION"
# ════════════════════════════════════════════════════════════════

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE BASE (PRO Feature)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GROUND TRUTH - HAKIJAN TODELLISET TAIDOT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SALLITUT TAIDOT (hakijalla on):**
{allowedSkills}

**KIELLETYT VÄITTEET (hakijalla EI ole):**
{forbiddenClaims}

**TARKISTUSPROTOKOLLA:**
- Käytä VAIN sallittuja taitoja
- ÄLÄ KOSKAAN keksi kokemusta

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ SAA TEHDÄ (REPRESENTATION)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Jos hakijalla on taito/kokemus listassa:

✅ "Olen kehittänyt [taidon] käytännön työssä"
   → OK kun taito on allowedSkills-listassa

✅ "Kokemukseni [alalta] on antanut minulle..."
   → OK kun kokemus on workExperience:ssä

✅ "Hallitsen [työkalun] ja käytän sitä..."
   → OK kun työkalu on skills-listassa

✅ "Olen työskennellyt projekteissa joissa..."
   → OK kun workExperience tai bestProject kuvaa työtä

✅ "Vahvuuteni ovat [listatut vahvuudet]"
   → OK kun vahvuudet ovat profiilissa

✅ "Etsin mahdollisuuksia [tavoite-alalla]"
   → AINA OK - tavoitteet ovat aina tosia

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# MITÄ EI SAA TEHDÄ (FABRICATION)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ "Kehitin [yksityiskohtainen projekti]..."
   → EI OK jos ei ole bestProjectExample:ssa

❌ "Työskentelin [yrityksessä] [roolissa]..."
   → EI OK jos ei ole workExperience:ssä

❌ "Minulla on [tutkinto/sertifikaatti]..."
   → EI OK jos ei ole education:ssa

❌ "Hallitsen [taidon] jota ei ole mainittu"
   → EI OK

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KULTAINEN SÄÄNTÖ
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Jos taito/kokemus on profiilissa:**
→ Kuvaa sitä VAKUUTTAVASTI
→ Näytä sen ARVO
→ Tuo esille SOVELLUKSET

**Jos taitoa/kokemusta EI ole:**
→ ÄLÄ mainitse sitä
→ Keskity TODELLISIIN vahvuuksiin

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**TEHTÄVÄ:**
Kirjoita vakuuttava yleinen esittelykirje joka:

1. **ESITTELEE** hakijan ammatillisesti
2. **KOROSTAA** todellisia vahvuuksia ja persoonallisuutta
3. **SELITTÄÄ** uratoiveet ja motivaatiot
4. **NÄYTTÄÄ** arvon työnantajille

**RAKENNE:**

1. **AVAUS (2-3 lausetta)**
   - Ammatillinen identiteetti
   - Nykyinen tilanne/tausta

2. **YDINVAHVUUDET (3-4 lausetta)**
   - Keskeiset taidot ja kokemus
   - Persoonallisuus työympäristössä
   - Mikä tekee hakijasta ainutlaatuisen

3. **URATOIVEET (2-3 lausetta)**
   - Mitä hakija etsii
   - Millaisia työympäristöjä
   - Mikä motivoi

4. **LOPETUS (1-2 lausetta)**
   - Arvolupauksen yhteenveto
   - Kutsu toimintaan (avoin mahdollisuuksille)

**KIELI:** {language}
**TYYLI:** {styleInstructions}
**PITUUS:** 280-350 sanaa

{format_instructions}`],

    ["human", `Luo YLEINEN esittelykirje ammattikäyttöön.

**HAKIJA:**
Nimi: {name}
Ammatillinen tavoite: {jobTitle}
Sähköposti: {email}
Puhelin: {phone}

**TAUSTA:**
Kokemus: {workExperience}
Koulutus: {education}
Taidot: {skills}

**GROUND TRUTH:**
SALLITTU: {allowedSkills}
KIELLETTY: {forbiddenClaims}

**PERSOONALLISUUS:**
Työskentelytyyli: {workingStyle}
Ongelmanratkaisu: {problemSolving}
Energian lähteet: {energySources}
Ainutlaatuinen vahvuus: {uniqueStrength}
Oppimistyyli: {learningStyle}
Tiimirooli: {teamRole}
Arvot: {valuesExample}
Ammatillinen identiteetti: {superpower}

**TAVOITTEET:**
Uratoiveet: {careerGoals}
Paras saavutus: {bestProjectExample}
Keskeinen oppiminen: {failureLesson}

**VALINNAINEN FOKUS:**
Tavoiteala: {targetIndustry}
Tavoiterooli: {targetRole}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# KIRJOITUSOHJEET
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. **KÄYTÄ 1. PERSOONAA**: "Olen...", "Minulla on...", "Etsin..."

2. **EDUSTAMINEN:**
   - Kuvaa todellisia taitoja VAKUUTTAVASTI
   - Näytä niiden ARVO työnantajalle
   - Tuo persoonallisuus ESIIN

3. **EI VALEHTELUA:**
   - ÄLÄ keksi projekteja
   - ÄLÄ mainitse koulutusta jota ei ole
   - ÄLÄ väitä kokemusta jota ei ole

Kirjoita kielellä {language}. Palauta JSON kentillä "content", "title", "keyHighlights".`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language || 'finnish',
      styleInstructions,
      name: input.name,
      jobTitle: input.jobTitle || 'Professional',
      email: input.email,
      phone: input.phone,
      workExperience: input.workExperience || 'Kehittyvä ammatillinen kokemus',
      education: input.education || 'Relevantti koulutustausta',
      skills: input.skills || 'Monipuolinen taitovalikoima',
      allowedSkills: input.allowedSkills?.join(', ') || 'Kaikki profiilissa olevat taidot',
      forbiddenClaims: input.forbiddenClaims?.join(', ') || 'Ei rajoituksia',
      workingStyle: input.workingStyle || 'Mukautuva',
      problemSolving: input.problemSolving || 'Analyyttinen',
      energySources: input.energySources || 'Tiimityöskentely',
      uniqueStrength: input.uniqueStrength || 'Nopea oppija',
      learningStyle: input.learningStyle || 'Käytännönläheinen',
      teamRole: input.teamRole || 'Tiimipelaaja',
      valuesExample: input.valuesExample || 'Rehellisyys',
      superpower: input.superpower || 'Luotettava ammattilainen',
      careerGoals: input.careerGoals || 'Etsii kasvumahdollisuuksia',
      bestProjectExample: input.bestProjectExample || 'Johdonmukainen suoritus',
      failureLesson: input.failureLesson || 'Jatkuva kehittyminen',
      targetIndustry: input.targetIndustry || 'Useita aloja',
      targetRole: input.targetRole || 'Ammatillisia rooleja',
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);

    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed: GeneralCoverLetterOutput = await outputParser.parse(jsonMatch[0]);

    const formattedContent = (parsed.content || '')
      .replace(/\*\*/g, '')
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('✅ General cover letter generated');

    return {
      content: formattedContent,
      title: parsed.title || 'Ammatillinen Esittely',
      signature: input.name,
      keyHighlights: parsed.keyHighlights,
    };

  } catch (error) {
    console.error('❌ General cover letter generation failed:', error);
    throw error;
  }
}