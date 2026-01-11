// app/api/generate-cv/route.ts - TÄYDELLINEN OPPIVA VERSIO

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCVSafely } from "@/lib/langchain/cvGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { transformDBToLangChain, type LangChainCVInput } from "@/lib/profileDataTransform";
import { ACTION_COSTS, type TokenAction } from "@/lib/domain/tokens";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import crypto from 'crypto';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";

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

// ✅ TALLENNA KÄYTTÄJÄN PÄÄTÖS VIOLATION:ISTA
async function saveViolationResponse(
  userId: string,
  violationType: string,
  originalContent: string,
  userDecision: 'approved' | 'rejected' | 'corrected',
  correctedContent?: string
): Promise<boolean> {
  try {
    const questionText = `AI ehdotti: "${originalContent}" (${violationType})`;
    const questionId = generateQuestionId(questionText);
    
    let answer: string;
    if (userDecision === 'approved') {
      answer = `Hyväksytty sellaisenaan: ${originalContent}`;
    } else if (userDecision === 'rejected') {
      answer = `Hylätty kokonaan`;
    } else {
      answer = correctedContent || originalContent;
    }

    const { error } = await supabaseAdmin
      .from('user_responses')
      .upsert({
        user_id: userId,
        question_id: questionId,
        question_text: questionText,
        answer: answer,
        answer_length: answer.length,
        question_category: 'cv',
        asked_in_context: 'cv_validation',
        job_title_context: violationType,
        updated_at: new Date().toISOString(),
        metadata: {
          violation_type: violationType,
          user_decision: userDecision,
          original_content: originalContent,
          corrected_content: correctedContent
        }
      }, {
        onConflict: 'user_id,question_id'
      });

    if (error) {
      console.error('Failed to save violation response:', error);
      return false;
    }
    
    console.log(`✅ Saved user decision: ${userDecision} for "${originalContent}"`);
    return true;
  } catch (error) {
    console.error('Error in saveViolationResponse:', error);
    return false;
  }
}

// ✅ PÄIVITÄ PROFIILIA HYVÄKSYTYILLÄ TIEDOILLA
async function updateProfileWithApprovedItems(
  userId: string,
  approvedItems: Array<{ type: string; content: string }>
): Promise<void> {
  try {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!profile) return;

    const skills = approvedItems.filter(i => i.type === 'skill').map(i => i.content);
    const education = approvedItems.filter(i => i.type === 'education').map(i => i.content);
    const experience = approvedItems.filter(i => i.type === 'experience').map(i => i.content);

    const updates: any = {};

    if (skills.length > 0) {
      const existingSkills = profile.skills || '';
      const newSkills = skills.filter(s => !existingSkills.includes(s));
      if (newSkills.length > 0) {
        updates.skills = existingSkills 
          ? `${existingSkills}, ${newSkills.join(', ')}`
          : newSkills.join(', ');
      }
    }

    if (education.length > 0) {
      const existingEdu = profile.education || '';
      updates.education = existingEdu
        ? `${existingEdu}\n\n${education.join('\n')}`
        : education.join('\n');
    }

    if (experience.length > 0) {
      const existingExp = profile.work_experience || '';
      updates.work_experience = existingExp
        ? `${existingExp}\n\n${experience.join('\n')}`
        : experience.join('\n');
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId);
      
      console.log(`✅ Updated profile with ${Object.keys(updates).length} fields`);
    }
  } catch (error) {
    console.error('Error updating profile:', error);
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

  return { isValid: true };
}

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 CV Generation API (Oppiva Versio)");

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
      confirmedViolations, // ✅ UUSI: Käyttäjän päätökset
      skipValidation = false
    } = body;

    console.log(`📋 Request:`, {
      cvType,
      hasConfirmedViolations: !!confirmedViolations,
      skipValidation,
      hasAnsweredQuestions: !!answeredQuestions
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

    const tier = (subscription?.plan_type || "free") as "free" | "basic" | "semi-pro" | "pro";
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

    // ════════════════════════════════════════════════════════════════
    // ✅ KÄSITTELE KÄYTTÄJÄN VAHVISTUKSET
    // ════════════════════════════════════════════════════════════════

    if (confirmedViolations && Array.isArray(confirmedViolations)) {
      console.log(`✅ Processing ${confirmedViolations.length} confirmed violations`);
      
      // Tallenna jokainen päätös user_responses-tauluun
      for (const violation of confirmedViolations) {
        await saveViolationResponse(
          userId,
          violation.type, // 'skill' | 'education' | 'experience'
          violation.content,
          violation.decision, // 'approved' | 'rejected' | 'corrected'
          violation.correctedContent
        );
      }

      // Päivitä profiilia hyväksytyillä/korjatuilla
      const approvedItems = confirmedViolations
        .filter((v: any) => v.decision === 'approved' || v.decision === 'corrected')
        .map((v: any) => ({
          type: v.type,
          content: v.decision === 'corrected' ? v.correctedContent : v.content
        }));

      if (approvedItems.length > 0) {
        await updateProfileWithApprovedItems(userId, approvedItems);
        
        // Lisää myös input-dataan
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

    const validation = validateCVContent(result);
    
    if (!validation.isValid) {
      console.error(`❌ CV validation failed: ${validation.reason}`);
      
      return NextResponse.json({
        error: "CV_GENERATION_INCOMPLETE",
        message: `CV-sisältö on puutteellinen: ${validation.reason}`,
      }, { status: 500 });
    }

// ════════════════════════════════════════════════════════════════
// ✅ MASTER GUARDIAN CHECK (Oppiva + skipValidation)
// ════════════════════════════════════════════════════════════════

// ✅ KRIITTINEN: Ohita Guardian jos käyttäjä on vahvistanut
const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;

if (shouldRunGuardian) {
  console.log('🛡️ Running Master Guardian (oppiva)...');
  
  const { data: userProfile } = await supabaseAdmin
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Ground truth + oppimishistoria
  const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);
  
  const fullCVText = `
    ${result.personal_description || ''}
    ${result.html?.skills_section || ''}
    ${result.html?.experience_section || ''}
    ${result.html?.education_section || ''}
  `.trim();
  
  const guardianCheck = await masterConsistencyCheckAI(
    fullCVText,
    groundTruth,
    'generation'
  );

  // 🚨 Guardian pysäyttää vain jos käyttäjä EI ole vielä vahvistanut
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
} else {
  console.log('🟢 Guardian SKIPPED (user confirmed or skipValidation=true)');
}


    // ════════════════════════════════════════════════════════════════
    // SAVE CV
    // ════════════════════════════════════════════════════════════════

    const { data: saved, error: saveError } = await supabaseAdmin
      .from("cvs")
      .insert({
        user_id: userId,
        title: `${input.name || "My"} CV - ${cvType}`,
        profile_image: input.profileImage || null,
        background_image: result.background_image || null,
    content: {
  cv_data: input,
  ai_data: {
    html: result.html,
    personal_description: result.personal_description,
    profile_image: result.profile_image || input.profileImage || null, // ✅ OIKEIN
    background_image: result.background_image || null, // ✅ OIKEIN
    profile_initials: result.profile_initials,
    fullTextContent: result.fullTextContent,
    cvType: cvType,
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
  // Kuluta tokenit maksaville
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