// app/api/generate-cv/route.ts — checkLimit + logUsage + RAG-premium-portti + AI-tausta premium-only
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVSafely } from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { transformDBToLangChain, type LangChainCVInput } from "@/lib/profileDataTransform";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { checkLimit, logUsage, limitMessage, planOf, canUseFeature } from "@/lib/limits"; // ✅ + planOf, canUseFeature
import crypto from "crypto";

export const maxDuration = 60;

function convertProfileToApiFormat(profileData: any): any {
  const toArray = (field: any): any[] => {
    if (field == null) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === "string") {
      if (field.trim() === "") return [];
      try { const parsed = JSON.parse(field); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
    }
    return [];
  };
  const toString = (field: any): string => {
    if (field == null) return "";
    if (typeof field === "string") return field;
    if (Array.isArray(field)) {
      return field.filter((i) => i != null && i !== "").map((i) => (typeof i === "string" ? i : JSON.stringify(i))).join(", ");
    }
    return String(field);
  };
  try {
    return {
      name: profileData?.name || "",
      email: profileData?.email || "",
      phone: profileData?.phone || "",
      location: profileData?.location || "",
      jobTitle: profileData?.job_title || profileData?.jobTitle || "",
      profileSummary: profileData?.profile_summary || profileData?.profileSummary || "",
      workExperience: toArray(profileData?.work_experience),
      education: toArray(profileData?.education),
      certificates: toArray(profileData?.certificates),
      portfolio_links: toArray(profileData?.portfolio_links),
      skills: toString(profileData?.skills),
      languages: toString(profileData?.languages),
      hobbies: toString(profileData?.hobbies),
      working_style: profileData?.working_style || profileData?.workingStyle || "",
      problem_solving: profileData?.problem_solving || profileData?.problemSolving || "",
      unique_strength: profileData?.unique_strength || profileData?.uniqueStrength || "",
      superpower: profileData?.superpower || "",
      energy_sources: profileData?.energy_sources || profileData?.energySources || "",
      learning_style: profileData?.learning_style || profileData?.learningStyle || "",
      team_role: profileData?.team_role || profileData?.teamRole || "",
      values_example: profileData?.values_example || profileData?.valuesExample || "",
      career_goals: profileData?.career_goals || profileData?.careerGoals || "",
      best_project_example: profileData?.best_project_example || profileData?.bestProjectExample || "",
      failure_lesson: profileData?.failure_lesson || profileData?.failureLesson || "",
      profileImage: profileData?.profileImage || profileData?.profile_image || undefined,
      backgroundImage: profileData?.backgroundImage || profileData?.background_image || undefined,
    };
  } catch (error) {
    console.error("❌ [CONVERT] Conversion failed:", error);
    return profileData;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

    const body = await request.json();
    const {
      profileData,
      cvType = "simple",
      jobPosting,
      enableRAG = false,
      language = "finnish",
      answeredQuestions,
      skipQuestions,
      confirmedViolations,
      skipValidation = false,
    } = body;

    // ── KULUHALLINTA + PLAN ────────────────────────────────────────
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type")
      .eq("user_id", userId)
      .maybeSingle();
    const tier = subscription?.plan_type || "free";

    const plan = planOf(subscription?.plan_type);
    const canAiBg = canUseFeature(plan, "ai_background");      // AI-taustakuva: vain premium
    const ragOn = plan === "premium" && !!enableRAG;           // RAG: vain premium (jos pyydetty)

    const limit = await checkLimit(userId, subscription?.plan_type);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "LIMIT_REACHED", message: limitMessage(limit), reason: limit.reason, upgrade: limit.plan === "free" },
        { status: 429 }
      );
    }
    const action = ragOn ? "cv_rag_addon" : jobPosting ? "cv_ats_addon" : "cv_basic";

    // ── PREPARE INPUT ──────────────────────────────────────────────
    let input: LangChainCVInput;

    if (profileData) {
      const apiProfile = convertProfileToApiFormat(profileData);
      input = {
        userId,
        cvId: `cv_${Date.now()}`,
        cvType: cvType as "simple" | "technical" | "creative",
        language,
        name: apiProfile.name || "",
        email: apiProfile.email || "",
        phone: apiProfile.phone || "",
        location: apiProfile.location || "",
        title: apiProfile.jobTitle || "",
        introText: apiProfile.profileSummary || "",
        education: typeof apiProfile.education === "string" ? apiProfile.education : JSON.stringify(apiProfile.education || []),
        workExperience: typeof apiProfile.workExperience === "string" ? apiProfile.workExperience : JSON.stringify(apiProfile.workExperience || []),
        skills: apiProfile.skills || "",
        languages: apiProfile.languages || "",
        workingStyle: apiProfile.working_style || "",
        problemSolving: apiProfile.problem_solving || "",
        energySources: apiProfile.energy_sources || "",
        uniqueStrength: apiProfile.unique_strength || "",
        learningStyle: apiProfile.learning_style || "",
        teamRole: apiProfile.team_role || "",
        valuesExample: apiProfile.values_example || "",
        superpower: apiProfile.superpower || "",
        careerGoals: apiProfile.career_goals || "",
        bestProjectExample: apiProfile.best_project_example || "",
        failureLesson: apiProfile.failure_lesson || "",
        profileImage: apiProfile.profileImage || undefined,
        jobPosting: jobPosting || undefined,
        enableRAG: ragOn,                 // ✅ RAG premium-only
        skipQuestions: skipQuestions || false,
        answeredQuestions: answeredQuestions || [],
      };
    } else {
      const { data } = await supabaseAdmin.from("user_profiles").select("*").eq("user_id", userId).single();
      if (!data) return NextResponse.json({ error: "PROFILE_REQUIRED" }, { status: 404 });
      input = transformDBToLangChain(data, cvType);
      input.userId = userId;
      input.cvType = cvType as "simple" | "technical" | "creative";
      input.jobPosting = jobPosting;
      input.enableRAG = ragOn;            // ✅ RAG premium-only
      input.skipQuestions = skipQuestions || false;
      input.answeredQuestions = answeredQuestions || [];
    }

    // ✅ AI-taustakuva vain premiumille (cvGenerator STEP 7 lukee tämän — ks. ohje viestissä)
    (input as any).aiBackground = canAiBg;

    // Vahvistetut violationit
    if (confirmedViolations && Array.isArray(confirmedViolations)) {
      const approvedItems = confirmedViolations
        .filter((v: any) => v.decision === "approved" || v.decision === "corrected")
        .map((v: any) => ({ type: v.type, content: v.decision === "corrected" ? v.correctedContent : v.content }));
      approvedItems.forEach((item: any) => {
        if (item.type === "skill") input.skills = input.skills ? `${input.skills}, ${item.content}` : item.content;
        else if (item.type === "education") input.education = input.education ? `${input.education}\n${item.content}` : item.content;
        else if (item.type === "experience") input.workExperience = input.workExperience ? `${input.workExperience}\n${item.content}` : item.content;
      });
    }

    // ── GENERATE ───────────────────────────────────────────────────
    const result = await generateCVSafely(input);

    if (result.needsMoreInfo && result.questions) {
      return NextResponse.json({ success: true, needsMoreInfo: true, questions: result.questions, _debug: (result as any)._debug || null });
    }

    const hasContent =
      (result.html?.skills_section && result.html.skills_section.length > 20) ||
      (result.html?.experience_section && result.html.experience_section.length > 20);
    if (!hasContent) {
      return NextResponse.json({ error: "CV_GENERATION_INCOMPLETE", message: "CV sisältö puutteellinen" }, { status: 500 });
    }

    // ── GUARDIAN (ei blokkaa) ──────────────────────────────────────
    const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;
    let guardianResult: { riskLevel: string; violations: any } | null = null;
    if (shouldRunGuardian) {
      try {
        const { data: userProfile } = await supabaseAdmin.from("user_profiles").select("*").eq("user_id", userId).single();
        const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);
        const fullCVText = `
          ${result.personal_description || ""}
          ${result.html?.skills_section || ""}
          ${result.html?.experience_section || ""}
          ${result.html?.education_section || ""}
        `.trim();
        const guardianCheck = await masterGuardianValidatorV2(fullCVText, groundTruth, "generation");
        if (guardianCheck.riskLevel === "danger" && !guardianCheck.approved) {
          guardianResult = { riskLevel: guardianCheck.riskLevel, violations: guardianCheck.violations };
        }
      } catch (guardianError) {
        console.error("⚠️ Guardian check failed, continuing:", guardianError);
      }
    }

    // ── SAVE ───────────────────────────────────────────────────────
    const finalCvType = cvType || input.cvType || "simple";
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${finalCvType}`,
        profile_image: input.profileImage || null,
        background_image: result.background_image || null,
        content: {
          cv_data: { ...input, cvType: finalCvType },
          ai_data: {
            html: result.html,
            personal_description: result.personal_description,
            cvType: finalCvType,
            profile_image: result.profile_image || input.profileImage || null,
            background_image: result.background_image || null,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
          },
          ...(guardianResult ? { guardian_check: guardianResult } : {}),
        },
        profile_initials: result.profile_initials,
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        job_posting: action === "cv_ats_addon" || action === "cv_rag_addon" ? jobPosting : null,
        metadata: {
          cv_type: finalCvType,
          action,
          tier,
          generation_time: Date.now() - startTime,
          ...(guardianResult ? { guardian_risk: guardianResult.riskLevel } : {}),
        },
      })
      .select("id")
      .single();

    if (saveError || !saved) {
      console.error("❌ Save failed:", saveError);
      return NextResponse.json({ error: "CV_SAVE_FAILED" }, { status: 500 });
    }

    // ── KIRJAA AI-LUONTI ───────────────────────────────────────────
    await logUsage(userId, "cv");

    return NextResponse.json({
      success: true,
      cvId: saved.id,
      id: saved.id,
      message: "CV generated successfully",
      aiRemaining: Math.max(0, limit.remaining - 1),
      ...(guardianResult ? { guardianWarning: true, guardianRisk: guardianResult.riskLevel } : {}),
    });
  } catch (error) {
    console.error("❌ CV generation error:", error);
    return NextResponse.json({ error: "GENERATION_FAILED" }, { status: 500 });
  }
}