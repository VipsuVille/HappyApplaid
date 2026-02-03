// lib/langchain/coverLetterGenerator.ts - ✅ FIXED: TRUTH + ADDITIONAL NOTES

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface ATSV1Input {
  jobDescription: string;
  
  // 🔒 PRIVACY: Henkilötiedot (EI lähetetä AI:lle)
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // ✅ ANONYMISOITU DATA
  workExperience?: string;
  education?: string;
  skills?: string;
  yearsOfExperience?: number;
  careerLevel?: 'entry' | 'junior' | 'mid' | 'senior' | 'expert';
  workingStyle?: string;
  problemSolving?: string;
  uniqueStrength?: string;
  superpower?: string;
  energySources?: string;
  learningStyle?: string;
  teamRole?: string;
  valuesExample?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  personalNotes?: string;
  
  // ✅ UUSI: Lisätiedot
  additionalNotes?: string;
  
  language?: string;
  style?: 'professional' | 'casual' | 'creative';
  enableRAG?: boolean;
  guardianValidation?: boolean;
  userId?: string;
  skipQuestions?: boolean;
  followUpAnswers?: Record<string, string>;
}

export interface ATSV1Output {
  content: string;
  title: string;
  signature: string;
  keyHighlights: string[];
  extractedKeywords?: string[];
  guardianReport?: {
    approved: boolean;
    riskLevel: 'safe' | 'warning' | 'danger';
    violations: any;
    recommendation: string;
  };
  questions?: any[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER: KEYWORD EXTRACTION
// ═══════════════════════════════════════════════════════════════

async function extractBasicKeywords(jobDescription: string): Promise<string[]> {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: 'gpt-4o-mini',
    temperature: 0.0,
  });

  const prompt = `Extract 10-15 most important keywords from job posting.

Job Posting:
${jobDescription.substring(0, 2000)}

Return ONLY a JSON array of keywords:
["keyword1", "keyword2", ...]

Focus on:
- Technical skills
- Required qualifications
- Key responsibilities
- Industry terms`;

  try {
    const result = await model.invoke(prompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);
    
    const jsonMatch = content.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) return [];
    
    const keywords = JSON.parse(jsonMatch[0]);
    return Array.isArray(keywords) ? keywords : [];
  } catch (error) {
    console.error('❌ Keyword extraction failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN V1 GENERATOR - ✅ TRUTH + ADDITIONAL NOTES
// ═══════════════════════════════════════════════════════════════

export async function generateATSCoverLetterV1(
  input: ATSV1Input
): Promise<ATSV1Output> {
  
  console.log('🚀 [V1-ATS] Starting generation...');
  console.log('🔒 [V1-ATS] Privacy: Name NOT sent to AI');
  console.log('💬 [V1-ATS] Additional notes:', input.additionalNotes ? 'YES' : 'NO');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 1: SMART QUESTIONS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  if (!input.skipQuestions) {
    console.log('🧠 [V1-ATS] Checking if questions needed...');
    
    try {
      const analysis = await analyzeJobAndProfile({
        jobDescription: input.jobDescription,
        userProfile: {
          name: 'Applicant', // ✅ Anonymous
          workExperience: input.workExperience || "",
          education: input.education || "",
          skills: input.skills || "",
          workingStyle: input.workingStyle || "",
          problemSolving: input.problemSolving || "",
          uniqueStrength: input.uniqueStrength || "",
          careerGoals: input.careerGoals || "",
          bestProjectExample: input.bestProjectExample || "",
          failureLesson: input.failureLesson || "",
          personalNotes: input.personalNotes || "",
        },
        language: input.language || 'finnish',
        userId: input.userId
      });

      const safeQuestions = Array.isArray(analysis?.questions) ? analysis.questions : [];

      if (analysis?.shouldAskQuestions && safeQuestions.length > 0) {
        const criticalQuestions = safeQuestions.filter(q => q && q.priority === 'critical');

        if (criticalQuestions.length > 0) {
          console.log(`❓ [V1-ATS] Returning ${criticalQuestions.length} critical questions`);
          
          return {
            content: "",
            title: "Lisätietoja tarvitaan",
            signature: input.name,
            keyHighlights: [],
            questions: criticalQuestions,
          };
        }
      }
      
      console.log('✅ [V1-ATS] No critical questions needed');
    } catch (error) {
      console.error('⚠️ [V1-ATS] Question analysis failed:', error);
    }
  } else {
    console.log('⏭️ [V1-ATS] Questions skipped');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 2: EXTRACT KEYWORDS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  console.log('🔍 [V1-ATS] Extracting keywords...');
  const keywords = await extractBasicKeywords(input.jobDescription);
  console.log(`✅ [V1-ATS] Found ${keywords.length} keywords:`, keywords.slice(0, 5));

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 3: GUARDIAN - EXTRACT GROUND TRUTH
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  let groundTruth = null;
  if (input.guardianValidation !== false) {
    console.log('🛡️ [V1-ATS] Extracting ground truth...');
    try {
      groundTruth = await extractGroundTruthAI(
        {
          work_experience: input.workExperience,
          education: input.education,
          skills: input.skills,
          working_style: input.workingStyle,
          problem_solving: input.problemSolving,
          unique_strength: input.uniqueStrength,
          team_role: input.teamRole,
          superpower: input.superpower,
          career_goals: input.careerGoals,
          best_project_example: input.bestProjectExample,
        },
        input.userId
      );
      console.log('✅ [V1-ATS] Ground truth extracted');
    } catch (error) {
      console.error('⚠️ [V1-ATS] Ground truth failed:', error);
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // STEP 4: GENERATE LETTER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.6,
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi');
  const languageName = isFinnish ? 'suomi' : 'englanti';

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a cover letter writer (V1 - Basic ATS).

# ════════════════════════════════════════════════════════════════
# 🚨 CRITICAL: TRUTH SCALE 3-4 (NO FABRICATION!)
# ════════════════════════════════════════════════════════════════

SCALE 1-10:
1 = Copy-paste profile (robotic)
3-4 = ⭐ TARGET: Natural BUT truthful
10 = Complete fabrication (FORBIDDEN)

**RULES:**
❌ NEVER fabricate skills not in profile
❌ NEVER claim knowledge of tools/tech not mentioned
❌ NEVER say "I am especially interested in X" without evidence
❌ NEVER invent experiences

✅ DO use TRANSFERABLE SKILLS:
- "Looginen päättelykyky ohjelmoinnista → tekninen dokumentointi"
- "Projektikokemus → ymmärrän strukturoidun työn tärkeyden"

✅ DO express interest to LEARN (but mention the keyword):
- "Vaikka en ole käyttänyt DITA XML:ää, ohjelmointitaustani antaa pohjan oppimiselle"
  (ATS finds "DITA XML", human sees honesty)

# ════════════════════════════════════════════════════════════════
# 🎯 KEYWORD STRATEGY (V1: Basic Integration)
# ════════════════════════════════════════════════════════════════

**KEYWORDS:** {keywords}

**INTEGRATION:**
1. IF user has skill → Use naturally in context
2. IF user lacks skill → Use "interest to learn" pattern (includes keyword!)
3. DON'T spam keywords

**MISSING KEYWORD PATTERN:**
✅ "Vaikka minulla ei ole kokemusta [KEYWORD], [TRANSFERABLE SKILL] 
    antaa vahvan pohjan. Olen innokas oppimaan [KEYWORD]."

Example:
"Vaikka en ole työskennellyt teknisen dokumentaation parissa, 
ohjelmointiprojekteissani havaitsin kuinka kriittistä selkeä 
dokumentointi on. Tämä herätti kiinnostukseni oppia DITA XML:n ja 
CCMS-järjestelmien käyttöä."

# ════════════════════════════════════════════════════════════════
# 💬 USER'S SPECIAL INSTRUCTIONS
# ════════════════════════════════════════════════════════════════

{additionalInstructions}

**FOLLOW THESE INSTRUCTIONS CAREFULLY!**
User knows their situation best. If they say "emphasize X", do it.

# ════════════════════════════════════════════════════════════════
# 📝 STRUCTURE (300-400 words)
# ════════════════════════════════════════════════════════════════

**NO HEADER:**
- Don't include: Name, email, phone, date
- Template handles these

**PARAGRAPH 1: HOOK (2-3 sentences)**
✅ Modern: "Konecranesin kesätyöharjoittelija-rooli teknisessä 
    dokumentaatiossa yhdistää täsmälleen..."
❌ Generic: "Olen innostunut hakemaan..."

**PARAGRAPH 2-3: EXPERIENCE (5-7 sentences)**
- Real experiences + transferable skills
- Use "missing keyword pattern" for gaps
- Concrete examples from profile
- Connect personality to role

**PARAGRAPH 4: CLOSING (2 sentences)**
- Forward-looking
- NO signature (template handles it)

✅ "Odotan innolla mahdollisuutta keskustella."
[STOP - no name, no sign-off]

**LANGUAGE:** {languageName}
**STYLE:** {style}`],

    ['human', `Write cover letter for THIS job.

**JOB DESCRIPTION:**
{jobDescription}

**KEYWORDS TO INTEGRATE:**
{keywords}

**APPLICANT (ANONYMOUS):**
Career Level: {careerLevel}
Years: {yearsOfExperience}

Work Experience: {workExperience}
Education: {education}
Skills: {skills}

**PERSONALITY & STRENGTHS:**
Working Style: {workingStyle}
Problem Solving: {problemSolving}
Unique Strength: {uniqueStrength}
Superpower: {superpower}
Team Role: {teamRole}

**MOTIVATION:**
Career Goals: {careerGoals}
Best Project: {bestProjectExample}
Failure Lesson: {failureLesson}

**USER'S SPECIAL INSTRUCTIONS:**
{additionalNotes}

**FOLLOW-UP ANSWERS:**
{followUpAnswers}

**CRITICAL REMINDERS:**
1. Truth Scale 3-4 (NO fabrication!)
2. Use "missing keyword pattern" for skills gaps
3. Connect transferable skills from experience
4. Follow user's special instructions
5. Modern opening (no clichés)
6. NO name/email/phone/signature in body
7. Write in {languageName}
8. End with forward-looking sentence

Generate body text ONLY (no header, no signature).`]
  ]);

  try {
    // ✅ ADDITIONAL NOTES HANDLING
    let additionalInstructionsText = 'None';
    if (input.additionalNotes && input.additionalNotes.trim()) {
      additionalInstructionsText = `**USER SAYS:**\n"${input.additionalNotes}"\n\n**YOU MUST FOLLOW THIS!** User knows their situation best.`;
      console.log('💬 [V1-ATS] Using additional notes:', input.additionalNotes.substring(0, 50) + '...');
    }

    const formatted = await prompt.formatMessages({
      languageName,
      style: input.style || 'professional',
      keywords: keywords.join(', '),
      jobDescription: input.jobDescription,
      additionalInstructions: additionalInstructionsText,
      
      // ✅ ANONYMIZED DATA
      careerLevel: input.careerLevel || 'mid',
      yearsOfExperience: input.yearsOfExperience || 0,
      workExperience: input.workExperience || 'Building experience',
      education: input.education || 'Continuous learner',
      skills: input.skills || 'Developing skills',
      workingStyle: input.workingStyle || 'Adaptable',
      problemSolving: input.problemSolving || 'Logical thinker',
      uniqueStrength: input.uniqueStrength || 'Committed',
      superpower: input.superpower || 'Motivated',
      teamRole: input.teamRole || 'Collaborative',
      careerGoals: input.careerGoals || 'Professional growth',
      bestProjectExample: input.bestProjectExample || 'No specific project',
      failureLesson: input.failureLesson || 'Always learning',
      additionalNotes: input.additionalNotes || 'None',
      followUpAnswers: input.followUpAnswers 
        ? Object.entries(input.followUpAnswers).map(([q, a]) => `${q}: ${a}`).join('\n')
        : 'None',
    });

    const result = await model.invoke(formatted);
    
    let content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    // ✅ CLEANUP
    content = content
      .replace(/\[.*?\]/g, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .replace(/Ystävällisin terveisin,?\s*/gi, '')
      .replace(/Best regards,?\s*/gi, '')
      .replace(/Sincerely,?\s*/gi, '')
      .trim();

    // ✅ REMOVE NAME IF LEAKED
    const namePattern = new RegExp(`\\b${input.name}\\b`, 'gi');
    const nameCount = (content.match(namePattern) || []).length;
    
    if (nameCount > 0) {
      console.warn(`⚠️ [V1-ATS] AI leaked name ${nameCount} times - removing`);
      content = content.replace(namePattern, '').trim();
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // STEP 5: GUARDIAN VALIDATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    let guardianReport = null;
    if (input.guardianValidation !== false && groundTruth) {
      console.log('🛡️ [V1-ATS] Running Guardian...');
      try {
        guardianReport = await masterGuardianValidatorV2(
          content,
          groundTruth,
          'generation'
        );
        console.log(`🛡️ [V1-ATS] Guardian: ${guardianReport.approved ? 'APPROVED ✅' : 'ISSUES ⚠️'}`);
        
        if (!guardianReport.approved) {
          console.warn('⚠️ [V1-ATS] Guardian violations:', guardianReport.violations);
        }
      } catch (error) {
        console.error('⚠️ [V1-ATS] Guardian failed:', error);
      }
    }

    console.log(`✅ [V1-ATS] Generated ${content.length} chars`);
    console.log(`📊 [V1-ATS] Keywords used: ${keywords.length}`);

    return {
      content,
      title: `Application - ${input.jobDescription.substring(0, 50)}...`,
      signature: input.name,
      keyHighlights: keywords.slice(0, 5),
      extractedKeywords: keywords,
      guardianReport: guardianReport || undefined,
    };

  } catch (error) {
    console.error('❌ [V1-ATS] Generation failed:', error);
    throw error;
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';