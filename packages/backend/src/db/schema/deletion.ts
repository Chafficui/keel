import { pgTable, text, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

export const deletionRequests = pgTable(
  "deletion_requests",
  {
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
  },
  (table) => [
    index("deletion_requests_user_id_idx").on(table.userId),
    index("deletion_requests_scheduled_at_idx").on(table.userId, table.scheduledDeletionAt),
    index("deletion_requests_status_scheduled_idx").on(table.status, table.scheduledDeletionAt),
  ],
);
