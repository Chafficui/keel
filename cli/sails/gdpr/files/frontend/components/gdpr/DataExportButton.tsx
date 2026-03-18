import { useState } from "react";

export default function DataExportButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleExport = async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/gdpr/export", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to export data.");
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `keel-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export data.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleExport}
        disabled={isLoading}
        className="inline-flex items-center rounded-lg border border-keel-gray-800 px-4 py-2 text-sm font-medium text-keel-gray-100 transition-colors hover:border-keel-gray-400 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
            Exporting...
          </>
        ) : (
          <>
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
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Export my data
          </>
        )}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
