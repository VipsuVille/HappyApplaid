// app/api/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 pyyntöä 10 sekunnissa
});

export async function checkRateLimit(userId: string) {
  const { success } = await ratelimit.limit(userId);
  if (!success) throw new Error('Rate limit exceeded');
}