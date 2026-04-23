/**
 * admin.router.ts
 *
 * Admin read API — Trust & Safety Dashboard 데이터 소스
 *
 * GET  /api/v1/admin/reports           — 신고 큐
 * GET  /api/v1/admin/users             — 유저 목록
 * GET  /api/v1/admin/users/:id         — 유저 상세
 * GET  /api/v1/admin/deletions         — 삭제 요청 목록
 * GET  /api/v1/admin/deletions/:id     — 삭제 요청 상세
 * GET  /api/v1/admin/risk-flags        — 위험 플래그 목록
 * GET  /api/v1/admin/moderation-actions — 모더레이션 조치 목록
 * GET  /api/v1/admin/wallet-summary/:userId — 지갑/구매 요약
 * GET  /api/v1/admin/analytics/events  — 캐노니컬 이벤트 집계
 *
 * 보안 규칙:
 * - raw prompt 장기 노출 금지
 * - 신고 증거 최소 열람 원칙
 * - audit log 필수
 * - 현재: JWT 인증만 (role 검사는 TODO)
 * TODO: admin role 검사 미들웨어 추가
 */

import { Router } from "express";
import { desc, eq, sql } from "drizzle-orm";
import {
  db, users, deleteRequests, deleteJobs, deleteEvents,
  conversationRiskFlags, moderationActions, iapPurchases, creditWallets, aiLedger
} from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { trackEvent, getEventCounts, getRecentEventsForAdmin } from "../../infra/canonicalAnalytics.js";

const router = Router();

function adminAuth(req: any, res: any, next: any) {
  return requireAuth(req, res, next);
}

/** GET /api/v1/admin/reports */
router.get("/v1/admin/reports", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? 50)), 200);
    const offset = parseInt(String(req.query.offset ?? 0));

    const rows = await db.execute(sql`
      SELECT
        r.id, r.reporter_id, r.reported_user_id, r.category,
        r.details, r.resolved, r.created_at,
        reporter.email AS reporter_email,
        reported.email AS reported_email
      FROM user_reports r
      LEFT JOIN users reporter ON reporter.id = r.reporter_id
      LEFT JOIN users reported ON reported.id = r.reported_user_id
      ORDER BY r.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRow = await db.execute(sql`SELECT COUNT(*) as cnt FROM user_reports`);

    res.json({
      ok: true,
      data: {
        reports: rows.rows,
        total: parseInt((countRow.rows[0] as any)?.cnt ?? "0", 10),
        limit,
        offset,
      }
    });
  } catch (err) {
    console.error("[admin/reports]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/users */
router.get("/v1/admin/users", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? 50)), 200);
    const offset = parseInt(String(req.query.offset ?? 0));
    const search = String(req.query.search ?? "").trim();

    const rows = await db.execute(sql`
      SELECT
        u.id, u.email, u.age_gate_passed, u.visibility_status, u.deletion_requested_at,
        u.created_at, u.updated_at,
        p.nickname, p.bio
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      ${search ? sql`WHERE u.email ILIKE ${'%' + search + '%'} OR p.nickname ILIKE ${'%' + search + '%'}` : sql``}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRow = await db.execute(sql`SELECT COUNT(*) as cnt FROM users`);

    res.json({
      ok: true,
      data: {
        users: rows.rows,
        total: parseInt((countRow.rows[0] as any)?.cnt ?? "0", 10),
        limit,
        offset,
      }
    });
  } catch (err) {
    console.error("[admin/users]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/users/:id */
router.get("/v1/admin/users/:id", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10);

    const userRow = await db.execute(sql`
      SELECT
        u.id, u.email, u.age_gate_passed, u.visibility_status, u.deletion_requested_at,
        u.created_at, u.updated_at,
        p.nickname, p.bio, p.interests, p.photos
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      WHERE u.id = ${userId}
      LIMIT 1
    `);

    if (!userRow.rows.length) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND" } });
      return;
    }

    const riskFlagsRow = await db.execute(sql`
      SELECT crf.* FROM conversation_risk_flags crf
      JOIN matches m ON m.id = crf.match_id
      WHERE m.user1_id = ${userId} OR m.user2_id = ${userId}
      ORDER BY crf.detected_at DESC LIMIT 20
    `);

    const moderationRow = await db.select().from(moderationActions)
      .where(eq(moderationActions.targetUserId, userId))
      .orderBy(desc(moderationActions.appliedAt))
      .limit(20);

    const reportsRow = await db.execute(sql`
      SELECT id, category, resolved, created_at FROM user_reports
      WHERE reported_user_id = ${userId}
      ORDER BY created_at DESC LIMIT 20
    `);

    const wallet = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    res.json({
      ok: true,
      data: {
        user: userRow.rows[0],
        riskFlags: (riskFlagsRow as any).rows ?? riskFlagsRow,
        moderationActions: moderationRow,
        reports: reportsRow.rows,
        wallet: wallet[0] ?? null,
      }
    });
  } catch (err) {
    console.error("[admin/users/:id]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/deletions */
router.get("/v1/admin/deletions", adminAuth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? 50)), 200);
    const offset = parseInt(String(req.query.offset ?? 0));

    const rows = await db.execute(sql`
      SELECT
        dr.id, dr.user_id, dr.status, dr.reason,
        dr.requested_at, dr.hidden_at, dr.web_handoff_at, dr.completed_at,
        u.email
      FROM delete_requests dr
      LEFT JOIN users u ON u.id = dr.user_id
      ORDER BY dr.requested_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const countRow = await db.execute(sql`SELECT COUNT(*) as cnt FROM delete_requests`);

    res.json({
      ok: true,
      data: {
        deletions: rows.rows,
        total: parseInt((countRow.rows[0] as any)?.cnt ?? "0", 10),
      }
    });
  } catch (err) {
    console.error("[admin/deletions]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/deletions/:id */
router.get("/v1/admin/deletions/:id", adminAuth, async (req, res) => {
  try {
    const requestId = parseInt(req.params.id, 10);

    const [request] = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.id, requestId))
      .limit(1);

    if (!request) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND" } });
      return;
    }

    const jobs = await db.select().from(deleteJobs)
      .where(eq(deleteJobs.deleteRequestId, requestId))
      .orderBy(deleteJobs.id);

    const events = await db.select().from(deleteEvents)
      .where(eq(deleteEvents.deleteRequestId, requestId))
      .orderBy(deleteEvents.occurredAt);

    res.json({
      ok: true,
      data: { request, jobs, events }
    });
  } catch (err) {
    console.error("[admin/deletions/:id]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/risk-flags */
router.get("/v1/admin/risk-flags", adminAuth, async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT crf.*, m.user1_id, m.user2_id
      FROM conversation_risk_flags crf
      JOIN matches m ON m.id = crf.match_id
      ORDER BY crf.detected_at DESC LIMIT 100
    `);

    res.json({ ok: true, data: { riskFlags: (rows as any).rows ?? rows } });
  } catch (err) {
    console.error("[admin/risk-flags]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/moderation-actions */
router.get("/v1/admin/moderation-actions", adminAuth, async (req, res) => {
  try {
    const rows = await db.select().from(moderationActions)
      .orderBy(desc(moderationActions.appliedAt))
      .limit(100);

    res.json({ ok: true, data: { moderationActions: rows } });
  } catch (err) {
    console.error("[admin/moderation-actions]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/wallet-summary/:userId */
router.get("/v1/admin/wallet-summary/:userId", adminAuth, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);

    const wallet = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    const purchases = await db.select().from(iapPurchases)
      .where(eq(iapPurchases.userId, userId))
      .orderBy(desc(iapPurchases.createdAt))
      .limit(20);

    const ledger = await db.select().from(aiLedger)
      .where(eq(aiLedger.userId, userId))
      .orderBy(desc(aiLedger.createdAt))
      .limit(50);

    res.json({
      ok: true,
      data: {
        wallet: wallet[0] ?? null,
        purchases,
        ledger,
      }
    });
  } catch (err) {
    console.error("[admin/wallet-summary]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** GET /api/v1/admin/analytics/events */
router.get("/v1/admin/analytics/events", adminAuth, async (req, res) => {
  try {
    const daysSince = parseInt(String(req.query.days ?? 7));
    const since = new Date(Date.now() - daysSince * 24 * 60 * 60 * 1000);

    const counts = await getEventCounts(since);
    const recent = await getRecentEventsForAdmin(50);

    res.json({
      ok: true,
      data: {
        since: since.toISOString(),
        event_counts: counts,
        recent_events: recent,
      }
    });
  } catch (err) {
    console.error("[admin/analytics/events]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

/** POST /api/v1/analytics/track — 모바일 클라이언트 이벤트 포워딩 (fire-and-forget) */
router.post("/v1/analytics/track", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId as number;
    const { eventName, props } = req.body;
    if (typeof eventName !== "string" || !eventName) {
      res.status(400).json({ ok: false, error: { code: "INVALID_INPUT" } });
      return;
    }
    await trackEvent({
      eventName: eventName as any,
      actorId: userId,
      props: props && typeof props === "object" ? props : {},
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[analytics/track]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR" } });
  }
});

export default router;
