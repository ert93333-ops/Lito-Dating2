/**
 * modules/chat/chat.router.ts
 *
 * HTTP transport layer for chat messages.
 * Validates requests, delegates to chatService, returns responses.
 * No business logic here — routing + I/O only.
 */

import { Router } from "express";
import { requireAuth, optionalAuth } from "../../middleware/auth.js";
import { chatService } from "./chat.service.js";

const router = Router();

/**
 * GET /api/chat/:conversationId/messages
 * Returns the last 100 messages for a conversation.
 */
router.get("/chat/:conversationId/messages", optionalAuth, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const messages = await chatService.getMessages(conversationId);
    res.json({ messages });
  } catch (err) {
    console.error("[chat] getMessages error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

/**
 * POST /api/chat/:conversationId/messages
 * Persists a new message. Auth required.
 */
router.post("/chat/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const { senderId, content, translatedContent, originalLanguage } = req.body;
    const userId = req.user!.userId;

    if (!content?.trim()) {
      res.status(400).json({ error: "메시지 내용이 없습니다." });
      return;
    }

    const message = await chatService.sendMessage({
      conversationId,
      senderUserId: userId,
      senderId: senderId ?? String(userId),
      content,
      translatedContent,
      originalLanguage,
    });

    res.status(201).json({ message });
  } catch (err) {
    if (err instanceof Error && err.message === "EMPTY_CONTENT") {
      res.status(400).json({ error: "메시지 내용이 없습니다." });
      return;
    }
    console.error("[chat] sendMessage error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

/**
 * DELETE /api/chat/:conversationId/messages
 * Deletes all messages from the authenticated user in a conversation.
 */
router.delete("/chat/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);
    const userId = req.user!.userId;
    await chatService.deleteUserMessages(conversationId, userId);
    res.json({ ok: true });
  } catch (err) {
    console.error("[chat] deleteMessages error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default router;
