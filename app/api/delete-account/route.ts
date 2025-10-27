// app/api/delete-account/route.ts - TypeScript korjattu versio
import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

interface DeletionResult {
  success: boolean;
  deletedCount: number;
  error?: string;
}

interface DeletionResults {
  [tableName: string]: DeletionResult;
}

export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`Starting admin deletion for: ${userId}`);

    // ADMIN CLIENT - ohittaa RLS:n
    const adminSupabase: SupabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // POISTA STORAGE TIEDOSTOT
    await deleteStorageFiles(adminSupabase, userId);

    // POISTA TIETOKANTATIEDOT ADMIN-OIKEUKSILLA
    const tables: string[] = [
      "token_usage",
      "rate_limits",
      "cover_letters",
      "cvs",
      "subscriptions",
      "user_profiles",
    ];
    const results: DeletionResults = {};

    for (const table of tables) {
      try {
        const { data, error } = await adminSupabase
          .from(table)
          .delete()
          .eq("user_id", userId) // Suora vertailu ilman UUID-muunnosta
          .select("id");

        results[table] = {
          success: !error,
          deletedCount: data?.length || 0,
          error: error?.message,
        };

        if (error) {
          console.error(`${table} deletion failed:`, error);
        } else {
          console.log(`${table}: deleted ${data?.length || 0} records`);
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results[table] = {
          success: false,
          deletedCount: 0,
          error: errorMessage,
        };
      }
    }

    // POISTA CLERK KÄYTTÄJÄ
    try {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(userId);
      console.log("Clerk user deleted");
    } catch (clerkError: unknown) {
      const errorMessage =
        clerkError instanceof Error
          ? clerkError.message
          : "Unknown clerk error";
      console.error("Clerk deletion failed:", errorMessage);
    }

    return NextResponse.json({
      success: true,
      userId,
      results,
      message: "Account deleted with admin privileges",
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Admin deletion failed:", errorMessage);
    return NextResponse.json(
      {
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

async function deleteStorageFiles(
  adminSupabase: SupabaseClient,
  userId: string
): Promise<void> {
  try {
    console.log(`🗂️ Looking for files for user: ${userId}`);

    // Käyttäjän tiedostot
    const { data: userFiles, error: listError } = await adminSupabase.storage
      .from("cv_files")
      .list(userId, { limit: 1000 });

    console.log(`📁 User files found:`, {
      count: userFiles?.length || 0,
      files: userFiles?.map((f) => f.name) || [],
      error: listError?.message,
    });

    if (listError) {
      console.error(`List error for user files:`, listError);
    }

    if (userFiles && userFiles.length > 0) {
      const filePaths = userFiles.map(
        (file: { name: string }) => `${userId}/${file.name}`
      );
      console.log(`🗑️ Attempting to delete user files:`, filePaths);

      const { error: deleteError } = await adminSupabase.storage
        .from("cv_files")
        .remove(filePaths);

      if (deleteError) {
        console.error(`Delete error for user files:`, deleteError);
      } else {
        console.log(`✅ Deleted ${userFiles.length} user files`);
      }
    } else {
      console.log(`ℹ️ No user files found in /${userId}/ directory`);
    }

    // Taustakuvat
    console.log(`🖼️ Looking for background files in: backgrounds/${userId}`);

    const { data: backgroundFiles, error: bgListError } =
      await adminSupabase.storage
        .from("cv_files")
        .list(`backgrounds/${userId}`, { limit: 1000 });

    console.log(`🖼️ Background files found:`, {
      count: backgroundFiles?.length || 0,
      files: backgroundFiles?.map((f) => f.name) || [],
      error: bgListError?.message,
    });

    if (bgListError) {
      console.error(`List error for background files:`, bgListError);
    }

    if (backgroundFiles && backgroundFiles.length > 0) {
      const bgPaths = backgroundFiles.map(
        (file: { name: string }) => `backgrounds/${userId}/${file.name}`
      );
      console.log(`🗑️ Attempting to delete background files:`, bgPaths);

      const { error: bgDeleteError } = await adminSupabase.storage
        .from("cv_files")
        .remove(bgPaths);

      if (bgDeleteError) {
        console.error(`Delete error for background files:`, bgDeleteError);
      } else {
        console.log(`✅ Deleted ${backgroundFiles.length} background files`);
      }
    } else {
      console.log(
        `ℹ️ No background files found in /backgrounds/${userId}/ directory`
      );
    }

    // Tarkista vielä kaikki bucketin tiedostot (debug)
    const { data: allFiles } = await adminSupabase.storage
      .from("cv_files")
      .list("", { limit: 100 });

    const userRelatedFiles =
      allFiles?.filter(
        (f) => f.name.includes(userId) || f.name.startsWith(userId)
      ) || [];

    console.log(
      `🔍 All user-related files in bucket:`,
      userRelatedFiles.map((f) => f.name)
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown storage error";
    console.error("Storage deletion failed:", errorMessage);
  }
}
