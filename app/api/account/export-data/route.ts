// app/api/account/export-data/route.ts
// GDPR Art. 15 & 20 — kokoaa käyttäjän kaikki tiedot yhteen JSON-vastaukseen.
// Käyttäjä saa tiedostona kopion kaikesta mitä hänestä on tallennettu.
// Suojaus: vain kirjautunut käyttäjä saa OMAT tietonsa (auth() → userId).

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Taulut joissa on user_id-sarake. Pidä linjassa delete-account-reitin kanssa.
const USER_TABLES = [
  "cvs",
  "cover_letters",
  "user_profiles",
  "subscriptions",
  "usage_events",
  "ats_checks",
  "user_responses",
  "default_images",
  "promo_code_usage",
] as const;

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1️⃣ Clerk-perustiedot (nimi + sähköposti)
    let account: Record<string, unknown> = { userId };
    try {
      const user = await currentUser();
      if (user) {
        account = {
          userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.emailAddresses?.[0]?.emailAddress ?? null,
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
        };
      }
    } catch (e) {
      console.warn("⚠️ [export] Clerk fetch failed:", e);
    }

    // 2️⃣ Kaikki käyttäjäkohtaiset taulut
    const data: Record<string, unknown> = {};
    for (const table of USER_TABLES) {
      try {
        const { data: rows, error } = await supabaseAdmin
          .from(table)
          .select("*")
          .eq("user_id", userId);
        if (error) {
          // taulua ei ehkä ole tai sarake puuttuu — ohitetaan, ei kaadeta vientiä
          console.warn(`⚠️ [export] ${table}:`, error.message);
          data[table] = [];
        } else {
          data[table] = rows ?? [];
        }
      } catch (e) {
        console.warn(`⚠️ [export] ${table} failed:`, e);
        data[table] = [];
      }
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      service: "HappyApplaid",
      note:
        "Tämä tiedosto sisältää kaikki sinusta tallennetut tiedot (GDPR Art. 15/20). " +
        "Korttitietoja ei tallenneta meillä — ne käsittelee Stripe.",
      account,
      data,
    };

    // Palautetaan latauksena (Content-Disposition → selain tarjoaa tallennusta)
    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="happyapplaid-tietoni-${
          new Date().toISOString().split("T")[0]
        }.json"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("💥 [export] failed:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";