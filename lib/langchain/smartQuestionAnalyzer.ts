// lib/langchain/smartQuestionAnalyzer.ts - 100% FLEXIBLE, ZERO HARDCODING

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface SmartQuestion {
  id: string;
  question: string;
  why: string;
  jobRequirement: string;
  currentUserData: string;
  priority: 'critical' | 'important' | 'helpful';
  helpText?: string;
}

export interface QuestionAnalysisResult {
  shouldAskQuestions: boolean;
  canGenerateWithoutQuestions: boolean;
  confidence: number;
  questions: SmartQuestion[];
  reasoning: string;
}

/**
 * ✅ 100% FLEXIBLE ANALYZER - NO HARDCODED RULES
 */
export async function analyzeJobAndProfile(input: {
  jobDescription: string;
  userProfile: {
    name: string;
    workExperience?: string;
    education?: string;
    skills?: string;
    workingStyle?: string;
    problemSolving?: string;
    uniqueStrength?: string;
    careerGoals?: string;
    bestProjectExample?: string;
    failureLesson?: string;
    personalNotes?: string;
    [key: string]: any;
  };
  language: string;
}): Promise<QuestionAnalysisResult> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an intelligent analyzer that compares job requirements with candidate profiles across ALL industries, languages, and contexts.

**CORE PHILOSOPHY:**
Every job is UNIQUE. Every profile is UNIQUE. Use ZERO assumptions about industries, roles, or requirements.

**YOUR MISSION:**
1. Read THIS SPECIFIC job posting
2. Understand what THIS SPECIFIC job needs
3. Check if THIS SPECIFIC profile addresses those needs
4. Ask questions ONLY for genuine gaps or unclear areas

**UNIVERSAL PRINCIPLES (apply to ANY job, ANY field):**

1. **GAP DETECTION**: Use semantic understanding, not pattern matching
   - Job mentions X → Profile doesn't mention X → Consider asking
   - Job emphasizes Y → Profile mentions Y vaguely → Consider clarifying
   - Use AI understanding of meaning, not keyword matching

2. **PRIORITY ASSESSMENT**: Dynamically determine importance
   - CRITICAL: Job explicitly requires it, profile lacks it entirely
   - IMPORTANT: Job emphasizes it, profile is unclear/vague
   - HELPFUL: Would strengthen application, not essential

3. **QUESTION QUALITY**: Be specific and actionable
   - Reference exact phrases from job posting
   - Explain WHY it matters for THIS role
   - Give context: "Työilmoituksessa mainitaan..."
   - Make answerable: Ask for examples, not essays

4. **NATURAL LANGUAGE**: Adapt to user's language automatically
   - Detect language from profile/job description
   - Ask questions in THEIR language
   - Use culturally appropriate phrasing

**WHEN TO ASK (universal across all fields):**
- Job explicitly requires something profile doesn't mention
- Profile mentions something relevant but too vaguely
- Job implies need for something profile could clarify
- Technical term/tool/concept job mentions but profile doesn't address

**WHEN NOT TO ASK:**
- Profile already addresses the requirement clearly
- Requirement is too minor/peripheral
- Question would be generic ("tell me about yourself")
- More than 5 questions needed (overwhelming)

**FORBIDDEN:**
- Hardcoded industry patterns
- Predetermined question templates
- Assumptions based on job titles
- Generic questions unrelated to THIS specific job

**OUTPUT:**
{{
  "shouldAskQuestions": true/false,
  "canGenerateWithoutQuestions": true/false,
  "confidence": 0-100,
  "questions": [
    {{
      "id": "unique_id",
      "question": "Specific question in user's language",
      "why": "Why this matters for THIS job",
      "jobRequirement": "Exact quote/paraphrase from job",
      "currentUserData": "What profile currently says (or doesn't)",
      "priority": "critical|important|helpful",
      "helpText": "Example answer to guide user"
    }}
  ],
  "reasoning": "Brief explanation in user's language"
}}

Return JSON only.`],

    ["human", `Analyze THIS UNIQUE job posting against THIS UNIQUE candidate profile.

**LANGUAGE TO USE:** {language}

**THIS JOB POSTING:**
{jobDescription}

**THIS CANDIDATE'S PROFILE:**
Name: {name}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Career Goals: {careerGoals}
Best Project: {bestProjectExample}
Failure Lesson: {failureLesson}
Personal Notes: {personalNotes}

**YOUR TASK:**
Use semantic AI understanding to:
1. Understand what THIS job truly needs (not industry stereotypes)
2. Check if profile addresses those needs
3. Generate SPECIFIC questions for gaps
4. Keep questions in {language}
5. Max 5 questions, prioritize most important

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language,
      jobDescription: input.jobDescription,
      name: input.userProfile.name,
      workExperience: input.userProfile.workExperience || "Not specified",
      education: input.userProfile.education || "Not specified",
      skills: input.userProfile.skills || "Not specified",
      workingStyle: input.userProfile.workingStyle || "Not specified",
      problemSolving: input.userProfile.problemSolving || "Not specified",
      uniqueStrength: input.userProfile.uniqueStrength || "Not specified",
      careerGoals: input.userProfile.careerGoals || "Not specified",
      bestProjectExample: input.userProfile.bestProjectExample || "Not specified",
      failureLesson: input.userProfile.failureLesson || "Not specified",
      personalNotes: input.userProfile.personalNotes || "Not specified",
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const analysis: QuestionAnalysisResult = JSON.parse(jsonMatch[0]);
    
    console.log(`🤔 Flexible Analysis:`);
    console.log(`   Should ask: ${analysis.shouldAskQuestions}`);
    console.log(`   Can generate anyway: ${analysis.canGenerateWithoutQuestions}`);
    console.log(`   Questions: ${analysis.questions.length}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    
    return analysis;
  } catch (error) {
    console.error('Question analysis failed:', error);
    
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: 70,
      questions: [],
      reasoning: 'Analysis failed, proceeding with available data'
    };
  }
}

/**
 * ✅ YHDISTÄ VASTAUKSET PROFIILIIN
 */
export function mergeAnswersToProfile(
  originalProfile: any,
  questionAnswers: Record<string, string>
): any {
  const enhanced = { ...originalProfile };
  
  const answers = Object.entries(questionAnswers)
    .filter(([_, answer]) => answer.trim())
    .map(([_, answer]) => answer)
    .join('\n\n');
  
  if (answers) {
    enhanced.personalNotes = enhanced.personalNotes 
      ? `${enhanced.personalNotes}\n\n--- Lisätietoja ---\n${answers}`
      : answers;
  }
  
  return enhanced;
}