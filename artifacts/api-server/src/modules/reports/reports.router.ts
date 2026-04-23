/**
 * modules/reports/reports.router.ts
 *
 * User reports (신고) and blocks (차단) endpoints.
 * Migrated from routes/reports.ts — no logic changes, only path updates.
 */

import { Router } from "express";
import { and, eq, desc, sql } from "drizzle-orm";
import { db, userReports, userBlocks, userProfiles } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";
import { trackEvent } from "../../infra/canonicalAnalytics.js";
import { broadcastSafetyStateUpdated } from "../../infra/wsBroadcaster.js";

const router = Router();

const VALID_CATEGORIES = [
  "fake_profile",
  "ai_generated_photos",
  "impersonation",
  "romance_scam",
  "financial_scam",
  "off_platform_contact",
  "spam_messages",
  "harassment",
  "underage",
  "other",
] as const;

/**
 * POST /api/reports
 */
router.post("/reports", requireAuth, async (req, res) => {
  try {
    const reporterId = req.user!.userId;
    const { reportedUserId, category, details, referenceId } = req.body as {
      reportedUserId: number;
      category: string;
      details?: string;
      referenceId: string;
    };

    if (!reportedUserId || !category || !referenceId) {
      res.status(400).json({ error: "reportedUserId, category, referenceId 필수입니다." });
      return;
    }

    if (!VALID_CATEGORIES.includes(category as (typeof VALID_CATEGORIES)[number])) {
      res.status(400).json({ error: "유효하지 않은 신고 카테고리입니다." });
      return;
    }

    if (reporterId === reportedUserId) {
      res.status(400).json({ error: "자기 자신을 신고할 수 없습니다." });
      return;
    }

    const existing = await db
      .select({ id: userReports.id })
      .from(userReports)
      .where(
        and(
          eq(userReports.reporterId, reporterId),
          eq(userReports.reportedUserId, reportedUserId),
          eq(userReports.category, category)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({ error: "이미 동일한 사유로 신고한 사용자입니다." });
      return;
    }

    await db.insert(userReports).values({
      reporterId,
      reportedUserId,
      category,
      details: details?.trim() || null,
      referenceId,
    });

    const uniqueReporterResult = await db
      .select({ count: sql<number>`count(distinct ${userReports.reporterId})` })
      .from(userReports)
      .where(eq(userReports.reportedUserId, reportedUserId));

    const uniqueCount = Number(uniqueReporterResult[0]?.count ?? 0);
    if (uniqueCount >= 5) {
      logger.warn(
        { reportedUserId, uniqueReporterCount: uniqueCount },
        uniqueCount >= 10
          ? "User hit 10+ unique reporters — auto-restriction threshold"
          : "User hit 5+ unique reporters — auto-flag threshold"
      );
    }

    logger.info({ reporterId, reportedUserId, category, referenceId }, "Report submitted");

    // canonical analytics + safety WS 이벤트
    void trackEvent({
      eventName: "report_submitted",
      actorId: reporterId,
      targetId: reportedUserId,
      props: { category, referenceId },
    });

    if (referenceId && /^\d+$/.test(referenceId)) {
      setImmediate(() => {
        broadcastSafetyStateUpdated({
          conversationId: referenceId,
          affectedUserId: reportedUserId,
          safetyEvent: "report_submitted",
          details: { category },
        });
      });
    }

    res.status(201).json({ success: true, referenceId });
  } catch (err) {
    logger.error({ err }, "Failed to submit report");
    res.status(500).json({ error: "신고 처리 중 오류가 발생했습니다." });
  }
});

/**
 * POST /api/blocks
 */
router.post("/blocks", requireAuth, async (req, res) => {
  try {
    const blockerId = req.user!.userId;
    const { blockedUserId } = req.body as { blockedUserId: number };

    if (!blockedUserId) {
      res.status(400).json({ error: "blockedUserId 필수입니다." });
      return;
    }

    if (blockerId === blockedUserId) {
      res.status(400).json({ error: "자기 자신을 차단할 수 없습니다." });
      return;
    }

    await db
      .insert(userBlocks)
      .values({ blockerId, blockedUserId })
      .onConflictDoNothing();

    logger.info({ blockerId, blockedUserId }, "User blocked");

    void trackEvent({
      eventName: "block_user_completed",
      actorId: blockerId,
      targetId: blockedUserId,
    });

    res.status(201).json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to block user");
    res.status(500).json({ error: "차단 처리 중 오류가 발생했습니다." });
  }
});

/**
 * GET /api/blocks — 내가 차단한 사용자 목록
 */
router.get("/blocks", requireAuth, async (req, res) => {
  try {
    const blockerId = req.user!.userId;
    const rows = await db
      .select({
        userId: userBlocks.blockedUserId,
        nickname: userProfiles.nickname,
        photoUrl: userProfiles.photoUrls,
        blockedAt: userBlocks.createdAt,
      })
      .from(userBlocks)
      .leftJoin(userProfiles, eq(userProfiles.userId, userBlocks.blockedUserId))
      .where(eq(userBlocks.blockerId, blockerId))
      .orderBy(desc(userBlocks.createdAt));

    const blocks = rows.map((r) => ({
      userId: r.userId,
      nickname: r.nickname ?? "알 수 없음",
      photoUrl: Array.isArray(r.photoUrl) && r.photoUrl.length > 0 ? r.photoUrl[0] : null,
      blockedAt: r.blockedAt,
    }));

    res.json({ blocks });
  } catch (err) {
    logger.error({ err }, "Failed to list blocks");
    res.status(500).json({ error: "차단 목록 조회에 실패했습니다." });
  }
});

/**
 * DELETE /api/blocks/:userId — 특정 사용자 차단 해제
 */
router.delete("/blocks/:userId", requireAuth, async (req, res) => {
  try {
    const blockerId = req.user!.userId;
    const blockedUserId = Number(req.params.userId);

    if (!blockedUserId || isNaN(blockedUserId)) {
      res.status(400).json({ error: "유효하지 않은 userId입니다." });
      return;
    }

    await db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, blockerId), eq(userBlocks.blockedUserId, blockedUserId)));

    logger.info({ blockerId, blockedUserId }, "User unblocked");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to unblock user");
    res.status(500).json({ error: "차단 해제에 실패했습니다." });
  }
});

/**
 * GET /api/admin/reports
 */
router.get("/admin/reports", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const onlyUnresolved = req.query.unresolved === "true";

    const conditions = onlyUnresolved ? [eq(userReports.resolved, false)] : [];

    const reports = await db
      .select({
        id: userReports.id,
        reporterId: userReports.reporterId,
        reportedUserId: userReports.reportedUserId,
        category: userReports.category,
        details: userReports.details,
        referenceId: userReports.referenceId,
        resolved: userReports.resolved,
        createdAt: userReports.createdAt,
        reportedNickname: userProfiles.nickname,
      })
      .from(userReports)
      .leftJoin(userProfiles, eq(sql`${userReports.reportedUserId}::integer`, userProfiles.userId))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(userReports.createdAt))
      .limit(limit)
      .offset(offset);

    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userReports)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const topReported = await db
      .select({
        reportedUserId: userReports.reportedUserId,
        uniqueReporters: sql<number>`count(distinct ${userReports.reporterId})`,
        totalReports: sql<number>`count(*)`,
        nickname: userProfiles.nickname,
      })
      .from(userReports)
      .leftJoin(userProfiles, eq(sql`${userReports.reportedUserId}::integer`, userProfiles.userId))
      .groupBy(userReports.reportedUserId, userProfiles.nickname)
      .orderBy(desc(sql`count(distinct ${userReports.reporterId})`))
      .limit(10);

    res.json({ reports, total: Number(totalResult[0]?.count ?? 0), topReported });
  } catch (err) {
    logger.error({ err }, "Failed to fetch reports");
    res.status(500).json({ error: "신고 목록 조회 실패" });
  }
});

/**
 * PATCH /api/admin/reports/:id/resolve
 */
router.patch("/admin/reports/:id/resolve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { resolutionNote } = req.body as { resolutionNote?: string };

    await db
      .update(userReports)
      .set({
        resolved: true,
        resolvedAt: new Date(),
        resolutionNote: resolutionNote?.trim() || null,
      })
      .where(eq(userReports.id, id));

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to resolve report");
    res.status(500).json({ error: "신고 처리 실패" });
  }
});

export default router;
