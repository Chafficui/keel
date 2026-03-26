import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";
// [SAIL_IMPORTS]

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signup } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
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

    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least one uppercase letter.");
      return;
    }

    if (!/[a-z]/.test(password)) {
      setError("Password must contain at least one lowercase letter.");
      return;
    }

    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least one number.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, name);

      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Signup failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
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
            <h2 className="text-xl font-bold text-white">
              Check your email
            </h2>
            <p className="mt-2 text-sm text-keel-gray-400">
              We&apos;ve sent a verification link to{" "}
              <span className="font-medium text-white">{email}</span>.
              Please check your inbox and verify your email address.
            </p>
            <Link
              to="/login"
              className="mt-6 inline-block text-sm font-medium text-keel-blue hover:text-keel-blue/80"
            >
              Go to login
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
            Create your account
          </h1>
          <p className="mt-1 text-sm text-keel-gray-400">
            Get started with keel
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-keel-gray-400"
            >
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              placeholder="John Doe"
              className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
            />
          </div>

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

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-keel-gray-400"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Min 8 chars, uppercase, lowercase, number"
              className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-keel-gray-400"
            >
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="Repeat your password"
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
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

            {/* [SAIL_SOCIAL_BUTTONS] */}

        <p className="mt-6 text-center text-sm text-keel-gray-400">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-keel-blue hover:text-keel-blue/80"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
