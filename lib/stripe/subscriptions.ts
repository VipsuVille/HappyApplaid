// lib/stripe/subscriptions.ts
'use server';

import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { PRICING, TIER_FEATURES } from '../pricing';

export type Tier = 'basic' | 'semi-pro' | 'pro';

export async function createCheckoutSession(userId: string, tier: Tier) {
  const supabaseAdmin = await getSupabaseAdmin();
  
  console.log(`Creating checkout session for user: ${userId}, tier: ${tier}`);

  // Tarkista onko käyttäjällä jo aktiivinen tilaus
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  // Hae oikea price ID tieristä
  const priceId = PRICING[tier].stripePriceId;
  
  if (!priceId) {
    throw new Error(`Price ID not found for tier: ${tier}`);
  }

  console.log(`Using price ID: ${priceId} for tier: ${tier}`);

  // Luo Stripe checkout session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
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

  console.log(`Checkout session created: ${session.id}`);

  return session;
}

export async function getSubscription(userId: string) {
  const supabaseAdmin = await getSupabaseAdmin();
  
  if (!userId) {
    return { active: false, tier: null };
  }

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, plan_type')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (!data) {
    return { active: false, tier: null };
  }

  const isActive = Boolean(data) && 
                  ['active', 'trialing'].includes(data.status) && 
                  new Date(data.current_period_end) > new Date();

  return { 
    active: isActive,
    tier: data.plan_type as Tier
  };
}

/**
 * Tarkistaa tier-kohtaiset ominaisuudet
 */
export function getTierFeatures(planType: string) {
  // Normalisoi tier-nimi
  const normalizedTier = planType.toLowerCase().replace('_', '-');
  
  switch (normalizedTier) {
    case 'basic':
      return TIER_FEATURES.basic;
    case 'semi-pro':
    case 'semipro':
      return TIER_FEATURES['semi-pro'];
    case 'pro':
    case 'premium':
      return TIER_FEATURES.pro;
    default:
      console.warn(`Unknown tier: ${planType}, defaulting to no access`);
      return {
        canUseV1: false,
        canUseV2: false,
        canUseRAG: false,
        canUseATS: false,
        name: 'Unknown',
        costPerLetter: 0
      };
  }
}

export async function checkSubscriptionAccess(userId: string, feature: string) {
  const supabaseAdmin = await getSupabaseAdmin();
  
  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, plan_type')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;
  
  const isActive = ['active', 'trialing'].includes(data.status) && 
                  new Date(data.current_period_end) > new Date();
  
  if (!isActive) return false;
  
  const tierFeatures = getTierFeatures(data.plan_type);
  
  // Feature-specific restrictions based on tier
  switch (feature) {
    case 'v1_generator':
      return tierFeatures.canUseV1;
      
    case 'v2_generator':
    case 'ats_optimization':
      return tierFeatures.canUseV2;
      
    case 'rag_knowledge':
      return tierFeatures.canUseRAG;
      
    case 'ats_analysis':
      return tierFeatures.canUseATS;
      
    case 'question_generation':
    case 'master_guardian':
    case 'validation':
      // These are available for all active tiers
      return true;
      
    default:
      return isActive;
  }
}

export async function cancelSubscription() {
  const supabaseAdmin = await getSupabaseAdmin();
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
  
  redirect('/account?canceled=true');
}