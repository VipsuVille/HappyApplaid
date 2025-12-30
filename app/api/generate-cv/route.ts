// app/api/generate-cv/route.ts - KORJATTU: Kysymyslogiikka + Guardian

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVSafely } from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { transformDBToLangChain, type LangChainCVInput } from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import crypto from 'crypto';

export const maxDuration = 60;

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

// ✅ VALIDOI CV-SISÄLTÖ (varmista että ei ole tyhjä/virheellinen)
function validateCVContent(result: any): { isValid: boolean; reason?: string } {
  if (!result.html) {
    return { isValid: false, reason: 'HTML missing' };
  }

  const { skills_section, experience_section, education_section, languages_section } = result.html;

  // Tarkista että sisältö ei ole "Error generating..."
  const sections = [skills_section, experience_section, education_section, languages_section];
  const hasErrors = sections.some(section => 
    section && section.toLowerCase().includes('error generating')
  );

  if (hasErrors) {
    return { isValid: false, reason: 'Sections contain error messages' };
  }

  // Tarkista että ainakin yksi osio sisältää jotain
  const hasContent = 
    (skills_section && skills_section.length > 20) ||
    (experience_section && experience_section.length > 20) ||
    (education_section && education_section.length > 20) ||
    (languages_section && languages_section.length > 20);

  if (!hasContent) {
    return { isValid: false, reason: 'All sections empty or too short' };
  }

  if (!result.personal_description || result.personal_description.length < 20) {
    return { isValid: false, reason: 'Personal description too short' };
  }

  return { isValid: true };
}

// ✅ PUHDISTA KUVA-URL
function cleanImageForStorage(url: string | null | undefined): string | null {
  if (!url) return null;
  
  // Jos on jo base64, palauta sellaisenaan
  if (url.startsWith("data:image")) {
    return url;
  }
  
  // Jos sisältää "data:image" keskellä tekstiä, pura se ulos
  const base64Match = url.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]+)/);
  if (base64Match) {
    console.log("🖼️ Puhdistettu kuva-URL");
    return base64Match[1];
  }
  
  // Muuten palauta HTTP-URL sellaisenaan
  return url;
}

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Safe Mode with Questions)");

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. AUTH
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
      answeredQuestions,  // ✅ KYSYMYSTEN VASTAUKSET
      skipQuestions,       // ✅ OHITA KYSYMYKSET
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
    // 3. HAE SUBSCRIPTION
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
        
        jobPosting: jobPosting || undefined,
        enableRAG: enableRAG,
        
        // ✅ VÄLITÄ KYSYMYSASETUKSET
        skipQuestions: skipQuestions === true || (answeredQuestions && answeredQuestions.length > 0),
        answeredQuestions: answeredQuestions || []
      };
    } else {
      console.log("📚 Loading from database");
      
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
      input.jobPosting = jobPosting;
      input.enableRAG = enableRAG;
      input.skipQuestions = skipQuestions === true || (answeredQuestions && answeredQuestions.length > 0);
      input.answeredQuestions = answeredQuestions || [];
    }

    console.log(`✅ Profile loaded: ${input.name}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 7. GENEROI CV (KYSYMYKSET TAI SISÄLTÖ)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log(`🤖 Generating CV (safe mode)...`);
    
    const result = await generateCVSafely(input);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 8. JOS KYSYTTÄVÄÄ → PALAUTA KYSYMYKSET (EI TALLENNA!)
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
    // 9. ✅ VALIDOI SISÄLTÖ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const validation = validateCVContent(result);
    
    if (!validation.isValid) {
      console.error(`❌ CV content validation failed: ${validation.reason}`);
      
      return NextResponse.json({
        error: "CV_GENERATION_INCOMPLETE",
        message: `CV-sisältö on puutteellinen: ${validation.reason}`,
        details: {
          hasHtml: !!result.html,
          hasDescription: !!result.personal_description,
          descriptionLength: result.personal_description?.length || 0,
          sections: {
            skills: result.html?.skills_section?.length || 0,
            experience: result.html?.experience_section?.length || 0,
            education: result.html?.education_section?.length || 0,
            languages: result.html?.languages_section?.length || 0
          }
        }
      }, { status: 500 });
    }

    console.log('✅ CV content validation passed');

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 10. ✅ MASTER GUARDIAN CHECK
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    console.log('🛡️ Running Master Guardian...');
    
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    console.log(`✅ Ground Truth extracted`);
    
    // Yhdistä kaikki CV-tekstit Guardian-tarkistusta varten
    const fullCVText = `
      ${result.personal_description || ''}
      ${result.html?.skills_section || ''}
      ${result.html?.experience_section || ''}
      ${result.html?.education_section || ''}
      ${result.html?.languages_section || ''}
    `.trim();
    
    const guardianCheck = await masterConsistencyCheckAI(
      fullCVText,
      groundTruth,
      'generation'
    );

    if (guardianCheck.riskLevel === 'danger') {
      console.error('🚨 GUARDIAN REJECTED CV');

      return NextResponse.json({
        error: 'CONSISTENCY_VIOLATION',
        message: 'CV ei täytä laatuvaatimuksia - sisältö on epäjohdonmukaista',
        violations: guardianCheck.violations,
        recommendation: guardianCheck.recommendation
      }, { status: 400 });
    }

    console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 11. TALLENNA VASTAUKSET
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
    // 12. ✅ PUHDISTA KUVAT ENNEN TALLENNUSTA
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const cleanProfileImage = cleanImageForStorage(input.profileImage);
    const cleanBackgroundImage = cleanImageForStorage(result.background_image);

    console.log("🖼️ Image URLs cleaned");

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 13. TALLENNA CV
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${cvType}`,
        
        content: {
          cv_data: {
            ...input,
            profileImage: cleanProfileImage,
            backgroundImage: cleanBackgroundImage,
            personal_description: result.personal_description,
          },
          ai_data: {
            ...result.html,
            personal_description: result.personal_description,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
            cvType: cvType,
            background_image: cleanBackgroundImage,
          }
        },
        
        background_image: cleanBackgroundImage || "",
        profile_image: cleanProfileImage || null,
        profile_initials: result.profile_initials,
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        job_posting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : null,
        
        metadata: {
          cv_type: cvType,
          action: action,
          tier: tier,
          generation_time: Date.now() - startTime,
          rag_enabled: enableRAG,
          ground_truth_status: guardianCheck.approved ? "approved" : "rejected",
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          }
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
    // 14. KULUTA TOKENIT
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
    // 15. PALAUTA SUCCESS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    
    return NextResponse.json({
      success: true,
      cvId: saved.id,
      id: saved.id,
      message: "CV generated successfully",
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
      generationTime: totalTime,
      guardianCheck: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        hasWarnings: guardianCheck.riskLevel === 'warning'
      },
      features: {
        ats: action === "cv_ats_addon" || action === "cv_rag_addon",
        personality: true,
        rag: enableRAG,
        ground_truth_verified: true
      }
    });

  } catch (error) {
    console.error("❌ Unexpected error:", error);
    return NextResponse.json(
      { 
        error: "GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}