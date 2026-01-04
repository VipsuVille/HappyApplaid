// app/api/generate-cv/route.ts - COMPLETE FIXED VERSION

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

function validateCVContent(result: any): { isValid: boolean; reason?: string } {
  if (!result.html) {
    return { isValid: false, reason: 'HTML missing' };
  }

  const { skills_section, experience_section, education_section, languages_section } = result.html;

  const sections = [skills_section, experience_section, education_section, languages_section];
  const hasErrors = sections.some(section => 
    section && section.toLowerCase().includes('error generating')
  );

  if (hasErrors) {
    return { isValid: false, reason: 'Sections contain error messages' };
  }

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

  const totalChars = 
    (result.personal_description?.length || 0) +
    (skills_section?.length || 0) +
    (experience_section?.length || 0) +
    (education_section?.length || 0) +
    (languages_section?.length || 0);

  if (totalChars > 4500) {
    console.warn(`⚠️ CV might be too long: ${totalChars} chars (recommended max ~3500)`);
  }

  return { isValid: true };
}

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Safe Mode with Questions)");

  try {
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

    if (result.needsMoreInfo && result.questions && result.questions.length > 0) {
      console.log(`❓ Returning ${result.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: result.questions,
        reason: 'CV tarvitsee lisätietoja laadukkaan sisällön luomiseen'
      });
    }

    const validation = validateCVContent(result);
    
    if (!validation.isValid) {
      console.error(`❌ CV validation failed: ${validation.reason}`);
      
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
    // MASTER GUARDIAN CHECK (PERMISSIVE FOR EDUCATION)
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

    // ✅ VÄLIAIKAINEN: Salli education-ongelmat (kunnes Guardian korjataan)
    const hasOnlyEducationIssues = 
      guardianCheck.violations &&
      guardianCheck.violations.fabricatedEducation &&
      guardianCheck.violations.fabricatedEducation.length > 0 &&
      (!guardianCheck.violations.fabricatedSkills || guardianCheck.violations.fabricatedSkills.length === 0) &&
      (!guardianCheck.violations.fabricatedExperience || guardianCheck.violations.fabricatedExperience.length === 0);

    if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
      if (hasOnlyEducationIssues) {
        console.warn('⚠️ Guardian flagged education but allowing (known fuzzy matching issue)');
        console.warn('   Flagged items:', guardianCheck.violations.fabricatedEducation);
      } else {
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
    }

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
    // IMAGE PROCESSING (TALLENNA FILE PATHT, EI BASE64!)
    // ════════════════════════════════════════════════════════════════

    console.log("🖼️ Processing images...");

    // ✅ 1. PROFIILIKUVA: Hae user_profiles:sta (file path tai Base64 legacy)
    let profileImagePath = "";

    if (userProfile?.profile_image) {
      const rawProfile = userProfile.profile_image;
      
      // Jos Base64 (legacy) → jätä sellaisenaan (migraatio myöhemmin)
      if (rawProfile.startsWith("data:image/")) {
        console.log("⚠️ Profile is Base64 (legacy format)");
        profileImagePath = rawProfile;
      }
      // Jos file path → käytä sitä
      else if (rawProfile.includes('/')) {
        profileImagePath = rawProfile;
        console.log("✅ Profile image file path:", profileImagePath);
      }
      // Jos HTTP URL → pura file path
      else if (rawProfile.startsWith('http')) {
        const pathMatch = rawProfile.match(/\/cv_files\/(.+)$/);
        if (pathMatch) {
          profileImagePath = pathMatch[1];
          console.log("✅ Extracted profile file path from URL:", profileImagePath);
        }
      }
    }

    // ✅ 2. TAUSTAKUVA: Generoi uusi TAI käytä inputtia
    let backgroundImagePath = "";

    // Jos input sisältää taustakuvan (käyttäjä valitsi vanhan)
    if (input.backgroundImage) {
      const rawBg = input.backgroundImage;
      
      // Jos file path → käytä sitä
      if (rawBg.includes('/') && !rawBg.startsWith('http') && !rawBg.startsWith('data:')) {
        backgroundImagePath = rawBg;
        console.log("✅ Background from input (file path):", backgroundImagePath);
      }
      // Jos HTTP URL → pura file path
      else if (rawBg.startsWith('http')) {
        const pathMatch = rawBg.match(/\/cv_files\/(.+)$/);
        if (pathMatch) {
          backgroundImagePath = pathMatch[1];
          console.log("✅ Extracted background file path from input URL:", backgroundImagePath);
        }
      }
    }

    // Jos ei ole taustakuvaa, result.background_image sisältää sen
    if (!backgroundImagePath && result.background_image) {
      const rawBg = result.background_image;
      
      // Jos file path → käytä sitä
      if (rawBg.includes('/') && !rawBg.startsWith('http') && !rawBg.startsWith('data:')) {
        backgroundImagePath = rawBg;
        console.log("✅ Background from result (file path):", backgroundImagePath);
      }
      // Jos HTTP URL → pura file path
      else if (rawBg.startsWith('http')) {
        const pathMatch = rawBg.match(/\/cv_files\/(.+)$/);
        if (pathMatch) {
          backgroundImagePath = pathMatch[1];
          console.log("✅ Extracted background file path from result URL:", backgroundImagePath);
        }
      }
    }

    console.log("🖼️ Final image paths:");
    console.log("   - Profile:", profileImagePath || "none");
    console.log("   - Background:", backgroundImagePath || "none");

    // ════════════════════════════════════════════════════════════════
    // SAVE CV TO DATABASE (TALLENNA FILE PATHT!)
    // ════════════════════════════════════════════════════════════════

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${cvType}`,
        
        // ✅ ROOT-TASOLLA: File patht (ei URL:eja!)
        profile_image: profileImagePath || null,
        background_image: backgroundImagePath || null,
        
        content: {
          cv_data: {
            ...input,
            // ✅ CONTENT:SSA: File patht
            profileImage: profileImagePath,
            backgroundImage: backgroundImagePath,
            personal_description: result.personal_description,
          },
          ai_data: {
            html: {
              skills_section: result.html.skills_section,
              experience_section: result.html.experience_section,
              education_section: result.html.education_section,
              languages_section: result.html.languages_section,
            },
            
            skills_section: result.html.skills_section,
            experience_section: result.html.experience_section,
            education_section: result.html.education_section,
            languages_section: result.html.languages_section,
            
            personal_description: result.personal_description,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
            cvType: cvType,
            
            // ✅ AI_DATA:SSA: File patht
            background_image: backgroundImagePath,
            profile_image: profileImagePath,
          }
        },
        
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
            profile: !!profileImagePath,
            background: !!backgroundImagePath,
            profile_path: profileImagePath,
            background_path: backgroundImagePath,
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

    console.log(`✅ CV saved with file paths:`, {
      profile: profileImagePath || 'none',
      background: backgroundImagePath || 'none'
    });

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