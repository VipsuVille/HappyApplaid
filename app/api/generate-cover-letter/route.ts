// app/api/generate-cover-letter/route.ts - KORJATTU VERSIO

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { generateGeneralCoverLetter } from "@/lib/langchain/generalCoverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { extractGroundTruthAI, masterGuardianValidatorV2 } from "@/lib/ats/masterGuardian";
import { analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import { checkFreeUsage, consumeFreeUsage } from "@/lib/domain/freeUsageGuard";
import crypto from 'crypto';

export const maxDuration = 60;

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function generateQuestionId(questionText: string): string {
  return crypto.createHash('sha256').update(questionText.toLowerCase().trim()).digest('hex').substring(0, 16);
}

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
    const answer = userDecision === 'approved' 
      ? `Hyväksytty: ${originalContent}` 
      : (userDecision === 'rejected' ? `Hylätty` : (correctedContent || originalContent));

    await supabaseAdmin.from('user_responses').upsert({
      user_id: userId,
      question_id: questionId,
      question_text: questionText,
      answer,
      question_category: 'cover_letter',
      asked_in_context: 'cl_validation',
      metadata: { 
        violation_type: violationType, 
        user_decision: userDecision, 
        original_content: originalContent 
      }
    }, { onConflict: 'user_id,question_id' });
    
    return true;
  } catch (error) {
    console.error('❌ Error in saveViolationResponse:', error);
    return false;
  }
}

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

    const updates: any = {};
    approvedItems.forEach(item => {
      if (item.type === 'skill') {
        const existing = profile.skills || '';
        if (!existing.includes(item.content)) {
          updates.skills = existing ? `${existing}, ${item.content}` : item.content;
        }
      } else if (item.type === 'education') {
        updates.education = profile.education 
          ? `${profile.education}\n\n${item.content}` 
          : item.content;
      } else if (item.type === 'experience') {
        updates.work_experience = profile.work_experience 
          ? `${profile.work_experience}\n\n${item.content}` 
          : item.content;
      }
    });

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('user_profiles')
        .update(updates)
        .eq('user_id', userId);
      
      console.log(`✅ Profile updated with ${Object.keys(updates).length} learned fields`);
    }
  } catch (error) { 
    console.error('❌ Error updating profile:', error); 
  }
}

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Hakukirje";
  return jobDescription.split('\n')[0].substring(0, 80).trim() || "Hakukirje";
}

// ✅ UUSI: Muunna array-kentät stringeiksi
function formatWorkExperience(experiences: any[]): string {
  if (!Array.isArray(experiences) || experiences.length === 0) return "";
  
  return experiences.map(exp => {
    const parts = [];
    if (exp.position) parts.push(exp.position);
    if (exp.company) parts.push(`@ ${exp.company}`);
    if (exp.duration) parts.push(`(${exp.duration})`);
    
    let result = parts.join(' ');
    
    if (exp.description) result += `\n${exp.description}`;
    if (exp.achievements) result += `\nSaavutukset: ${exp.achievements}`;
    
    return result;
  }).join('\n\n');
}

function formatEducation(education: any[]): string {
  if (!Array.isArray(education) || education.length === 0) return "";
  
  return education.map(edu => {
    const parts = [];
    if (edu.degree) parts.push(edu.degree);
    if (edu.school) parts.push(`@ ${edu.school}`);
    if (edu.year) parts.push(`(${edu.year})`);
    if (edu.isOngoing) parts.push('- Kesken');
    
    return parts.join(' ');
  }).join('\n');
}

function formatLanguages(languages: any[]): string {
  if (!Array.isArray(languages) || languages.length === 0) return "";
  
  return languages.map(lang => 
    `${lang.language || ''}: ${lang.level || ''}`
  ).join(', ');
}

// ════════════════════════════════════════════════════════════════
// MAIN ROUTE
// ════════════════════════════════════════════════════════════════

export async function POST(req: Request) {
  console.log(`🚀 [COVER-LETTER-API] POST Request started`);
  
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      jobDescription,
      personalNotes,
      language = "finnish",
      style = "formal",
      letterType, // 'job_specific' | 'general'
      letterVersion, // 'v1' | 'v2'
      targetIndustry,
      targetRole,
      skipQuestions = false,
      confirmedViolations,
      skipValidation = false,
      enableRAG = false // ← RAG (default: false)
    } = body;

    console.log(`📝 Type: ${letterType}, Version: ${letterVersion}, Language: ${language}, Style: ${style}`);

    // ════════════════════════════════════════════════════════════════
    // 1. TOKENS & SUBSCRIPTION
    // ════════════════════════════════════════════════════════════════

    let action: TokenAction = letterType === 'general' 
      ? 'cover_letter_general' 
      : (letterVersion === 'v2' ? 'cover_letter_v2' : 'cover_letter_v1');
    
    const { data: sub } = await supabaseAdmin
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    const tier = (sub?.plan_type || 'free') as 'free' | 'basic' | 'premium';
    const required = ACTION_COSTS[tier]?.[action] || 0;

    console.log(`💳 Tier: ${tier}, Action: ${action}, Cost: ${required}`);

    // Free tier check
    if (tier === 'free') {
      const freeStatus = await checkFreeUsage(userId, 'cover_letter');
      if (!freeStatus.canUse) {
        return NextResponse.json({ 
          error: freeStatus.reason 
        }, { status: 403 });
      }
    } else if (sub?.tokens < required) {
      return NextResponse.json({ 
        error: 'NOT_ENOUGH_TOKENS', 
        required 
      }, { status: 403 });
    }

    // ════════════════════════════════════════════════════════════════
    // 2. HANDLE CONFIRMATIONS (Learning)
    // ════════════════════════════════════════════════════════════════

    if (confirmedViolations?.length) {
      console.log(`🧠 Learning from ${confirmedViolations.length} confirmed items`);
      
      for (const v of confirmedViolations) {
        await saveViolationResponse(
          userId, 
          v.type, 
          v.content, 
          v.decision, 
          v.correctedContent
        );
      }
      
      const approved = confirmedViolations
        .filter((v: any) => v.decision === 'approved' || v.decision === 'corrected')
        .map((v: any) => ({ 
          type: v.type, 
          content: v.decision === 'corrected' ? v.correctedContent : v.content 
        }));
      
      if (approved.length) {
        await updateProfileWithApprovedItems(userId, approved);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 3. FETCH PROFILE & GROUND TRUTH
    // ════════════════════════════════════════════════════════════════

    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (!userProfile) {
      return NextResponse.json({ 
        error: 'PROFILE_NOT_FOUND',
        message: 'Täytä profiili ensin'
      }, { status: 400 });
    }

    // ✅ MUUNNA ARRAY-KENTÄT STRINGEIKSI
    const workExperienceText = Array.isArray(userProfile.work_experience)
      ? formatWorkExperience(userProfile.work_experience)
      : (userProfile.work_experience || "");
    
    const educationText = Array.isArray(userProfile.education)
      ? formatEducation(userProfile.education)
      : (userProfile.education || "");
    
    const languagesText = Array.isArray(userProfile.languages)
      ? formatLanguages(userProfile.languages)
      : (userProfile.languages || "");

    console.log(`📊 Profile loaded - Work: ${workExperienceText.length} chars, Edu: ${educationText.length} chars`);

    const groundTruth = await extractGroundTruthAI(userProfile || {}, userId);

    const input = {
      userId,
      name: userProfile?.name || "Hakija",
      email: userProfile?.email,
      phone: userProfile?.phone,
      
      // ✅ MUUNNETUT KENTÄT
      workExperience: workExperienceText,
      education: educationText,
      skills: userProfile?.skills || "",
      languages: languagesText,
      
      // PERSOONALLISUUS
      workingStyle: userProfile?.working_style || "",
      problemSolving: userProfile?.problem_solving || "",
      energySources: userProfile?.energy_sources || "",
      uniqueStrength: userProfile?.unique_strength || "",
      learningStyle: userProfile?.learning_style || "",
      teamRole: userProfile?.team_role || "",
      valuesExample: userProfile?.values_example || "",
      superpower: userProfile?.superpower || "",
      
      // LISÄTIEDOT
      careerGoals: userProfile?.career_goals || "",
      bestProjectExample: userProfile?.best_project_example || "",
      failureLesson: userProfile?.failure_lesson || "",
      
      // ASETUKSET
      targetIndustry: targetIndustry || "",
      targetRole: targetRole || "",
      language,
      style,
      enableRAG, // ← Välitetään generaattorille
      
      // JOB-SPECIFIC
      jobDescription: jobDescription || "",
      personalNotes: personalNotes || "",
      
      // GUARDIAN
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
      skipQuestions
    };

    // ════════════════════════════════════════════════════════════════
    // 4. GENERATE COVER LETTER
    // ════════════════════════════════════════════════════════════════

    console.log(`📝 Generating ${letterType} ${letterVersion || 'v1'}...`);

    let result: any;
    
    if (letterType === 'general') {
      result = await generateGeneralCoverLetter(input);
    } else {
      result = letterVersion === 'v2' 
        ? await generateCoherentCoverLetter(input) 
        : await generateCoverLetterV1(input);
    }

    // Return questions if needed
    if (result.questions?.length && !skipQuestions) {
      return NextResponse.json({ 
        success: true, 
        needsMoreInfo: true, 
        questions: result.questions 
      });
    }

    const finalContent = result.content || result.fullText;

    if (!finalContent || finalContent.trim().length === 0) {
      throw new Error('AI ei generoinut sisältöä');
    }

    // ════════════════════════════════════════════════════════════════
    // 5. MASTER GUARDIAN (Only if not already confirmed)
    // ════════════════════════════════════════════════════════════════

    const shouldRunGuardian = !skipValidation && !confirmedViolations?.length;
    
    if (shouldRunGuardian) {
      console.log('🛡️ Running Master Guardian...');
      
      const guardianCheck = await masterGuardianValidatorV2(
        finalContent, 
        groundTruth, 
        'generation'
      );

      if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
        return NextResponse.json({
          success: false,
          needsConfirmation: true,
          violations: guardianCheck.violations,
          recommendation: guardianCheck.recommendation,
          message: 'Hakukirjeessä on tietoja, joita ei löydy profiilistasi.'
        }, { status: 400 });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 6. ATS ANALYSIS (V2 only)
    // ════════════════════════════════════════════════════════════════

    let atsAnalysis = null;
    
    if (letterVersion === 'v2' && jobDescription) {
      try {
        atsAnalysis = await analyzeRealisticATSUniversal(
          jobDescription, 
          finalContent
        );
        console.log(`📊 ATS Score: ${atsAnalysis.score}%`);
      } catch (error) {
        console.error('⚠️ ATS analysis failed:', error);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 7. SAVE COVER LETTER
    // ════════════════════════════════════════════════════════════════

    const { data: saved, error: saveErr } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: letterType === 'general' 
          ? `${input.name} - Yleinen` 
          : extractJobTitleFromDescription(jobDescription),
        language,
        content: { 
          body: finalContent, 
          signature: result.signature || input.name || ""
        },
        ai_data: { 
          tier, 
          letter_type: letterType, 
          ats_analysis: atsAnalysis, 
          generator_version: letterVersion || 'v1',
          style,
          target_industry: targetIndustry,
          target_role: targetRole,
          key_highlights: result.keyHighlights
        }
      })
      .select()
      .single();

    if (saveErr) throw saveErr;

    console.log(`✅ Cover letter saved: ${saved.id}`);

    // ════════════════════════════════════════════════════════════════
    // 8. CONSUME TOKENS
    // ════════════════════════════════════════════════════════════════

    if (tier === 'free') {
      await consumeFreeUsage(userId, 'cover_letter');
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .update({ tokens: sub.tokens - required })
        .eq('user_id', userId);
    }

    return NextResponse.json({ 
      success: true, 
      coverLetterId: saved.id, 
      atsResults: atsAnalysis 
    });

  } catch (error: any) {
    console.error("❌ ERROR:", error);
    return NextResponse.json({ 
      error: error.message || "INTERNAL_ERROR" 
    }, { status: 500 });
  }
}