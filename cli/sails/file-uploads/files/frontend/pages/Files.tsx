import { useCallback } from "react";
import { FileUploadButton } from "@/components/files/FileUploadButton";
import { FileList } from "@/components/files/FileList";
import { useFiles } from "@/hooks/useFiles";

/**
 * Files page.
 *
 * Combines the file upload button and file browser into a single page.
 */
export function FilesPage() {
  const { refresh } = useFiles();

  const handleUploadComplete = useCallback(() => {
    // Refresh the file list after a successful upload.
    refresh();
  }, [refresh]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Files</h1>
        <p className="mt-1 text-sm text-keel-gray-400">
          Upload, manage, and download your files.
        </p>
      </div>

      {/* Upload zone */}
      <div className="mb-8">
        <FileUploadButton onUploadComplete={handleUploadComplete} />
      </div>

      {/* File browser */}
      <FileList />
    </div>
  );
}
