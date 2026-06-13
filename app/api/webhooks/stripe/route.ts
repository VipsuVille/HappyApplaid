// app/api/webhooks/stripe/route.ts — EI tokeneita (uusi free/paid-malli)
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { PRICING } from '@/lib/pricing';
// ❌ POISTETTU: import { TOKEN_ALLOCATION } from '@/lib/domain/token-allocation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  console.log('🔥 WEBHOOK CALLED!');

  try {
    const rawBody = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('⚠️ No Stripe signature');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      console.log('✅ Signature verified!');
    } catch (err: any) {
      console.error(`❌ Signature failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.log(`📨 Event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session.client_reference_id) {
          console.error('❌ Missing client_reference_id');
          return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
        }

        const userId = session.client_reference_id;
        const tier = session.metadata?.tier || 'basic';
        const billingPeriod = session.metadata?.billingPeriod || 'monthly';

        const tierConfig = PRICING[tier as keyof typeof PRICING];
        if (!tierConfig) {
          console.error(`❌ Invalid tier: ${tier}`);
          return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        let subscriptionId = session.subscription as string | null;

        if (!subscriptionId) {
          console.log('⏳ Waiting for subscription...');
          await new Promise(resolve => setTimeout(resolve, 3000));
          const updatedSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ['subscription'],
          });
          subscriptionId = updatedSession.subscription as string | null;
        }

        if (!subscriptionId) {
          console.error('❌ No subscription ID');
          return NextResponse.json(
            { error: 'Subscription not created', message: 'Will be retried by Stripe' },
            { status: 400 }
          );
        }

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        await stripe.subscriptions.update(subscription.id, {
          metadata: { userId, tier },
        });

        // ✅ TALLENNA — ei tokens-kenttää
        const { data, error } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_period: billingPeriod,
            plan: tier,
            plan_type: tier,
            is_active: ['active', 'trialing'].includes(subscription.status),
            cancel_at_period_end: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });

        if (error) {
          console.error('❌ Supabase error:', error);
          return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
        }

        console.log('✅ Subscription saved:', data);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;

        if (!userId) {
          console.log('⚠️ No userId, trying to find in DB...');
          const { data: existing } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id, plan_type')
            .eq('stripe_subscription_id', subscription.id)
            .single();

          if (!existing) {
            console.log('⚠️ Subscription not found in DB, skipping');
            return NextResponse.json({ received: true });
          }

          await stripe.subscriptions.update(subscription.id, {
            metadata: { userId: existing.user_id, tier: existing.plan_type },
          });
        }

        console.log(`📝 Updating subscription ${subscription.id}`);

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            is_active: ['active', 'trialing'].includes(subscription.status),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('❌ Update error:', error);
        } else {
          console.log('✅ Updated');
        }

        // ❌ POISTETTU: token-refresh-lohko (uudessa mallissa viikkokatto nollautuu
        //    ajan mukaan usage_events-taulusta, ei token-täydennystä laskutusjaksosta)

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        console.log(`🗑️ Deleting subscription ${subscription.id}`);

        // ✅ Palataan free-tieriin — ei tokens-kenttää
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: 'canceled',
            is_active: false,
            plan_type: 'free',
            cancel_at_period_end: false,
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('❌ Cancel error:', error);
        } else {
          console.log('✅ User returned to FREE');
        }
        break;
      }

      default:
        console.log(`ℹ️ Unhandled: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('💥 WEBHOOK ERROR:', error);
    return NextResponse.json({ error: 'Webhook failed', message: error.message }, { status: 500 });
  }
}