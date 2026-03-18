/**
 * Rate Limit Store Abstraction
 *
 * Provides an interface and in-memory implementation for rate limit tracking.
 * This abstraction allows swapping to a Redis-backed store in production
 * without changing the middleware logic.
 */

// ---------------------------------------------------------------------------
// Interface
// ---------------------------------------------------------------------------

export interface RateLimitEntry {
  /** Number of requests made in the current window. */
  count: number;
  /** Timestamp (ms) when the current window resets. */
  resetAt: number;
}

export interface RateLimitStore {
  /**
   * Increment the request count for `key` within a window of `windowMs`.
   * If the key does not exist or the window has expired a new window is
   * started automatically.
   */
  increment(key: string, windowMs: number): Promise<RateLimitEntry>;

  /** Decrement the count for `key` (useful for undoing a counted request). */
  decrement(key: string): Promise<void>;

  /** Reset (delete) the entry for `key`. */
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory implementation
// ---------------------------------------------------------------------------

/**
 * Simple in-memory store backed by a `Map`.
 *
 * A periodic cleanup timer prunes expired entries every `cleanupIntervalMs`
 * (default 5 minutes) so the map does not grow unboundedly.
 */
export class MemoryStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(cleanupIntervalMs = 5 * 60 * 1000) {
    this.cleanupTimer = setInterval(() => {
      this.prune();
    }, cleanupIntervalMs);

    // Allow the Node process to exit even if the timer is still active.
    if (this.cleanupTimer && typeof this.cleanupTimer === "object" && "unref" in this.cleanupTimer) {
      this.cleanupTimer.unref();
    }
  }

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (existing && existing.resetAt > now) {
      // Window still active — increment.
      existing.count += 1;
      return { count: existing.count, resetAt: existing.resetAt };
    }

    // No entry or window expired — start a fresh window.
    const entry: RateLimitEntry = { count: 1, resetAt: now + windowMs };
    this.store.set(key, entry);
    return { count: 1, resetAt: entry.resetAt };
  }

  async decrement(key: string): Promise<void> {
    const entry = this.store.get(key);
    if (entry && entry.count > 0) {
      entry.count -= 1;
    }
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /** Remove all expired entries from the map. */
  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  /** Stop the cleanup timer (useful for tests / graceful shutdown). */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}
