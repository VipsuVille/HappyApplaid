// app/api/generate-cv/route.ts - KORJATTU VERSIO
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

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API started");

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

    console.log(`📝 Request: ${action}, type: ${cvType}, hasProfile: ${!!profileData}`);

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

    console.log(`💳 Subscription: ${tier}, tokens: ${currentTokens}, active: ${isActive}`);

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

    console.log(`✅ Token check passed (${required} tokens)`);

    // 5️⃣ BUILD INPUT (LIGHTWEIGHT)
    let input: LangChainCVInput;

    if (profileData) {
      console.log("📋 Using profile from request body");
      
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

        profileImage: profileData.profileImage || undefined,
        
        // ✅ LISÄÄ JOBPOSTING JA AUTHTOKEN (TÄRKEÄ!)
        jobPosting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : undefined,
        authToken: undefined, // Token ei tule bodystä
      };
    } else {
      console.log("📚 Falling back to database");
      
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
      input.jobPosting = (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : undefined;
    }

    console.log(`✅ Profile loaded: ${input.name}`);

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

    // 7️⃣ LLM GENERATION - ✅ EI TIMEOUTIA TÄSSÄ, SE ON JO LANGCHAINISSÄ
    console.log(`⏱️ Starting generation (${Date.now() - startTime}ms elapsed)`);
    
    let aiData;
    try {
      // ✅ KORJAUS: Älä wraappaa timeoutiin, koska se on jo cvGeneratorissa
      aiData = await generateCVWithPersonalityExtraction(input);
    } catch (genError) {
      console.error("❌ Generation failed:", genError);
      return NextResponse.json(
        { 
          error: "CV_GENERATION_FAILED",
          message: genError instanceof Error ? genError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    if (!aiData) {
      return NextResponse.json(
        { error: "CV_GENERATION_RETURNED_NULL" },
        { status: 500 }
      );
    }

    console.log(`✅ Content generated (${Date.now() - startTime}ms)`);

    // 8️⃣ SAVE CV
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${cvType}`,
        personal_description: aiData.personal_description,
        html: aiData.html,
        background_image: aiData.background_image,
        profile_image: input.profileImage || null,
        profile_initials: aiData.profile_initials,
        full_text_content: aiData.fullTextContent,
        cv_type: cvType,
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        job_posting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : null,
        metadata: {
          action: action,
          tier: tier,
          generation_time: Date.now() - startTime,
        }
      })
      .select("id")
      .single();

    if (saveError || !saved) {
      console.error("❌ Save failed:", saveError);
      return NextResponse.json(
        { error: "CV_SAVE_FAILED", details: saveError?.message },
        { status: 500 }
      );
    }

    console.log(`✅ CV saved: ${saved.id}`);

    // 9️⃣ UPDATE TOKENS
    if (tier === "free") {
      await supabaseAdmin.from("free_usage").upsert({
        user_id: userId,
        used_free_cv: true,
      });
    } else if (isActive && required > 0) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          tokens: currentTokens - required,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 Complete in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      id: saved.id,
      cvId: saved.id,
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
      generationTime: totalTime,
      features: {
        ats: action === "cv_ats_addon" || action === "cv_rag_addon",
        personality: true
      }
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    
    // ✅ KORJAUS: Tulosta koko virhe lokiin
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
      console.error("Error message:", error.message);
    }
    
    return NextResponse.json(
      { 
        error: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}