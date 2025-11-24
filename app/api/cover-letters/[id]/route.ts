// app/api/cover-letters/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { data: letter, error } = await supabaseAdmin
      .from('cover_letters')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !letter) {
      return NextResponse.json(
        { error: "Cover letter not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(letter);
  } catch (error) {
    console.error("Error fetching cover letter:", error);
    return NextResponse.json(
      { error: "Failed to fetch cover letter" },
      { status: 500 }
    );
  }
}