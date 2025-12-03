// app/api/check-subscription/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/**
 * ✅ KORJATTU: Tukee sekä 'plan' että 'plan_type' kenttää
 * 
 * Tilausjärjestelmä:
 * - FREE: Yksi ilmainen CV (50 tokenia kuluu, mutta ei veloiteta)
 * - BASIC: 1000 tokenia/kk, 4.99€ (CV 50t, hakukirje 50t)
 * - SEMI-PRO: 2000 tokenia/kk, 9.99€ (Basic + ATS-optimointi)
 * - PRO: 3000 tokenia/kk, 15.99€ (Semi-Pro + RAG-artikkelit)
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
    // 1. HAE SUBSCRIPTION (tukee molempia kenttiä)
    const { data: subscription } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, plan_type, tokens, status, current_period_end")
      .eq("user_id", currentUserId)
      .single();

    // 2. HAE PROFIILI
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("has_used_free_cv")
      .eq("user_id", currentUserId)
      .single();

    console.log("📊 Subscription check:", {
      userId: currentUserId,
      subscriptionExists: !!subscription,
      plan: subscription?.plan || subscription?.plan_type || "none",
      tokens: subscription?.tokens || 0,
      hasUsedFreeCv: profile?.has_used_free_cv || false,
    });

    // 3. MÄÄRITÄ TIER (käytä 'plan' jos olemassa, muuten 'plan_type')
    const userPlan = subscription?.plan || subscription?.plan_type || "free";
    const isPaid = ["basic", "semi-pro", "pro"].includes(userPlan);
    const isActive = 
      subscription &&
      ["active", "trialing"].includes(subscription.status) &&
      new Date(subscription.current_period_end) > new Date();

    // 4. TOKEN-TARKISTUS
    const tokens = subscription?.tokens || 0;
    const hasUsedFreeCv = profile?.has_used_free_cv || false;

    // 5. CV-LASKURI
    const { count: cvCount } = await supabaseAdmin
      .from("cvs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", currentUserId);

    // 6. OMINAISUUDET TIERIN MUKAAN
    const features = {
      free: {
        cvs: 1,
        coverLetters: 0,
        atsOptimization: false,
        rag: false,
        tokensPerMonth: 0
      },
      basic: {
        cvs: "unlimited",
        coverLetters: "unlimited",
        atsOptimization: false,
        rag: false,
        tokensPerMonth: 1000
      },
      "semi-pro": {
        cvs: "unlimited",
        coverLetters: "unlimited",
        atsOptimization: true,
        rag: false,
        tokensPerMonth: 2000
      },
      pro: {
        cvs: "unlimited",
        coverLetters: "unlimited",
        atsOptimization: true,
        rag: true,
        tokensPerMonth: 3000
      }
    };

    const currentFeatures = features[userPlan as keyof typeof features] || features.free;

    // 7. VOIKO LUODA SISÄLTÖÄ?
    const canCreate = isPaid && isActive && tokens >= 50 
      ? true 
      : !hasUsedFreeCv; // FREE tier: vain jos ei ole käyttänyt

    // 8. VIESTI
    let message = "";
    if (isPaid && isActive) {
      message = `${userPlan.toUpperCase()}-tilaus aktiivinen. ${tokens} tokenia jäljellä.`;
    } else if (!isPaid && hasUsedFreeCv) {
      message = "Ilmainen CV on jo käytetty. Päivitä maksulliseen tilaukseen.";
    } else if (!isPaid && !hasUsedFreeCv) {
      message = "Voit luoda yhden ilmaisen CV:n (50 tokenia).";
    } else {
      message = "Tilaus päättynyt tai ei aktiivinen. Uusi aktivointi.";
    }

    // 9. PALAUTA KATTAVA VASTAUS
    return NextResponse.json({
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
      
      // Debuggaus (poista tuotannossa)
      _debug: {
        subscription_found: !!subscription,
        plan_field: subscription?.plan || "missing",
        plan_type_field: subscription?.plan_type || "missing",
        raw_status: subscription?.status
      }
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