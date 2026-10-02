/**
 * Production Rate Limiter & Anti-Spam Abuse Protection
 *
 * Implements a memory-efficient sliding-window token bucket algorithm
 * to protect sensitive server functions (post creation, comments, withdrawals, auth)
 * against automated spam, credential stuffing, and financial drain attacks.
 */

export interface RateLimitConfig {
  /** Maximum allowed requests within the time window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterSeconds: number;
}

type RecordBucket = {
  timestamps: number[];
};

// Global in-memory storage for sliding window timestamps
const globalStore = globalThis as typeof globalThis & {
  __rateLimitBuckets__?: Map<string, RecordBucket>;
};

function getBuckets(): Map<string, RecordBucket> {
  globalStore.__rateLimitBuckets__ ??= new Map<string, RecordBucket>();
  return globalStore.__rateLimitBuckets__;
}

/**
 * Checks whether an action keyed by `key` (e.g. `user:123:post_create` or `ip:1.2.3.4:login`)
 * is allowed within its configured rate limit window.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
): RateLimitResult {
  const now = Date.now();
  const buckets = getBuckets();
  const bucket = buckets.get(key) || { timestamps: [] };

  // Evict timestamps older than the sliding window
  const windowStart = now - config.windowMs;
  const validTimestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (validTimestamps.length >= config.maxRequests) {
    const oldestInWindow = validTimestamps[0];
    const resetMs = oldestInWindow + config.windowMs - now;
    const retryAfterSeconds = Math.ceil(resetMs / 1000);

    // Save pruned bucket
    bucket.timestamps = validTimestamps;
    buckets.set(key, bucket);

    return {
      allowed: false,
      remaining: 0,
      resetMs,
      retryAfterSeconds: Math.max(1, retryAfterSeconds),
    };
  }

  // Record this request
  validTimestamps.push(now);
  bucket.timestamps = validTimestamps;
  buckets.set(key, bucket);

  const remaining = config.maxRequests - validTimestamps.length;
  const resetMs = config.windowMs;

  return {
    allowed: true,
    remaining,
    resetMs,
    retryAfterSeconds: 0,
  };
}

/** Pre-configured rate limit presets for core platform actions */
export const RATE_LIMIT_PRESETS = {
  /** Post/Reel creation: 10 per 10 minutes */
  POST_CREATE: { maxRequests: 10, windowMs: 10 * 60 * 1000 },

  /** Comment creation: 30 per minute (anti-spam protection) */
  COMMENT_CREATE: { maxRequests: 30, windowMs: 60 * 1000 },

  /** Withdrawal requests: 3 per 24 hours */
  WITHDRAWAL_REQUEST: { maxRequests: 3, windowMs: 24 * 60 * 60 * 1000 },

  /** Auth/Login attempts: 5 per 15 minutes per IP */
  LOGIN_ATTEMPT: { maxRequests: 5, windowMs: 15 * 60 * 1000 },

  /** General API routes: 120 per minute */
  GENERAL_API: { maxRequests: 120, windowMs: 60 * 1000 },
} as const;

/** Periodic cleanup helper to purge stale rate limit buckets every 10 minutes */
if (typeof setInterval !== "undefined") {
  const CLEANUP_INTERVAL = 10 * 60 * 1000;
  const globalCleaner = globalThis as typeof globalThis & {
    __rateLimitCleanupInterval__?: boolean;
  };

  if (!globalCleaner.__rateLimitCleanupInterval__) {
    globalCleaner.__rateLimitCleanupInterval__ = true;
    setInterval(() => {
      const now = Date.now();
      const buckets = getBuckets();
      for (const [key, bucket] of buckets.entries()) {
        const activeCount = bucket.timestamps.filter(
          (ts) => ts > now - 24 * 60 * 60 * 1000,
        ).length;
        if (activeCount === 0) {
          buckets.delete(key);
        }
      }
    }, CLEANUP_INTERVAL).unref?.();
  }
}
