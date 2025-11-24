// app/api/generate-cover-letter-v2/route.ts - KORJATTU

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter, generateATSReport } from "@/lib/langchain/coverLetterGeneratorV2";
import { validateUniversally } from "@/lib/langchain/universalValidator";
import { supabaseAdmin } from "@/lib/supabase";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      jobDescription,
      personalNotes,
      name,
      email,
      phone,
      age,
      jobTitle,
      education,
      workExperience,
      skills,
      language,
      style,
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      valuesExample,
      superpower,
      careerGoals,           // ✅ LISÄTTY
      bestProjectExample,    // ✅ LISÄTTY
      failureLesson,         // ✅ LISÄTTY
      skipValidation,
      answeredQuestions,
    } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    // Tarkista tilaus
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

    if (subscription.plan_type !== "premium") {
      return NextResponse.json(
        { error: "PREMIUM_REQUIRED", message: "ATS-optimoitu hakukirje vaatii Premium-tilauksen" },
        { status: 403 }
      );
    }

    // ✅ 1. HANKKI GROUND TRUTH (AWAIT LISÄTTY!)
    console.log('🛡️ Extracting ground truth from profile...');
    const userProfile = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // ✅ KORJATTU: Lisää await
    const groundTruth = await extractGroundTruthAI(userProfile.data || {});
    console.log('✅ Ground truth established');

    // ✅ 2. VALIDOINTI (jos ei ohitettu)
    if (!skipValidation) {
      console.log('🔍 Running validation...');
      
      const validation = await validateUniversally({
        jobDescription,
        language: language || 'finnish',
        userProfile: {
          name,
          email,
          phone,
          skills,
          workExperience,
          education,
          problemSolving,
          uniqueStrength,
          workingStyle,
          learningStyle,
          teamRole,
          superpower,
          valuesExample,
          energySources,
          careerGoals,           // ✅ LISÄTTY
          bestProjectExample,    // ✅ LISÄTTY
          failureLesson,         // ✅ LISÄTTY
        },
        personalNotes
      });

      if (validation.score < 60 && validation.questions.length > 0) {
        console.log(`❓ Validation score too low: ${validation.score}/100`);
        return NextResponse.json({
          needsMoreInfo: true,
          questions: validation.questions,
          score: validation.score,
          reason: validation.reason,
          warnings: validation.warnings
        });
      }
      
      console.log(`✅ Validation passed: ${validation.score}/100`);
    }

    // ✅ 3. YHDISTÄ VASTAUKSET personalNotes:iin
    let enhancedPersonalNotes = personalNotes || '';
    
    if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
      console.log(`📝 Integrating ${Object.keys(answeredQuestions).length} answered questions`);
      
      const answersText = Object.entries(answeredQuestions)
        .map(([questionId, answer]) => `${questionId}: ${answer}`)
        .join('\n\n');
      
      enhancedPersonalNotes = personalNotes 
        ? `${personalNotes}\n\nLISÄTIEDOT:\n${answersText}`
        : `LISÄTIEDOT:\n${answersText}`;
    }

    // ✅ 4. LUO HAKUKIRJE
    console.log(`📝 Generating ATS-optimized cover letter (${style || 'formal'} style)...`);
    
    const coverLetterData = await generateCoherentCoverLetter({
      jobDescription,
      name,
      email,
      phone,
      age,
      workExperience,
      education,
      skills,
      language,
      style,
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      superpower,
      valuesExample,
      careerGoals,              // ✅ LISÄTTY
      bestProjectExample,       // ✅ LISÄTTY
      failureLesson,            // ✅ LISÄTTY
      personalNotes: enhancedPersonalNotes,
    });

    // ✅ 5. MASTER GUARDIAN TARKISTUS - KORJATTU fullText + context
    console.log('🛡️ Running Master Guardian validation...');
    
    // ✅ KORJATTU: Käytä fullText tai content
    const coverLetterContent = coverLetterData.content || '';
    
    if (!coverLetterContent) {
      throw new Error('Cover letter content is empty');
    }
    
    // ✅ KORJATTU: Lisää 'ats_generation' masterGuardian.ts:ään
    const guardianCheck = await masterConsistencyCheckAI(
      coverLetterContent,
      groundTruth,
      'generation' // ✅ KORJATTU: Käytä 'generation' koska 'ats_generation' ei ole määritelty
    );

    if (guardianCheck.riskLevel === 'danger') {
      console.warn('⚠️ Guardian detected issues (ATS-mode: logging only)');
      console.warn('Violations:', guardianCheck.violations);
    }

    console.log(`✅ Guardian check: ${guardianCheck.riskLevel}`);

    const atsReport = generateATSReport({ atsData: coverLetterData.atsData });

    // ✅ 6. TALLENNA
    const { data: savedLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: coverLetterData.title || "Työhakemus",
        language: language || "finnish",
        content: {
          job_description: jobDescription,
          body: coverLetterContent, // ✅ KORJATTU
          applicant_info: {
            name,
            email,
            phone,
            jobTitle,
            education,
            workExperience,
            skills,
            age,
            personality_profile: {
              workingStyle,
              problemSolving,
              energySources,
              uniqueStrength,
              learningStyle,
              teamRole,
              valuesExample,
              superpower,
              careerGoals,           // ✅ LISÄTTY
              bestProjectExample,    // ✅ LISÄTTY
              failureLesson,         // ✅ LISÄTTY
            },
          },
        },
        ai_data: {
          html: {
            content: coverLetterContent, // ✅ KORJATTU
          },
          styles: {
            main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
          },
          
          ground_truth: groundTruth,
          
          guardian_check: {
            approved: guardianCheck.riskLevel !== 'danger',
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString(),
            mode: 'ats_warning_only'
          },
          
          ats_optimization: {
            report: atsReport,
            generated_at: new Date().toISOString(),
            job_analysis: coverLetterData.jobAnalysis,
            key_points: coverLetterData.keyPoints,
          },
          generation_params: {
            style: style || 'formal',
            language: language || 'finnish',
            answered_questions: answeredQuestions || {},
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log(`✅ Cover letter saved: ${savedLetter.id}`);

    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: coverLetterData.title || "Työhakemus",
      ats_score: atsReport.keyword_match_score,
      guardianWarnings: guardianCheck.riskLevel === 'warning' ? guardianCheck.violations : null,
    });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}