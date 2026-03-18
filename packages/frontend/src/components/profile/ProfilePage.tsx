import { useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiPatch } from "@/lib/api";

export default function ProfilePage() {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      await apiPatch("/api/user/profile", { name });
      setSuccess("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <h2 className="mb-6 text-lg font-semibold text-white">Profile</h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {success}
          </div>
        )}

        <div className="flex flex-col items-start gap-6 sm:flex-row">
          <div className="flex-1">
            {isEditing ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="mb-1.5 block text-sm font-medium text-keel-gray-400"
                  >
                    Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-keel-gray-800 bg-keel-gray-900 px-3 py-2 text-sm text-white focus:border-keel-blue focus:outline-none focus:ring-2 focus:ring-keel-blue/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-keel-gray-400">
                    Email
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-keel-gray-400">
                      {user?.email}
                    </span>
                    {user?.emailVerified && (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-keel-blue px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-keel-blue/90 disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save changes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(user?.name ?? "");
                    }}
                    className="rounded-lg border border-keel-gray-800 px-4 py-2 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-keel-gray-400">Name</p>
                  <p className="text-sm text-white">
                    {user?.name || "Not set"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-keel-gray-400">Email</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-white">{user?.email}</p>
                    {user?.emailVerified && (
                      <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-keel-gray-400">
                    Member since
                  </p>
                  <p className="text-sm text-white">{memberSince}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-keel-gray-800 px-4 py-2 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400"
                >
                  Edit profile
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
