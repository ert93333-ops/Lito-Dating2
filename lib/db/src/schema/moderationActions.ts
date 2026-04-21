import { pgTable, serial, integer, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const moderationActions = pgTable("moderation_actions", {
  id: serial("id").primaryKey(),
  targetUserId: integer("target_user_id").notNull().references(() => users.id),
  moderatorUserId: integer("moderator_user_id"),
  actionType: varchar("action_type", { length: 64 }).notNull(),
  reason: varchar("reason", { length: 256 }),
  notes: text("notes"),
  expiresAt: timestamp("expires_at"),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reversedAt: timestamp("reversed_at"),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id"),
  action: varchar("action", { length: 128 }).notNull(),
  targetType: varchar("target_type", { length: 64 }),
  targetId: varchar("target_id", { length: 128 }),
  ipAddress: varchar("ip_address", { length: 64 }),
  notes: text("notes"),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
});
