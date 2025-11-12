// app/api/generate-cv/route.ts - KORJATTU

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  generateCVWithLangChain,
} from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { 
  transformDBToLangChain, 
  validateProfileForCVType,
  calculatePersonalityCompleteness,
  type LangChainCVInput 
} from "@/lib/profileDataTransform";

export const maxDuration = 60; // ✅ SÄILYTÄ
// export const runtime = 'edge'; // ❌ POISTA TÄMÄ RIVI!

export async function POST(req: Request) {
  const startTime = Date.now(); // ✅ LISÄÄ AIKAMITTAUS
  
  const authData = await auth();
  const currentUserId = authData.userId;

  if (!currentUserId) {
    return NextResponse.json(
      { error: "Unauthorized - user not authenticated" },
      { status: 401 }
    );
  }

  try {
    const authToken = await authData.getToken({ template: "supabase" });
    if (!authToken) {
      return NextResponse.json(
        { error: "Unauthorized - authentication token missing" },
        { status: 401 }
      );
    }

    const requestData = await req.json();
    const forceGenerate = requestData.forceGenerate || false;
    const cvType: "simple" | "technical" | "creative" = requestData.cvType || "simple";
    const jobPosting: string | undefined = requestData.jobPosting;

    console.log(`🎯 CV Generation Request - Type: ${cvType}, Force: ${forceGenerate}, Has Job Posting: ${!!jobPosting}`);

    // ========================================
    // 1️⃣ TARKISTA KÄYTTÄJÄN TIER JA RAJOITUKSET
    // ========================================

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, current_period_end")
      .eq("user_id", currentUserId)
      .single();

    const { data: profile} = await supabaseAdmin
      .from("user_profiles")
      .select("has_used_free_cv")
      .eq("user_id", currentUserId)
      .single();

    let planType: "free" | "premium" = "free";
    let isPremiumActive = false;

    if (subscription) {
      isPremiumActive =
        subscription.plan_type === "premium" &&
        ["active", "trialing"].includes(subscription.status) &&
        new Date(subscription.current_period_end) > new Date();

      planType = isPremiumActive ? "premium" : "free";
    }

    const isFree = planType === "free";
    const hasUsedFreeCv = profile?.has_used_free_cv || false;

    console.log("👤 User tier:", {
      planType,
      isPremiumActive,
      hasUsedFreeCv,
      tokens: subscription?.tokens || 0,
    });

    // ========================================
    // 2️⃣ FREE-TIER RAJOITUKSET
    // ========================================
console.log("🚀 CV Generation started");
console.log("📊 User ID:", currentUserId);
console.log("📊 Plan type:", planType);
console.log("📊 has_used_free_cv (before):", hasUsedFreeCv);
    if (isFree) {
      if (hasUsedFreeCv) {
        return NextResponse.json(
          {
            error: "free_limit_reached",
            message: "Olet jo käyttänyt ilmaisen CV:si. Päivitä Premium-tiliin saadaksesi:\n• Rajattomasti CV:itä\n• ATS-optimointi\n• Hakukirjeet",
            redirectTo: "/pricing",
          },
          { status: 402 }
        );
      }

      if (cvType !== "simple") {
        return NextResponse.json(
          {
            error: "free_tier_simple_only",
            message: "Ilmainen CV on vain Simple-tyyppiä. Professional ja Creative CV vaativat Premium-tilauksen.",
            allowedType: "simple",
          },
          { status: 403 }
        );
      }

      if (jobPosting) {
        return NextResponse.json(
          {
            error: "free_tier_no_ats",
            message: "ATS-optimointi on vain Premium-käyttäjille.",
          },
          { status: 403 }
        );
      }

      console.log("✅ FREE tier checks passed - creating first CV");
    }

    // ========================================
    // 3️⃣ PREMIUM-TIER TARKISTUKSET
    // ========================================

    if (isPremiumActive) {
      const requiredTokens = 5;

      if ((subscription?.tokens || 0) < requiredTokens) {
        return NextResponse.json(
          {
            error: "insufficient_tokens",
            message: `Tokenit lopussa (${subscription?.tokens || 0}/${requiredTokens}).`,
            tokensRemaining: subscription?.tokens || 0,
          },
          { status: 402 }
        );
      }

      console.log(`✅ PREMIUM tier checks passed - ${subscription?.tokens} tokens available`);
    }

    // ========================================
    // 4️⃣ HAE PROFIILIDATAA
    // ========================================

    const { data: dbProfile, error: profileDbError } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", currentUserId)
      .single();

    if (profileDbError || !dbProfile) {
      return NextResponse.json(
        { 
          error: "Profiilia ei löytynyt. Täytä ensin profiilisi tiedot.", 
          redirectTo: "/profile" 
        },
        { status: 404 }
      );
    }

    // ========================================
    // 5️⃣ MUUNNA TIETOKANTA → LANGCHAIN
    // ========================================

    console.log(`⏱️  Time after profile fetch: ${Date.now() - startTime}ms`);

    const langchainInput: LangChainCVInput = transformDBToLangChain(
      dbProfile,
      cvType
    );

    const enhancedInput: LangChainCVInput & { jobPosting?: string } = {
      ...langchainInput,
      jobPosting: isPremiumActive ? jobPosting : undefined,
    };

    console.log("📊 Transformed data summary:", {
      hasName: !!enhancedInput.name,
      hasEmail: !!enhancedInput.email,
      cvType: enhancedInput.cvType,
      hasJobPosting: !!enhancedInput.jobPosting,
    });

    // ========================================
    // 6️⃣ PERSOONALLISUUSDATAN ANALYYSI
    // ========================================

    if (cvType === "simple") {
      const personalityStats = calculatePersonalityCompleteness(enhancedInput);
      console.log("💭 Personality completeness:", {
        percentage: personalityStats.completeness.toFixed(1) + "%",
        filled: personalityStats.filledFields,
        total: personalityStats.totalFields,
      });
    }

    // ========================================
    // 7️⃣ VALIDOI DATA
    // ========================================

    const validation = validateProfileForCVType(enhancedInput, cvType);

    console.log("✓ Validation:", {
      isValid: validation.isValid,
      score: validation.score,
      missing: validation.missingCritical.length,
    });

    if (!validation.isValid && !forceGenerate) {
      return NextResponse.json(
        {
          error: "data_validation_failed",
          cvType: cvType,
          missingCritical: validation.missingCritical,
          suggestions: validation.suggestions,
          score: validation.score,
        },
        { status: 422 }
      );
    }

    // ========================================
    // 8️⃣ GENEROI CV (KRIITTISIN OSA)
    // ========================================

    console.log(`🚀 Starting AI generation at ${Date.now() - startTime}ms...`);
    
    const aiData = await generateCVWithLangChain(enhancedInput);
    
    console.log(`✅ AI generation completed in ${Date.now() - startTime}ms`);

    // ========================================
    // 9️⃣ TALLENNA CV
    // ========================================

    const content = {
      cv_data: enhancedInput,
      ai_data: aiData,
    };

    const { data: savedData, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: currentUserId,
        title: `${enhancedInput.name || "My"} CV - ${cvType}`,
        content: content,
        is_public: false,
        is_ats_optimized: isPremiumActive && !!jobPosting,
        job_posting: isPremiumActive ? jobPosting : null,
      })
      .select("id, content")
      .single();

    if (saveError) {
      console.error("Error saving CV:", saveError);
      throw new Error("Failed to save CV.");
    }

    console.log(`💾 CV saved in ${Date.now() - startTime}ms total`);

    // ========================================
    // 🔟 KULUTA TOKENIT / MERKITSE FREE
    // ========================================

    if (isPremiumActive) {
      const requiredTokens = 5;

      await supabaseAdmin.rpc("consume_tokens", {
        p_user_id: currentUserId,
        p_action_type: "cv_generation",
        p_tokens_required: requiredTokens,
      });

      const { data: updatedTokens } = await supabaseAdmin
        .from("subscriptions")
        .select("tokens")
        .eq("user_id", currentUserId)
        .single();

      console.log(`✅ PREMIUM CV generated in ${Date.now() - startTime}ms. Tokens: ${updatedTokens?.tokens}`);

      return NextResponse.json(
        {
          id: savedData.id,
          cvData: savedData.content.cv_data,
          aiData: savedData.content.ai_data,
          tokensRemaining: updatedTokens?.tokens || 0,
          tokensUsed: requiredTokens,
          qualityScore: validation.score,
          isPremium: true,
          isAtsOptimized: !!jobPosting,
          generationTime: Date.now() - startTime, // ✅ Palauta aika
        },
        { status: 200 }
      );
    } else {
      await supabaseAdmin.rpc("mark_free_cv_used", {
        p_user_id: currentUserId,
      });
console.log("📊 has_used_free_cv (after):", profile?.has_used_free_cv);

      console.log(`✅ FREE CV generated in ${Date.now() - startTime}ms`);

      return NextResponse.json(
        {
          id: savedData.id,
          cvData: savedData.content.cv_data,
          aiData: savedData.content.ai_data,
          tokensRemaining: 0,
          tokensUsed: 0,
          qualityScore: validation.score,
          isPremium: false,
          isAtsOptimized: false,
          generationTime: Date.now() - startTime,
          has_used_free_cv: true
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error(`❌ CV generation failed after ${Date.now() - startTime}ms:`, error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "CV generation failed",
      },
      { status: 500 }
    );
  }
} 