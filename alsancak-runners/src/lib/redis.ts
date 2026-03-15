import Redis from "ioredis";

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    console.warn(
      "REDIS_URL is not set. Redis features (cache, rate limiting) will be disabled.",
    );
    return null;
  }
  return new Redis(url, {
    maxRetriesPerRequest: null, // required for BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });
}

const _redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production" && _redis) {
  globalForRedis.redis = _redis;
}

/**
 * Redis client — may be null if REDIS_URL is not configured.
 * All consumers (cache, rate limiter) handle null gracefully.
 */
export const redis = _redis;

// BullMQ connection options (separate from the cache client)
export const bullmqConnection = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
} as const;
