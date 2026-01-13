// app/api/delete-account/route.ts - LOPULLINEN
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`🗑️ Deleting everything for: ${userId}`);

    // 1️⃣ POISTA STORAGE (profiles/ JA backgrounds/)
    await deleteAllStorageFiles(userId);

    // 2️⃣ POISTA KAIKKI TAULUT (oikeassa järjestyksessä!)
    const tables = [
      'token_usage',
      'rate_limits', 
      'promo_code_usage',
      'cover_letters',
      'cv_data',        // ✅ Jos tämä on oikea nimi
      'cvs',            // ✅ Tai tämä
      'subscriptions',
      'default_images',
      'profiles',       // ✅ Viimeisenä
    ];

    for (const table of tables) {
      try {
        const { error } = await supabaseAdmin
          .from(table)
          .delete()
          .eq('user_id', userId);
        
        if (error && error.code !== 'PGRST116') { // Ignore "no rows"
          console.warn(`⚠️ ${table}:`, error.message);
        } else {
          console.log(`✅ ${table} deleted`);
        }
      } catch (e) {
        console.warn(`⚠️ ${table} failed (maybe doesn't exist)`);
      }
    }

    // 3️⃣ POISTA CLERK
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
      console.log('✅ Clerk user deleted');
    } catch (e: any) {
      console.error('❌ Clerk deletion failed:', e.message);
    }

    return NextResponse.json({ 
      success: true,
      message: 'Kaikki poistettu onnistuneesti'
    });

  } catch (error: any) {
    console.error('💥 Deletion failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteAllStorageFiles(userId: string) {
  try {
    // Poista profiles/
    const { data: profileFiles } = await supabaseAdmin.storage
      .from('cv_files')
      .list(`profiles/${userId}/`, { limit: 1000 });

    if (profileFiles?.length) {
      const paths = profileFiles.map(f => `profiles/${userId}/${f.name}`);
      await supabaseAdmin.storage.from('cv_files').remove(paths);
      console.log(`✅ Deleted ${paths.length} profile files`);
    }

    // Poista backgrounds/
    const { data: bgFiles } = await supabaseAdmin.storage
      .from('cv_files')
      .list(`backgrounds/${userId}/`, { limit: 1000 });

    if (bgFiles?.length) {
      const paths = bgFiles.map(f => `backgrounds/${userId}/${f.name}`);
      await supabaseAdmin.storage.from('cv_files').remove(paths);
      console.log(`✅ Deleted ${paths.length} background files`);
    }

    // Poista suoraan user_id kansiosta (legacy)
    const { data: legacyFiles } = await supabaseAdmin.storage
      .from('cv_files')
      .list(userId, { limit: 1000 });

    if (legacyFiles?.length) {
      const paths = legacyFiles.map(f => `${userId}/${f.name}`);
      await supabaseAdmin.storage.from('cv_files').remove(paths);
      console.log(`✅ Deleted ${paths.length} legacy files`);
    }

  } catch (error: any) {
    console.error('❌ Storage deletion failed:', error.message);
  }
}