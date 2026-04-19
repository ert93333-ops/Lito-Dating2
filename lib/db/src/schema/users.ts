import { pgTable, serial, text, timestamp, varchar, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    country: varchar("country", { length: 2 }).notNull().default("KR"),
    language: varchar("language", { length: 2 }).notNull().default("ko"),
    /** SHA-256 해시 (클라이언트에서 해시된 전화번호). 연락처 차단 매칭에 사용. 원본 번호는 저장 안 함. */
    phoneNumberHash: varchar("phone_number_hash", { length: 64 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("users_phone_number_hash_idx").on(t.phoneNumberHash)]
);

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const selectUserSchema = createSelectSchema(users);

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
