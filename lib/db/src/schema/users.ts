import { pgTable, serial, text, timestamp, varchar, index, boolean } from "drizzle-orm/pg-core";
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
    /** 18+ age gate 통과 여부 — users 최상위 필드 (비협상). */
    ageGatePassed: boolean("age_gate_passed").notNull().default(false),
    /** 계정 가시성 상태. visible=정상, hidden=삭제 요청/처리 중, banned=제재 */
    visibilityStatus: varchar("visibility_status", { length: 32 }).notNull().default("visible"),
    /** 계정 삭제 요청 시작 시각 — 즉시 비노출 기준 */
    deletionRequestedAt: timestamp("deletion_requested_at", { withTimezone: true }),
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
