import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const inAppNotifications = pgTable(
  "in_app_notifications",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 40 }).notNull(),
    titleKo: varchar("title_ko", { length: 200 }).notNull(),
    titleJa: varchar("title_ja", { length: 200 }).notNull(),
    bodyKo: varchar("body_ko", { length: 500 }).notNull(),
    bodyJa: varchar("body_ja", { length: 500 }).notNull(),
    payload: jsonb("payload").notNull().default({}),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_ian_user_id").on(t.userId),
    index("idx_ian_is_read").on(t.isRead),
  ]
);

export type InAppNotification = typeof inAppNotifications.$inferSelect;
