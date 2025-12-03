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
    // HAE SUBSCRIPTION
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, plan_type, tokens, status, current_period_end, is_active")
      .eq("user_id", currentUserId)
      .single();

    // HAE PROFIILI
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("has_used_free_cv")
      .eq("user_id", currentUserId)
      .single();

    // MÄÄRITÄ TIER (priorisoi plan_type, sitten plan)
    const userPlan = (subscription?.plan_type || subscription?.plan || "free").toLowerCase();
    
    console.log("📊 Check-subscription response:", {
      userId: currentUserId,
      subscriptionExists: !!subscription,
      plan_type: subscription?.plan_type,
      plan: subscription?.plan,
      resolvedPlan: userPlan,
      tokens: subscription?.tokens || 0,
      is_active: subscription?.is_active,
      status: subscription?.status
    });

    const isPaid = ["basic", "semi-pro", "pro"].includes(userPlan);
    const isActive = subscription?.is_active === true && 
                     ["active", "trialing"].includes(subscription?.status) &&
                     new Date(subscription.current_period_end) > new Date();

    const tokens = subscription?.tokens || 0;
    const hasUsedFreeCv = profile?.has_used_free_cv || false;

    // CV-LASKURI
    const { count: cvCount } = await supabaseAdmin
      .from("cvs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId);

    // OMINAISUUDET
    const features = {
      free: { cvs: 1, coverLetters: 0, atsOptimization: false, rag: false, tokensPerMonth: 0 },
      basic: { cvs: "unlimited", coverLetters: "unlimited", atsOptimization: false, rag: false, tokensPerMonth: 1000 },
      "semi-pro": { cvs: "unlimited", coverLetters: "unlimited", atsOptimization: true, rag: false, tokensPerMonth: 2000 },
      pro: { cvs: "unlimited", coverLetters: "unlimited", atsOptimization: true, rag: true, tokensPerMonth: 3000 }
    };

    const currentFeatures = features[userPlan as keyof typeof features] || features.free;

    // VOIKO LUODA?
    const canCreate = isPaid && isActive && tokens >= 50 ? true : !hasUsedFreeCv;

    // VIESTI
    let message = "";
    if (isPaid && isActive) {
      message = `${userPlan.toUpperCase()}-tilaus aktiivinen. ${tokens} tokenia jäljellä.`;
    } else if (!isPaid && hasUsedFreeCv) {
      message = "Ilmainen CV on jo käytetty. Päivitä maksulliseen tilaukseen.";
    } else if (!isPaid && !hasUsedFreeCv) {
      message = "Voit luoda yhden ilmaisen CV:n.";
    } else {
      message = "Tilaus päättynyt tai ei aktiivinen.";
    }

    // ✅ PALAUTA YHDENMUKAINEN RAKENNE
    return NextResponse.json({
      // Vanhat kentät (backward compatibility)
      plan: userPlan,
      is_paid: isPaid,
      is_active: isActive,
      has_used_free_cv: hasUsedFreeCv,
      tokens: tokens,
      status: subscription?.status || "inactive",
      cv_count: cvCount || 0,
      can_create_cv: canCreate,
      features: currentFeatures,
      message: message,
      
      // ✅ LISÄÄ UUDET KENTÄT (yhdenmukaistaa /api/subscription kanssa)
      plan_type: userPlan,           // ✅ TÄRKEÄ!
      is_premium: isPaid && isActive, // ✅ TÄRKEÄ!
      
      // ✅ Lisää koko subscription-objekti jos haluat
      subscription: subscription ? {
        ...subscription,
        plan: userPlan,
        plan_type: userPlan
      } : null
    });

  } catch (error) {
    console.error("❌ Subscription check failed:", error);
    return NextResponse.json(
      { 
        error: "Failed to check subscription status",
        // ✅ Palauta safe defaults myös errorissa
        plan: "free",
        plan_type: "free",
        is_paid: false,
        is_active: false,
        is_premium: false,
        tokens: 0,
        can_create_cv: false
      },
      { status: 500 }
    );
  }
}