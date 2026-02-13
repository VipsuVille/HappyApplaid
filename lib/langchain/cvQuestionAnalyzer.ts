// lib/langchain/cvQuestionAnalyzer.ts

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import crypto from 'crypto';
import type { LangChainCVInput } from "@/lib/profileDataTransform";
import { fetchPreviousResponses, type PreviousResponse } from "./responseHelper";

export interface CVQuestion {
  id: string;
  question: string;
  why: string;
  field: string;
  priority: 'critical' | 'important' | 'helpful';
  category: 'work_experience' | 'education' | 'skills' | 'personality' | 'achievements';
  helpText?: string;
}

export interface CVQuestionAnalysis {
  shouldAskQuestions: boolean;
  canGenerateWithoutQuestions: boolean;
  confidence: number;
  questions: CVQuestion[];
  reasoning: string;
  dataQuality: {
    hasBasicInfo: boolean;
    hasWorkExperience: boolean;
    hasEducation: boolean;
    hasSkills: boolean;
    hasPersonality: boolean;
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

function generateQuestionId(questionText: string): string {
  return crypto
    .createHash('sha256')
    .update(questionText.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

function hasExistingAnswer(
  questionText: string,
  previousResponses: PreviousResponse[]
): boolean {
  const questionId = generateQuestionId(questionText);
  return previousResponses.some(
    (r) => generateQuestionId(r.question_text) === questionId
  );
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────

/**
 * Analysoi CV-datan laatu ja päättää kysytäänkö lisäkysymyksiä.
 *
 * AI generoi kysymykset käyttäjän omalla kielellä (language-parametri).
 * Ei kovakoodattuja kysymyksiä, ei kielispesifisiä avainsanoja.
 * Toimii kaikilla aloilla ja kaikilla taustoilla.
 */
export async function analyzeCVData(input: {
  userData: LangChainCVInput;
  cvType: 'simple' | 'technical' | 'creative';
  language: string;
  userId?: string;
}): Promise<CVQuestionAnalysis> {

  console.log('🔍 CV: Analyzing data quality...');

  // Hae aiemmat vastaukset – käyttää responseHelper.ts:ää
  let previousResponses: PreviousResponse[] = [];
  if (input.userId) {
    previousResponses = await fetchPreviousResponses('cv', 'cv_generation');
    console.log(`📚 Found ${previousResponses.length} previous CV answers`);
  }

  // Kootaan aiempien vastausten yhteenveto AI-promptia varten.
  // Muoto: kysymys → vastaus (lyhennettynä jos pitkä)
  const previousAnswersSummary = previousResponses.length > 0
    ? previousResponses
        .map(r => {
          const shortAnswer = r.answer.length > 120
            ? r.answer.substring(0, 120) + '…'
            : r.answer;
          return `• Q: "${r.question_text}"\n  A: "${shortAnswer}"`;
        })
        .join('\n')
    : 'None';

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a CV quality analyzer. Your job is to decide whether to ask the user clarifying questions before generating their CV.

**CRITICAL RULES:**

1. **LANGUAGE**: Always write questions in the exact language specified by the "language" parameter. Do NOT default to English or Finnish unless that is the specified language.

2. **UNIVERSAL**: This tool is used by people from ALL backgrounds — nurses, retirees, students, engineers, artists, farmers, teachers, doctors, janitors. Treat all backgrounds as equally valid.

3. **DO NOT ASK IF ALREADY ANSWERED**: The user has already answered some questions (see PREVIOUS ANSWERS). Do not generate questions that are semantically equivalent to already-answered ones.

4. **GENERATE WITH WHAT YOU HAVE**: If the user has provided enough context to write a reasonable CV — even a basic one — set canGenerateWithoutQuestions to true. A short CV is better than no CV.

5. **MAX 3 QUESTIONS**: Never generate more than 3 questions. Prioritize the most critical missing information.

6. **CV TYPE CONTEXT**:
   - simple: personality and story matter most; work history is secondary
   - technical: skills and specific experience matter most
   - creative: portfolio examples and creative projects matter most

7. **DO NOT INVENT REQUIREMENTS**: Do not ask for things that are typical in your training data but may not apply to this person's field or background.

**OUTPUT FORMAT (JSON only, no markdown):**
{
  "shouldAskQuestions": boolean,
  "canGenerateWithoutQuestions": boolean,
  "confidence": 0-100,
  "questions": [
    {
      "id": "unique_snake_case_id",
      "question": "Question in the specified language",
      "why": "Brief reason in the specified language",
      "field": "profile field this maps to",
      "priority": "critical|important|helpful",
      "category": "work_experience|education|skills|personality|achievements",
      "helpText": "Example answer in the specified language"
    }
  ],
  "reasoning": "Brief explanation in the specified language",
  "dataQuality": {
    "hasBasicInfo": boolean,
    "hasWorkExperience": boolean,
    "hasEducation": boolean,
    "hasSkills": boolean,
    "hasPersonality": boolean
  }
}`],

    ["human", `Analyze this CV data and decide whether to ask clarifying questions.

LANGUAGE FOR QUESTIONS: {language}
CV TYPE: {cvType}

--- PROFILE DATA ---
Name: {name}
Title / Role: {title}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages spoken: {languages}
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Team Role: {teamRole}
Career Goals: {careerGoals}
Best Project / Achievement: {bestProjectExample}

--- PREVIOUS ANSWERS (DO NOT ASK AGAIN) ---
{previousAnswersSummary}

Instructions:
- Write all questions in: {language}
- Consider the CV type ({cvType}) when deciding what is truly critical
- Only ask if missing info would significantly harm the CV quality
- Max 3 questions
- Return valid JSON only`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language,
      cvType: input.cvType,
      name: input.userData.name || '',
      title: input.userData.title || '',
      workExperience: input.userData.workExperience || '',
      education: input.userData.education || '',
      skills: input.userData.skills || '',
      languages: input.userData.languages || '',
      workingStyle: input.userData.workingStyle || '',
      problemSolving: input.userData.problemSolving || '',
      uniqueStrength: input.userData.uniqueStrength || '',
      superpower: input.userData.superpower || '',
      teamRole: input.userData.teamRole || '',
      careerGoals: input.userData.careerGoals || '',
      bestProjectExample: input.userData.bestProjectExample || '',
      previousAnswersSummary,
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');

    const analysis: CVQuestionAnalysis = JSON.parse(jsonMatch[0]);

    // Suodata pois kysymykset joihin on jo vastattu
    // (AI saattaa silti generoida semanttisesti samoja kysymyksiä)
    if (analysis.questions?.length > 0 && previousResponses.length > 0) {
      const before = analysis.questions.length;
      analysis.questions = analysis.questions.filter(
        (q) => !hasExistingAnswer(q.question, previousResponses)
      );
      const removed = before - analysis.questions.length;
      if (removed > 0) {
        console.log(`⏭️ Filtered out ${removed} already-answered question(s)`);
      }
    }

    // Jos kaikki kysymykset suodatettiin pois, voidaan generoida suoraan
    if (analysis.questions.length === 0) {
      analysis.shouldAskQuestions = false;
      analysis.canGenerateWithoutQuestions = true;
    }

    console.log(`✅ CV Analysis: shouldAsk=${analysis.shouldAskQuestions}, questions=${analysis.questions.length}, confidence=${analysis.confidence}`);

    return analysis;

  } catch (error) {
    console.error('❌ analyzeCVData failed, using fallback:', error);

    // Fallback: ei kovakoodattuja kysymyksiä, generoidaan suoraan mitä on
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: 50,
      questions: [],
      reasoning: 'Analysis failed, proceeding with available data',
      dataQuality: {
        hasBasicInfo: !!(input.userData.name),
        hasWorkExperience: !!(input.userData.workExperience),
        hasEducation: !!(input.userData.education),
        hasSkills: !!(input.userData.skills),
        hasPersonality: !!(input.userData.workingStyle || input.userData.uniqueStrength),
      }
    };
  }
}

// ─────────────────────────────────────────────────────────────────
// MERGE (käytetään kun käyttäjä vastaa kysymyksiin)
// ─────────────────────────────────────────────────────────────────

/**
 * Yhdistää käyttäjän vastaamat kysymykset LangChainCVInput-profiiliin.
 * Käyttää question id:n etuliitettä kategoriana — ei kielispesifistä logiikkaa.
 */
export function mergeCVAnswers(
  originalData: LangChainCVInput,
  answers: Array<{ id: string; question: string; answer: string }>
): LangChainCVInput {
  const enhanced = { ...originalData };

  answers.forEach(({ id, answer }) => {
    if (!answer?.trim()) return;

    // Kategoria johdetaan id:n etuliitteestä
    // Esim. "work_experience_detail" → "work_experience"
    //       "skills_detail"          → "skills"
    //       "education_detail"       → "education"
    //       "best_project"           → "best_project"
    const prefix = id.split('_')[0];

    switch (prefix) {
      case 'work':
      case 'experience':
        enhanced.workExperience = enhanced.workExperience
          ? `${enhanced.workExperience}\n${answer}`
          : answer;
        break;

      case 'education':
        enhanced.education = enhanced.education
          ? `${enhanced.education}\n${answer}`
          : answer;
        break;

      case 'skills':
        enhanced.skills = enhanced.skills
          ? `${enhanced.skills}\n${answer}`
          : answer;
        break;

      case 'personality':
      case 'strength':
        enhanced.uniqueStrength = enhanced.uniqueStrength
          ? `${enhanced.uniqueStrength}\n${answer}`
          : answer;
        break;

      case 'best':
      case 'project':
      case 'achievement':
        enhanced.bestProjectExample = enhanced.bestProjectExample
          ? `${enhanced.bestProjectExample}\n${answer}`
          : answer;
        break;

      case 'goal':
      case 'career':
        enhanced.careerGoals = enhanced.careerGoals
          ? `${enhanced.careerGoals}\n${answer}`
          : answer;
        break;

      default:
        // Tuntematon — lisätään työkokemukseen jos vastaus on pitkä,
        // muuten careerGoals-kenttään
        if (answer.length > 80) {
          enhanced.workExperience = enhanced.workExperience
            ? `${enhanced.workExperience}\n${answer}`
            : answer;
        } else {
          enhanced.careerGoals = enhanced.careerGoals
            ? `${enhanced.careerGoals}\n${answer}`
            : answer;
        }
    }
  });

  return enhanced;
}