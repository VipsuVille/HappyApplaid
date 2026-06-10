// app/api/user-plan-status/route.ts
// UI:lle: nykyinen plan, jäljellä olevat AI-luonnit ja lukitut ominaisuudet.
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getPlanStatus } from "@/lib/limits";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("plan_type")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  const status = await getPlanStatus(userId, sub?.plan_type);
  return Response.json(status);
}