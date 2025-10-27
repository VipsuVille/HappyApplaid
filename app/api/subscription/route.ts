// app/api/subscription/route.ts
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

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

    console.log("📊 Subscription data:", data);
    console.log("❌ Error:", error);

    if (error) {
      console.error("Database error:", error);
      return NextResponse.json({ subscription: null, isActive: false });
    }

    if (!data) {
      console.log("❌ No subscription found");
      return NextResponse.json({ subscription: null, isActive: false });
    }

    const isActive = data.is_active === true;

    console.log("✅ Returning subscription:", {
      is_active: data.is_active,
      status: data.status,
      isActive
    });

    return NextResponse.json({ 
      subscription: data, 
      isActive 
    });

  } catch (error) {
    console.error("❌ Subscription fetch failed:", error);
    return NextResponse.json(
      { subscription: null, isActive: false, error: "Server error" }, 
      { status: 500 }
    );
  }
}