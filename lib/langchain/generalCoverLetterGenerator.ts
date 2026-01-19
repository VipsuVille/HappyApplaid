// lib/langchain/generalCoverLetterGenerator.ts - PRODUCTION READY

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

// ════════════════════════════════════════════════════════════════
// SCHEMA & TYPES
// ════════════════════════════════════════════════════════════════

const generalCoverLetterSchema = z.object({
  content: z.string().describe("Full professional introduction text"),
  title: z.string().describe("Letter title"),
  keyHighlights: z.object({
    professionalIdentity: z.string().describe("Who the person is professionally"),
    coreStrengths: z.array(z.string()).describe("Top 3-5 key strengths"),
    careerGoals: z.string().describe("Career aspirations"),
    uniqueValue: z.string().describe("What makes them stand out"),
  }).optional(),
});

const outputParser = StructuredOutputParser.fromZodSchema(generalCoverLetterSchema);

export interface GeneralCoverLetterInput {
  name: string;
  email: string;
  phone: string;
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
  style?: "formal" | "casual";
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  userId?: string;
  skipQuestions?: boolean;
}

export interface GeneralCoverLetterResult {
  content: string;
  title: string;
  signature: string;
  questions?: any[];
  keyHighlights?: {
    professionalIdentity: string;
    coreStrengths: string[];
    careerGoals: string;
    uniqueValue: string;
  };
}

// ════════════════════════════════════════════════════════════════
// MAIN GENERATOR
// ════════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  console.log('🌟 [GENERAL] Creating personal introduction letter...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. KNOWLEDGE CONTEXT (RAG)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let knowledgeContext = "";
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: `General professional introduction for ${input.targetRole || "various professional opportunities"}`,
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
        contentType: "cover_letter",
      });
      console.log('✅ RAG context loaded');
    } catch (e) {
      console.warn("⚠️ RAG failed, continuing without");
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. DETECT LANGUAGE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const isFinnish = 
    (input.language || "finnish").toLowerCase().includes("fi") ||
    (input.language || "finnish").toLowerCase().includes("suo");

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. AI GENERATION
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.75, // Slightly higher for personality
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", isFinnish 
      ? `Olet ammatillinen esittelykirjeen kirjoittaja. Luo INHIMILLINEN, AITO ja PERSOONALLINEN esittely henkilöstä.

${knowledgeContext ? `**ASIANTUNTIJAKONTEKSTI:**\n${knowledgeContext}\n\n` : ''}

# ════════════════════════════════════════════════════════════════
# MISSION: INHIMILLINEN ESITTELY
# ════════════════════════════════════════════════════════════════

Tämä EI ole tavallinen hakukirje. Tämä on HENKILÖKOHTAINEN ESITTELY.

**TAVOITE:**
Esittele henkilö sellaisena kuin hän todella on - vahvuuksineen, persoonallisuutensa ja potentiaalineen.

**RAKENNE:**

1. **Tervehdys (1-2 lausetta)**
   - Kuka hän on ammatillisesti
   - Mikä häntä määrittelee

2. **Persoona työssä (3-4 lausetta)**
   - Miten hän lähestyy työtä
   - Mitä hän arvostaa
   - Miten hän ratkaisee ongelmia
   - Mikä tekee hänestä ainutlaatuisen

3. **Osaaminen ja kokemus (3-4 lausetta)**
   - Keskeiset vahvuudet
   - Merkittävimmät saavutukset
   - Mitä hän on oppinut matkalla
   - Konkreettiset esimerkit

4. **Tulevaisuus ja tavoitteet (2-3 lausetta)**
   - Mihin hän tähtää
   - Millaisia haasteita etsii
   - Mitä hän haluaa saavuttaa

5. **Päätös (1-2 lausetta)**
   - Yhteenveto hänen arvostaan
   - Positiivinen lopetus

**TYYLI:**
${input.style === "casual" ? "- Rento mutta ammattimainen\n- Keskusteleva sävy\n- Aidosti inhimillinen" : "- Asiallinen mutta lämmin\n- Vakuuttava\n- Inhimillinen ja uskottava"}

**SÄÄNNÖT:**
- Kirjoita minä-muodossa (ensimmäinen persoona)
- Ole aito - älä liioittele
- Käytä konkreettisia esimerkkejä
- Vältä kliseitä ("hard-working", "team player")
- Tuo esiin PERSOONALLISUUS, ei vain CV-faktoja
- PITUUS: 300-400 sanaa

**KIELI:** Suomi
**MUOTO:** Pelkkä teksti, ei otsikkoa, ei yhteystietoja

{format_instructions}`

      : `You are a professional introduction letter writer. Create a HUMAN, AUTHENTIC and PERSONAL introduction.

${knowledgeContext ? `**EXPERT KNOWLEDGE:**\n${knowledgeContext}\n\n` : ''}

# ════════════════════════════════════════════════════════════════
# MISSION: HUMAN INTRODUCTION
# ════════════════════════════════════════════════════════════════

This is NOT a standard cover letter. This is a PERSONAL INTRODUCTION.

**GOAL:**
Introduce the person as they truly are - with their strengths, personality, and potential.

**STRUCTURE:**

1. **Greeting (1-2 sentences)**
   - Who they are professionally
   - What defines them

2. **Personality at work (3-4 sentences)**
   - How they approach work
   - What they value
   - How they solve problems
   - What makes them unique

3. **Skills and experience (3-4 sentences)**
   - Key strengths
   - Significant achievements
   - What they've learned
   - Concrete examples

4. **Future and goals (2-3 sentences)**
   - Where they're heading
   - What challenges they seek
   - What they want to achieve

5. **Closing (1-2 sentences)**
   - Summary of their value
   - Positive ending

**STYLE:**
${input.style === "casual" ? "- Conversational yet professional\n- Approachable tone\n- Genuinely human" : "- Professional yet warm\n- Confident\n- Human and credible"}

**RULES:**
- Write in first person (I/my)
- Be authentic - don't exaggerate
- Use concrete examples
- Avoid clichés ("hard-working", "team player")
- Show PERSONALITY, not just CV facts
- LENGTH: 300-400 words

**LANGUAGE:** English
**FORMAT:** Plain text, no header, no contact info

{format_instructions}`
    ],

    ["human", isFinnish
      ? `Luo henkilökohtainen esittelykirje tälle henkilölle.

**HENKILÖ:**
Nimi: {name}
Työkokemus: {workExperience}
Koulutus: {education}
Osaaminen: {skills}

**PERSOONALLISUUS:**
Työskentelytyyli: {workingStyle}
Ongelmanratkaisu: {problemSolving}
Ainutlaatuinen vahvuus: {uniqueStrength}
Supervoimat: {superpower}
Energia: {energySources}
Oppimistyyli: {learningStyle}
Rooli tiimissä: {teamRole}

**KOKEMUS & TAVOITTEET:**
Paras projekti: {bestProjectExample}
Opittu epäonnistumisesta: {failureLesson}
Ura-tavoitteet: {careerGoals}
Arvot: {valuesExample}

**SUUNTA (valinnainen):**
Kohdealue: {targetIndustry}
Tavoiterooli: {targetRole}

**GROUND TRUTH:**
Sallitut taidot: {allowedSkills}
Kielletyt väitteet: {forbiddenClaims}

Palauta JSON: {"content": "...", "title": "...", "keyHighlights": {...}}`

      : `Create a personal introduction letter for this person.

**PERSON:**
Name: {name}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Energy Sources: {energySources}
Learning Style: {learningStyle}
Team Role: {teamRole}

**EXPERIENCE & GOALS:**
Best Project: {bestProjectExample}
Learned from Failure: {failureLesson}
Career Goals: {careerGoals}
Values: {valuesExample}

**DIRECTION (optional):**
Target Industry: {targetIndustry}
Target Role: {targetRole}

**GROUND TRUTH:**
Allowed Skills: {allowedSkills}
Forbidden Claims: {forbiddenClaims}

Return JSON: {"content": "...", "title": "...", "keyHighlights": {...}}`
    ]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: input.name,
      workExperience: input.workExperience || (isFinnish ? "Työkokemusta kartuttamassa" : "Building experience"),
      education: input.education || (isFinnish ? "Jatkuva oppija" : "Continuous learner"),
      skills: input.skills || (isFinnish ? "Monipuolisia taitoja" : "Versatile skills"),
      workingStyle: input.workingStyle || (isFinnish ? "Sopeutuva ja joustava" : "Adaptable and flexible"),
      problemSolving: input.problemSolving || (isFinnish ? "Looginen ajattelija" : "Logical thinker"),
      uniqueStrength: input.uniqueStrength || (isFinnish ? "Nopea oppimaan" : "Quick learner"),
      superpower: input.superpower || (isFinnish ? "Luotettava ammattilainen" : "Reliable professional"),
      energySources: input.energySources || (isFinnish ? "Haastavat tehtävät" : "Challenging tasks"),
      learningStyle: input.learningStyle || (isFinnish ? "Tekemällä oppiminen" : "Learning by doing"),
      teamRole: input.teamRole || (isFinnish ? "Yhteistyökykyinen" : "Collaborative"),
      bestProjectExample: input.bestProjectExample || (isFinnish ? "Johdonmukainen suorittaminen" : "Consistent delivery"),
      failureLesson: input.failureLesson || (isFinnish ? "Virheistä oppiminen" : "Learning from mistakes"),
      careerGoals: input.careerGoals || (isFinnish ? "Ammatillinen kasvu" : "Professional growth"),
      valuesExample: input.valuesExample || (isFinnish ? "Rehellisyys ja sitoutuminen" : "Honesty and commitment"),
      targetIndustry: input.targetIndustry || (isFinnish ? "monipuolisilla aloilla" : "diverse industries"),
      targetRole: input.targetRole || (isFinnish ? "sopivissa rooleissa" : "suitable roles"),
      allowedSkills: input.allowedSkills?.join(", ") || (isFinnish ? "Profiilin mukaiset taidot" : "Profile-based skills"),
      forbiddenClaims: input.forbiddenClaims?.join(", ") || (isFinnish ? "Ei rajoituksia" : "No restrictions"),
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    
    // Parse response
    const content = typeof result.content === "string"
      ? result.content
      : JSON.stringify(result.content);

    const cleanContent = content
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    const parsed = await outputParser.parse(jsonMatch[0]);

    // Clean any potential placeholders (safety net)
    let finalContent = (parsed.content || "")
      .replace(/\[.*?\]/g, "") // Remove any [bracketed] text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2") // Ensure paragraph spacing
      .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
      .trim();

    console.log('✅ [GENERAL] Personal introduction created successfully');

    return {
      content: finalContent,
      title: parsed.title || (isFinnish ? "Henkilökohtainen esittely" : "Personal Introduction"),
      signature: input.name,
      questions: [], // Never asks questions for general letters
      keyHighlights: parsed.keyHighlights,
    };

  } catch (error) {
    console.error("❌ [GENERAL] Generation failed:", error);
    throw error;
  }
}