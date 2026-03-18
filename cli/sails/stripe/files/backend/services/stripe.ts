import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { customers, subscriptions } from "../db/schema/stripe";
import { env } from "../env";

// ---------------------------------------------------------------------------
// Stripe SDK instance
// ---------------------------------------------------------------------------

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// ---------------------------------------------------------------------------
// Customer management
// ---------------------------------------------------------------------------

/**
 * Retrieve the existing Stripe customer for a user, or create one.
 */
export async function createOrGetCustomer(
  userId: string,
  email: string
): Promise<string> {
  // Check for existing customer record
  const existing = await db.query.customers.findFirst({
    where: eq(customers.userId, userId),
  });

  if (existing) {
    return existing.stripeCustomerId;
  }

  // Create a new Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email,
    metadata: { userId },
  });

  // Persist the mapping
  await db.insert(customers).values({
    userId,
    stripeCustomerId: stripeCustomer.id,
  });

  return stripeCustomer.id;
}

// ---------------------------------------------------------------------------
// Checkout session
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Checkout session for a subscription.
 */
export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: { customerId },
    },
  });
}

// ---------------------------------------------------------------------------
// Customer portal session
// ---------------------------------------------------------------------------

/**
 * Create a Stripe Customer Portal session so the user can manage their
 * subscription, update payment methods, or cancel.
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ---------------------------------------------------------------------------
// Webhook event handler
// ---------------------------------------------------------------------------

/**
 * Verify and process an incoming Stripe webhook event.
 */
export async function handleWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<void> {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    env.STRIPE_WEBHOOK_SECRET
  );

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    default:
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }
}

// ---------------------------------------------------------------------------
// Internal event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode !== "subscription" || !session.subscription) return;

  const stripeSubscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;

  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;

  if (!stripeCustomerId) return;

  // Look up the internal customer record
  const customer = await db.query.customers.findFirst({
    where: eq(customers.stripeCustomerId, stripeCustomerId),
  });

  if (!customer) {
    console.error(
      `No customer record found for Stripe customer ${stripeCustomerId}`
    );
    return;
  }

  // Fetch the full subscription from Stripe to get price info
  const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  const priceId = stripeSub.items.data[0]?.price.id ?? "";

  // Upsert the subscription record
  await db
    .insert(subscriptions)
    .values({
      customerId: customer.id,
      stripeSubscriptionId,
      status: stripeSub.status,
      stripePriceId: priceId,
      currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
      currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
      cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status: stripeSub.status,
        stripePriceId: priceId,
        currentPeriodStart: new Date(stripeSub.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSub.current_period_end * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    });
}

async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
): Promise<void> {
  const priceId = subscription.items.data[0]?.price.id ?? "";

  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      stripePriceId: priceId,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
): Promise<void> {
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      cancelAtPeriodEnd: false,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}
