// app/api/generate-cv/route.ts - COMPLETE FINAL VERSION

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

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

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
 * Validoi CV:n sisällön laadun ja A4-pituuden
 */
function validateCVContent(result: any): { isValid: boolean; reason?: string } {
  if (!result.html) {
    return { isValid: false, reason: 'HTML missing' };
  }

  const { skills_section, experience_section, education_section, languages_section } = result.html;

  // ✅ TARKISTA VIRHEET
  const sections = [skills_section, experience_section, education_section, languages_section];
  const hasErrors = sections.some(section => 
    section && section.toLowerCase().includes('error generating')
  );

  if (hasErrors) {
    return { isValid: false, reason: 'Sections contain error messages' };
  }

  // ✅ TARKISTA SISÄLTÖ
  const hasContent = 
    (skills_section && skills_section.length > 20) ||
    (experience_section && experience_section.length > 20) ||
    (education_section && education_section.length > 20) ||
    (languages_section && languages_section.length > 20);

  if (!hasContent) {
    return { isValid: false, reason: 'All sections empty or too short' };
  }

  // ✅ TARKISTA PERSONAL DESCRIPTION
  if (!result.personal_description || result.personal_description.length < 20) {
    return { isValid: false, reason: 'Personal description too short' };
  }

  // ✅ TARKISTA A4-PITUUS (arvio)
  const totalChars = 
    (result.personal_description?.length || 0) +
    (skills_section?.length || 0) +
    (experience_section?.length || 0) +
    (education_section?.length || 0) +
    (languages_section?.length || 0);

  // A4-estimaatti: ~3500 merkkiä = 1 sivu
  if (totalChars > 4500) {
    console.warn(`⚠️ CV might be too long: ${totalChars} chars (recommended max ~3500)`);
  }

  return { isValid: true };
}

/**
 * Puhdista ja validoi kuva-URL
 * Tukee: Base64, HTTP URL, Supabase path
 */
function cleanImageForStorage(url: string | null | undefined): string | null {
  if (!url || url.trim() === '') {
    return null;
  }
  
  const trimmed = url.trim();
  
  // ✅ 1. HTTP/HTTPS URL → Palauta sellaisenaan
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    console.log("🖼️ Image is HTTP URL");
    return trimmed;
  }
  
  // ✅ 2. BASE64 DATA URI → Validoi ja palauta
  if (trimmed.startsWith("data:image")) {
    // Tarkista että Base64 on validi
    const parts = trimmed.split(',');
    if (parts.length === 2 && parts[1].length > 100) {
      console.log("🖼️ Valid Base64 image (length:", trimmed.length, ")");
      return trimmed; // ✅ PALAUTA KOKO DATA URI
    } else {
      console.warn("⚠️ Invalid Base64 format (too short or malformed)");
      return null;
    }
  }
  
  // ✅ 3. Yritä etsiä Base64 stringistä (jos joku on lisännyt jotain eteen)
  const base64Match = trimmed.match(/(data:image\/[^;]+;base64,[A-Za-z0-9+/=]{100,})/);
  if (base64Match) {
    console.log("🖼️ Extracted Base64 from dirty string");
    return base64Match[1];
  }
  
  // ❌ 4. Tuntematon muoto → Palauta null (älä yritä rakentaa URL:ia)
  console.warn("⚠️ Unknown image format, returning null:", trimmed.substring(0, 100));
  return null;
}

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Safe Mode with Questions)");

  try {
    // ════════════════════════════════════════════════════════════════
    // AUTHENTICATION
    // ════════════════════════════════════════════════════════════════
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // ════════════════════════════════════════════════════════════════
    // PARSE REQUEST
    // ════════════════════════════════════════════════════════════════
    
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

    // ✅ KORJAUS: Oikea skipQuestions logiikka
    const shouldSkipQuestions = skipQuestions === true || 
      (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0);

    console.log(`📋 CV Request:`, {
      cvType,
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: Array.isArray(answeredQuestions) ? answeredQuestions.length : 0,
      skipQuestionsFlag: skipQuestions,
      shouldSkipQuestions
    });

    const action: TokenAction = enableRAG 
      ? "cv_rag_addon" 
      : jobPosting 
        ? "cv_ats_addon" 
        : "cv_basic";

    console.log(`🔍 Action: ${action}, Type: ${cvType}`);

    // ════════════════════════════════════════════════════════════════
    // TOKEN VALIDATION
    // ════════════════════════════════════════════════════════════════

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = (subscription?.plan_type || "free") as "free" | "basic" | "semi-pro" | "pro";
    const currentTokens = subscription?.tokens || 0;
    const isActive = subscription?.is_active === true && 
      ["active", "trialing"].includes(subscription?.status || "");

    console.log(`💳 Subscription: ${tier}, Tokens: ${currentTokens}, Active: ${isActive}`);

    // Free tier check
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

    // Token balance check
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

    console.log(`✅ Token check passed (${required} tokens required)`);

    // ════════════════════════════════════════════════════════════════
    // PREPARE INPUT
    // ════════════════════════════════════════════════════════════════

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
        
        skipQuestions: shouldSkipQuestions,
        answeredQuestions: answeredQuestions || []
      };
    } else {
      console.log("📚 Loading profile from database");
      
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
      input.skipQuestions = shouldSkipQuestions;
      input.answeredQuestions = answeredQuestions || [];
    }

    console.log(`✅ Profile loaded: ${input.name}`);
    console.log(`   - skipQuestions: ${input.skipQuestions}`);

    // ════════════════════════════════════════════════════════════════
    // GENERATE CV
    // ════════════════════════════════════════════════════════════════

    console.log(`🤖 Generating CV (safe mode)...`);
    
    const result = await generateCVSafely(input);

    // ✅ JOS AI KYSYY LISÄKYSYMYKSIÄ
    if (result.needsMoreInfo && result.questions && result.questions.length > 0) {
      console.log(`❓ Returning ${result.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: result.questions,
        reason: 'CV tarvitsee lisätietoja laadukkaan sisällön luomiseen'
      });
    }

    // ✅ VALIDOI SISÄLTÖ
    const validation = validateCVContent(result);
    
    if (!validation.isValid) {
      console.error(`❌ CV validation failed: ${validation.reason}`);
      console.error('   Sections state:', {
        skills: result.html?.skills_section?.length || 0,
        experience: result.html?.experience_section?.length || 0,
        education: result.html?.education_section?.length || 0,
        languages: result.html?.languages_section?.length || 0
      });
      
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

    // ════════════════════════════════════════════════════════════════
    // MASTER GUARDIAN CHECK
    // ════════════════════════════════════════════════════════════════

    console.log('🛡️ Running Master Guardian...');
    
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    console.log(`✅ Ground Truth extracted: ${groundTruth.technicalSkills.length} skills`);
    
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

    // ✅ KORJAUS: Jos Guardian hylkää, PALAUTA VIRHE (älä tallenna)
    if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
      console.error('🚨 GUARDIAN REJECTED CV');
      console.error('   Violations:', guardianCheck.violations);
      
      return NextResponse.json({
        error: "CV_CONTENT_REJECTED",
        message: "Sisältö sisältää epäluotettavaa tietoa",
        details: {
          riskLevel: guardianCheck.riskLevel,
          violations: guardianCheck.violations,
          recommendation: guardianCheck.recommendation
        }
      }, { status: 400 });
    }

    // ⚠️ VAROITUS (mutta salli tallennus)
    if (guardianCheck.riskLevel === 'warning') {
      console.warn('⚠️ Guardian warning:', guardianCheck.recommendation);
    }

    console.log(`✅ Guardian check: ${guardianCheck.riskLevel}`);

    // ════════════════════════════════════════════════════════════════
    // SAVE ANSWERED QUESTIONS
    // ════════════════════════════════════════════════════════════════

    if (answeredQuestions && answeredQuestions.length > 0) {
      console.log(`💾 Saving ${answeredQuestions.length} answers...`);
      
      const savePromises = answeredQuestions.map((item: any) => 
        saveUserResponse(userId, item.question, item.answer, cvType)
      );

      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Saved ${successCount}/${answeredQuestions.length} answers`);
    }

    // ════════════════════════════════════════════════════════════════
    // CLEAN AND VALIDATE IMAGES
    // ════════════════════════════════════════════════════════════════

    // ✅ PROFIILIKUVA: Käytä INPUT:sta (käyttäjän valitsema)
    const cleanProfileImage = cleanImageForStorage(input.profileImage);

    // ✅ TAUSTAKUVA: Käytä RESULT:sta (AI:n generoima)
    const cleanBackgroundImage = cleanImageForStorage(result.background_image);

    console.log("🖼️ Images after cleaning:");
    console.log("   - Profile INPUT:", input.profileImage?.substring(0, 80));
    console.log("   - Profile CLEAN:", cleanProfileImage ? `✅ (${cleanProfileImage.substring(0, 80)}...)` : "❌");
    console.log("   - Background RAW:", result.background_image?.substring(0, 80));
    console.log("   - Background CLEAN:", cleanBackgroundImage ? `✅ (${cleanBackgroundImage.substring(0, 80)}...)` : "❌");

    // ✅ DEBUG: Tarkista onko fallback
    if (cleanBackgroundImage && cleanBackgroundImage.includes('Background Image')) {
      console.warn("⚠️ Background is FALLBACK SVG - image generation failed!");
    }

    // ════════════════════════════════════════════════════════════════
    // SAVE CV TO DATABASE
    // ════════════════════════════════════════════════════════════════

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
            // ✅ VANHA MUOTO (html-objekti sisällä)
            html: {
              skills_section: result.html.skills_section,
              experience_section: result.html.experience_section,
              education_section: result.html.education_section,
              languages_section: result.html.languages_section,
            },
            
            // ✅ UUSI MUOTO (suoraan juuressa, types/index.ts mukaan)
            skills_section: result.html.skills_section,
            experience_section: result.html.experience_section,
            education_section: result.html.education_section,
            languages_section: result.html.languages_section,
            
            // Muut kentät
            personal_description: result.personal_description,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
            cvType: cvType,
            background_image: cleanBackgroundImage,
            profile_image: cleanProfileImage,
          }
        },
        
        // ✅ TALLENNA MYÖS ROOT-TASOLLE (backward compatibility)
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
          ground_truth_status: guardianCheck.approved ? "approved" : "warning",
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          images_saved: {
            profile: !!cleanProfileImage,
            background: !!cleanBackgroundImage,
            profile_type: cleanProfileImage?.startsWith('data:') ? 'base64' : 'url',
            background_type: cleanBackgroundImage?.startsWith('data:') ? 'base64' : 'url'
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

    // ════════════════════════════════════════════════════════════════
    // CONSUME TOKENS
    // ════════════════════════════════════════════════════════════════

    if (tier === "free") {
      await supabaseAdmin.from("free_usage").upsert({
        user_id: userId,
        used_free_cv: true,
      });
      console.log('✅ Free CV marked as used');
    } else if (isActive && required > 0) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          tokens: currentTokens - required,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      console.log(`✅ Consumed ${required} tokens (${currentTokens - required} remaining)`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`🎉 CV generation complete in ${totalTime}ms`);

    // ════════════════════════════════════════════════════════════════
    // RETURN SUCCESS
    // ════════════════════════════════════════════════════════════════

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
    console.error("❌ Unexpected error in CV generation:", error);
    return NextResponse.json(
      { 
        error: "GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}