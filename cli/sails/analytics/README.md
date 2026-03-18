# PostHog Analytics Sail

Adds privacy-friendly analytics to your keel application using PostHog. Supports automatic page view tracking, user identification, custom events, and more.

## Features

- Automatic page view tracking on SPA route changes
- User identification tied to BetterAuth sessions
- Custom event tracking API
- Session recording and heatmaps (configurable in PostHog)
- Feature flags support
- Works with PostHog Cloud or self-hosted instances
- GDPR-compatible (supports cookie-less tracking and consent)
- No backend dependencies — everything runs client-side

## Prerequisites

- A PostHog account (cloud or self-hosted)
  - Cloud: https://app.posthog.com (US) or https://eu.posthog.com (EU)
  - Self-hosted: https://posthog.com/docs/self-host

## Installation

```bash
npx tsx sails/analytics/install.ts
```

The installer will ask whether you are using PostHog Cloud or self-hosted and collect your API key.

## Manual Setup

### 1. Get Your API Key

#### PostHog Cloud
1. Sign up at https://app.posthog.com
2. Create a project
3. Go to **Project Settings**
4. Copy the **Project API Key** (starts with `phc_`)

#### Self-Hosted
1. Log into your PostHog instance
2. Go to **Project Settings**
3. Copy the **Project API Key**

### 2. Environment Variables

```env
VITE_POSTHOG_KEY=phc_your_project_api_key
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

For EU cloud, use `https://eu.i.posthog.com`. For self-hosted, use your instance URL.

## Architecture

### Analytics Service (`src/lib/analytics.ts`)

Singleton service that wraps the PostHog SDK:

```typescript
import analytics from "@/lib/analytics";

// Initialize (done automatically by AnalyticsProvider)
analytics.init();

// Identify user after login
analytics.identify("user-123", { email: "user@example.com", plan: "pro" });

// Track custom event
analytics.trackEvent("feature_used", { feature: "dark-mode" });

// Track page view (done automatically on route changes)
analytics.trackPageView();

// Reset on logout
analytics.reset();
```

When `VITE_POSTHOG_KEY` is not set (local development), all calls become no-ops.

### AnalyticsProvider Component

Wraps your app and handles:
- PostHog initialization on mount
- User identification when logged in
- Identity reset on logout
- Page view tracking on route changes

```tsx
// In App.tsx (added automatically by installer)
import { AnalyticsProvider } from "./components/AnalyticsProvider";

export default function App() {
  return (
    <AnalyticsProvider>
      <AppRouter />
    </AnalyticsProvider>
  );
}
```

### useAnalytics Hook

For tracking events in components:

```tsx
import { useAnalytics } from "@/hooks/useAnalytics";

function PricingPage() {
  const { trackEvent } = useAnalytics();

  const handlePlanSelect = (plan: string) => {
    trackEvent("plan_selected", { plan });
  };

  return (
    <button onClick={() => handlePlanSelect("pro")}>
      Select Pro Plan
    </button>
  );
}
```

The hook also auto-handles user identification and page views, so you can use it in any component that needs event tracking.

## Common Events to Track

| Event | When | Properties |
|-------|------|------------|
| `signup_completed` | After successful signup | `{ method: "email" }` |
| `plan_selected` | User clicks a pricing plan | `{ plan: "pro" }` |
| `feature_used` | User interacts with a feature | `{ feature: "export" }` |
| `error_occurred` | An error happens | `{ page: "/settings", type: "validation" }` |
| `onboarding_step` | User progresses in onboarding | `{ step: 3, total: 5 }` |

## PostHog Features

### Session Recording

Enable in PostHog > Project Settings > Session Recording. Records user sessions as videos for debugging and UX research.

### Feature Flags

```typescript
import { getPostHog } from "@/lib/analytics";

const posthog = getPostHog();
if (posthog?.isFeatureEnabled("new-dashboard")) {
  // Show new dashboard
}
```

### Surveys

Create in-app surveys directly from the PostHog dashboard. They appear automatically when conditions are met.

## GDPR Compliance

PostHog offers several privacy-friendly options:

1. **Cookie-less tracking**: PostHog can work without cookies using localStorage
2. **Consent management**: Disable autocapture until consent is given:
   ```typescript
   // In analytics.ts, change persistence to "memory" and disable autocapture
   // Then enable after consent:
   posthog.opt_in_capturing();
   ```
3. **EU hosting**: Use `https://eu.i.posthog.com` for EU data residency
4. **Self-hosting**: Full data control with a self-hosted instance

If you have the GDPR sail installed, consider integrating analytics initialization with the consent tracking system.

## Disabling in Development

Analytics is automatically disabled when `VITE_POSTHOG_KEY` is not set. In local development, you can either:

- Leave `VITE_POSTHOG_KEY` empty in your `.env` (analytics disabled)
- Set it to your dev/staging PostHog project key (analytics enabled)
