// lib/server/isPremium.ts
export function isPremium(subscription: {
  status?: string;
  plan_type?: string;
}) {
  return (
    subscription?.status === 'active' &&
    subscription?.plan_type &&
    subscription.plan_type !== 'free'
  );
}
