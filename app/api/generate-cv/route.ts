// app/api/generate-cv/route.ts - FREEMIUM VERSION
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

export const maxDuration = 60;  // ← LISÄÄ TÄMÄ
export const runtime = 'edge';   // ← JA TÄMÄ
export async function POST(req: Request) {
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
    const jobPosting: string | undefined = requestData.jobPosting; // ✅ UUSI

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

    // Määritä tier
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

    if (isFree) {
      // ❌ Tarkista onko FREE CV jo käytetty
      if (hasUsedFreeCv) {
        return NextResponse.json(
          {
            error: "free_limit_reached",
            message: "Olet jo käyttänyt ilmaisen CV:si. Päivitä Premium-tiliin saadaksesi:\n• Rajattomasti CV:itä\n• ATS-optimointi\n• Hakukirjeet",
            redirectTo: "/pricing",
          },
          { status: 402 } // Payment Required
        );
      }

      // ❌ FREE vain Simple CV
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

      // ❌ FREE ei saa käyttää job postingia (ATS)
      if (jobPosting) {
        return NextResponse.json(
          {
            error: "free_tier_no_ats",
            message: "ATS-optimointi on vain Premium-käyttäjille. Ilmainen CV on persoonallisuusvetoinen mutta ei optimoitu ATS-järjestelmille.",
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
      const requiredTokens = 5; // Perustokenit

      if ((subscription?.tokens || 0) < requiredTokens) {
        return NextResponse.json(
          {
            error: "insufficient_tokens",
            message: `Tokenit lopussa (${subscription?.tokens || 0}/${requiredTokens}). Odota seuraavaa jaksoa tai päivitä tilaus.`,
            tokensRemaining: subscription?.tokens || 0,
          },
          { status: 402 }
        );
      }

      console.log(`✅ PREMIUM tier checks passed - ${subscription?.tokens} tokens available`);
    }

    // ========================================
    // 4️⃣ HAE PROFIILIDATAA TIETOKANNASTA
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
    // 5️⃣ MUUNNA TIETOKANTA → LANGCHAIN MUOTO
    // ========================================

    const langchainInput: LangChainCVInput = transformDBToLangChain(
      dbProfile,
      cvType
    );

    // ✅ LISÄÄ JOB POSTING (jos PREMIUM ja annettu)
    const enhancedInput: LangChainCVInput & { jobPosting?: string } = {
      ...langchainInput,
      jobPosting: isPremiumActive ? jobPosting : undefined,
    };

    console.log("📊 Transformed data summary:", {
      hasName: !!enhancedInput.name,
      hasEmail: !!enhancedInput.email,
      educationLength: enhancedInput.education.length,
      workExperienceLength: enhancedInput.workExperience.length,
      skillsLength: enhancedInput.skills.length,
      cvType: enhancedInput.cvType,
      hasJobPosting: !!enhancedInput.jobPosting,
      jobPostingLength: enhancedInput.jobPosting?.length || 0,
    });

    // ========================================
    // 6️⃣ PERSOONALLISUUSDATAN ANALYYSI (Simple CV)
    // ========================================

    if (cvType === "simple") {
      const personalityStats = calculatePersonalityCompleteness(enhancedInput);
      console.log("💭 Personality data completeness:", {
        percentage: personalityStats.completeness.toFixed(1) + "%",
        filled: personalityStats.filledFields,
        total: personalityStats.totalFields,
        missing: personalityStats.missingFields,
      });
    }

    // ========================================
    // 7️⃣ VALIDOI DATAN RIITTÄVYYS
    // ========================================

    const validation = validateProfileForCVType(enhancedInput, cvType);

    console.log("✓ Validation result:", {
      cvType: cvType,
      isValid: validation.isValid,
      score: validation.score,
      missing: validation.missingCritical,
    });

    if (!validation.isValid && !forceGenerate) {
      return NextResponse.json(
        {
          error: "data_validation_failed",
          cvType: cvType,
          missingCritical: validation.missingCritical,
          suggestions: validation.suggestions,
          score: validation.score,
          message: `❌ CV-tyyppi "${cvType}" vaatii lisätietoja (${validation.score}/100):\n\n` +
                   `Puuttuu:\n${validation.missingCritical.map(m => `• ${m}`).join('\n')}\n\n` +
                   `Suositukset:\n${validation.suggestions.map(s => `• ${s}`).join('\n')}`,
        },
        { status: 422 }
      );
    }

    // ========================================
    // 8️⃣ GENEROI CV LANGCHAIN:lla
    // ========================================

    console.log(`🚀 Starting AI CV generation (${planType.toUpperCase()})...`);
    const aiData = await generateCVWithLangChain(enhancedInput);

    // ========================================
    // 9️⃣ TALLENNA CV TIETOKANTAAN
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
        is_ats_optimized: isPremiumActive && !!jobPosting, // ✅ UUSI
        job_posting: isPremiumActive ? jobPosting : null, // ✅ UUSI
      })
      .select("id, content")
      .single();

    if (saveError) {
      console.error("Error saving CV:", saveError);
      throw new Error("Failed to save CV.");
    }

    // ========================================
    // 🔟 KULUTA TOKENIT / MERKITSE FREE CV KÄYTETYKSI
    // ========================================

    if (isPremiumActive) {
      // PREMIUM: Kuluta tokenit
      const requiredTokens = 5;

      const { data: consumeResult } = await supabaseAdmin.rpc("consume_tokens", {
        p_user_id: currentUserId,
        p_action_type: "cv_generation",
        p_tokens_required: requiredTokens,
      });

      if (!consumeResult) throw new Error("Token consumption failed");

      const { data: updatedTokens } = await supabaseAdmin
        .from("subscriptions")
        .select("tokens")
        .eq("user_id", currentUserId)
        .single();

      console.log(`✅ CV generated (PREMIUM). Tokens used: ${requiredTokens}, Remaining: ${updatedTokens?.tokens || 0}`);

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
          message: jobPosting 
            ? "Premium CV luotu ATS-optimoinnilla!"
            : "Premium CV luotu onnistuneesti!",
        },
        { status: 200 }
      );
    } else {
      // FREE: Merkitse FREE CV käytetyksi
      const { error: markError } = await supabaseAdmin.rpc("mark_free_cv_used", {
        p_user_id: currentUserId,
      });

      if (markError) {
        console.error("Failed to mark FREE CV as used:", markError);
        // Jatka silti, CV on jo tallennettu
      }

      console.log("✅ CV generated (FREE). User has now used their free CV.");

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
          message: "Ilmainen CV luotu onnistuneesti! Päivitä Premium-tiliin saadaksesi ATS-optimoinnin ja hakukirjeet.",
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("❌ CV generation failed:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "CV generation failed",
      },
      { status: 500 }
    );
  }
}