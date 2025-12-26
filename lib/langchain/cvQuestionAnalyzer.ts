// lib/langchain/cvQuestionAnalyzer.ts - UUSI TIEDOSTO
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import crypto from 'crypto';
import type { LangChainCVInput } from "@/lib/profileDataTransform";

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

interface PreviousResponse {
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

/**
 * ✅ HAE AIEMMAT CV-VASTAUKSET
 */
async function getPreviousCVResponses(userId: string): Promise<PreviousResponse[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(
      `${baseUrl}/api/user-responses?category=cv`,
      { 
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (!response.ok) return [];
    
    const data = await response.json();
    return (data.responses || []).map((r: any) => ({
      question: r.question_text,
      answer: r.answer,
      category: r.question_category,
      created_at: r.created_at
    }));
  } catch (error) {
    console.error('Error fetching CV responses:', error);
    return [];
  }
}

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
): { found: boolean; answer?: string } {
  const questionId = generateQuestionId(questionText);
  
  for (const response of previousResponses) {
    const existingId = generateQuestionId(response.question);
    if (existingId === questionId) {
      return { found: true, answer: response.answer };
    }
  }
  
  return { found: false };
}

/**
 * ✅ ANALYSOI CV-DATA JA PÄÄTÄ KYSYTÄÄNKÖ LISÄÄ
 */
export async function analyzeCVData(input: {
  userData: LangChainCVInput;
  cvType: 'simple' | 'technical' | 'creative';
  language: string;
  userId?: string;
}): Promise<CVQuestionAnalysis> {
  
  console.log('🔍 CV: Analyzing data quality...');
  
  // 1. HAE AIEMMAT VASTAUKSET
  let previousResponses: PreviousResponse[] = [];
  if (input.userId) {
    previousResponses = await getPreviousCVResponses(input.userId);
    console.log(`📚 Found ${previousResponses.length} previous CV answers`);
  }
  
  // 2. RAKENNA HISTORIA-KONTEKSTI
  const historyContext = previousResponses.length > 0
    ? `\n**PREVIOUS ANSWERS (DO NOT ASK AGAIN):**\n${previousResponses
        .map(r => `• "${r.question}" → "${r.answer}"`)
        .join('\n')}\n`
    : '';

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.2,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a universal CV quality analyzer for ALL professions, backgrounds, and experience levels.

**CORE PHILOSOPHY:**
Every person has value regardless of experience level. Your job is to help them present their ACTUAL strengths, not fabricate fake experience.

${historyContext}

**CV TYPE REQUIREMENTS:**

1. **SIMPLE CV (Personality-focused)**:
   - CRITICAL: Name, Email, Basic intro
   - IMPORTANT: Personality traits (working style, strengths)
   - HELPFUL: Some work history or education
   - PURPOSE: Show WHO they are, not just WHAT they've done
   - PERFECT FOR: Career changers, students, returners to workforce

2. **TECHNICAL CV (Skills-focused)**:
   - CRITICAL: Technical skills, work experience
   - IMPORTANT: Projects, achievements
   - HELPFUL: Certifications, education
   - PURPOSE: Prove technical competence
   - PERFECT FOR: Developers, engineers, technical roles

3. **CREATIVE CV (Portfolio-focused)**:
   - CRITICAL: Portfolio examples, creative projects
   - IMPORTANT: Design skills, tools used
   - HELPFUL: Work history, education
   - PURPOSE: Show creative capabilities
   - PERFECT FOR: Designers, artists, content creators

**WHEN TO ASK QUESTIONS:**

❓ ASK IF:
- Critical field for CV type is COMPLETELY EMPTY
- Information is so vague it's meaningless ("some experience")
- Person claims skill but provides NO context
- **Question is NOT already answered in PREVIOUS ANSWERS**

✅ DON'T ASK IF:
- They have SOMETHING in critical fields (even if basic)
- Information is limited but honest (entry-level is OK!)
- Person is clearly early career (questions won't help)
- Question already answered previously
- More than 5 questions would be needed (overwhelming)

**CRITICAL: NO DISCRIMINATION**
- Unemployed person with no experience? ✅ Valid CV about potential
- Career changer with unrelated experience? ✅ Valid CV about transferable skills
- Student with no job history? ✅ Valid CV about education and eagerness
- Senior with 20 years experience? ✅ Valid CV about expertise

EVERYONE deserves a quality CV with their ACTUAL data.

**OUTPUT:**
{{
  "shouldAskQuestions": true/false,
  "canGenerateWithoutQuestions": true/false,
  "confidence": 0-100,
  "questions": [
    {{
      "id": "unique_id",
      "question": "Question in user's language",
      "why": "Why this matters for THIS CV type",
      "field": "which field needs clarity",
      "priority": "critical|important|helpful",
      "category": "work_experience|education|skills|personality|achievements",
      "helpText": "Example answer"
    }}
  ],
  "reasoning": "Brief explanation",
  "dataQuality": {{
    "hasBasicInfo": true/false,
    "hasWorkExperience": true/false,
    "hasEducation": true/false,
    "hasSkills": true/false,
    "hasPersonality": true/false
  }}
}}

Return JSON only.`],

    ["human", `Analyze if we can create quality CV with this data.

**CV TYPE:** {cvType}
**LANGUAGE:** {language}

**USER DATA:**
Name: {name}
Email: {email}
Location: {location}
Title: {title}

Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages: {languages}

**PERSONALITY (Critical for Simple CV):**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Team Role: {teamRole}
Superpower: {superpower}

Career Goals: {careerGoals}
Best Project: {bestProjectExample}

**PREVIOUS USER ANSWERS (DO NOT ASK AGAIN):**
${previousResponses.length > 0 
  ? previousResponses.map(r => `• ${r.question} → ${r.answer}`).join('\n')
  : 'No previous answers'}

**YOUR TASK:**
1. Check if critical data for {cvType} CV exists
2. **Verify questions aren't already answered**
3. Ask ONLY if truly necessary
4. Max 5 questions
5. Questions in {language}

Remember: Better to generate basic CV than overwhelm with questions.

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      cvType: input.cvType,
      language: input.language,
      name: input.userData.name || "Not provided",
      email: input.userData.email || "Not provided",
      location: input.userData.location || "Not provided",
      title: input.userData.title || "Not provided",
      workExperience: input.userData.workExperience || "Not provided",
      education: input.userData.education || "Not provided",
      skills: input.userData.skills || "Not provided",
      languages: input.userData.languages || "Not provided",
      workingStyle: input.userData.workingStyle || "Not provided",
      problemSolving: input.userData.problemSolving || "Not provided",
      uniqueStrength: input.userData.uniqueStrength || "Not provided",
      teamRole: input.userData.teamRole || "Not provided",
      superpower: input.userData.superpower || "Not provided",
      careerGoals: input.userData.careerGoals || "Not provided",
      bestProjectExample: input.userData.bestProjectExample || "Not provided",
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const analysis: CVQuestionAnalysis = JSON.parse(jsonMatch[0]);
    
    // 3. SUODATA POIS JO VASTATUT KYSYMYKSET
    if (analysis.questions && previousResponses.length > 0) {
      const originalCount = analysis.questions.length;
      
      analysis.questions = analysis.questions.filter(q => {
        const existing = hasExistingAnswer(q.question, previousResponses);
        
        if (existing.found) {
          console.log(`⏭️ Skipping answered: "${q.question}"`);
          return false;
        }
        
        return true;
      });
      
      console.log(`📝 Questions: ${originalCount} → ${analysis.questions.length}`);
    }
    
    console.log(`✅ CV Analysis:`);
    console.log(`   Should ask: ${analysis.shouldAskQuestions}`);
    console.log(`   Can generate: ${analysis.canGenerateWithoutQuestions}`);
    console.log(`   Questions: ${analysis.questions.length}`);
    console.log(`   Confidence: ${analysis.confidence}%`);
    
    return analysis;
  } catch (error) {
    console.error('CV question analysis failed:', error);
    
    // FALLBACK: Yksinkertainen tarkistus
    const hasBasicInfo = !!(input.userData.name && input.userData.email);
    const hasWorkExp = !!(input.userData.workExperience && input.userData.workExperience.length > 20);
    const hasEdu = !!(input.userData.education && input.userData.education.length > 10);
    const hasSkills = !!(input.userData.skills && input.userData.skills.length > 10);
    const hasPersonality = !!(
      input.userData.workingStyle || 
      input.userData.uniqueStrength || 
      input.userData.problemSolving
    );
    
    return {
      shouldAskQuestions: false,
      canGenerateWithoutQuestions: true,
      confidence: hasBasicInfo ? 60 : 30,
      questions: [],
      reasoning: 'Fallback analysis - proceeding with available data',
      dataQuality: {
        hasBasicInfo,
        hasWorkExperience: hasWorkExp,
        hasEducation: hasEdu,
        hasSkills,
        hasPersonality
      }
    };
  }
}

/**
 * ✅ YHDISTÄ VASTAUKSET PROFIILIIN
 */
export function mergeCVAnswers(
  originalData: LangChainCVInput,
  answers: Array<{ id: string; question: string; answer: string }>
): LangChainCVInput {
  const enhanced = { ...originalData };
  
  answers.forEach(({ question, answer, id }) => {
    const category = id.split('_')[0];
    
    switch (category) {
      case 'skills':
        enhanced.skills = enhanced.skills 
          ? `${enhanced.skills}\n\n${answer}`
          : answer;
        break;
      case 'experience':
      case 'work':
        enhanced.workExperience = enhanced.workExperience 
          ? `${enhanced.workExperience}\n\n${answer}`
          : answer;
        break;
      case 'education':
        enhanced.education = enhanced.education 
          ? `${enhanced.education}\n\n${answer}`
          : answer;
        break;
      case 'personality':
      case 'strength':
        enhanced.uniqueStrength = enhanced.uniqueStrength 
          ? `${enhanced.uniqueStrength}\n${answer}`
          : answer;
        break;
      default:
        // Lisää careerGoals:iin jos ei ole parempi paikka
        enhanced.careerGoals = enhanced.careerGoals 
          ? `${enhanced.careerGoals}\n\n${answer}`
          : answer;
    }
  });
  
  return enhanced;
}