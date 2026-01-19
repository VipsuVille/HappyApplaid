// lib/langchain/generalCoverLetterGenerator.ts - UNIVERSAL & DYNAMIC

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

// ════════════════════════════════════════════════════════════════
// SCHEMA & TYPES
// ════════════════════════════════════════════════════════════════

const generalCoverLetterSchema = z.object({
  content: z.string().describe("Full introduction text"),
  title: z.string().describe("Letter title"),
  keyHighlights: z.object({
    professionalIdentity: z.string().describe("Core identity"),
    coreStrengths: z.array(z.string()).describe("Key strengths"),
    careerGoals: z.string().describe("Goals and aspirations"),
    uniqueValue: z.string().describe("What makes them unique"),
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
// MAIN GENERATOR - FULLY DYNAMIC
// ════════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  console.log('🌟 [GENERAL] Creating personal introduction...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. KNOWLEDGE CONTEXT (RAG)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let knowledgeContext = "";
  if (input.enableRAG) {
    try {
      knowledgeContext = await buildAIContext({
        jobDescription: "General personal introduction",
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
      console.warn("⚠️ RAG unavailable, using direct profile data");
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. AI GENERATION - NO HARDCODED VALUES
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.75,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are creating a PERSONAL INTRODUCTION letter that adapts to ANY person from ANY background.

${knowledgeContext ? `**CONTEXT:**\n${knowledgeContext}\n\n` : ''}

# ════════════════════════════════════════════════════════════════
# CORE PRINCIPLE: UNIVERSAL ADAPTABILITY
# ════════════════════════════════════════════════════════════════

**YOUR MISSION:**
Create an authentic, human introduction that works for ANYONE:
- Student or executive
- Career changer or specialist
- Employed, unemployed, or returning to work
- Any age, background, culture, or language
- Technical or non-technical field

**CRITICAL RULES:**

1. **NO ASSUMPTIONS**
   - Don't assume they have work experience
   - Don't assume they have formal education
   - Don't assume they're seeking employment
   - Don't assume career level

2. **USE ONLY PROVIDED DATA**
   - If field is empty/generic → Don't mention it
   - If field has real data → Use it naturally
   - Never fill gaps with generic phrases
   - Never invent details

3. **ADAPTIVE STRUCTURE**
   - Let the content flow naturally from their profile
   - No fixed templates or formulas
   - Structure emerges from their story
   - Length adapts to available information (200-500 words)

4. **LANGUAGE FLEXIBILITY**
   - Write in the TARGET_LANGUAGE specified
   - Use natural, native phrasing
   - Don't translate - write natively
   - Adapt tone to cultural context

5. **TONE ADAPTATION**
   - FORMAL: Professional yet approachable
   - CASUAL: Conversational yet credible
   - Always: Authentic, honest, human

**WHAT TO INCLUDE (when available):**
- Who they are at their core
- What drives them
- What they bring to the table
- Where they're heading
- What makes them unique

**WHAT TO AVOID:**
- Empty corporate speak
- Generic claims without evidence
- Exaggeration or inflation
- Assumptions about their situation
- Cultural or age bias
- Gender assumptions

**OUTPUT FORMAT:**
- Plain text introduction
- First person (I/my) unless culturally inappropriate
- Natural paragraph flow
- No placeholders, no brackets
- No contact details in body
- Title should reflect their essence, not job title

{format_instructions}`],

    ["human", `Create a personal introduction for this individual.

**TARGET_LANGUAGE:** {language}
**WRITING_STYLE:** {style}

**PERSON:**
Name: {name}

**BACKGROUND (use only if meaningful):**
Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY (use only if meaningful):**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Energy Sources: {energySources}
Learning Style: {learningStyle}
Team Role: {teamRole}

**EXPERIENCES (use only if meaningful):**
Best Example: {bestProjectExample}
Learned From: {failureLesson}
Values: {valuesExample}

**DIRECTION (use only if meaningful):**
Goals: {careerGoals}
Target Area: {targetIndustry}
Target Role: {targetRole}

**VALIDATION:**
Allowed: {allowedSkills}
Forbidden: {forbiddenClaims}

**INSTRUCTIONS:**
1. Analyze ALL provided data
2. Identify what's meaningful vs. empty
3. Create introduction using ONLY real data
4. If data is sparse, write shorter but authentic
5. If data is rich, create fuller portrait
6. NEVER use phrases like "Not specified", "Developing experience", etc.
7. Write in {language} with {style} tone

Return JSON: {{"content": "...", "title": "...", "keyHighlights": {{...}}}}`
    ]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language || "english",
      style: input.style || "formal",
      name: input.name || "Individual",
      
      // Pass raw data - AI decides what's meaningful
      workExperience: input.workExperience || "",
      education: input.education || "",
      skills: input.skills || "",
      workingStyle: input.workingStyle || "",
      problemSolving: input.problemSolving || "",
      uniqueStrength: input.uniqueStrength || "",
      superpower: input.superpower || "",
      energySources: input.energySources || "",
      learningStyle: input.learningStyle || "",
      teamRole: input.teamRole || "",
      bestProjectExample: input.bestProjectExample || "",
      failureLesson: input.failureLesson || "",
      valuesExample: input.valuesExample || "",
      careerGoals: input.careerGoals || "",
      targetIndustry: input.targetIndustry || "",
      targetRole: input.targetRole || "",
      
      allowedSkills: input.allowedSkills?.join(", ") || "Use only verified profile data",
      forbiddenClaims: input.forbiddenClaims?.join(", ") || "No known restrictions",
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formatted);
    
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

    // Minimal cleaning - trust AI to not use placeholders
    let finalContent = (parsed.content || "")
      .replace(/\[.*?\]/g, "") // Safety: Remove any bracketed text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/([^\n])\n([^\n])/g, "$1\n\n$2") // Paragraph spacing
      .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
      .trim();

    console.log('✅ [GENERAL] Introduction created');

    return {
      content: finalContent,
      title: parsed.title || "Personal Introduction",
      signature: input.name,
      questions: [],
      keyHighlights: parsed.keyHighlights,
    };

  } catch (error) {
    console.error("❌ [GENERAL] Generation failed:", error);
    throw error;
  }
}