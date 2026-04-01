import { Link } from "react-router";
import { useAuth } from "@/hooks/useAuth";

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24">
      <div className="mx-auto max-w-2xl text-center">
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <img src="/images/logo.png" alt="Keel" className="h-16 w-16" />
        </div>

        {/* Codai badge */}
        <a
          href="https://www.codai.app"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-keel-gray-800 bg-keel-gray-900/50 px-4 py-1.5 transition-colors hover:border-keel-gray-400"
        >
          <span className="text-sm text-keel-gray-400">a</span>
          <img src="/images/codai-logo.png" alt="Codai" className="h-3.5" />
          <span className="text-sm text-keel-gray-400">project</span>
        </a>

        <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          Ship with <span className="text-keel-blue">confidence.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-keel-gray-400">
          Auth, payments, storage, GDPR compliance, and native mobile — all wired up and ready to
          go. Define your structure, then build.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {isAuthenticated ? (
            <Link
              to="/profile"
              className="inline-flex items-center rounded-lg bg-keel-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-keel-blue/90"
            >
              Go to Dashboard
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>
          ) : (
            <>
              <Link
                to="/signup"
                className="inline-flex items-center rounded-lg bg-keel-blue px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-keel-blue/90"
              >
                Get Started
                <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center rounded-lg border border-keel-gray-800 px-6 py-3 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400 hover:text-white"
              >
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
