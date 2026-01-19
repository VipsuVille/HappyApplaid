// lib/langchain/coverLetterGeneratorV2.ts - ENHANCED VERSION

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CoverLetterV2Input {
  jobDescription: string;
  personalNotes?: string;
  language?: string;
  style?: "formal" | "casual";
  
  name: string;
  email: string;
  phone: string;
  age?: number;
  
  education?: string;
  workExperience?: string;
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
  
  userId?: string;
  skipQuestions?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA - ENHANCED
// ═══════════════════════════════════════════════════════════════

const v2Schema = z.object({
  fullText: z.string(),
  keyPoints: z.object({
    personalityHook: z.string().describe("Opening hook based on personality"),
    experienceHighlight: z.string().describe("Most relevant experience for THIS job"),
    skillsMatch: z.string().describe("How skills match THIS job requirements"),
    motivation: z.string().describe("Why THIS specific role"),
  }),
  atsData: z.object({
    matchedKeywords: z.array(z.string()).describe("Keywords from job posting used"),
    keywordDensity: z.number().min(0).max(100).describe("Keyword coverage %"),
    readabilityScore: z.number().min(1).max(10).describe("ATS readability"),
    suggestions: z.array(z.string()).optional().describe("Improvement suggestions"),
  }),
});

const outputParser = StructuredOutputParser.fromZodSchema(v2Schema);

// ═══════════════════════════════════════════════════════════════
// JOB ANALYZER - ENHANCED
// ═══════════════════════════════════════════════════════════════

async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = `Analysoi tämä työpaikkailmoitus ja pura tärkeimmät elementit.

**TYÖPAIKKAILMOITUS:**
${jobDescription}

Palauta JSON:
{
  "company_name": "Yrityksen nimi",
  "job_title": "Tehtävänimike",
  "industry": "Toimiala",
  "company_size": "startup|small|medium|large|enterprise",
  "required_skills": ["taito1", "taito2"],
  "preferred_skills": ["taito1", "taito2"],
  "keywords": ["avainsana1", "avainsana2"],
  "experience_level": "entry|junior|mid|senior|expert",
  "company_values": ["arvo1", "arvo2"],
  "key_responsibilities": ["vastuu1", "vastuu2"],
  "tone": "formal|professional|casual|innovative"
}`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('⚠️ Job analysis failed:', error);
    return {
      company_name: "yritys",
      job_title: "tehtävä",
      industry: "tuntematon",
      company_size: "unknown",
      required_skills: [],
      preferred_skills: [],
      keywords: [],
      experience_level: "mid",
      company_values: [],
      key_responsibilities: [],
      tone: "professional"
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN GENERATOR - ENHANCED
// ═══════════════════════════════════════════════════════════════

export async function generateCoherentCoverLetter(input: CoverLetterV2Input) {
  console.log('🔍 [V2-ATS] Starting enhanced generation...');

  // 1. SMART QUESTION ANALYSIS
  if (!input.skipQuestions) {
    try {
      const { analyzeJobAndProfile } = await import("./smartQuestionAnalyzer");
      
      const rawAnalysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          name: input.name,
          workExperience: input.workExperience || "",
          education: input.education || "",
          skills: input.skills || "",
          workingStyle: input.workingStyle || "",
          problemSolving: input.problemSolving || "",
          uniqueStrength: input.uniqueStrength || "",
          careerGoals: input.careerGoals || "",
          bestProjectExample: input.bestProjectExample || "",
          failureLesson: input.failureLesson || "",
          personalNotes: input.personalNotes || "",
        },
        language: input.language || 'finnish',
        userId: input.userId
      });

      const safeQuestions = Array.isArray(rawAnalysis?.questions) ? rawAnalysis.questions : [];
      const shouldAsk = rawAnalysis?.shouldAskQuestions === true;

      if (shouldAsk && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(q => q && q.priority === 'critical');

        if (criticalQuestions.length > 0) {
          console.log(`❓ [V2-ATS] Returning ${criticalQuestions.length} questions`);
          return {
            fullText: "",
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            questions: criticalQuestions,
            keyPoints: {
              personalityHook: "",
              experienceHighlight: "",
              skillsMatch: "",
              motivation: ""
            },
            atsData: {
              matchedKeywords: [],
              keywordDensity: 0,
              readabilityScore: 0
            },
            hasWorkExperience: false,
            needsMoreInfo: true
          };
        }
      }
    } catch (error) {
      console.error('⚠️ [V2-ATS] Question analysis error:', error);
    }
  }

  // 2. ANALYZE JOB POSTING
  console.log('🔍 [V2-ATS] Analyzing job posting...');
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);
  console.log(`📊 Detected: ${jobAnalysis.job_title} at ${jobAnalysis.company_name}`);

  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;

  // 3. BUILD RAG CONTEXT (Premium feature)
  let knowledgeContext = '';
  try {
    knowledgeContext = await buildAIContext({
      jobDescription: input.jobDescription,
      userProfile: {
        workExperience: input.workExperience || "",
        education: input.education || "",
        skills: input.skills || "",
        workingStyle: input.workingStyle || "",
        problemSolving: input.problemSolving || "",
        uniqueStrength: input.uniqueStrength || "",
        learningStyle: input.learningStyle || "",
        teamRole: input.teamRole || "",
        superpower: input.superpower || "",
        careerGoals: input.careerGoals || "",
        bestProjectExample: input.bestProjectExample || "",
        failureLesson: input.failureLesson || "",
      },
      enableRAG: true,
      contentType: 'cover_letter'
    });
    console.log('✅ RAG context loaded');
  } catch (error) {
    console.warn('⚠️ RAG skipped:', error);
  }

  // 4. GENERATE COVER LETTER
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const styleInstructions = input.style === 'casual'
    ? 'Keskusteleva mutta ammattimainen'
    : 'Muodollinen ja rakenteellinen';

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `Olet ATS-optimoitu hakukirjeen kirjoittaja. Tehtäväsi on kirjoittaa TÄLLE TIETYLLE TYÖPAIKALLE täydellisesti räätälöity hakukirje.

${knowledgeContext ? `**ASIANTUNTIJAKONTEKSTI:**\n${knowledgeContext}\n\n` : ''}

**TYÖPAIKAN ANALYYSI:**
Yritys: {companyName}
Tehtävä: {jobTitle}
Toimiala: {industry}
Koko: {companySize}
Vaadittavat taidot: {requiredSkills}
Avainsanat: {keywords}
Tyyli: {tone}

**ATS-OPTIMOINTI:**
1. Käytä työpaikkailmoituksen tarkkoja avainsanoja
2. Peilaa ilmoituksen terminologiaa
3. Korosta RELEVANTTEJA taitoja ja kokemuksia
4. Käytä lukuarvoja kun mahdollista
5. Selkeä rakenne, vakiosektiot

**RAKENNE:**
1. **Avaus (2-3 lausetta):**
   - Mikä TÄSSÄ tehtävässä kiinnostaa
   - Yhteys omaan taustaan

2. **Osaaminen (4-6 lausetta):**
   - Todelliset taidot mielenkiintoisesti
   - Persoonallisuus työssä
   - Konkreettiset esimerkit PROFIILISTA

3. **Motivaatio (2-3 lausetta):**
   - Innostus TÄTÄ roolia kohtaan
   - Miksi juuri TÄMÄ yritys
   - Halu keskustella lisää

**TYYLI:** {styleInstructions}
**KIELI:** {language}
**MAX:** 350 sanaa

Käytä VAIN todennettuja tietoja profiilista. EI KEKSINTÖJÄ.

{format_instructions}`],

    ["human", `Generoi ATS-optimoitu hakukirje TÄLLE työpaikalle.

**TYÖPAIKKAILMOITUS:**
{jobDescription}

**HAVAITUT TIEDOT:**
Yritys: {companyName}
Tehtävä: {jobTitle}
Avainsanat: {keywords}
Taidot: {requiredSkills}
Taso: {experienceLevel}

**HAKIJAN PROFIILI:**
Nimi: {name}
Ikä: {age}
Koulutus: {education}
Kokemus: {workExperience}
Taidot: {skills}

**PERSOONALLISUUS:**
Tyyli: {workingStyle}
Ongelmanratkaisu: {problemSolving}
Energia: {energySources}
Vahvuus: {uniqueStrength}
Oppiminen: {learningStyle}
Tiimirooli: {teamRole}
Identiteetti: {superpower}
Arvot: {valuesExample}

**SAAVUTUKSET:**
Tavoitteet: {careerGoals}
Paras projekti: {bestProjectExample}
Oppiminen: {failureLesson}

**HENKILÖKOHTAISET MUISTIINPANOT:**
{personalNotes}

Palauta JSON kentällä "fullText", "keyPoints" ja "atsData".`]
  ]);

  try {
    const formattedPrompt = await prompt.formatMessages({
      companyName: jobAnalysis.company_name,
      jobTitle: jobAnalysis.job_title,
      industry: jobAnalysis.industry,
      companySize: jobAnalysis.company_size,
      requiredSkills: jobAnalysis.required_skills.join(", ") || "Ei määritelty",
      keywords: jobAnalysis.keywords.join(", ") || "Ei määritelty",
      tone: jobAnalysis.tone,
      experienceLevel: jobAnalysis.experience_level,
      styleInstructions,
      language: input.language || "suomi",
      jobDescription: input.jobDescription,
      name: input.name,
      age: input.age ? `${input.age} vuotta` : 'Ei määritelty',
      workExperience: input.workExperience || "Kokemusta kartuttamassa",
      education: input.education || "Ei määritelty",
      skills: input.skills || "Kehittyvä",
      workingStyle: input.workingStyle || "Ei määritelty",
      problemSolving: input.problemSolving || "Ei määritelty",
      energySources: input.energySources || "Ei määritelty",
      uniqueStrength: input.uniqueStrength || "Ei määritelty",
      learningStyle: input.learningStyle || "Ei määritelty",
      teamRole: input.teamRole || "Ei määritelty",
      superpower: input.superpower || "Ei määritelty",
      valuesExample: input.valuesExample || "Ei määritelty",
      careerGoals: input.careerGoals || "Ei määritelty",
      bestProjectExample: input.bestProjectExample || "Ei määritelty",
      failureLesson: input.failureLesson || "Ei määritelty",
      personalNotes: input.personalNotes || "Ei määritelty",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formattedPrompt);
    const content = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);

    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON from V2');

    const parsed = await outputParser.parse(jsonMatch[0]);

    console.log('✅ [V2-ATS] Generation complete');
    console.log(`📊 ATS Score: ${parsed.atsData.keywordDensity}%`);

    return {
      fullText: parsed.fullText,
      content: parsed.fullText,
      title: jobAnalysis.job_title || "Hakukirje",
      signature: input.name,
      keyPoints: parsed.keyPoints,
      atsData: parsed.atsData,
      jobAnalysis,
      hasWorkExperience,
    };
  } catch (error) {
    console.error('❌ [V2-ATS] Generation failed:', error);
    throw new Error("V2 generation failed");
  }
}

export function generateATSReport(data: { atsData: any }) {
  return {
    keywords_used: data.atsData?.matchedKeywords.length || 0,
    total_keywords: data.atsData?.matchedKeywords.length || 0,
    keyword_match_score: data.atsData?.keywordDensity || 0,
    ats_compatibility_score: data.atsData?.readabilityScore * 10 || 70,
    critical_keywords_used: data.atsData?.matchedKeywords || [],
    missing_keywords: [],
    improvement_suggestions: data.atsData?.suggestions || [],
  };
}