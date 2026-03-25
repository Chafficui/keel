import cors from "cors";
import { env } from "../env.js";

const allowedOrigins: string[] = [env.FRONTEND_URL];

// Only include Capacitor origins when explicitly enabled
if (env.ENABLE_CAPACITOR) {
  allowedOrigins.push("capacitor://localhost", "ionic://localhost");
}

export const corsMiddleware = cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Platform"],
});
