// lib/langchain/smartQuestionAnalyzer.ts - FIXED VERSION

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import crypto from 'crypto';

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
  questions: SmartQuestion[]; // ✅ AINA ARRAY
  reasoning: string;
}

interface PreviousResponse {
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

function generateQuestionId(questionText: string): string {
  return crypto
    .createHash('sha256')
    .update(questionText.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

// ✅ KORJATTU: Palauttaa AINA arrayn, ei koskaan undefined
export async function getPreviousResponses(
  userId: string,
  category?: string
): Promise<PreviousResponse[]> {
  // ✅ TURVA: Palauta tyhjä array heti jos ei userId
  if (!userId) {
    console.log('⏭️ No userId, returning empty array');
    return [];
  }

  try {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // ✅ TURVA: Timeout 5 sekuntia
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `${baseUrl}/api/user-responses?${params.toString()}`,
      { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Failed to fetch previous responses:', response.status);
      return []; // ✅ Palauta tyhjä array virhetilanteessa
    }
    
    const data = await response.json();
    
    // ✅ TURVA: Varmista että responses on array
    const responses = Array.isArray(data.responses) ? data.responses : [];
    
    return responses.map((r: any) => ({
      question: r.question_text || '',
      answer: r.answer || '',
      category: r.question_category || '',
      created_at: r.created_at || ''
    }));
  } catch (error) {
    console.error('Error fetching previous responses:', error);
    return []; // ✅ AINA array, ei koskaan undefined
  }
}

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  
  const words1 = new Set(s1.split(/\s+/));
  const words2 = new Set(s2.split(/\s+/));
  
  const intersection = new Set([...words1].filter(w => words2.has(w)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

export function hasExistingAnswer(
  questionText: string,
  previousResponses: PreviousResponse[]
): { found: boolean; answer?: string; similarity?: number } {
  
  // ✅ TURVA: Tarkista että previousResponses on array
  if (!Array.isArray(previousResponses) || previousResponses.length === 0) {
    return { found: false };
  }

  const questionId = generateQuestionId(questionText);
  
  for (const response of previousResponses) {
    const existingId = generateQuestionId(response.question);
    
    if (existingId === questionId) {
      console.log(`✅ Exact match found: "${response.question}"`);
      return { found: true, answer: response.answer, similarity: 1.0 };
    }
    
    const similarity = calculateSimilarity(questionText, response.question);
    if (similarity > 0.85) {
      console.log(`✅ Similar question found (${Math.round(similarity * 100)}%): "${response.question}"`);
      return { found: true, answer: response.answer, similarity };
    }
  }
  
  return { found: false };
}

// ✅ KORJATTU: Palauttaa AINA QuestionAnalysisResult jossa questions on ARRAY
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
  userId?: string;
}): Promise<QuestionAnalysisResult> {
  
  // ✅ HAE AIEMMAT VASTAUKSET (AINA ARRAY)
  let previousResponses: PreviousResponse[] = [];
  
  if (input.userId) {
    console.log('📚 Fetching previous responses for user:', input.userId);
    try {
      previousResponses = await getPreviousResponses(input.userId);
      console.log(`📚 Found ${previousResponses.length} previous responses`);
    } catch (error) {
      console.error('Error in getPreviousResponses:', error);
      previousResponses = []; // ✅ Fallback tyhjä array
    }
  }
  
  // ✅ VARMISTA että previousResponses on array
  if (!Array.isArray(previousResponses)) {
    console.warn('⚠️ previousResponses not array, fixing...');
    previousResponses = [];
  }
  
  const historyContext = previousResponses.length > 0
    ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**PREVIOUS ANSWERS (USER HAS ALREADY ANSWERED THESE):**
${previousResponses
  .map(r => `Q: "${r.question}"\nA: "${r.answer}"\n`)
  .join('\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CRITICAL INSTRUCTION:**
DO NOT ask questions that are already answered above.`
    : '';

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an intelligent analyzer that compares job requirements with candidate profiles.

${historyContext}

Return JSON with these fields:
{
  "shouldAskQuestions": true/false,
  "canGenerateWithoutQuestions": true/false,
  "confidence": 0-100,
  "questions": [...],
  "reasoning": "..."
}

Return JSON only.`],

    ["human", `Analyze job against profile.

**LANGUAGE:** {language}
**JOB:** {jobDescription}
**PROFILE:** 
Name: {name}
Work Experience: {workExperience}
Education: {education}
Skills: {skills}

Return JSON with questions array (can be empty).`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language,
      jobDescription: input.jobDescription,
      name: input.userProfile.name,
      workExperience: input.userProfile.workExperience || "Not specified",
      education: input.userProfile.education || "Not specified",
      skills: input.userProfile.skills || "Not specified",
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const analysis: QuestionAnalysisResult = JSON.parse(jsonMatch[0]);
    
    // ✅ KRIITTINEN TURVA: Varmista että questions on AINA array
    if (!Array.isArray(analysis.questions)) {
      console.warn('⚠️ AI returned non-array questions, fixing...');
      analysis.questions = [];
    }
    
    // ✅ Suodata pois jo vastatut
    if (analysis.questions.length > 0 && previousResponses.length > 0) {
      const originalCount = analysis.questions.length;
      
      analysis.questions = analysis.questions.filter(q => {
        const existing = hasExistingAnswer(q.question, previousResponses);
        if (existing.found) {
          console.log(`⏭️ Skipping already answered: "${q.question}"`);
          return false;
        }
        return true;
      });
      
      console.log(`📝 Questions: ${originalCount} → ${analysis.questions.length}`);
    }
    
    console.log(`🤔 Analysis complete: ${analysis.questions.length} questions`);
    
    return analysis;
  } catch (error) {
    console.error('Question analysis failed:', error);
    
    // ✅ FALLBACK: Palauta AINA validin rakenteen
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: 70,
      questions: [], // ✅ AINA ARRAY
      reasoning: 'Analysis failed, proceeding with available data'
    };
  }
}

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