import posthog from "posthog-js";

// ---------------------------------------------------------------------------
// PostHog Analytics Service
// ---------------------------------------------------------------------------

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST as string | undefined;

/** Whether PostHog is configured and initialized. */
let isInitialized = false;

/**
 * Initialize PostHog analytics.
 *
 * If VITE_POSTHOG_KEY is not set (common in local dev), all calls become
 * no-ops so analytics never interfere with development.
 */
export function initAnalytics(): void {
  if (isInitialized) return;

  if (!POSTHOG_KEY) {
    if (import.meta.env.DEV) {
      console.log("[analytics] VITE_POSTHOG_KEY not set — analytics disabled in dev");
    }
    return;
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST || "https://us.i.posthog.com",
    autocapture: true,
    capture_pageview: false, // We handle page views manually for SPA routing
    capture_pageleave: true,
    persistence: "localStorage",
    person_profiles: "identified_only",
  });

  isInitialized = true;
}

/**
 * Identify a user after login. Associates all future events with this user.
 *
 * @param userId - The user's unique ID
 * @param traits - Optional user properties (email, name, plan, etc.)
 */
export function identify(
  userId: string,
  traits?: Record<string, string | number | boolean>,
): void {
  if (!isInitialized) return;
  posthog.identify(userId, traits);
}

/**
 * Reset analytics identity after logout.
 * Creates a new anonymous ID for subsequent events.
 */
export function reset(): void {
  if (!isInitialized) return;
  posthog.reset();
}

/**
 * Track a custom event.
 *
 * @param name - Event name (e.g., "subscription_started", "feature_used")
 * @param properties - Optional event properties
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (!isInitialized) return;
  posthog.capture(name, properties);
}

/**
 * Track a page view. Call this on every route change in an SPA.
 */
export function trackPageView(): void {
  if (!isInitialized) return;
  posthog.capture("$pageview");
}

/**
 * Get the PostHog instance for advanced usage.
 * Returns null if not initialized.
 */
export function getPostHog(): typeof posthog | null {
  return isInitialized ? posthog : null;
}

export const analytics = {
  init: initAnalytics,
  identify,
  reset,
  trackEvent,
  trackPageView,
  getPostHog,
};

export default analytics;
