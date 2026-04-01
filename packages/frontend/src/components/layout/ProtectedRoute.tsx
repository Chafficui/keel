import { useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/hooks/useAuth";

const AUTH_TIMEOUT_MS = 10_000;

export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, AUTH_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [isLoading]);

  if (isLoading && !timedOut) {
    return (
      <div className="flex flex-1 items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-keel-gray-800 border-t-keel-blue" />
          <p className="text-sm text-keel-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (timedOut || !isAuthenticated) {
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <Outlet />;
}
