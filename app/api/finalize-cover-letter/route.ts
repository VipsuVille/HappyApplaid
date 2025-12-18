// app/api/finalize-cover-letter/route.ts - YKSINKERTAISTETTU

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter, generateATSReport } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { ACTION_COSTS, type TokenAction } from '@/lib/domain/tokens';

export async function POST(req: Request) {
  // 0️⃣ AUTH
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

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
    careerGoals,
    bestProjectExample,
    failureLesson,
  } = body;

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

  // 1️⃣ SUBSCRIPTION
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type, tokens, status, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  // ---------------- FREE ----------------
  if (!subscription || subscription.plan_type === "free") {
    return NextResponse.json(
      { 
        error: "UPGRADE_REQUIRED",
        message: "Finalize vaatii maksullisen tilin"
      },
      { status: 403 }
    );
  }

  // ---------------- PAID ----------------
  const tier = subscription.plan_type as "free" | "basic" | "semi-pro" | "pro";
  const isActive = subscription.is_active === true &&
    ["active", "trialing"].includes(subscription.status || "");

  // 2️⃣ PÄÄTÄ KÄYTETÄÄNKÖ V1 vai V2
  // BASIC = V1 (cover_letter_v1 = 50 tok)
  // SEMI-PRO+ = V2 (cover_letter_v2 = 75 tok)
  const useV2 = tier === 'semi-pro' || tier === 'pro';
  const action: TokenAction = useV2 ? 'cover_letter_v2' : 'cover_letter_v1';

  const required = ACTION_COSTS[tier]?.[action] ?? 0;

  if (required === undefined) {
    return NextResponse.json(
      { error: "ACTION_NOT_ALLOWED", tier, action },
      { status: 403 }
    );
  }

  if (isActive && subscription.tokens < required) {
    return NextResponse.json(
      { error: "NOT_ENOUGH_TOKENS", required },
      { status: 403 }
    );
  }

  console.log(`✅ Token check passed: ${tier} tier, ${required} tokens, using ${useV2 ? 'V2' : 'V1'}`);

  // 3️⃣ YHDISTÄ VASTAUKSET
  const answersText = Object.entries(answers)
    .map(([questionId, answer]) => `Q: ${questionId}\nA: ${answer}`)
    .join('\n\n');
  
  const enhancedPersonalNotes = personalNotes 
    ? `${personalNotes}\n\n--- VASTAUKSET KYSYMYKSIIN ---\n${answersText}`
    : `VASTAUKSET KYSYMYKSIIN:\n${answersText}`;

  // 4️⃣ GENEROI (V1 tai V2)
  console.log(`📝 Finalizing with ${Object.keys(answers).length} answers using ${useV2 ? 'V2' : 'V1'}...`);

  let coverLetterData: any;
  let atsReport: any = null;

  if (useV2) {
    // SEMI-PRO / PRO: V2 + ATS
    coverLetterData = await generateCoherentCoverLetter({
      jobDescription,
      personalNotes: enhancedPersonalNotes,
      name,
      email,
      phone,
      age,
      education,
      workExperience,
      skills,
      language: language || "finnish",
      style: style || "formal",
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      valuesExample,
      superpower,
      careerGoals,
      bestProjectExample,
      failureLesson,
    });

    atsReport = generateATSReport({ atsData: coverLetterData.atsData });
  } else {
    // BASIC: V1 (ei ATS)
    coverLetterData = await generateCoverLetterV1({
      jobDescription,
      personalNotes: enhancedPersonalNotes,
      name,
      email,
      phone,
      education,
      workExperience,
      skills,
      language: language || "finnish",
      style: style || "formal",
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      valuesExample,
      superpower,
      careerGoals,
      bestProjectExample,
      failureLesson,
      skipQuestions: true, // Finalize = kysymykset jo vastattu
    });
  }

  if (!coverLetterData.content || coverLetterData.content.trim().length === 0) {
    console.error('❌ No content generated');
    return NextResponse.json({
      error: 'GENERATION_FAILED',
      message: 'AI ei generoinut sisältöä'
    }, { status: 500 });
  }

  // 5️⃣ TALLENNA
  const { data: savedLetter, error: insertError } = await supabaseAdmin
    .from("cover_letters")
    .insert({
      user_id: userId,
      title: coverLetterData.title || jobTitle || "Työhakemus",
      language: language || "finnish",
      content: {
        job_description: jobDescription,
        cover_letter_content: coverLetterData.content,
        signature: coverLetterData.signature,
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
          personalityTraits: {
            workingStyle,
            problemSolving,
            energySources,
            uniqueStrength,
            learningStyle,
            teamRole,
            valuesExample,
            superpower,
            careerGoals,
            bestProjectExample,
            failureLesson,
          },
        },
        user_answers: answers,
        enhanced_notes: enhancedPersonalNotes,
      },
      ai_data: {
        html: { content: coverLetterData.content },
        styles: {
          main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
        },
        
        tier: tier,
        cost_per_letter: required,
        
        ...(useV2 && atsReport && {
          ats_optimization: {
            report: atsReport,
            generated_at: new Date().toISOString(),
            job_analysis: coverLetterData.jobAnalysis,
            key_points: coverLetterData.keyPoints,
          },
        }),
        
        personality_analysis: {
          job_match_score: coverLetterData.job_match_score || 7,
          personality_hooks: coverLetterData.personality_hooks || [],
          key_differentiators: coverLetterData.key_differentiators || [],
          key_points: coverLetterData.keyPoints || null,
        },
        
        generation_params: {
          style: style || 'formal',
          language: language || 'finnish',
          tier: tier,
          answered_questions: answers,
          questions_count: Object.keys(answers).length,
          skip_questions: true,
          generator_version: useV2 ? 'v2-finalized' : 'v1-finalized'
        }
      },
    })
    .select()
    .single();

  if (insertError || !savedLetter?.id) {
    console.error("❌ Insert error:", insertError);
    throw new Error('Failed to save cover letter');
  }

  console.log(`✅ Finalized cover letter saved: ${savedLetter.id}`);

  // 6️⃣ KULUTA TOKENIT (VASTA ONNISTUMISEN JÄLKEEN)
  if (isActive && required > 0) {
    console.log(`💰 Consuming ${required} tokens...`);
    
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        tokens: subscription.tokens - required,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    console.log(`✅ Tokens consumed. Remaining: ${subscription.tokens - required}`);
  }

  // 7️⃣ SUCCESS
  return NextResponse.json({
    success: true,
    coverLetterId: savedLetter.id,
    title: coverLetterData.title || jobTitle || "Työhakemus",
    tier: tier,
    tokensUsed: required,
    tokensRemaining: subscription.tokens - required,
    generatorUsed: useV2 ? 'v2' : 'v1',
    hasATS: useV2,
    personality_insights: {
      questions_answered: Object.keys(answers).length,
      key_points: coverLetterData.keyPoints,
    },
  });
}