import {
  index,
  pgTable,
  serial,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const deviceTokens = pgTable(
  "device_tokens",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    platform: varchar("platform", { length: 10 }).notNull(),
    pushToken: varchar("push_token", { length: 512 }).notNull(),
    appVersion: varchar("app_version", { length: 20 }),
    locale: varchar("locale", { length: 10 }),
    timezone: varchar("timezone", { length: 64 }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow(),
    status: varchar("status", { length: 20 }).notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_dt_user_id").on(t.userId),
    index("idx_dt_push_token").on(t.pushToken),
  ]
);

export type DeviceToken = typeof deviceTokens.$inferSelect;
