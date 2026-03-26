import { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";

type VerificationStatus = "loading" | "success" | "error";

export default function EmailVerification() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<VerificationStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided.");
      return;
    }

    let cancelled = false;

    async function verify() {
      try {
        await authClient.verifyEmail({ query: { token: token! } });
        if (!cancelled) {
          setStatus("success");
          setTimeout(() => {
            navigate("/login");
          }, 3000);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus("error");
          const msg = err instanceof Error ? err.message : "";
          if (msg.includes("expired") || msg.includes("token_expired")) {
            setErrorMessage("This verification link has expired. Please request a new one.");
          } else if (msg.includes("invalid") || msg.includes("token_invalid")) {
            setErrorMessage("This verification link is invalid. Please request a new one.");
          } else if (msg.includes("already_verified") || msg.includes("already verified")) {
            setErrorMessage("This email has already been verified. You can sign in.");
          } else {
            setErrorMessage("An unexpected error occurred. Please try again.");
          }
        }
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-8">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-keel-gray-800 border-t-keel-blue" />
            <div>
              <h2 className="text-xl font-bold text-white">
                Verifying your email
              </h2>
              <p className="mt-1 text-sm text-keel-gray-400">
                Please wait while we verify your email address...
              </p>
            </div>
          </div>
        )}

        {status === "success" && (
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
              Email verified
            </h2>
            <p className="mt-2 text-sm text-keel-gray-400">
              Your email has been successfully verified. Redirecting to login...
            </p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-medium text-keel-blue hover:text-keel-blue/80"
            >
              Go to login now
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg
                className="h-6 w-6 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">
              Verification failed
            </h2>
            <p className="mt-2 text-sm text-keel-gray-400">{errorMessage}</p>
            <Link
              to="/login"
              className="mt-4 inline-block text-sm font-medium text-keel-blue hover:text-keel-blue/80"
            >
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
