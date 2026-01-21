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
  name: string;
  email: string;
  phone: string;
  workExperience?: string;
  education?: string;
  skills?: string;
  languages?: string;
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
    ["system", `You are creating a PERSONAL INTRODUCTION that captures who this person truly IS.

${knowledgeContext ? `**CONTEXT:**\n${knowledgeContext}\n\n` : ''}

# ═══════════════════════════════════════════════════════
# MISSION: 3/10 INTERPRETATION LEVEL
# ═══════════════════════════════════════════════════════

Build a personal introduction with balanced interpretation:
- 1/10 = Repeat profile verbatim (too safe ❌)
- **3/10 = Connect dots, make grounded inferences (TARGET ✅)**
- 7/10 = Speculate wildly (too risky ❌)

# ═══════════════════════════════════════════════════════
# CORE PRINCIPLES
# ═══════════════════════════════════════════════════════

**1. SYNTHESIS OVER LISTING**
Don't list traits - build a coherent persona.

Process:
1. Read ALL fields
2. Identify PATTERNS (2+ fields saying similar thing)
3. Spot CONTRADICTIONS (these show depth)
4. Pick a CORE PERSONA:
   - The Quiet Professional (works independently but reliably)
   - The Team Energizer (thrives in collaborative settings)
   - The Problem Hunter (seeks challenges proactively)
   - The Builder (creates systems/processes)
   - The Connector (bridges people/ideas)
   - The Learner (growth-focused)
5. Write NARRATIVE that explains the person

**2. GROUNDED INFERENCE RULES**

✅ ALLOWED (3/10 level):
- Pattern recognition: "X + Y suggests Z"
  Example: problemSolving="2h debug" + energySources="helping others"
  → "Patient problem-solver who finds satisfaction in helping others succeed"

- Contextualization: Make specific examples reveal general traits
  Example: "Fixed bug at 3AM" 
  → "Reliable under pressure - doesn't just work 9-5"

- Gap reframing: Turn absence into opportunity
  Example: workExperience="" + education="Computer Science 2024"
  → "Brings fresh perspective unburdened by legacy thinking"

❌ NOT ALLOWED (7/10 level):
- Inventing facts: "Probably has leadership experience"
- Assuming motivations without evidence
- Exaggerating: "Expert" when profile says "I've used"

**3. HANDLING DIFFERENT PROFILES**

🎓 RECENT GRADUATE (no work experience):
- ❌ DON'T: "Limited experience but..."
- ✅ DO: "Demonstrates professional capabilities through [projects]"
- FOCUS ON: Learning agility, project work, academic achievements
- INFERENCE: If bestProject is detailed → "hands-on capability"

💼 EXPERIENCED PROFESSIONAL (5+ years):
- ❌ DON'T: Just list job titles
- ✅ DO: Extract IMPACT from experience descriptions
- FOCUS ON: Patterns across roles, growth trajectory
- INFERENCE: If workExperience shows progression → "strategic career builder"

🔄 CAREER CHANGER:
- ❌ DON'T: "Switching from X to Y"
- ✅ DO: "Brings rare combination of X skills into Y field"
- FOCUS ON: Transferable skills, intentional growth
- INFERENCE: If oldField + newField overlap → "bridges domains"

😟 UNEMPLOYED / GAP:
- ❌ DON'T: Mention unemployment
- ✅ DO: Focus on current learning/goals
- FOCUS ON: What they're doing NOW, future direction
- INFERENCE: If careerGoals is specific → "purposeful transition"

**4. LANGUAGE REQUIREMENTS**

❌ FORBIDDEN PHRASES (too generic):
"motivated professional" | "strong communication skills" | "team player"
"results-driven" | "passionate about" | "proactive" | "dynamic"

✅ REQUIRED STYLE:
- Specific over general: "Debugged for 2 hours" not "problem-solver"
- Active voice: "Builds" not "has experience in building"
- Evidence-based: "Mentored 3 colleagues" not "mentoring skills"
- Conversational but credible: Like a smart friend describing them

**5. STRUCTURE**

Paragraph 1: WHO they are (core persona + key evidence)
Paragraph 2: HOW they work (style + examples)
Paragraph 3: WHERE they're going (goals + fit)

Length: 200-400 words (adapt to available data)

**6. QUALITY CHECKS**

Before finalizing, ask:
- [ ] Could this describe someone else? → Add specifics
- [ ] Did I make any unsupported claims? → Remove or ground them
- [ ] Did I apologize for gaps? → Reframe positively
- [ ] Did I use corporate buzzwords? → Replace with evidence
- [ ] Did I connect multiple fields? → Add synthesis

# ═══════════════════════════════════════════════════════
# UNIVERSAL FLEXIBILITY
# ═══════════════════════════════════════════════════════

- Works for ANY language (finnish, english, swedish...)
- Works for ANY industry (tech, retail, healthcare...)
- Works for ANY experience level (0-30 years)
- NO HARDCODED VALUES
- NO ASSUMPTIONS about culture or background

{format_instructions}`],

    ["human", `Create personal introduction for this individual.

**TARGET_LANGUAGE:** {language}
**WRITING_STYLE:** {style}

**PERSON:**
Name: {name}

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

Remember: 3/10 interpretation level. Connect dots, but stay grounded in evidence.
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
  signature: input.name,
  questions: [],
  keyHighlights: parsed.keyHighlights,
};
} catch (error) {
console.error("❌ [GENERAL] Generation failed:", error);
throw error;
}
}