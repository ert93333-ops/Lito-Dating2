import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    messagesEnabled: boolean("messages_enabled").notNull().default(true),
    matchesEnabled: boolean("matches_enabled").notNull().default(true),
    safetyEnabled: boolean("safety_enabled").notNull().default(true),
    aiEnabled: boolean("ai_enabled").notNull().default(false),
    promotionsEnabled: boolean("promotions_enabled").notNull().default(false),
    previewMode: varchar("preview_mode", { length: 20 }).notNull().default("none"),
    quietHoursStart: integer("quiet_hours_start").notNull().default(22),
    quietHoursEnd: integer("quiet_hours_end").notNull().default(8),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_np_user_id").on(t.userId)]
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
