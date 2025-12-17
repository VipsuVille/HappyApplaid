// lib/server/canUseAction.ts
import { ACTION_COSTS, TokenAction, PlanType } from '@/lib/domain/tokens';

export function canUseActionServer({
  plan_type,
  tokens,
  action,
}: {
  plan_type: PlanType;
  tokens: number;
  action: TokenAction;
}) {
  const required =ACTION_COSTS[plan_type][action];

  if (required === undefined) {
    return { allowed: false, reason: 'Action not allowed for this plan' };
  }

  if (tokens < required) {
    return { allowed: false, reason: 'Not enough tokens' };
  }

  return { allowed: true };
}
