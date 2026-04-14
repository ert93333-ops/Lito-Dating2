import { integer, pgTable, serial, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const swipeLikes = pgTable(
  "swipe_likes",
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
  (t) => [unique("uniq_like").on(t.fromUserId, t.toUserId)]
);

export const insertSwipeLikeSchema = createInsertSchema(swipeLikes).omit({
  id: true,
  createdAt: true,
});

export type SwipeLike = typeof swipeLikes.$inferSelect;
export type InsertSwipeLike = z.infer<typeof insertSwipeLikeSchema>;
