# Stripe Payments Sail

Adds subscription management to your keel application using Stripe Checkout, webhooks, and the Customer Portal.

## Features

- Stripe Checkout for subscription payments
- Webhook handling for subscription lifecycle events
- Customer Portal for self-service subscription management
- Pricing page with plan cards
- Subscription status component for dashboards and settings
- Drizzle ORM schema for customers and subscriptions

## Prerequisites

- A Stripe account (https://stripe.com)
- Stripe CLI (for local webhook testing)

## Installation

```bash
npx tsx sails/stripe/install.ts
```

The installer will prompt for your Stripe API keys and configure everything automatically.

## Manual Setup: Stripe Dashboard

### 1. Get API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy the **Publishable key** (pk_test_...)
3. Copy the **Secret key** (sk_test_...)
4. Add both to your `.env` file

### 2. Create Products and Prices

1. Go to https://dashboard.stripe.com/test/products
2. Click **Add product**
3. Create your subscription plans (e.g., "Pro" and "Enterprise")
4. For each product, add a **Recurring price** (e.g., $19/month)
5. Copy the Price IDs (price_...) and update `src/pages/Pricing.tsx`

### 3. Set Up Webhooks

#### Development (using Stripe CLI)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The CLI will output a webhook signing secret (whsec_...). Add it to your `.env` as `STRIPE_WEBHOOK_SECRET`.

#### Production

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. Set the URL to `https://yourdomain.com/api/stripe/webhook`
4. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Click **Add endpoint**
6. Copy the **Signing secret** and set it as `STRIPE_WEBHOOK_SECRET`

### 4. Configure Customer Portal

1. Go to https://dashboard.stripe.com/test/settings/billing/portal
2. Enable the features you want (cancel, update payment method, etc.)
3. Save changes

### 5. Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Architecture

### Database Schema

**stripe_customers**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | text | FK to users table |
| stripe_customer_id | text | Stripe Customer ID |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

**stripe_subscriptions**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| customer_id | uuid | FK to stripe_customers |
| stripe_subscription_id | text | Stripe Subscription ID |
| status | text | active, trialing, past_due, canceled, etc. |
| stripe_price_id | text | The Stripe Price ID |
| current_period_start | timestamp | Current billing period start |
| current_period_end | timestamp | Current billing period end |
| cancel_at_period_end | boolean | Whether sub cancels at period end |
| created_at | timestamp | Creation time |
| updated_at | timestamp | Last update time |

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/stripe/create-checkout-session | Yes | Create a Checkout session |
| POST | /api/stripe/create-portal-session | Yes | Create a Customer Portal session |
| POST | /api/stripe/webhook | No | Stripe webhook handler |
| GET | /api/stripe/subscription | Yes | Get current subscription |

### Webhook Flow

1. Stripe fires an event (e.g., `checkout.session.completed`)
2. Express receives the raw body at `/api/stripe/webhook`
3. Signature is verified using `STRIPE_WEBHOOK_SECRET`
4. The event handler updates the database accordingly
5. Returns 200 to acknowledge receipt

### Important: Raw Body Middleware

The webhook endpoint requires the raw request body for signature verification. Make sure your Express app has this middleware **before** `express.json()`:

```typescript
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
```

The installer adds this automatically.

## Frontend Components

### Pricing Page (`/pricing`)

Displays plan cards with features and subscribe buttons. Redirects to Stripe Checkout when a plan is selected.

### Checkout Page (`/checkout/success`, `/checkout/cancel`)

Post-checkout landing pages for successful payments and cancellations.

### SubscriptionStatus Component

Drop-in component showing the current subscription status with a "Manage" button that opens the Stripe Customer Portal. Use it in settings or dashboard pages:

```tsx
import { SubscriptionStatus } from "@/components/stripe/SubscriptionStatus";

function SettingsPage() {
  return (
    <div>
      <h2>Subscription</h2>
      <SubscriptionStatus />
    </div>
  );
}
```

### useSubscription Hook

```tsx
import { useSubscription, isSubscriptionActive } from "@/hooks/useSubscription";

function MyComponent() {
  const { subscription, isLoading } = useSubscription();

  if (isSubscriptionActive(subscription)) {
    return <PremiumContent />;
  }

  return <UpgradePrompt />;
}
```

## Testing

### Test Cards

Use Stripe's test card numbers:

| Card | Number | Scenario |
|------|--------|----------|
| Visa | 4242 4242 4242 4242 | Successful payment |
| Visa (declined) | 4000 0000 0000 0002 | Card declined |
| Visa (3D Secure) | 4000 0025 0000 3155 | Requires authentication |

Use any future expiry date, any 3-digit CVC, and any ZIP code.

### Testing Webhooks Locally

```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Forward Stripe events
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Terminal 3: Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## Going to Production

1. Switch from test keys to live keys in your environment
2. Create live products/prices and update Price IDs
3. Set up the production webhook endpoint
4. Configure the Customer Portal for live mode
5. Test the full flow with a real card
