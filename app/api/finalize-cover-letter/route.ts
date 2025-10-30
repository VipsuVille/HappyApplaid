// app/api/finalize-cover-letter/route.ts - Päivitetty persoonallisuustuella
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateCoverLetterWithLangChain } from "@/lib/langchain/coverLetterGenerator";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const {
      tempCoverLetterData,
      answers,
      jobDescription,
      personalNotes,
      name,
      email,
      phone,
      jobTitle,
      education,
      workExperience,
      skills,
      language,
      style,
      // PERSOONALLISUUSTIEDOT - lisätty
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      valuesExample,
      superpower,
    } = await req.json();

    if (!jobDescription) {
      return NextResponse.json(
        { error: "Job description is required" },
        { status: 400 }
      );
    }

    if (!tempCoverLetterData) {
      return NextResponse.json(
        { error: "Temporary cover letter data is missing" },
        { status: 400 }
      );
    }

    // Check user's subscription status
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (subscriptionError || !subscription) {
      console.log("Subscription error:", subscriptionError);
      return NextResponse.json(
        { error: "Subscription required" },
        { status: 403 }
      );
    }

    // Format answers as enhanced personal notes
    const answersText = Object.entries(answers)
      .map(([questionId, answer]) => {
        const question = tempCoverLetterData.questions?.find(
          (q: any) => q.id === questionId
        );
        if (question && answer) {
          return `${question.question}: ${answer}`;
        }
        return null;
      })
      .filter(Boolean)
      .join("\n\n");

    // Combine original personal notes and answers
    const enhancedPersonalNotes = personalNotes
      ? `${personalNotes}\n\nLisätietoja:\n${answersText}`
      : `Lisätietoja:\n${answersText}`;

    // Generate enhanced cover letter with personality data
    const coverLetterData = await generateCoverLetterWithLangChain({
      jobDescription,
      personalNotes: enhancedPersonalNotes,
      name,
      email,
      phone,
      jobTitle,
      education,
      workExperience,
      skills,
      language,
      style,
      // PERSOONALLISUUSTIEDOT - välitetään generaattorille
      workingStyle,
      problemSolving,
      energySources,
      uniqueStrength,
      learningStyle,
      teamRole,
      valuesExample,
      superpower,
    });

    // Save enhanced cover letter to Supabase
    const { data: coverLetter, error: insertError } = await supabaseAdmin
      .from("cover_letters")
      .insert({
        user_id: userId,
        title: coverLetterData.title,
        language: language || "finnish",
        content: {
          job_description: jobDescription,
          cover_letter_content: coverLetterData.content,
          signature: coverLetterData.signature,
          body: coverLetterData.content,
          applicant_info: {
            name,
            email,
            phone,
            jobTitle,
            education,
            workExperience,
            skills,
            // Tallenna persoonallisuustiedot hakukirjeen tietoihin
            personality_profile: {
              workingStyle,
              problemSolving,
              energySources,
              uniqueStrength,
              learningStyle,
              teamRole,
              valuesExample,
              superpower,
            },
          },
          // Tallenna käyttäjän vastaukset kysymyksiin
          user_answers: answers,
          enhanced_notes: enhancedPersonalNotes,
        },
        ai_data: {
          html: {
            content: coverLetterData.content,
          },
          styles: {
            main_style:
              'font-family: "Merriweather", serif; line-height: 1.7; font-size: 1rem;',
          },
          // Tallenna persoonallisuusanalyysit
          personality_analysis: {
            hooks_used: coverLetterData.personality_hooks || [],
            job_match_score: coverLetterData.job_match_score || 7,
            traits_emphasized: [
              uniqueStrength,
              workingStyle,
              superpower,
            ].filter(Boolean),
            questions_answered: Object.keys(answers).length,
          },
          // Säilytä alkuperäinen tempData referenssi
          temp_data_reference: {
            original_score: tempCoverLetterData.job_match_score,
            original_hooks: tempCoverLetterData.personality_hooks,
          },
        },
      })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error("Insert error:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      coverLetterId: coverLetter.id,
      title: coverLetterData.title,
      personality_insights: {
        job_match_score: coverLetterData.job_match_score,
        personality_hooks: coverLetterData.personality_hooks,
        questions_answered: Object.keys(answers).length,
      },
    });
  } catch (error) {
    console.error("Error finalizing cover letter:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      },
      { status: 500 }
    );
  }
}
