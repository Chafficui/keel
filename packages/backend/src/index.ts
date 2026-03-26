import express from "express";
import helmet from "helmet";
import { env } from "./env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { authLimiter, apiLimiter, publicLimiter } from "./middleware/rate-limit.js";
import { csrfProtection } from "./middleware/csrf.js";
import { toNodeHandler } from "./auth/index.js";
import { closeDb, db } from "./db/index.js";
import { logger } from "./lib/logger.js";
import { sql } from "drizzle-orm";
import healthRoutes from "./routes/health.js";
import profileRoutes from "./routes/profile.js";
// [SAIL_IMPORTS]

const app = express();

// Trust proxy (Railway, Vercel, etc. sit behind a reverse proxy)
app.set("trust proxy", 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", env.BACKEND_URL, env.FRONTEND_URL],
    },
  },
}));

// CORS
app.use(corsMiddleware);

// Rate limiting on auth endpoints (before BetterAuth handler)
app.use("/api/auth", authLimiter);

// BetterAuth handler — BEFORE express.json() so it can handle its own body parsing
app.all("/api/auth/{*splat}", toNodeHandler);

// JSON body parsing for all other routes
app.use(express.json({ limit: "100kb" }));

// CSRF protection for all non-GET custom routes (BetterAuth handles its own)
app.use("/api", csrfProtection);

// Routes
app.use("/api/health", publicLimiter, healthRoutes);
app.use("/api/profile", apiLimiter, profileRoutes);
// [SAIL_ROUTES]

// Catch-all for undefined API routes
app.use("/api/{*splat}", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error(err, "Unhandled error");
  const message = env.NODE_ENV === "production" ? "Internal server error" : String(err);
  res.status(500).json({ error: message });
});

const server = app.listen(env.PORT, async () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    "Server started",
  );

  try {
    await db.execute(sql`SELECT 1`);
    logger.info("Database connection verified");
  } catch (error) {
    logger.error(error, "Database connection failed");
    process.exit(1);
  }
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info({ signal }, "Received shutdown signal, closing gracefully");
  server.close(async () => {
    await closeDb();
    logger.info("Shutdown complete");
    process.exit(0);
  });

  // Force exit after 10 seconds if graceful shutdown stalls
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
