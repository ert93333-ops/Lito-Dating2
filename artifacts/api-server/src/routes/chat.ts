import { Router } from "express";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { db, chatMessages, matchesTable, users, userProfiles } from "@workspace/db";
import { requireAuth, optionalAuth } from "../middleware/auth";

const router = Router();

// ── GET /api/chat/conversations ───────────────────────────────────────────────
// 로그인한 유저의 모든 대화방 목록을 반환합니다.
// 각 대화방에는 상대방 프로필 + 마지막 메시지 + 안읽은 메시지 수가 포함됩니다.
router.get("/chat/conversations", requireAuth, async (req, res) => {
  try {
    const viewerDbId = req.user!.userId;

    // 1. 내가 포함된 모든 매칭 조회
    const myMatches = await db
      .select()
      .from(matchesTable)
      .where(
        or(
          eq(matchesTable.user1Id, viewerDbId),
          eq(matchesTable.user2Id, viewerDbId)
        )
      )
      .orderBy(desc(matchesTable.createdAt));

    if (!myMatches.length) {
      res.json({ conversations: [] });
      return;
    }

    // 2. 각 매칭에 대해 상대방 프로필 + 마지막 메시지 조회
    const conversations = await Promise.all(
      myMatches.map(async (match) => {
        const partnerId = match.user1Id === viewerDbId ? match.user2Id : match.user1Id;
        // 대화방 ID: 두 유저 ID를 정렬하여 항상 동일한 ID 생성
        const convId = `conv_${Math.min(viewerDbId, partnerId)}_${Math.max(viewerDbId, partnerId)}`;

        // 상대방 프로필 조회
        const [partnerRow] = await db
          .select()
          .from(users)
          .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
          .where(eq(users.id, partnerId))
          .limit(1);

        if (!partnerRow) return null;

        // 마지막 메시지 조회
        const [lastMsg] = await db
          .select()
          .from(chatMessages)
          .where(eq(chatMessages.conversationId, convId))
          .orderBy(desc(chatMessages.createdAt))
          .limit(1);

        // 안읽은 메시지 수 (상대방이 보낸 메시지)
        const unreadResult = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(chatMessages)
          .where(
            and(
              eq(chatMessages.conversationId, convId),
              eq(chatMessages.senderUserId, partnerId)
            )
          );
        const unreadCount = unreadResult[0]?.count ?? 0;

        const p = partnerRow.users;
        const pp = partnerRow.user_profiles;

        return {
          id: convId,
          matchId: String(match.id),
          matchedAt: match.createdAt.toISOString(),
          user: {
            id: String(p.id),
            nickname: pp.nickname ?? "알 수 없음",
            age: pp.age ?? 0,
            country: p.country,
            language: p.language,
            photos: (pp.photos as string[]) ?? [],
            bio: pp.bio ?? "",
            isOnline: false,
            isAI: false,
          },
          lastMessage: lastMsg
            ? {
                id: `srv_${lastMsg.id}`,
                senderId: lastMsg.senderId,
                originalText: lastMsg.content,
                translatedText: lastMsg.translatedContent ?? undefined,
                createdAt: lastMsg.createdAt.toISOString(),
              }
            : undefined,
          unreadCount: Number(unreadCount),
          translationEnabled: true,
          externalUnlocked: false,
        };
      })
    );

    const validConversations = conversations.filter(Boolean);
    res.json({ conversations: validConversations });
  } catch (err) {
    console.error("get conversations error", err);
    res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
});

// GET /api/chat/:conversationId/messages
// 특정 대화의 메시지 목록을 가져옵니다 (최신 100건)
router.get("/chat/:conversationId/messages", optionalAuth, async (req, res) => {
  try {
    const conversationId = String(req.params.conversationId);

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
    const conversationId = String(req.params.conversationId);
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
    const conversationId = String(req.params.conversationId);
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
