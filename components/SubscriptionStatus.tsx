//components/SubscriptionStatus.tsx

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
  plan_type: string;
}

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isActive, setIsActive] = useState(false);
  const { userId } = useAuth();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        console.log("🔍 Fetching subscription via API...");
        
        const response = await fetch("/api/subscription");
        const data = await response.json();

        console.log("📊 API Response:", data);

        if (data.subscription) {
          setSubscription(data.subscription);
          setIsActive(data.isActive);
          console.log("✅ Subscription loaded:", {
            is_active: data.subscription.is_active,
            status: data.subscription.status,
            isActive: data.isActive
          });
        } else {
          console.log("❌ No subscription found");
          setIsActive(false);
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
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

  console.log("🔍 Final subscription state:", {
    hasSubscription: !!subscription,
    isActive,
    status: subscription?.status
  });

  return {
    subscription,
    isLoading,
    isActive,
  };
}