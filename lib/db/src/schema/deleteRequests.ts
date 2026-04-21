import { pgTable, serial, integer, varchar, timestamp, text } from "drizzle-orm/pg-core";
import { users } from "./users";

export const deleteRequests = pgTable("delete_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  hiddenAt: timestamp("hidden_at"),
  webHandoffAt: timestamp("web_handoff_at"),
  completedAt: timestamp("completed_at"),
  reason: varchar("reason", { length: 128 }),
  notes: text("notes"),
});

export const deleteJobs = pgTable("delete_jobs", {
  id: serial("id").primaryKey(),
  deleteRequestId: integer("delete_request_id").notNull().references(() => deleteRequests.id),
  jobType: varchar("job_type", { length: 64 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const deleteEvents = pgTable("delete_events", {
  id: serial("id").primaryKey(),
  deleteRequestId: integer("delete_request_id").notNull().references(() => deleteRequests.id),
  eventType: varchar("event_type", { length: 64 }).notNull(),
  occurredAt: timestamp("occurred_at").defaultNow().notNull(),
  metadata: text("metadata"),
});
