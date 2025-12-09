// context/SubscriptionContext.tsx - YKSI FETCH KOKO APPILLE
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';

interface SubscriptionData {
  plan_type: 'free' | 'basic' | 'semi-pro' | 'pro';
  is_premium: boolean;
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
    // ✅ ODOTA että Clerk on valmis
    if (!clerkLoaded) {
      console.log('⏳ Context: Waiting for Clerk...');
      return;
    }

    // ✅ Jos ei kirjautunut, aseta free tier
    if (!userId) {
      console.log('👤 Context: Not logged in → Free tier');
      setSubscription({
        plan_type: 'free',
        is_premium: false,
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
      console.log(`🔄 Context: Fetching subscription (userId: ${userId}, retry: ${retryCount})`);
      
      const response = await fetch('/api/check-subscription', {
        cache: 'no-store',
        headers: { 
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('⚠️ Context: 401 Unauthorized - Clerk not ready yet');
          
          // ✅ RETRY jos Clerk ei valmis (max 3 kertaa)
          if (retryCount < 3) {
            console.log(`🔄 Retrying in 2s... (attempt ${retryCount + 1}/3)`);
            setTimeout(() => {
              setRetryCount(prev => prev + 1);
            }, 2000);
          }
          throw new Error('Authentication not ready');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Context: Subscription fetched:', {
        plan_type: data.plan_type,
        tokens: data.tokens,
        is_premium: data.is_premium
      });

      setSubscription({
        plan_type: data.plan_type || 'free',
        is_premium: data.is_premium || false,
        tokens: data.tokens || 0,
        has_used_free_cv: data.has_used_free_cv || false,
        can_create_cv: data.can_create_cv || false,
        cv_count: data.cv_count || 0,
        cancel_at_period_end: data.cancel_at_period_end || false,
        current_period_end: data.current_period_end,
        status: data.status || 'inactive'
      });
      
      setError(null);
      setRetryCount(0); // Reset retry count on success

    } catch (err) {
      console.error('❌ Context: Subscription fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // ✅ Aseta safe defaults errorin sattuessa
      if (!subscription) {
        setSubscription({
          plan_type: 'free',
          is_premium: false,
          tokens: 0,
          has_used_free_cv: false,
          can_create_cv: true,
          cv_count: 0,
          cancel_at_period_end: false,
          current_period_end: null,
          status: 'inactive'
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, clerkLoaded, retryCount, subscription]);

  // ✅ FETCH kun userId tai Clerk valmistuu
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // ✅ LONG POLLING - vain 60s välein (ei 2s!)
  useEffect(() => {
    if (!clerkLoaded || !userId) return;
    
    console.log('⏰ Context: Setting up 60s polling interval');
    const interval = setInterval(() => {
      console.log('🔄 Context: 60s interval refresh');
      fetchSubscription();
    }, 60000); // ← 60 SEKUNTIA, ei 2!
    
    return () => {
      console.log('🛑 Context: Clearing polling interval');
      clearInterval(interval);
    };
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

// ✅ HOOK käytettäväksi komponenteissa
export function useSubscription() {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  
  return context;
}

export default SubscriptionProvider;