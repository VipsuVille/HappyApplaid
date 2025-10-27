// app/api/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Stripe } from 'stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Webhook secret from environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

/**
 * Handles Stripe webhooks
 */
export async function POST(req: NextRequest) {
  // Important: We need the raw body for signature verification
  // NextRequest has a specific way to get the raw body
  const rawBody = await req.text();
  
  // Get the signature from headers
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    console.error('⚠️ No Stripe signature found in headers');
    return NextResponse.json({ error: 'No signature provided' }, { status: 400 });
  }

  try {
    console.log('Processing webhook...');
    const supabaseAdmin = await getSupabaseAdmin();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
    }

    console.log(`Processing webhook event: ${event.type}`);

    // Handle different event types
    switch (event.type) {
      // When checkout session is completed (user has paid)
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Ensure we have all required data
        if (!session.client_reference_id || !session.subscription) {
          console.error('Missing client_reference_id or subscription in session', session);
          return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        const userId = session.client_reference_id;
        const tier = session.metadata?.tier || 'basic';
        
        // Get subscription details
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        
        // Update subscription metadata with userId and tier for future webhooks
        await stripe.subscriptions.update(subscription.id, {
          metadata: {
            userId: userId,
            tier: tier
          }
        });
        
        // Calculate token amount based on tier
        let tokenAmount = 0;
        switch (tier) {
          case 'basic':
            tokenAmount = 1000;
            break;
          case 'premium':
            tokenAmount = 3000;
            break;
          case 'professional':
            tokenAmount = 5000;
            break;
          default:
            tokenAmount = 500;
        }

        console.log(`Creating subscription for user ${userId}, tier: ${tier}, tokens: ${tokenAmount}`);

        // Save subscription to database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .upsert({
            user_id: userId,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: subscription.id,
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            plan: tier,
            tokens: tokenAmount,
            is_active: ['active', 'trialing'].includes(subscription.status),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error saving subscription to database:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        break;
      }

      // When subscription is updated (e.g., billing period ends or card is charged)
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Get subscription metadata
        const userId = subscription.metadata.userId;
        const tier = subscription.metadata.tier || 'basic';
        
        if (!userId) {
          console.error('Missing userId in subscription metadata', subscription);
          // Try to find user in Supabase based on subscription_id
          const { data } = await supabaseAdmin
            .from('subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          
          if (data?.user_id) {
            console.log(`Found userId ${data.user_id} for subscription ${subscription.id}`);
            // Update metadata
            await stripe.subscriptions.update(subscription.id, {
              metadata: {
                userId: data.user_id,
                tier: tier
              }
            });
          } else {
            return NextResponse.json({ error: 'Missing userId and could not find it in database' }, { status: 400 });
          }
        }
        
        console.log(`Updating subscription for user ${userId}, tier: ${tier}`);
        
        // Update subscription details in database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            is_active: ['active', 'trialing'].includes(subscription.status),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating subscription in database:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        // If it's a new billing period, add tokens
        if (event.data.previous_attributes?.current_period_end !== undefined) {
          let tokenAmount = 0;
          switch (tier) {
            case 'basic':
              tokenAmount = 1000;
              break;
            case 'premium':
              tokenAmount = 3000;
              break;
            case 'professional':
              tokenAmount = 5000;
              break;
            default:
              tokenAmount = 500;
          }
          
          // Add tokens
          const { error: tokenError } = await supabaseAdmin
            .from('subscriptions')
            .update({
              tokens: tokenAmount, // Set new tokens
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', subscription.id);
            
          if (tokenError) {
            console.error('Error adding tokens:', tokenError);
            return NextResponse.json({ error: 'Database error on token update' }, { status: 500 });
          }
        }
        
        break;
      }

      // When subscription is canceled
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
        console.log(`Cancelling subscription ${subscription.id}`);
        
        // Update subscription status in database
        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ 
            status: subscription.status,
            is_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error('Error updating cancelled subscription in database:', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}