// app/api/generate-cover-letter/route.ts - V1 TÄYSI VERSIO

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate";
import { getTierFeatures } from "@/lib/stripe/subscriptions";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import crypto from 'crypto';

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Työhakemus";
  const firstLine = jobDescription.split('\n')[0].trim();
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Työhakemus";
  }
  return firstLine.substring(0, 80).trim();
}

function generateQuestionId(questionText: string): string {
  return crypto
    .createHash('sha256')
    .update(questionText.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

async function saveUserResponse(
  userId: string,
  questionText: string,
  answer: string,
  context: string,
  jobTitle: string
): Promise<boolean> {
  try {
    const questionId = generateQuestionId(questionText);
    
    const { error } = await supabaseAdmin
      .from('user_responses')
      .upsert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        answer: answer,
        answer_length: answer.length,
        question_category: 'cover_letter',
        asked_in_context: context,
        job_title_context: jobTitle,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      });

    if (error) {
      console.error('Failed to save response:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in saveUserResponse:', error);
    return false;
  }
}

export async function POST(req: Request) {
  // 0️⃣ AUTH
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json();

  // 1️⃣ BACKEND LUKITSEE ACTIONIN
  const action: TokenAction = body.enableRAG === true
    ? "cover_letter_rag"
    : "cover_letter_v1";

  // 2️⃣ HAE SUBSCRIPTION
  const { data: subscription } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type, tokens, status, is_active")
    .eq("user_id", userId)
    .maybeSingle();

  // ---------------- FREE ----------------
  if (!subscription || subscription.plan_type === "free") {
    const { data: usage } = await supabaseAdmin
      .from("free_usage")
      .select("used_free_cover_letter")
      .eq("user_id", userId)
      .maybeSingle();

    if (usage?.used_free_cover_letter) {
      return NextResponse.json(
        { error: "FREE_COVER_LETTER_ALREADY_USED" },
        { status: 403 }
      );
    }

    await supabaseAdmin.from("free_usage").upsert({
      user_id: userId,
      used_free_cover_letter: true,
    });
  }

  // ---------------- PAID ----------------
  let tier: "free" | "basic" | "semi-pro" | "pro" = "free";
  let required = 0;
  let isActive = false;

  if (subscription && subscription.plan_type !== "free") {
    tier = subscription.plan_type as any;
    isActive = subscription.is_active === true &&
      ["active", "trialing"].includes(subscription.status || "");

    required = ACTION_COSTS[tier]?.[action] ?? 0;

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
  }

  console.log(`✅ Token check passed: ${tier} tier, ${required} tokens required`);

  // 3️⃣ PARSE REQUEST
  const {
    profileData,
    jobDescription: jobDesc,
    personalNotes: notes,
    language,
    style,
    answeredQuestions,
    skipQuestions,
    name,
    email,
    phone,
    jobTitle,
    education,
    workExperience,
    skills,
  } = body;

  const finalJobDescription = body.jobDescription || jobDesc;
  const finalPersonalNotes = body.personalNotes || notes;

  if (!finalJobDescription) {
    return NextResponse.json(
      { error: "Job description is required" },
      { status: 400 }
    );
  }

  const extractedJobTitle = extractJobTitleFromDescription(finalJobDescription);
  const shouldSkipQuestions = skipQuestions === true || 
    (answeredQuestions && Object.keys(answeredQuestions).length > 0);

  console.log(`📝 V1 Generate request:`, {
    userId,
    tier,
    action,
    hasAnsweredQuestions: !!answeredQuestions,
    answersCount: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
    skipQuestions: shouldSkipQuestions
  });

  // 4️⃣ TIER FEATURES
  const tierFeatures = await getTierFeatures(tier);

  if (!tierFeatures.canUseV1) {
    return NextResponse.json(
      { error: "SUBSCRIPTION_REQUIRED", message: "V1 Generator ei käytettävissä" },
      { status: 403 }
    );
  }

  console.log(`🎫 User tier: ${tierFeatures.name}`);
  console.log(`   - V1: ${tierFeatures.canUseV1 ? '✅' : '❌'}`);
  console.log(`   - RAG: ${tierFeatures.canUseRAG ? '✅' : '❌'}`);

  // 5️⃣ GROUND TRUTH
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  const groundTruth = await extractGroundTruthAI(userProfile || {});
  console.log(`🛡️ Ground Truth extracted`);

  // 6️⃣ MERGE VASTAUKSET
  let enhancedPersonalNotes = finalPersonalNotes || '';
  
  if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
    console.log(`📝 Integrating ${Object.keys(answeredQuestions).length} answers`);
    
    const answersText = Object.entries(answeredQuestions)
      .map(([questionId, answer]) => `Q: ${questionId}\nA: ${answer}`)
      .join('\n\n');
    
    enhancedPersonalNotes = finalPersonalNotes 
      ? `${finalPersonalNotes}\n\n--- VASTAUKSET KYSYMYKSIIN ---\n${answersText}`
      : `VASTAUKSET KYSYMYKSIIN:\n${answersText}`;
  }

  // 7️⃣ PREPARE INPUT
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
      
      enableRAG: tierFeatures.canUseRAG,
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
      groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth),
      skipQuestions: shouldSkipQuestions
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
      
      enableRAG: tierFeatures.canUseRAG,
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
      groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth),
      skipQuestions: shouldSkipQuestions
    };
  }

  // 8️⃣ GENEROI V1
  console.log(`📝 Generating V1 cover letter...`);
  const coverLetterData = await generateCoverLetterV1(coverLetterInput);

  // 9️⃣ JOS KYSYMYKSIÄ
  if (!coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
    console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
    
    return NextResponse.json({
      success: true,
      needsMoreInfo: true,
      questions: coverLetterData.questions,
      title: coverLetterData.title,
      reason: 'AI tarvitsee vahvistusta varmistaakseen totuudenmukaisuuden'
    });
  }

  if (coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
    console.warn(`⚠️ AI kysyi kysymyksiä vaikka skipQuestions=true`);
  }

  // 🔟 MASTER GUARDIAN
  console.log('🛡️ Running Master Guardian...');
  
  if (!coverLetterData.content) {
    throw new Error('Cover letter content is undefined');
  }
  
  const guardianCheck = await masterConsistencyCheckAI(
    coverLetterData.content,
    groundTruth,
    'generation'
  );

 if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
  return NextResponse.json({ error: 'FABRICATION_DETECTED' }, { status: 400 });
}

// Logita varoitukset mutta hyväksy
if (guardianCheck.riskLevel === 'warning') {
  console.warn('⚠️ Warning:', guardianCheck.recommendation);
}

  console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);

  // 1️⃣1️⃣ TALLENNA VASTAUKSET
  if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
    console.log(`💾 Saving ${Object.keys(answeredQuestions).length} answers...`);
    
    const savePromises = Object.entries(answeredQuestions).map(([question_text, answer]) =>
      saveUserResponse(userId, question_text, answer as string, 'cover_letter_v1', extractedJobTitle)
    );

    const results = await Promise.allSettled(savePromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    console.log(`✅ Saved ${successCount}/${Object.keys(answeredQuestions).length} answers`);
  }

  // 1️⃣2️⃣ TALLENNA COVER LETTER
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
        
        tier: tierFeatures.name,
        cost_per_letter: required,
        
        ground_truth: groundTruth,
        
        guardian_check: {
          approved: guardianCheck.approved,
          riskLevel: guardianCheck.riskLevel,
          violations: guardianCheck.violations,
          timestamp: new Date().toISOString()
        },
        
        rag_enabled: tierFeatures.canUseRAG,
        
        personality_analysis: {
          job_match_score: coverLetterData.job_match_score || 7,
          personality_hooks: coverLetterData.personality_hooks || [],
          key_differentiators: coverLetterData.key_differentiators || [],
          data_quality: coverLetterData.data_quality || null,
        },
        
        generation_params: {
          style: coverLetterInput.style,
          language: coverLetterInput.language,
          tier: tierFeatures.name,
          answered_questions: answeredQuestions || {},
          questions_count: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
          skip_questions: coverLetterInput.skipQuestions,
          generator_version: 'v1'
        }
      },
    })
    .select()
    .single();

  if (insertError || !coverLetter?.id) {
    console.error('❌ Insert error:', insertError);
    throw new Error('Failed to save cover letter');
  }

  console.log(`✅ Cover letter saved: ${coverLetter.id}`);

  // 1️⃣3️⃣ KULUTA TOKENIT (VASTA ONNISTUMISEN JÄLKEEN)
  if (tier !== 'free' && isActive && required > 0) {
    console.log(`💰 Consuming ${required} tokens...`);
    
    await supabaseAdmin
      .from('subscriptions')
      .update({ 
        tokens: subscription!.tokens - required,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    console.log(`✅ Tokens consumed. Remaining: ${subscription!.tokens - required}`);
  }

  // 1️⃣4️⃣ SUCCESS
  return NextResponse.json({
    success: true,
    coverLetterId: coverLetter.id,
    title: extractedJobTitle,
    tier: tierFeatures.name,
    tokensUsed: required,
    tokensRemaining: tier !== 'free' ? subscription!.tokens - required : 0,
    features: {
      v1: tierFeatures.canUseV1,
      v2: tierFeatures.canUseV2,
      rag: tierFeatures.canUseRAG,
      ats: tierFeatures.canUseATS
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
}