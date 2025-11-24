// lib/langchain/coverLetterGeneratorV2.ts - JOB-FIRST ATS APPROACH

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "langchain/output_parsers";
import { z } from "zod";

const coherentCoverLetterSchema = z.object({
  fullText: z.string().describe("Yhtenäinen hakukirjeen teksti (MAX 350 sanaa)"),
  
  keyPoints: z.object({
    personalityHook: z.string(),
    experienceHighlight: z.string(),
    skillsMatch: z.string(),
    motivation: z.string(),
  }),
  
  atsData: z.object({
    matchedKeywords: z.array(z.string()),
    missingExperience: z.boolean(),
    compensationUsed: z.string().optional(),
    readabilityScore: z.number().min(1).max(10),
  }),
});

type CoherentCoverLetter = z.infer<typeof coherentCoverLetterSchema>;
const outputParser = StructuredOutputParser.fromZodSchema(coherentCoverLetterSchema);

/**
 * ✅ STEP 1: ANALYSOI TÄMÄ TYÖ JA SEN ATS-VAATIMUKSET
 */
async function analyzeJobPosting(jobDescription: string) {
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.1,
  });

  const prompt = `You are analyzing a UNIQUE job posting. Each posting is from a DIFFERENT industry.

**STEP 1: DETECT CONTEXT**
What industry is this? What's the role level? What's the company size/culture?

**STEP 2: EXTRACT ATS KEYWORDS**
What terms would THIS company's ATS scan for?
- Technical terms specific to THIS field
- Qualifications THIS role requires
- Skills THIS industry values
- Certifications THIS field needs

**STEP 3: UNDERSTAND REQUIREMENTS**
What does THIS specific role need?

**CRITICAL:**
- DO NOT use predefined keyword lists
- INFER from THIS job text ONLY
- Each industry has DIFFERENT keywords

Job Posting:
${jobDescription}

Return JSON:
{{
  "detected_industry": "industry name",
  "company_size": "startup|small|medium|large|enterprise",
  "keywords": ["keyword1 from THIS job", "keyword2"],
  "required_skills": ["skill1 THIS role needs", "skill2"],
  "required_experience": "X years" or "Entry level",
  "company_name": "Company Name" or "Not specified",
  "job_title": "Exact title from posting"
}}`;

  try {
    const response = await model.invoke(prompt);
    const content = typeof response.content === 'string' 
      ? response.content 
      : JSON.stringify(response.content);
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { 
      detected_industry: "unknown",
      company_size: "unknown",
      keywords: [], 
      required_skills: [], 
      required_experience: "Not specified", 
      company_name: "the company", 
      job_title: "this position" 
    };
    
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Job analysis failed:', error);
    return { 
      detected_industry: "unknown",
      company_size: "unknown",
      keywords: [], 
      required_skills: [], 
      required_experience: "Not specified", 
      company_name: "the company", 
      job_title: "this position" 
    };
  }
}

/**
 * ✅ STEP 2: GENEROI ATS-OPTIMOITU HAKUKIRJE TÄLLE TYÖLLE
 */
export async function generateCoherentCoverLetter(input: {
  jobDescription: string;
  name: string;
  email: string;
  phone: string;
  age?: number;
  workExperience?: string;
  education?: string;
  skills?: string;
  workingStyle?: string;
  problemSolving?: string;
  energySources?: string;
  uniqueStrength?: string;
  learningStyle?: string;
  teamRole?: string;
  superpower?: string;
  valuesExample?: string;
  personalNotes?: string;
  careerGoals?: string;
  bestProjectExample?: string;
  failureLesson?: string;
  language?: string;
  style?: "formal" | "casual";
}) {
  console.log('🔍 V2: Analyzing THIS job posting first...');
  
  // STEP 1: Analysoi TÄMÄ työ
  const jobAnalysis = await analyzeJobPosting(input.jobDescription);
  console.log(`📊 Detected: ${jobAnalysis.detected_industry}, ${jobAnalysis.company_size} company`);

  const hasWorkExperience = input.workExperience && input.workExperience.length > 100;

  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.5,
  });

  const styleInstructions = input.style === 'casual' 
    ? `TONE: Match THIS company's casual culture. Conversational yet professional.`
    : `TONE: Match THIS company's formal culture. Professional and structured.`;

  const ageInstruction = input.age 
    ? `OPENING: Start with age and professional identity suitable for THIS industry.`
    : `OPENING: Start with professional identity suitable for THIS field.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are writing an ATS-optimized cover letter for THIS SPECIFIC job.

**DETECTED JOB CONTEXT:**
Industry: {detectedIndustry}
Company Size: {companySize}
ATS Keywords for THIS field: {keywords}
Requirements for THIS role: {requiredSkills}

**YOUR MISSION:**
Create cover letter that:
1. Passes THIS company's ATS with THESE keywords
2. Remains readable for humans in THIS industry
3. Matches THIS company's culture/size

**ATS OPTIMIZATION FOR THIS JOB:**
- Use keywords from THIS posting naturally
- Integrate terms as they appear in THIS job text
- Match terminology of THIS industry
- Don't force keywords - only if relevant

**ADAPT TO THIS CONTEXT:**
- Startup vs Enterprise tone
- Industry-specific language
- Cultural fit signals
- Role level appropriateness

**STRUCTURE (MAX 350 words):**
1. Introduction (80-100 words): Identity + motivation for THIS role
2. Experience/Skills (150-180 words): Match to THIS job's needs
3. Closing (50-70 words): Enthusiasm for THIS opportunity

**FORBIDDEN:**
- Generic templates
- Keyword stuffing
- Industry stereotypes
- False claims
- Section headers (---)

**LANGUAGE:** {language}
**STYLE:** {styleInstructions}

{format_instructions}`],

    ["human", `Generate ATS cover letter for THIS candidate to THIS job.

**THIS JOB:**
{jobDescription}

**THIS JOB'S REQUIREMENTS (analyzed):**
Industry: {detectedIndustry}
Company: {companySize} size
ATS Keywords: {keywords}
Skills Needed: {requiredSkills}
Experience: {experienceLevel}
Company Name: {companyName}
Role: {jobTitle}

**THIS CANDIDATE:**
Name: {name}
Age: {age}
Education: {education}
Experience: {workExperience}
Skills: {skills}

**PERSONALITY:**
Style: {workingStyle}
Problem Solving: {problemSolving}
Energy: {energySources}
Strength: {uniqueStrength}
Learning: {learningStyle}
Team: {teamRole}
Identity: {superpower}
Values: {valuesExample}

**STORIES:**
Goals: {careerGoals}
Best Moment: {bestProjectExample}
Learning: {failureLesson}

**NOTES:** {personalNotes}

**TASK:**
1. Match candidate to THIS job's ATS keywords
2. Show fit for THIS industry/company
3. Natural integration (no stuffing)
4. MAX 350 words, readable + ATS-optimized

{ageInstruction}

Return JSON only.`]
  ]);

  try {
    const formattedPrompt = await prompt.formatMessages({
      detectedIndustry: jobAnalysis.detected_industry,
      companySize: jobAnalysis.company_size,
      keywords: jobAnalysis.keywords.join(", ") || "Not specified",
      requiredSkills: jobAnalysis.required_skills.join(", ") || "Not specified",
      experienceLevel: jobAnalysis.required_experience,
      companyName: jobAnalysis.company_name,
      jobTitle: jobAnalysis.job_title,
      styleInstructions,
      language: input.language || "Detect from job posting",
      jobDescription: input.jobDescription,
      name: input.name,
      age: input.age ? `${input.age} years` : 'Not specified',
      workExperience: input.workExperience || "Limited formal experience",
      education: input.education || "Not specified",
      skills: input.skills || "Developing",
      workingStyle: input.workingStyle || "Not specified",
      problemSolving: input.problemSolving || "Not specified",
      energySources: input.energySources || "Not specified",
      uniqueStrength: input.uniqueStrength || "Not specified",
      learningStyle: input.learningStyle || "Not specified",
      teamRole: input.teamRole || "Not specified",
      superpower: input.superpower || "Not specified",
      valuesExample: input.valuesExample || "Not specified",
      careerGoals: input.careerGoals || "Not specified",
      bestProjectExample: input.bestProjectExample || "Not specified",
      failureLesson: input.failureLesson || "Not specified",
      personalNotes: input.personalNotes || "None",
      ageInstruction,
      format_instructions: outputParser.getFormatInstructions(),
    });

    const result = await model.invoke(formattedPrompt);
    const content = typeof result.content === 'string' 
      ? result.content 
      : JSON.stringify(result.content);

    const cleanContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No valid JSON');

    const parsed = await outputParser.parse(jsonMatch[0]);

    return {
      fullText: parsed.fullText,
      content: parsed.fullText,
      title: jobAnalysis.job_title || "Cover Letter",
      signature: input.name,
      keyPoints: parsed.keyPoints,
      atsData: parsed.atsData,
      jobAnalysis,
      hasWorkExperience,
    };
  } catch (error) {
    console.error('❌ V2 Generator error:', error);
    throw new Error(`Generator failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }
}

export function generateATSReport(data: { atsData: CoherentCoverLetter['atsData'] }) {
  return {
    keywords_used: data.atsData.matchedKeywords.length,
    total_keywords: data.atsData.matchedKeywords.length,
    keyword_match_score: Math.round((data.atsData.matchedKeywords.length / 15) * 100),
    ats_compatibility_score: data.atsData.readabilityScore * 10,
    critical_keywords_used: data.atsData.matchedKeywords,
    missing_keywords: [],
    improvement_suggestions: [
      data.atsData.matchedKeywords.length < 8
        ? "Consider adding more relevant terms from job posting"
        : "Good keyword coverage",
      data.atsData.readabilityScore < 6
        ? "Simplify language for better readability"
        : "Good readability score",
    ],
  };
}