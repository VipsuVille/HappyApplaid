// app/api/generate-cv/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVWithPersonalityExtraction } from "@/lib/langchain/cvGenerator";
import { supabase as supabaseAdmin } from "@/lib/supabase";
import {
  transformDBToLangChain,
  validateProfileForCVType,
  type LangChainCVInput,
} from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { convertProfileToApiFormat } from "@/types";

export const maxDuration = 60;

const LLM_TIMEOUT_MS = 45_000;

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    // 1️⃣ AUTH
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json();
    const {
      profileData,
      cvType = "simple",
      forceGenerate = false,
      jobPosting,
      enableRAG = false,
      language = "finnish",
    } = body;

    const action: TokenAction =
      body.action ??
      (enableRAG ? "cv_rag_addon" : jobPosting ? "cv_ats_addon" : "cv_basic");

    // 2️⃣ SUBSCRIPTION (FAST)
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = (subscription?.plan_type || "free") as
      | "free"
      | "basic"
      | "semi-pro"
      | "pro";

    const currentTokens = subscription?.tokens || 0;
    const isActive =
      subscription?.is_active === true &&
      ["active", "trialing"].includes(subscription?.status || "");

    // 3️⃣ FREE TIER LIMIT
    if (tier === "free") {
      const { data } = await supabaseAdmin
        .from("free_usage")
        .select("used_free_cv")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.used_free_cv && !forceGenerate) {
        return NextResponse.json(
          { error: "FREE_CV_ALREADY_USED" },
          { status: 403 }
        );
      }
    }

    // 4️⃣ TOKEN CHECK
    let required = 0;
    if (tier !== "free") {
      required = ACTION_COSTS[tier]?.[action] ?? 0;

      if (!isActive || currentTokens < required) {
        return NextResponse.json(
          {
            error: "NOT_ENOUGH_TOKENS",
            required,
            available: currentTokens,
          },
          { status: 403 }
        );
      }
    }

    // 5️⃣ BUILD INPUT (LIGHTWEIGHT)
    let input: LangChainCVInput;

    if (profileData) {
      const apiProfile = convertProfileToApiFormat(profileData);

      input = {
        userId,
        cvId: `cv_${Date.now()}`,
        cvType,
        language,

        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
        title: profileData.job_title || "",
        introText: profileData.profile_summary || "",

        education: apiProfile.education || "",
        workExperience: apiProfile.workExperience || "",
        skills: profileData.skills || "",
        languages: profileData.languages || "",

        workingStyle: profileData.workingStyle || "",
        problemSolving: profileData.problemSolving || "",
        energySources: profileData.energySources || "",
        uniqueStrength: profileData.uniqueStrength || "",
        learningStyle: profileData.learningStyle || "",
        teamRole: profileData.teamRole || "",
        valuesExample: profileData.valuesExample || "",
        superpower: profileData.superpower || "",

        careerGoals: profileData.careerGoals || "",
        bestProjectExample: profileData.bestProjectExample || "",
        failureLesson: profileData.failureLesson || "",

        profileImage: profileData.profileImage || "",
      };
    } else {
      const { data } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (!data) {
        return NextResponse.json(
          { error: "PROFILE_REQUIRED" },
          { status: 404 }
        );
      }

      input = transformDBToLangChain(data, cvType);
      input.userId = userId;
    }

    // 6️⃣ FAST VALIDATION
    if (!forceGenerate) {
      const validation = validateProfileForCVType(input, cvType);
      if (validation.score < 30) {
        return NextResponse.json(
          {
            error: "DATA_VALIDATION_FAILED",
            score: validation.score,
            missing: validation.missingCritical,
          },
          { status: 422 }
        );
      }
    }

    // 7️⃣ LLM GENERATION WITH TIMEOUT
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    let aiData;
    try {
      aiData = await generateCVWithPersonalityExtraction({
  ...input,
  jobPosting:
    action === "cv_ats_addon" || action === "cv_rag_addon"
      ? jobPosting
      : undefined,
});
    } catch (err) {
      return NextResponse.json(
        { error: "CV_GENERATION_TIMEOUT" },
        { status: 504 }
      );
    } finally {
      clearTimeout(timeout);
    }

    // 8️⃣ SAVE + TOKEN UPDATE (NON-BLOCKING)
    const savePromise = supabaseAdmin.from("cvs").insert({
      user_id: userId,
      title: `${input.name || "My"} CV`,
      html: aiData.html,
      full_text_content: aiData.fullTextContent,
      profile_image: input.profileImage || null,
      cv_type: cvType,
      is_ats_optimized:
        action === "cv_ats_addon" || action === "cv_rag_addon",
    });

    const tokenPromise =
      tier === "free"
        ? supabaseAdmin.from("free_usage").upsert({
            user_id: userId,
            used_free_cv: true,
          })
        : supabaseAdmin
            .from("subscriptions")
            .update({ tokens: currentTokens - required })
            .eq("user_id", userId);

    void Promise.all([savePromise, tokenPromise]);

    return NextResponse.json({
      success: true,
      generationTime: Date.now() - startTime,
      tokensUsed: required,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}
