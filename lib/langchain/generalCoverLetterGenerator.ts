// lib/langchain/generalCoverLetterGenerator.ts - KORJATTU VERSIO (3/10 VAPAUSASTE)

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
  // ✅ HENKILÖTIEDOT - EI PAKOLLISIA (ei lähetetä AI:lle)
  name?: string;
  email?: string;
  phone?: string;
  
  // PROFIILITIEDOT
  workExperience?: string;
  education?: string;
  skills?: string;
  languages?: string;
  
  // PERSOONALLISUUS
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  superpower?: string;
  
  // TAVOITTEET
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  
  // ASETUKSET
  targetIndustry?: string;
  targetRole?: string;
  language?: string;
  style?: "formal" | "casual";
  enableRAG?: boolean;
  
  // GUARDIAN
  allowedSkills?: string[];
  forbiddenClaims?: string[];
  
  // META
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
// MAIN GENERATOR - 3/10 INTERPRETATION LEVEL
// ════════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetter(
  input: GeneralCoverLetterInput
): Promise<GeneralCoverLetterResult> {
  console.log('🌟 [GENERAL] Creating personal introduction...');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. KNOWLEDGE CONTEXT (RAG - if enabled)
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
  // 2. AI GENERATION - 3/10 INTERPRETATION LEVEL
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.75,
  });

 const prompt = ChatPromptTemplate.fromMessages([
  ["system", `You are creating a PERSONAL INTRODUCTION written in FIRST PERSON.

${knowledgeContext ? `**CONTEXT:**\n${knowledgeContext}\n\n` : ''}

# ═══════════════════════════════════════════════════════
# CRITICAL REQUIREMENTS
# ═══════════════════════════════════════════════════════

**1. ALWAYS WRITE IN FIRST PERSON**
- Use "I am...", "I work...", "I have..."
- NEVER use third person ("he/she/they")
- This is the person speaking about themselves

**2. NEVER USE THE PERSON'S NAME IN THE TEXT**
- Name will be added separately
- Always refer to yourself as "I" or "me"

**3. LENGTH: 300-400 WORDS**
- Approximately 2/3 of an A4 page
- Substantial but concise
- Enough to give full picture of the person

**4. PRIVACY PROTECTION**
Do NOT include in the generated text:
- Full name
- Email address
- Phone number
- Full home address

General location (city/country) is OK if relevant to the story.

# ═══════════════════════════════════════════════════════
# UNIVERSAL APPROACH - WORKS FOR EVERYONE
# ═══════════════════════════════════════════════════════

This system must work equally well for:

**AGE:** 18 years old → 70 years old
**EXPERIENCE:** 0 years → 40+ years
**EDUCATION:** No degree → PhD
**INDUSTRY:** ANY (tech, retail, healthcare, construction, arts, etc.)
**BACKGROUND:** ANY country, culture, language
**EMPLOYMENT STATUS:** Student, employed, unemployed, retired, career changer

**ADAPTATION RULES:**

📚 **Little/No Experience:**
- Focus on: Skills, education, projects, potential
- Highlight: Learning ability, fresh perspective
- Avoid: Apologizing for lack of experience
- Example approach: "My studies in [field] have equipped me with..."

💼 **Experienced Professional:**
- Focus on: Impact, progression, achievements
- Highlight: Patterns across roles, expertise depth
- Avoid: Just listing job titles
- Example approach: "Throughout my career in [field], I have..."

🔄 **Career Changer:**
- Focus on: Transferable skills, intentional growth
- Highlight: Unique combination of backgrounds
- Avoid: Explaining "why switching"
- Example approach: "I bring a rare blend of [old] and [new]..."

😟 **Employment Gap:**
- Focus on: Current activities, future direction
- Highlight: What you're doing NOW
- Avoid: Mentioning or explaining the gap
- Example approach: "I am currently focusing on..."

👴 **Senior Professional:**
- Focus on: Deep expertise, mentorship, strategic view
- Highlight: Years of proven impact
- Avoid: Age references, "retiring soon"
- Example approach: "With extensive experience in [field]..."

# ═══════════════════════════════════════════════════════
# STRUCTURE (3 PARAGRAPHS)
# ═══════════════════════════════════════════════════════

**Paragraph 1: WHO AM I (100-130 words)**
- Professional identity or current focus
- Background (education/experience - whatever is strongest)
- Key skills with concrete examples
- What makes me unique

**Paragraph 2: HOW I WORK (100-130 words)**
- Working style and approach
- Concrete example of problem-solving or achievement
- What drives and motivates me
- How I collaborate or contribute

**Paragraph 3: WHERE I'M GOING (100-130 words)**
- Career goals or aspirations
- What I'm looking for next
- How my values align with future direction
- Confident closing statement

# ═══════════════════════════════════════════════════════
# WRITING GUIDELINES
# ═══════════════════════════════════════════════════════

**TONE:**
- Confident but humble
- Authentic and human
- Professional but warm
- Appropriate for TARGET_LANGUAGE and WRITING_STYLE

**STYLE:**
- Specific over generic
- Active voice ("I build" not "I have experience in")
- Evidence-based (every claim backed by profile data)
- Natural, conversational language

**FORBIDDEN PHRASES (too generic):**
"motivated professional" | "strong communication skills" | "team player"
"results-driven" | "passionate about" | "proactive" | "dynamic"

**REQUIRED APPROACH:**
- Use concrete examples from profile
- Show, don't tell
- Make claims you can back up
- Write like a real person talking

# ═══════════════════════════════════════════════════════
# INTERPRETATION LEVEL: 3/10
# ═══════════════════════════════════════════════════════

- 1/10 = Copy profile verbatim (boring)
- **3/10 = Connect dots, make grounded inferences (TARGET)**
- 7/10 = Speculate wildly (risky)

**ALLOWED:**
- Pattern recognition: If multiple fields suggest same trait
- Contextualization: Make examples reveal general capabilities
- Gap reframing: Turn absence into different strength

**NOT ALLOWED:**
- Inventing facts not in profile
- Exaggerating ("expert" when profile says "beginner")
- Making claims without evidence

# ═══════════════════════════════════════════════════════
# QUALITY CHECKS
# ═══════════════════════════════════════════════════════

Before returning, verify:
- [ ] Everything in first person ("I", not "he/she")
- [ ] No name used in text
- [ ] Length 300-400 words
- [ ] No private contact info in text
- [ ] Concrete examples, not generic claims
- [ ] Works regardless of age/experience/industry
- [ ] Person sounds authentic and unique

{format_instructions}`],

  ["human", `Create a personal introduction in FIRST PERSON.

**CRITICAL:** 
- Write as "I am...", "I work...", "I have..."
- Do NOT use the person's name
- Length: 300-400 words
- No email/phone in text

**TARGET_LANGUAGE:** {language}
**WRITING_STYLE:** {style}

**BACKGROUND:**
Work Experience: {workExperience}
Education: {education}
Skills: {skills}
Languages: {languages}

**PERSONALITY:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Energy Sources: {energySources}
Learning Style: {learningStyle}
Team Role: {teamRole}

**EXPERIENCES:**
Best Example: {bestProjectExample}
Learned From: {failureLesson}
Values: {valuesExample}

**DIRECTION:**
Goals: {careerGoals}
Target Area: {targetIndustry}
Target Role: {targetRole}

Adapt your approach based on what data is available.
If little experience → focus on potential and learning.
If extensive experience → focus on impact and expertise.

Write 300-400 words in first person.
Return JSON with: content, title, keyHighlights`]
]);

  try {
    const formatted = await prompt.formatMessages({
      language: input.language || "english",
      style: input.style || "formal",
      name: input.name || "Individual",
      
      // Pass all data (AI decides what's meaningful)
      workExperience: input.workExperience || "",
      education: input.education || "",
skills: input.skills || "",
languages: input.languages || "",
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

// Clean content (remove any remaining artifacts)
let finalContent = (parsed.content || "")
  .replace(/\[.*?\]/g, "") // Remove any bracketed text
  .replace(/\*\*/g, "") // Remove markdown bold
  .replace(/([^\n])\n([^\n])/g, "$1\n\n$2") // Paragraph spacing
  .replace(/\n{3,}/g, "\n\n") // Max 2 newlines
  .trim();

console.log('✅ [GENERAL] Introduction created');

return {
  content: finalContent,
  title: parsed.title || "Personal Introduction",
  signature: input.name || "", // ✅ TYHJÄ STRING JOS EI NIMEÄ
  questions: [],
  keyHighlights: parsed.keyHighlights,
};
} catch (error) {
console.error("❌ [GENERAL] Generation failed:", error);
throw error;
}
}