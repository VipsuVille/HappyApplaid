import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { generateGeneralCoverLetter } from "@/lib/langchain/generalCoverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { detectATSUsageAI, analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";

const BUILD_VERSION = "2025-01-19-02-00-FIXED";

// --- HELPERS ---

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Hakukirje";
  const lines = jobDescription.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return "Hakukirje";
  return lines[0].substring(0, 80).trim();
}

function generateTitle(input: { name: string; targetRole?: string; targetIndustry?: string }): string {
  if (input.targetRole) return `${input.name} - ${input.targetRole}`;
  if (input.targetIndustry) return `${input.name} - ${input.targetIndustry}`;
  return `${input.name} - Hakukirje`;
}

// --- MAIN ROUTE ---

export async function POST(req: Request) {
  console.log(`🚀 [${BUILD_VERSION}] POST Request started`);
  
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestData = await req.json();
    const {
      profileData,
      jobDescription,
      personalNotes,
      language = "finnish",
      style = "formal",
      letterType,
      letterVersion,
      targetIndustry,
      targetRole,
      skipQuestions = false
    } = requestData;

    // 1. Määritä Action & Tier
    let action: TokenAction = letterType === 'general' ? 'cover_letter_general' : (letterVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1');

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type, tokens, status, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json({ error: 'SUBSCRIPTION_REQUIRED' }, { status: 403 });
    }

    const tier = (subscription.plan_type as 'free' | 'basic' | 'premium') || 'free';
    const isActive = subscription.is_active === true;

    // 2. Free Tier Tarkistus
    if (tier === 'free') {
      const freeStatus = await checkFreeUsage(userId, 'cover_letter');
      if (!freeStatus.canUse) {
        return NextResponse.json({ error: freeStatus.reason, message: 'Ilmainen kokeilu käytetty' }, { status: 403 });
      }
    }

    // 3. Token Tarkistus
    const required = ACTION_COSTS[tier]?.[action] || 0;
    if (tier !== 'free' && isActive && subscription.tokens < required) {
      return NextResponse.json({ error: 'NOT_ENOUGH_TOKENS', required }, { status: 403 });
    }

    // 4. Hae Profiili ja Ground Truth
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Varmistetaan että extractGroundTruthAI ei kaadu vaikka userProfile puuttuisi
    const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);

    // 5. Generointi
    let coverLetterData: any;
    let extractedTitle: string;

    const commonInput = {
      ...requestData,
      userId,
      name: profileData?.name || userProfile?.name || "Hakija",
      email: profileData?.email || userProfile?.email,
      phone: profileData?.phone || userProfile?.phone,
      education: profileData ? convertProfileToApiFormat(profileData).education : userProfile?.education,
      workExperience: profileData ? convertProfileToApiFormat(profileData).workExperience : userProfile?.workExperience,
      skills: profileData?.skills || userProfile?.skills,
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
      skipQuestions: skipQuestions
    };

    if (letterType === 'general') {
      coverLetterData = await generateGeneralCoverLetter(commonInput);
      extractedTitle = generateTitle({ name: commonInput.name, targetRole, targetIndustry });
    } else {
      if (!jobDescription) {
         return NextResponse.json({ error: "Job description missing" }, { status: 400 });
      }
      coverLetterData = letterVersion === 'v2' 
        ? await generateCoherentCoverLetter(commonInput)
        : await generateCoverLetterV1(commonInput);
      extractedTitle = extractJobTitleFromDescription(jobDescription);
    }

    // Varmista että questions on AINA array
    const safeQuestions = Array.isArray(coverLetterData?.questions) ? coverLetterData.questions : [];

    // 6. Jos AI tarvitsee lisätietoja
    if (safeQuestions.length > 0 && !skipQuestions) {
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: safeQuestions,
        title: extractedTitle
      });
    }

    // 7. Sisällön validointi
    const finalContent = coverLetterData.content || coverLetterData.fullText;
    if (!finalContent) throw new Error("AI failed to generate content");

    // 8. Guardian & ATS
    const guardianCheck = await masterGuardianValidatorV2(finalContent, groundTruth, 'generation');
    
    // Suojaus: Varmista että violations on olemassa objektina
    const safeViolations = guardianCheck.violations || { 
        fabricatedSkills: [], 
        fabricatedEducation: [], 
        fabricatedExperience: [] 
    };

    if (guardianCheck.riskLevel === 'danger') {
      return NextResponse.json({ 
        error: 'CONSISTENCY_VIOLATION', 
        violations: safeViolations 
      }, { status: 400 });
    }

    let atsAnalysis = null;
    if (letterVersion === 'v2' && jobDescription) {
      // KORJATTU JÄRJESTYS: (jobDescription, finalContent)
      atsAnalysis = await analyzeRealisticATSUniversal(jobDescription, finalContent);
    }

    // 9. Tallennus Supabaseen
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedTitle,
        language,
        content: {
          cover_letter_content: finalContent,
          signature: coverLetterData.signature || "",
          body: finalContent,
          applicant_info: { name: commonInput.name, email: commonInput.email }
        },
        ai_data: {
          tier,
          letter_type: letterType,
          guardian_check: guardianCheck,
          ats_analysis: atsAnalysis,
          generator_version: letterType === 'general' ? 'general-v1' : letterVersion
        }
      })
      .select().single();

    if (insertError) throw insertError;

    // 10. Tokenien kulutus
    if (tier === 'free') {
      await consumeFreeUsage(userId, 'cover_letter');
    } else if (isActive && required > 0) {
      await supabaseAdmin
        .from('subscriptions')
        .update({ tokens: Math.max(0, subscription.tokens - required) })
        .eq('user_id', userId);
    }

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedTitle,
      tokensUsed: required,
      atsResults: atsAnalysis ? { detected: true, score: atsAnalysis.score } : { detected: false }
    });

  } catch (error: any) {
    console.error("❌ CRITICAL ROUTE ERROR:", error);
    return NextResponse.json({
      error: error.message || "Internal Server Error",
      questions: [],
      details: error.stack || "No stack trace"
    }, { status: 500 });
  }
}