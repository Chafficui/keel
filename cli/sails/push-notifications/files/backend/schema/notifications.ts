import { pgTable, text, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

/**
 * Push notification device tokens table.
 *
 * Stores FCM device tokens for each user. A user can have multiple tokens
 * (one per device). Tokens are registered when the user grants push permission
 * on a native device and removed on logout or token invalidation.
 */
export const pushTokens = pgTable("push_tokens", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: varchar("platform", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, {
    fields: [pushTokens.userId],
    references: [users.id],
  }),
}));
