// lib/auth/auth.ts
import { auth as clerkAuth } from '@clerk/nextjs/server';

/**
 * Hakee käyttäjän ID:n Clerk-autentikaatiosta
 */
export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await clerkAuth();
  return userId;
}