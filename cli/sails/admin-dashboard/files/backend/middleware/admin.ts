import type { Request, Response, NextFunction } from "express";
import { env } from "../env.js";

/**
 * Middleware that checks whether the authenticated user is an admin.
 * Admin status is determined by the ADMIN_EMAILS environment variable
 * which contains a comma-separated list of admin email addresses.
 *
 * Must be used AFTER requireAuth so that req.user is populated.
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.user;

  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const adminEmails = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email.toLowerCase())) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  next();
}
