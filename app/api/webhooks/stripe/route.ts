// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia'
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  console.log('🔥 WEBHOOK CALLED!');
  
  try {
    const rawBody = await req.text();
    console.log('📦 Body length:', rawBody.length);
    
    const signature = req.headers.get('stripe-signature');
    console.log('✍️ Signature:', signature?.substring(0, 20));
    
    if (!signature) {
      console.error('⚠️ No Stripe signature found');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
   
    console.log('🔍 Verifying signature...');
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
      console.log('✅ Signature verified!');
    } catch (err: any) {
      console.error(`❌ Signature verification failed: ${err.message}`);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    console.log(`📨 Event type: ${event.type}`);
    
    switch (event.type) {
     case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session;
  
  console.log('💳 Session data:', {
    id: session.id,
    client_reference_id: session.client_reference_id,
    customer: session.customer,
    subscription: session.subscription,
    metadata: session.metadata
  });
  
  if (!session.client_reference_id) {
    console.error('❌ Missing client_reference_id');
    return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
  }
  
  const userId = session.client_reference_id;
  const tier = session.metadata?.tier || 'basic';
  
  let subscriptionId = session.subscription as string | null;
  
  if (!subscriptionId) {
    console.log('⏳ Subscription not ready, waiting 3 seconds...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    try {
      const updatedSession = await stripe.checkout.sessions.retrieve(session.id, {
        expand: ['subscription']
      });
      subscriptionId = updatedSession.subscription as string | null;
      console.log('🔄 Retried, subscription ID:', subscriptionId);
    } catch (err) {
      console.error('❌ Failed to retrieve updated session:', err);
    }
  }
  
  if (!subscriptionId) {
    console.error('❌ No subscription ID found after retry');
    return NextResponse.json({ 
      error: 'Subscription not created yet',
      message: 'This will be retried by Stripe automatically'
    }, { status: 400 });
  }
  
  console.log(`📝 Processing subscription for user ${userId}, tier: ${tier}`);
  
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
  console.log('📊 Subscription details:', {
    id: subscription.id,
    status: subscription.status,
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
  });
  
  await stripe.subscriptions.update(subscription.id, {
    metadata: { userId, tier }
  });
  
  // ✅ MUUTETTU: Aseta plan_type = "premium" kaikille maksaville
  const tokenAmount = tier === 'basic' ? 1000 : tier === 'premium' ? 3000 : 5000;
  
  console.log(`💾 Saving to Supabase: user=${userId}, tokens=${tokenAmount}, plan=premium`);
  
  const { data, error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      plan: tier,
      tokens: tokenAmount,
      plan_type: 'premium', // ✅ LISÄÄ TÄMÄ: Kaikki maksavat ovat premium
      is_active: ['active', 'trialing'].includes(subscription.status),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('❌ Supabase error:', error);
    return NextResponse.json({ 
      error: 'Database error', 
      details: error.message 
    }, { status: 500 });
  }
  
  console.log('✅ SUCCESS! Subscription saved:', data);
  break;
}

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata.userId;
        
        if (!userId) {
          console.log('⚠️ No userId in metadata, skipping update');
          // Ei palauteta virhettä, koska tämä voi olla normaalia
          return NextResponse.json({ received: true });
        }
        
        console.log(`📝 Updating subscription ${subscription.id} for user ${userId}`);
        
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
          console.error('❌ Update error:', error);
        } else {
          console.log('✅ Subscription updated successfully');
        }
        break;
      }

      case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription;
  
  console.log(`📝 Cancelling subscription ${subscription.id}`);
  
  // ✅ MUUTETTU: Aseta plan_type takaisin "free":ksi kun tilaus päättyy
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .update({ 
      status: subscription.status,
      is_active: false,
      plan_type: 'free', // ✅ LISÄÄ TÄMÄ: Palataan FREE-tieriin
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('❌ Cancel error:', error);
  } else {
    console.log('✅ Subscription cancelled, user returned to FREE tier');
  }
  break;
}
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
    
  } catch (error: any) {
    console.error('💥 CRITICAL WEBHOOK ERROR:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Webhook processing failed', 
      message: error.message 
    }, { status: 500 });
  }
}