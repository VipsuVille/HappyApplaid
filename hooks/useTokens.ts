// hooks/useTokens.ts - KORJATTU CACHED VERSIO
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

export type TokenAction = 
  | 'cv_v1' 
  | 'cv_ats' 
  | 'cv_rag' 
  | 'cover_letter_v1' 
  | 'cover_letter_v2' 
  | 'cover_letter_rag';

interface TokenData {
  tokens: number;
  isActive: boolean;
  plan_type: 'free' | 'basic' | 'semi-pro' | 'pro';
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

const TIER_COSTS = {
  free: { cv_v1: 0, cv_ats: 0, cv_rag: 0, cover_letter_v1: 0, cover_letter_v2: 0, cover_letter_rag: 0 },
  basic: { cv_v1: 50, cv_ats: 0, cv_rag: 0, cover_letter_v1: 50, cover_letter_v2: 0, cover_letter_rag: 0 },
  'semi-pro': { cv_v1: 50, cv_ats: 75, cv_rag: 0, cover_letter_v1: 50, cover_letter_v2: 75, cover_letter_rag: 0 },
  pro: { cv_v1: 50, cv_ats: 75, cv_rag: 100, cover_letter_v1: 50, cover_letter_v2: 75, cover_letter_rag: 100 }
};

const TIER_FEATURES = {
  free: { canUseV1: false, canUseV2: false, canUseRAG: false, canUseATS: false },
  basic: { canUseV1: true, canUseV2: false, canUseRAG: false, canUseATS: false },
  'semi-pro': { canUseV1: true, canUseV2: true, canUseRAG: false, canUseATS: true },
  pro: { canUseV1: true, canUseV2: true, canUseRAG: true, canUseATS: true }
};

// ------------------------------------------------------------------
// 🛑 GLOBAL CACHE & DEDUPLICATION (Hookin ulkopuolella!)
// ------------------------------------------------------------------
let globalCache: TokenData | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 sekuntia
let fetchPromise: Promise<TokenData | null> | null = null; // Estää päällekkäiset pyynnöt

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(globalCache);
  const [isLoading, setIsLoading] = useState(!globalCache);
  const [error, setError] = useState<string | null>(null);
  const { userId, isSignedIn, isLoaded } = useAuth();

  // ✅ Keskitetty tapa päivittää sekä lokaali state että globaali cache
  const updateStateAndCache = (data: TokenData) => {
    globalCache = data;
    lastFetchTime = Date.now();
    setTokenData(data);
  };

  const fetchTokens = useCallback(async (forceRefresh = false) => {
    // 1. Auth check
    if (!isLoaded) return;
    if (!isSignedIn || !userId) {
        const defaultData: TokenData = {
            tokens: 0, isActive: false, plan_type: 'free',
            features: TIER_FEATURES.free, cancel_at_period_end: false,
            current_period_end: null, status: 'inactive'
        };
        updateStateAndCache(defaultData);
        setIsLoading(false);
        return;
    }

    // 2. Cache check (jos ei pakoteta päivitystä)
    const now = Date.now();
    if (!forceRefresh && globalCache && (now - lastFetchTime < CACHE_DURATION)) {
        // console.log('💾 Using cached token data');
        setTokenData(globalCache);
        setIsLoading(false);
        return;
    }

    // 3. Deduping: Jos pyyntö on jo menossa, odota sitä äläkä tee uutta
    if (fetchPromise) {
        // console.log('⏳ Waiting for existing fetch...');
        try {
            const data = await fetchPromise;
            if (data) setTokenData(data);
        } catch (err) { /* ignore secondary error */ }
        setIsLoading(false);
        return;
    }

    // 4. Actual Fetch
    // console.log('🔄 Fetching tokens from API...');
    
    // Luodaan promise, jonka muutkin komponentit voivat jakaa
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
            const planType = (data.plan_type || 'free') as keyof typeof TIER_FEATURES;
            
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
            fetchPromise = null; // Vapauta lukko
            setIsLoading(false);
        }
    })();

    await fetchPromise;
  }, [userId, isSignedIn, isLoaded]);

  // ✅ KULUTA TOKENIT
  const consumeTokens = async (action: TokenAction): Promise<boolean> => {
    if (!userId || !tokenData) return false;

    try {
      const tokensRequired = TIER_COSTS[tokenData.plan_type][action];
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

      // ✅ TÄRKEÄ: Päivitä cache heti kulutuksen jälkeen!
      // Muuten cache palauttaa vanhan saldon seuraavat 30sek.
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
    
    const tier = tokenData.plan_type;
    const required = TIER_COSTS[tier][action];

    // Check availability
    if (required === undefined) return { allowed: false, reason: 'Ei saatavilla tässä plaanissa' };
    
    // Check balance
    if (tokenData.tokens < required) return { allowed: false, reason: `Ei tarpeeksi tokeneita (${required})` };

    return { allowed: true };
  };

  // ✅ Initial fetch + Interval
  useEffect(() => {
    fetchTokens(); // Hakee (tai käyttää cachea)

    const intervalId = setInterval(() => {
        // Force refresh false -> käyttää cachea jos validi, 
        // mutta koska cache on 30s ja interval 30s, tämä hakee uuden juuri sopivasti.
        fetchTokens(); 
    }, 30000);

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
    fetchTokens: () => fetchTokens(true), // Manuaalinen refresh pakottaa haun
    canUseAction,
    getActionCost: (action: TokenAction) => tokenData ? TIER_COSTS[tokenData.plan_type][action] : 0,
  };
}