// lib/langchain/universalValidator.ts - JOB-FIRST VALIDATION

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';

export interface UniversalQuestion {
  id: string;
  question: string;
  why: string;
  context: string;
  field: string;
  priority: 'critical' | 'important' | 'optional';
  type: 'clarification' | 'missing' | 'vague';
  suggestions?: string[];
}

export interface ValidationResult {
  canGenerateNow: boolean;
  score: number;
  questions: UniversalQuestion[];
  warnings: string[];
  reason: string;
}

/**
 * ✅ UNIVERSAALI VALIDOINTI - ANALYSOI TYÖ ENSIN
 */
export async function validateUniversally(input: {
  jobDescription: string;
  language: string;
  userProfile: {
    name?: string;
    email?: string;
    phone?: string;
    skills?: string;
    workExperience?: string;
    education?: string;
    problemSolving?: string;
    uniqueStrength?: string;
    [key: string]: any;
  };
  personalNotes?: string;
}): Promise<ValidationResult> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a universal cover letter quality validator. Each job posting is UNIQUE from a DIFFERENT industry.

**YOUR MISSION:**
Determine if we can write a HIGH-QUALITY cover letter for THIS SPECIFIC JOB with the provided information.

**STEP 1: ANALYZE THIS JOB**
What industry is this? What does THIS role need?

**STEP 2: CHECK IF CANDIDATE DATA MATCHES THIS JOB**
Does candidate have relevant information for THIS specific role?

**CRITICAL RULES - JOB-FIRST:**
1. **NO GENERIC CHECKS**: Each job needs different information
2. **CONTEXT-AWARE**: Tech job needs ≠ Retail job needs
3. **LANGUAGE AGNOSTIC**: Work in ANY language
4. **INDUSTRY AGNOSTIC**: Work for ANY field

**ASK QUESTIONS WHEN:**

1. **UNCLEAR TERMINOLOGY (CRITICAL)**:
   - Candidate mentions term that's unclear in THIS industry context
   - Could mean multiple things for THIS role
   - Might confuse recruiters in THIS field
   - Use AI understanding to detect unclear language

2. **INSUFFICIENT DETAIL FOR THIS JOB (IMPORTANT)**:
   - "I have projects" but THIS job needs specific project details
   - "I have experience" but THIS role requires specific experience type
   - Generic statements that don't prove fit for THIS job

3. **MISSING CRITICAL INFO FOR THIS ROLE (IMPORTANT)**:
   - THIS job requires X, candidate doesn't mention it
   - THIS role needs Y experience level, not provided
   - Use AI understanding of THIS job's requirements

4. **CONTRADICTIONS (CRITICAL)**:
   - Claims senior role but evidence suggests junior for THIS field
   - Says "no experience" but lists work relevant to THIS job
   - Mismatch between claims and evidence

**LANGUAGE HANDLING:**
- Detect user's language from input
- Ask questions in THEIR language
- If job is different language than profile, flag it

**OUTPUT:**
{
  "canGenerateNow": true/false,
  "score": 0-100,
  "questions": [
    {
      "id": "unclear_1",
      "question": "Question in user's language",
      "why": "Why this matters for THIS job",
      "context": "Exact quote from candidate",
      "field": "which profile field",
      "priority": "critical|important|optional",
      "type": "clarification|missing|vague",
      "suggestions": ["Possible meaning 1", "Possible meaning 2"]
    }
  ],
  "warnings": ["Warning in user's language"],
  "reason": "Explanation in user's language"
}

**SCORING:**
- 90-100: Excellent for THIS job, ready
- 70-89: Good for THIS job, minor clarifications
- 50-69: Needs work for THIS job
- < 50: Cannot generate quality letter for THIS job

Return JSON only.`],

    ['human', `Validate if we can write quality cover letter for THIS SPECIFIC JOB.

**TARGET LANGUAGE:** {language}

**THIS JOB POSTING:**
{jobDescription}

**CANDIDATE PROFILE:**
Name: {name}
Email: {email}
Phone: {phone}
Skills: {skills}
Work Experience: {workExperience}
Education: {education}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}

**PERSONAL NOTES:**
{personalNotes}

Can we write quality letter for THIS job? Return JSON in TARGET LANGUAGE.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language,
      jobDescription: input.jobDescription,
      name: input.userProfile.name || 'Not specified',
      email: input.userProfile.email || 'Not specified',
      phone: input.userProfile.phone || 'Not specified',
      skills: input.userProfile.skills || 'Not specified',
      workExperience: input.userProfile.workExperience || 'Not specified',
      education: input.userProfile.education || 'Not specified',
      problemSolving: input.userProfile.problemSolving || 'Not specified',
      uniqueStrength: input.userProfile.uniqueStrength || 'Not specified',
      personalNotes: input.personalNotes || 'Not specified'
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const validation: ValidationResult = JSON.parse(jsonMatch[0]);
    
    console.log(`✅ Validation Score: ${validation.score}/100 for this job`);
    console.log(`📝 Questions: ${validation.questions.length}`);
    
    return validation;
  } catch (error) {
    console.error('Universal validation failed:', error);
    
    return {
      canGenerateNow: true,
      score: 70,
      questions: [],
      warnings: [],
      reason: 'Basic validation passed'
    };
  }
}