import {
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notificationEvents = pgTable(
  "notification_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 60 }).notNull(),
    actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    conversationId: varchar("conversation_id", { length: 100 }),
    payloadJson: jsonb("payload_json").notNull().default({}),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("idx_ne_user_id").on(t.userId),
    index("idx_ne_type").on(t.type),
    index("idx_ne_dedupe_key").on(t.dedupeKey),
  ]
);

export type NotificationEvent = typeof notificationEvents.$inferSelect;
