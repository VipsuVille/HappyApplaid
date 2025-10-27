// app/api/generate-cover-letter-v2/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import {
  generateATSOptimizedCoverLetter,
  formatToA4CoverLetter,
  generateATSReport,
} from "@/lib/langchain/coverLetterGeneratorV2";

import { validateCoverLetterData } from "@/lib/langchain/honestCoverLetterValidator";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // ✅ TARKISTA TILAUS
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!subscription) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    // ✅ HAE KÄYTTÄJÄN PROFIILI (jos ei lähetetty)
    let profileData = body.profileData;
    if (!profileData) {
      const { data: dbProfile } = await supabaseAdmin
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (dbProfile) {
        profileData = {
          name: dbProfile.name,
          email: dbProfile.email,
          phone: dbProfile.phone,
          workExperience: formatWorkExperience(dbProfile.work_experience),
          education: formatEducation(dbProfile.education),
          skills: dbProfile.skills,
          workingStyle: dbProfile.working_style,
          problemSolving: dbProfile.problem_solving,
          energySources: dbProfile.energy_sources,
          uniqueStrength: dbProfile.unique_strength,
          learningStyle: dbProfile.learning_style,
          teamRole: dbProfile.team_role,
          superpower: dbProfile.superpower,
          valuesExample: dbProfile.values_example,
        };
      }
    }

    // ✅ GENEROI ATS-OPTIMOITU HAKUKIRJE
    const result = await generateATSOptimizedCoverLetter({
      jobDescription: body.jobDescription,
      personalNotes: body.personalNotes,
      language: body.language || "finnish",
      style: body.style || "formal",
      ...profileData,
    });

    // ✅ MUOTOILE A4-TEKSTIKSI
    const formattedContent = formatToA4CoverLetter(result);

    // ✅ LUO ATS-RAPORTTI
    const atsReport = generateATSReport(result);

    // ✅ POIMII OTSIKKO
    const jobTitle = extractJobTitle(body.jobDescription);

    // ✅ TALLENNA TIETOKANTAAN
    const { data: coverLetter, error } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: jobTitle,
        language: body.language || "finnish",
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
      ats_report: atsReport,
      preview: {
        introduction: result.introduction.opening_hook,
        keywords_matched: result.ats_data.matched_keywords.length,
        readability: result.ats_data.readability_score,
      },
    });
  } catch (error) {
    console.error("Error generating cover letter:", error);
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
    .map(
      (e) =>
        `${e.degree || ""}, ${e.school || e.institution || ""} ${e.year || e.startDate || ""}`
    )
    .join("\n");
}