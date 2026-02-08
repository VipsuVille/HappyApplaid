// app/api/generate-cv/route.ts - KORJATTU convertProfileToApiFormat

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVSafely } from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { transformDBToLangChain, type LangChainCVInput } from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import crypto from 'crypto';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";

export const maxDuration = 60;

// ✅ KORJATTU: Turvallinen konvertointi
function convertProfileToApiFormat(profileData: any): any {
  console.log('🔄 [CONVERT] Starting conversion...');
  
  // Helper: turvallinen array-muunnos
  const toArray = (field: any): any[] => {
    if (field == null) return [];
    if (Array.isArray(field)) return field;
    if (typeof field === 'string') {
      if (field.trim() === '') return [];
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  // Helper: turvallinen string-muunnos
  const toString = (field: any): string => {
    if (field == null) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) {
      return field
        .filter(item => item != null && item !== '')
        .map(item => typeof item === 'string' ? item : JSON.stringify(item))
        .join(', ');
    }
    return String(field);
  };

  try {
    const result = {
      name: profileData?.name || '',
      email: profileData?.email || '',
      phone: profileData?.phone || '',
      location: profileData?.location || '',
      jobTitle: profileData?.job_title || profileData?.jobTitle || '',
      profileSummary: profileData?.profile_summary || profileData?.profileSummary || '',
      
      // ✅ ARRAYS (turvallisesti käsitelty)
      workExperience: toArray(profileData?.work_experience),
      education: toArray(profileData?.education),
      certificates: toArray(profileData?.certificates),
      portfolio_links: toArray(profileData?.portfolio_links),
      
      // ✅ STRINGS (turvallisesti käsitelty)
      skills: toString(profileData?.skills),
      languages: toString(profileData?.languages),
      hobbies: toString(profileData?.hobbies),
      
      // Personality
      working_style: profileData?.working_style || profileData?.workingStyle || '',
      problem_solving: profileData?.problem_solving || profileData?.problemSolving || '',
      unique_strength: profileData?.unique_strength || profileData?.uniqueStrength || '',
      superpower: profileData?.superpower || '',
      energy_sources: profileData?.energy_sources || profileData?.energySources || '',
      learning_style: profileData?.learning_style || profileData?.learningStyle || '',
      team_role: profileData?.team_role || profileData?.teamRole || '',
      values_example: profileData?.values_example || profileData?.valuesExample || '',
      
      // Goals & Stories
      career_goals: profileData?.career_goals || profileData?.careerGoals || '',
      best_project_example: profileData?.best_project_example || profileData?.bestProjectExample || '',
      failure_lesson: profileData?.failure_lesson || profileData?.failureLesson || '',
      
      // Images
      profileImage: profileData?.profileImage || profileData?.profile_image || undefined,
      backgroundImage: profileData?.backgroundImage || profileData?.background_image || undefined,
    };

    console.log('✅ [CONVERT] Conversion successful:', {
      hasName: !!result.name,
      workExpCount: result.workExperience.length,
      educationCount: result.education.length,
      skillsType: typeof result.skills,
      languagesType: typeof result.languages,
    });

    return result;
  } catch (error) {
    console.error('❌ [CONVERT] Conversion failed:', error);
    // Fallback: palauta raaka data
    return profileData;
  }
}

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Oppiva Versio)");
  const ROUTE_VERSION = '2025-01-17-DEFENSIVE-V3';
  console.log(`🔍 ROUTE VERSION: ${ROUTE_VERSION}`);
  
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await request.json();
    const {
      profileData,
      cvType = "simple",
      originalCvType, // ✅ LISÄTTY
      forceGenerate = false,
      jobPosting,
      enableRAG = false,
      language = "finnish",
      answeredQuestions,
      skipQuestions,
      confirmedViolations,
      skipValidation = false
    } = body;

    console.log(`📋 Request:`, {
      cvType,
      hasConfirmedViolations: !!confirmedViolations,
      skipValidation,
      hasAnsweredQuestions: !!answeredQuestions,
      hasProfileData: !!profileData
    });

    const action: TokenAction = enableRAG 
      ? "cv_rag_addon" 
      : jobPosting 
        ? "cv_ats_addon" 
        : "cv_basic";

    // ════════════════════════════════════════════════════════════════
    // TOKEN VALIDATION
    // ════════════════════════════════════════════════════════════════

    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    const tier = (subscription?.plan_type || "free") as "free" | "basic" | "premium";
    const currentTokens = subscription?.tokens || 0;
    const isActive = subscription?.is_active === true && 
      ["active", "trialing"].includes(subscription?.status || "");

    console.log(`💳 Subscription: ${tier}, Tokens: ${currentTokens}, Active: ${isActive}`);

    if (tier === "free") {
      console.log('🆓 Free tier user - checking usage...');
      
      const freeStatus = await checkFreeUsage(userId, 'cv');
      
      if (!freeStatus.canUse && !forceGenerate) {
        console.error(`❌ Free CV not available: ${freeStatus.reason}`);
        
        const errorMessages: Record<string, string> = {
          'FREE_CV_ALREADY_USED': 'Olet jo käyttänyt ilmaisen CV:n! Aktivoi Basic-tilaus.',
          'FREE_SLOT_USED_FOR_COVER_LETTER': 'Käytit ilmaisen tokenisi hakukirjeeseen. Aktivoi Basic-tilaus luodaksesi CV:n.',
        };

        return NextResponse.json(
          { 
            error: freeStatus.reason,
            message: errorMessages[freeStatus.reason || ''] || 'Ilmainen käyttö on loppu',
            hasUsedCV: freeStatus.hasUsedCV,
            hasUsedCoverLetter: freeStatus.hasUsedCoverLetter,
          },
          { status: 403 }
        );
      }

      console.log('✅ Free CV available');
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

    // ════════════════════════════════════════════════════════════════
    // PREPARE INPUT - ✅ KORJATTU KONVERTOINTI
    // ════════════════════════════════════════════════════════════════

    let input: LangChainCVInput;

    if (profileData) {
      console.log("📋 Using profile from request");
      
      // ✅ KÄYTÄ TURVALLISTA KONVERTOINTIA
      const apiProfile = convertProfileToApiFormat(profileData);
      
      input = {
        userId,
        cvId: `cv_${Date.now()}`,
        cvType,
        language,
        name: apiProfile.name || "",
        email: apiProfile.email || "",
        phone: apiProfile.phone || "",
        location: apiProfile.location || "",
        title: apiProfile.jobTitle || "",
        introText: apiProfile.profileSummary || "",
        
        // ✅ JO STRING-MUODOSSA
        education: typeof apiProfile.education === 'string' 
          ? apiProfile.education 
          : JSON.stringify(apiProfile.education || []),
        workExperience: typeof apiProfile.workExperience === 'string'
          ? apiProfile.workExperience
          : JSON.stringify(apiProfile.workExperience || []),
        
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
        enableRAG: enableRAG,
        skipQuestions: skipQuestions || false,
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
      input.skipQuestions = skipQuestions || false;
      input.answeredQuestions = answeredQuestions || [];
    }

    // ✅ KÄSITTELE VAHVISTUKSET (sama kuin ennen)
    if (confirmedViolations && Array.isArray(confirmedViolations)) {
      console.log(`✅ Processing ${confirmedViolations.length} confirmed violations`);
      
      const approvedItems = confirmedViolations
        .filter((v: any) => v.decision === 'approved' || v.decision === 'corrected')
        .map((v: any) => ({
          type: v.type,
          content: v.decision === 'corrected' ? v.correctedContent : v.content
        }));

      if (approvedItems.length > 0) {
        approvedItems.forEach((item: any) => {
          if (item.type === 'skill') {
            input.skills = input.skills 
              ? `${input.skills}, ${item.content}`
              : item.content;
          } else if (item.type === 'education') {
            input.education = input.education 
              ? `${input.education}\n${item.content}`
              : item.content;
          } else if (item.type === 'experience') {
            input.workExperience = input.workExperience 
              ? `${input.workExperience}\n${item.content}`
              : item.content;
          }
        });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // GENERATE CV
    // ════════════════════════════════════════════════════════════════

    console.log(`🤖 Generating CV...`);
    const result = await generateCVSafely(input);

    // Jos tarvitaan lisäkysymyksiä
    if (result.needsMoreInfo && result.questions) {
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: result.questions,
      });
    }

    // Validation
    const hasContent = 
      (result.html?.skills_section && result.html.skills_section.length > 20) ||
      (result.html?.experience_section && result.html.experience_section.length > 20);

    if (!hasContent) {
      console.error('❌ Generated CV has no content');
      return NextResponse.json(
        { error: "CV_GENERATION_INCOMPLETE", message: "CV sisältö puutteellinen" },
        { status: 500 }
      );
    }

    // ✅ GUARDIAN (jos ei skipValidation)
    const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;

    if (shouldRunGuardian) {
      console.log('🛡️ Running Master Guardian (oppiva)...');
      
      const { data: userProfile } = await supabaseAdmin
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);
      
      const fullCVText = `
        ${result.personal_description || ''}
        ${result.html?.skills_section || ''}
        ${result.html?.experience_section || ''}
        ${result.html?.education_section || ''}
      `.trim();
      
      const guardianCheck = await masterGuardianValidatorV2(
        fullCVText,
        groundTruth,
        'generation'
      );

      if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
        console.log('🚨 Guardian flagged violations - requesting confirmation');
        
        return NextResponse.json({
          success: false,
          needsConfirmation: true,
          violations: guardianCheck.violations,
          recommendation: guardianCheck.recommendation,
          message: 'CV sisältää tietoja joita ei löydy profiilista. Vahvista käyttö.'
        }, { status: 400 });
      }

      console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);
    }

    // ════════════════════════════════════════════════════════════════
    // SAVE CV
    // ════════════════════════════════════════════════════════════════

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
    title: `${input.name || "My"} CV - ${originalCvType || cvType}`, // ✅ Käytä originalCvType titlessa
        profile_image: input.profileImage || null,
        background_image: result.background_image || null,
        content: {
          cv_data: input,
          ai_data: {
            html: result.html,
            personal_description: result.personal_description,
            profile_image: result.profile_image || input.profileImage || null,
            background_image: result.background_image || null,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
    cvType: originalCvType || cvType, // ✅ Tallenna originalCvType
          }
        },
        profile_initials: result.profile_initials,
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        job_posting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : null,
        metadata: {
 cv_type: originalCvType || cvType, // ✅ Tallenna originalCvType!
      backend_cv_type: cvType,           // ✅ Säilytä backend tyyppi

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
        { error: "CV_SAVE_FAILED" },
        { status: 500 }
      );
    }

    // ════════════════════════════════════════════════════════════════
    // CONSUME TOKENS
    // ════════════════════════════════════════════════════════════════

    if (tier === "free") {
      const consumed = await consumeFreeUsage(userId, 'cv');
      
      if (!consumed) {
        console.error('⚠️ Failed to mark free CV as used, but CV was created');
      }

      console.log('✅ Free CV consumed');
    } else if (isActive && required > 0) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          tokens: currentTokens - required,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log(`✅ Consumed ${required} tokens`);
    }
    
    console.log(`🎉 CV generated successfully (${Date.now() - startTime}ms)`);

    return NextResponse.json({
      success: true,
      cvId: saved.id,
      id: saved.id,
      message: "CV generated successfully",
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
    });

  } catch (error) {
    console.error("❌ CV generation error:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED" },
      { status: 500 }
    );
  }
}