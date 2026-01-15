//lib/stripe/checkoutAction.ts

'use server';

import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/stripe/subscriptions';
import { BillingPeriod } from '@/lib/pricing';

export async function createCheckoutSessionAction(
  tier: 'basic' | 'premium',
  billingPeriod: BillingPeriod
) {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('Not authenticated');
  }

  // Luo session (käyttää sun olemassa olevaa funktiota)
  const session = await createCheckoutSession(user.id, tier, billingPeriod);

  // Redirect Stripeen
  redirect(session.url!);
}