// app/api/make-admin/route.ts
import { clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { userId } = await req.json();
  try {
    // Odota ensin clerkClient-funktion suoritusta
    const clerk = await clerkClient();
    
    // Nyt voit käyttää users-objektia
    await clerk.users.updateUser(userId, {
      publicMetadata: {
        role: 'admin'
      }
    });
   
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Role update failed' },
      { status: 500 }
    );
  }
}