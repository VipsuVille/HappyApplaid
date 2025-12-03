// components/SubscriptionStatus.tsx - KORJATTU
"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

interface SubscriptionData {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan: string;
  tokens: number;
  is_active: boolean;
  plan_type?: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userId) {
        console.log("⚠️ No userId, skipping fetch");
        setIsLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching subscription via API...");
        
        const response = await fetch("/api/subscription", {
          cache: 'no-store', // 👈 Estä caching
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        const data = await response.json();

        console.log("📊 Full API Response:", data);

        if (data.subscription) {
          const sub = data.subscription;
          
          // Varmista että plan on oikein
          const plan = sub.plan_type || sub.plan || 'free';
          
          setSubscription({
            ...sub,
            plan: plan
          });
          
          setIsActive(data.isActive === true);
          
          console.log("✅ Subscription loaded:", {
            plan: plan,
            is_active_field: sub.is_active,
            status: sub.status,
            isActive: data.isActive,
            tokens: sub.tokens
          });
        } else {
          console.log("❌ No subscription in response");
          setSubscription(null);
          setIsActive(false);
        }
      } catch (error) {
        console.error("💥 Error fetching subscription:", error);
        setSubscription(null);
        setIsActive(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubscription();
    
    // Päivitä 30 sekunnin välein
    const interval = setInterval(fetchSubscription, 30000);
    
    return () => clearInterval(interval);
  }, [userId]);

  console.log("🔍 Current hook state:", {
    hasSubscription: !!subscription,
    plan: subscription?.plan,
    isActive,
    isLoading
  });

  return {
    subscription,
    isLoading,
    isActive,
  };
}