import { getRedis } from "./redis.js";
import { logger } from "./logger.js";

const DEFAULT_TTL = 300;

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const val = await redis.get(key);
    return val ? (JSON.parse(val) as T) : null;
  } catch (err) {
    logger.warn({ err, key }, "Cache get failed");
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = DEFAULT_TTL): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, "Cache set failed");
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, keys }, "Cache del failed");
  }
}

export async function cacheDelPattern(pattern: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn({ err, pattern }, "Cache pattern del failed");
  }
}

export function cacheKey(...parts: string[]): string {
  return `eidsave:${parts.join(":")}`;
}
