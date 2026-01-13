// lib/domain/token-allocation.ts
import { Tier } from '@/lib/pricing';

export const TOKEN_ALLOCATION: Record<Tier, number> = {
  free: 0,
  basic: 10_000,
  premium: 100_000,
};
