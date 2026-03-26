import rateLimit from "express-rate-limit";

// Auth endpoints (login, signup, password reset): strict limit
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});

// API endpoints (authenticated routes): per-user limit
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 60,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  keyGenerator: (req) => req.user?.id ?? req.ip || req.socket.remoteAddress || "unknown",
});

// Public endpoints (health, etc.): moderate limit
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || "unknown",
});
