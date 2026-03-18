import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "@/hooks/useAuth";
// [SAIL_IMPORTS]

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login(email, password);
      navigate(returnUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-keel-gray-400">
            Sign in to your account
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
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-medium text-keel-gray-400"
              >
                Password
              </label>
              <Link
                to="/reset-password"
                className="text-sm font-medium text-keel-blue hover:text-keel-blue/80"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
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
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

            {/* [SAIL_SOCIAL_BUTTONS] */}

        <p className="mt-6 text-center text-sm text-keel-gray-400">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-keel-blue hover:text-keel-blue/80"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
