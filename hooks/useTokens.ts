// hooks/useTokens.ts
'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

export type TokenAction = 'cv' | 'cover_letter';

interface TokenData {
  tokens: number;
  isActive: boolean;
  plan: string;
}

export function useTokens() {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userId, getToken } = useAuth();

  // Token costs for different actions
  const TOKEN_COSTS: Record<TokenAction, number> = {
    cv: 5,
    cover_letter: 5
  };

  const fetchTokens = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const response = await fetch('/api/tokens', {
        method: 'GET', // Explicitly set method to GET
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch tokens');
      }

      const data = await response.json();
      setTokenData(data);
    } catch (err) {
      console.error('Error fetching tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const consumeTokens = async (action: TokenAction): Promise<boolean> => {
    if (!userId) {
      return false;
    }

    try {
      const tokensRequired = TOKEN_COSTS[action];
      const token = await getToken();
     
      const response = await fetch('/api/tokens/consume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          tokens: tokensRequired
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to consume tokens');
      }

      const data = await response.json();
     
      // Update local token count
      if (tokenData) {
        setTokenData({
          ...tokenData,
          tokens: data.tokensRemaining
        });
      }
     
      return true;
    } catch (err) {
      console.error('Error consuming tokens:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  };

  const canUseAction = (action: TokenAction): boolean => {
    if (!tokenData) return false;
   
    // Check if subscription is active
    if (!tokenData.isActive) return false;
   
    // Check if user has enough tokens
    return tokenData.tokens >= TOKEN_COSTS[action];
  };

  useEffect(() => {
    fetchTokens();
   
    // Set up polling to refresh token count every minute
    const intervalId = setInterval(fetchTokens, 60000);
   
    return () => clearInterval(intervalId);
  }, [userId]);

  return {
    tokens: tokenData?.tokens || 0,
    isActive: tokenData?.isActive || false,
    plan: tokenData?.plan || 'none',
    isLoading,
    error,
    consumeTokens,
    fetchTokens,
    canUseAction,
    tokenCost: TOKEN_COSTS
  };
}