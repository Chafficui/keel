# API Rate Limiting Sail

In-memory sliding window rate limiting middleware for Express API routes. No external dependencies or Redis required.

## What this sail adds

### Backend
- **`src/middleware/rate-limit.ts`** -- Rate limiting middleware factory with preset configurations:
  - `apiLimiter` -- 100 requests per 15 minutes (general API routes)
  - `authLimiter` -- 10 requests per 15 minutes (login, signup)
  - `strictLimiter` -- 5 requests per 15 minutes (password reset, sensitive operations)
  - `createRateLimiter(options)` -- factory for custom configurations
- **`src/middleware/rate-limit-store.ts`** -- Store abstraction with in-memory implementation:
  - `RateLimitStore` interface for swapping storage backends
  - `MemoryStore` with automatic cleanup of expired entries

### How it works

The middleware uses a **sliding window** algorithm:

1. Each client is identified by their authenticated user ID or IP address
2. Requests are counted within a configurable time window
3. When the limit is exceeded the server responds with `429 Too Many Requests`
4. Standard rate limit headers are set on every response:
   - `X-RateLimit-Limit` -- maximum requests allowed
   - `X-RateLimit-Remaining` -- requests remaining in the current window
   - `X-RateLimit-Reset` -- Unix timestamp when the window resets
   - `Retry-After` -- seconds until the client can retry (only on 429)

### Environment variables (optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `RATE_LIMIT_WINDOW_MS` | Window duration in milliseconds | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

These environment variables override the defaults for `apiLimiter`. The preset `authLimiter` and `strictLimiter` always use their own hardcoded values.

## Setup

### Run the installer

```bash
npx tsx cli/sails/rate-limiting/install.ts
```

Or use the CLI:

```bash
npx keel sail add rate-limiting
```

The installer will:
1. Copy the middleware files into your backend
2. Apply the rate limiter to your chosen routes
3. Optionally add environment variables for custom defaults

## Usage

### Apply globally

```ts
import { apiLimiter } from "./middleware/rate-limit.js";

app.use("/api", apiLimiter);
```

### Apply to specific routes

```ts
import { authLimiter, strictLimiter } from "./middleware/rate-limit.js";

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/signup", authLimiter);
app.use("/api/auth/reset-password", strictLimiter);
```

### Create a custom limiter

```ts
import { createRateLimiter } from "./middleware/rate-limit.js";

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,  // 1 hour
  maxRequests: 20,
  message: "Upload limit exceeded. Try again later.",
});

app.use("/api/uploads", uploadLimiter);
```

### Custom key generator

By default clients are identified by user ID (if authenticated) or IP address. You can provide a custom key generator:

```ts
const limiter = createRateLimiter({
  keyGenerator: (req) => req.headers["x-api-key"] as string ?? req.ip,
  maxRequests: 1000,
});
```

## Scaling to production

The default `MemoryStore` works well for single-process deployments. For multi-process or distributed environments, implement the `RateLimitStore` interface backed by Redis:

```ts
import type { RateLimitStore, RateLimitEntry } from "./middleware/rate-limit-store.js";

class RedisStore implements RateLimitStore {
  constructor(private redis: RedisClient) {}

  async increment(key: string, windowMs: number): Promise<RateLimitEntry> {
    const rKey = `rl:${key}`;
    const count = await this.redis.incr(rKey);
    if (count === 1) {
      await this.redis.pexpire(rKey, windowMs);
    }
    const ttl = await this.redis.pttl(rKey);
    return { count, resetAt: Date.now() + ttl };
  }

  async decrement(key: string): Promise<void> {
    await this.redis.decr(`rl:${key}`);
  }

  async reset(key: string): Promise<void> {
    await this.redis.del(`rl:${key}`);
  }
}
```

Then pass it when creating your limiter:

```ts
const limiter = createRateLimiter({
  store: new RedisStore(redis),
});
```

## Troubleshooting

- **All requests are getting 429**: Check that the `maxRequests` value is appropriate for your traffic. Authenticated users are tracked by user ID, so shared IPs (like offices) should not cause issues for logged-in users.
- **Rate limits not working behind a proxy**: Make sure your Express app trusts the proxy so that `X-Forwarded-For` is parsed correctly: `app.set("trust proxy", 1)`.
- **Memory growing**: The `MemoryStore` prunes expired entries every 5 minutes. If you have very high traffic, consider switching to a Redis store.
