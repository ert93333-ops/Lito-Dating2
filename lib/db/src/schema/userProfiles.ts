import {
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  nickname: varchar("nickname", { length: 50 }).notNull().default(""),
  age: integer("age").notNull().default(25),
  bio: text("bio").notNull().default(""),
  intro: text("intro").notNull().default(""),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  photos: jsonb("photos").$type<string[]>().notNull().default([]),
  instagramHandle: varchar("instagram_handle", { length: 100 }).notNull().default(""),
  languageLevel: varchar("language_level", { length: 20 }).notNull().default("beginner"),
  /** 성별: 'male' | 'female' | 'other' | null (선택 사항) */
  gender: varchar("gender", { length: 10 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  updatedAt: true,
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
