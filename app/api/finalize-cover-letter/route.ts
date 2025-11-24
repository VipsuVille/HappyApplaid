// app/api/finalize-cover-letter/route.ts - KORJATTU

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter, generateATSReport } from "@/lib/langchain/coverLetterGeneratorV2";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      answers,
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
    } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (!answers || Object.keys(answers).length === 0) {
      return NextResponse.json(
        { error: "Answers required" },
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

    // ✅ YHDISTÄ VASTAUKSET personalNotes:iin
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => `${questionId}: ${answer}`)
      .join('\n\n');
    
    const enhancedPersonalNotes = personalNotes 
      ? `${personalNotes}\n\nLISÄTIEDOT KYSYMYKSISTÄ:\n${answersText}`
      : `LISÄTIEDOT KYSYMYKSISTÄ:\n${answersText}`;

    // ✅ LUO HAKUKIRJE
    console.log(`📝 Finalizing cover letter with ${Object.keys(answers).length} answers...`);
    
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
      personalNotes: enhancedPersonalNotes,
    });

    const atsReport = generateATSReport({ atsData: coverLetterData.atsData });

    // ✅ TALLENNA
    const { data: savedLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: coverLetterData.title || "Työhakemus",
        language: language || "finnish",
        content: {
          job_description: jobDescription,
          body: coverLetterData.content,
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
            },
          },
          user_answers: answers,
          enhanced_notes: enhancedPersonalNotes,
        },
        ai_data: {
          html: {
            content: coverLetterData.content,
          },
          styles: {
            main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
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
            answered_questions: answers,
            questions_count: Object.keys(answers).length,
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log(`✅ Finalized cover letter saved: ${savedLetter.id}`);

    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: coverLetterData.title || "Työhakemus",
      personality_insights: {
        questions_answered: Object.keys(answers).length,
      },
    });
  } catch (error) {
    console.error("Error finalizing cover letter:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}