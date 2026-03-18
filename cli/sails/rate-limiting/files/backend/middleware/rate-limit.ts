/**
 * Sliding-window rate limiting middleware for Express.
 *
 * Uses an in-memory store by default (no Redis required). You can swap in any
 * implementation of `RateLimitStore` for distributed deployments.
 *
 * Usage:
 *   import { apiLimiter, authLimiter, createRateLimiter } from "./middleware/rate-limit.js";
 *
 *   app.use("/api", apiLimiter);              // 100 req / 15 min
 *   app.use("/api/auth", authLimiter);        // 10 req / 15 min
 *
 *   // Custom:
 *   app.use("/api/special", createRateLimiter({ windowMs: 60_000, maxRequests: 5 }));
 */

import type { Request, Response, NextFunction } from "express";
import { MemoryStore } from "./rate-limit-store.js";
import type { RateLimitStore } from "./rate-limit-store.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Time window in milliseconds. Default: 15 minutes. */
  windowMs?: number;
  /** Maximum number of requests allowed in the window. Default: 100. */
  maxRequests?: number;
  /** Extract the key used to identify the client. Defaults to IP, or userId when authenticated. */
  keyGenerator?: (req: Request) => string;
  /** Store implementation. Defaults to `MemoryStore`. */
  store?: RateLimitStore;
  /** Custom message returned when the limit is exceeded. */
  message?: string;
}

// ---------------------------------------------------------------------------
// Defaults from environment (optional overrides)
// ---------------------------------------------------------------------------

const DEFAULT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
const DEFAULT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

// ---------------------------------------------------------------------------
// Shared store — one MemoryStore instance for the entire process
// ---------------------------------------------------------------------------

const sharedStore = new MemoryStore();

// ---------------------------------------------------------------------------
// Key generator
// ---------------------------------------------------------------------------

function defaultKeyGenerator(req: Request): string {
  // Prefer the authenticated user id when available so that rate limits are
  // per-user rather than per-IP for logged-in users.
  const userId = (req as Record<string, unknown>).user
    ? ((req as Record<string, unknown>).user as { id?: string })?.id
    : undefined;

  if (userId) return `user:${userId}`;

  // Fall back to IP address.
  const forwarded = req.headers["x-forwarded-for"];
  const ip =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.socket.remoteAddress ?? "unknown";

  return `ip:${ip}`;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a rate-limiting middleware with the given options.
 */
export function createRateLimiter(options: RateLimitOptions = {}) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    keyGenerator = defaultKeyGenerator,
    store = sharedStore,
    message = "Too many requests, please try again later.",
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = keyGenerator(req);

    try {
      const { count, resetAt } = await store.increment(key, windowMs);

      // Always set informational headers.
      res.setHeader("X-RateLimit-Limit", String(maxRequests));
      res.setHeader("X-RateLimit-Remaining", String(Math.max(0, maxRequests - count)));
      res.setHeader("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));

      if (count > maxRequests) {
        const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
        res.setHeader("Retry-After", String(retryAfterSeconds));
        res.status(429).json({ error: message });
        return;
      }

      next();
    } catch (err) {
      // If the store fails we let the request through rather than blocking.
      console.error("[rate-limit] Store error:", err);
      next();
    }
  };
}

// ---------------------------------------------------------------------------
// Preset limiters
// ---------------------------------------------------------------------------

/** General API limiter — 100 requests per 15 minutes. */
export const apiLimiter = createRateLimiter({
  windowMs: DEFAULT_WINDOW_MS,
  maxRequests: DEFAULT_MAX_REQUESTS,
});

/** Auth limiter — 10 requests per 15 minutes (login, signup). */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});

/** Strict limiter — 5 requests per 15 minutes (password reset, sensitive ops). */
export const strictLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});
