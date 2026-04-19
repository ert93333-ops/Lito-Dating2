import { integer, pgTable, serial, timestamp, varchar, unique } from "drizzle-orm/pg-core";
import { users } from "./users";

/**
 * contact_block_hashes
 *
 * 연락처 차단 해시 저장 테이블.
 * 기기에서 SHA-256으로 해시된 전화번호만 서장하며 원본 번호는 서버에 도달하지 않는다.
 *
 * 용도: 사용자가 기기 연락처를 업로드하면 서버에서 매칭되는 유저를 discover에서 제외한다.
 */
export const contactBlockHashes = pgTable(
  "contact_block_hashes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    phoneHash: varchar("phone_hash", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [unique("contact_block_hashes_user_phone_unique").on(t.userId, t.phoneHash)]
);

export type ContactBlockHash = typeof contactBlockHashes.$inferSelect;
export type InsertContactBlockHash = typeof contactBlockHashes.$inferInsert;
