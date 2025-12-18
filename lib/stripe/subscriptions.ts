// lib/stripe/subscriptions.ts - KORJATTU
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

  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  const priceId = PRICING[tier].stripePriceId;
  
  if (!priceId) {
    throw new Error(`Price ID not found for tier: ${tier}`);
  }

  console.log(`Using price ID: ${priceId} for tier: ${tier}`);

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

export async function getActiveSubscriptionForMiddleware(userId: string) {
  const supabaseAdmin = await getSupabaseAdmin();
  
  if (!userId) {
    return { active: false, tier: null };
  }

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, plan_type, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) {
    return { active: false, tier: null };
  }

  // ✅ KORJAUS: Käytä is_active kenttää suoraan
  // Jos current_period_end puuttuu tai on mennyt, is_active pitäisi olla false
  const isActive = data.is_active === true && 
                   ['active', 'trialing'].includes(data.status);

  // Tarkista vielä current_period_end jos se on olemassa
  if (isActive && data.current_period_end) {
    const periodEnd = new Date(data.current_period_end);
    if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) {
      return { active: false, tier: null };
    }
  }

  return { 
    active: isActive,
    tier: data.plan_type as Tier
  };
}

/**
 * Tarkistaa tier-kohtaiset ominaisuudet
 */
export async function getTierFeatures(planType: string) {
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
    .select('status, current_period_end, plan_type, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;
  
  const isActive = data.is_active === true && 
                   ['active', 'trialing'].includes(data.status);
  
  if (!isActive) return false;
  
  const tierFeatures = await getTierFeatures(data.plan_type);
  
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