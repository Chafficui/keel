import { useSubscription } from "@/hooks/useSubscription";

/**
 * Displays the current user's subscription status with options to manage,
 * upgrade, or subscribe.
 */
export function SubscriptionStatus() {
  const { subscription, isLoading, error } = useSubscription();

  const handleManage = async () => {
    try {
      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Failed to open customer portal:", err);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="mt-3 h-3 w-48 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load subscription status.
        </p>
      </div>
    );
  }

  // No subscription — show upgrade prompt
  if (!subscription) {
    return (
      <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Free Plan
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upgrade to unlock premium features.
            </p>
          </div>
          <a
            href="/pricing"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Upgrade
          </a>
        </div>
      </div>
    );
  }

  // Status badge colors
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    past_due: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    canceled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    incomplete: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const statusLabel: Record<string, string> = {
    active: "Active",
    trialing: "Trial",
    past_due: "Past Due",
    canceled: "Canceled",
    incomplete: "Incomplete",
  };

  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="rounded-lg border border-gray-200 p-6 dark:border-gray-700">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Subscription
            </h3>
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                statusColors[subscription.status] ?? statusColors.incomplete
              }`}
            >
              {statusLabel[subscription.status] ?? subscription.status}
            </span>
          </div>

          {subscription.cancelAtPeriodEnd && (
            <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
              Cancels at end of billing period
            </p>
          )}

          {periodEnd && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subscription.cancelAtPeriodEnd
                ? `Access until ${periodEnd}`
                : `Renews on ${periodEnd}`}
            </p>
          )}
        </div>

        <button
          onClick={handleManage}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          Manage
        </button>
      </div>
    </div>
  );
}
