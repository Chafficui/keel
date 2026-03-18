import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

export const deletionRequests = pgTable("deletion_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reason: text("reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  scheduledDeletionAt: timestamp("scheduled_deletion_at").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  completedAt: timestamp("completed_at"),
});
