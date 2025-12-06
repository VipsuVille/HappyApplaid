// lib/server/getFreemiumStatus.ts - KORJATTU
import { createClient } from '@supabase/supabase-js';
import type { FreemiumStatus } from '@/lib/types/subscription.types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function getFreemiumStatus(userId: string): Promise<FreemiumStatus> {
  try {
    const [subscriptionResult, cvCountResult] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active') // ✅ Tarkista myös status
        .maybeSingle(),
      supabase
        .from('cvs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
    ]);

    const subscription = subscriptionResult.data;
    const cvCount = cvCountResult.count || 0;
    
    // ✅ KORJATTU: Tunnista kaikki premium-tierit
    const planType = subscription?.plan_type || 'free';
    const isPremium = ['basic', 'semi-pro', 'pro'].includes(planType);
    
    const hasUsedFreeCv = cvCount > 0;

    console.log('📊 Freemium Status:', {
      userId,
      planType,
      isPremium,
      tokens: subscription?.tokens || 0,
      cvCount,
      hasUsedFreeCv
    });

    return {
      is_premium: isPremium,
      tokens: subscription?.tokens || 0,
      has_used_free_cv: hasUsedFreeCv,
      can_create_cv: isPremium || !hasUsedFreeCv,
      plan_type: planType as 'free' | 'basic' | 'semi-pro' | 'pro',
      cv_count: cvCount,
    };
  } catch (error) {
    console.error('Error fetching freemium status:', error);
    
    return {
      is_premium: false,
      tokens: 0,
      has_used_free_cv: false,
      can_create_cv: true,
      plan_type: 'free',
      cv_count: 0,
    };
  }
}