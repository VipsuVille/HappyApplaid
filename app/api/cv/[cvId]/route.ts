// app/api/cv/[cvId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ cvId: string }> } // ← Promise!
) {
  const params = await context.params; // ← Await tässä!
  const cvId = params.cvId;

  if (!cvId) {
    return NextResponse.json(
      { error: "CV ID puuttuu" },
      { status: 400 }
    );
  }

  try {
    console.log("🔍 API: Fetching CV:", cvId);

    const { data, error } = await supabaseAdmin
      .from("cvs")
      .select("*")
      .eq("id", cvId)
      .maybeSingle();

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "CV:tä ei löytynyt" },
        { status: 404 }
      );
    }

    console.log("✅ CV fetched successfully");

    return NextResponse.json({ cv: data }, { status: 200 });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}