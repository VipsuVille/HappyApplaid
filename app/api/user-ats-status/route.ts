// app/api/user-ats-status/route.ts
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase-client";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ats_checks")
    .select("score, gap_severity, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return Response.json({
      hasRunATS: false,
      atsScore: null,
      hasHighGap: false,
    });
  }

  return Response.json({
    hasRunATS: true,
    atsScore: data.score,
    hasHighGap: data.gap_severity === "high", // tai miten tallennat
  });
}