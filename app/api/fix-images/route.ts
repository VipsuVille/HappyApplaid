import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fixBrokenImageUrls } from "@/utils/fixBrokenImages";

export async function POST() {
  try {
    // ✅ TURVALLISUUS: Vain oma admin-käyttäjäsi voi ajaa
    const { userId } = await auth();
    
    // ⚠️ VAIHDA TÄMÄ OMAAN CLERK USER ID:HISI!
    // Löydät sen: Clerk Dashboard > Users > valitse itsesi > kopioi User ID
    if (!userId || userId !== "user_35AGfGbEMwoRrECrfBQVEb8URXW") {
      return NextResponse.json(
        { error: "Unauthorized - Only admin can run this" },
        { status: 403 }
      );
    }

    console.log("🔧 Starting image fix...");
    const result = await fixBrokenImageUrls();
    
    return NextResponse.json({
      success: true,
      message: `Korjattu ${result.fixedCount} CV:tä`,
      details: result,
    });
  } catch (error) {
    console.error("❌ Virhe korjauksessa:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}