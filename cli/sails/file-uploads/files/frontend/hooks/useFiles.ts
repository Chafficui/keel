import { useState, useEffect, useCallback } from "react";

interface FileRecord {
  id: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface UseFilesResult {
  /** Array of the current user's files. */
  files: FileRecord[];
  /** Whether the file list is loading. */
  isLoading: boolean;
  /** Last error message, if any. */
  error: string | null;
  /** Delete a file by ID. */
  deleteFile: (id: string) => Promise<boolean>;
  /** Get a temporary download URL for a file. */
  getDownloadUrl: (id: string) => Promise<string | null>;
  /** Manually refresh the file list. */
  refresh: () => Promise<void>;
}

/**
 * Hook for managing the current user's files.
 *
 * Automatically fetches the file list on mount.
 *
 * Usage:
 *   const { files, isLoading, deleteFile, getDownloadUrl, refresh } = useFiles();
 */
export function useFiles(): UseFilesResult {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/files", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.statusText}`);
      }

      const data = await response.json();
      setFiles(data.files ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load files",
      );
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const deleteFile = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/files/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      // Remove from local state.
      setFiles((prev) => prev.filter((f) => f.id !== id));
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete file",
      );
      return false;
    }
  }, []);

  const getDownloadUrl = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const response = await fetch(`/api/files/${id}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error("Failed to get download URL");
        }

        const data = await response.json();
        return data.file?.downloadUrl ?? null;
      } catch {
        return null;
      }
    },
    [],
  );

  return {
    files,
    isLoading,
    error,
    deleteFile,
    getDownloadUrl,
    refresh: fetchFiles,
  };
}
