// components/SubscriptionStatus.tsx - KORJATTU & YHDISTETTY
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { FreemiumStatus } from '@/lib/types/subscription.types';

export function useSubscription() {
  const [status, setStatus] = useState<FreemiumStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { userId } = useAuth();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userId) {
        console.log("⚠️ No userId");
        setIsLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching subscription...");
        
        // ✅ Käytä /api/check-subscription (paras endpoint)
        const response = await fetch("/api/check-subscription", {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        console.log("📊 Subscription data:", {
          plan_type: data.plan_type,
          is_premium: data.is_premium,
          tokens: data.tokens,
          can_create_cv: data.can_create_cv
        });

        setStatus({
          is_premium: data.is_premium || false,
          tokens: data.tokens || 0,
          has_used_free_cv: data.has_used_free_cv || false,
          can_create_cv: data.can_create_cv || false,
          plan_type: data.plan_type || 'free',
          cv_count: data.cv_count || 0
        });

      } catch (error) {
        console.error("💥 Error fetching subscription:", error);
        setStatus({
          is_premium: false,
          tokens: 0,
          has_used_free_cv: false,
          can_create_cv: true,
          plan_type: 'free',
          cv_count: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
    
    // Päivitä 30s välein
    const interval = setInterval(fetchSubscription, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  return {
    subscription: status,
    isLoading,
    isActive: status?.is_premium || false,
    plan: status?.plan_type || 'free',
    tokens: status?.tokens || 0,
    canCreateCV: status?.can_create_cv || false
  };
}
