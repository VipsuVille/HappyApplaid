// app/api/generate-cv/route.ts - KORJATTU VERSIO
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateCVSafely } from "@/lib/langchain/cvGenerator";
import { transformDBToLangChain, type LangChainCVInput } from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { convertProfileToApiFormat } from "@/types";
import crypto from 'crypto';

export const maxDuration = 60;

// ✅ LAZY-LOAD SUPABASE ADMIN (build-time safe)
let supabaseAdminInstance: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdminInstance) {
    // ✅ Käytä NEXT_PUBLIC_ versiota jos tavallinen puuttuu
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!url || !key) {
      console.error('❌ Missing env vars:', {
        NEXT_PUBLIC_SUPABASE_URL: !!url,
        SUPABASE_SERVICE_ROLE_KEY: !!key
      });
      throw new Error("Missing Supabase environment variables");
    }
    
    supabaseAdminInstance = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    console.log('✅ Supabase Admin initialized');
  }
  
  return supabaseAdminInstance;
}

/**
 * ✅ TALLENNA VASTAUKSET
 */
function generateQuestionId(questionText: string): string {
  return crypto
    .createHash('sha256')
    .update(questionText.toLowerCase().trim())
    .digest('hex')
    .substring(0, 16);
}

async function saveUserResponse(
  userId: string,
  questionText: string,
  answer: string,
  cvType: string
): Promise<boolean> {
  try {
    const questionId = generateQuestionId(questionText);
    
    const { error } = await supabaseAdmin
      .from('user_responses')
      .upsert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        answer: answer,
        answer_length: answer.length,
        question_category: 'cv',
        asked_in_context: `cv_${cvType}`,
        job_title_context: cvType,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      });

    if (error) {
      console.error('Failed to save CV response:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in saveUserResponse:', error);
    return false;
  }
}

/**
 * ✅ MAIN ROUTE - KÄYTTÄÄ VAIN SERVICE ROLEA
 */
export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Safe Mode)");

  try {
    // ✅ Hae supabase vasta runtime-aikana
    const supabaseAdmin = getSupabaseAdmin();
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. AUTH (Clerk)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
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
      answeredQuestions,
      skipQuestions,
    } = body;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. MÄÄRITÄ ACTION & TOKEN COST
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const action: TokenAction = enableRAG 
      ? "cv_rag_addon" 
      : jobPosting 
        ? "cv_ats_addon" 
        : "cv_basic";

    console.log(`📝 Request: ${action}, type: ${cvType}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. HAE SUBSCRIPTION (SERVICE ROLE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = (subscription?.plan_type || "free") as "free" | "basic" | "semi-pro" | "pro";
    const currentTokens = subscription?.tokens || 0;
    const isActive = subscription?.is_active === true && 
      ["active", "trialing"].includes(subscription?.status || "");

    console.log(`💳 Subscription: ${tier}, tokens: ${currentTokens}, active: ${isActive}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. FREE TIER CHECK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (tier === "free") {
      const { data: freeUsage } = await supabaseAdmin
        .from("free_usage")
        .select("used_free_cv")
        .eq("user_id", userId)
        .maybeSingle();

      if (freeUsage?.used_free_cv && !forceGenerate) {
        return NextResponse.json(
          { error: "FREE_CV_ALREADY_USED" },
          { status: 403 }
        );
      }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. TOKEN CHECK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 6. BUILD INPUT
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    let input: LangChainCVInput;

    if (profileData) {
      console.log("📋 Using profile from request");
      
      let educationStr = "";
      let workExperienceStr = "";
      
      try {
        const apiProfile = convertProfileToApiFormat(profileData);
        educationStr = apiProfile?.education || "";
        workExperienceStr = apiProfile?.workExperience || "";
      } catch (convertError) {
        console.error("⚠️ convertProfileToApiFormat failed:", convertError);
        educationStr = typeof profileData.education === 'string' 
          ? profileData.education 
          : JSON.stringify(profileData.education || []);
        workExperienceStr = typeof profileData.workExperience === 'string' 
          ? profileData.workExperience 
          : JSON.stringify(profileData.workExperience || []);
      }

      input = {
        userId,
        cvId: `cv_${Date.now()}`,
        cvType,
        language,

        name: profileData.name || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        location: profileData.location || "",
        title: profileData.job_title || profileData.jobTitle || "",
        introText: profileData.profile_summary || profileData.profileSummary || "",

        education: educationStr,
        workExperience: workExperienceStr,
        skills: profileData.skills || "",
        languages: profileData.languages || "",

        workingStyle: profileData.workingStyle || profileData.working_style || "",
        problemSolving: profileData.problemSolving || profileData.problem_solving || "",
        energySources: profileData.energySources || profileData.energy_sources || "",
        uniqueStrength: profileData.uniqueStrength || profileData.unique_strength || "",
        learningStyle: profileData.learningStyle || profileData.learning_style || "",
        teamRole: profileData.teamRole || profileData.team_role || "",
        valuesExample: profileData.valuesExample || profileData.values_example || "",
        superpower: profileData.superpower || "",

        careerGoals: profileData.careerGoals || profileData.career_goals || "",
        bestProjectExample: profileData.bestProjectExample || profileData.best_project_example || "",
        failureLesson: profileData.failureLesson || profileData.failure_lesson || "",

        profileImage: profileData.profileImage || profileData.profile_image || undefined,
      };
    } else {
      console.log("📚 Loading from database (SERVICE ROLE)");
      
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

    console.log(`✅ Profile loaded: ${input.name}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7. KYSYTÄÄNKÖ (tai ohitetaanko)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const shouldSkipQuestions = skipQuestions === true || 
      (answeredQuestions && answeredQuestions.length > 0);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8. GENEROI CV (SAFE MODE) - EI DB:TÄ TÄÄLLÄ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log(`🤖 Generating CV (safe mode)...`);
    
    const result = await generateCVSafely({
      ...input,
      jobPosting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : undefined,
      enableRAG: enableRAG,
      skipQuestions: shouldSkipQuestions,
      answeredQuestions: answeredQuestions || [],
    });

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 9. JOS KYSYTTÄVÄÄ → PALAUTA KYSYMYKSET
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (result.needsMoreInfo && result.questions && result.questions.length > 0) {
      console.log(`❓ Returning ${result.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: result.questions,
        reason: 'CV tarvitsee lisätietoja laadukkaan sisällön luomiseen'
      });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 10. TALLENNA VASTAUKSET (jos annettiin)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    if (answeredQuestions && answeredQuestions.length > 0) {
      console.log(`💾 Saving ${answeredQuestions.length} answers...`);
      
      const savePromises = answeredQuestions.map((item: any) => 
        saveUserResponse(userId, item.question, item.answer, cvType)
      );

      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Saved ${successCount}/${answeredQuestions.length} answers`);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 11. TALLENNA CV - VAIN TÄÄLLÄ, EI GENERAATTORISSA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log("💾 Saving CV to database (SERVICE ROLE)...");
    
    // Rakenna cv_data
    const cv_data = {
      name: input.name,
      email: input.email,
      phone: input.phone,
      location: input.location,
      title: input.title,
      education: input.education,
      workExperience: input.workExperience,
      skills: input.skills,
      languages: input.languages,
    };
    
    // Rakenna ai_data
    const ai_data = {
      personal_description: result.personal_description,
      html: result.html,
      fullTextContent: result.fullTextContent,
      ats_data: result.ats_data,
      job_analysis: result.job_analysis,
      ground_truth_check: result.ground_truth_check,
    };
    
    // Rakenna content
    const content = {
      cv_type: cvType,
      personal_description: result.personal_description,
      sections: result.html,
      full_text: result.fullTextContent,
    };

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${cvType}`,
        
        cv_data: cv_data,
        ai_data: ai_data,
        content: content,
        
        background_image: result.background_image || "",
        profile_image: input.profileImage || null,
        profile_initials: result.profile_initials || "",
        
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        
        job_posting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : null,
        
        metadata: {
          action: action,
          tier: tier,
          cv_type: cvType,
          language: language,
          generation_time: Date.now() - startTime,
          ground_truth_check: result.ground_truth_check,
          rag_enabled: enableRAG,
          answered_questions: answeredQuestions || [],
          questions_count: answeredQuestions?.length || 0,
          created_at: new Date().toISOString()
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 12. KULUTA TOKENIT (SERVICE ROLE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
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

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 13. PALAUTA SUCCESS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    return NextResponse.json({
      success: true,
      id: saved.id,
      cvId: saved.id,
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
      generationTime: totalTime,
      features: {
        ats: action === "cv_ats_addon" || action === "cv_rag_addon",
        personality: true,
        rag: enableRAG,
        ground_truth_verified: true
      },
      guardianCheck: result.ground_truth_check
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    
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