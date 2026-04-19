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

/**
 * Per-user notification preferences.
 *
 * MVP categories:
 *   messages          — new messages in conversations (default: on)
 *   matches_likes     — new matches + likes received (default: on)
 *   safety_security   — risk alerts, account warnings (always on, cannot be disabled)
 *   account_updates   — profile approvals, verifications, subscription events (default: on)
 *
 * previewMode:
 *   "none"      — no content preview in push title/body
 *   "name_only" — sender name in title, generic body
 *   "full"      — full title and body content
 *
 * quietHoursStart / quietHoursEnd: 0–23 hour values in the user's local timezone.
 * Non-transactional pushes are suppressed during quiet hours.
 * Transactional = messages, matches, safety (always delivered).
 */
export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    messagesEnabled: boolean("messages_enabled").notNull().default(true),
    matchesLikesEnabled: boolean("matches_likes_enabled").notNull().default(true),
    safetySecurityEnabled: boolean("safety_security_enabled").notNull().default(true),
    accountUpdatesEnabled: boolean("account_updates_enabled").notNull().default(true),

    previewMode: varchar("preview_mode", { length: 20 }).notNull().default("none"),
    quietHoursStart: integer("quiet_hours_start").notNull().default(22),
    quietHoursEnd: integer("quiet_hours_end").notNull().default(8),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("idx_np_user_id").on(t.userId)]
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
