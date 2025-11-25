// app/api/cover-letters/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const letterId = params.id;

  if (!letterId) {
    return NextResponse.json(
      { error: "Letter ID puuttuu" },
      { status: 400 }
    );
  }

  try {
    console.log("🔍 API: Fetching cover letter:", letterId);

    // ✅ EI AUTENTIKAATIOTA - kuten CV:ssä
    const { data, error } = await supabaseAdmin
      .from('cover_letters')
      .select('*')
      .eq('id', letterId)
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
        { error: "Cover letteriä ei löytynyt" },
        { status: 404 }
      );
    }

    console.log("✅ Cover letter fetched successfully");

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("❌ API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tuntematon virhe" },
      { status: 500 }
    );
  }
}

// ✅ PATCH method jos tarvitset (voit jättää pois jos et käytä)
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const letterId = params.id;
  
  // Tämä voi vaatia autentikaation jos haluat
  const body = await request.json();
  
  const { data, error } = await supabaseAdmin
    .from('cover_letters')
    .update(body)
    .eq('id', letterId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}