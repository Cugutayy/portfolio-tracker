import { redis } from "./redis";
import { NextResponse } from "next/server";

const PREFIX = "ar:rl:";

interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  maxRequests: number;
  /** Window size in seconds */
  windowSec: number;
  /** When false, deny requests if Redis is unavailable (default: true = allow) */
  failOpen?: boolean;
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
  const failOpen = config.failOpen !== false; // default true for backward compat

  // If Redis is not configured, behavior depends on failOpen setting
  if (!redis) {
    if (failOpen) {
      console.warn(`[RATE_LIMIT_BYPASS] Redis unavailable — rate limit skipped for: ${identifier}`);
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
    } else {
      console.warn(`[RATE_LIMIT_DENY] Redis unavailable — fail-closed for: ${identifier}`);
      return { allowed: false, remaining: 0, resetAt: Math.ceil((Date.now() + 60000) / 1000) };
    }
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
      if (failOpen) {
        console.warn(`[RATE_LIMIT_BYPASS] Redis pipeline failed for: ${identifier}`);
        return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
      } else {
        console.warn(`[RATE_LIMIT_DENY] Redis pipeline failed — fail-closed for: ${identifier}`);
        return { allowed: false, remaining: 0, resetAt: Math.ceil((Date.now() + 60000) / 1000) };
      }
    }

    const count = (results[2]?.[1] as number) ?? 0;
    const allowed = count <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - count);
    const resetAt = Math.ceil((now + config.windowSec * 1000) / 1000);

    return { allowed, remaining, resetAt };
  } catch (err) {
    if (failOpen) {
      console.warn(`[RATE_LIMIT_BYPASS] Redis error for ${identifier}:`, err);
      return { allowed: true, remaining: config.maxRequests - 1, resetAt: 0 };
    } else {
      console.warn(`[RATE_LIMIT_DENY] Redis error — fail-closed for ${identifier}:`, err);
      return { allowed: false, remaining: 0, resetAt: Math.ceil((Date.now() + 60000) / 1000) };
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
  authRegister: { maxRequests: 10, windowSec: 60, failOpen: false } as RateLimitConfig,
  authLogin: { maxRequests: 10, windowSec: 60, failOpen: false } as RateLimitConfig,
  authChangePassword: { maxRequests: 5, windowSec: 300, failOpen: false } as RateLimitConfig,
  authResetPassword: { maxRequests: 10, windowSec: 300, failOpen: false } as RateLimitConfig,
  authForgotPassword: { maxRequests: 5, windowSec: 300, failOpen: false } as RateLimitConfig,
  stravaWebhook: { maxRequests: 100, windowSec: 60 } as RateLimitConfig, // 100 per minute
  eventRsvp: { maxRequests: 10, windowSec: 60 } as RateLimitConfig, // 10 per minute
  communityActivities: { maxRequests: 120, windowSec: 60 } as RateLimitConfig, // feed + posts + refresh
} as const;
