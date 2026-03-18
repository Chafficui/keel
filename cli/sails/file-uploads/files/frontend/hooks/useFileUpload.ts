import { useState, useCallback } from "react";

interface UploadUrlResponse {
  uploadUrl: string;
  file: {
    id: string;
    key: string;
    fileName: string;
  };
}

interface UseFileUploadResult {
  /** Upload a file. Returns the file record on success. */
  upload: (file: File) => Promise<{ id: string; fileName: string } | null>;
  /** Whether an upload is currently in progress. */
  isUploading: boolean;
  /** Upload progress as a percentage (0-100). */
  progress: number;
  /** Last error message, if any. */
  error: string | null;
}

/**
 * Hook for uploading files via presigned URLs.
 *
 * 1. Requests a presigned upload URL from the backend
 * 2. PUTs the file directly to S3-compatible storage
 * 3. Returns the file metadata
 *
 * Usage:
 *   const { upload, isUploading, progress, error } = useFileUpload();
 *   const result = await upload(file);
 */
export function useFileUpload(): UseFileUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned upload URL from the backend.
      const response = await fetch("/api/files/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          maxSize: file.size,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed (${response.status})`);
      }

      const { uploadUrl, file: fileRecord } =
        (await response.json()) as UploadUrlResponse;

      // Step 2: Upload the file directly to storage via presigned URL.
      // Use XMLHttpRequest for progress tracking.
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage upload failed (${xhr.status})`));
          }
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setProgress(100);
      return { id: fileRecord.id, fileName: fileRecord.fileName };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, []);

  return { upload, isUploading, progress, error };
}
