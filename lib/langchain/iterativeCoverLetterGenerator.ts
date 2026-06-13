// lib/langchain/iterativeCoverLetterGenerator.ts
// KOHDISTETTU MUOKKAUS - Muutetaan vain tarvittavat osat

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { FINNISH_STYLE_RULES } from "./finnishStyle";
import { GOOD_APPLICATION_GUIDE } from "./goodApplicationguide";

export interface IterationInput {
  // Alkuperäiset inputit (context)
  jobDescription: string;
  profileData: any;
  language: string;
  style: string;
  originalType: 'ats-v1' | 'ats-v2' | 'general';
  
  // Nykyinen kirje
  currentContent: string;
  
  // Käyttäjän palaute
  userFeedback: string;
  
  // Historia (optional)
  previousIterations?: Array<{
    version: number;
    user_feedback: string;
    changes_made: string;
  }>;
}

export interface IterationOutput {
  newContent: string;
  changesSummary: string;
  affectedSections: string[]; // esim ["paragraph_2", "opening"]
}

/**
 * ITERATIIVINEN GENERAATTORI
 * 
 * Muokkaa VAIN niitä osia kirjeestä, joihin käyttäjä antaa palautetta.
 * Säilyttää loput osat ennallaan.
 */
export async function iterateCoverLetter(
  input: IterationInput
): Promise<IterationOutput> {
  
  console.log('🔄 [ITERATE] Starting targeted modification...');
  console.log('📝 [ITERATE] User feedback:', input.userFeedback.substring(0, 100));

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.3, // ✅ Matala = vähemmän vaihtelua, kohdennetumpi muutos
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
const finnishStyle = isFinnish ? FINNISH_STYLE_RULES : '';
const appGuide = isFinnish ? GOOD_APPLICATION_GUIDE : '';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a cover letter editor specializing in TARGETED, MINIMAL modifications.

# ════════════════════════════════════════════════════════════════
# 🎯 CRITICAL: MINIMAL CHANGES ONLY
# ════════════════════════════════════════════════════════════════
{finnishStyle}

{appGuide}
**GOLDEN RULE:**
Change ONLY what the user asks for. Keep everything else IDENTICAL.

**EXAMPLES:**

User: "Korosta enemmän projektinhallintaosaamistani"
→ Add 1-2 sentences about project management
→ KEEP all other paragraphs UNCHANGED

User: "Poista maininta varastotyöstä"
→ Remove warehouse reference
→ KEEP all other content IDENTICAL

User: "Muuta avauskappale renommaksi"
→ Rewrite ONLY opening paragraph
→ KEEP paragraphs 2-4 UNCHANGED

User: "Lisää esimerkki projektista"
→ Add 1 concrete project example
→ KEEP rest UNCHANGED

# ════════════════════════════════════════════════════════════════
# 📋 STRUCTURE AWARENESS
# ════════════════════════════════════════════════════════════════

Typical cover letter has 4 parts:
1. Opening (hook) - 2-3 sentences
2. Experience & Skills - 5-7 sentences
3. Personality & Fit - 3-4 sentences
4. Closing - 2 sentences

Identify which part(s) to modify based on feedback.

# ════════════════════════════════════════════════════════════════
# 🚫 WHAT NOT TO DO
# ════════════════════════════════════════════════════════════════

❌ DON'T rewrite entire letter unless user explicitly says "muokkaa kaikkea"
❌ DON'T change tone/style unless user asks
❌ DON'T add new facts not in original profile
❌ DON'T remove good existing content unless user asks
❌ DON'T restructure unless user asks

# ════════════════════════════════════════════════════════════════
# ✅ WHAT TO DO
# ════════════════════════════════════════════════════════════════

✅ Make MINIMAL, TARGETED changes
✅ Keep unchanged parts IDENTICAL (same wording)
✅ Add/modify ONLY what user requests
✅ Maintain same structure (4 paragraphs)
✅ Stay truthful (use only profile data)

Language: {language}
Style: {style}`],

    ['human', `Modify this cover letter based on user feedback.

# ════════════════════════════════════════════════════════════════
# CURRENT LETTER (DO NOT CHANGE UNLESS FEEDBACK SAYS SO)
# ════════════════════════════════════════════════════════════════

{currentContent}

# ════════════════════════════════════════════════════════════════
# ORIGINAL CONTEXT (for reference only)
# ════════════════════════════════════════════════════════════════

**Job Description:**
{jobDescription}

**Applicant Profile:**
Work: {workExperience}
Education: {education}
Skills: {skills}
Strengths: {uniqueStrength}
Superpower: {superpower}

# ════════════════════════════════════════════════════════════════
# PREVIOUS MODIFICATIONS (for context)
# ════════════════════════════════════════════════════════════════

{iterationHistory}

# ════════════════════════════════════════════════════════════════
# 🎯 USER'S FEEDBACK (WHAT TO CHANGE)
# ════════════════════════════════════════════════════════════════

**USER SAYS:**
"{userFeedback}"

# ════════════════════════════════════════════════════════════════
# YOUR TASK
# ════════════════════════════════════════════════════════════════

1. **Analyze** which part(s) of the letter to modify
2. **Keep** everything else IDENTICAL
3. **Make** the requested change
4. **Return** the modified letter

**IMPORTANT:**
- If user says "korosta X", add 1-2 sentences about X
- If user says "poista Y", remove Y but keep rest
- If user says "muuta kappale Z", modify only Z
- If user says "muokkaa kaikkea", rewrite entire letter
- Default: MINIMAL changes only!

**OUTPUT FORMAT:**

Return JSON:
{{
  "newContent": "The modified cover letter (body only, no header/signature)",
  "changesSummary": "Brief summary in Finnish (what changed, what stayed same)",
  "affectedSections": ["opening" | "experience" | "personality" | "closing"]
}}

Example changesSummary:
"Lisätty 2 lausetta projektinhallinnasta kappaleeseen 2. Muut kappaleet säilytetty ennallaan."

Generate now.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      language: isFinnish ? 'suomi' : 'englanti',
      style: input.style,
      currentContent: input.currentContent,
      jobDescription: input.jobDescription.substring(0, 2000),
      
      // Profile data (for context)
      workExperience: typeof input.profileData.work_experience === 'string' 
        ? input.profileData.work_experience 
        : JSON.stringify(input.profileData.work_experience || []),
      education: typeof input.profileData.education === 'string'
        ? input.profileData.education
        : JSON.stringify(input.profileData.education || []),
      skills: Array.isArray(input.profileData.skills)
        ? input.profileData.skills.join(', ')
        : input.profileData.skills || '',
      uniqueStrength: input.profileData.unique_strength || '',
      superpower: input.profileData.superpower || '',
        finnishStyle,
  appGuide,
      // History
      iterationHistory: input.previousIterations && input.previousIterations.length > 0
        ? input.previousIterations.map((iter, i) => 
            `Version ${iter.version}: "${iter.user_feedback}" → ${iter.changes_made}`
          ).join('\n')
        : 'None (first iteration)',
      
      // Current feedback
      userFeedback: input.userFeedback,
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
    // Parse JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Invalid response format from AI');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate
    if (!parsed.newContent || !parsed.changesSummary) {
      throw new Error('Missing required fields in AI response');
    }
    
    console.log('✅ [ITERATE] Modification complete');
    console.log('📊 [ITERATE] Affected sections:', parsed.affectedSections);
    console.log('📝 [ITERATE] Changes:', parsed.changesSummary);

    return {
      newContent: parsed.newContent.trim(),
      changesSummary: parsed.changesSummary,
      affectedSections: parsed.affectedSections || ['unknown']
    };

  } catch (error) {
    console.error('❌ [ITERATE] Failed:', error);
    throw new Error('Iteratiivinen muokkaus epäonnistui');
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';