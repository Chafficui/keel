import { Router } from "express";
import { eq } from "drizzle-orm";
import { updateProfileSchema } from "@keel/shared";
import { requireAuth } from "../middleware/auth.js";
import { db } from "../db/index.js";
import { users } from "../db/schema/index.js";

const router = Router();

router.use(requireAuth);

// GET / — get current user profile
router.get("/", (req, res) => {
  res.json({ user: req.user });
});

// PATCH / — update profile
router.patch("/", async (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const { name, image } = parsed.data;
  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (name !== undefined) updateData["name"] = name;
  if (image !== undefined) updateData["image"] = image;

  const [updated] = await db
    .update(users)
    .set(updateData)
    .where(eq(users.id, req.user!.id))
    .returning();

  res.json({ user: updated });
});

export default router;
