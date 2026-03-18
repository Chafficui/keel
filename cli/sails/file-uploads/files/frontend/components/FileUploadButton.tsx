import { useState, useRef, useCallback } from "react";
import { useFileUpload } from "@/hooks/useFileUpload";

interface FileUploadButtonProps {
  /** Accepted MIME types (e.g., "image/*,.pdf"). Defaults to all files. */
  accept?: string;
  /** Maximum file size in bytes. Defaults to 50 MB. */
  maxSize?: number;
  /** Callback invoked when an upload completes successfully. */
  onUploadComplete?: (file: { id: string; fileName: string }) => void;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB

/**
 * File upload button with drag-and-drop support.
 *
 * Displays an upload zone that accepts clicks and drag-and-drop. Shows upload
 * progress while a file is being transferred.
 */
export function FileUploadButton({
  accept,
  maxSize = DEFAULT_MAX_SIZE,
  onUploadComplete,
}: FileUploadButtonProps) {
  const { upload, isUploading, progress, error } = useFileUpload();
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setValidationError(null);

      if (file.size > maxSize) {
        const mb = Math.round(maxSize / 1024 / 1024);
        setValidationError(`File size must be less than ${mb} MB.`);
        return;
      }

      const result = await upload(file);
      if (result) {
        onUploadComplete?.(result);
      }
    },
    [upload, maxSize, onUploadComplete],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset the input so the same file can be selected again.
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const displayError = validationError ?? error;

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isUploading}
        className={`flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors ${
          isDragOver
            ? "border-keel-blue bg-keel-blue/10"
            : "border-keel-gray-700 hover:border-keel-gray-500"
        } ${isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      >
        {isUploading ? (
          <>
            {/* Progress indicator */}
            <div className="mb-3 h-10 w-10 animate-spin rounded-full border-4 border-keel-gray-600 border-t-keel-blue" />
            <p className="text-sm font-medium text-keel-gray-300">
              Uploading... {progress}%
            </p>
            <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-keel-gray-800">
              <div
                className="h-full rounded-full bg-keel-blue transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            {/* Upload icon */}
            <svg
              className="mb-3 h-10 w-10 text-keel-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <p className="text-sm font-medium text-keel-gray-300">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-keel-gray-500">
              Max file size: {Math.round(maxSize / 1024 / 1024)} MB
            </p>
          </>
        )}
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="hidden"
      />

      {displayError && (
        <p className="mt-2 text-sm text-red-400">{displayError}</p>
      )}
    </div>
  );
}
