import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF protection for custom (non-BetterAuth) routes.
 * Validates that state-changing requests originate from a trusted origin
 * by checking the Origin or Referer header against allowed origins.
 *
 * BetterAuth handles its own CSRF protection, so this middleware should
 * only be applied to custom API routes.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Allow safe (read-only) methods
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Build the list of allowed origins
  const allowedOrigins = new Set<string>([env.FRONTEND_URL, env.BACKEND_URL]);

  if (env.ENABLE_CAPACITOR) {
    allowedOrigins.add("capacitor://localhost");
    allowedOrigins.add("ionic://localhost");
  }

  // Check Origin header first (most reliable)
  if (origin) {
    if (allowedOrigins.has(origin)) {
      next();
      return;
    }
    res.status(403).json({ error: "Forbidden: invalid origin" });
    return;
  }

  // Fall back to Referer header
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      if (allowedOrigins.has(refererOrigin)) {
        next();
        return;
      }
    } catch {
      // Invalid referer URL
    }
    res.status(403).json({ error: "Forbidden: invalid origin" });
    return;
  }

  // No Origin or Referer header — reject for state-changing requests
  // (same-origin browser requests always include at least one of these)
  res.status(403).json({ error: "Forbidden: missing origin" });
}
