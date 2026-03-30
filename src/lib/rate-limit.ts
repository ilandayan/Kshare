/**
 * In-memory rate limiter for API routes.
 *
 * Uses a sliding window approach with a Map-based cache.
 * Suitable for single-instance deployments (Vercel serverless).
 * For multi-instance, consider a Redis-backed solution.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Cleanup stale entries every 5 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now > entry.resetAt) {
      store.delete(key);
    }
  }
}

interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in the current window */
  remaining: number;
  /** Timestamp (ms) when the window resets */
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (IP, user ID, etc.)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup();

  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const key = identifier;

  const entry = store.get(key);

  // No entry or expired window → create new
  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  // Within window
  if (entry.count < config.limit) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.limit - entry.count,
      resetAt: entry.resetAt,
    };
  }

  // Rate limited
  return { allowed: false, remaining: 0, resetAt: entry.resetAt };
}

/**
 * Extract client IP from request headers.
 * Works with Vercel, Cloudflare, and standard proxies.
 */
export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

// ── Pre-configured limiters ──────────────────────────────────────

/** Public endpoints: 10 requests per minute */
export const PUBLIC_RATE_LIMIT: RateLimitConfig = {
  limit: 10,
  windowSeconds: 60,
};

/** Authenticated endpoints: 30 requests per minute */
export const AUTH_RATE_LIMIT: RateLimitConfig = {
  limit: 30,
  windowSeconds: 60,
};

/** Payment endpoints: 5 requests per minute */
export const PAYMENT_RATE_LIMIT: RateLimitConfig = {
  limit: 5,
  windowSeconds: 60,
};

/**
 * Set standard rate-limit headers on a Response.
 * Follows the IETF RateLimit header draft convention.
 */
export function setRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  config: RateLimitConfig
): void {
  headers.set("X-RateLimit-Limit", String(config.limit));
  headers.set("X-RateLimit-Remaining", String(result.remaining));
  headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(result.resetAt / 1000))
  );
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    headers.set("Retry-After", String(Math.max(retryAfter, 1)));
  }
}
