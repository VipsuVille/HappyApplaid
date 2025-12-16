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
  const [retryCount, ] = useState(0);

  const fetchSubscription = useCallback(async () => {
    if (!clerkLoaded) {
      console.log('⏳ Context: Waiting for Clerk...');
      return;
    }

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
    setIsLoading(true);
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
              ((prev: number) => prev + 1);
            }, 2000);
            
            // 🚨 KORJAUS 1: ÄLÄ aseta isLoading:false tai setSubscription:free tässä!
            // Tämä tarkoittaa, että Headeri pysyy lataustilassa, kunnes retry onnistuu.
            throw new Error('Authentication not ready, retrying'); // Heitä virhe, mutta älä koske finally-lohkoon tässä tapauksessa
          }
          // Jos retryt loppuvat, heitä standardi virhe (jolloin finally-lohko asettaa Free-tason)
          throw new Error('Authentication not ready after max retries');
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('✅ Context: Subscription fetched:', {
        plan_type: data.plan_type,
        tokens: data.tokens,
        is_premium: data.is_premium
      });
console.log('✅ Context: Subscription fetched data:', data);
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
      (0); // Reset retry count on success
setIsLoading(false); // ✅ Aseta isLoading: false ONNISTUESSA

    } catch (err) {
      
// 🚨 KORJAUS 2: Jos virhe on uudelleenyritys, ÄLÄ aseta lopullista tilaa tai isLoading:falsea
      if (err instanceof Error && err.message.includes('Authentication not ready, retrying')) {
           console.warn('Skipping state update: Retry scheduled. Context remains loading.');
           return; // Poistuu funktiosta. isLoading pysyy true.
      }
      // Muut virheet (HTTP-virheet, max retries) käsittely:
      console.error('❌ Context: Subscription fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      
      // Aseta safe defaults errorin sattuessa
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

    // 🚨 KORJAUS 2: Aseta `isLoading: false` vasta kun VIRHE on LOPULLINEN
    setIsLoading(false); 
  } // Poista `finally` lohko kokonaan, ja siirrä sen sisältö `try`-lohkon loppuun ja `catch`-lohkon loppuun.
}, [userId, clerkLoaded, retryCount]); // ✅ HUOM! POISTETTU subscription

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