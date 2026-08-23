import { getRedis } from "./redis.js";
import { logger } from "./logger.js";

const DEFAULT_LOCK_TTL_SECONDS = 30;
const LOCK_PREFIX = "eidsave:lock:";

/**
 * Distributed lock built on Redis SET NX EX. Exists to close the race window
 * between "check transaction status" and "credit wallet" — without it, a
 * Paystack webhook and a client-triggered verify call landing within
 * milliseconds of each other can both pass the `status !== "success"` check
 * and both credit the wallet, double-paying the user.
 *
 * Fails CLOSED: if Redis is unreachable, acquireLock() returns null and
 * callers must refuse to proceed with the financial write. A missed webhook
 * can be caught later by the reconciliation job; a double-credit generally
 * cannot be undone cleanly, so we bias toward "temporarily unavailable"
 * over "silently unsafe."
 */

function lockKey(resource: string): string {
  return `${LOCK_PREFIX}${resource}`;
}

export async function acquireLock(
  resource: string,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS,
): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    logger.warn({ resource }, "Redis unavailable — refusing to acquire lock (failing closed)");
    return null;
  }

  // Unique token per acquisition so release() only removes a lock we
  // actually still hold (see RELEASE_SCRIPT below).
  const token = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const result = await redis.set(lockKey(resource), token, "EX", ttlSeconds, "NX");
    return result === "OK" ? token : null;
  } catch (err) {
    logger.warn({ err, resource }, "Lock acquisition failed");
    return null;
  }
}

// Only deletes the key if the value still matches our token — prevents a
// slow request from releasing a lock that a different process has since
// acquired after our TTL already expired.
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

export async function releaseLock(resource: string, token: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.eval(RELEASE_SCRIPT, 1, lockKey(resource), token);
  } catch (err) {
    logger.warn({ err, resource }, "Lock release failed");
  }
}

/**
 * Runs fn() only while holding the lock for `resource`. Returns null (does
 * NOT call fn) if the lock is already held elsewhere — callers should treat
 * that as "another process is already handling this" rather than an error.
 *
 * Usage: guard any financial state transition keyed by a transaction
 * reference, e.g. withLock(`deposit:${reference}`, () => verifyAndCredit()).
 */
export async function withLock<T>(
  resource: string,
  fn: () => Promise<T>,
  ttlSeconds = DEFAULT_LOCK_TTL_SECONDS,
): Promise<T | null> {
  const token = await acquireLock(resource, ttlSeconds);
  if (!token) return null;

  try {
    return await fn();
  } finally {
    await releaseLock(resource, token);
  }
}