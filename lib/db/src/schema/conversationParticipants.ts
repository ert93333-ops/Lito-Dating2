import { index, integer, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./users";

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    conversationId: varchar("conversation_id", { length: 100 }).notNull(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    membershipSource: varchar("membership_source", { length: 30 })
      .notNull()
      .default("system"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.conversationId, t.userId] }),
    index("idx_cp_user_conv").on(t.userId, t.conversationId),
  ]
);

export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
