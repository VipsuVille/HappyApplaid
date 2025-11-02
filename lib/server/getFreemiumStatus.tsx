// lib/server/getFreemiumStatus.ts
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
        .eq('is_active', true)
        .maybeSingle(),
      supabase
        .from('cvs')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
    ]);

    const subscription = subscriptionResult.data;
    const cvCount = cvCountResult.count || 0;
    const isPremium = subscription?.plan_type === 'premium';
    const hasUsedFreeCv = cvCount > 0;

    return {
      is_premium: isPremium,
      tokens: subscription?.tokens || 0,
      has_used_free_cv: hasUsedFreeCv,
      can_create_cv: isPremium || !hasUsedFreeCv,
      plan_type: isPremium ? 'premium' : 'free',
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