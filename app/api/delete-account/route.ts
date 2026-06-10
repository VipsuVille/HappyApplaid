// app/api/delete-account/route.ts — peruu Stripe-tilauksen ENNEN poistoa
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-02-24.acacia",
});

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🗑️ Deleting everything for: ${userId}`);

    // 0️⃣ ⚠️ KRIITTINEN: PERU STRIPE-TILAUS ENNEN KANNAN POISTOA
    //    Muuten kortilta veloitetaan jatkossakin, koska Stripe ei tiedä poistosta.
    try {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("stripe_subscription_id, stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      const subId = sub?.stripe_subscription_id;
      // Vain oikeat Stripe-tilaukset (promo-tilauksilla on 'promo_sub_...'-id)
      if (subId && subId.startsWith("sub_")) {
        try {
          await stripe.subscriptions.cancel(subId);
          console.log("✅ Stripe subscription canceled:", subId);
        } catch (e: any) {
          // Jos jo peruttu/ei löydy → jatketaan silti poistoa
          console.warn("⚠️ Stripe subscription cancel:", e?.message);
        }
      }

      // Valinnainen siivous: poista myös Stripe-asiakas (estää haamuveloitukset)
      const custId = sub?.stripe_customer_id;
      if (custId && custId.startsWith("cus_")) {
        try {
          await stripe.customers.del(custId);
          console.log("✅ Stripe customer deleted:", custId);
        } catch (e: any) {
          console.warn("⚠️ Stripe customer delete:", e?.message);
        }
      }
    } catch (e: any) {
      // Stripe-virhe EI saa estää tilin poistoa — logataan ja jatketaan
      console.warn("⚠️ Stripe cleanup failed, continuing deletion:", e?.message);
    }

    // 1️⃣ POISTA STORAGE (profiles/ JA backgrounds/ JA legacy)
    await deleteAllStorageFiles(userId);

    // 2️⃣ POISTA KAIKKI KÄYTTÄJÄKOHTAISET TAULUT
    const tables = [
      "usage_events",      // ✅ uusi kuluhallinnan loki (käyttäjäkohtainen)
      "token_usage",
      "rate_limits",
      "promo_code_usage",
      "ats_checks",        // ✅ käyttäjäkohtaiset ATS-tarkistukset
      "user_responses",    // ✅ käyttäjän vastaukset
      "cover_letters",
      "cv_data",
      "cvs",
      "subscriptions",
      "default_images",
      "user_profiles",     // ✅ profiili viimeisenä
    ];
    // HUOM: verdict_stats EI ole listalla — se on anonyymi (ei user_id), ei voi/saa poistaa per käyttäjä.

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin.from(table).delete().eq("user_id", userId);
        if (error && error.code !== "PGRST116") console.warn(`⚠️ ${table}:`, error.message);
        else console.log(`✅ ${table} deleted`);
      } catch {
        console.warn(`⚠️ ${table} failed (maybe doesn't exist)`);
      }
    }

    // 3️⃣ POISTA CLERK-KÄYTTÄJÄ
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
      console.log("✅ Clerk user deleted");
    } catch (e: any) {
      console.error("❌ Clerk deletion failed:", e.message);
    }

    return NextResponse.json({ success: true, message: "Kaikki poistettu onnistuneesti" });
  } catch (error: any) {
    console.error("💥 Deletion failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteAllStorageFiles(userId: string) {
  try {
    const { data: profileFiles } = await supabaseAdmin.storage.from("cv_files").list(`profiles/${userId}/`, { limit: 1000 });
    if (profileFiles?.length) {
      await supabaseAdmin.storage.from("cv_files").remove(profileFiles.map((f) => `profiles/${userId}/${f.name}`));
    }
    const { data: bgFiles } = await supabaseAdmin.storage.from("cv_files").list(`backgrounds/${userId}/`, { limit: 1000 });
    if (bgFiles?.length) {
      await supabaseAdmin.storage.from("cv_files").remove(bgFiles.map((f) => `backgrounds/${userId}/${f.name}`));
    }
    const { data: legacyFiles } = await supabaseAdmin.storage.from("cv_files").list(userId, { limit: 1000 });
    if (legacyFiles?.length) {
      await supabaseAdmin.storage.from("cv_files").remove(legacyFiles.map((f) => `${userId}/${f.name}`));
    }
  } catch (error: any) {
    console.error("❌ Storage deletion failed:", error.message);
  }
}