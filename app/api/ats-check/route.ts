import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkATSScore, analyzeJobOnly, type ATSCheckInput } from "@/lib/ats/atsScoreChecker";

const FREE_CHECKS_PER_DAY = 3;
const PRO_CHECKS_PER_DAY = 50;
const JOB_ONLY_FREE_PER_DAY = 10;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { jobPosting, userDocument, documentType } = body;

    if (!jobPosting || typeof jobPosting !== 'string') {
      return NextResponse.json({ error: "jobPosting is required (string)" }, { status: 400 });
    }
    if (jobPosting.length > 15000) {
      return NextResponse.json({ error: "Job posting too long (max 15000 chars)" }, { status: 400 });
    }

    const isJobOnly = documentType === 'job_only' || !userDocument;

    if (!isJobOnly) {
      if (typeof userDocument !== 'string' || userDocument.length > 15000) {
        return NextResponse.json({ error: "userDocument too long (max 15000 chars)" }, { status: 400 });
      }
    }

    const validTypes = ['cv', 'cover_letter', 'both', 'job_only'];
    const docType = validTypes.includes(documentType) ? documentType : (isJobOnly ? 'job_only' : 'cv');

    // Rate limiting
    const today = new Date().toISOString().split('T')[0];

    const { data: subscription } = await supabaseAdmin
      .from('subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    const isPro = subscription?.plan_type === 'pro' || subscription?.plan_type === 'premium';
    const maxChecks = isJobOnly
      ? (isPro ? PRO_CHECKS_PER_DAY : JOB_ONLY_FREE_PER_DAY)
      : (isPro ? PRO_CHECKS_PER_DAY : FREE_CHECKS_PER_DAY);

    const { count } = await supabaseAdmin
      .from('ats_checks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00.000Z`);

    if ((count || 0) >= maxChecks) {
      return NextResponse.json({
        error: isPro
          ? `Daily limit reached (${maxChecks} checks/day)`
          : `Free limit reached (${maxChecks}/day). Upgrade to Pro for more.`,
        limit_reached: true,
        is_pro: isPro,
      }, { status: 429 });
    }

    // Job-only mode (no AI, no cost)
    if (isJobOnly) {
      console.log(`ATS Job Analysis for user ${userId} (no AI)`);
      const jobResult = analyzeJobOnly(jobPosting);

      await supabaseAdmin
        .from('ats_checks')
        .insert({
          user_id: userId,
          overall_score: 0,
          keyword_score: 0,
          experience_score: 0,
          language_score: 0,
          formatting_score: 0,
          pass_likelihood: 'medium',
          job_title: jobResult.jobTitle.substring(0, 200),
          required_skills_count: jobResult.requiredSkills.length,
          matched_skills_count: 0,
          language_match: true,
          document_type: 'job_only',
        });

      return NextResponse.json({
        success: true,
        mode: 'job_only',
        result: jobResult,
        usage: {
          checksToday: (count || 0) + 1,
          maxChecks,
          isPro,
        },
      });
    }

    // Full ATS check (with AI gap analysis)
    console.log(`ATS Full Check for user ${userId} (${isPro ? 'Pro' : 'Free'})`);

    const input: ATSCheckInput = {
      jobPosting,
      userDocument: userDocument!,
      documentType: docType as 'cv' | 'cover_letter' | 'both',
    };

    const result = await checkATSScore(input);

    await supabaseAdmin
      .from('ats_checks')
      .insert({
        user_id: userId,
        overall_score: result.overallScore,
        keyword_score: result.keywordScore,
        experience_score: result.experienceScore,
        language_score: result.languageScore,
        formatting_score: result.formattingScore,
        pass_likelihood: result.passLikelihood,
        job_title: result.jobTitle.substring(0, 200),
        required_skills_count: result.requiredSkillsCount,
        matched_skills_count: result.matchedSkillsCount,
        language_match: result.detectedLanguage.match,
        document_type: docType,
      })
      .then(({ error: dbErr }) => {
        if (dbErr) console.error('Failed to save ATS check:', dbErr);
      });

    return NextResponse.json({
      success: true,
      result,
      usage: {
        checksToday: (count || 0) + 1,
        maxChecks,
        isPro,
      },
    });

  } catch (error: any) {
    console.error('ATS Check error:', error);
    const message = error.message?.includes('Invalid')
      ? error.message
      : 'ATS analysis failed. Please try again.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}