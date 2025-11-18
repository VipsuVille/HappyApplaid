// app/api/generate-cover-letter/route.ts - KORJATTU TEMPLATE-VIRHE

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterWithPersonalityExtraction } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruth, masterConsistencyCheck, GroundTruth } from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate"; // ✅ UUSI

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

    // ✅ 1. HAE KÄYTTÄJÄN PROFIILI JA EKSTRAKTOI GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth: GroundTruth = extractGroundTruth(userProfile || {});
    
    console.log('🛡️ Ground Truth established:', {
      name: groundTruth.name,
      yearsOfExperience: groundTruth.yearsOfExperience,
      corePersonality: groundTruth.corePersonality.primary,
      cannotClaim: groundTruth.cannotClaim.length
    });

    // Prepare cover letter input
    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: finalPersonalNotes,
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
        
        // ✅ KORJATTU: Escapeta {} promptia varten
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth)
      };
    } else {
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: finalPersonalNotes,
        name,
        email,
        phone,
        jobTitle,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
        
        // ✅ KORJATTU: Escapeta {} promptia varten
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth)
      };
    }

    // Check subscription
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    console.log("🚀 Generating cover letter with personality extraction...");
    const coverLetterData = await generateCoverLetterWithPersonalityExtraction(
      coverLetterInput
    );

    // ✅ JOS KYSYMYKSIÄ, PALAUTA NE
    if (coverLetterData.questions && coverLetterData.questions.length > 0) {
      return NextResponse.json({
        success: true,
        needsMoreInfo: true, // ✅ Merkki että kysymyksiä
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        tempContent: coverLetterData.content, // ✅ Väliaikainen sisältö
        signature: coverLetterData.signature,
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
      });
    }

    // ✅ 2. CHECKPOINT 1: MASTER GUARDIAN VALIDATION
    console.log('🛡️ Running Master Guardian validation...');
    const guardianCheck = await masterConsistencyCheck(
      coverLetterData.content,
      groundTruth,
      'generation'
    );

    // 🚨 HYLKÄÄ JOS DANGER
    if (guardianCheck.riskLevel === 'danger') {
      console.error('🚨 MASTER GUARDIAN BLOCKED GENERATION!');
      console.error('Violations:', guardianCheck.violations);
      
      return NextResponse.json({
        error: 'CONSISTENCY_VIOLATION',
        message: 'AI generoi epäjohdonmukaisen hakukirjeen. Yritä uudelleen.',
        violations: guardianCheck.violations,
        recommendation: guardianCheck.recommendation,
        fixSuggestions: guardianCheck.fixSuggestions
      }, { status: 400 });
    }

    // ⚠️ LOGITA WARNING
    if (guardianCheck.riskLevel === 'warning') {
      console.warn('⚠️ Guardian warning:', guardianCheck.violations);
    }

    console.log('✅ Guardian approved:', guardianCheck.riskLevel);

    // ✅ 3. TALLENNA + GROUND TRUTH MUKANA
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
              },
            }),
          },
        },
        ai_data: {
          html: {
            content: coverLetterData.content,
          },
          styles: {
            main_style:
              'font-family: "Merriweather", serif; line-height: 1.7; font-size: 1rem;',
          },
          
          // ✅ GROUND TRUTH TALLENNETTU
          ground_truth: groundTruth,
          
          // ✅ GUARDIAN CHECK TALLENNETTU
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          
          personality_analysis: {
            job_match_score: coverLetterData.job_match_score || 7,
            personality_hooks: coverLetterData.personality_hooks || [],
            key_differentiators: coverLetterData.key_differentiators || [],
            data_quality: coverLetterData.data_quality || null,
          },
          personality_used: profileData
            ? {
                workingStyle: profileData.workingStyle,
                problemSolving: profileData.problemSolving,
                uniqueStrength: profileData.uniqueStrength,
                teamRole: profileData.teamRole,
                energySources: profileData.energySources,
                superpower: profileData.superpower,
              }
            : null,
        },
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedJobTitle,
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
    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}