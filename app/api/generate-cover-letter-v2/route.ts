// app/api/generate-cover-letter-v2/route.ts - TIER-POHJAINEN V2 ATS + RAG

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoherentCoverLetter } from "@/lib/langchain/coverLetterGeneratorV2";
import { supabaseAdmin } from "@/lib/supabase";
import { convertProfileToApiFormat } from "@/types";
import { extractGroundTruthAI, masterConsistencyCheckAI } from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate";
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
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const requestData = await req.json();

    const {
      profileData,
      jobDescription: jobDesc,
      personalNotes: notes,
      language,
      style,
      answeredQuestions,
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

    // ✅ 2. HAE TIER-OMINAISUUDET
    // HUOM: Lisätty await, koska getTierFeatures on nyt async
    const tier = await getTierFeatures(subscription.plan_type);

    // V2 vaatii Semi-Pro tai Pro
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
    console.log(`   - V2/ATS: ✅`);
    console.log(`   - RAG: ${tier.canUseRAG ? '✅' : '❌'}`);
    console.log(`   - Cost: $${tier.costPerLetter}/letter`);

    // ✅ 3. HAE GROUND TRUTH (kaikille tiereille)
    const { data: userProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    const groundTruth = await extractGroundTruthAI(userProfile || {});
    
    console.log(`🛡️ Ground Truth extracted:`);
    console.log(`   - Skills: ${groundTruth.technicalSkills.length}`);
    console.log(`   - Experience: ${groundTruth.yearsOfExperience || 0} years`);

    // ✅ 4. TARKISTA ATS-KÄYTTÖ
    console.log('🔍 Detecting ATS usage...');
    const atsDetection = await detectATSUsageAI(finalJobDescription);
    
    console.log(`   - Uses ATS: ${atsDetection.usesATS ? '✅' : '❌'}`);
    console.log(`   - Confidence: ${atsDetection.confidence}`);
    console.log(`   - Reasoning: ${atsDetection.reasoning}`);

    // ✅ 5. MERGE VASTAUKSET personalNotesiin
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

    // ✅ 6. PREPARE INPUT
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
        
        // ✅ TIER-POHJAINEN RAG
        enableRAG: tier.canUseRAG,
        allowedSkills: groundTruth.technicalSkills,
        forbiddenClaims: groundTruth.cannotClaim
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
        
      };
    }

    // ✅ 7. GENEROI V2 ATS
    console.log(`📝 Generating V2 ATS cover letter (RAG: ${tier.canUseRAG})...`);
    
    const coverLetterData = await generateCoherentCoverLetter(coverLetterInput);

    // ✅ 8. JOS KYSYMYKSIÄ
    if (coverLetterData.questions && coverLetterData.questions.length > 0) {
      console.log(`❓ AI needs clarification: ${coverLetterData.questions.length} questions`);
      
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        reason: 'AI tarvitsee vahvistusta varmistaakseen totuudenmukaisuuden'
      });
    }

    // ✅ 9. MASTER GUARDIAN
    console.log('🛡️ Running Master Guardian...');
    
    // Varmista että content on määritelty
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

    // ✅ 10. ATS ANALYYSI (jos ATS havaittu)
    let atsAnalysis = null;
    if (atsDetection.usesATS) {
      console.log('📊 Running ATS analysis...');
      atsAnalysis = await analyzeRealisticATSUniversal(
        coverLetterData.content,
        finalJobDescription
      );
      console.log(`   - ATS Score: ${atsAnalysis.score}/100`);
    }

    // ✅ 11. TALLENNA
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
          
          // Tier info
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
          
          // ATS Data
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
            generator_version: 'v2-ats'
          }
        },
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    console.log(`✅ Cover letter saved: ${coverLetter.id}`);

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
    console.error("Error generating cover letter V2:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}