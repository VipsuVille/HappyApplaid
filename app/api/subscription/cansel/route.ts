//app/api/subscription/cansel/route.ts

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = await getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_subscription_id, status')
      .eq('user_id', userId)
      .single();

    if (error || !data?.stripe_subscription_id) {
      console.error('Error fetching subscription:', error);
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      );
    }

    // Varmista että tilaus on aktiivinen
    if (!['active', 'trialing'].includes(data.status)) {
      return NextResponse.json(
        { error: 'No active subscription to cancel' },
        { status: 400 }
      );
    }

    // Peruuta tilaus Stripessä
    await stripe.subscriptions.cancel(data.stripe_subscription_id);

    // Päivitä tietokanta (varmistus - webhook päivittää myös)
    await supabaseAdmin
      .from('subscriptions')
      .update({
        status: 'canceled',
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return NextResponse.json({ success: true, redirectTo: '/account?canceled=true' });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}