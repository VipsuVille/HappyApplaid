// app/api/generate-cover-letter/route.ts - KORJATTU
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate";

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Työhakemus";
  const firstLine = jobDescription.split('\n')[0].trim();
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Työhakemus";
  }
  return firstLine.substring(0, 80).trim();
}

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    console.error('❌ Unauthorized API call: /api/generate-cover-letter');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestData = await req.json();

    const {
      profileData,
      jobDescription: jobDesc,
      personalNotes: notes,
      language,
      style,
      answeredQuestions,
    } = requestData;

    const {
      jobDescription,
      personalNotes,
      name,
      email,
      phone,
      jobTitle,
      education,
      workExperience,
      skills,
    } = requestData;

    const finalJobDescription = jobDescription || jobDesc;
    const finalPersonalNotes = personalNotes || notes;

    if (!finalJobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    const extractedJobTitle = extractJobTitleFromDescription(finalJobDescription);

    // HAE GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    
    console.log(`🛡️ Ground Truth extracted for user ${userId}`);

    // MERGE VASTAUKSET
    let enhancedPersonalNotes = finalPersonalNotes || '';
    
    if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
      console.log(`📝 Integrating ${Object.keys(answeredQuestions).length} answers`);
      
      const answersText = Object.entries(answeredQuestions)
        .map(([questionId, answer]) => `Q: ${questionId}\nA: ${answer}`)
        .join('\n\n');
      
      enhancedPersonalNotes = finalPersonalNotes 
        ? `${finalPersonalNotes}\n\n--- VASTAUKSET ---\n${answersText}`
        : answersText;
    }

    // PREPARE INPUT
    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        jobTitle: profileData.jobTitle,
        education: apiFormat.education,
        workExperience: apiFormat.workExperience,
        skills: profileData.skills,
        language: language || "finnish",
        style: style || "formal",
        workingStyle: profileData.workingStyle,
        problemSolving: profileData.problemSolving,
        energySources: profileData.energySources,
        uniqueStrength: profileData.uniqueStrength,
        learningStyle: profileData.learningStyle,
        teamRole: profileData.teamRole,
        valuesExample: profileData.valuesExample,
        superpower: profileData.superpower,
        careerGoals: profileData.careerGoals,
        bestProjectExample: profileData.bestProjectExample,
        failureLesson: profileData.failureLesson,
        
        enableRAG: false, // V1 ei käytä RAG:ia
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth)
      };
    } else {
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name,
        email,
        phone,
        jobTitle,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
        
        enableRAG: false,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth)
      };
    }

    // GENEROI V1
    console.log(`📝 Generating V1 cover letter for user ${userId}...`);
    
    const coverLetterData = await generateCoverLetterV1(coverLetterInput);

    // JOS KYSYMYKSIÄ
    if (coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        reason: 'AI tarvitsee vahvistusta varmistaakseen totuudenmukaisuuden'
      });
    }

    // MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');
    
    if (!coverLetterData.content) {
      throw new Error('Cover letter content is undefined');
    }
    
    const guardianCheck = await masterConsistencyCheckAI(
      coverLetterData.content,
      groundTruth,
      'generation'
    );

    if (guardianCheck.riskLevel === 'danger') {
      console.error('🚨 GUARDIAN REJECTED');
      
      return NextResponse.json({
        error: 'CONSISTENCY_VIOLATION',
        message: 'Sisältö ei täytä laatuvaatimuksia',
        violations: guardianCheck.violations,
        recommendation: guardianCheck.recommendation
      }, { status: 400 });
    }

    console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);

    // ✅ TALLENNA - TÄRKEÄ: .select() PALAUTTAA ID:N
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedJobTitle,
        language: coverLetterInput.language,
        content: {
          job_description: finalJobDescription,
          cover_letter_content: coverLetterData.content,
          signature: coverLetterData.signature,
          body: coverLetterData.content,
          applicant_info: {
            name: coverLetterInput.name,
            email: coverLetterInput.email,
            phone: coverLetterInput.phone,
            jobTitle: coverLetterInput.jobTitle,
            education: coverLetterInput.education,
            workExperience: coverLetterInput.workExperience,
            skills: coverLetterInput.skills,

            ...(profileData && {
              personalityTraits: {
                workingStyle: profileData.workingStyle,
                uniqueStrength: profileData.uniqueStrength,
                energySources: profileData.energySources,
                teamRole: profileData.teamRole,
                superpower: profileData.superpower,
                problemSolving: profileData.problemSolving,
                learningStyle: profileData.learningStyle,
                valuesExample: profileData.valuesExample,
                careerGoals: profileData.careerGoals,
                bestProjectExample: profileData.bestProjectExample,
                failureLesson: profileData.failureLesson,
              },
            }),
          },
        },
        ai_data: {
          html: { content: coverLetterData.content },
          styles: {
            main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
          },
          
          tier: 'basic', // V1 = basic tier
          cost_per_letter: 50,
          
          ground_truth: groundTruth,
          
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          
          rag_enabled: false,
          
          personality_analysis: {
            job_match_score: coverLetterData.job_match_score || 7,
            personality_hooks: coverLetterData.personality_hooks || [],
            key_differentiators: coverLetterData.key_differentiators || [],
            data_quality: coverLetterData.data_quality || null,
          },
          
          generation_params: {
            style: coverLetterInput.style,
            language: coverLetterInput.language,
            tier: 'basic',
            answered_questions: answeredQuestions || {},
            generator_version: 'v1'
          }
        },
      })
      .select() // ✅ PAKOLLINEN - PALAUTTAA INSERTATUN RIVIN
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    // ✅ VARMISTA ETTÄ ID ON OLEMASSA
    if (!coverLetter || !coverLetter.id) {
      console.error('❌ Cover letter ID missing after insert:', coverLetter);
      throw new Error('Cover letter saved but ID is missing');
    }

    console.log(`✅ Cover letter saved with ID: ${coverLetter.id}`);

    // ✅ PALAUTA OIKEA ID
    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id, // ✅ Tämä on nyt oikea UUID
      title: extractedJobTitle,
      tier: 'basic',
      features: {
        v1: true,
        v2: false,
        rag: false,
        ats: false
      },
      guardianCheck: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        hasWarnings: guardianCheck.riskLevel === 'warning'
      },
      personality_insights: {
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
        key_differentiators: coverLetterData.key_differentiators,
      },
    });
  } catch (error) {
    console.error("❌ Error generating cover letter:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}