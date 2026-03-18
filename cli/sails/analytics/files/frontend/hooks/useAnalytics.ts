import { useEffect, useCallback } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth.js";
import { identify, reset, trackEvent, trackPageView } from "@/lib/analytics.js";

interface UseAnalyticsResult {
  trackEvent: (name: string, properties?: Record<string, string | number | boolean>) => void;
  identify: (userId: string, traits?: Record<string, string | number | boolean>) => void;
  reset: () => void;
}

/**
 * React hook that integrates PostHog analytics with auth state and routing.
 *
 * - Auto-identifies the user when they log in (using useAuth)
 * - Auto-resets identity when the user logs out
 * - Auto-tracks page views on every route change (using useLocation)
 * - Returns functions for manual event tracking
 */
export function useAnalytics(): UseAnalyticsResult {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Auto-identify / reset when auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      identify(user.id, {
        email: user.email,
        name: user.name,
      });
    } else {
      reset();
    }
  }, [isAuthenticated, user]);

  // Auto-track page views on route changes
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  const track = useCallback(
    (name: string, properties?: Record<string, string | number | boolean>) => {
      trackEvent(name, properties);
    },
    [],
  );

  const identifyUser = useCallback(
    (userId: string, traits?: Record<string, string | number | boolean>) => {
      identify(userId, traits);
    },
    [],
  );

  const resetIdentity = useCallback(() => {
    reset();
  }, []);

  return {
    trackEvent: track,
    identify: identifyUser,
    reset: resetIdentity,
  };
}
