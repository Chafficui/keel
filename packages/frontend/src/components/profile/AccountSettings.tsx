import { useState, useEffect } from "react";
import { apiGet } from "@/lib/api";
import ProfilePage from "./ProfilePage";

interface Session {
  id: string;
  userAgent?: string;
  ipAddress?: string;
  createdAt: string;
  expiresAt: string;
}

type LoadState = "loading" | "error" | "loaded";

export default function AccountSettings() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      setLoadState("loading");
      setErrorMessage("");
      try {
        const sessionsData = await apiGet<Session[]>("/api/auth/sessions");
        setSessions(sessionsData);
        setLoadState("loaded");
      } catch (err) {
        setLoadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to load sessions.");
      }
    }

    loadSettings();
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8">
      {/* Profile Section */}
      <ProfilePage />

      {/* Active Sessions */}
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Active Sessions</h2>

        {loadState === "loading" && (
          <div className="flex items-center gap-3 py-4">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
            <p className="text-sm text-keel-gray-400">Loading sessions...</p>
          </div>
        )}

        {loadState === "error" && (
          <div className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMessage}
          </div>
        )}

        {loadState === "loaded" && sessions.length === 0 && (
          <p className="text-sm text-keel-gray-400">No active sessions found.</p>
        )}

        {loadState === "loaded" && sessions.length > 0 && (
          <div className="divide-y divide-keel-gray-800">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-keel-gray-100">
                    {session.userAgent ? session.userAgent.substring(0, 60) : "Unknown device"}
                  </p>
                  <p className="text-xs text-keel-gray-400">
                    {session.ipAddress && `${session.ipAddress} - `}
                    Created {new Date(session.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
