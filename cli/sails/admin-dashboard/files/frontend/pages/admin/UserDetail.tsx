import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router";
import { fetchUser, updateUser, deleteUser, type AdminUser } from "@/hooks/useAdmin.js";

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUser | null>(null);
  const [activeSessions, setActiveSessions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchUser(id);
      setUser(data.user);
      setActiveSessions(data.activeSessions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleVerifyEmail = async () => {
    if (!user) return;
    setActionLoading("verify");
    try {
      const result = await updateUser(user.id, { emailVerified: true });
      setUser(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    const confirmed = window.confirm(
      `Are you sure you want to delete ${user.name} (${user.email})? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setActionLoading("delete");
    try {
      await deleteUser(user.id);
      navigate("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-sm text-red-400">{error ?? "User not found"}</p>
          <button
            onClick={() => navigate("/admin")}
            className="mt-4 text-sm font-medium text-keel-blue hover:underline"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <button
        onClick={() => navigate("/admin")}
        className="mb-6 flex items-center gap-1.5 text-sm font-medium text-keel-gray-400 transition-colors hover:text-white"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to dashboard
      </button>

      {/* User info card */}
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <div className="flex items-start gap-4">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-keel-blue/20 text-xl font-bold text-keel-blue">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-white">{user.name}</h1>
            <p className="text-sm text-keel-gray-400">{user.email}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {user.emailVerified ? (
                <span className="inline-flex items-center rounded-full bg-green-500/10 px-2.5 py-0.5 text-xs font-medium text-green-400">
                  Email Verified
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-400">
                  Email Not Verified
                </span>
              )}
              <span className="inline-flex items-center rounded-full bg-keel-blue/10 px-2.5 py-0.5 text-xs font-medium text-keel-blue">
                {activeSessions} active session{activeSessions !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-keel-gray-800 pt-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-keel-gray-400">
              User ID
            </p>
            <p className="mt-1 font-mono text-sm text-keel-gray-200">{user.id}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-keel-gray-400">
              Member Since
            </p>
            <p className="mt-1 text-sm text-keel-gray-200">
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-keel-gray-400">
              Last Updated
            </p>
            <p className="mt-1 text-sm text-keel-gray-200">
              {new Date(user.updatedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-keel-gray-400">
              Profile Image
            </p>
            <p className="mt-1 text-sm text-keel-gray-200">
              {user.image ? "Custom image set" : "No image"}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-keel-gray-800 pt-6">
          {!user.emailVerified && (
            <button
              onClick={handleVerifyEmail}
              disabled={actionLoading === "verify"}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading === "verify" ? "Verifying..." : "Verify Email"}
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={!!actionLoading}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {actionLoading === "delete" ? "Deleting..." : "Delete User"}
          </button>
        </div>
      </div>
    </div>
  );
}
