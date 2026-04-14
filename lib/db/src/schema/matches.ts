import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const matchesTable = pgTable(
  "matches",
  {
    id: serial("id").primaryKey(),
    user1Id: integer("user1_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    user2Id: integer("user2_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("uniq_match").on(t.user1Id, t.user2Id)]
);

export const insertMatchSchema = createInsertSchema(matchesTable).omit({
  id: true,
  createdAt: true,
});

export type Match = typeof matchesTable.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
