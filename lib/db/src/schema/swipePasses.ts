import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const swipePasses = pgTable(
  "swipe_passes",
  {
    id: serial("id").primaryKey(),
    fromUserId: integer("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: integer("to_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("uniq_pass").on(t.fromUserId, t.toUserId)]
);

export const insertSwipePassSchema = createInsertSchema(swipePasses).omit({
  id: true,
  createdAt: true,
});

export type SwipePass = typeof swipePasses.$inferSelect;
export type InsertSwipePass = z.infer<typeof insertSwipePassSchema>;
