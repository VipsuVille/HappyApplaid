// app/api/generate-cover-letter/route.ts - UNIFIED REITTI

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { generateGeneralCoverLetter } from "@/lib/langchain/generalCoverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { PRICING } from "@/lib/pricing";
import { detectATSUsageAI, analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import crypto from 'crypto';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Hakukirje";
  const firstLine = jobDescription.split('\n')[0].trim();
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Hakukirje";
  }
  return firstLine.substring(0, 80).trim();
}

function generateTitle(input: { name: string; targetRole?: string; targetIndustry?: string }): string {
  if (input.targetRole) return `${input.name} - ${input.targetRole} Esittely`;
  if (input.targetIndustry) return `${input.name} - ${input.targetIndustry} Ammattilainen`;
  return `${input.name} - Ammatillinen Esittely`;
}

function generateQuestionId(questionText: string): string {
  return crypto.createHash('sha256').update(questionText.toLowerCase().trim()).digest('hex').substring(0, 16);
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
    const { error } = await supabaseAdmin.from('user_responses').upsert({
      user_id: userId,
      question_id: questionId,
      question_text: questionText,
      answer: answer,
      answer_length: answer.length,
      question_category: 'cover_letter',
      asked_in_context: context,
      job_title_context: jobTitle,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,question_id' });

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

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    console.error('❌ No userId from auth()');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`✅ Auth OK: ${userId}`);

  try {
    const requestData = await req.json();
    
    const {
      profileData,
      jobDescription,
      personalNotes,
      language,
      style,
      letterType,      // ✅ UUSI: 'job_specific' | 'general'
      letterVersion,   // ✅ UUSI: 'v1' | 'v2' (vain job_specific)
      targetIndustry,  // ✅ Vain general
      targetRole,      // ✅ Vain general
      answeredQuestions, // ✅ ARRAY!
      skipQuestions,
    } = requestData;

    // ✅ 1. MÄÄRITÄ ACTION OIKEIN
    let action: TokenAction;
    
    if (letterType === 'general') {
      action = 'cover_letter_general';
    } else {
      // job_specific
      if (letterVersion === 'v2') {
        action = 'cover_letter_v2';
      } else {
        action = 'cover_letter_v1';
      }
    }

    console.log(`📝 Cover Letter Request:`, {
      userId,
      letterType,
      letterVersion: letterType === 'job_specific' ? letterVersion : 'N/A',
      action,
      hasJobDescription: !!jobDescription
    });

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

    const tier = subscription.plan_type as 'free' | 'basic' | 'premium';
    const isActive = subscription.is_active === true && 
                     ['active', 'trialing'].includes(subscription.status || '');

    // ✅ 3. FREE TIER CHECK
    if (tier === 'free') {
      console.log('🆓 Free tier user - checking usage...');
      const freeStatus = await checkFreeUsage(userId, 'cover_letter');
      
      if (!freeStatus.canUse) {
        console.error(`❌ Free cover letter not available: ${freeStatus.reason}`);
        return NextResponse.json({
          error: freeStatus.reason,
          message: 'Ilmainen hakukirje on jo käytetty',
          hasUsedCV: freeStatus.hasUsedCV,
          hasUsedCoverLetter: freeStatus.hasUsedCoverLetter,
        }, { status: 403 });
      }
    }

    // ✅ 4. TOKEN VALIDATION
    const required = ACTION_COSTS[tier]?.[action];

    if (required === undefined) {
      return NextResponse.json({
        error: 'ACTION_NOT_ALLOWED',
        message: `${action} vaatii korkeamman tason`,
        currentTier: tier
      }, { status: 403 });
    }

    if (tier !== 'free' && isActive && subscription.tokens < required) {
      return NextResponse.json({
        error: 'NOT_ENOUGH_TOKENS',
        message: `Tarvitaan ${required} tokenia`,
        tokensRequired: required,
        tokensAvailable: subscription.tokens
      }, { status: 403 });
    }

    console.log(`✅ Token check passed: ${tier} tier, ${required} tokens`);

    // ✅ 5. PREPARE INPUT
    const tierFeatures = PRICING[tier].featureFlags;

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);
    console.log(`🛡️ Ground Truth extracted`);

    // ✅ 6. ROUTE BASED ON letterType
    let coverLetterData: any;
    let extractedTitle: string;
    let guardianCheck: any;
    let atsAnalysis: any = null;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // A) GENERAL LETTER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (letterType === 'general') {
      console.log('📝 Generating GENERAL cover letter...');

      const generalInput = profileData ? {
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        jobTitle: profileData.jobTitle,
        education: convertProfileToApiFormat(profileData).education,
        workExperience: convertProfileToApiFormat(profileData).workExperience,
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
        userId: userId,
        skipQuestions: skipQuestions || false,
      } : {
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone,
        jobTitle: requestData.jobTitle,
        education: requestData.education,
        workExperience: requestData.workExperience,
        skills: requestData.skills,
        language: language || "finnish",
        style: style || "formal",
        targetIndustry: targetIndustry || undefined,
        targetRole: targetRole || undefined,
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        userId: userId,
        skipQuestions: skipQuestions || false,
      };

      coverLetterData = await generateGeneralCoverLetter(generalInput);

      // Jos kysymyksiä
      if (coverLetterData.questions && coverLetterData.questions.length > 0 && !skipQuestions) {
        console.log(`❓ General needs clarification: ${coverLetterData.questions.length} questions`);
        return NextResponse.json({
          success: true,
          needsMoreInfo: true,
          questions: coverLetterData.questions,
          title: coverLetterData.title,
          reason: 'AI tarvitsee lisätietoja'
        });
      }

      // Guardian check
      guardianCheck = await masterConsistencyCheckAI(
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
        }, { status: 400 });
      }

      // Tallenna vastaukset
      if (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0) {
        console.log(`💾 Saving ${answeredQuestions.length} answers...`);
        extractedTitle = generateTitle({
          name: generalInput.name,
          targetRole,
          targetIndustry
        });
        
        const savePromises = answeredQuestions.map((item: any) => 
          saveUserResponse(userId, item.question, item.answer, 'cover_letter_general', extractedTitle)
        );
        
        await Promise.allSettled(savePromises);
      }

      extractedTitle = generateTitle({
        name: generalInput.name,
        targetRole,
        targetIndustry
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // B) JOB-SPECIFIC LETTER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    else {
      if (!jobDescription) {
        return NextResponse.json({ error: "Job description required" }, { status: 400 });
      }

      console.log(`📝 Generating ${letterVersion === 'v2' ? 'V2 ATS' : 'V1'} cover letter...`);

      const jobInput = profileData ? {
        jobDescription,
        personalNotes,
        language: language || "finnish",
        style: style || "formal",
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        education: convertProfileToApiFormat(profileData).education,
        workExperience: convertProfileToApiFormat(profileData).workExperience,
        skills: profileData.skills,
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
        userId: userId,
        skipQuestions: skipQuestions || false,
        answeredQuestions: answeredQuestions || [],
      } : {
        jobDescription,
        personalNotes,
        language: language || "finnish",
        style: style || "formal",
        name: requestData.name,
        email: requestData.email,
        phone: requestData.phone,
        education: requestData.education,
        workExperience: requestData.workExperience,
        skills: requestData.skills,
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        userId: userId,
        skipQuestions: skipQuestions || false,
        answeredQuestions: answeredQuestions || [],
      };

      // Generate
      if (letterVersion === 'v2') {
        coverLetterData = await generateCoherentCoverLetter(jobInput);
      } else {
        coverLetterData = await generateCoverLetterV1(jobInput);
      }

      // Jos kysymyksiä
      if (coverLetterData.questions && coverLetterData.questions.length > 0 && !skipQuestions) {
        console.log(`❓ ${letterVersion} needs clarification: ${coverLetterData.questions.length} questions`);
        return NextResponse.json({
          success: true,
          needsMoreInfo: true,
          questions: coverLetterData.questions,
          title: coverLetterData.title,
        });
      }

      // Guardian
      guardianCheck = await masterConsistencyCheckAI(
        coverLetterData.content || coverLetterData.fullText,
        groundTruth,
        'generation'
      );

      if (guardianCheck.riskLevel === 'danger') {
        console.error('🚨 GUARDIAN REJECTED');
        return NextResponse.json({
          error: 'CONSISTENCY_VIOLATION',
          violations: guardianCheck.violations,
        }, { status: 400 });
      }

      // ATS Analysis (V2 only)
      if (letterVersion === 'v2') {
        const atsDetection = await detectATSUsageAI(jobDescription);
        if (atsDetection.usesATS) {
          console.log('📊 Running ATS analysis...');
          atsAnalysis = await analyzeRealisticATSUniversal(
            coverLetterData.content || coverLetterData.fullText,
            jobDescription
          );
        }
      }

      // Tallenna vastaukset
      if (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0) {
        extractedTitle = extractJobTitleFromDescription(jobDescription);
        const savePromises = answeredQuestions.map((item: any) =>
          saveUserResponse(userId, item.question, item.answer, `cover_letter_${letterVersion}`, extractedTitle)
        );
        await Promise.allSettled(savePromises);
      }

      extractedTitle = extractJobTitleFromDescription(jobDescription);
    }

    // ✅ 7. SAVE TO DB
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedTitle,
        language: language || 'finnish',
        content: {
          job_description: jobDescription || null,
          cover_letter_content: coverLetterData.content || coverLetterData.fullText,
          signature: coverLetterData.signature,
          body: coverLetterData.content || coverLetterData.fullText,
          applicant_info: profileData ? {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
            ...(profileData.personalityTraits && {
              personalityTraits: profileData.personalityTraits
            })
          } : null
        },
        ai_data: {
          html: { content: coverLetterData.content || coverLetterData.fullText },
          styles: { main_style: 'font-family: "Merriweather", serif; line-height: 1.7;' },
          tier,
          cost_per_letter: required,
          ground_truth: groundTruth,
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          letter_type: letterType,
          ...(atsAnalysis && { ats_analysis: atsAnalysis }),
          generation_params: {
            style: style || 'formal',
            language: language || 'finnish',
            tier,
            generator_version: letterType === 'general' ? 'general-v1' : letterVersion
          }
        }
      })
      .select()
      .single();

    if (insertError || !coverLetter) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    console.log(`✅ Cover letter saved: ${coverLetter.id}`);

    // ✅ 8. CONSUME TOKENS
    if (tier === 'free') {
      await consumeFreeUsage(userId, 'cover_letter');
    } else if (isActive && required > 0) {
      await supabaseAdmin
        .from('subscriptions')
        .update({
          tokens: subscription.tokens - required,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);
    }

    // ✅ 9. SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedTitle,
      tier,
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
      },
      ...(atsAnalysis && {
        atsResults: {
          detected: true,
          score: atsAnalysis.score || 0,
        }
      }),
    });

  } catch (error) {
    console.error("❌ Error generating cover letter:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}