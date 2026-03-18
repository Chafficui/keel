import type { Request, Response, NextFunction } from "express";
import { auth } from "../auth/index.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        emailVerified: boolean;
        image: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
      session?: {
        id: string;
        userId: string;
        token: string;
        expiresAt: Date;
        ipAddress: string | null;
        userAgent: string | null;
        createdAt: Date;
        updatedAt: Date;
      };
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Check Bearer token first (for Capacitor/mobile), then cookie
    const headers = new Headers();

    // Forward Authorization header (Bearer token) first
    const authHeader = req.headers.authorization;
    if (authHeader) {
      headers.set("authorization", authHeader);
    }

    // Forward cookies as fallback
    if (req.headers.cookie) {
      headers.set("cookie", req.headers.cookie);
    }

    // Forward other relevant headers
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === "string" && !headers.has(key)) {
        headers.set(key, value);
      }
    }

    const session = await auth.api.getSession({
      headers,
    });

    if (!session) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = session.user as Express.Request["user"];
    req.session = session.session as Express.Request["session"];

    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
