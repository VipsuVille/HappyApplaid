// app/api/subscription/reactivate/route.ts - UUSI
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
      .select('stripe_subscription_id, cancel_at_period_end')
      .eq('user_id', userId)
      .single();

    if (error || !data?.stripe_subscription_id) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    if (!data.cancel_at_period_end) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      );
    }

    // ✅ Peruuta peruutus Stripessä
    await stripe.subscriptions.update(data.stripe_subscription_id, {
      cancel_at_period_end: false
    });

    // ✅ Päivitä tietokanta
    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return NextResponse.json({ 
      success: true,
      message: 'Tilaus jatkuu normaalisti'
    });

  } catch (error) {
    console.error('Reactivation error:', error);
    return NextResponse.json(
      { error: 'Failed to reactivate' },
      { status: 500 }
    );
  }
}