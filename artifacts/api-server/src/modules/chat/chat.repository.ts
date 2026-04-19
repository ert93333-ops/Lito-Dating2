/**
 * modules/chat/chat.repository.ts
 *
 * Data access layer for chat messages.
 * All Drizzle queries for chatMessages live here.
 * No business logic — only DB I/O.
 */

import { and, asc, eq } from "drizzle-orm";
import { db, chatMessages } from "@workspace/db";

export type NewMessage = {
  conversationId: string;
  senderUserId: number | null;
  senderId: string;
  content: string;
  translatedContent?: string | null;
  originalLanguage?: string | null;
};

export const chatRepository = {
  /** Fetch last 100 messages in a conversation, oldest first. */
  async getMessages(conversationId: string) {
    return db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(100);
  },

  /** Insert a new message and return the saved row. */
  async insertMessage(data: NewMessage) {
    const [msg] = await db
      .insert(chatMessages)
      .values({
        conversationId: data.conversationId,
        senderUserId: data.senderUserId,
        senderId: data.senderId,
        content: data.content,
        translatedContent: data.translatedContent ?? null,
        originalLanguage: data.originalLanguage ?? null,
      })
      .returning();
    return msg;
  },

  /** Delete all messages sent by a specific user in a conversation. */
  async deleteUserMessages(conversationId: string, userId: number) {
    await db
      .delete(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.senderUserId, userId)
        )
      );
  },
};
