import { Router, type Request, type Response } from "express";
import { eq, like, or, sql, desc, count } from "drizzle-orm";
import { db } from "../db/index.js";
import { users, sessions } from "../db/schema/index.js";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

// All routes require authentication + admin privileges
router.use(requireAuth);
router.use(requireAdmin);

// ---------------------------------------------------------------------------
// GET /users — list all users (paginated, searchable)
// ---------------------------------------------------------------------------

router.get("/users", async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = (req.query.search as string) || "";
    const offset = (page - 1) * limit;

    const whereClause = search
      ? or(
          like(users.email, `%${search}%`),
          like(users.name, `%${search}%`),
        )
      : undefined;

    const [userRows, totalResult] = await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          emailVerified: users.emailVerified,
          image: users.image,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(whereClause)
        .orderBy(desc(users.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: count() })
        .from(users)
        .where(whereClause),
    ]);

    const total = totalResult[0]?.count ?? 0;

    res.json({
      users: userRows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error listing users:", error);
    res.status(500).json({ error: "Failed to list users" });
  }
});

// ---------------------------------------------------------------------------
// GET /users/:id — get user details
// ---------------------------------------------------------------------------

router.get("/users/:id", async (req: Request, res: Response) => {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Count active sessions for this user
    const sessionResult = await db
      .select({ count: count() })
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      activeSessions: sessionResult[0]?.count ?? 0,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ---------------------------------------------------------------------------
// PATCH /users/:id — update user (name, emailVerified, etc.)
// ---------------------------------------------------------------------------

router.patch("/users/:id", async (req: Request, res: Response) => {
  try {
    const { name, emailVerified } = req.body as {
      name?: string;
      emailVerified?: boolean;
    };

    const existing = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
    });

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const updates: Record<string, unknown> = {};
    if (typeof name === "string") updates.name = name;
    if (typeof emailVerified === "boolean") updates.emailVerified = emailVerified;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    updates.updatedAt = new Date();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.params.id))
      .returning();

    res.json({ user: updated });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

// ---------------------------------------------------------------------------
// DELETE /users/:id — delete a user
// ---------------------------------------------------------------------------

router.delete("/users/:id", async (req: Request, res: Response) => {
  try {
    // Prevent self-deletion
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: "Cannot delete your own account from admin panel" });
      return;
    }

    const existing = await db.query.users.findFirst({
      where: eq(users.id, req.params.id),
    });

    if (!existing) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    await db.delete(users).where(eq(users.id, req.params.id));

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------------------------------------------------------------------------
// GET /stats — dashboard statistics
// ---------------------------------------------------------------------------

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsersResult,
      newUsersWeekResult,
      newUsersMonthResult,
      activeSessionsResult,
      signupsByDayResult,
    ] = await Promise.all([
      db.select({ count: count() }).from(users),
      db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${sevenDaysAgo}`),
      db
        .select({ count: count() })
        .from(users)
        .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`),
      db
        .select({ count: count() })
        .from(sessions)
        .where(sql`${sessions.expiresAt} > ${now}`),
      db
        .select({
          date: sql<string>`DATE(${users.createdAt})`.as("date"),
          count: count(),
        })
        .from(users)
        .where(sql`${users.createdAt} >= ${thirtyDaysAgo}`)
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`),
    ]);

    res.json({
      totalUsers: totalUsersResult[0]?.count ?? 0,
      newUsersWeek: newUsersWeekResult[0]?.count ?? 0,
      newUsersMonth: newUsersMonthResult[0]?.count ?? 0,
      activeSessions: activeSessionsResult[0]?.count ?? 0,
      signupsByDay: signupsByDayResult,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
