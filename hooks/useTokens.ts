// hooks/useTokens.ts - PÄIVITETTY VERSIO
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export type TokenAction = 'cv_v1' | 'cv_ats' | 'cv_rag' | 'cover_letter_v1' | 'cover_letter_v2' | 'cover_letter_rag';

interface TokenData {
  tokens: number;
  isActive: boolean;
  plan: 'free' | 'basic' | 'semi-pro' | 'pro';
  plan_type: string;
  features: {
    canUseV1: boolean;
    canUseV2: boolean;
    canUseRAG: boolean;
    canUseATS: boolean;
  };
}

// ✅ TIER-POHJAINEN HINNOITTELU
const TIER_COSTS = {
  free: {
    cv_v1: 0, // 1x ilmainen
    cv_ats: 0,
    cv_rag: 0,
    cover_letter_v1: 0,
    cover_letter_v2: 0,
    cover_letter_rag: 0,
  },
  basic: {
    cv_v1: 5,
    cv_ats: 0, // Ei saatavilla
    cv_rag: 0, // Ei saatavilla
    cover_letter_v1: 5,
    cover_letter_v2: 0, // Ei saatavilla
    cover_letter_rag: 0, // Ei saatavilla
  },
  'semi-pro': {
    cv_v1: 5,
    cv_ats: 10, // ATS käytettävissä
    cv_rag: 0, // Ei vielä
    cover_letter_v1: 5,
    cover_letter_v2: 10, // ATS
    cover_letter_rag: 0, // Ei vielä
  },
  pro: {
    cv_v1: 5,
    cv_ats: 10,
    cv_rag: 15, // RAG
    cover_letter_v1: 5,
    cover_letter_v2: 10,
    cover_letter_rag: 15, // RAG
  }
};

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId } = useAuth();

  const fetchTokens = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      // ✅ KÄYTÄ YHDISTETTYÄ API:A
      const response = await fetch('/api/subscription', {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch subscription');
      }

      const data = await response.json();
      
      setTokenData({
        tokens: data.tokens || 0,
        isActive: data.isActive || false,
        plan: data.plan || 'free',
        plan_type: data.plan_type || 'free',
        features: data.features || {
          canUseV1: true,
          canUseV2: false,
          canUseRAG: false,
          canUseATS: false,
        }
      });
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ KULUTA TOKENIT (käyttää RPC-funktiota)
  const consumeTokens = async (action: TokenAction): Promise<boolean> => {
    if (!userId || !tokenData) {
      return false;
    }

    try {
      const tier = tokenData.plan_type as keyof typeof TIER_COSTS;
      const tokensRequired = TIER_COSTS[tier]?.[action] || 0;
      
      if (tokensRequired === 0) {
        console.log('Action requires 0 tokens');
        return true;
      }

      // Tarkista onko tarpeeksi tokeneita
      if (tokenData.tokens < tokensRequired) {
        setError('Tokenit loppuivat');
        return false;
      }

      // Kuluta Supabase RPC:llä
      const response = await fetch('/api/tokens/consume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          action,
          tokensRequired
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to consume tokens');
      }

      const data = await response.json();
      
      // Päivitä local state
      setTokenData(prev => prev ? {
        ...prev,
        tokens: data.tokensRemaining
      } : null);
      
      return true;
    } catch (err) {
      console.error('Error consuming tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  // ✅ TARKISTA ONKO VARAA TOIMINTOON
  const canUseAction = (action: TokenAction): {
    allowed: boolean;
    reason?: string;
    tokensNeeded: number;
  } => {
    if (!tokenData) {
      return { allowed: false, reason: 'Ei subscription-dataa', tokensNeeded: 0 };
    }
   
    const tier = tokenData.plan_type as keyof typeof TIER_COSTS;
    const tokensRequired = TIER_COSTS[tier]?.[action];

    // Jos tokensRequired on undefined, toiminto ei ole saatavilla tälle tierille
    if (tokensRequired === undefined) {
      return { 
        allowed: false, 
        reason: 'Toiminto ei saatavilla tällä tiellä',
        tokensNeeded: 0
      };
    }
   
    // Tarkista onko aktiivinen
    if (!tokenData.isActive && tier !== 'free') {
      return { 
        allowed: false, 
        reason: 'Tilaus ei aktiivinen',
        tokensNeeded: tokensRequired
      };
    }
   
    // Tarkista tokenit
    if (tokenData.tokens < tokensRequired) {
      return { 
        allowed: false, 
        reason: `Tarvitaan ${tokensRequired} tokenia, sinulla ${tokenData.tokens}`,
        tokensNeeded: tokensRequired
      };
    }

    return { allowed: true, tokensNeeded: tokensRequired };
  };

  // ✅ HELPER: Anna kustannus toiminnolle
  const getActionCost = (action: TokenAction): number => {
    if (!tokenData) return 0;
    const tier = tokenData.plan_type as keyof typeof TIER_COSTS;
    return TIER_COSTS[tier]?.[action] || 0;
  };

  useEffect(() => {
    fetchTokens();
   
    // Päivitä 30 sekunnin välein
    const intervalId = setInterval(fetchTokens, 30000);
   
    return () => clearInterval(intervalId);
  }, [userId]);

  return {
    // Data
    tokens: tokenData?.tokens || 0,
    isActive: tokenData?.isActive || false,
    plan: tokenData?.plan || 'free',
    plan_type: tokenData?.plan_type || 'free',
    features: tokenData?.features || {
      canUseV1: true,
      canUseV2: false,
      canUseRAG: false,
      canUseATS: false,
    },
    
    // Loading/Error states
    isLoading,
    error,
    
    // Actions
    consumeTokens,
    fetchTokens,
    canUseAction,
    getActionCost,
  };
}