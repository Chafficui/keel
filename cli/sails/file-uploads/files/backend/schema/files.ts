import {
  pgTable,
  text,
  varchar,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./users.js";

/**
 * Files table.
 *
 * Tracks uploaded files and their S3-compatible storage keys. Each file
 * belongs to a user and is deleted when the user is deleted (cascade).
 */
export const files = pgTable("files", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  fileName: text("file_name").notNull(),
  contentType: varchar("content_type", { length: 100 }),
  sizeBytes: integer("size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));
