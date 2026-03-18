import express from "express";
import helmet from "helmet";
import { env } from "./env.js";
import { corsMiddleware } from "./middleware/cors.js";
import { toNodeHandler } from "./auth/index.js";
import healthRoutes from "./routes/health.js";
import profileRoutes from "./routes/profile.js";
// [SAIL_IMPORTS]

const app = express();

// Security headers
app.use(helmet());

// CORS
app.use(corsMiddleware);

// BetterAuth handler — BEFORE express.json() so it can handle its own body parsing
app.all("/api/auth/{*splat}", toNodeHandler);

// JSON body parsing for all other routes
app.use(express.json());

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/profile", profileRoutes);
// [SAIL_ROUTES]

app.listen(env.PORT, () => {
  console.log(
    `[backend] Server running on port ${env.PORT} in ${env.NODE_ENV} mode`,
  );
});
