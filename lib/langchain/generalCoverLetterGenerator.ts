// lib/langchain/generalCoverLetterGenerator.ts - FORMAATTI KORJATTU

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
      console.warn('⚠️ RAG failed:', error);
    }
  }

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const styleInstructions = input.style === 'casual'
    ? 'TONE: Conversational, approachable yet professional.'
    : 'TONE: Professional, confident.';

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are writing a MODERN general professional introduction letter.

# ════════════════════════════════════════════════════════════════
# CONTEXT: GENERAL INTRODUCTION
# ════════════════════════════════════════════════════════════════

This is NOT for a specific job posting.
This is a GENERAL PROFESSIONAL INTRODUCTION for multiple employers.

# ════════════════════════════════════════════════════════════════
# CRITICAL: MODERN FORMAT
# ════════════════════════════════════════════════════════════════

**CONTAINS ONLY:**
1. Greeting (general)
2. Body (3-4 paragraphs)
3. Closing
4. Signature

**NEVER WRITE:**
❌ Address
❌ Phone number in body
❌ Email in body
❌ [Placeholders in brackets]
❌ Date in text

**NAME USAGE:**
- Applicant's name is: {name}
- NEVER write "Applicant"
- NEVER write "[Your Name]"
- ALWAYS use {name}

${knowledgeContext ? `
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# EXPERT KNOWLEDGE
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${knowledgeContext}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GROUND TRUTH
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**ALLOWED SKILLS:**
{allowedSkills}

**FORBIDDEN CLAIMS:**
{forbiddenClaims}

**VERIFICATION:**
Use ONLY allowedSkills. NEVER invent experience.

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**MISSION:**
Write compelling general introduction that:
1. Introduces candidate professionally
2. Highlights core strengths
3. Explains career goals
4. Shows value proposition

**STRUCTURE:**

**OPENING (2-3 sentences)**
   - Professional identity
   - Current situation

**CORE STRENGTHS (3-4 sentences)**
   - Key skills and experience
   - Personality in work context
   - What makes unique

**CAREER GOALS (2-3 sentences)**
   - What seeking
   - Type of environments
   - Motivations

**CLOSING (1-2 sentences)**
   - Value summary
   - Call to action

**LANGUAGE:** {language}
**STYLE:** {styleInstructions}
**LENGTH:** 280-350 words

{format_instructions}`],

    ["human", `Generate GENERAL introduction letter.

**CANDIDATE:**
NAME: {name} (USE THIS, NOT "Applicant")
Goal: {jobTitle}

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
Strength: {uniqueStrength}
Identity: {superpower}

**ASPIRATIONS:**
Goals: {careerGoals}
Best Achievement: {bestProjectExample}

**FOCUS:**
Target Industry: {targetIndustry}
Target Role: {targetRole}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# IMPORTANT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. DON'T write addresses or contact info
2. DON'T write [brackets]
3. USE name {name}
4. Write in FIRST PERSON ("I am...", "I have...")
5. Write in {language}

Return JSON with "content", "title", "keyHighlights".`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language || 'finnish',
      styleInstructions,
      name: input.name,
      jobTitle: input.jobTitle || 'Professional',
      workExperience: input.workExperience || 'Developing experience',
      education: input.education || 'Relevant background',
      skills: input.skills || 'Versatile skills',
      allowedSkills: input.allowedSkills?.join(', ') || 'All profile skills',
      forbiddenClaims: input.forbiddenClaims?.join(', ') || 'None',
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Analytical',
      uniqueStrength: input.uniqueStrength || 'Quick learner',
      superpower: input.superpower || 'Reliable professional',
      careerGoals: input.careerGoals || 'Seeking growth',
      bestProjectExample: input.bestProjectExample || 'Consistent delivery',
      targetIndustry: input.targetIndustry || 'Various industries',
      targetRole: input.targetRole || 'Professional roles',
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

    // ✅ CLEAN PLACEHOLDERS
    let finalContent = (parsed.content || '')
      .replace(/\[Osoite\]/g, '')
      .replace(/\[Address\]/g, '')
      .replace(/\[Puhelinnumero\]/g, '')
      .replace(/\[Phone\]/g, '')
      .replace(/\[Sähköposti\]/g, '')
      .replace(/\[Email\]/g, '')
      .replace(/\[Paikkakunta\]/g, '')
      .replace(/\[City\]/g, '')
      .replace(/\[Päivämäärä\]/g, '')
      .replace(/\[Date\]/g, '')
      .replace(/\[Your Name\]/g, input.name)
      .replace(/\[Nimi\]/g, input.name)
      .replace(/^Hakija(?=\s|$)/gm, input.name)
      .replace(/^Applicant(?=\s|$)/gm, input.name)
      .replace(/\*\*/g, '')
      .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    console.log('✅ General cover letter generated');

    return {
      content: finalContent,
      title: parsed.title || 'Professional Introduction',
      signature: input.name,
      keyHighlights: parsed.keyHighlights,
    };

  } catch (error) {
    console.error('❌ General cover letter failed:', error);
    throw error;
  }
}