// app/api/finalize-cover-letter/route.ts - TYPESCRIPT KORJATTU v2

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter, generateATSReport } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTION_COSTS, type TokenAction } from '@/lib/domain/tokens';

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

    // Tarkista tilaus + tokenit
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (!subscription || subscription.plan_type === "free") {
      return NextResponse.json(
        { error: "UPGRADE_REQUIRED", message: "Finalize vaatii maksullisen tilin" },
        { status: 403 }
      );
    }

    // BASIC = V1 (50 tok), premium = V2 (75 tok)
    const tier = subscription.plan_type as "free" | "basic" | "premium";
    const isActive = subscription.is_active === true && 
      ["active", "trialing"].includes(subscription.status || "");

    const useV2 = tier === 'premium';
    const action: TokenAction = useV2 ? 'cover_letter_v2' : 'cover_letter_v1';
    const required = ACTION_COSTS[tier]?.[action] ?? 0;

    if (isActive && subscription.tokens < required) {
      return NextResponse.json(
        { error: "NOT_ENOUGH_TOKENS", required },
        { status: 403 }
      );
    }

    // Yhdistä vastaukset
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => `${questionId}: ${answer}`)
      .join('\n\n');
    
    const enhancedPersonalNotes = personalNotes 
      ? `${personalNotes}\n\nLISÄTIEDOT KYSYMYKSISTÄ:\n${answersText}`
      : `LISÄTIEDOT KYSYMYKSISTÄ:\n${answersText}`;

    console.log(`📝 Finalizing with ${Object.keys(answers).length} answers using ${useV2 ? 'V2' : 'V1'}...`);
    
    const input = {
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
    };

    // ✅ KORJAUS: Käytä oletusarvoja jos undefined
    let coverLetterContent: string = '';
    let coverLetterTitle: string = '';
    let atsReport: any = null;
    let jobAnalysis: any = null;
    let keyPoints: any = null;

    if (useV2) {
      const v2Data = await generateCoherentCoverLetter(input);
      coverLetterContent = v2Data.content || ''; // ✅ Fallback tyhjään
      coverLetterTitle = v2Data.title || "Työhakemus";
      jobAnalysis = v2Data.jobAnalysis;
      keyPoints = v2Data.keyPoints;
      
      if (v2Data.atsData) {
        atsReport = generateATSReport({ atsData: v2Data.atsData });
      }
    } else {
      const v1Data = await generateCoverLetterV1({ ...input, skipQuestions: true });
      coverLetterContent = v1Data.content || ''; // ✅ Fallback tyhjään
      coverLetterTitle = v1Data.title || "Työhakemus";
    }

    // ✅ Tarkista että sisältö on olemassa
    if (!coverLetterContent || coverLetterContent.trim().length === 0) {
      throw new Error('AI ei generoinut sisältöä');
    }

    // Tallenna
    const { data: savedLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: coverLetterTitle,
        language: language || "finnish",
        content: {
          job_description: jobDescription,
          body: coverLetterContent,
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
            content: coverLetterContent,
          },
          styles: {
            main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
          },
          tier: tier,
          cost_per_letter: required,
          ...(useV2 && atsReport && {
            ats_optimization: {
              report: atsReport,
              generated_at: new Date().toISOString(),
              job_analysis: jobAnalysis,
              key_points: keyPoints,
            },
          }),
          generation_params: {
            style: style || 'formal',
            language: language || 'finnish',
            answered_questions: answers,
            questions_count: Object.keys(answers).length,
            generator_version: useV2 ? 'v2-finalized' : 'v1-finalized'
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

    // Kuluta tokenit
    if (isActive && required > 0) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ 
          tokens: subscription.tokens - required,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }

    return NextResponse.json({
      success: true,
      coverLetterId: savedLetter.id,
      title: coverLetterTitle,
      tokensUsed: required,
      tokensRemaining: subscription.tokens - required,
      generatorUsed: useV2 ? 'v2' : 'v1',
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