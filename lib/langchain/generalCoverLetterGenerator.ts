// lib/langchain/generalCoverLetterGenerator.ts - ADAPTIVE CHARACTER-DRIVEN

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";
import { buildAIContext } from "@/lib/knowledge";

// ════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════

interface CoverLetterInput {
  // Basic Info (NOT included in generated text)
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Job Context
  jobTitle?: string;
  companyName?: string;
  jobPosting?: string;
  
  // Profile Data (for context)
  workExperience?: string;
  education?: string;
  skills?: string;
  
  // Personality (CRITICAL for character-driven letter)
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  superpower?: string;
  energySources?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  
  // Stories & Examples
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  
  // Settings
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
}

const outputSchema = z.object({
  content: z.string().describe("The complete cover letter text in first person, 300-400 words"),
  title: z.string().describe("A compelling subject line or title"),
  keyHighlights: z.array(z.string()).describe("3-4 key points that make this person stand out"),
});

type CoverLetterOutput = z.infer<typeof outputSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(outputSchema);

// ════════════════════════════════════════════════════════════════
// EXPERIENCE LEVEL DETECTION
// ════════════════════════════════════════════════════════════════

function detectExperienceLevel(input: CoverLetterInput): 'limited' | 'mid' | 'experienced' {
  const workExp = input.workExperience || '';
  const edu = input.education || '';
  
  // Count experience indicators
  const yearMatches = workExp.match(/\d{4}/g) || [];
  const hasMultipleRoles = (workExp.match(/\n\n/g) || []).length > 1;
  const hasDegree = edu.toLowerCase().includes('degree') || edu.toLowerCase().includes('university');
  const hasAdvancedDegree = edu.toLowerCase().includes('master') || edu.toLowerCase().includes('msc');
  
  // Limited: 0-2 years, one role, no degree
  if (yearMatches.length <= 2 && !hasMultipleRoles && !hasDegree) {
    return 'limited';
  }
  
  // Experienced: 5+ years, multiple roles, degree
  if (yearMatches.length >= 5 || (hasMultipleRoles && hasAdvancedDegree)) {
    return 'experienced';
  }
  
  // Mid: Everything in between
  return 'mid';
}

// ════════════════════════════════════════════════════════════════
// ADAPTIVE PROMPT - ONE SIZE FITS ALL
// ════════════════════════════════════════════════════════════════

const adaptivePrompt = ChatPromptTemplate.fromMessages([
  ["system", `You are writing a COVER LETTER that reveals CHARACTER, not credentials.

{knowledgeContext}

# ═══════════════════════════════════════════════════════════════
# CORE MISSION: COMPLEMENT THE CV
# ═══════════════════════════════════════════════════════════════

**CV tells:** WHAT they did (jobs, skills, degrees)
**Cover Letter tells:** WHY and HOW (motivation, approach, values)

**CRITICAL RULE:**
NEVER repeat CV facts. Add context, stories, and character.

# ═══════════════════════════════════════════════════════════════
# ADAPTIVE APPROACH (based on experience level: {experienceLevel})
# ═══════════════════════════════════════════════════════════════

## IF LIMITED EXPERIENCE (students, first-timers):
**FOCUS:**
- WHY you want this field (genuine motivation)
- HOW you learn and grow (approach to challenges)
- WHAT you'll bring in future (potential over proof)

**Example opening:**
"Though I've only done one internship, building my own CV generator taught me 
more than any course could. I didn't wait until I knew everything—I started, 
made mistakes, and figured it out. That's how I approach everything: with 
curiosity and persistence."

## IF EXPERIENCED (5+ years):
**FOCUS:**
- WHAT 10 years taught you (wisdom and perspective)
- HOW you lead and mentor (impact on others)
- WHY you're making this move (strategic thinking)

**Example opening:**
"A decade in this field has taught me that the best code isn't the cleverest—
it's the code that solves the real problem. At TechCorp, leading the 
microservices migration wasn't about the technical challenge, it was about 
getting 20 people aligned on why change mattered."

## IF MID-LEVEL (3-7 years):
**FOCUS:**
- HOW your approach evolved (growth trajectory)
- WHAT you've learned about yourself (self-awareness)
- WHERE you want to go next (clear direction)

# ═══════════════════════════════════════════════════════════════
# STRUCTURE (3 PARAGRAPHS, 300-400 WORDS TOTAL)
# ═══════════════════════════════════════════════════════════════

**Paragraph 1: MY APPROACH (100-130 words)**
How do I think? How do I work? What's my philosophy?

Start with action: "I am someone who..." or "I believe that..."
Show your approach through a micro-story or example.

**Paragraph 2: WHAT DRIVES ME (100-130 words)**
What gets me excited? What frustrates me? What makes me proud?

Connect your values to concrete examples.
Show emotion: pride, frustration, satisfaction.

**Paragraph 3: WHERE I'M GOING (100-130 words)**
What am I looking for? What kind of environment helps me thrive?

Be specific about culture fit and what you need to succeed.
End with forward momentum, not just "I hope to hear from you."

# ═══════════════════════════════════════════════════════════════
# WRITING RULES - ABSOLUTE REQUIREMENTS
# ═══════════════════════════════════════════════════════════════

**ALWAYS:**
- ✅ Write in FIRST PERSON ("I am...", "I work...", "I believe...")
- ✅ Tell MICRO-STORIES ("When X happened, I learned Y...")
- ✅ Show VALUES through ACTIONS ("I stayed late because...")
- ✅ Be SPECIFIC ("2 hours of debugging" not "problem-solving skills")

**NEVER:**
- ❌ Include person's NAME in text (added separately)
- ❌ Include EMAIL, PHONE, or ADDRESS
- ❌ List technologies or tools (that's CV's job)
- ❌ Repeat work history chronologically
- ❌ Use corporate buzzwords

**FORBIDDEN PHRASES:**
❌ "I have strong communication skills"
❌ "I am a motivated professional"
❌ "I am ready for any challenge"
❌ "I work well in teams"
❌ "I am a team player"
❌ "I have X years of experience"

**USE INSTEAD:**
✅ "I once spent 2 hours debugging until I found one misplaced comma—
    frustrating, yes, but it taught me patience pays off"
✅ "I don't know everything, but I know how to figure things out"
✅ "At Elkome, I learned that asking for help isn't weakness—it's growth"

# ═══════════════════════════════════════════════════════════════
# PRIVACY PROTECTION - CRITICAL
# ═══════════════════════════════════════════════════════════════

**DO NOT include in generated text:**
- Full name (will be added separately as header)
- Email address
- Phone number
- Full home address
- Any personally identifiable information

The system will add contact info separately as a header.

# ═══════════════════════════════════════════════════════════════
# STYLE ADAPTATION
# ═══════════════════════════════════════════════════════════════

**If style is 'professional':**
- More formal tone
- Balanced emotion (confident but measured)
- Focus on achievements and growth

**If style is 'casual':**
- Conversational tone
- More personal anecdotes
- Show personality strongly

**If style is 'creative':**
- Unique opening
- Unexpected metaphors
- Bold statements with backup

# ═══════════════════════════════════════════════════════════════
# QUALITY CHECKS
# ═══════════════════════════════════════════════════════════════

Before returning, verify:
- [ ] Everything in first person ("I", not "he/she")
- [ ] No name in text body
- [ ] 300-400 words total
- [ ] No contact info in text
- [ ] Tells stories, not lists
- [ ] Complements CV (doesn't repeat it)
- [ ] Sounds like a real person talking

{format_instructions}`],

  ["human", `Create a character-driven cover letter.

**EXPERIENCE LEVEL:** {experienceLevel}

**ADAPT YOUR FOCUS:**
{experienceLevelGuidance}

**CRITICAL RULES:**
1. Write as "I am...", "I work...", "I believe..."
2. NO name in text (added separately)
3. 300-400 words total
4. Focus on CHARACTER, not credentials
5. Tell stories, not lists
6. NEVER repeat CV facts

**JOB CONTEXT:**
{jobContext}

**PROFILE DATA (for context, don't repeat):**

Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY (THIS IS YOUR GOLD):**

Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Energy Sources: {energySources}
Learning Style: {learningStyle}
Team Role: {teamRole}

**STORIES & EXAMPLES:**

Best Example: {bestProjectExample}
Failure Lesson: {failureLesson}
Values: {valuesExample}
Career Goals: {careerGoals}

**LANGUAGE:** {language}
**STYLE:** {style}

Don't repeat the CV. Tell me WHO this person is, WHY they do what they do, and HOW they approach work.

Return JSON with: content (the letter text), title (compelling subject line), keyHighlights (3-4 standout points)`]
]);

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function buildJobContext(input: CoverLetterInput): string {
  const parts: string[] = [];
  
  if (input.jobTitle) {
    parts.push(`Target Position: ${input.jobTitle}`);
  }
  
  if (input.companyName) {
    parts.push(`Company: ${input.companyName}`);
  }
  
  if (input.jobPosting) {
    parts.push(`\nJob Description:\n${input.jobPosting.substring(0, 1000)}`);
  }
  
  return parts.length > 0 
    ? parts.join('\n') 
    : 'General cover letter (no specific job target)';
}

function buildExperienceLevelGuidance(level: 'limited' | 'mid' | 'experienced'): string {
  const guidance = {
    limited: `
You're writing for someone with LIMITED experience.
EMPHASIZE: Motivation, learning ability, potential, fresh perspective
TONE: Enthusiastic but genuine, humble but confident
AVOID: Apologizing for lack of experience
INSTEAD: Frame it as hunger to learn and grow`,
    
    mid: `
You're writing for someone with MID-LEVEL experience.
EMPHASIZE: How they've evolved, self-awareness, clear direction
TONE: Mature and reflective, balanced confidence
AVOID: Listing accomplishments
INSTEAD: Show growth trajectory and lessons learned`,
    
    experienced: `
You're writing for someone with EXTENSIVE experience.
EMPHASIZE: Wisdom gained, leadership, strategic thinking
TONE: Authoritative but relatable, mentor-like
AVOID: Just listing years or titles
INSTEAD: Show what those years taught them`
  };
  
  return guidance[level];
}

function getMessageContent(message: unknown): string {
  if (typeof message === "string") return message;
  if (typeof message !== "object" || message === null) return "";
  if (!("content" in message)) return "";
  
  const content = (message as { content: unknown }).content;
  if (typeof content === "string") return content;
  
  if (Array.isArray(content)) {
    return content
      .map((item: unknown) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && "text" in item) {
          return (item as { text: unknown }).text;
        }
        return "";
      })
      .filter(Boolean)
      .join(" ");
  }
  
  return "";
}

// ════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ════════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetter(
  input: CoverLetterInput
): Promise<CoverLetterOutput> {
  console.log('📝 [COVER LETTER] Generation started');
  console.log(`   - Experience level detection...`);

  try {
    // STEP 1: Detect Experience Level
    const experienceLevel = detectExperienceLevel(input);
    console.log(`   - Detected level: ${experienceLevel}`);

    // STEP 2: Build Context
    const jobContext = buildJobContext(input);
    const experienceLevelGuidance = buildExperienceLevelGuidance(experienceLevel);
    
    // STEP 3: Build RAG Context (if enabled)
    let knowledgeContext = '';
    if (input.enableRAG) {
      try {
        console.log('   - Building RAG context...');
        knowledgeContext = await buildAIContext({
          jobDescription: input.jobPosting || `Cover letter for ${input.jobTitle || 'general position'}`,
          userProfile: {
            name: input.name,
            skills: input.skills,
            workExperience: input.workExperience,
            education: input.education,
          },
          enableRAG: true,
          contentType: 'cover_letter'
        });
        console.log(`   ✅ RAG context: ${knowledgeContext.length} chars`);
      } catch (error) {
        console.error('   ❌ RAG context failed:', error);
        knowledgeContext = '';
      }
    }

    // STEP 4: AI Generation
    console.log('🤖 [AI] Generating cover letter...');
    
    const model = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY!,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      timeout: 20000,
    });

    const formatted = await adaptivePrompt.formatMessages({
      knowledgeContext: knowledgeContext || '',
      experienceLevel,
      experienceLevelGuidance,
      jobContext,
      language: input.language || 'finnish',
      style: input.style || 'professional',
      
      // Profile data
      workExperience: input.workExperience || 'Building experience',
      education: input.education || 'Learning',
      skills: input.skills || 'Developing skills',
      
      // Personality (THE GOLD!)
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Resourceful',
      uniqueStrength: input.uniqueStrength || 'Motivated',
      superpower: input.superpower || 'Fast learner',
      energySources: input.energySources || 'Challenges',
      learningStyle: input.learningStyle || 'Hands-on',
      teamRole: input.teamRole || 'Contributor',
      
      // Stories
      bestProjectExample: input.bestProjectExample || '',
      failureLesson: input.failureLesson || '',
      valuesExample: input.valuesExample || '',
      careerGoals: input.careerGoals || '',
      
      format_instructions: outputParser.getFormatInstructions()
    });

    const result = await Promise.race([
      model.invoke(formatted),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 20000)
      )
    ]);

    const rawContent = getMessageContent(result);
    
    // STEP 5: Parse
    console.log('📋 [PARSE] Parsing response...');
    
    let parsed: CoverLetterOutput;
    try {
      // Try to extract JSON
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = await outputParser.parse(jsonMatch[0]);
      } else {
        parsed = await outputParser.parse(rawContent);
      }
    } catch (parseError) {
      console.error('   ❌ Parse failed, using fallback');
      // Fallback
      parsed = {
        content: rawContent.substring(0, 2000),
        title: `Application for ${input.jobTitle || 'Position'}`,
        keyHighlights: [
          'Strong motivation to learn and grow',
          'Proven problem-solving ability',
          'Team-oriented mindset'
        ]
      };
    }

    // STEP 6: Validate
    const wordCount = parsed.content.split(/\s+/).length;
    console.log(`   - Word count: ${wordCount}`);
    
    if (wordCount < 200) {
      console.warn('   ⚠️ Content too short, might need regeneration');
    }

    // Check for privacy violations
    if (input.name && parsed.content.includes(input.name)) {
      console.warn('   ⚠️ Name found in content, removing...');
      parsed.content = parsed.content.replace(new RegExp(input.name, 'gi'), '[Name]');
    }
    
    if (input.email && parsed.content.includes(input.email)) {
      console.warn('   ⚠️ Email found in content, removing...');
      parsed.content = parsed.content.replace(new RegExp(input.email, 'gi'), '[Email]');
    }

    console.log('✅ [COVER LETTER] Generation complete');
    
    return parsed;

  } catch (error) {
    console.error('❌ [COVER LETTER] Generation failed:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// SAFE WRAPPER
// ════════════════════════════════════════════════════════════════

export async function generateGeneralCoverLetterSafely(
  input: CoverLetterInput
): Promise<CoverLetterOutput> {
  try {
    const timeoutPromise = new Promise<CoverLetterOutput>((_, reject) => {
      setTimeout(() => reject(new Error('Cover letter timeout (25s)')), 25000);
    });

    return await Promise.race([
      generateGeneralCoverLetter(input),
      timeoutPromise
    ]);
  } catch (error) {
    console.error('Cover letter generation failed:', error);
    throw error;
  }
}