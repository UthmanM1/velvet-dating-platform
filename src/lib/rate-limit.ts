/**
 * Sliding-window in-memory rate limiter.
 *
 * Suitable for a single instance and for demo mode. On serverless platforms each instance has its own
 * memory, so for production replace the backing store with a shared one (Redis/Upstash, Vercel KV, or a
 * Postgres counter). The `consume` signature is the seam for that swap.
 */
const buckets = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function consume(key: string, limit: number, windowMs: number, now: number = Date.now()): RateLimitResult {
  const cutoff = now - windowMs;
  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, remaining: 0, retryAfterSec: Math.ceil((hits[0] + windowMs - now) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (v.every((t) => t <= cutoff)) buckets.delete(k);
  }
  return { allowed: true, remaining: limit - hits.length, retryAfterSec: 0 };
}

export function resetRateLimits(): void {
  buckets.clear();
}
