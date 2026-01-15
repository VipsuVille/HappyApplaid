// lib/stripe/subscriptions.ts - TÄYSIN KORJATTU
'use server';

import { stripe } from '@/lib/stripe';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { BillingPeriod, PRICING } from '../pricing';

export type Tier = 'free' | 'basic' | 'premium';

export async function createCheckoutSession(
  userId: string,
  tier: Tier,
  billingPeriod: BillingPeriod = 'monthly'
) {
  const supabaseAdmin = await getSupabaseAdmin();

  console.log(`Creating checkout session for user: ${userId}, tier: ${tier}, period: ${billingPeriod}`);

  // Tarkista onko jo aktiivinen tilaus
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('status')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing'])
    .maybeSingle();

  if (existingSubscription) {
    throw new Error('User already has an active subscription');
  }

  if (tier === 'free') {
    throw new Error('Free tier has no checkout');
  }

  // Hae tier config
  const tierConfig = PRICING[tier];
  if (!('stripePriceId' in tierConfig)) {
    throw new Error(`Tier ${tier} has no Stripe pricing`);
  }

  // ✅ Käytä billing periodia
  const priceId = tierConfig.stripePriceId[billingPeriod];

  if (!priceId) {
    throw new Error(`Price ID not found for tier: ${tier}, period: ${billingPeriod}`);
  }

  console.log(`Using price ID: ${priceId} for tier: ${tier}, period: ${billingPeriod}`);

  // ✅ LUO STRIPE CHECKOUT SESSION
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
    metadata: {
      userId,
      tier,
      billingPeriod,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
        billingPeriod,
      },
    },
  });

  console.log(`Checkout session created: ${session.id}`);

  return session;
}

// ... (loput funktiot pysyvät samana)
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

  const isActive =
    data.is_active === true && ['active', 'trialing'].includes(data.status);

  if (isActive && data.current_period_end) {
    const periodEnd = new Date(data.current_period_end);
    if (isNaN(periodEnd.getTime()) || periodEnd <= new Date()) {
      return { active: false, tier: null };
    }
  }

  return {
    active: isActive,
    tier: data.plan_type as Tier,
  };
}

export async function getTierFeatures(planType: string) {
  const tier = planType.toLowerCase() as keyof typeof PRICING;

  if (!PRICING[tier]) {
    return PRICING.free.features;
  }

  return PRICING[tier].features;
}

export async function checkSubscriptionAccess(
  userId: string,
  feature: string
) {
  const supabaseAdmin = await getSupabaseAdmin();

  const { data } = await supabaseAdmin
    .from('subscriptions')
    .select('status, current_period_end, plan_type, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return false;

  const isActive =
    data.is_active === true && ['active', 'trialing'].includes(data.status);

  if (!isActive) return false;

  const tier = data.plan_type as keyof typeof PRICING;
  const tierFeatures = PRICING[tier]?.featureFlags ?? PRICING.free.featureFlags;

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