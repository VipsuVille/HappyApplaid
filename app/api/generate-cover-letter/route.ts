// app/api/generate-cover-letter/route.ts - CLEAN UNIFIED VERSION

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { generateGeneralCoverLetter } from "@/lib/langchain/generalCoverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";
import crypto from 'crypto';

export const maxDuration = 60;

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function generateQuestionId(questionText: string): string {
  return crypto.createHash('sha256').update(questionText.toLowerCase().trim()).digest('hex').substring(0, 16);
}

async function saveViolationResponse(
  userId: string,
  violationType: string,
  originalContent: string,
  userDecision: 'approved' | 'rejected' | 'corrected',
  correctedContent?: string
): Promise<boolean> {
  try {
    const questionText = `AI ehdotti: "${originalContent}" (${violationType})`;
    const questionId = generateQuestionId(questionText);
    const answer = userDecision === 'approved' 
      ? `Hyväksytty: ${originalContent}` 
      : (userDecision === 'rejected' ? `Hylätty` : (correctedContent || originalContent));

    await supabaseAdmin.from('user_responses').upsert({
      user_id: userId,
      question_id: questionId,
      question_text: questionText,
      answer,
      question_category: 'cover_letter',
      asked_in_context: 'cl_validation',
      metadata: { 
        violation_type: violationType, 
        user_decision: userDecision, 
        original_content: originalContent 
      }
    }, { onConflict: 'user_id,question_id' });
    
    return true;
  } catch (error) {
    console.error('❌ Error in saveViolationResponse:', error);
    return false;
  }
}

async function updateProfileWithApprovedItems(
  userId: string,
  approvedItems: Array<{ type: string; content: string }>
): Promise<void> {
  try {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!profile) return;

    const updates: any = {};
    approvedItems.forEach(item => {
      if (item.type === 'skill') {
        const existing = profile.skills || '';
        if (!existing.includes(item.content)) {
          updates.skills = existing ? `${existing}, ${item.content}` : item.content;
        }
      } else if (item.type === 'education') {
        updates.education = profile.education 
          ? `${profile.education}\n\n${item.content}` 
          : item.content;
      } else if (item.type === 'experience') {
        updates.work_experience = profile.work_experience 
          ? `${profile.work_experience}\n\n${item.content}` 
          : item.content;
      }
    });

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId);
      
      console.log(`✅ Profile updated with ${Object.keys(updates).length} learned fields`);
    }
  } catch (error) { 
    console.error('❌ Error updating profile:', error); 
  }
}

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Hakukirje";
  return jobDescription.split('\n')[0].substring(0, 80).trim() || "Hakukirje";
}

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  console.log(`🚀 [UNIFIED-ROUTE] POST Request started`);
  
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      profileData,
      jobDescription,
      personalNotes,
      language = "finnish",
      style = "formal",
      letterType, // 'job_specific' | 'general'
      letterVersion, // 'v1' | 'v2'
      targetIndustry,
      targetRole,
      skipQuestions = false,
      confirmedViolations,
      skipValidation = false
    } = body;

    // ════════════════════════════════════════════════════════════════
    // 1. TOKENS & SUBSCRIPTION
    // ════════════════════════════════════════════════════════════════

    let action: TokenAction = letterType === 'general' 
      ? 'cover_letter_general' 
      : (letterVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1');
    
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    const tier = (sub?.plan_type || 'free') as 'free' | 'basic' | 'premium';
    const required = ACTION_COSTS[tier]?.[action] || 0;

    console.log(`💳 Tier: ${tier}, Action: ${action}, Cost: ${required}`);

    // Free tier check
    if (tier === 'free') {
      const freeStatus = await checkFreeUsage(userId, 'cover_letter');
      if (!freeStatus.canUse) {
        return NextResponse.json({ 
          error: freeStatus.reason 
        }, { status: 403 });
      }
    } else if (sub?.tokens < required) {
      return NextResponse.json({ 
        error: 'NOT_ENOUGH_TOKENS', 
        required 
      }, { status: 403 });
    }

    // ════════════════════════════════════════════════════════════════
    // 2. HANDLE CONFIRMATIONS (Learning)
    // ════════════════════════════════════════════════════════════════

    if (confirmedViolations?.length) {
      console.log(`🧠 Learning from ${confirmedViolations.length} confirmed items`);
      
      for (const v of confirmedViolations) {
        await saveViolationResponse(
          userId, 
          v.type, 
          v.content, 
          v.decision, 
          v.correctedContent
        );
      }
      
      const approved = confirmedViolations
        .filter((v: any) => v.decision === 'approved' || v.decision === 'corrected')
        .map((v: any) => ({ 
          type: v.type, 
          content: v.decision === 'corrected' ? v.correctedContent : v.content 
        }));
      
      if (approved.length) {
        await updateProfileWithApprovedItems(userId, approved);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. FETCH PROFILE & GROUND TRUTH
    // ════════════════════════════════════════════════════════════════

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);

    const input = {
      ...body,
      userId,
      name: profileData?.name || userProfile?.name || "Hakija",
      email: profileData?.email || userProfile?.email,
      phone: profileData?.phone || userProfile?.phone,
      education: profileData 
        ? convertProfileToApiFormat(profileData).education 
        : userProfile?.education,
      workExperience: profileData 
        ? convertProfileToApiFormat(profileData).workExperience 
        : userProfile?.work_experience,
      skills: profileData?.skills || userProfile?.skills,
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
    };

    // ════════════════════════════════════════════════════════════════
    // 4. GENERATE COVER LETTER
    // ════════════════════════════════════════════════════════════════

    console.log(`📝 Generating ${letterType} ${letterVersion || 'v1'}...`);

    let result: any;
    
    if (letterType === 'general') {
      result = await generateGeneralCoverLetter(input);
    } else {
      result = letterVersion === 'v2' 
        ? await generateCoherentCoverLetter(input) 
        : await generateCoverLetterV1(input);
    }

    // Return questions if needed
    if (result.questions?.length && !skipQuestions) {
      return NextResponse.json({ 
        success: true, 
        needsMoreInfo: true, 
        questions: result.questions 
      });
    }

    const finalContent = result.content || result.fullText;

    // ════════════════════════════════════════════════════════════════
    // 5. MASTER GUARDIAN (Only if not already confirmed)
    // ════════════════════════════════════════════════════════════════

    const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;
    
    if (shouldRunGuardian) {
      console.log('🛡️ Running Master Guardian...');
      
      const guardianCheck = await masterGuardianValidatorV2(
        finalContent, 
        groundTruth, 
        'generation'
      );

      if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
        return NextResponse.json({
          success: false,
          needsConfirmation: true,
          violations: guardianCheck.violations,
          recommendation: guardianCheck.recommendation,
          message: 'Hakukirjeessä on tietoja, joita ei löydy profiilistasi.'
        }, { status: 400 });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 6. ATS ANALYSIS (V2 only)
    // ════════════════════════════════════════════════════════════════

    let atsAnalysis = null;
    
    if (letterVersion === 'v2' && jobDescription) {
      try {
        atsAnalysis = await analyzeRealisticATSUniversal(
          jobDescription, 
          finalContent
        );
        console.log(`📊 ATS Score: ${atsAnalysis.score}%`);
      } catch (error) {
        console.error('⚠️ ATS analysis failed:', error);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 7. SAVE COVER LETTER
    // ════════════════════════════════════════════════════════════════

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: letterType === 'general' 
          ? `${input.name} - Yleinen` 
          : extractJobTitleFromDescription(jobDescription),
        language,
        content: { 
          body: finalContent, 
          signature: result.signature || "" 
        },
        ai_data: { 
          tier, 
          letter_type: letterType, 
          ats_analysis: atsAnalysis, 
          generator_version: letterVersion 
        }
      })
      .select()
      .single();

    if (saveErr) throw saveErr;

    console.log(`✅ Cover letter saved: ${saved.id}`);

    // ════════════════════════════════════════════════════════════════
    // 8. CONSUME TOKENS
    // ════════════════════════════════════════════════════════════════

    if (tier === 'free') {
      await consumeFreeUsage(userId, 'cover_letter');
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .update({ tokens: sub.tokens - required })
        .eq('user_id', userId);
    }

    return NextResponse.json({ 
      success: true, 
      coverLetterId: saved.id, 
      atsResults: atsAnalysis 
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ 
      error: error.message || "INTERNAL_ERROR" 
    }, { status: 500 });
  }
}