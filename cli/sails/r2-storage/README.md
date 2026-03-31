# Cloudflare R2 Storage Sail

File uploads via Cloudflare R2 with presigned URLs. Adds profile picture upload support.

## What this sail adds

### Backend
- **`src/services/storage.ts`** — S3-compatible client for Cloudflare R2 with helpers for generating presigned upload/download URLs and deleting objects.
- **Avatar endpoints on `src/routes/profile.ts`**:
  - `POST /avatar/upload-url` — generates a presigned upload URL for direct browser-to-R2 uploads
  - `DELETE /avatar` — deletes the current user's avatar from R2 and clears the image field

### Frontend
- **`src/components/profile/ProfilePictureUpload.tsx`** — a drop-in avatar upload component with:
  - Click-to-upload with file picker
  - Native camera support via Capacitor on mobile
  - 5 MB file size limit and image type validation
  - Loading state and error handling

### Environment variables
| Variable | Description |
|----------|-------------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | R2 API token access key ID |
| `R2_SECRET_ACCESS_KEY` | R2 API token secret access key |
| `R2_BUCKET_NAME` | Name of your R2 bucket (e.g., `avatars`) |
| `R2_PUBLIC_URL` | Public URL for serving uploaded files |

## Prerequisites

1. A Cloudflare account
2. An R2 bucket created in the Cloudflare dashboard
3. An R2 API token with **Object Read & Write** permissions

## Setup

### 1. Create an R2 bucket

1. Go to [Cloudflare Dashboard > R2](https://dash.cloudflare.com/?to=/:account/r2/new)
2. Click **Create bucket**
3. Choose a name (e.g., `avatars`) and location
4. Click **Create bucket**

### 2. Create an API token

1. Go to **R2 > Overview > Manage R2 API Tokens**
2. Click **Create API token**
3. Select **Object Read & Write** permissions
4. Scope it to your bucket
5. Copy the **Access Key ID** and **Secret Access Key**

### 3. Enable public access (optional)

If you want files to be publicly accessible via URL:

1. Go to your bucket **Settings > Public Access**
2. Enable the R2.dev subdomain or configure a custom domain
3. Use that URL as your `R2_PUBLIC_URL`

### 4. Configure CORS

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

### 5. Run the installer

```bash
npx tsx cli/sails/r2-storage/install.ts
```

Or use the CLI:

```bash
npx @codaijs/keel sail add r2-storage
```

## Upload flow

1. Frontend requests a presigned upload URL from `POST /api/profile/avatar/upload-url`
2. Backend generates a presigned PUT URL using the S3-compatible R2 API
3. Frontend uploads the file directly to R2 using the presigned URL
4. Frontend updates the user profile with the new image URL via `PATCH /api/profile`

This approach keeps large file uploads off your server — files go directly from the browser to R2.

## Troubleshooting

- **CORS errors**: Make sure your R2 bucket CORS policy includes your frontend origin
- **403 Forbidden**: Verify your API token has the correct permissions and is scoped to the right bucket
- **Upload succeeds but image does not display**: Check that `R2_PUBLIC_URL` is correct and public access is enabled
- **Presigned URL expired**: The default expiry is 10 minutes — upload should happen immediately after requesting the URL
