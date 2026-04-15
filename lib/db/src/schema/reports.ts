import {
  boolean,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { users } from "./users";

export const userReports = pgTable("user_reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  reportedUserId: integer("reported_user_id").notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  details: text("details"),
  referenceId: varchar("reference_id", { length: 20 }).notNull(),
  resolved: boolean("resolved").notNull().default(false),
  resolvedBy: integer("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const userBlocks = pgTable("user_blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedUserId: integer("blocked_user_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserReportSchema = createInsertSchema(userReports).omit({
  id: true,
  resolved: true,
  resolvedBy: true,
  resolvedAt: true,
  resolutionNote: true,
  createdAt: true,
});

export type UserReport = typeof userReports.$inferSelect;
export type InsertUserReport = z.infer<typeof insertUserReportSchema>;
export type UserBlock = typeof userBlocks.$inferSelect;
