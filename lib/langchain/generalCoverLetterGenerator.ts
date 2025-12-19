// lib/langchain/generalCoverLetterGenerator.ts - YLEINEN ESITTELYKIRJE

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

// ✅ SCHEMA
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

/**
 * ✅ INPUT INTERFACE
 */
export interface GeneralCoverLetterInput {
  // Basic info
  name: string;
  email: string;
  phone: string;
  
  // Professional background
  jobTitle?: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  
  // Personality (CRITICAL for general letter)
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  
  // Goals & Context
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  targetIndustry?: string; // Optional: "IT", "Healthcare", etc.
  targetRole?: string;     // Optional: "Senior Developer", etc.
  
  // Settings
  language?: string;
  style?: 'formal' | 'casual';
  
  // Advanced (Pro-tier)
  enableRAG?: boolean;
  allowedSkills?: string[];
  forbiddenClaims?: string[];
}

/**
 * ✅ OUTPUT INTERFACE
 */
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

/**
 * ✅ MAIN GENERATOR
 */
export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  
  console.log('🎯 Generating GENERAL cover letter...');
  console.log(`   Language: ${input.language || 'finnish'}`);
  console.log(`   Style: ${input.style || 'formal'}`);
  console.log(`   RAG: ${input.enableRAG ? '✅' : '❌'}`);

  // ✅ STEP 1: LOAD RAG CONTEXT (if Pro tier)
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

  // ✅ STEP 2: PREPARE MODEL
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const styleInstructions = input.style === 'casual'
    ? 'TONE: Conversational, approachable yet professional. Use "I" naturally.'
    : 'TONE: Professional, confident. Use "I" with authority.';

  // ✅ STEP 3: BUILD PROMPT
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are writing a GENERAL professional introduction letter.

**CONTEXT:**
This is NOT for a specific job posting. This is a general introduction the candidate can send to multiple employers.

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE BASE (PRO Feature)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GROUND TRUTH - CANDIDATE'S ACTUAL SKILLS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ALLOWED SKILLS:**
{allowedSkills}

**FORBIDDEN CLAIMS:**
{forbiddenClaims}

**VERIFICATION:**
- Use ONLY allowedSkills
- NEVER invent experience
- Stay 100% truthful

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**YOUR MISSION:**
Write a compelling general introduction letter that:
1. Introduces who the candidate is professionally
2. Highlights core strengths and personality
3. Explains career goals and motivations
4. Shows value proposition without targeting specific job

**STRUCTURE:**
1. OPENING (2-3 sentences)
   - Professional identity
   - Current situation/background

2. CORE STRENGTHS (3-4 sentences)
   - Key skills and experience
   - Personality in work context
   - What makes candidate unique

3. CAREER GOALS (2-3 sentences)
   - What candidate is seeking
   - Type of work environments
   - What motivates them

4. CLOSING (1-2 sentences)
   - Value proposition summary
   - Call to action (open to opportunities)

**LANGUAGE:** {language}
**STYLE:** {styleInstructions}

**LENGTH:** 280-350 words

{format_instructions}`],

    ["human", `Generate GENERAL introduction letter for professional use.

**CANDIDATE:**
Name: {name}
Professional Goal: {jobTitle}
Email: {email}
Phone: {phone}

**BACKGROUND:**
Experience: {workExperience}
Education: {education}
Skills: {skills}

**GROUND TRUTH:**
ALLOWED: {allowedSkills}
FORBIDDEN: {forbiddenClaims}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Energy Sources: {energySources}
Unique Strength: {uniqueStrength}
Learning Style: {learningStyle}
Team Role: {teamRole}
Values: {valuesExample}
Professional Identity: {superpower}

**ASPIRATIONS:**
Career Goals: {careerGoals}
Best Achievement: {bestProjectExample}
Key Learning: {failureLesson}

**OPTIONAL FOCUS:**
Target Industry: {targetIndustry}
Target Role: {targetRole}

Write in FIRST PERSON ("I am...", "I have...", "I seek...").
Write in {language}.
Return JSON with "content", "title", and "keyHighlights".`]
  ]);

  try {
    // ✅ STEP 4: FORMAT & INVOKE
    const formatted = await prompt.formatMessages({
      language: input.language || 'finnish',
      styleInstructions,
      name: input.name,
      jobTitle: input.jobTitle || 'Professional',
      email: input.email,
      phone: input.phone,
      workExperience: input.workExperience || 'Developing professional experience',
      education: input.education || 'Relevant educational background',
      skills: input.skills || 'Versatile skill set',
      allowedSkills: input.allowedSkills?.join(', ') || 'All skills from profile',
      forbiddenClaims: input.forbiddenClaims?.join(', ') || 'None',
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Analytical',
      energySources: input.energySources || 'Team collaboration',
      uniqueStrength: input.uniqueStrength || 'Quick learner',
      learningStyle: input.learningStyle || 'Hands-on',
      teamRole: input.teamRole || 'Team player',
      valuesExample: input.valuesExample || 'Integrity',
      superpower: input.superpower || 'Reliable professional',
      careerGoals: input.careerGoals || 'Seeking growth opportunities',
      bestProjectExample: input.bestProjectExample || 'Consistent delivery',
      failureLesson: input.failureLesson || 'Continuous improvement',
      targetIndustry: input.targetIndustry || 'Various industries',
      targetRole: input.targetRole || 'Professional roles',
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    const content = typeof result.content === 'string'
      ? result.content
      : JSON.stringify(result.content);

    // ✅ STEP 5: PARSE
    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');

    const parsed: GeneralCoverLetterOutput = await outputParser.parse(jsonMatch[0]);

    // ✅ STEP 6: FORMAT CONTENT
    const formattedContent = (parsed.content || '')
      .replace(/\*\*/g, '')
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('✅ General cover letter generated');

    return {
      content: formattedContent,
      title: parsed.title || 'Professional Introduction',
      signature: input.name,
      keyHighlights: parsed.keyHighlights,
    };

  } catch (error) {
    console.error('❌ General cover letter generation failed:', error);
    throw error;
  }
}