import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { customers, subscriptions } from "../db/schema/stripe";
import {
  createOrGetCustomer,
  createCheckoutSession,
  createPortalSession,
  handleWebhookEvent,
} from "../services/stripe";
import { requireAuth } from "../middleware/auth";

export const stripeRouter = Router();

// ---------------------------------------------------------------------------
// POST /create-checkout-session
// ---------------------------------------------------------------------------

stripeRouter.post(
  "/create-checkout-session",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { priceId } = req.body;

      if (!priceId || typeof priceId !== "string") {
        return res.status(400).json({ error: "priceId is required" });
      }

      const user = req.user!;
      const stripeCustomerId = await createOrGetCustomer(user.id, user.email);

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await createCheckoutSession(
        stripeCustomerId,
        priceId,
        `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/checkout/cancel`
      );

      return res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      return res.status(500).json({ error: "Failed to create checkout session" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /create-portal-session
// ---------------------------------------------------------------------------

stripeRouter.post(
  "/create-portal-session",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const customer = await db.query.customers.findFirst({
        where: eq(customers.userId, user.id),
      });

      if (!customer) {
        return res.status(404).json({ error: "No subscription found" });
      }

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const session = await createPortalSession(
        customer.stripeCustomerId,
        `${baseUrl}/settings`
      );

      return res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      return res.status(500).json({ error: "Failed to create portal session" });
    }
  }
);

// ---------------------------------------------------------------------------
// POST /webhook
// ---------------------------------------------------------------------------

/**
 * Stripe webhook endpoint.
 *
 * IMPORTANT: This route must receive the raw request body (not parsed as JSON).
 * The Express app must be configured with:
 *
 *   app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
 *
 * This should be placed BEFORE the general express.json() middleware.
 */
stripeRouter.post("/webhook", async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];

  if (!signature || typeof signature !== "string") {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  try {
    await handleWebhookEvent(req.body, signature);
    return res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res
      .status(400)
      .json({ error: error instanceof Error ? error.message : "Webhook failed" });
  }
});

// ---------------------------------------------------------------------------
// GET /subscription
// ---------------------------------------------------------------------------

stripeRouter.get(
  "/subscription",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const customer = await db.query.customers.findFirst({
        where: eq(customers.userId, user.id),
      });

      if (!customer) {
        return res.json({ subscription: null });
      }

      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.customerId, customer.id),
        orderBy: (sub, { desc }) => [desc(sub.createdAt)],
      });

      return res.json({
        subscription: subscription
          ? {
              id: subscription.id,
              status: subscription.status,
              priceId: subscription.stripePriceId,
              currentPeriodEnd: subscription.currentPeriodEnd,
              cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            }
          : null,
      });
    } catch (error) {
      console.error("Error fetching subscription:", error);
      return res.status(500).json({ error: "Failed to fetch subscription" });
    }
  }
);
