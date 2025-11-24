// lib/langchain/coverLetterGenerator.ts - JOB-FIRST APPROACH

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";

export interface CoverLetterV1Output {
  content: string;
  title: string;
  signature: string;
  personality_hooks?: string[];
  job_match_score?: number;
  key_differentiators?: string[];
  questions?: AIQuestion[];
  data_quality?: DataQuality;
}

export interface AIQuestion {
  id: string;
  question: string;
  context: string;
  personality_focus?: string;
  priority?: 'high' | 'medium' | 'low';
}

export interface DataQuality {
  quality: 'rich' | 'moderate' | 'minimal';
  score: number;
  reasoning: string;
  personalityCompleteness: number;
  suggestions: string[];
}

export interface CoverLetterV1Input {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  
  jobTitle?: string;
  education?: string;
  workExperience?: string;
  skills?: string;
  personalNotes?: string;
  
  language?: string;
  style?: 'formal' | 'casual';
  
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
  
  groundTruthWarning?: string;
}

/**
 * ✅ STEP 1: ANALYSOI TYÖILMOITUS ENSIN
 * Tunnista ALA, kulttuuri, mitä haetaan - älä oleta mitään
 */
async function analyzeJobForPersonalityFit(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a job posting analyzer. Each job posting is UNIQUE from a DIFFERENT industry.

**YOUR MISSION:**
Analyze THIS SPECIFIC job posting. DO NOT assume anything based on industry stereotypes.

**STEP 1: DETECT INDUSTRY**
Read the job text. What industry is this? (tech, healthcare, retail, manufacturing, education, hospitality, creative, legal, finance, construction, logistics, etc.)

**STEP 2: UNDERSTAND THIS SPECIFIC ROLE**
What does THIS employer value? What personality traits would excel HERE?
- Read between the lines
- Look at language/tone used
- Identify explicit and implicit requirements

**STEP 3: IDENTIFY CULTURE**
- Formal or casual?
- Fast-paced or methodical?
- Independent or team-oriented?
- Hierarchical or flat?

**CRITICAL:**
- DO NOT use industry templates
- DO NOT assume "tech = analytical" or "sales = extroverted"
- INFER from THIS job text ONLY

**OUTPUT:**
{{
  "detected_industry": "industry name",
  "role_type": "entry|mid|senior|specialist",
  "personality_traits": ["trait1 THIS job needs", "trait2"],
  "work_environment": "description from THIS posting",
  "company_culture": "inferred from THIS text",
  "key_requirements": ["requirement1", "requirement2"],
  "red_flags": ["don't claim X if you lack Y"],
  "green_flags": ["emphasize Z if you have it"]
    }}

Return JSON only.`],
    ["human", `Analyze THIS job posting. Treat it as completely unique.

{jobDescription}

Return JSON.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({ jobDescription });
    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON');

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return {
      detected_industry: "unknown",
      role_type: "unknown",
      personality_traits: [],
      work_environment: "",
      company_culture: "",
      key_requirements: [],
      red_flags: [],
      green_flags: []
    };
  }
}

/**
 * ✅ STEP 2: GENEROI HAKUKIRJE TÄLLE TYÖLLE
 */
export async function generateCoverLetterV1(input: CoverLetterV1Input): Promise<CoverLetterV1Output> {
  try {
    console.log("🚀 V1: Analyzing job posting first...");

    // STEP 1: Analysoi TÄMÄ työ ensin
    const jobAnalysis = await analyzeJobForPersonalityFit(input.jobDescription);
    console.log(`📊 Detected: ${jobAnalysis.detected_industry} industry, ${jobAnalysis.role_type} level`);

    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    // STEP 2: Luo hakukirje TÄLLE alalle, TÄLLE työlle
    const systemPrompt = `You are writing a cover letter for THIS SPECIFIC job posting.

**DETECTED CONTEXT:**
Industry: {detectedIndustry}
Role Level: {roleType}
Work Environment: {workEnvironment}
Company Culture: {companyCulture}

**YOUR MISSION:**
Write a cover letter that fits THIS SPECIFIC context. Do NOT use generic templates.

**ADAPT TO THIS INDUSTRY:**
- Use terminology natural to THIS field
- Match tone to THIS company's culture
- Address requirements specific to THIS role
- Show understanding of THIS industry's challenges

**ADAPT TO THIS CANDIDATE:**
- Use THEIR authentic experiences
- Connect THEIR traits to THIS job's needs
- Show fit for THIS specific opportunity

**WRITING PRINCIPLES:**
1. Opening: Hook specific to THIS role + candidate's fit
2. Body 1: Authentic story showing trait THIS job needs
3. Body 2: Experience/skills matching THIS role's requirements
4. Closing: Enthusiasm for THIS specific opportunity

**TECHNICAL RULES:**
- 280-350 words total
- Natural, conversational for THIS industry
- NO generic phrases
- ONLY factual claims from candidate data
- Tone: {style}
- Language: {language}

**FORBIDDEN:**
- Industry stereotypes
- Generic templates
- "I am a hard worker" phrases
- Skills candidate lacks

{groundTruthWarning}

Return JSON only.`

   const humanTemplate = `Write cover letter for THIS candidate applying to THIS job.

**THIS JOB POSTING:**
{jobDescription}

**WHAT THIS JOB NEEDS (from analysis):**
Industry: {detectedIndustry}
Personality Traits: {personalityTraits}
Environment: {workEnvironment}
Culture: {companyCulture}
Requirements: {keyRequirements}
Red Flags: {redFlags}
Green Flags: {greenFlags}

**THIS CANDIDATE:**
Name: {name}
Goal: {jobTitle}
Education: {education}
Experience: {workExperience}
Skills: {skills}

**CANDIDATE'S PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Energy: {energySources}
Strength: {uniqueStrength}
Learning: {learningStyle}
Team Role: {teamRole}
Values: {valuesExample}
Identity: {superpower}

**CANDIDATE'S STORIES:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}
Challenge Learned: {failureLesson}

**ADDITIONAL NOTES:**
{personalNotes}

**TASK:**
1. Match candidate's traits to THIS job's needs
2. Use authentic stories as evidence
3. Show fit for THIS specific role in THIS industry
4. 280-350 words, natural tone for THIS field

**OUTPUT:**
{{
  "content": "full letter text",
  "title": "Job Title from posting",
  "signature": "Candidate Name",
  "personality_hooks": ["trait1 highlighted", "trait2"],
  "job_match_score": 1-10,
  "key_differentiators": ["what makes them unique for THIS role"]
}}

Return JSON only.`

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemPrompt],
      ["human", humanTemplate],
    ]);

    const formatted = await prompt.formatMessages({
      detectedIndustry: jobAnalysis.detected_industry,
      roleType: jobAnalysis.role_type,
      workEnvironment: jobAnalysis.work_environment,
      companyCulture: jobAnalysis.company_culture,
      style: input.style || "professional",
      language: input.language || "detect from job posting",
      groundTruthWarning: input.groundTruthWarning || "Maintain factual accuracy",
      jobDescription: input.jobDescription,
      personalityTraits: jobAnalysis.personality_traits.join(", ") || "Not specified",
      keyRequirements: jobAnalysis.key_requirements.join(", ") || "Not specified",
      redFlags: jobAnalysis.red_flags.join(", ") || "None",
      greenFlags: jobAnalysis.green_flags.join(", ") || "None",
      name: input.name,
      jobTitle: input.jobTitle || "Not specified",
      education: input.education || "Not specified",
      workExperience: input.workExperience || "Not specified",
      skills: input.skills || "Not specified",
      workingStyle: input.workingStyle || "Not specified",
      problemSolving: input.problemSolving || "Not specified",
      energySources: input.energySources || "Not specified",
      uniqueStrength: input.uniqueStrength || "Not specified",
      learningStyle: input.learningStyle || "Not specified",
      teamRole: input.teamRole || "Not specified",
      valuesExample: input.valuesExample || "Not specified",
      superpower: input.superpower || "Not specified",
      careerGoals: input.careerGoals || "Not specified",
      bestProjectExample: input.bestProjectExample || "Not specified",
      failureLesson: input.failureLesson || "Not specified",
      personalNotes: input.personalNotes || "None",
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
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);

    const formattedContent = parsed.content
      .replace(/\*\*/g, "")
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    return {
      content: formattedContent,
      title: parsed.title || "Cover Letter",
      signature: parsed.signature || input.name,
      personality_hooks: parsed.personality_hooks || [],
      job_match_score: parsed.job_match_score || 7,
      key_differentiators: parsed.key_differentiators || [],
    };
  } catch (error) {
    console.error("V1 Generation failed:", error);
    throw error;
  }
}