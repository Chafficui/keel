import { useState, useEffect } from "react";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

interface DeletionStatus {
  pending: boolean;
  scheduledAt?: string;
}

export default function AccountDeletionRequest() {
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus>({
    pending: false,
  });
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkStatus() {
      try {
        const status = await apiGet<DeletionStatus>(
          "/api/gdpr/deletion-status",
        );
        setDeletionStatus(status);
      } catch {
        // No pending deletion
      }
    }
    checkStatus();
  }, []);

  const handleRequestDeletion = async () => {
    setIsLoading(true);
    setError("");

    try {
      const status = await apiPost<DeletionStatus>("/api/gdpr/delete-account", {
        reason: reason || undefined,
      });
      setDeletionStatus(status);
      setShowConfirm(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to request deletion.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelDeletion = async () => {
    setIsLoading(true);
    setError("");

    try {
      await apiDelete("/api/gdpr/delete-account");
      setDeletionStatus({ pending: false });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel deletion request.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (deletionStatus.pending) {
    const scheduledDate = deletionStatus.scheduledAt
      ? new Date(deletionStatus.scheduledAt).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "30 days from now";

    return (
      <div>
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-400">
                Account deletion scheduled
              </p>
              <p className="mt-1 text-xs text-amber-400/80">
                Your account is scheduled for deletion on{" "}
                <span className="font-medium">{scheduledDate}</span>. You can
                cancel this request before that date.
              </p>
            </div>
          </div>
          <button
            onClick={handleCancelDeletion}
            disabled={isLoading}
            className="mt-3 rounded-lg border border-amber-500/30 px-4 py-2 text-sm font-medium text-amber-400 transition-colors hover:bg-amber-500/10 disabled:opacity-50"
          >
            {isLoading ? "Cancelling..." : "Cancel deletion"}
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {!showConfirm ? (
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center rounded-lg text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 px-4 py-2"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          Delete my account
        </button>
      ) : (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <h4 className="text-sm font-medium text-red-400">
            Are you sure you want to delete your account?
          </h4>
          <p className="mt-1 text-xs text-red-400/80">
            This action will schedule your account for permanent deletion. You
            will have a 30-day grace period to cancel the request. After that,
            all your data will be permanently removed.
          </p>

          <div className="mt-3">
            <label
              htmlFor="deletionReason"
              className="mb-1.5 block text-xs font-medium text-red-400"
            >
              Reason for leaving (optional)
            </label>
            <textarea
              id="deletionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="We'd appreciate knowing why you're leaving..."
              className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white placeholder-keel-gray-400 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/20"
            />
          </div>

          <div className="mt-3 flex gap-3">
            <button
              onClick={handleRequestDeletion}
              disabled={isLoading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              {isLoading ? "Processing..." : "Yes, delete my account"}
            </button>
            <button
              onClick={() => {
                setShowConfirm(false);
                setReason("");
              }}
              className="rounded-lg border border-keel-gray-800 px-4 py-2 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
