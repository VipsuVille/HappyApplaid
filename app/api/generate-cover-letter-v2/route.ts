// app/api/generate-cover-letter-v2/route.ts - TÄYSIN KORJATTU

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { getTierFeatures } from "@/lib/stripe/subscriptions";
import { detectATSUsageAI, analyzeRealisticATSUniversal } from "@/lib/langchain/realisticATSAnalyzer";

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
  // ✅ KORJAUS 1: Käytä auth() HETI - älä odota
  const authData = await auth();
  const userId = authData.userId;

  if (!userId) {
    console.error('❌ No userId from auth()');
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`✅ Auth OK: ${userId}`);

  try {
    const requestData = await req.json();

    const {
      profileData,
      jobDescription: jobDesc,
      personalNotes: notes,
      language,
      style,
      answeredQuestions,
      skipQuestions, // ✅ LISÄTTY
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

    // ✅ KORJAUS 2: TARKISTA SKIP-FLAG ENSIN
    const shouldSkipQuestions = skipQuestions === true || 
                                (answeredQuestions && Object.keys(answeredQuestions).length > 0);

    console.log(`📝 V2 Generate request:`, {
      userId,
      hasAnsweredQuestions: !!answeredQuestions,
      answersCount: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
      skipQuestions: shouldSkipQuestions,
      skipQuestionsRaw: skipQuestions
    });

    // ✅ 1. TARKISTA TILAUS & TIER
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "SUBSCRIPTION_REQUIRED", message: "Tilaus vaaditaan" },
        { status: 403 }
      );
    }

    const tier = await getTierFeatures(subscription.plan_type);

    if (!tier.canUseV2) {
      return NextResponse.json(
        { 
          error: "UPGRADE_REQUIRED", 
          message: "V2 ATS Generator vaatii Semi-Pro tai Pro -tason",
          currentTier: tier.name,
          requiredTier: "Semi-Pro"
        },
        { status: 403 }
      );
    }

    console.log(`🎫 User tier: ${tier.name}`);

    // ✅ 2. HAE GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    
    console.log(`🛡️ Ground Truth extracted`);

    // ✅ 3. TARKISTA ATS-KÄYTTÖ
    console.log('🔍 Detecting ATS usage...');
    const atsDetection = await detectATSUsageAI(finalJobDescription);
    
    console.log(`   - Uses ATS: ${atsDetection.usesATS ? '✅' : '❌'}`);

    // ✅ 4. MERGE VASTAUKSET
    let enhancedPersonalNotes = finalPersonalNotes || '';
    
    if (answeredQuestions && Object.keys(answeredQuestions).length > 0) {
      console.log(`📝 Integrating ${Object.keys(answeredQuestions).length} answers`);
      
      const answersText = Object.entries(answeredQuestions)
        .map(([questionId, answer]) => `Q: ${questionId}\nA: ${answer}`)
        .join('\n\n');
      
      enhancedPersonalNotes = finalPersonalNotes 
        ? `${finalPersonalNotes}\n\n--- VASTAUKSET ---\n${answersText}`
        : answersText;
    }

    // ✅ 5. PREPARE INPUT
    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name: profileData.name,
        email: profileData.email,
        phone: profileData.phone,
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
        
        enableRAG: tier.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        
        // ✅ KORJAUS 3: Pakota skip jos vastauksia on
        skipQuestions: shouldSkipQuestions,
        answeredQuestions: answeredQuestions || {}
      };
    } else {
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: enhancedPersonalNotes,
        name,
        email,
        phone,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
        
        enableRAG: tier.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim,
        
        skipQuestions: shouldSkipQuestions,
        answeredQuestions: answeredQuestions || {}
      };
    }

    // ✅ 6. GENEROI V2 ATS
    console.log(`📝 Generating V2 (RAG: ${tier.canUseRAG}, skipQuestions: ${coverLetterInput.skipQuestions})...`);
    
    const coverLetterData = await generateCoherentCoverLetter(coverLetterInput);

    // ✅ 7. JOS KYSYMYKSIÄ JA EI SKIP → PALAUTA KYSYMYKSET
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

    // ✅ 7B. JOS SKIP MUTTA AI KYSYI SILTI → VAROITA JA JATKA
    if (coverLetterInput.skipQuestions && coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.warn(`⚠️ AI kysyi ${coverLetterData.questions.length} kysymystä vaikka skipQuestions=true`);
      console.warn(`⚠️ Jatketaan pakolla generointiin...`);
      
      // ÄLÄ palauta kysymyksiä - pakota generointi
      // (AI palauttaa "needsMoreInfo: true" mutta me ignoroidaan se)
    }

    // ✅ TARKISTA: Onko sisältöä?
    if (!coverLetterData.content || coverLetterData.content.trim().length === 0) {
      console.error('❌ No content generated');
      return NextResponse.json({
        error: 'GENERATION_FAILED',
        message: 'AI ei generoinut sisältöä',
        debug: {
          hasQuestions: !!coverLetterData.questions,
          questionsCount: coverLetterData.questions?.length || 0,
          skipQuestions: coverLetterInput.skipQuestions
        }
      }, { status: 500 });
    }

    // ✅ 8. MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');
    
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

    // ✅ 9. ATS ANALYYSI
    let atsAnalysis = null;
    if (atsDetection.usesATS) {
      console.log('📊 Running ATS analysis...');
      atsAnalysis = await analyzeRealisticATSUniversal(
        coverLetterData.content,
        finalJobDescription
      );
      console.log(`   - ATS Score: ${atsAnalysis.score}/100`);
    }

    // ✅ 10. TALLENNA
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
          
          tier: tier.name,
          cost_per_letter: tier.costPerLetter,
          
          ground_truth: groundTruth,
          
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          
          rag_enabled: tier.canUseRAG,
          
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
            tier: tier.name,
            answered_questions: answeredQuestions || {},
            questions_count: answeredQuestions ? Object.keys(answeredQuestions).length : 0,
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
      console.error('❌ Cover letter ID missing after insert');
      throw new Error('Cover letter saved but ID is missing');
    }

    console.log(`✅ V2 Cover letter saved: ${coverLetter.id}`);

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedJobTitle,
      tier: tier.name,
      features: {
        v1: tier.canUseV1,
        v2: tier.canUseV2,
        rag: tier.canUseRAG,
        ats: tier.canUseATS
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