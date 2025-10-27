// app/api/generate-cover-letter/route.ts - KORJATTU OTSIKON TALLENNUS
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterWithPersonalityExtraction } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";
import { ProfileData, convertProfileToApiFormat } from "@/types";

// ✅ APUFUNKTIO: Poimii työpaikan otsikon ilmoituksesta
function extractJobTitleFromDescription(jobDescription: string): string {
  if (!jobDescription) return "Työhakemus";
  
  // Ota ensimmäinen rivi
  const firstLine = jobDescription.split('\n')[0].trim();
  
  // Jos liian lyhyt, ota enemmän
  if (firstLine.length < 10) {
    const firstTwoLines = jobDescription.split('\n').slice(0, 2).join(' ').trim();
    return firstTwoLines.substring(0, 80).trim() || "Työhakemus";
  }
  
  // Rajoita 80 merkkiin
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

    // ✅ POIMII TYÖPAIKAN OTSIKON
    const extractedJobTitle = extractJobTitleFromDescription(finalJobDescription);

    let coverLetterInput;
    if (profileData) {
      const apiFormat = convertProfileToApiFormat(profileData);

      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: finalPersonalNotes,
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
      };
    } else {
      coverLetterInput = {
        jobDescription: finalJobDescription,
        personalNotes: finalPersonalNotes,
        name,
        email,
        phone,
        jobTitle,
        education,
        workExperience,
        skills,
        language: language || "finnish",
        style: style || "formal",
      };
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    console.log("🚀 Generating cover letter with personality extraction...");
    const coverLetterData = await generateCoverLetterWithPersonalityExtraction(
      coverLetterInput
    );

    if (coverLetterData.questions && coverLetterData.questions.length > 0) {
      return NextResponse.json({
        success: true,
        questions: coverLetterData.questions,
        title: coverLetterData.title,
        content: coverLetterData.content,
        signature: coverLetterData.signature,
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
      });
    }

    // ✅ TALLENNA HAKUKIRJE oikealla otsikolla
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: extractedJobTitle, // ✅ Käytä poimimaa otsikkoa
        language: coverLetterInput.language,
        content: {
          job_description: finalJobDescription, // ✅ Koko ilmoitus tallennetaan content.job_description
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
              },
            }),
          },
        },
        ai_data: {
          html: {
            content: coverLetterData.content,
          },
          styles: {
            main_style:
              'font-family: "Merriweather", serif; line-height: 1.7; font-size: 1rem;',
          },
          personality_analysis: {
            job_match_score: coverLetterData.job_match_score || 7,
            personality_hooks: coverLetterData.personality_hooks || [],
            key_differentiators: coverLetterData.key_differentiators || [],
            data_quality: coverLetterData.data_quality || null,
          },
          personality_used: profileData
            ? {
                workingStyle: profileData.workingStyle,
                problemSolving: profileData.problemSolving,
                uniqueStrength: profileData.uniqueStrength,
                teamRole: profileData.teamRole,
                energySources: profileData.energySources,
                superpower: profileData.superpower,
              }
            : null,
        },
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: extractedJobTitle, // ✅ Palauta oikea otsikko
      personality_insights: {
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
        key_differentiators: coverLetterData.key_differentiators,
      },
    });
  } catch (error) {
    console.error("Error generating cover letter:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}