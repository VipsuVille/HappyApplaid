// lib/admin.ts — admin-tarkistus (palvelinpuoli). Käyttää Clerkin publicMetadata.role:a.
// Aseta Clerk Dashboardissa omalle käyttäjälle: Public metadata → { "role": "admin" }
import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getAdminUserId(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    return user.publicMetadata?.role === "admin" ? userId : null;
  } catch {
    return null;
  }
}