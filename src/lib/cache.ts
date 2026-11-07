import redis from "./redis";

const DEFAULT_CACHE_TTL_SECONDS = 60;

export async function getCachedJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds = DEFAULT_CACHE_TTL_SECONDS): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Non-fatal if cache write fails
  }
}

export async function invalidateUserCache(userId: string): Promise<void> {
  try {
    const todayStr = new Date().toISOString().split("T")[0];
    await Promise.all([
      redis.del(`cache:analytics:${userId}`),
      redis.del(`cache:goals:${userId}:default`),
      redis.del(`cache:planner:${userId}:${todayStr}`),
      redis.del(`cache:tasks:${userId}:${todayStr}`),
      redis.del(`cache:timeblocks:${userId}:${todayStr}`),
    ]);
  } catch {
    // Non-fatal
  }
}
