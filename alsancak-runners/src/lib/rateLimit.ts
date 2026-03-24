import { redis } from "./redis";
import { NextResponse } from "next/server";

const PREFIX = "ar:rl:";

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
  /** If true, do not bypass limits when Redis is down. */
  strict?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

/**
 * Sliding-window rate limiter backed by Redis.
 * Uses a sorted set with timestamps as scores for accurate sliding window.
 *
 * @param identifier - Unique key for the rate limit bucket (e.g., userId, IP)
 * @param config - Rate limit configuration
 * @returns Whether the request is allowed + metadata
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const strictFallback = () => strictInMemoryRateLimit(identifier, config);

  // If Redis is not configured, fail open (allow all requests)
  // Strict mode uses in-memory fallback for sensitive endpoints.
  if (!redis) {
    if (config.strict) return strictFallback();
    console.warn(`[RATE_LIMIT_BYPASS] Redis unavailable — rate limit skipped for: ${identifier}`);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
  }

  const key = `${PREFIX}${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowSec * 1000;

  try {
    // Pipeline: remove old entries, add current, count, set expiry
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired entries
    pipeline.zadd(key, now, `${now}:${Math.random()}`); // Add current request
    pipeline.zcard(key); // Count requests in window
    pipeline.expire(key, config.windowSec); // Auto-cleanup

    const results = await pipeline.exec();
    if (!results) {
      // Redis pipeline failed
      if (config.strict) return strictFallback();
      console.warn(`[RATE_LIMIT_BYPASS] Redis pipeline failed for: ${identifier}`);
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
    }

    const count = (results[2]?.[1] as number) ?? 0;
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetAt = Math.ceil((now + config.windowSec * 1000) / 1000);

    return { allowed, remaining, resetAt };
  } catch (err) {
    // Redis unavailable
    if (config.strict) return strictFallback();
    console.warn(`[RATE_LIMIT_BYPASS] Redis error for ${identifier}:`, err);
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
  }
}

const strictBuckets = new Map<string, number[]>();
let strictCallCount = 0;

function strictInMemoryRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  strictCallCount++;
  if (strictCallCount % 100 === 0) {
    pruneStrictBuckets(config.windowSec);
  }

  const now = Date.now();
  const windowStart = now - config.windowSec * 1000;
  const current = (strictBuckets.get(identifier) || []).filter((ts) => ts > windowStart);
  current.push(now);
  strictBuckets.set(identifier, current);
  const allowed = current.length <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - current.length);
  return {
    allowed,
    remaining,
    resetAt: Math.ceil((now + config.windowSec * 1000) / 1000),
  };
}

function pruneStrictBuckets(windowSec: number) {
  const threshold = Date.now() - windowSec * 1000;
  for (const [key, timestamps] of strictBuckets) {
    const active = timestamps.filter((ts) => ts > threshold);
    if (active.length === 0) {
      strictBuckets.delete(key);
    } else if (active.length !== timestamps.length) {
      strictBuckets.set(key, active);
    }
  }
}

/**
 * Convenience: check rate limit and return a 429 response if exceeded.
 * Returns null if allowed, or a NextResponse if rate-limited.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<NextResponse | null> {
  const result = await rateLimit(identifier, config);

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.max(1, result.resetAt - Math.floor(Date.now() / 1000))
          ),
          "X-RateLimit-Limit": String(config.maxRequests),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }

  return null;
}

// ── Pre-defined rate limit configs ──────────────────────────────────

export const RATE_LIMITS = {
  stravaSync: { maxRequests: 5, windowSec: 60 } as RateLimitConfig, // 5 per minute
  authRegister: { maxRequests: 3, windowSec: 60 } as RateLimitConfig, // 3 per minute
  stravaWebhook: { maxRequests: 100, windowSec: 60 } as RateLimitConfig, // 100 per minute
  eventRsvp: { maxRequests: 10, windowSec: 60 } as RateLimitConfig, // 10 per minute
  communityActivities: { maxRequests: 30, windowSec: 60 } as RateLimitConfig, // 30 per minute
} as const;
