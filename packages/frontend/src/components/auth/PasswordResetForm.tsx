import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { authClient } from "@/lib/auth-client";

export default function PasswordResetForm() {
  const { token } = useParams<{ token?: string }>();
  const isResetMode = !!token;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRequestReset = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to send reset email. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsSubmitting(true);

    try {
      await authClient.resetPassword({ newPassword: password, token: token! });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reset password. The link may have expired.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success && !isResetMode) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Check your email</h2>
            <p className="mt-2 text-sm text-keel-gray-400">
              If an account exists with that email, we&apos;ve sent password reset instructions.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-keel-blue hover:text-keel-blue/80"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success && isResetMode) {
    return (
      <div className="mx-auto w-full max-w-md">
        <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-8">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
              <svg
                className="h-6 w-6 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">Password reset successful</h2>
            <p className="mt-2 text-sm text-keel-gray-400">
              Your password has been updated. You can now sign in with your new password.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block rounded-lg bg-keel-blue px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-keel-blue/90"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">
            {isResetMode ? "Set new password" : "Reset your password"}
          </h1>
          <p className="mt-1 text-sm text-keel-gray-400">
            {isResetMode
              ? "Enter your new password below"
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isResetMode ? (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-keel-gray-400"
              >
                New password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="At least 8 characters"
                className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-keel-gray-400"
              >
                Confirm new password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="Repeat your new password"
                className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-keel-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-keel-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Resetting...
                </>
              ) : (
                "Reset password"
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-keel-gray-400"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-keel-blue px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-keel-blue/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Sending...
                </>
              ) : (
                "Send reset link"
              )}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-keel-gray-400">
          <Link to="/login" className="font-medium text-keel-blue hover:text-keel-blue/80">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
