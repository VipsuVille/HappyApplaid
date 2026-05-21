// app/api/save-profile/route.ts - KORJATTU
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { transformUIToDB } from "@/lib/profileDataTransform";
import type { ProfileData } from "@/types";

export async function POST(request: Request) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Käyttäjä ei ole kirjautunut sisään" },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    console.log("Received profile data:", JSON.stringify(requestData, null, 2));

    if (!requestData.profile) {
      return NextResponse.json(
        { error: "Profiilidata puuttuu" },
        { status: 400 }
      );
    }

    const profileData: ProfileData = requestData.profile;

    // KÄYTÄ TRANSFORMAATIOFUNKTIOTA
    const dbData = transformUIToDB(profileData, user.id);

    console.log("Transformed to DB format:", JSON.stringify(dbData, null, 2));

    // TALLENNA SUPABASEEN
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert(
        {
          ...dbData,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { error: "Tietojen tallentaminen epäonnistui: " + error.message },
        { status: 500 }
      );
    }

    console.log("✅ Profile saved successfully");

    return NextResponse.json({
      success: true,
      profile: data[0],
      message: "Profiili tallennettu onnistuneesti!",
    });
  } catch (error) {
    console.error("Error saving profile:", error);
    return NextResponse.json(
      { error: "Järjestelmässä tapahtui virhe: " + (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Käyttäjä ei ole kirjautunut sisään" },
        { status: 401 }
      );
    }

    const { data: dbProfile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error);
      return NextResponse.json(
        { error: "Profiilin lataaminen epäonnistui: " + error.message },
        { status: 500 }
      );
    }

    if (!dbProfile) {
      return NextResponse.json({ profile: null }, { status: 404 });
    }

    // ✅ MUUNNA TAKAISIN UI-MUOTOON (LISÄÄ UUDET KENTÄT)
    const profilePageFormat: ProfileData = {
      name: dbProfile.name || "",
      email: dbProfile.email || "",
      phone: dbProfile.phone || "",
      location: dbProfile.location || "",
      jobTitle: dbProfile.job_title || "",
      profileImage: dbProfile.profile_image || "",

      // Arrays suoraan (ne ovat jo JSONB:nä)
      education: Array.isArray(dbProfile.education) ? dbProfile.education : [],
      workExperience: Array.isArray(dbProfile.work_experience) ? dbProfile.work_experience : [],
      languages: Array.isArray(dbProfile.languages) ? dbProfile.languages : [],

      skills: (() => {
  if (!dbProfile.skills) return [];
  if (Array.isArray(dbProfile.skills)) return dbProfile.skills;
  try {
    const parsed = JSON.parse(dbProfile.skills);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
})(),

      // Persoonallisuuskysymykset
      workingStyle: dbProfile.working_style || "",
      problemSolving: dbProfile.problem_solving || "",
      energySources: dbProfile.energy_sources || "",
      uniqueStrength: dbProfile.unique_strength || "",
      learningStyle: dbProfile.learning_style || "",
      teamRole: dbProfile.team_role || "",
      valuesExample: dbProfile.values_example || "",
      superpower: dbProfile.superpower || "",
      
      // ✅ LISÄÄ UUDET KENTÄT
      careerGoals: dbProfile.career_goals || "",
      bestProjectExample: dbProfile.best_project_example || "",
      failureLesson: dbProfile.failure_lesson || "",

       idealWorkEnvironment: dbProfile.ideal_work_environment || "",
  feedbackExample: dbProfile.feedback_example || "",
  workplaceFrustration: dbProfile.workplace_frustration || "",
  proudMoment: dbProfile.proud_moment || "",
  whatIfMoney: dbProfile.what_if_money || "",
    };

    return NextResponse.json({ profile: profilePageFormat });
  } catch (error) {
    console.error("Error loading profile:", error);
    return NextResponse.json(
      {
        error: "Profiilin lataaminen epäonnistui: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

