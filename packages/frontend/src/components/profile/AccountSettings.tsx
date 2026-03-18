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

export default function AccountSettings() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const sessionsData = await apiGet<Session[]>("/api/auth/sessions");
        setSessions(sessionsData);
      } catch {
        // Settings may not exist yet
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
        <h2 className="mb-4 text-lg font-semibold text-white">
          Active Sessions
        </h2>

        {sessions.length === 0 ? (
          <p className="text-sm text-keel-gray-400">No active sessions found.</p>
        ) : (
          <div className="divide-y divide-keel-gray-800">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-keel-gray-100">
                    {session.userAgent
                      ? session.userAgent.substring(0, 60)
                      : "Unknown device"}
                  </p>
                  <p className="text-xs text-keel-gray-400">
                    {session.ipAddress && `${session.ipAddress} - `}
                    Created{" "}
                    {new Date(session.createdAt).toLocaleDateString()}
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
