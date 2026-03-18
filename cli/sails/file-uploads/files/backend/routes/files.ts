/**
 * File management API routes.
 *
 * All routes require authentication. Files are scoped per user.
 *
 * Endpoints:
 *   POST   /upload-url   -- generate a presigned upload URL
 *   GET    /             -- list the current user's files
 *   GET    /:fileId      -- get file metadata + download URL
 *   DELETE /:fileId      -- delete a file
 */

import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { files } from "../db/schema/files.js";
import { requireAuth } from "../middleware/auth.js";
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile as deleteFromStorage,
} from "../services/file-storage.js";

export const filesRouter = Router();

// All file routes require authentication.
filesRouter.use(requireAuth);

// ---------------------------------------------------------------------------
// POST /upload-url -- generate presigned upload URL
// ---------------------------------------------------------------------------

filesRouter.post("/upload-url", async (req: Request, res: Response) => {
  try {
    const { fileName, contentType, maxSize } = req.body as {
      fileName?: string;
      contentType?: string;
      maxSize?: number;
    };

    if (!fileName || typeof fileName !== "string") {
      res.status(400).json({ error: "fileName is required" });
      return;
    }

    if (!contentType || typeof contentType !== "string") {
      res.status(400).json({ error: "contentType is required" });
      return;
    }

    const userId = req.user!.id;
    const { uploadUrl, key } = await generateUploadUrl(
      userId,
      fileName,
      contentType,
      maxSize,
    );

    // Create a file record in the database so we can track it.
    const [fileRecord] = await db
      .insert(files)
      .values({
        id: crypto.randomUUID(),
        userId,
        key,
        fileName,
        contentType,
        sizeBytes: maxSize ?? null,
      })
      .returning();

    res.json({
      uploadUrl,
      file: {
        id: fileRecord.id,
        key: fileRecord.key,
        fileName: fileRecord.fileName,
      },
    });
  } catch (error) {
    console.error("Error generating upload URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

// ---------------------------------------------------------------------------
// GET / -- list user's files
// ---------------------------------------------------------------------------

filesRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const prefix = req.query.prefix as string | undefined;

    let query = db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .$dynamic();

    if (prefix) {
      query = query.where(
        and(eq(files.userId, userId)),
      );
    }

    const userFiles = await db
      .select()
      .from(files)
      .where(eq(files.userId, userId))
      .orderBy(files.createdAt);

    res.json({
      files: userFiles.map((f) => ({
        id: f.id,
        fileName: f.fileName,
        contentType: f.contentType,
        sizeBytes: f.sizeBytes,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error listing files:", error);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// ---------------------------------------------------------------------------
// GET /:fileId -- get file metadata + download URL
// ---------------------------------------------------------------------------

filesRouter.get("/:fileId", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fileId } = req.params;

    const file = await db.query.files.findFirst({
      where: and(eq(files.id, fileId), eq(files.userId, userId)),
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const downloadUrl = await generateDownloadUrl(file.key);

    res.json({
      file: {
        id: file.id,
        fileName: file.fileName,
        contentType: file.contentType,
        sizeBytes: file.sizeBytes,
        createdAt: file.createdAt,
        downloadUrl,
      },
    });
  } catch (error) {
    console.error("Error getting file:", error);
    res.status(500).json({ error: "Failed to get file" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:fileId -- delete a file
// ---------------------------------------------------------------------------

filesRouter.delete("/:fileId", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { fileId } = req.params;

    const file = await db.query.files.findFirst({
      where: and(eq(files.id, fileId), eq(files.userId, userId)),
    });

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Delete from S3-compatible storage.
    try {
      await deleteFromStorage(file.key);
    } catch (err) {
      console.error("Warning: failed to delete file from storage:", err);
      // Continue with DB deletion even if storage deletion fails.
    }

    // Delete from database.
    await db.delete(files).where(eq(files.id, fileId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});
