// app/api/check-subscription/route.ts - KORJATTU
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

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
    // ✅ HAE SUBSCRIPTION
    const { data: subscription, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_type, tokens, status, current_period_end, is_active, cancel_at_period_end")
      .eq("user_id", currentUserId)
      .single();

    // ✅ HAE PROFIILI
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("has_used_free_cv")
      .eq("user_id", currentUserId)
      .single();

    // ✅ MÄÄRITÄ TIER JA ACTIVE
    const tier = (subscription?.plan_type || "free").toLowerCase() as 'free' | 'basic' | 'semi-pro' | 'pro';
    const isActive = subscription?.is_active === true && 
                     ['active', 'trialing'].includes(subscription?.status || '');

    console.log("📊 Check-subscription response:", {
      userId: currentUserId,
      tier,
      isActive,
      tokens: subscription?.tokens || 0,
      status: subscription?.status
    });

    const tokens = subscription?.tokens || 0;
    const hasUsedFreeCv = profile?.has_used_free_cv || false;

    // ✅ CV-LASKURI
    const { count: cvCount } = await supabaseAdmin
      .from("cvs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId);

    // ✅ VOIKO LUODA CV:N?
    const canCreate = isActive && tier !== 'free' ? true : !hasUsedFreeCv;

    // ✅ VIESTI
    let message = "";
    if (isActive && tier !== 'free') {
      message = `${tier.toUpperCase()}-tilaus aktiivinen. ${tokens} tokenia jäljellä.`;
    } else if (tier === 'free' && hasUsedFreeCv) {
      message = "Ilmainen CV on jo käytetty. Päivitä maksulliseen tilaukseen.";
    } else if (tier === 'free' && !hasUsedFreeCv) {
      message = "Voit luoda yhden ilmaisen CV:n.";
    } else {
      message = "Tilaus päättynyt tai ei aktiivinen.";
    }

    // ✅ PALAUTA YHDENMUKAINEN RAKENNE
    return NextResponse.json({
      // ✅ NÄMÄ OVAT TÄRKEIMMÄT (Context käyttää näitä)
      tier: tier,
      plan_type: tier,
      active: isActive,
      
      // Muut kentät
      tokens: tokens,
      has_used_free_cv: hasUsedFreeCv,
      cv_count: cvCount || 0,
      can_create_cv: canCreate,
      message: message,
      
      // Peruutustiedot
      cancel_at_period_end: subscription?.cancel_at_period_end || false,
      current_period_end: subscription?.current_period_end || null,
      status: subscription?.status || 'inactive',
    });

  } catch (error) {
    console.error("❌ Subscription check failed:", error);
    return NextResponse.json(
      { 
        error: "Failed to check subscription status",
        tier: "free",
        plan_type: "free",
        active: false,
        tokens: 0,
        can_create_cv: false,
        cancel_at_period_end: false,
        current_period_end: null,
        status: 'inactive'
      },
      { status: 500 }
    );
  }
}