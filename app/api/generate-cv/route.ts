// app/api/generate-cv/route.ts - KORJATTU: OTTAA PROFIILIN BODYSTÄ

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVWithPersonalityExtraction } from "@/lib/langchain/cvGenerator";
import { supabase as supabaseAdmin } from "@/lib/supabase";
import {
  transformDBToLangChain,
  validateProfileForCVType,
  calculatePersonalityCompleteness,
  type LangChainCVInput,
} from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { buildAIContext } from "@/lib/knowledge";
import { convertProfileToApiFormat } from "@/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 Starting CV generation...");

  try {
    // 0️⃣ AUTH
    const { userId } = await auth();
    if (!userId) {
      console.error("❌ Unauthorized: No userId");
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    console.log(`✅ Auth OK: ${userId}`);

    // Parse request body
    let body;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "INVALID_REQUEST_BODY" },
        { status: 400 }
      );
    }

    const {
      profileData, // ✅ UUSI: Profiili bodystä (kuten cover letterissä)
      cvType = "simple",
      forceGenerate = false,
      jobPosting,
      enableRAG = false,
      answeredQuestions,
      skipQuestions,
    } = body;

    // 1️⃣ MÄÄRITÄ ACTION (Frontend päättää tämän)
    const action: TokenAction = body.action || 
      (enableRAG ? 'cv_rag_addon' : jobPosting ? 'cv_ats_addon' : 'cv_basic');

    console.log(`📝 CV Request:`, {
      userId,
      action,
      cvType,
      hasProfileData: !!profileData,
      hasJobPosting: !!jobPosting,
      enableRAG,
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: answeredQuestions?.length || 0,
    });

    // 2️⃣ SUBSCRIPTION
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("❌ Subscription fetch failed:", subError);
      return NextResponse.json(
        { error: "SUBSCRIPTION_CHECK_FAILED" },
        { status: 500 }
      );
    }

    const planType = (subscription?.plan_type || 'free') as 'free' | 'basic' | 'semi-pro' | 'pro';
    const currentTokens = subscription?.tokens || 0;
    const isActive = subscription?.is_active === true &&
      ['active', 'trialing'].includes(subscription?.status || '');

    console.log(`💳 Subscription: ${planType}, tokens: ${currentTokens}, active: ${isActive}`);

    // ---------------- FREE TIER ----------------
    if (planType === "free") {
      const { data: usage } = await supabaseAdmin
        .from("free_usage")
        .select("used_free_cv")
        .eq("user_id", userId)
        .maybeSingle();

      if (usage?.used_free_cv && !forceGenerate) {
        console.log("❌ Free CV already used");
        return NextResponse.json(
          { error: "FREE_CV_ALREADY_USED" },
          { status: 403 }
        );
      }
    }

    // ---------------- PAID TIERS ----------------
    let tier: "free" | "basic" | "semi-pro" | "pro" = planType;
    let required = 0;

    if (planType !== "free") {
      required = ACTION_COSTS[tier]?.[action] ?? 0;

      if (required === undefined) {
        console.log(`❌ Action not allowed: ${action} for tier ${tier}`);
        return NextResponse.json(
          { error: "ACTION_NOT_ALLOWED", tier, action },
          { status: 403 }
        );
      }

      if (isActive && currentTokens < required) {
        console.log(`❌ Not enough tokens: ${currentTokens} < ${required}`);
        return NextResponse.json(
          { error: "NOT_ENOUGH_TOKENS", required, available: currentTokens },
          { status: 403 }
        );
      }
    }

    console.log(`✅ Token check passed: ${required} tokens required`);

    // ========================================
    // 3️⃣ ✅ BUILD INPUT FROM profileData (KUTEN COVER LETTER)
    // ========================================
    
    let input: LangChainCVInput;
    
    if (profileData) {
      // ✅ KÄYTÄ BODYSTÄ TULLUTTA PROFIILIA
      console.log("📋 Using profile from request body");
      console.log("📊 Profile data keys:", Object.keys(profileData));
      console.log("📊 Education type:", typeof profileData.education, Array.isArray(profileData.education));
      console.log("📊 Work exp type:", typeof profileData.work_experience, Array.isArray(profileData.work_experience));
      
      // ✅ SAFE: Varmista että arrayt ovat oikeasti arraita
      const safeProfileData = {
        ...profileData,
        education: Array.isArray(profileData.education) ? profileData.education : [],
        work_experience: Array.isArray(profileData.work_experience) ? profileData.work_experience : [],
        workExperience: Array.isArray(profileData.workExperience) ? profileData.workExperience : [],
      };
      
      let apiFormat;
      try {
        apiFormat = convertProfileToApiFormat(safeProfileData);
      } catch (convertError) {
        console.error("❌ convertProfileToApiFormat failed:", convertError);
        // Fallback: Käytä raakadataa
        apiFormat = {
          education: safeProfileData.education,
          workExperience: safeProfileData.work_experience || safeProfileData.workExperience,
        };
      }
      
      input = {
        userId: userId,
        cvId: `cv_${Date.now()}`,
        cvType: cvType,
        language: body.language || "finnish",
        
        // Basic info
        name: profileData.name || profileData.full_name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
        title: profileData.job_title || profileData.jobTitle || "",
        introText: profileData.profile_summary || profileData.profileSummary || "",
        
        // Professional (käytä stringejä jos on, muuten arraita)
        education: typeof apiFormat.education === 'string' ? apiFormat.education : JSON.stringify(apiFormat.education || []),
        workExperience: typeof apiFormat.workExperience === 'string' ? apiFormat.workExperience : JSON.stringify(apiFormat.workExperience || []),
        skills: profileData.skills || "",
        languages: profileData.languages || "",
        
        // Personality
        workingStyle: profileData.working_style || profileData.workingStyle || "",
        problemSolving: profileData.problem_solving || profileData.problemSolving || "",
        energySources: profileData.energy_sources || profileData.energySources || "",
        uniqueStrength: profileData.unique_strength || profileData.uniqueStrength || "",
        learningStyle: profileData.learning_style || profileData.learningStyle || "",
        teamRole: profileData.team_role || profileData.teamRole || "",
        valuesExample: profileData.values_example || profileData.valuesExample || "",
        superpower: profileData.superpower || "",
        
        // Career
        careerGoals: profileData.career_goals || profileData.careerGoals || "",
        bestProjectExample: profileData.best_project_example || profileData.bestProjectExample || "",
        failureLesson: profileData.failure_lesson || profileData.failureLesson || "",
        
        // Images
        profileImage: profileData.profile_image || profileData.profileImage || "",
        backgroundImage: profileData.background_image || profileData.backgroundImage || "",
        
        // Optional
        hobbies: profileData.hobbies || "",
        age: profileData.age || "",
        linkedIn: profileData.linkedin || "",
      };
      
      console.log("✅ Input built from profileData:", {
        hasName: !!input.name,
        hasEducation: !!input.education,
        hasWorkExp: !!input.workExperience,
        educationType: typeof input.education,
        workExpType: typeof input.workExperience
      });
      
    } else {
      // ❌ FALLBACK: Yritä hakea tietokannasta (vanha tapa)
      console.log("📚 Falling back to database profile fetch");
      
      const { data: dbProfile, error: profileError } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (profileError || !dbProfile) {
        console.error("❌ Profile not found in database:", profileError);
        return NextResponse.json(
          { 
            error: "PROFILE_REQUIRED", 
            message: "Profiilia ei löydy. Lataa sivu uudelleen.",
            redirectTo: "/profile"
          },
          { status: 404 }
        );
      }
      
      input = transformDBToLangChain(dbProfile, cvType);
      input.userId = userId;
    }

    console.log(`✅ Profile loaded for: ${input.name}`);

    // 4️⃣ VALIDATE
    if (cvType === "simple") {
      const completeness = calculatePersonalityCompleteness(input);
      console.log(`📊 Personality completeness: ${completeness.completeness.toFixed(1)}%`);
    }

    const validation = validateProfileForCVType(input, cvType);
    console.log(`✅ Validation score: ${validation.score}/100`);

    if (!validation.isValid && !forceGenerate) {
      console.log("❌ Validation failed:", validation.missingCritical);
      return NextResponse.json(
        {
          error: "DATA_VALIDATION_FAILED",
          missing: validation.missingCritical,
          suggestions: validation.suggestions,
          score: validation.score,
        },
        { status: 422 }
      );
    }

    // 5️⃣ RAG CONTEXT (jos käytössä)
    let ragContext = '';
    if (enableRAG && tier === 'pro') {
      console.log('🔍 Building RAG context...');
      try {
        // Käytä profiilia joko bodystä tai DB:stä
        const profileForRAG = profileData || input;
        
        ragContext = await buildAIContext({
          jobDescription: jobPosting || 'General CV',
          userProfile: profileForRAG,
          enableRAG: true,
          contentType: 'cv'
        });
        console.log(`✅ RAG context: ${ragContext.length} chars`);
      } catch (ragError) {
        console.error("⚠️ RAG context failed:", ragError);
      }
    }

    // 6️⃣ GENERATE CV
    console.log("🎨 Starting CV generation...");
    let aiData;
    try {
      aiData = await generateCVWithPersonalityExtraction({
        ...input,
        jobPosting: (action === 'cv_ats_addon' || action === 'cv_rag_addon') ? jobPosting : undefined,
        ragContext: ragContext || undefined,
      });
    } catch (genError) {
      console.error("❌ CV generation failed:", genError);
      return NextResponse.json(
        { 
          error: "CV_GENERATION_FAILED",
          message: genError instanceof Error ? genError.message : "Unknown error"
        },
        { status: 500 }
      );
    }

    if (!aiData) {
      console.error("❌ CV generation returned null");
      return NextResponse.json(
        { error: "CV_GENERATION_RETURNED_NULL" },
        { status: 500 }
      );
    }

    console.log("✅ CV content generated");

    // 7️⃣ SAVE CV
    console.log("💾 Saving CV to database...");
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
        is_ats_optimized: action === 'cv_ats_addon' || action === 'cv_rag_addon',
        job_posting: (action === 'cv_ats_addon' || action === 'cv_rag_addon') ? jobPosting : null,
        metadata: {
          action: action,
          used_rag: enableRAG,
          tier: tier,
          generation_time: Date.now() - startTime,
          has_answered_questions: !!answeredQuestions,
          questions_count: answeredQuestions?.length || 0
        }
      })
      .select("id")
      .single();

    if (saveError || !saved) {
      console.error("❌ Failed to save CV:", saveError);
      return NextResponse.json(
        { error: "CV_SAVE_FAILED", details: saveError?.message },
        { status: 500 }
      );
    }

    console.log(`✅ CV saved with id: ${saved.id}`);

    // 8️⃣ UPDATE TOKENS & USAGE
    if (tier === "free") {
      await supabaseAdmin.from("free_usage").upsert({
        user_id: userId,
        used_free_cv: true,
      });
      console.log("✅ Free CV usage marked");
    } else if (isActive && required > 0) {
      const { error: tokenError } = await supabaseAdmin
        .from("subscriptions")
        .update({
          tokens: currentTokens - required,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (tokenError) {
        console.error("⚠️ Failed to update tokens:", tokenError);
      } else {
        console.log(`✅ Tokens consumed: ${required} (${currentTokens} → ${currentTokens - required})`);
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 CV generation complete in ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      id: saved.id,
      cvId: saved.id,
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
      generationTime: totalTime,
      features: {
        ats: action === 'cv_ats_addon' || action === 'cv_rag_addon',
        rag: action === 'cv_rag_addon',
        personality: true
      }
    });

  } catch (error) {
    console.error("❌ Unexpected error in CV generation:", error);
    
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    
    return NextResponse.json(
      { 
        error: "INTERNAL_SERVER_ERROR",
        message: "An unexpected error occurred",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}