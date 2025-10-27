import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: requestUserId } = await params;

  try {
    // 1. VALTUUTUSTARKISTUKSET
    const { userId: authUserId } = await auth();
    if (!authUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Tarkista onko admin tai käyttäjä itse
    const isAdmin = await checkIfAdmin(authUserId);
    const isSelfDeletion = authUserId === requestUserId;

    if (!isAdmin && !isSelfDeletion) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    console.log(`Starting user deletion process for: ${requestUserId}`);

    // 2. POISTA TIEDOSTOT SUPABASE STORAGE:STA
    await deleteUserFiles(requestUserId);

    // 3. POISTA TIETOKANTATIEDOT (oikeassa järjestyksessä)
    await deleteUserData(requestUserId);

    // 4. POISTA CLERK-KÄYTTÄJÄ (vain jos admin tai itse)
    if (isAdmin || isSelfDeletion) {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(requestUserId);
    }

    console.log(`User ${requestUserId} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Käyttäjä ja kaikki tiedot poistettu onnistuneesti",
      deletedUserId: requestUserId,
    });
  } catch (error) {
    console.error("User deletion failed:", error);
    return NextResponse.json(
      {
        error: "Käyttäjän poistaminen epäonnistui",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// APUFUNKTIOT

async function deleteUserFiles(userId: string) {
  console.log(`Deleting files for user: ${userId}`);

  const bucketsToClean = ["cv_files"];

  for (const bucket of bucketsToClean) {
    try {
      // Hae kaikki käyttäjän tiedostot
      const { data: files, error: listError } = await supabase.storage
        .from(bucket)
        .list(userId, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (listError) {
        console.error(`Error listing files in ${bucket}:`, listError);
        continue;
      }

      if (files && files.length > 0) {
        // Poista tiedostot
        const filePaths = files.map((file) => `${userId}/${file.name}`);

        const { error: deleteError } = await supabase.storage
          .from(bucket)
          .remove(filePaths);

        if (deleteError) {
          console.error(`Error deleting files from ${bucket}:`, deleteError);
        } else {
          console.log(`Deleted ${files.length} files from ${bucket}/${userId}`);
        }
      }

      // Poista taustakuvahakemisto
      const { data: backgroundFiles } = await supabase.storage
        .from(bucket)
        .list(`backgrounds/${userId}`, { limit: 1000 });

      if (backgroundFiles && backgroundFiles.length > 0) {
        const bgFilePaths = backgroundFiles.map(
          (file) => `backgrounds/${userId}/${file.name}`
        );
        await supabase.storage.from(bucket).remove(bgFilePaths);
        console.log(`Deleted ${backgroundFiles.length} background files`);
      }
    } catch (error) {
      console.error(`Error cleaning bucket ${bucket}:`, error);
    }
  }
}

async function deleteUserData(userId: string) {
  console.log(`Deleting database records for user: ${userId}`);

  // POISTO OIKEASSA JÄRJESTYKSESSÄ (riippuvuudet ensin)

  const deletionSteps = [
    // 1. Hakukirjeet
    { table: "cover_letters", field: "user_id", name: "Cover Letters" },

    // 2. CV:t
    { table: "cvs", field: "user_id", name: "CVs" },

    // 3. Tokenikäyttö (jos olemassa)
    {
      table: "token_usage",
      field: "user_id",
      name: "Token Usage",
      optional: true,
    },

    // 4. Tilaukset
    { table: "subscriptions", field: "user_id", name: "Subscriptions" },

    // 5. Käyttäjäprofiili (viimeisenä)
    { table: "user_profiles", field: "user_id", name: "User Profile" },

    // 6. Mahdolliset muut taulut
    {
      table: "user_activity",
      field: "user_id",
      name: "User Activity",
      optional: true,
    },
    {
      table: "user_settings",
      field: "user_id",
      name: "User Settings",
      optional: true,
    },
  ];

  for (const step of deletionSteps) {
    try {
      const { data, error } = await supabase
        .from(step.table)
        .delete()
        .eq(step.field, userId)
        .select("id");

      if (error && !step.optional) {
        throw new Error(
          `Failed to delete from ${step.table}: ${error.message}`
        );
      }

      if (data && data.length > 0) {
        console.log(`Deleted ${data.length} records from ${step.table}`);
      } else if (!step.optional) {
        console.log(`No records found in ${step.table} for user ${userId}`);
      }
    } catch (error) {
      if (step.optional) {
        console.warn(`Optional table ${step.table} deletion failed:`, error);
      } else {
        throw error;
      }
    }
  }
}

async function checkIfAdmin(userId: string): Promise<boolean> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return user.publicMetadata?.role === "admin";
  } catch {
    return false;
  }
}
