// app/api/generate-cover-letter/route.ts - KORJATTU TOKEN-LOGIIKKA

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterV1 } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate";
import { getTierFeatures } from "@/lib/stripe/subscriptions";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Työhakemus";
  const firstLine = jobDescription.split('\n')[0].trim();
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Työhakemus";
  }
  return firstLine.substring(0, 80).trim();
}

export async function POST(req: Request) {
  // ✅ 0. AUTH
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ 1. MÄÄRITÄ ACTION (backend lukitsee tämän)
  const action: TokenAction = 'cover_letter_v1';

  // ✅ 2. HAE SUBSCRIPTION + TOKENIT (ENNEN AI-TYÖTÄ)
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('subscriptions')
    .select('plan_type, tokens, status, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (subError || !subscription) {
    return NextResponse.json(
      { error: 'SUBSCRIPTION_REQUIRED', message: 'Tilaus vaaditaan' },
      { status: 403 }
    );
  }

  // ✅ 3. TIER + TOKEN VALIDATION (TÄRKEIN KOHTA 🔒)
  const tier = subscription.plan_type as 'free' | 'basic' | 'semi-pro' | 'pro';
  const isActive = subscription.is_active === true && 
                   ['active', 'trialing'].includes(subscription.status || '');

  // Tarkista onko action sallittu tälle tierille
  const required = ACTION_COSTS[tier]?.[action];

  if (required === undefined) {
    return NextResponse.json(
      { 
        error: 'ACTION_NOT_ALLOWED',
        message: `V1 hakukirje ei saatavilla ${tier}-tasolla`,
        currentTier: tier
      },
      { status: 403 }
    );
  }

  // Tarkista tokenit (vain paid tierille)
  if (tier !== 'free' && isActive && subscription.tokens < required) {
    return NextResponse.json(
      { 
        error: 'NOT_ENOUGH_TOKENS',
        message: `Tarvitaan ${required} tokenia, sinulla on ${subscription.tokens}`,
        tokensRequired: required,
        tokensAvailable: subscription.tokens
      },
      { status: 403 }
    );
  }

  console.log(`✅ Token check passed: ${tier} tier, ${required} tokens required`);

  // ✅ 4. NYT VASTA ALOITETAAN AI-TYÖTÄ
  try {
    const requestData = await req.json();

    const {
      profileData,
      jobDescription: jobDesc,
      personalNotes: notes,
      language,
      style,
      answeredQuestions,
      skipQuestions,
    } = requestData;

    const {
      jobDescription,
      personalNotes,
      name,
      email,
      phone,
      jobTitle,
      education,
      workExperience,
      skills,
    } = requestData;

    const finalJobDescription = jobDescription || jobDesc;
    const finalPersonalNotes = personalNotes || notes;

    if (!finalJobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    const extractedJobTitle = extractJobTitleFromDescription(finalJobDescription);

    console.log(`📝 Generate request:`, {
      userId,
      tier,
      action,
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
      skipQuestions: !!skipQuestions
    });

    // HAE TIER-OMINAISUUDET
    const tierFeatures = await getTierFeatures(tier);

    if (!tierFeatures.canUseV1) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED", message: "V1 Generator ei käytettävissä" },
        { status: 403 }
      );
    }

    console.log(`🎫 User tier: ${tierFeatures.name}`);
    console.log(`   - V1: ${tierFeatures.canUseV1 ? '✅' : '❌'}`);
    console.log(`   - RAG: ${tierFeatures.canUseRAG ? '✅' : '❌'}`);

    // HAE GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    
    console.log(`🛡️ Ground Truth extracted`);

    // MERGE VASTAUKSET
    let enhancedPersonalNotes = finalPersonalNotes || '';
    
    if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
      console.log(`📝 Integrating ${Object.keys(answeredQuestions).length} answers`);
      
      const answersText = Object.entries(answeredQuestions)
        .map(([questionId, answer]) => `Q: ${questionId}\nA: ${answer}`)
        .join('\n\n');
      
      enhancedPersonalNotes = finalPersonalNotes 
        ? `${finalPersonalNotes}\n\n--- VASTAUKSET KYSYMYKSIIN ---\n${answersText}`
        : `VASTAUKSET KYSYMYKSIIN:\n${answersText}`;
    }

    // PREPARE INPUT
    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        jobTitle: profileData.jobTitle,
        education: apiFormat.education,
        workExperience: apiFormat.workExperience,
        skills: profileData.skills,
        language: language || "finnish",
        style: style || "formal",
        workingStyle: profileData.workingStyle,
        problemSolving: profileData.problemSolving,
        energySources: profileData.energySources,
        uniqueStrength: profileData.uniqueStrength,
        learningStyle: profileData.learningStyle,
        teamRole: profileData.teamRole,
        valuesExample: profileData.valuesExample,
        superpower: profileData.superpower,
        careerGoals: profileData.careerGoals,
        bestProjectExample: profileData.bestProjectExample,
        failureLesson: profileData.failureLesson,
        
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth),
        skipQuestions: skipQuestions || !!answeredQuestions
      };
    } else {
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name,
        email,
        phone,
        jobTitle,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
        
        enableRAG: tierFeatures.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth),
        skipQuestions: skipQuestions || !!answeredQuestions
      };
    }

    // ✅ 5. GENEROI V1
    console.log(`📝 Generating V1 cover letter...`);
    
    const coverLetterData = await generateCoverLetterV1(coverLetterInput);

    // JOS KYSYMYKSIÄ
    if (!coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        reason: 'AI tarvitsee vahvistusta varmistaakseen totuudenmukaisuuden'
      });
    }

    if (coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.warn(`⚠️ AI kysyi kysymyksiä vaikka skipQuestions=true`);
    }

    // MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');
    
    if (!coverLetterData.content) {
      throw new Error('Cover letter content is undefined');
    }
    
    const guardianCheck = await masterConsistencyCheckAI(
      coverLetterData.content,
      groundTruth,
      'generation'
    );

    if (guardianCheck.riskLevel === 'danger') {
      console.error('🚨 GUARDIAN REJECTED');
      
      return NextResponse.json({
        error: 'CONSISTENCY_VIOLATION',
        message: 'Sisältö ei täytä laatuvaatimuksia',
        violations: guardianCheck.violations,
        recommendation: guardianCheck.recommendation
      }, { status: 400 });
    }

    console.log(`✅ Guardian: ${guardianCheck.riskLevel}`);

    // ✅ 6. TALLENNA
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedJobTitle,
        language: coverLetterInput.language,
        content: {
          job_description: finalJobDescription,
          cover_letter_content: coverLetterData.content,
          signature: coverLetterData.signature,
          body: coverLetterData.content,
          applicant_info: {
            name: coverLetterInput.name,
            email: coverLetterInput.email,
            phone: coverLetterInput.phone,
            jobTitle: coverLetterInput.jobTitle,
            education: coverLetterInput.education,
            workExperience: coverLetterInput.workExperience,
            skills: coverLetterInput.skills,

            ...(profileData && {
              personalityTraits: {
                workingStyle: profileData.workingStyle,
                uniqueStrength: profileData.uniqueStrength,
                energySources: profileData.energySources,
                teamRole: profileData.teamRole,
                superpower: profileData.superpower,
                problemSolving: profileData.problemSolving,
                learningStyle: profileData.learningStyle,
                valuesExample: profileData.valuesExample,
                careerGoals: profileData.careerGoals,
                bestProjectExample: profileData.bestProjectExample,
                failureLesson: profileData.failureLesson,
              },
            }),
          },
        },
        ai_data: {
          html: { content: coverLetterData.content },
          styles: {
            main_style: 'font-family: "Merriweather", serif; line-height: 1.7;',
          },
          
          tier: tierFeatures.name,
          cost_per_letter: required,
          
          ground_truth: groundTruth,
          
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          
          rag_enabled: tierFeatures.canUseRAG,
          
          personality_analysis: {
            job_match_score: coverLetterData.job_match_score || 7,
            personality_hooks: coverLetterData.personality_hooks || [],
            key_differentiators: coverLetterData.key_differentiators || [],
            data_quality: coverLetterData.data_quality || null,
          },
          
          generation_params: {
            style: coverLetterInput.style,
            language: coverLetterInput.language,
            tier: tierFeatures.name,
            answered_questions: answeredQuestions || {},
            questions_count: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
            skip_questions: coverLetterInput.skipQuestions,
            generator_version: 'v1'
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      throw insertError;
    }

    if (!coverLetter || !coverLetter.id) {
      console.error('❌ Cover letter ID missing after insert');
      throw new Error('Cover letter saved but ID is missing');
    }

    console.log(`✅ Cover letter saved: ${coverLetter.id}`);

    // ✅ 7. KULUTA TOKENIT - VASTA KUN KAIKKI ONNISTUI
    if (tier !== 'free' && isActive && required > 0) {
      console.log(`💰 Consuming ${required} tokens...`);
      
      const { error: tokenError } = await supabaseAdmin
        .from('subscriptions')
        .update({ 
          tokens: subscription.tokens - required,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (tokenError) {
        console.error('⚠️ Token consumption failed:', tokenError);
        // Älä pysäytä requestia - kirje on jo luotu
      } else {
        console.log(`✅ Tokens consumed. Remaining: ${subscription.tokens - required}`);
      }
    }

    // ✅ 8. PALAUTA SUCCESS
    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedJobTitle,
      tier: tierFeatures.name,
      tokensUsed: required,
      tokensRemaining: tier !== 'free' ? subscription.tokens - required : 0,
      features: {
        v1: tierFeatures.canUseV1,
        v2: tierFeatures.canUseV2,
        rag: tierFeatures.canUseRAG,
        ats: tierFeatures.canUseATS
      },
      guardianCheck: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        hasWarnings: guardianCheck.riskLevel === 'warning'
      },
      personality_insights: {
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
        key_differentiators: coverLetterData.key_differentiators,
      },
    });

  } catch (error) {
    console.error("❌ Error generating cover letter:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}