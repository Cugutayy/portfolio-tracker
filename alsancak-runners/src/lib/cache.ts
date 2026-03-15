import { redis } from "./redis";

const PREFIX = "ar:cache:";

/**
 * Get a cached value, parsing from JSON.
 * Returns null if key doesn't exist or Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const raw = await redis.get(`${PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with optional TTL in seconds.
 * Silently fails if Redis is unavailable.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = 300
): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(
      `${PREFIX}${key}`,
      JSON.stringify(value),
      "EX",
      ttlSeconds
    );
  } catch {
    // Cache write failures are non-fatal
  }
}

/**
 * Invalidate a cached key or pattern.
 * If `pattern` is true, treats key as a glob pattern and deletes all matching.
 */
export async function cacheInvalidate(
  key: string,
  pattern: boolean = false
): Promise<void> {
  if (!redis) return;
  try {
    if (pattern) {
      const keys = await redis.keys(`${PREFIX}${key}`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(`${PREFIX}${key}`);
    }
  } catch {
    // Invalidation failures are non-fatal
  }
}

// ── Pre-defined cache keys ──────────────────────────────────────────

export const CACHE_KEYS = {
  communityStats: "community:stats",
  leaderboard: (period: string) => `leaderboard:${period}`,
  stravaToken: (memberId: string) => `strava:token:${memberId}`,
} as const;

// ── TTLs in seconds ─────────────────────────────────────────────────

export const CACHE_TTL = {
  communityStats: 300, // 5 minutes
  leaderboard: 300, // 5 minutes
  stravaToken: (expiresAt: number) =>
    Math.max(0, expiresAt - Math.floor(Date.now() / 1000) - 300), // expiry - 5 min buffer
} as const;
