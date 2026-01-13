// hooks/useTokens.ts - KORJATTU TIER NIMET
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ACTION_COSTS, type TokenAction } from '@/lib/domain/tokens';

// ✅ OIKEAT TIER NIMET (free, basic, premium)
type PlanType = 'free' | 'basic' | 'premium';

interface TokenData {
  tokens: number;
  isActive: boolean;
  plan_type: PlanType;
  features: {
    canUseV1: boolean;
    canUseV2: boolean;
    canUseRAG: boolean;
    canUseATS: boolean;
  };
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  status: string;
}

// ✅ OIKEAT TIER NIMET
const TIER_FEATURES = {
  free: { canUseV1: false, canUseV2: false, canUseRAG: false, canUseATS: false },
  basic: { canUseV1: true, canUseV2: false, canUseRAG: false, canUseATS: false },
  premium: { canUseV1: true, canUseV2: true, canUseRAG: true, canUseATS: true }
} as const;

// ------------------------------------------------------------------
// GLOBAL CACHE & DEDUPLICATION
// ------------------------------------------------------------------
let globalCache: TokenData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 sekuntia
let fetchPromise: Promise<TokenData | null> | null = null;

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(globalCache);
  const [isLoading, setIsLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);
  const { userId, isSignedIn, isLoaded } = useAuth();

  const updateStateAndCache = (data: TokenData) => {
    globalCache = data;
    lastFetchTime = Date.now();
    setTokenData(data);
  };

  const fetchTokens = useCallback(async (forceRefresh = false) => {
    if (!isLoaded) return;
    
    if (!isSignedIn || !userId) {
      const defaultData: TokenData = {
        tokens: 0,
        isActive: false,
        plan_type: 'free',
        features: TIER_FEATURES.free,
        cancel_at_period_end: false,
        current_period_end: null,
        status: 'inactive'
      };
      updateStateAndCache(defaultData);
      setIsLoading(false);
      return;
    }

    const now = Date.now();
    if (!forceRefresh && globalCache && (now - lastFetchTime < CACHE_DURATION)) {
      setTokenData(globalCache);
      setIsLoading(false);
      return;
    }

    if (fetchPromise) {
      try {
        const data = await fetchPromise;
        if (data) setTokenData(data);
      } catch (err) { /* ignore */ }
      setIsLoading(false);
      return;
    }

    fetchPromise = (async () => {
      try {
        const response = await fetch('/api/check-subscription', {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (!response.ok) {
          if (response.status === 429) throw new Error('Too many requests');
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // ✅ NORMALISOI PLAN TYPE (varmista että se on oikea)
        let planType: PlanType = 'free';
        if (data.plan_type === 'basic' || data.plan_type === 'premium') {
          planType = data.plan_type;
        }
        
        const newData: TokenData = {
          tokens: data.tokens || 0,
          isActive: data.is_premium || false,
          plan_type: planType,
          features: TIER_FEATURES[planType],
          cancel_at_period_end: data.cancel_at_period_end || false,
          current_period_end: data.current_period_end || null,
          status: data.status || 'inactive'
        };

        updateStateAndCache(newData);
        setError(null);
        return newData;
      } catch (err) {
        console.error('❌ Error fetching tokens:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        fetchPromise = null;
        setIsLoading(false);
      }
    })();

    await fetchPromise;
  }, [userId, isSignedIn, isLoaded]);

  const consumeTokens = async (action: TokenAction): Promise<boolean> => {
    if (!userId || !tokenData) return false;

    try {
      // ✅ TYYPPITURVALLISUUS: ACTION_COSTS on nyt oikein tyypitetty
      const tierCosts = ACTION_COSTS[tokenData.plan_type];
      const tokensRequired = tierCosts?.[action] || 0;
      
      if (tokensRequired === 0) return true;

      if (tokenData.tokens < tokensRequired) {
        setError(`Ei tarpeeksi tokeneita (tarvitaan ${tokensRequired})`);
        return false;
      }

      console.log(`💰 Consuming ${tokensRequired} tokens...`);
      const response = await fetch('/api/tokens/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, tokens: tokensRequired })
      });

      if (!response.ok) throw new Error('Failed to consume tokens');
      const data = await response.json();

      if (globalCache) {
        const updatedData = { ...globalCache, tokens: data.tokensRemaining };
        updateStateAndCache(updatedData);
      }
      
      return true;
    } catch (err) {
      console.error('❌ Error consuming tokens:', err);
      setError('Token consumption failed');
      return false;
    }
  };

  const canUseAction = (action: TokenAction) => {
    if (!tokenData) return { allowed: false, reason: 'Ladataan...' };

    // FREE: EI TOKEN-TARKISTUSTA (API hoitaa)
    if (tokenData.plan_type === 'free') {
      return { allowed: true };
    }

    const tierCosts = ACTION_COSTS[tokenData.plan_type];
    const required = tierCosts?.[action];

    if (required === undefined) {
      return { allowed: false, reason: 'Ei saatavilla tässä plaanissa' };
    }

    if (tokenData.tokens < required) {
      return { allowed: false, reason: `Ei tarpeeksi tokeneita (${required})` };
    }

    return { allowed: true };
  };

  const getActionCost = (action: TokenAction): number => {
    if (!tokenData) return 0;
    const tierCosts = ACTION_COSTS[tokenData.plan_type];
    return tierCosts?.[action] || 0;
  };

  useEffect(() => {
    fetchTokens();
    const intervalId = setInterval(() => fetchTokens(), 30000);
    return () => clearInterval(intervalId);
  }, [fetchTokens]);

  return {
    tokens: tokenData?.tokens || 0,
    isActive: tokenData?.isActive || false,
    plan_type: tokenData?.plan_type || 'free',
    features: tokenData?.features || TIER_FEATURES.free,
    isLoading,
    error,
    consumeTokens,
    fetchTokens: () => fetchTokens(true),
    canUseAction,
    getActionCost,
  };
}

// ✅ EXPORT TokenAction tyyppi käytettäväksi muualla
export type { TokenAction };