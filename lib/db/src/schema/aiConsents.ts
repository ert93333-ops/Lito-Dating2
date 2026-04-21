import { pgTable, serial, integer, varchar, timestamp, boolean } from "drizzle-orm/pg-core";
import { users } from "./users";

export const aiConsents = pgTable("ai_consents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  featureType: varchar("feature_type", { length: 64 }).notNull(),
  granted: boolean("granted").notNull().default(false),
  grantedAt: timestamp("granted_at"),
  revokedAt: timestamp("revoked_at"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
