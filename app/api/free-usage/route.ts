// app/api/free-usage/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getFreeUsageInfo } from '@/lib/domain/freeUsageGuard';

/**
 * 🎯 MITÄ TÄMÄ TEKEE:
 * - Frontend kutsuu tätä nähdäkseen onko ilmainen käytetty
 * - Palauttaa: hasUsedCV, hasUsedCoverLetter, remainingFreeActions
 */

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const info = await getFreeUsageInfo(userId);
    
    return NextResponse.json(info);
  } catch (error) {
    console.error('Free usage API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}