// app/api/subscription/cancel/route.ts - KORJATTU
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
      .select('stripe_subscription_id, status, current_period_end')
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

    // ✅ TÄRKEÄ: Peruuta jakson lopussa, ei välittömästi
    const canceledSubscription = await stripe.subscriptions.update(
      data.stripe_subscription_id,
      {
        cancel_at_period_end: true, // ← Peruuttaa jakson lopussa
        metadata: {
          cancellation_requested_at: new Date().toISOString(),
          canceled_by_user: userId
        }
      }
    );

    console.log('✅ Subscription will cancel at:', canceledSubscription.cancel_at);

    // ✅ Päivitä status tietokantaan (säilytä is_active=true jakson loppuun)
    await supabaseAdmin
      .from('subscriptions')
      .update({
        cancel_at_period_end: true, // ← Merkitse että peruutetaan
        updated_at: new Date().toISOString(),
        // ❌ EI aseta status='canceled' tai is_active=false vielä
      })
      .eq('stripe_subscription_id', data.stripe_subscription_id);

    return NextResponse.json({ 
      success: true, 
      message: `Tilaus päättyy ${new Date(data.current_period_end).toLocaleDateString('fi-FI')}`,
      cancelAt: data.current_period_end,
      redirectTo: '/account?canceled=true' 
    });

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    );
  }
}