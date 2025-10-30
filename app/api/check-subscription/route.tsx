// app/api/check-subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * Tarkistaa käyttäjän tilauksen tilan ja FREE CV -käytön
 * 
 * Palauttaa:
 * - plan_type: "free" | "premium"
 * - has_used_free_cv: boolean
 * - tokens: number (vain PREMIUM)
 * - status: "active" | "inactive"
 */
export async function GET() {
  const authData = await auth();
  const currentUserId = authData.userId;

  if (!currentUserId) {
    return NextResponse.json(
      { error: "Unauthorized - user not authenticated" },
      { status: 401 }
    );
  }

  try {
    // 1. HAE KÄYTTÄJÄN SUBSCRIPTION
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, current_period_end")
      .eq("user_id", currentUserId)
      .single();

    // 2. HAE KÄYTTÄJÄN PROFIILI (has_used_free_cv)
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("has_used_free_cv")
      .eq("user_id", currentUserId)
      .single();

    console.log("📊 Subscription check:", {
      userId: currentUserId,
      subscriptionExists: !!subscription,
      profileExists: !!profile,
      planType: subscription?.plan_type || "none",
      hasUsedFreeCv: profile?.has_used_free_cv || false,
    });

    // 3. MÄÄRITÄ KÄYTTÄJÄN TIER

    let planType: "free" | "premium" = "free";
    let isPremiumActive = false;

    if (subscription) {
      // Tarkista onko PREMIUM aktiivinen
      isPremiumActive =
        subscription.plan_type === "premium" &&
        ["active", "trialing"].includes(subscription.status) &&
        new Date(subscription.current_period_end) > new Date();

      planType = isPremiumActive ? "premium" : "free";
    }

    // 4. LASKE FREE CV -STATUS
    const hasUsedFreeCv = profile?.has_used_free_cv || false;

    // 5. LASKE KUINKA MONTA CV:TÄ KÄYTTÄJÄ ON LUONUT
    const { count: cvCount } = await supabaseAdmin
      .from("cvs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId);

    // 6. PALAUTA KATTAVA VASTAUS
    return NextResponse.json({
      plan_type: planType,
      is_premium: isPremiumActive,
      has_used_free_cv: hasUsedFreeCv,
      tokens: isPremiumActive ? subscription?.tokens || 0 : 0,
      status: subscription?.status || "inactive",
      cv_count: cvCount || 0,
      can_create_cv: isPremiumActive || !hasUsedFreeCv,
      message: isPremiumActive
        ? `Premium-tilaus aktiivinen. ${subscription?.tokens || 0} tokenia jäljellä.`
        : hasUsedFreeCv
        ? "Ilmainen CV on jo käytetty. Päivitä Premium-tiliin."
        : "Voit luoda yhden ilmaisen CV:n.",
    });
  } catch (error) {
    console.error("❌ Subscription check failed:", error);
    return NextResponse.json(
      {
        error: "Failed to check subscription status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}