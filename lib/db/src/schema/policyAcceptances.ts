import { pgTable, serial, integer, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const policyAcceptances = pgTable("policy_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  policyType: varchar("policy_type", { length: 64 }).notNull(),
  policyVersion: varchar("policy_version", { length: 32 }).notNull(),
  accepted: boolean("accepted").notNull().default(true),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
  ipAddress: varchar("ip_address", { length: 64 }),
  userAgent: varchar("user_agent", { length: 512 }),
});
