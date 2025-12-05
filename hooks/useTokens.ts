// hooks/useTokens.ts
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export type Tier = 'free' | 'basic' | 'semi-pro' | 'pro';
export type Feature = 'v1' | 'v2' | 'ats' | 'rag';

interface SubscriptionData {
  plan: Tier;
  tokens: number;
  isActive: boolean;
  plan_type?: string;
}

const TIER_FEATURES: Record<Tier, Record<Feature, boolean>> = {
  free: { v1: true, v2: false, ats: false, rag: false },
  basic: { v1: true, v2: false, ats: false, rag: false },
  'semi-pro': { v1: true, v2: true, ats: true, rag: false },
  pro: { v1: true, v2: true, ats: true, rag: true },
};

export function useTokens() {
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, getToken } = useAuth();

  const fetchSubscription = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      
      setSubscriptionData({
        plan: (data.plan_type || data.plan || 'free') as Tier,
        tokens: data.tokens || 0,
        isActive: data.isActive || false,
        plan_type: data.plan_type
      });
    } catch (err) {
      console.error('Error fetching subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // Tarkista voiko käyttää ominaisuutta
  const canUseFeature = (feature: Feature): boolean => {
    if (!subscriptionData) return false;
    if (!subscriptionData.isActive) return false;
    
    return TIER_FEATURES[subscriptionData.plan]?.[feature] || false;
  };

  // Palauta nykyinen tier
  const getTier = (): Tier => {
    return subscriptionData?.plan || 'free';
  };

  // Palauta tier-info
  const getTierInfo = () => {
    const tier = getTier();
    return {
      name: tier,
      features: TIER_FEATURES[tier],
      isActive: subscriptionData?.isActive || false,
      tokens: subscriptionData?.tokens || 0
    };
  };

  useEffect(() => {
    fetchSubscription();
    const intervalId = setInterval(fetchSubscription, 60000);
    return () => clearInterval(intervalId);
  }, [userId]);

  return {
    tokens: subscriptionData?.tokens || 0,
    tier: getTier(),
    isActive: subscriptionData?.isActive || false,
    isLoading,
    error,
    canUseFeature,
    getTierInfo,
    refetch: fetchSubscription
  };
}