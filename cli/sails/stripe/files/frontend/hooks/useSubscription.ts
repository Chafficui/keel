import { useState, useEffect, useCallback } from "react";

interface Subscription {
  id: string;
  status: string;
  priceId: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

interface UseSubscriptionResult {
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage the current user's subscription state.
 *
 * Automatically fetches on mount. Call `refetch()` to manually refresh
 * (e.g., after returning from Stripe Checkout or the customer portal).
 */
export function useSubscription(): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/subscription", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }

      const data = await response.json();
      setSubscription(data.subscription ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error fetching subscription")
      );
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
  };
}

/**
 * Helper to check if a subscription is in an active/usable state.
 */
export function isSubscriptionActive(
  subscription: Subscription | null
): boolean {
  if (!subscription) return false;
  return ["active", "trialing"].includes(subscription.status);
}

/**
 * Helper to check if the user has a specific plan by price ID.
 */
export function hasPlans(
  subscription: Subscription | null,
  priceIds: string[]
): boolean {
  if (!subscription) return false;
  if (!isSubscriptionActive(subscription)) return false;
  return priceIds.includes(subscription.priceId);
}
