// app/api/user-profile/[userId]/route.ts - KORJATTU

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getProfileImageUrl } from "@/lib/profileImageUtils.client";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: paramUserId } = await params;

    if (!paramUserId) {
      return NextResponse.json({ error: "User ID missing" }, { status: 400 });
    }

    console.log("🔍 Fetching profile for user:", paramUserId);

    // ✅ HAE AUTENTIKOINTITIEDOT
    const { userId: authUserId } = await auth();
    const user = await currentUser();

    // ✅ TARKISTA VALTUUTUS
    if (!user || !authUserId) {
      console.log("❌ No authenticated user");
      return NextResponse.json({ error: "Unauthorized - not logged in" }, { status: 401 });
    }

    if (authUserId !== paramUserId) {
      console.log("❌ User ID mismatch:", { authUserId, paramUserId });
      return NextResponse.json({ error: "Unauthorized - wrong user" }, { status: 401 });
    }

    // ✅ HAE PROFIILI (käytä maybeSingle eikä single)
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .select("*")
      .eq("user_id", paramUserId)
      .maybeSingle(); // ← TÄRKEÄ: Ei heitä erroria jos ei löydy

    console.log("📊 Supabase result:", { 
      found: !!profile, 
      error: error?.message,
      code: error?.code 
    });

    if (error && error.code !== "PGRST116") {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { error: "Database error: " + error.message },
        { status: 500 }
      );
    }

    // Jos profiilia ei löydy, palauta 404
    if (!profile) {
      console.log("⚠️ No profile found for user:", paramUserId);
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // ✅ FORMAT PROFILE DATA
    const profileImageUrl = profile.profile_image 
      ? getProfileImageUrl(profile.profile_image) 
      : null;

    const formattedProfile = {
      user_id: profile.user_id,
      name: profile.name || `${user.firstName || ""} ${user.lastName || ""}`.trim(),
      email: profile.email || user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)?.emailAddress || "",
      phone: profile.phone || "",
      job_title: profile.job_title || "",
      location: profile.location || "",
      portfolio_links: Array.isArray(profile.portfolio_links) ? profile.portfolio_links : [],  // ← TÄHÄN
      // ✅ ARRAYS (JSONB) - Varmista että ne ovat oikeasti arrayjä
      work_experience: Array.isArray(profile.work_experience) ? profile.work_experience : [],
      education: Array.isArray(profile.education) ? profile.education : [],
      languages: Array.isArray(profile.languages) ? profile.languages : [],
      
      // Persoonallisuus
      working_style: profile.working_style || "",
      problem_solving: profile.problem_solving || "",
      energy_sources: profile.energy_sources || "",
      unique_strength: profile.unique_strength || "",
      learning_style: profile.learning_style || "",
      team_role: profile.team_role || "",
      values_example: profile.values_example || "",
      superpower: profile.superpower || "",
      
      // Taidot
      skills: profile.skills || "",
      
      // Images
      profile_image: profileImageUrl,
    };

    console.log("✅ Returning profile with:", {
      hasName: !!formattedProfile.name,
      hasEmail: !!formattedProfile.email,
      workExpCount: formattedProfile.work_experience.length,
      educationCount: formattedProfile.education.length,
      hasImage: !!profileImageUrl
    });

    return NextResponse.json(formattedProfile);
    
  } catch (error) {
    console.error("❌ Error in user profile API:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500 }
    );
  }
}