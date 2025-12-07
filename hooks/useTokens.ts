// hooks/useTokens.ts - LOPULLINEN VERSIO
'use client';

import { useState, useEffect } from 'react';
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

// ✅ TIER-KUSTANNUKSET (sama kuin dokumentissa 17, mutta korjatut hinnat)
const TIER_COSTS = {
  free: {
    cv_v1: 0,
    cv_ats: 0,
    cv_rag: 0,
    cover_letter_v1: 0,
    cover_letter_v2: 0,
    cover_letter_rag: 0,
  },
  basic: {
    cv_v1: 50,
    cv_ats: 0, // Ei saatavilla
    cv_rag: 0,
    cover_letter_v1: 50,
    cover_letter_v2: 0, // Ei saatavilla
    cover_letter_rag: 0,
  },
  'semi-pro': {
    cv_v1: 50,
    cv_ats: 75,
    cv_rag: 0,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 0,
  },
  pro: {
    cv_v1: 50,
    cv_ats: 75,
    cv_rag: 100,
    cover_letter_v1: 50,
    cover_letter_v2: 75,
    cover_letter_rag: 100,
  }
};

const TIER_FEATURES = {
  free: { canUseV1: false, canUseV2: false, canUseRAG: false, canUseATS: false },
  basic: { canUseV1: true, canUseV2: false, canUseRAG: false, canUseATS: false },
  'semi-pro': { canUseV1: true, canUseV2: true, canUseRAG: false, canUseATS: true },
  pro: { canUseV1: true, canUseV2: true, canUseRAG: true, canUseATS: true }
};

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, isSignedIn } = useAuth();

  const fetchTokens = async (retries = 3) => {
  // ✅ Jos ei kirjautunut, aseta safe defaults
  if (!isSignedIn || !userId) {
    setTokenData({
      tokens: 0,
      isActive: false,
      plan_type: 'free',
      features: TIER_FEATURES.free,
      cancel_at_period_end: false,
      current_period_end: null,
      status: 'inactive'
    });
    setIsLoading(false);
    return;
  }

  try {
    console.log(`🔄 Fetching tokens (attempt ${4 - retries}/3)...`);
    
    const response = await fetch('/api/check-subscription', {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' }
    });

    // ✅ JOS 401 JA RETRIESEJÄ JÄLJELLÄ → YRITÄ UUDELLEEN
    if (response.status === 401 && retries > 0) {
      console.warn(`⚠️ Auth not ready (401), retrying in 1s... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchTokens(retries - 1);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    console.log('✅ Token data received:', {
      plan_type: data.plan_type,
      tokens: data.tokens,
      is_premium: data.is_premium,
      cancel_at_period_end: data.cancel_at_period_end
    });

    const planType = (data.plan_type || 'free') as 'free' | 'basic' | 'semi-pro' | 'pro';
    
    setTokenData({
      tokens: data.tokens || 0,
      isActive: data.is_premium || false,
      plan_type: planType,
      features: TIER_FEATURES[planType],
      cancel_at_period_end: data.cancel_at_period_end || false,
      current_period_end: data.current_period_end || null,
      status: data.status || 'inactive'
    });

    setError(null);
  } catch (err) {
    console.error('❌ Error fetching tokens:', err);
    setError(err instanceof Error ? err.message : 'Unknown error');
    
    // Safe fallback
    setTokenData({
      tokens: 0,
      isActive: false,
      plan_type: 'free',
      features: TIER_FEATURES.free,
      cancel_at_period_end: false,
      current_period_end: null,
      status: 'inactive'
    });
  } finally {
    setIsLoading(false);
  }
};

  // ✅ KULUTA TOKENIT
  const consumeTokens = async (action: TokenAction): Promise<boolean> => {
    if (!userId || !tokenData) {
      console.error('❌ No userId or tokenData');
      return false;
    }

    try {
      const tokensRequired = getActionCost(action);
      
      if (tokensRequired === 0) {
        console.log('✅ Action requires 0 tokens');
        return true;
      }

      if (tokenData.tokens < tokensRequired) {
        setError(`Ei tarpeeksi tokeneita (tarvitaan ${tokensRequired})`);
        return false;
      }

      console.log(`💰 Consuming ${tokensRequired} tokens for ${action}...`);

      const response = await fetch('/api/tokens/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          tokens: tokensRequired // ✅ Käytä "tokens" kenttää (kuten API odottaa)
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to consume tokens');
      }

      const data = await response.json();
      
      console.log(`✅ Tokens consumed. Remaining: ${data.tokensRemaining}`);

      // Päivitä local state
      setTokenData(prev => prev ? {
        ...prev,
        tokens: data.tokensRemaining
      } : null);
      
      return true;
    } catch (err) {
      console.error('❌ Error consuming tokens:', err);
      setError(err instanceof Error ? err.message : 'Token consumption failed');
      return false;
    }
  };

  // ✅ TARKISTA VOIKO KÄYTTÄÄ TOIMINTOA
  const canUseAction = (action: TokenAction): {
    allowed: boolean;
    reason?: string;
  } => {
    if (!tokenData) {
      return { 
        allowed: false, 
        reason: 'Ei subscription-dataa' 
      };
    }

    const tier = tokenData.plan_type;
    const tokensRequired = TIER_COSTS[tier][action];

    // Jos action ei ole saatavilla tälle tierille
    if (tokensRequired === undefined || tokensRequired === 0) {
      const actionName = action.includes('rag') ? 'RAG' :
                        action.includes('v2') || action.includes('ats') ? 'ATS' :
                        'V1';
      
      return { 
        allowed: false, 
        reason: `${actionName} ei saatavilla ${tier.toUpperCase()}-tiellä` 
      };
    }

    // Tarkista onko tilaus aktiivinen
    if (!tokenData.isActive && tier !== 'free') {
      return { 
        allowed: false, 
        reason: 'Tilaus ei aktiivinen' 
      };
    }

    // Tarkista tokenit
    if (tokenData.tokens < tokensRequired) {
      return { 
        allowed: false, 
        reason: `Tarvitaan ${tokensRequired} tokenia (sinulla ${tokenData.tokens})` 
      };
    }

    return { allowed: true };
  };

  // ✅ ANNA TOIMINNON HINTA
  const getActionCost = (action: TokenAction): number => {
    if (!tokenData) return 0;
    return TIER_COSTS[tokenData.plan_type][action] || 0;
  };

  // ✅ AUTO-REFRESH
  useEffect(() => {
    fetchTokens();

    // Päivitä 30 sekunnin välein
    const intervalId = setInterval(fetchTokens, 30000);

    return () => clearInterval(intervalId);
  }, [userId, isSignedIn]);

  return {
    // Data
    tokens: tokenData?.tokens || 0,
    isActive: tokenData?.isActive || false,
    plan_type: tokenData?.plan_type || 'free',
    features: tokenData?.features || TIER_FEATURES.free,
    cancel_at_period_end: tokenData?.cancel_at_period_end || false,
    current_period_end: tokenData?.current_period_end || null,
    status: tokenData?.status || 'inactive',

    // Loading/Error
    isLoading,
    error,

    // Actions
    consumeTokens,
    fetchTokens,
    canUseAction,
    getActionCost,
  };
}