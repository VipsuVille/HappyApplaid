// app/api/generate-cv/route.ts - KORJATTU: cvType tallentuu oikein + Guardian ei blokkaa

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
      workExperience: toArray(profileData?.work_experience),
      education: toArray(profileData?.education),
      certificates: toArray(profileData?.certificates),
      portfolio_links: toArray(profileData?.portfolio_links),
      skills: toString(profileData?.skills),
      languages: toString(profileData?.languages),
      hobbies: toString(profileData?.hobbies),
      working_style: profileData?.working_style || profileData?.workingStyle || '',
      problem_solving: profileData?.problem_solving || profileData?.problemSolving || '',
      unique_strength: profileData?.unique_strength || profileData?.uniqueStrength || '',
      superpower: profileData?.superpower || '',
      energy_sources: profileData?.energy_sources || profileData?.energySources || '',
      learning_style: profileData?.learning_style || profileData?.learningStyle || '',
      team_role: profileData?.team_role || profileData?.teamRole || '',
      values_example: profileData?.values_example || profileData?.valuesExample || '',
      career_goals: profileData?.career_goals || profileData?.careerGoals || '',
      best_project_example: profileData?.best_project_example || profileData?.bestProjectExample || '',
      failure_lesson: profileData?.failure_lesson || profileData?.failureLesson || '',
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
    return profileData;
  }
}

// ════════════════════════════════════════════════════════════════
// API ROUTE HANDLER
// ════════════════════════════════════════════════════════════════

export async function POST(request: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Guardian Safe v3)");
  const ROUTE_VERSION = '2025-02-08-GUARDIAN-SAFE-V3';
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
      forceGenerate = false,
      jobPosting,
      enableRAG = false,
      language = "finnish",
      answeredQuestions,
      skipQuestions,
      confirmedViolations,
      skipValidation = false
    } = body;

    // ✅ KRIITTINEN DEBUG: Näytä mitä saatiin
    console.log(`📋 [ROUTE] Request received:`, {
      cvType: cvType,
      cvTypeType: typeof cvType,
      hasProfileData: !!profileData,
      hasAnsweredQuestions: !!answeredQuestions,
      skipQuestions: skipQuestions,
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
    // PREPARE INPUT
    // ════════════════════════════════════════════════════════════════

    let input: LangChainCVInput;

    if (profileData) {
      console.log("📋 Using profile from request");
      
      const apiProfile = convertProfileToApiFormat(profileData);
      
      input = {
        userId,
        cvId: `cv_${Date.now()}`,
        // ✅ KRIITTINEN: cvType SUORAAN requestista, ei muunnosta!
        cvType: cvType as 'simple' | 'technical' | 'creative',
        language,
        name: apiProfile.name || "",
        email: apiProfile.email || "",
        phone: apiProfile.phone || "",
        location: apiProfile.location || "",
        title: apiProfile.jobTitle || "",
        introText: apiProfile.profileSummary || "",
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
      // ✅ KRIITTINEN: Pakota cvType oikein
      input.cvType = cvType as 'simple' | 'technical' | 'creative';
      input.jobPosting = jobPosting;
      input.enableRAG = enableRAG;
      input.skipQuestions = skipQuestions || false;
      input.answeredQuestions = answeredQuestions || [];
    }

    // ✅ KRIITTINEN DEBUG: Varmista mitä lähetetään generaattorille
    console.log(`🎨 [ROUTE] Sending to generator:`, {
      'input.cvType': input.cvType,
      'cvType from request': cvType,
      hasName: !!input.name,
      hasSkills: !!input.skills,
    });

    // ✅ KÄSITTELE VAHVISTUKSET
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

    console.log(`🤖 [ROUTE] Generating CV with type: ${input.cvType}`);
    const result = await generateCVSafely(input);

    // Jos tarvitaan lisäkysymyksiä
    if (result.needsMoreInfo && result.questions) {
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: result.questions,
        // ✅ DEBUG: Shows what cvGenerator sees. Remove after fixing!
        _debug: (result as any)._debug || null,
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

    // ════════════════════════════════════════════════════════════════
    // ✅ GUARDIAN - TURVALLINEN: Ei blokkaa CV:n tallennusta
    // ════════════════════════════════════════════════════════════════

    const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;
    let guardianResult: { riskLevel: string; violations: any } | null = null;

    if (shouldRunGuardian) {
      console.log('🛡️ Running Master Guardian...');
      
      try {
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

        // ✅ MUUTOS: Logita mutta ÄLÄ blokkaa CV:n tallennusta
        if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
          console.warn('⚠️ Guardian flagged violations (not blocking):');
          console.warn('   Violations:', JSON.stringify(guardianCheck.violations));
          console.warn('   Recommendation:', guardianCheck.recommendation);
          
          // Tallenna tulos metadataan, mutta anna CV:n tallentua
          guardianResult = {
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
          };
        }

        console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);
      } catch (guardianError) {
        console.error('⚠️ Guardian check failed, continuing without validation:', guardianError);
        // ✅ Guardian-virhe EI estä CV:n tallennusta
      }
    }

    // ════════════════════════════════════════════════════════════════
    // ✅✅✅ SAVE CV - KRIITTINEN: cvType tallentuu KAIKKIALLE!
    // ════════════════════════════════════════════════════════════════

    // ✅ KRIITTINEN: Käytä AINA request body:n cvType, EI generaattorin palauttamaa
    const finalCvType = cvType || input.cvType || 'simple';
    
    console.log(`💾 [ROUTE] Saving CV with type: "${finalCvType}"`);
    console.log(`   - cvType from request body: "${cvType}"`);
    console.log(`   - input.cvType: "${input.cvType}"`);
    console.log(`   - finalCvType: "${finalCvType}"`);

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        // ✅ Title käyttää oikeaa tyyppiä
        title: `${input.name || "My"} CV - ${finalCvType}`,
        profile_image: input.profileImage || null,
        background_image: result.background_image || null,
        content: {
          cv_data: {
            ...input,
            // ✅ KRIITTINEN: Pakota cvType cv_data:an
            cvType: finalCvType,
          },
          ai_data: {
            html: result.html,
            personal_description: result.personal_description,
            // ✅ KRIITTINEN: Pakota cvType ai_data:an
            cvType: finalCvType,
            profile_image: result.profile_image || input.profileImage || null,
            background_image: result.background_image || null,
            profile_initials: result.profile_initials,
            fullTextContent: result.fullTextContent,
          },
          // ✅ Tallenna guardian-tulos metadataan jos löytyi ongelmia
          ...(guardianResult ? { guardian_check: guardianResult } : {}),
        },
        profile_initials: result.profile_initials,
        is_public: false,
        is_ats_optimized: action === "cv_ats_addon" || action === "cv_rag_addon",
        job_posting: (action === "cv_ats_addon" || action === "cv_rag_addon") ? jobPosting : null,
        metadata: {
          // ✅ KRIITTINEN: Pakota cvType metadataan
          cv_type: finalCvType,
          action: action,
          tier: tier,
          generation_time: Date.now() - startTime,
          // ✅ Guardian-tulos metadataan
          ...(guardianResult ? { guardian_risk: guardianResult.riskLevel } : {}),
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

    // ✅ VARMISTUS DEBUG
    console.log(`✅ [ROUTE] CV saved with ID: ${saved.id}`);
    console.log(`   - Title: "${input.name || "My"} CV - ${finalCvType}"`);
    console.log(`   - metadata.cv_type: "${finalCvType}"`);
    console.log(`   - content.ai_data.cvType: "${finalCvType}"`);
    console.log(`   - content.cv_data.cvType: "${finalCvType}"`);

    // ════════════════════════════════════════════════════════════════
    // CONSUME TOKENS
    // ════════════════════════════════════════════════════════════════

    if (tier === "free") {
      const consumed = await consumeFreeUsage(userId, 'cv');
      if (!consumed) {
        console.error('⚠️ Failed to mark free CV as used');
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
    
    console.log(`🎉 CV generated successfully (${Date.now() - startTime}ms) - Type: ${finalCvType}`);

    return NextResponse.json({
      success: true,
      cvId: saved.id,
      id: saved.id,
      message: "CV generated successfully",
      tokensUsed: required,
      tokensRemaining: tier !== "free" ? currentTokens - required : 0,
      // ✅ Kerro frontendille jos guardian löysi jotain
      ...(guardianResult ? { 
        guardianWarning: true,
        guardianRisk: guardianResult.riskLevel,
      } : {}),
    });

  } catch (error) {
    console.error("❌ CV generation error:", error);
    return NextResponse.json(
      { error: "GENERATION_FAILED" },
      { status: 500 }
    );
  }
}