# File Uploads Sail

Generic file upload system with S3-compatible storage. Works with Cloudflare R2, AWS S3, MinIO, and any other S3-compatible provider.

## What this sail adds

### Backend
- **`src/services/file-storage.ts`** -- S3 client with helpers for presigned URLs, deletion, and listing
- **`src/routes/files.ts`** -- File management API (all auth-protected):
  - `POST /api/files/upload-url` -- generate a presigned upload URL
  - `GET /api/files` -- list the current user's files
  - `GET /api/files/:fileId` -- get file metadata and download URL
  - `DELETE /api/files/:fileId` -- delete a file
- **`src/db/schema/files.ts`** -- Drizzle schema for the `files` table

### Frontend
- **`src/hooks/useFileUpload.ts`** -- React hook for uploading files with progress tracking
- **`src/hooks/useFiles.ts`** -- React hook for listing, downloading, and deleting files
- **`src/components/files/FileUploadButton.tsx`** -- Upload button with drag-and-drop support
- **`src/components/files/FileList.tsx`** -- File browser with download and delete actions
- **`src/pages/Files.tsx`** -- Full files page combining upload and browser

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | (required) |
| `S3_ACCESS_KEY_ID` | S3 access key ID | (required) |
| `S3_SECRET_ACCESS_KEY` | S3 secret access key | (required) |
| `S3_BUCKET_NAME` | Bucket name | (required) |
| `S3_PUBLIC_URL` | Public URL for serving files | `""` |
| `S3_REGION` | S3 region | `auto` |

## Prerequisites

1. An S3-compatible storage account (Cloudflare R2, AWS S3, MinIO, etc.)
2. A bucket created in your storage provider
3. API credentials with read/write permissions

## Setup

### Run the installer

```bash
npx tsx cli/sails/file-uploads/install.ts
```

Or use the CLI:

```bash
npx keel sail add file-uploads
```

The installer will guide you through:
1. Choosing your storage provider
2. Entering credentials
3. Configuring max file size
4. Copying files and modifying markers
5. Installing dependencies and generating migrations

### After installation

1. Run database migrations:
   ```bash
   npm run db:migrate
   ```

2. Configure CORS on your storage bucket (see below)

3. Start the dev server:
   ```bash
   npm run dev
   ```

4. Navigate to `/files` to test

## Upload flow

1. The frontend calls `POST /api/files/upload-url` with the file name and content type
2. The backend generates a presigned PUT URL and creates a file record in the database
3. The frontend uploads the file directly to storage using the presigned URL
4. The file is now tracked in the database and available for listing, downloading, and deletion

Files never pass through your server -- they go directly from the browser to storage.

## CORS configuration

Your storage bucket must allow PUT and GET requests from your frontend origin.

### Cloudflare R2

In your bucket settings, add a CORS policy:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["Content-Type"],
    "MaxAgeSeconds": 3600
  }
]
```

### AWS S3

In bucket permissions, add a CORS configuration:

```json
[
  {
    "AllowedHeaders": ["Content-Type"],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],
    "MaxAgeSeconds": 3600
  }
]
```

### MinIO

```bash
mc admin config set local api cors_allow_origin=http://localhost:5173
mc admin service restart local
```

## Usage in your own components

### Upload a file

```tsx
import { useFileUpload } from "@/hooks/useFileUpload";

function MyComponent() {
  const { upload, isUploading, progress, error } = useFileUpload();

  const handleUpload = async (file: File) => {
    const result = await upload(file);
    if (result) {
      console.log("Uploaded:", result.id, result.fileName);
    }
  };
}
```

### List and manage files

```tsx
import { useFiles } from "@/hooks/useFiles";

function MyComponent() {
  const { files, isLoading, deleteFile, getDownloadUrl, refresh } = useFiles();

  const handleDownload = async (id: string) => {
    const url = await getDownloadUrl(id);
    if (url) window.open(url);
  };
}
```

### Custom upload button

```tsx
import { FileUploadButton } from "@/components/files/FileUploadButton";

<FileUploadButton
  accept="image/*,.pdf"
  maxSize={10 * 1024 * 1024} // 10 MB
  onUploadComplete={(file) => console.log("Uploaded:", file)}
/>
```

## Difference from the r2-storage sail

The **r2-storage** sail is focused specifically on Cloudflare R2 and profile picture uploads. This **file-uploads** sail is a more general-purpose system:

- Works with any S3-compatible provider (R2, S3, MinIO)
- Supports any file type, not just images
- Tracks files in a database table
- Includes a full file browser UI
- Supports listing, downloading, and deleting files

If you only need profile picture uploads with R2, use the r2-storage sail instead.

## Troubleshooting

- **CORS errors**: Make sure your bucket CORS policy includes your frontend origin and allows PUT/GET methods
- **403 Forbidden**: Verify your API credentials have the correct permissions
- **Upload succeeds but file not in list**: Check the server logs for database insert errors
- **Presigned URL expired**: URLs expire after 10 minutes -- upload should happen immediately
- **Large files timing out**: Increase the presigned URL expiry in `file-storage.ts` or your reverse proxy timeout
