// types/subscription.types.ts - LAAJENNETTU
export interface FreemiumStatus {
  is_premium: boolean;
  tokens: number;
  has_used_free_cv: boolean;
  can_create_cv: boolean;
  plan_type: 'free' | 'basic' | 'semi-pro' | 'pro';
  cv_count: number;
  
  // ✅ LISÄÄ NÄMÄ (SubscriptionCard varten)
  cancel_at_period_end?: boolean;
  current_period_end?: string;
  status?: string;
}

// types/subscription.types.ts - TÄYDELLINEN
export interface SubscriptionData {
  id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan: string;
  plan_type: 'free' | 'basic' | 'semi-pro' | 'pro';
  tokens: number;
  is_active: boolean;
  cancel_at_period_end: boolean; // ✅ LISÄÄ
  canceled_at?: string;           // ✅ LISÄÄ (optional)
}