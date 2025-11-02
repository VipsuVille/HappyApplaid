export interface FreemiumStatus {
  is_premium: boolean;
  tokens: number;
  has_used_free_cv: boolean;
  can_create_cv: boolean;
  plan_type: 'free' | 'premium';
  cv_count: number;
}