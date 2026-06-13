// app/api/ats-check/route.ts
// ✅ YHDISTETTY KATTO: täysi ATS-tarkistus (AI) kuluttaa samaa viikkokattoa
//    kuin CV/hakukirje/iterointi/verdikti. job_only (EI AI:ta) pysyy ilmaisena.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { checkATSScore, analyzeJobOnly, type ATSCheckInput } from "@/lib/ats/atsScoreChecker";
import { checkLimit, logUsage, limitMessage } from "@/lib/limits";

// job_only on EI-AI (halpa) → oma kevyt päiväraja väärinkäytön estoon
const JOB_ONLY_FREE_PER_DAY = 10;
const JOB_ONLY_PRO_PER_DAY = 50;

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    let body: any;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

    const { jobPosting, userDocument, documentType } = body;

    if (!jobPosting || typeof jobPosting !== "string") {
      return NextResponse.json({ error: "jobPosting is required (string)" }, { status: 400 });
    }
    if (jobPosting.length > 15000) {
      return NextResponse.json({ error: "Job posting too long (max 15000 chars)" }, { status: 400 });
    }

    const isJobOnly = documentType === "job_only" || !userDocument;
    if (!isJobOnly && (typeof userDocument !== "string" || userDocument.length > 15000)) {
      return NextResponse.json({ error: "userDocument too long (max 15000 chars)" }, { status: 400 });
    }

    const validTypes = ["cv", "cover_letter", "both", "job_only"];
    const docType = validTypes.includes(documentType) ? documentType : (isJobOnly ? "job_only" : "cv");

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .maybeSingle();

    // ════════════════════════════════════════════════════════════════
    // JOB-ONLY MODE — ei AI:ta, ei kuluta viikkokattoa. Kevyt päiväraja.
    // ════════════════════════════════════════════════════════════════
    if (isJobOnly) {
      const today = new Date().toISOString().split("T")[0];
      const isPro = subscription?.plan_type && subscription.plan_type !== "free";
      const maxJobOnly = isPro ? JOB_ONLY_PRO_PER_DAY : JOB_ONLY_FREE_PER_DAY;

      const { count } = await supabaseAdmin
        .from("ats_checks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("document_type", "job_only")
        .gte("created_at", `${today}T00:00:00.000Z`);

      if ((count || 0) >= maxJobOnly) {
        return NextResponse.json(
          { error: `Päiväraja täynnä (${maxJobOnly}/pv).`, limit_reached: true },
          { status: 429 }
        );
      }

      const jobResult = analyzeJobOnly(jobPosting);
      await supabaseAdmin.from("ats_checks").insert({
        user_id: userId, overall_score: 0, keyword_score: 0, experience_score: 0,
        language_score: 0, formatting_score: 0, pass_likelihood: "medium",
        job_title: jobResult.jobTitle.substring(0, 200),
        required_skills_count: jobResult.requiredSkills.length,
        matched_skills_count: 0, language_match: true, document_type: "job_only",
      });

      return NextResponse.json({ success: true, mode: "job_only", result: jobResult });
    }

    // ════════════════════════════════════════════════════════════════
    // FULL ATS CHECK — käyttää AI:ta → YKSI KATTO (checkLimit + logUsage)
    // ════════════════════════════════════════════════════════════════
    const limit = await checkLimit(userId, subscription?.plan_type);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", message: limitMessage(limit), reason: limit.reason, upgrade: limit.plan === "free" },
        { status: 429 }
      );
    }

    const input: ATSCheckInput = {
      jobPosting, userDocument: userDocument!, documentType: docType as "cv" | "cover_letter" | "both",
    };
    const result = await checkATSScore(input);

    await supabaseAdmin.from("ats_checks").insert({
      user_id: userId,
      overall_score: result.overallScore, keyword_score: result.keywordScore,
      experience_score: result.experienceScore, language_score: result.languageScore,
      formatting_score: result.formattingScore, pass_likelihood: result.passLikelihood,
      job_title: result.jobTitle.substring(0, 200),
      required_skills_count: result.requiredSkillsCount, matched_skills_count: result.matchedSkillsCount,
      language_match: result.detectedLanguage.match, document_type: docType,
    }).then(({ error: dbErr }) => { if (dbErr) console.error("Failed to save ATS check:", dbErr); });

    // ── KIRJAA AI-TOIMINTO (yksi katto) ──
    await logUsage(userId, "ats_check");

    return NextResponse.json({
      success: true, result, aiRemaining: Math.max(0, limit.remaining - 1),
    });
  } catch (error: any) {
    console.error("ATS Check error:", error);
    const message = error.message?.includes("Invalid") ? error.message : "ATS analysis failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}