/**
 * S3-compatible file storage service.
 *
 * Works with Cloudflare R2, AWS S3, MinIO, and any other S3-compatible
 * provider. Configured entirely via environment variables.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../env.js";

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

const s3Client = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  // Required for some S3-compatible providers (R2, MinIO)
  forcePathStyle: true,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UPLOAD_URL_EXPIRY = 60 * 10; // 10 minutes
const DOWNLOAD_URL_EXPIRY = 60 * 60; // 1 hour

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sanitise a file name for use as an S3 key segment.
 * Removes path separators and other problematic characters.
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a presigned PUT URL for uploading a file.
 *
 * @returns The presigned upload URL and the object key that will be stored.
 */
export async function generateUploadUrl(
  userId: string,
  fileName: string,
  contentType: string,
  maxSizeBytes?: number,
): Promise<{ uploadUrl: string; key: string }> {
  const sanitized = sanitizeFileName(fileName);
  const key = `${userId}/${Date.now()}-${sanitized}`;

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
    ...(maxSizeBytes ? { ContentLength: maxSizeBytes } : {}),
  });

  const uploadUrl = await getSignedUrl(s3Client, command, {
    expiresIn: UPLOAD_URL_EXPIRY,
  });

  return { uploadUrl, key };
}

/**
 * Generate a presigned GET URL for downloading / viewing a file.
 */
export async function generateDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: DOWNLOAD_URL_EXPIRY,
  });
}

/**
 * Delete an object from the bucket.
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * List objects under a prefix (e.g., a user's directory).
 */
export async function listFiles(
  prefix: string,
): Promise<{ key: string; size: number; lastModified: Date | undefined }[]> {
  const command = new ListObjectsV2Command({
    Bucket: env.S3_BUCKET_NAME,
    Prefix: prefix,
  });

  const response = await s3Client.send(command);

  return (response.Contents ?? []).map((obj) => ({
    key: obj.Key!,
    size: obj.Size ?? 0,
    lastModified: obj.LastModified,
  }));
}
