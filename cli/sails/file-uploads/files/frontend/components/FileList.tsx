import { useState, useCallback } from "react";
import { useFiles } from "@/hooks/useFiles";

/**
 * Format a file size in bytes to a human-readable string.
 */
function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "--";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format a date string to a short locale representation.
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Return a simple icon/label for a content type.
 */
function fileTypeIcon(contentType: string | null): string {
  if (!contentType) return "FILE";
  if (contentType.startsWith("image/")) return "IMG";
  if (contentType.startsWith("video/")) return "VID";
  if (contentType.startsWith("audio/")) return "AUD";
  if (contentType === "application/pdf") return "PDF";
  if (contentType.includes("spreadsheet") || contentType.includes("excel"))
    return "XLS";
  if (contentType.includes("document") || contentType.includes("word"))
    return "DOC";
  if (contentType.includes("zip") || contentType.includes("compressed"))
    return "ZIP";
  return "FILE";
}

/**
 * File browser component.
 *
 * Displays the current user's files in a list view with download and delete
 * actions per file. Includes loading, empty, and error states.
 */
export function FileList() {
  const { files, isLoading, error, deleteFile, getDownloadUrl, refresh } =
    useFiles();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(
    async (id: string, fileName: string) => {
      setDownloadingId(id);
      try {
        const url = await getDownloadUrl(id);
        if (url) {
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      } finally {
        setDownloadingId(null);
      }
    },
    [getDownloadUrl],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this file?")) {
        return;
      }
      setDeletingId(id);
      try {
        await deleteFile(id);
      } finally {
        setDeletingId(null);
      }
    },
    [deleteFile],
  );

  // -- Loading state --------------------------------------------------------
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-keel-gray-600 border-t-keel-blue" />
      </div>
    );
  }

  // -- Error state ----------------------------------------------------------
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={refresh}
          className="mt-3 text-sm font-medium text-keel-blue hover:underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // -- Empty state ----------------------------------------------------------
  if (files.length === 0) {
    return (
      <div className="rounded-xl border border-keel-gray-800 px-6 py-16 text-center">
        <svg
          className="mx-auto mb-4 h-12 w-12 text-keel-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
        <p className="text-sm text-keel-gray-400">No files uploaded yet.</p>
        <p className="mt-1 text-xs text-keel-gray-600">
          Upload a file to get started.
        </p>
      </div>
    );
  }

  // -- File list ------------------------------------------------------------
  return (
    <div className="overflow-hidden rounded-xl border border-keel-gray-800">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-keel-gray-800 bg-keel-navy/50">
            <th className="px-4 py-3 font-medium text-keel-gray-400">Type</th>
            <th className="px-4 py-3 font-medium text-keel-gray-400">Name</th>
            <th className="hidden px-4 py-3 font-medium text-keel-gray-400 sm:table-cell">
              Size
            </th>
            <th className="hidden px-4 py-3 font-medium text-keel-gray-400 md:table-cell">
              Date
            </th>
            <th className="px-4 py-3 text-right font-medium text-keel-gray-400">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => (
            <tr
              key={file.id}
              className="border-b border-keel-gray-800/50 last:border-b-0 hover:bg-keel-navy/30"
            >
              {/* Type badge */}
              <td className="px-4 py-3">
                <span className="inline-flex items-center rounded bg-keel-gray-800 px-2 py-0.5 text-xs font-medium text-keel-gray-300">
                  {fileTypeIcon(file.contentType)}
                </span>
              </td>

              {/* Name */}
              <td className="max-w-[200px] truncate px-4 py-3 font-medium text-keel-gray-200">
                {file.fileName}
              </td>

              {/* Size */}
              <td className="hidden px-4 py-3 text-keel-gray-400 sm:table-cell">
                {formatFileSize(file.sizeBytes)}
              </td>

              {/* Date */}
              <td className="hidden px-4 py-3 text-keel-gray-400 md:table-cell">
                {formatDate(file.createdAt)}
              </td>

              {/* Actions */}
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {/* Download */}
                  <button
                    onClick={() => handleDownload(file.id, file.fileName)}
                    disabled={downloadingId === file.id}
                    className="rounded-lg p-1.5 text-keel-gray-400 transition-colors hover:bg-keel-gray-800 hover:text-keel-blue disabled:opacity-50"
                    title="Download"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                      />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(file.id)}
                    disabled={deletingId === file.id}
                    className="rounded-lg p-1.5 text-keel-gray-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                    title="Delete"
                  >
                    {deletingId === file.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-keel-gray-600 border-t-red-400" />
                    ) : (
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
