import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiPost, apiPatch } from "@/lib/api";
import { isNative } from "@/lib/capacitor";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface PresignedUrlResponse {
  uploadUrl: string;
  publicUrl: string;
}

export default function ProfilePictureUpload() {
  const { user } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    setError("");

    if (file.size > MAX_FILE_SIZE) {
      setError("File size must be less than 5MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setIsUploading(true);

    try {
      // Get presigned upload URL
      const { uploadUrl, publicUrl } = await apiPost<PresignedUrlResponse>(
        "/api/user/profile/avatar/upload-url",
        {
          contentType: file.type,
          fileName: file.name,
        },
      );

      // Upload file to R2
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      // Update profile with new image URL
      await apiPatch("/api/user/profile", { image: publicUrl });

      // Force page reload to show new avatar
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to upload image.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleClick = async () => {
    if (isNative) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import(
          "@capacitor/camera"
        );
        const photo = await Camera.getPhoto({
          quality: 80,
          allowEditing: true,
          resultType: CameraResultType.Uri,
          source: CameraSource.Prompt,
          width: 512,
          height: 512,
        });

        if (photo.webPath) {
          const response = await fetch(photo.webPath);
          const blob = await response.blob();
          const file = new File([blob], "avatar.jpg", {
            type: `image/${photo.format}`,
          });
          await handleFileSelect(file);
        }
      } catch {
        // User cancelled
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const avatarUrl = user?.image;
  const initials = user?.name?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        onClick={handleClick}
        disabled={isUploading}
        className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-keel-gray-800 transition-colors hover:border-keel-blue disabled:opacity-50"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={user?.name || "Avatar"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-keel-blue/20 text-2xl font-semibold text-keel-blue">
            {initials}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          {isUploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          )}
        </div>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleInputChange}
        className="hidden"
      />

      <p className="text-xs text-keel-gray-400">
        {isUploading ? "Uploading..." : "Click to change"}
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
