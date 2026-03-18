import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth.js";
import {
  initAnalytics,
  identify,
  reset,
  trackPageView,
} from "@/lib/analytics.js";

interface AnalyticsProviderProps {
  children: ReactNode;
}

/**
 * Provider component that initializes PostHog analytics and handles
 * automatic user identification and page view tracking.
 *
 * Wrap your app (or router) with this component:
 *
 *   <AnalyticsProvider>
 *     <AppRouter />
 *   </AnalyticsProvider>
 *
 * Behavior:
 *   - Initializes PostHog on mount
 *   - Identifies the user when they are logged in
 *   - Resets identity on logout
 *   - Tracks page views on every route change
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  // Initialize PostHog on mount
  useEffect(() => {
    initAnalytics();
  }, []);

  // Identify or reset user when auth state changes
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

  // Track page views on route changes
  useEffect(() => {
    trackPageView();
  }, [location.pathname]);

  return <>{children}</>;
}
