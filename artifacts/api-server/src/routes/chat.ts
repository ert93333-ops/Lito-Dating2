import { Router } from "express";
import { and, asc, eq } from "drizzle-orm";
import { db, chatMessages } from "@workspace/db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

// GET /api/chat/:conversationId/messages
// 특정 대화의 메시지 목록을 가져옵니다 (최신 100건)
router.get("/chat/:conversationId/messages", optionalAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const msgs = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.conversationId, conversationId))
      .orderBy(asc(chatMessages.createdAt))
      .limit(100);

    res.json({ messages: msgs });
  } catch (err) {
    console.error("get chat messages error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// POST /api/chat/:conversationId/messages
// 새 메시지를 저장합니다
router.post("/chat/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { senderId, content, translatedContent, originalLanguage } = req.body;
    const userId = req.user!.userId;

    if (!content?.trim()) {
      res.status(400).json({ error: "메시지 내용이 없습니다." });
      return;
    }

    const [msg] = await db
      .insert(chatMessages)
      .values({
        conversationId,
        senderUserId: userId,
        senderId: senderId ?? String(userId),
        content: content.trim(),
        translatedContent: translatedContent ?? null,
        originalLanguage: originalLanguage ?? null,
      })
      .returning();

    res.status(201).json({ message: msg });
  } catch (err) {
    console.error("send chat message error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// DELETE /api/chat/:conversationId/messages
// 대화의 모든 메시지를 삭제합니다 (회원 탈퇴 등)
router.delete("/chat/:conversationId/messages", requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.userId;

    await db
      .delete(chatMessages)
      .where(
        and(
          eq(chatMessages.conversationId, conversationId),
          eq(chatMessages.senderUserId, userId)
        )
      );

    res.json({ ok: true });
  } catch (err) {
    console.error("delete chat messages error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

export default router;
