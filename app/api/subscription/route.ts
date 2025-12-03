// app/api/subscription/route.ts - KORJATTU
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("🔍 Fetching subscription for:", userId);
    
    const supabaseAdmin = await getSupabaseAdmin();
    
    const { data, error } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    console.log("📊 Raw subscription data:", data);
    console.log("❌ Error (if any):", error);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ 
        subscription: null, 
        isActive: false,
        error: error.message 
      });
    }

    if (!data) {
      console.log("❌ No subscription found");
      return NextResponse.json({ 
        subscription: null, 
        isActive: false 
      });
    }

    // TARKISTA ONKO AKTIIVINEN
    const isActive = 
      data.is_active === true && 
      ['active', 'trialing'].includes(data.status) &&
      new Date(data.current_period_end) > new Date();

    // MÄÄRITÄ PLAN (priorisoi plan_type)
    const plan = data.plan_type || data.plan || 'free';

    console.log("✅ Subscription processed:", {
      userId,
      plan,
      is_active_field: data.is_active,
      status: data.status,
      current_period_end: data.current_period_end,
      calculated_isActive: isActive,
      tokens: data.tokens
    });

    // PALAUTA ENRICHED DATA
    return NextResponse.json({
      subscription: {
        ...data,
        plan: plan, // Varmista että plan on oikein
      },
      isActive: isActive, // Varmista että isActive on boolean
      plan: plan, // Lisää top-level plan myös
      tokens: data.tokens || 0
    });

  } catch (error: any) {
    console.error("❌ Subscription fetch failed:", error);
    return NextResponse.json(
      { 
        subscription: null, 
        isActive: false, 
        error: error.message || "Server error" 
      },
      { status: 500 }
    );
  }
}