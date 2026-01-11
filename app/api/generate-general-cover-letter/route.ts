// app/api/generate-general-cover-letter/route.ts - KORJATTU userId

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateGeneralCoverLetter } from "@/lib/langchain/generalCoverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { getTierFeatures } from "@/lib/stripe/subscriptions";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import crypto from 'crypto';
import { checkFreeUsage } from "@/lib/domain/freeUsageGuard";

function generateTitle(input: { name: string; targetRole?: string; targetIndustry?: string }): string {
  if (input.targetRole) {
    return `${input.name} - ${input.targetRole} Esittely`;
  }
  if (input.targetIndustry) {
    return `${input.name} - ${input.targetIndustry} Ammattilainen`;
  }
  return `${input.name} - Ammatillinen Esittely`;
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
  // ✅ 0. AUTH
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    console.error('❌ No userId from auth()');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`✅ Auth OK: ${userId}`);

  // ✅ 1. MÄÄRITÄ ACTION
  const action: TokenAction = 'cover_letter_general';

  // ✅ 2. HAE SUBSCRIPTION
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_type, tokens, status, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: 'SUBSCRIPTION_REQUIRED', message: 'Tilaus vaaditaan' },
      { status: 403 }
    );
  }

  // ✅ 3. TIER + TOKEN VALIDATION
const tier = subscription.plan_type as 'free' | 'basic' | 'semi-pro' | 'pro';
const isActive = subscription.is_active === true && 
                 ['active', 'trialing'].includes(subscription.status || '');

// ✅ LISÄÄ TÄHÄN:
if (tier === 'free') {
  console.log('🆓 Free tier user - checking cover letter usage...');
  
  const freeStatus = await checkFreeUsage(userId, 'cover_letter');
  
  if (!freeStatus.canUse) {
    console.error(`❌ Free cover letter not available: ${freeStatus.reason}`);
    
    const errorMessages: Record<string, string> = {
      'FREE_COVER_LETTER_ALREADY_USED': 'Olet jo käyttänyt ilmaisen hakukirjeen! Aktivoi Basic-tilaus.',
      'FREE_SLOT_USED_FOR_CV': 'Käytit ilmaisen tokenisi CV:hen. Aktivoi Basic-tilaus luodaksesi hakukirjeen.',
    };

    return NextResponse.json(
      { 
        error: freeStatus.reason,
        message: errorMessages[freeStatus.reason || ''] || 'Ilmainen käyttö on loppu',
        hasUsedCV: freeStatus.hasUsedCV,
        hasUsedCoverLetter: freeStatus.hasUsedCoverLetter,
      },
      { status: 403 }
    );
  }

  console.log('✅ Free cover letter available');
}
  const required = ACTION_COSTS[tier]?.[action];

  if (required === undefined) {
    return NextResponse.json(
      {
        error: 'ACTION_NOT_ALLOWED',
        message: 'Yleinen esittelykirje vaatii Basic tai korkeamman tason',
        currentTier: tier,
        requiredTier: 'basic'
      },
      { status: 403 }
    );
  }

  if (tier !== 'free' && isActive && subscription.tokens < required) {
    return NextResponse.json(
      {
        error: 'NOT_ENOUGH_TOKENS',
        message: `Tarvitaan ${required} tokenia, sinulla on ${subscription.tokens}`,
        tokensRequired: required,
        tokensAvailable: subscription.tokens
      },
      { status: 403 }
    );
  }

  console.log(`✅ Token check passed: ${tier} tier, ${required} tokens required`);

  // ✅ 4. PARSE REQUEST
  try {
    const requestData = await req.json();

    const {
      profileData,
      personalNotes,
      language,
      style,
      targetIndustry,
      targetRole,
      answeredQuestions,
      skipQuestions,
    } = requestData;

    const {
      name,
      email,
      phone,
      jobTitle,
      education,
      workExperience,
      skills,
    } = requestData;

    const shouldSkipQuestions = skipQuestions === true || 
      (answeredQuestions && Object.keys(answeredQuestions).length > 0);

    console.log(`📝 General cover letter request:`, {
      userId,
      tier,
      hasProfileData: !!profileData,
      targetIndustry: targetIndustry || 'Not specified',
      targetRole: targetRole || 'Not specified',
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
      skipQuestions: shouldSkipQuestions
    });

    // ✅ 5. TIER FEATURES
    const tierFeatures = await getTierFeatures(tier);

    console.log(`🎫 User tier: ${tierFeatures.name}`);
    console.log(`   - V1: ${tierFeatures.canUseV1 ? '✅' : '❌'}`);
    console.log(`   - RAG: ${tierFeatures.canUseRAG ? '✅' : '❌'}`);

    // ✅ 6. GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    console.log(`🛡️ Ground Truth extracted`);

    // ✅ 7. PREPARE INPUT
    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
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
        
        targetIndustry: targetIndustry || undefined,
        targetRole: targetRole || undefined,
        
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        userId: userId, // ✅ KRIITTINEN: Välitä userId!
        skipQuestions: shouldSkipQuestions, // ✅ LISÄÄ skipQuestions
      };
    } else {
      coverLetterInput = {
        name,
        email,
        phone,
        jobTitle,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
        
        targetIndustry: targetIndustry || undefined,
        targetRole: targetRole || undefined,
        
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        userId: userId, // ✅ KRIITTINEN: Välitä userId!
        skipQuestions: shouldSkipQuestions, // ✅ LISÄÄ skipQuestions
      };
    }

    // ✅ 8. GENEROI
    console.log(`📝 Generating general cover letter...`);
    const coverLetterData = await generateGeneralCoverLetter(coverLetterInput);

    // ✅ 8.5 JOS KYSYMYKSIÄ
    if (!coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        reason: 'AI tarvitsee lisätietoja parempaa esittelyä varten'
      });
    }

    if (coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.warn(`⚠️ AI kysyi kysymyksiä vaikka skipQuestions=true`);
    }

    // ✅ 9. TARKISTA SISÄLTÖ
    if (!coverLetterData.content || coverLetterData.content.trim().length === 0) {
      console.error('❌ No content generated');
      return NextResponse.json({
        error: 'GENERATION_FAILED',
        message: 'AI ei generoinut sisältöä'
      }, { status: 500 });
    }

    // ✅ 10. MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');

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

    // ✅ 10.5 TALLENNA VASTAUKSET
    if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
      console.log(`💾 Saving ${Object.keys(answeredQuestions).length} answers...`);
      
      const extractedTitle = generateTitle({
        name: coverLetterInput.name,
        targetRole: targetRole,
        targetIndustry: targetIndustry
      });
      
      const savePromises = Object.entries(answeredQuestions).map(([question_text, answer]) =>
        saveUserResponse(userId, question_text, answer as string, 'cover_letter_general', extractedTitle)
      );

      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Saved ${successCount}/${Object.keys(answeredQuestions).length} answers`);
    }

    // ✅ 11. TALLENNA
    const extractedTitle = generateTitle({
      name: coverLetterInput.name,
      targetRole: targetRole,
      targetIndustry: targetIndustry
    });

    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedTitle,
        language: coverLetterInput.language,
        content: {
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

          letter_type: 'general',

          key_highlights: coverLetterData.keyHighlights || null,

          generation_params: {
            style: coverLetterInput.style,
            language: coverLetterInput.language,
            tier: tierFeatures.name,
            target_industry: targetIndustry || null,
            target_role: targetRole || null,
            answered_questions: answeredQuestions || {},
            questions_count: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
            skip_questions: coverLetterInput.skipQuestions,
            generator_version: 'general-v1'
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    if (!coverLetter || !coverLetter.id) {
      console.error('❌ Cover letter ID missing after insert');
      throw new Error('Cover letter saved but ID is missing');
    }

    console.log(`✅ General cover letter saved: ${coverLetter.id}`);

    // ✅ 12. KULUTA TOKENIT
    if (tier !== 'free' && isActive && required > 0) {
      console.log(`💰 Consuming ${required} tokens...`);

      const { error: tokenError } = await supabaseAdmin
        .from('subscriptions')
        .update({
          tokens: subscription.tokens - required,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (tokenError) {
        console.error('⚠️ Token consumption failed:', tokenError);
      } else {
        console.log(`✅ Tokens consumed. Remaining: ${subscription.tokens - required}`);
      }
    }

    // ✅ 13. PALAUTA SUCCESS
    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedTitle,
      tier: tierFeatures.name,
      tokensUsed: required,
      tokensRemaining: tier !== 'free' ? subscription.tokens - required : 0,
      features: {
        v1: tierFeatures.canUseV1,
        v2: tierFeatures.canUseV2,
        rag: tierFeatures.canUseRAG,
      },
      guardianCheck: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        hasWarnings: guardianCheck.riskLevel === 'warning'
      },
      letterType: 'general',
      keyHighlights: coverLetterData.keyHighlights,
    });

  } catch (error) {
    console.error("❌ Error generating general cover letter:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}