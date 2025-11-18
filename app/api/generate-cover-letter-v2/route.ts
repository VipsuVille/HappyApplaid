// app/api/generate-cover-letter-v2/route.ts - LISÄTTY HONEST VALIDATOR
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import type { ATSCoverLetterInput } from "@/types/coverLetter";
import {
  generateATSOptimizedCoverLetter,
  formatToA4CoverLetter,
  generateATSReport,
} from "@/lib/langchain/coverLetterGeneratorV2";
import { 
  extractGroundTruth, 
  masterConsistencyCheck 
} from "@/lib/ats/masterGuardian";
import { sanitizeGroundTruthForPrompt } from "@/lib/utils/escapeTemplate";
import { validateCoverLetterData } from "@/lib/langchain/honestCoverLetterValidator"; // ✅ UUSI

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ✅ TARKISTA PREMIUM-TILAUS (ATS-optimointi vaatii Premium)
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { 
          error: "PREMIUM_REQUIRED",
          message: "ATS-optimoitu hakukirje vaatii Premium-tilauksen",
          upgradeUrl: "/pricing"
        },
        { status: 403 }
      );
    }

    // ✅ 1. HAE KÄYTTÄJÄN PROFIILI + GROUND TRUTH
    const { data: userProfile } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    const groundTruth = extractGroundTruth(userProfile || {});
    
    console.log('🛡️ Ground Truth established:', {
      name: groundTruth.name,
      yearsOfExperience: groundTruth.yearsOfExperience,
      corePersonality: groundTruth.corePersonality.primary,
    });

 
    // ✅ 2. MUODOSTA PROFIILIDATA
    let profileData = body.profileData;
    if (!profileData && userProfile) {
      profileData = {
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        workExperience: formatWorkExperience(userProfile.work_experience),
        education: formatEducation(userProfile.education),
        skills: userProfile.skills,
        workingStyle: userProfile.working_style,
        problemSolving: userProfile.problem_solving,
        energySources: userProfile.energy_sources,
        uniqueStrength: userProfile.unique_strength,
        learningStyle: userProfile.learning_style,
        teamRole: userProfile.team_role,
        superpower: userProfile.superpower,
        valuesExample: userProfile.values_example,
      };
    }
   // ✅ 1.5. VALIDOI DATA (HONEST VALIDATOR) - MYÖS V2:lle!
    console.log('🔍 Validating ATS cover letter data...');
    const validation = await validateCoverLetterData({
      jobDescription: body.jobDescription,
      name: profileData?.name || body.name,
      email: profileData?.email || body.email,
      phone: profileData?.phone || body.phone,
      workExperience: profileData?.workExperience || body.workExperience,
      education: profileData?.education || body.education,
      skills: profileData?.skills || body.skills,
      workingStyle: profileData?.workingStyle,
      problemSolving: profileData?.problemSolving,
      energySources: profileData?.energySources,
      uniqueStrength: profileData?.uniqueStrength,
      learningStyle: profileData?.learningStyle,
      teamRole: profileData?.teamRole,
      valuesExample: profileData?.valuesExample,
      superpower: profileData?.superpower,
    });

    // 🚫 JOS EI VOI GENEROIDA → PALAUTA KYSYMYKSET
    if (validation.canGenerate === 'no') {
      console.log('❌ Cannot generate ATS letter - returning questions');
      return NextResponse.json({
        success: true,
        needsMoreInfo: true,
        questions: validation.questions,
        reason: validation.reason,
        title: extractJobTitle(body.jobDescription),
      });
    }

    // ⚠️ JOS RAJOITUKSILLA → LOGITA
    if (validation.canGenerate === 'with_limitations') {
      console.warn('⚠️ Generating ATS letter with limitations:', validation.reason);
    }

    console.log(`✅ ATS validation passed: ${validation.canGenerate}`);

    // ✅ 3. MUODOSTA INPUT + GROUND TRUTH WARNING (ESCAPETA)
    const input: ATSCoverLetterInput = {
      jobDescription: body.jobDescription,
      personalNotes: body.personalNotes,
      language: body.language || "finnish",
      style: body.style || "formal",
      ...profileData,
      
      // ✅ KORJATTU: Escapeta {} promptia varten
      groundTruthWarning: sanitizeGroundTruthForPrompt(groundTruth),
      
      atsOptimization: true,
    };

    // ✅ 4. GENEROI ATS-OPTIMOITU HAKUKIRJE
    console.log("🚀 Generating ATS-optimized cover letter...");
    const result = await generateATSOptimizedCoverLetter(input);

    // ✅ 5. CHECKPOINT 1: MASTER GUARDIAN VALIDATION
    console.log('🛡️ Running Master Guardian validation...');
    const formattedContent = formatToA4CoverLetter(result);
    const guardianCheck = await masterConsistencyCheck(
      formattedContent,
      groundTruth,
      'generation'
    );

    // 🚨 HYLKÄÄ JOS DANGER
    if (guardianCheck.riskLevel === 'danger') {
      console.error('🚨 MASTER GUARDIAN BLOCKED GENERATION!');
      console.error('Violations:', guardianCheck.violations);
      
      return NextResponse.json({
        error: 'CONSISTENCY_VIOLATION',
        message: 'AI generoi epäjohdonmukaisen hakukirjeen. Yritä uudelleen.',
        violations: guardianCheck.violations,
        recommendation: guardianCheck.recommendation,
        fixSuggestions: guardianCheck.fixSuggestions
      }, { status: 400 });
    }

    // ⚠️ LOGITA WARNING
    if (guardianCheck.riskLevel === 'warning') {
      console.warn('⚠️ Guardian warning:', guardianCheck.violations);
    }

    console.log('✅ Guardian approved:', guardianCheck.riskLevel);

    // ✅ 6. LUO ATS-RAPORTTI
    const atsReport = generateATSReport(result);
    const jobTitle = extractJobTitle(body.jobDescription);

    // ✅ 7. TALLENNA TIETOKANTAAN
    const { data: coverLetter, error } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: jobTitle,
        language: input.language,
        content: {
          job_description: body.jobDescription,
          body: formattedContent,
          
          // ✅ 3-OSAINEN RAKENNE ERIKSEEN
          structured_content: {
            introduction: result.introduction,
            expertise: result.expertise,
            motivation: result.motivation,
          },

          applicant_info: {
            name: profileData.name,
            email: profileData.email,
            phone: profileData.phone,
          },
        },
        ai_data: {
          html: {
            content: formattedContent,
          },
          styles: {
            main_style:
              'font-family: "Merriweather", serif; line-height: 1.7; font-size: 11pt;',
          },
          
          // ✅ GROUND TRUTH TALLENNETTU
          ground_truth: groundTruth,
          
          // ✅ GUARDIAN CHECK TALLENNETTU
          guardian_check: {
            approved: guardianCheck.approved,
            riskLevel: guardianCheck.riskLevel,
            violations: guardianCheck.violations,
            timestamp: new Date().toISOString()
          },
          
          // ✅ ATS-DATA
          ats_optimization: {
            matched_keywords: result.ats_data.matched_keywords,
            missing_experience: result.ats_data.missing_experience,
            compensation_strategy: result.ats_data.compensation_strategy,
            readability_score: result.ats_data.readability_score,
            report: atsReport,
          },

          // ✅ TYÖPAIKKAILMOITUKSEN ANALYYSI
          job_analysis: result.jobAnalysis,
        },
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: jobTitle,
      guardianCheck: {
        approved: guardianCheck.approved,
        riskLevel: guardianCheck.riskLevel,
        hasWarnings: guardianCheck.riskLevel === 'warning'
      },
      ats_report: atsReport,
      preview: {
        introduction: result.introduction.opening_hook,
        keywords_matched: result.ats_data.matched_keywords.length,
        readability: result.ats_data.readability_score,
      },
    });
  } catch (error) {
    console.error("Error generating ATS cover letter:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// ✅ APUFUNKTIOT
function extractJobTitle(jobDescription: string): string {
  const firstLine = jobDescription.split("\n")[0].trim();
  return firstLine.substring(0, 80) || "Työhakemus";
}

function formatWorkExperience(arr: any[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr
    .map((w) => {
      let text = `${w.position || w.title || ""} - ${w.employer || w.company || ""}`;
      if (w.duration) text += ` (${w.duration})`;
      if (w.description) text += `\n${w.description}`;
      return text;
    })
    .join("\n\n");
}

function formatEducation(arr: any[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  return arr
    .map(e => `${e.degree || ""}, ${e.school || e.institution || ""} ${e.year || e.startDate || ""}`)
    .join("\n");
}