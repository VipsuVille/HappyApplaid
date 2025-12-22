// app/api/generate-cover-letter-v2/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { getTierFeatures } from "@/lib/stripe/subscriptions";
import { detectATSUsageAI, analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";
import { ACTION_COSTS, TokenAction } from '@/lib/domain/tokens';
import crypto from 'crypto';

// --- APUFUNKTIOT ---

function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Työhakemus";
  const firstLine = jobDescription.split('\n')[0].trim();
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Työhakemus";
  }
  return firstLine.substring(0, 80).trim();
}

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
  context: string,
  jobTitle: string
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
        question_category: 'cover_letter',
        asked_in_context: context,
        job_title_context: jobTitle,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,question_id'
      });

    if (error) {
      console.error('Failed to save response:', error);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error in saveUserResponse:', error);
    return false;
  }
}

// --- MAIN ROUTE ---

export async function POST(req: Request) {
  // ✅ 0. AUTH
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    console.error('❌ No userId from auth()');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`✅ Auth OK: ${userId}`);

  // ✅ 1. MÄÄRITÄ ACTION
  const action: TokenAction = 'cover_letter_v2';

  // ✅ 2. HAE SUBSCRIPTION + TOKENIT
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

  // ✅ 3. TIER + TOKEN VALIDATION
  const tier = subscription.plan_type as 'free' | 'basic' | 'semi-pro' | 'pro';
  const isActive = subscription.is_active === true && 
                   ['active', 'trialing'].includes(subscription.status || '');

  const required = ACTION_COSTS[tier]?.[action];

  if (required === undefined) {
    return NextResponse.json(
      { 
        error: 'ACTION_NOT_ALLOWED',
        message: `V2 ATS hakukirje vaatii Semi-Pro tai Pro -tason`,
        currentTier: tier,
        requiredTier: 'semi-pro'
      },
      { status: 403 }
    );
  }

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

  // ✅ 4. ALOITETAAN PROSESSI
  try {
    const requestData = await req.json();

    const {
      profileData,
      jobDescription: jobDesc,
      personalNotes: notes,
      language,
      style,
      answeredQuestions, // ⚠️ TÄMÄ ON ARRAY [{id, question, answer}, ...]
      skipQuestions,
    } = requestData;

    // Fallback muuttujat, jos profileData puuttuu
    const {
      name,
      email,
      phone,
      education,
      workExperience,
      skills,
    } = requestData;

    const finalJobDescription = requestData.jobDescription || jobDesc;
    const finalPersonalNotes = requestData.personalNotes || notes;

    if (!finalJobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    const extractedJobTitle = extractJobTitleFromDescription(finalJobDescription);

    // KORJAUS 1: Tarkista Arrayn pituus, ei Object.keys
    const shouldSkipQuestions = skipQuestions === true || 
                                (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0);

    console.log(`📝 V2 Generate request:`, {
      userId,
      tier,
      action,
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: Array.isArray(answeredQuestions) ? answeredQuestions.length : 0,
      skipQuestions: shouldSkipQuestions
    });

    const tierFeatures = await getTierFeatures(tier);

    if (!tierFeatures.canUseV2) {
      return NextResponse.json(
        { 
          error: "UPGRADE_REQUIRED", 
          message: "V2 ATS Generator vaatii Semi-Pro tai Pro -tason",
          currentTier: tierFeatures.name,
          requiredTier: "Semi-Pro"
        },
        { status: 403 }
      );
    }

    // HAE GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    
    // TARKISTA ATS-KÄYTTÖ
    const atsDetection = await detectATSUsageAI(finalJobDescription);
    
    // ✅ KORJAUS 2: MERGE VASTAUKSET (Array käsittely)
    let enhancedPersonalNotes = finalPersonalNotes || '';
    
    if (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0) {
      console.log(`📝 Integrating ${answeredQuestions.length} answers`);
      
      // Käytä .map() koska data on array, ei object
      const answersText = answeredQuestions
        .map((item: any) => `Kysymys: "${item.question}"\nVastaus: "${item.answer}"`)
        .join('\n\n');
      
      enhancedPersonalNotes = finalPersonalNotes 
        ? `${finalPersonalNotes}\n\n--- VASTAUKSET LISÄKYSYMYKSIIN ---\n${answersText}`
        : `--- VASTAUKSET LISÄKYSYMYKSIIN ---\n${answersText}`;
    }

    // PREPARE INPUT
    let coverLetterInput;
    const commonInput = {
      jobDescription: finalJobDescription,
      personalNotes: enhancedPersonalNotes, // Tässä on nyt yhdistetty teksti
      language: language || "finnish",
      style: style || "formal",
      enableRAG: tierFeatures.canUseRAG,
      allowedSkills: groundTruth.technicalSkills,
      forbiddenClaims: groundTruth.cannotClaim,
      skipQuestions: shouldSkipQuestions,
      answeredQuestions: answeredQuestions || [], // Välitä array sellaisenaan
      userId: userId
    };

    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
        ...commonInput,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
        education: apiFormat.education,
        workExperience: apiFormat.workExperience,
        skills: profileData.skills,
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
      };
    } else {
      coverLetterInput = {
        ...commonInput,
        name,
        email,
        phone,
        education,
        workExperience,
        skills,
      };
    }

    // ✅ 5. GENEROI V2 ATS
    console.log(`📝 Generating V2 ATS cover letter...`);
    
    const coverLetterData = await generateCoherentCoverLetter(coverLetterInput);

    // JOS AI HALUAA KYSYÄ LISÄÄ (vain jos ei skipattu)
    if (!coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        reason: 'AI tarvitsee vahvistusta ATS-optimointiin'
      });
    }

    if (!coverLetterData.content || coverLetterData.content.trim().length === 0) {
      console.error('❌ No content generated');
      return NextResponse.json({
        error: 'GENERATION_FAILED',
        message: 'AI ei generoinut sisältöä'
      }, { status: 500 });
    }

    // ✅ KORJAUS 3: TALLENNA VASTAUKSET (Array logic)
    if (answeredQuestions && Array.isArray(answeredQuestions) && answeredQuestions.length > 0) {
      console.log(`💾 Saving ${answeredQuestions.length} answers...`);
      
      const savePromises = answeredQuestions.map((item: any) => 
        saveUserResponse(
          userId,
          item.question, // Nyt saadaan oikea teksti
          item.answer,   // Ja oikea vastaus
          'cover_letter_v2',
          extractedJobTitle
        )
      );

      const results = await Promise.allSettled(savePromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`✅ Saved ${successCount}/${answeredQuestions.length} answers`);
    }

    // MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');
    const guardianCheck = await masterConsistencyCheckAI(
      coverLetterData.content,
      groundTruth,
      'generation'
    );

    if (guardianCheck.riskLevel === 'danger' && !guardianCheck.approved) {
      return NextResponse.json({ error: 'FABRICATION_DETECTED' }, { status: 400 });
    }
    if (guardianCheck.riskLevel === 'warning') {
      console.warn('⚠️ Warning:', guardianCheck.recommendation);
    }

    // ATS ANALYYSI
    let atsAnalysis = null;
    if (atsDetection.usesATS) {
      console.log('📊 Running ATS analysis...');
      atsAnalysis = await analyzeRealisticATSUniversal(
        coverLetterData.content,
        finalJobDescription
      );
    }

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
          ats_detection: atsDetection,
          ats_analysis: atsAnalysis,
          personality_analysis: {
            key_points: coverLetterData.keyPoints || null,
            has_work_experience: coverLetterData.hasWorkExperience || false,
            job_analysis: coverLetterData.jobAnalysis || null,
          },
          generation_params: {
            style: coverLetterInput.style,
            language: coverLetterInput.language,
            tier: tierFeatures.name,
            answered_questions: answeredQuestions || [],
            questions_count: Array.isArray(answeredQuestions) ? answeredQuestions.length : 0,
            skip_questions: coverLetterInput.skipQuestions,
            generator_version: 'v2-ats'
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ V2 Insert error:', insertError);
      throw insertError;
    }

    if (!coverLetter || !coverLetter.id) {
      throw new Error('Cover letter saved but ID is missing');
    }

    console.log(`✅ V2 Cover letter saved: ${coverLetter.id}`);

    // ✅ 7. KULUTA TOKENIT
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
      atsResults: atsDetection.usesATS ? {
        detected: true,
        score: atsAnalysis?.score || 0,
        confidence: atsDetection.confidence
      } : {
        detected: false
      },
      coverLetterInsights: {
        key_points: coverLetterData.keyPoints,
        has_work_experience: coverLetterData.hasWorkExperience,
      },
    });

  } catch (error) {
    console.error("❌ Error generating cover letter V2:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}