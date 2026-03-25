import { pgTable, text, boolean, varchar, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./auth.js";

export const consentRecords = pgTable("consent_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentType: varchar("consent_type", { length: 50 }).notNull(),
  granted: boolean("granted").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
}, (table) => [
  index("consent_records_user_id_idx").on(table.userId),
]);
