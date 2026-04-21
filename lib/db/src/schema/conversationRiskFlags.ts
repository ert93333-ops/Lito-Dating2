import { pgTable, serial, integer, varchar, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { matchesTable } from "./matches";
import { users } from "./users";

export const conversationRiskFlags = pgTable("conversation_risk_flags", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matchesTable.id, { onDelete: "cascade" }),
  flaggedByUserId: integer("flagged_by_user_id").references(() => users.id),
  riskClass: varchar("risk_class", { length: 64 }).notNull(),
  severity: varchar("severity", { length: 16 }).notNull().default("normal"),
  active: boolean("active").notNull().default(true),
  detectedAt: timestamp("detected_at", { withTimezone: true }).defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  notes: text("notes"),
});

export type ConversationRiskFlag = typeof conversationRiskFlags.$inferSelect;
