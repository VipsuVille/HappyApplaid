// context/SubscriptionContext.tsx - KORJATTU
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface SubscriptionData {
  tier: 'free' | 'basic' | 'premium'
  plan_type: 'free' | 'basic' | 'premium';
  active: boolean;
  tokens: number;
  has_used_free_cv: boolean;
  can_create_cv: boolean;
  cv_count: number;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
  status: string;
}

interface SubscriptionContextValue {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue>({
  subscription: null,
  isLoading: true,
  error: null,
  refetch: async () => {},
});

function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded: clerkLoaded } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchSubscription = useCallback(async () => {
    if (!clerkLoaded) {
      console.log('⏳ Context: Waiting for Clerk...');
      return;
    }

    if (!userId) {
      console.log('👤 Context: Not logged in → Free tier');
      setSubscription({
        tier: 'free',
        plan_type: 'free',
        active: false,
        tokens: 0,
        has_used_free_cv: false,
        can_create_cv: true,
        cv_count: 0,
        cancel_at_period_end: false,
        current_period_end: null,
        status: 'inactive'
      });
      setIsLoading(false);
      return;
    }

    try {
      console.log(`🔄 Context: Fetching subscription (userId: ${userId})`);
      
      const response = await fetch('/api/check-subscription', {
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ Context: 401 Unauthorized');
          
          if (retryCount < 3) {
            console.log(`🔄 Retrying in 2s... (attempt ${retryCount + 1}/3)`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
              fetchSubscription();
            }, 2000);
            return;
          }
          
          throw new Error('Authentication failed after retries');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Context: Subscription fetched:', {
        tier: data.tier,
        active: data.active,
        tokens: data.tokens
      });

      // ✅ TALLENNA OIKEIN
      setSubscription({
        tier: data.tier || 'free',
        plan_type: data.plan_type || 'free',
        active: data.active || false,
        tokens: data.tokens || 0,
        has_used_free_cv: data.has_used_free_cv || false,
        can_create_cv: data.can_create_cv || false,
        cv_count: data.cv_count || 0,
        cancel_at_period_end: data.cancel_at_period_end || false,
        current_period_end: data.current_period_end,
        status: data.status || 'inactive'
      });
      
      setError(null);
      setRetryCount(0);
      setIsLoading(false);

    } catch (err) {
      if (err instanceof Error && err.message.includes('retrying')) {
        console.warn('Retry scheduled, keeping loading state');
        return;
      }

      console.error('❌ Context: Subscription fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Safe defaults
      setSubscription({
        tier: 'free',
        plan_type: 'free',
        active: false,
        tokens: 0,
        has_used_free_cv: false,
        can_create_cv: true,
        cv_count: 0,
        cancel_at_period_end: false,
        current_period_end: null,
        status: 'inactive'
      });

      setIsLoading(false);
    }
  }, [userId, clerkLoaded, retryCount]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!clerkLoaded || !userId) return;
    
    const interval = setInterval(() => {
      console.log('🔄 Context: 60s interval refresh');
      fetchSubscription();
    }, 60000);
    
    return () => clearInterval(interval);
  }, [clerkLoaded, userId, fetchSubscription]);

  return (
    <SubscriptionContext.Provider 
      value={{ 
        subscription, 
        isLoading, 
        error,
        refetch: fetchSubscription 
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  
  return context;
}

export default SubscriptionProvider;