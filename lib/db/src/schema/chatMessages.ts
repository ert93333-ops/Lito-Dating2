import { integer, pgTable, serial, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

import { users } from "./users";

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  conversationId: varchar("conversation_id", { length: 100 }).notNull(),
  senderUserId: integer("sender_user_id").references(() => users.id, { onDelete: "set null" }),
  senderId: varchar("sender_id", { length: 100 }).notNull(),
  content: text("content").notNull(),
  translatedContent: text("translated_content"),
  originalLanguage: varchar("original_language", { length: 5 }),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
