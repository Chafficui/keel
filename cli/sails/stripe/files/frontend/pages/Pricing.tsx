import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";

/**
 * Pricing plans configuration.
 *
 * Replace the priceId values with your actual Stripe Price IDs from the
 * Stripe Dashboard (https://dashboard.stripe.com/test/products).
 */
const PLANS = [
  {
    name: "Free",
    description: "Get started with the basics",
    price: "$0",
    interval: "forever",
    priceId: null,
    features: [
      "Up to 3 projects",
      "Basic analytics",
      "Community support",
      "1 GB storage",
    ],
  },
  {
    name: "Pro",
    description: "Everything you need to grow",
    price: "$19",
    interval: "month",
    priceId: "price_REPLACE_WITH_PRO_PRICE_ID",
    popular: true,
    features: [
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "50 GB storage",
      "Custom domain",
      "Team collaboration",
    ],
  },
  {
    name: "Enterprise",
    description: "For large teams and organizations",
    price: "$49",
    interval: "month",
    priceId: "price_REPLACE_WITH_ENTERPRISE_PRICE_ID",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "SSO / SAML",
      "Dedicated support",
      "SLA guarantee",
      "Custom integrations",
      "Audit logs",
    ],
  },
];

export function PricingPage() {
  const navigate = useNavigate();
  const { subscription, isLoading: subLoading } = useSubscription();
  const [loadingPriceId, setLoadingPriceId] = useState<string | null>(null);

  const handleSubscribe = async (priceId: string | null) => {
    if (!priceId) return;

    setLoadingPriceId(priceId);
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned");
      }
    } catch (error) {
      console.error("Failed to create checkout session:", error);
    } finally {
      setLoadingPriceId(null);
    }
  };

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
    } catch (error) {
      console.error("Failed to create portal session:", error);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
          Choose the plan that works best for you. Upgrade or downgrade anytime.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="mt-16 grid gap-8 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrentPlan =
            subscription?.priceId === plan.priceId && subscription?.status === "active";

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 shadow-sm ${
                plan.popular
                  ? "border-blue-500 ring-2 ring-blue-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-4 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}

              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {plan.name}
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {plan.description}
              </p>

              <div className="mt-6 flex items-baseline gap-1">
                <span className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
                  {plan.price}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  /{plan.interval}
                </span>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <svg
                      className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500"
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
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-8">
                {isCurrentPlan ? (
                  <button
                    onClick={handleManage}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Manage Subscription
                  </button>
                ) : plan.priceId ? (
                  <button
                    onClick={() => handleSubscribe(plan.priceId)}
                    disabled={loadingPriceId === plan.priceId}
                    className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-colors ${
                      plan.popular
                        ? "bg-blue-600 hover:bg-blue-700"
                        : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-gray-200"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {loadingPriceId === plan.priceId
                      ? "Redirecting..."
                      : "Subscribe"}
                  </button>
                ) : (
                  <button
                    onClick={() => navigate("/signup")}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Get Started
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ or trust badges can go here */}
      <div className="mt-16 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          All plans include a 14-day free trial. No credit card required to start.
          <br />
          Secure payment processing by Stripe.
        </p>
      </div>
    </div>
  );
}
