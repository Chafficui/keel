import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { toNodeHandler as betterAuthToNodeHandler } from "better-auth/node";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { env } from "../env.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "./email.js";

const authConfig: BetterAuthOptions = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: env.NODE_ENV === "production",
    minPasswordLength: 8,
    maxPasswordLength: 128,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail(user.email, url);
    },
  },
  emailVerification: {
    sendOnSignUp: env.NODE_ENV === "production",
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      // Replace backend URL with frontend URL in verification link
      const frontendUrl = url.replace(env.BACKEND_URL, env.FRONTEND_URL);
      await sendVerificationEmail(user.email, frontendUrl);
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
  },
  baseURL: env.BACKEND_URL,
  trustedOrigins: [env.FRONTEND_URL],
  advanced: {
    defaultCookieAttributes: env.ENABLE_CAPACITOR
      ? { sameSite: "none" as const, secure: true }
      : { sameSite: "lax" as const, secure: env.NODE_ENV === "production" },
  },
  socialProviders: {
    // [SAIL_SOCIAL_PROVIDERS]
  },
};

export const auth = betterAuth(authConfig);

export const toNodeHandler = betterAuthToNodeHandler(auth);
