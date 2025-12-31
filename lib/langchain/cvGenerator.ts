// lib/langchain/cvGenerator.ts - TÄYDELLINEN KORJATTU VERSIO

import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { analyzeJobAndProfile } from "./smartQuestionAnalyzer";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface LangChainCVInput {
  userId: string;
  cvId: string;
  cvType: string;
  language: string;
  
  name: string;
  email: string;
  phone: string;
  location: string;
  title: string;
  introText: string;
  
  education: string;
  workExperience: string;
  skills: string;
  languages: string;
  
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
  
  profileImage?: string;
  jobPosting?: string;
  enableRAG?: boolean;
  
  // ✅ KYSYMYSTUKI
  skipQuestions?: boolean;
  answeredQuestions?: Array<{ question: string; answer: string }>;
}

export interface CVGenerationResult {
  html: {
    skills_section: string;
    experience_section: string;
    education_section: string;
    languages_section: string;
  };
  personal_description: string;
  profile_initials: string;
  background_image: string | null;
  fullTextContent: string;
  
  // ✅ KYSYMYKSET
  needsMoreInfo?: boolean;
  questions?: any[];
  
  ground_truth_check?: {
    approved: boolean;
    riskLevel: string;
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN GENERATOR FUNCTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function generateCVSafely(input: LangChainCVInput): Promise<CVGenerationResult> {
  
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. SMART QUESTION ANALYSIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  if (!input.skipQuestions) {
    console.log('🔍 CV: Running smart question analysis...');
    console.log(`   - Profile: ${input.name}`);
    console.log(`   - Skills: ${input.skills?.substring(0, 50)}...`);
    console.log(`   - Work Experience length: ${input.workExperience?.length || 0}`);
    
    try {
      const smartAnalysis = await analyzeJobAndProfile({
        jobDescription: input.jobPosting || `Professional CV for ${input.title || 'various roles'}`,
        userProfile: {
          name: input.name || "Not specified",
          workExperience: input.workExperience || "Not specified",
          education: input.education || "Not specified",
          skills: input.skills || "Not specified",
          workingStyle: input.workingStyle || "Not specified",
          problemSolving: input.problemSolving || "Not specified",
          uniqueStrength: input.uniqueStrength || "Not specified",
          careerGoals: input.careerGoals || "Not specified",
          bestProjectExample: input.bestProjectExample || "Not specified",
          failureLesson: input.failureLesson || "Not specified",
          personalNotes: input.introText || "Not specified",
        },
        language: input.language || 'finnish',
        userId: input.userId
      });

      console.log(`   - Analysis complete: shouldAsk=${smartAnalysis.shouldAskQuestions}, questions=${smartAnalysis.questions.length}`);

      // ✅ KYSYTÄÄNKÖ? - PRIORISOIDA CRITICAL KYSYMYKSET
      if (smartAnalysis.shouldAskQuestions && smartAnalysis.questions.length > 0) {
        
        // Hae vain ne kysymykset joihin ei ole jo vastattu
        const unansweredQuestions = smartAnalysis.questions.filter(q => {
          if (input.answeredQuestions && input.answeredQuestions.length > 0) {
            const isAnswered = input.answeredQuestions.some(
              (answered: any) => answered.question === q.question
            );
            if (isAnswered) {
              console.log(`   ✓ Already answered: ${q.question.substring(0, 50)}...`);
            }
            return !isAnswered;
          }
          return true;
        });

        const criticalQuestions = unansweredQuestions.filter(
          q => q.priority === 'critical'
        );
        
        if (criticalQuestions.length > 0) {
          console.log(`❓ CV: Found ${criticalQuestions.length} critical unanswered questions`);
          criticalQuestions.forEach((q, i) => {
            console.log(`   ${i + 1}. ${q.question}`);
          });
          
          // ✅ PALAUTA KYSYMYKSET (EI generoi CV:tä vielä)
          return {
            html: {
              skills_section: "",
              experience_section: "",
              education_section: "",
              languages_section: ""
            },
            personal_description: "",
            profile_initials: input.name?.substring(0, 2).toUpperCase() || "UN",
            background_image: null,
            fullTextContent: "",
            
            // ✅ TÄRKEIN OSA
            needsMoreInfo: true,
            questions: criticalQuestions,
            
            ground_truth_check: {
              approved: false,
              riskLevel: "safe"
            }
          };
        }
        
        console.log(`✅ CV: All critical questions answered (${input.answeredQuestions?.length || 0} answers provided)`);
      } else {
        console.log('✅ CV: Profile sufficient, no questions needed');
      }
      
    } catch (error) {
      console.error('⚠️ CV: Question analysis failed, continuing anyway:', error);
      if (error instanceof Error) {
        console.error('   Error message:', error.message);
        console.error('   Error stack:', error.stack);
      }
    }
  } else {
    console.log('⏭️ CV: Skipping question analysis (skipQuestions=true)');
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. JATKA NORMAALIIN CV-GENEROINTIIN
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  console.log(`🤖 Generating CV content (type: ${input.cvType})...`);
  
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-4o-mini",
    temperature: 0.7,
  });

  const isFinnish = (input.language || 'finnish').toLowerCase().includes('fi') || 
                    (input.language || 'finnish').toLowerCase().includes('suom');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // PROMPT TEMPLATE
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a professional CV generator.

Language: ${isFinnish ? 'FINNISH' : 'ENGLISH'}
IMPORTANT: Generate ALL content in ${isFinnish ? 'FINNISH' : 'ENGLISH'}.

Generate CV sections in HTML format. Be truthful - only include skills and experience explicitly provided.

Return VALID JSON:
{
  "html": {
    "skills_section": "<ul><li>Skill 1</li></ul>",
    "experience_section": "<div><h3>Job Title</h3><p>Description</p></div>",
    "education_section": "<div><h3>Degree</h3><p>School</p></div>",
    "languages_section": "<ul><li>Language - Level</li></ul>"
  },
  "personal_description": "Professional summary in ${isFinnish ? 'Finnish' : 'English'}...",
  "profile_initials": "AB",
  "background_image": null,
  "fullTextContent": "Plain text version..."
}

RULES:
- NO fabrication - use ONLY provided information
- ${isFinnish ? 'Write in FINNISH' : 'Write in ENGLISH'}
- HTML must be valid and clean
- Keep descriptions concise but informative`],

    ['human', `Generate CV for:

NAME: {name}
TITLE: {title}
EMAIL: {email}
PHONE: {phone}
LOCATION: {location}

SKILLS: {skills}
WORK EXPERIENCE: {workExperience}
EDUCATION: {education}
LANGUAGES: {languages}

PERSONALITY:
- Working Style: {workingStyle}
- Problem Solving: {problemSolving}
- Unique Strength: {uniqueStrength}
- Superpower: {superpower}

CAREER:
- Goals: {careerGoals}
- Best Project: {bestProject}

${input.answeredQuestions && input.answeredQuestions.length > 0 ? `
ADDITIONAL INFO (from user answers):
${input.answeredQuestions.map((qa: any) => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n')}
` : ''}

Generate professional CV sections in ${isFinnish ? 'FINNISH' : 'ENGLISH'}.`]
  ]);

  try {
    const formatted = await prompt.formatMessages({
      name: input.name || "Unknown",
      title: input.title || "Professional",
      email: input.email || "",
      phone: input.phone || "",
      location: input.location || "",
      skills: input.skills || "Developing skills",
      workExperience: input.workExperience || "Building experience",
      education: input.education || "Continuous learner",
      languages: input.languages || "Native language",
      workingStyle: input.workingStyle || "Adaptable",
      problemSolving: input.problemSolving || "Logical",
      uniqueStrength: input.uniqueStrength || "Dedicated",
      superpower: input.superpower || "Motivated",
      careerGoals: input.careerGoals || "Professional growth",
      bestProject: input.bestProjectExample || "N/A"
    });

    const result = await model.invoke(formatted);
    
    let content: string;
    if (typeof result.content === 'string') {
      content = result.content;
    } else if (Array.isArray(result.content)) {
      content = result.content.map(c => typeof c === 'string' ? c : JSON.stringify(c)).join('');
    } else {
      content = JSON.stringify(result.content);
    }
    
    // Clean markdown
    content = content
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();
    
    // Extract JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ No JSON found in CV generation response');
      throw new Error('No JSON found in CV generation response');
    }

    const cvData = JSON.parse(jsonMatch[0]);
    
    // ✅ VALIDATE STRUCTURE
    if (!cvData.html || typeof cvData.html !== 'object') {
      console.error('❌ Invalid CV structure - missing html object');
      throw new Error('Invalid CV structure');
    }
    
    console.log(`✅ CV generated successfully`);
    console.log(`   - Skills: ${cvData.html.skills_section?.length || 0} chars`);
    console.log(`   - Experience: ${cvData.html.experience_section?.length || 0} chars`);
    console.log(`   - Education: ${cvData.html.education_section?.length || 0} chars`);
    console.log(`   - Description: ${cvData.personal_description?.length || 0} chars`);
    
    return {
      html: {
        skills_section: cvData.html.skills_section || "<p>Skills section not generated</p>",
        experience_section: cvData.html.experience_section || "<p>Experience section not generated</p>",
        education_section: cvData.html.education_section || "<p>Education section not generated</p>",
        languages_section: cvData.html.languages_section || "<p>Languages section not generated</p>"
      },
      personal_description: cvData.personal_description || "Professional with diverse experience",
      profile_initials: cvData.profile_initials || input.name?.substring(0, 2).toUpperCase() || "UN",
      background_image: cvData.background_image || null,
      fullTextContent: cvData.fullTextContent || "",
      
      needsMoreInfo: false,
      questions: [],
      
      ground_truth_check: {
        approved: true,
        riskLevel: "safe"
      }
    };
    
  } catch (error) {
    console.error('❌ CV generation failed:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    throw error;
  }
}