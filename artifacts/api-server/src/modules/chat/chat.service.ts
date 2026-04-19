/**
 * modules/chat/chat.service.ts
 *
 * Business logic for chat messages.
 * Orchestrates chatRepository — no direct DB imports here.
 */

import { chatRepository, type NewMessage } from "./chat.repository.js";

export const chatService = {
  /** Return the last 100 messages for a conversation. */
  async getMessages(conversationId: string) {
    return chatRepository.getMessages(conversationId);
  },

  /** Validate and persist a new message. Returns the saved row. */
  async sendMessage(params: {
    conversationId: string;
    senderUserId: number | null;
    senderId: string;
    content: string;
    translatedContent?: string | null;
    originalLanguage?: string | null;
  }) {
    const trimmed = params.content.trim();
    if (!trimmed) throw new Error("EMPTY_CONTENT");

    const data: NewMessage = {
      conversationId: params.conversationId,
      senderUserId: params.senderUserId,
      senderId: params.senderId,
      content: trimmed,
      translatedContent: params.translatedContent ?? null,
      originalLanguage: params.originalLanguage ?? null,
    };

    return chatRepository.insertMessage(data);
  },

  /** Remove all messages sent by a user in a conversation (e.g. account deletion). */
  async deleteUserMessages(conversationId: string, userId: number) {
    await chatRepository.deleteUserMessages(conversationId, userId);
  },
};
