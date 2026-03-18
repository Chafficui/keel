import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";

interface CheckoutPageProps {
  status: "success" | "cancel";
}

/**
 * Post-checkout page shown after Stripe redirects back to the app.
 *
 * Rendered for both success and cancellation outcomes.
 */
export function CheckoutPage({ status }: CheckoutPageProps) {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (status === "success" && sessionId) {
      // Optionally verify the session on the server or trigger analytics
      console.log("Checkout completed:", sessionId);
    }
  }, [status, sessionId]);

  if (status === "success") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <svg
              className="h-8 w-8 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Payment successful!
          </h1>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            Thank you for subscribing. Your account has been upgraded and all
            premium features are now available.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Go to Dashboard
            </Link>
            <Link
              to="/settings"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Manage Subscription
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Cancellation
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
          <svg
            className="h-8 w-8 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Checkout cancelled
        </h1>
        <p className="mt-3 text-gray-500 dark:text-gray-400">
          No worries! Your account has not been charged. You can subscribe
          anytime from the pricing page.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/pricing"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Back to Pricing
          </Link>
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
