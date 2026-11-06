import redis from "./redis";

// Memory fallback store
interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
}
const memoryStore = new Map<string, RateLimitRecord>();

export async function checkRateLimitAsync(
  key: string,
  options: {
    maxAttempts: number;
    windowMs: number;
    lockoutMs?: number;
  } = { maxAttempts: 10, windowMs: 60000, lockoutMs: 300000 }
): Promise<{ allowed: boolean; remaining: number; retryAfterSec?: number }> {
  const windowSec = Math.ceil(options.windowMs / 1000);
  const redisKey = `ratelimit:${key}`;

  try {
    const count = await redis.incr(redisKey);
    if (count === 1) {
      await redis.expire(redisKey, windowSec);
    }

    if (count > options.maxAttempts) {
      const ttl = await redis.ttl(redisKey);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSec: ttl > 0 ? ttl : windowSec,
      };
    }

    return {
      allowed: true,
      remaining: Math.max(0, options.maxAttempts - count),
    };
  } catch {
    return checkRateLimit(key, options);
  }
}

export function checkRateLimit(
  key: string,
  options: {
    maxAttempts: number;
    windowMs: number;
    lockoutMs?: number;
  } = { maxAttempts: 10, windowMs: 60000, lockoutMs: 300000 }
): { allowed: boolean; remaining: number; retryAfterSec?: number } {
  const now = Date.now();
  const record = memoryStore.get(key) || { timestamps: [] };

  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.timestamps = record.timestamps.filter((t) => now - t < options.windowMs);

  if (record.timestamps.length >= options.maxAttempts) {
    if (options.lockoutMs) {
      record.lockedUntil = now + options.lockoutMs;
    }
    memoryStore.set(key, record);
    const retryAfterSec = Math.ceil((options.lockoutMs || options.windowMs) / 1000);
    return { allowed: false, remaining: 0, retryAfterSec };
  }

  record.timestamps.push(now);
  memoryStore.set(key, record);

  return {
    allowed: true,
    remaining: options.maxAttempts - record.timestamps.length,
  };
}
