import { pgTable, serial, integer, varchar, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { directMessages } from "./directMessages";

export const messageTranslations = pgTable("message_translations", {
  id: serial("id").primaryKey(),
  directMessageId: integer("direct_message_id").notNull().references(() => directMessages.id, { onDelete: "cascade" }),
  sourceLanguage: varchar("source_language", { length: 8 }).notNull(),
  targetLanguage: varchar("target_language", { length: 8 }).notNull(),
  translatedText: text("translated_text"),
  confidenceLevel: varchar("confidence_level", { length: 16 }),
  notes: text("notes"),
  fallbackUsed: boolean("fallback_used").notNull().default(false),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type MessageTranslation = typeof messageTranslations.$inferSelect;
