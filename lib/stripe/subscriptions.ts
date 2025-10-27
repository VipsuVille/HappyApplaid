// lib/stripe/subscriptions.ts
'use server';

import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin'; // Muutettu importti
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PRICING } from '../pricing';

export type Tier = 'basic' | 'premium' | 'professional';

// Define pricing details


export async function createCheckoutSession(userId: string, tier: Tier) {
  const supabaseAdmin = await getSupabaseAdmin();
  // Tarkista onko käyttäjällä jo aktiivinen tilaus
    console.log("TÄÄÄÄÄÄÄÄLLÄÄÄÄ eka! " )

  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .single();

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  // Luo Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: PRICING.basic.stripePriceId, // Varmista että tämä on määritelty PRICING-objektissa
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pricing`,
    client_reference_id: userId,
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
  });
  console.log("TÄÄÄÄÄÄÄÄLLÄÄÄÄ toka " )

  return session;
}

export async function getSubscription(userId: string) {
  const supabaseAdmin = await getSupabaseAdmin(); // Nyt async-kutsu
  if (!userId) {
    return { active: false };
  }

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (!data) {
    return { active: false };
  }

  const isActive = Boolean(data) && 
                  ['active', 'trialing'].includes(data.status) && 
                  new Date(data.current_period_end) > new Date();

  return { active: isActive };
}

export async function checkSubscriptionAccess(userId: string, feature: string) {
  const supabaseAdmin = await getSupabaseAdmin(); // Nyt async-kutsu
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end')
    .eq('user_id', userId)
    .single();

  if (!data) return false;
  
  const isActive = ['active', 'trialing'].includes(data.status) && 
                  new Date(data.current_period_end) > new Date();
  
  // Feature-specific restrictions if needed
  if (feature === 'cover_letter' && data.status === 'basic') {
    return false; // Only for premium tiers
  }
  
  return isActive;
}

export async function cancelSubscription() {
  const supabaseAdmin = await getSupabaseAdmin(); // Nyt async-kutsu
  const user = await currentUser();
  
  if (!user || !user.id) {
    throw new Error('Not authenticated');
  }
  
  const userId = user.id;
  
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .single();
    
  if (!data?.stripe_subscription_id) {
    throw new Error('No active subscription found');
  }
  
  await stripe.subscriptions.cancel(data.stripe_subscription_id);
  
  // Redirect back to account page
  redirect('/account?canceled=true');
}