/**
 * deletion.router.ts
 *
 * POST /api/v1/account-deletion/start         — 앱 내 삭제 시작 (즉시 비노출/세션 종료)
 * POST /api/v1/account-deletion/reauth        — 재인증 확인
 * POST /api/v1/account-deletion/web-handoff   — 웹 삭제 요청으로 handoff
 * GET  /public/account-deletion/confirm       — 웹 삭제 확인 페이지 (public)
 * POST /public/account-deletion/submit        — 웹 삭제 최종 제출 (public)
 * GET  /api/v1/account-deletion/status        — 삭제 상태 조회
 *
 * 구현 규칙:
 * - start 즉시 visibilityStatus=hidden, 세션 무효화
 * - delete flow 중 결제/리텐션 팝업 금지
 * - 삭제 완료 전까지는 hidden 상태 유지
 * - delete_requests, delete_jobs, delete_events 테이블 사용
 */

import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, users, deleteRequests, deleteEvents } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { trackEvent } from "../../infra/canonicalAnalytics.js";
import { processPendingDeletions } from "./deletion.worker.js";

const router = Router();

const WEB_DELETE_BASE_URL = process.env.WEB_DELETE_BASE_URL || "https://litodate.app/delete";

/**
 * POST /api/v1/account-deletion/start
 * - 즉시 비노출: users.visibilityStatus = "hidden"
 * - 삭제 요청 기록
 * - 세션은 이후 클라이언트가 처리 (로그아웃 안내)
 */
router.post("/v1/account-deletion/start", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { reason } = req.body;

    const existing = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.userId, userId))
      .limit(1);

    if (existing.length > 0 && existing[0].status !== "failed") {
      res.status(409).json({
        ok: false,
        error: { code: "DELETION_ALREADY_REQUESTED", message: "이미 삭제 요청이 진행 중입니다." }
      });
      return;
    }

    const now = new Date();

    await db.update(users)
      .set({
        visibilityStatus: "hidden",
        deletionRequestedAt: now,
        updatedAt: now
      })
      .where(eq(users.id, userId));

    const [request] = await db.insert(deleteRequests).values({
      userId,
      requestedAt: now,
      status: "pending",
      hiddenAt: now,
      reason: reason || null,
    }).returning();

    await db.insert(deleteEvents).values({
      deleteRequestId: request.id,
      eventType: "delete_request_started_in_app",
      occurredAt: now,
    });

    void trackEvent({ eventName: "delete_request_started_in_app", actorId: userId, props: { deleteRequestId: request.id } });

    res.json({
      ok: true,
      data: {
        deleteRequestId: request.id,
        status: "pending",
        hiddenAt: now,
        nextStep: "reauth",
        message: "계정이 즉시 비노출 처리되었습니다. 재인증 후 웹 삭제 요청으로 이어집니다."
      }
    });
  } catch (err) {
    console.error("[deletion/start]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * POST /api/v1/account-deletion/reauth
 * - 재인증 확인 (현재는 password 재확인 placeholder)
 * - TODO: Apple/Google 재인증 추가
 */
router.post("/v1/account-deletion/reauth", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const request = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.userId, userId))
      .limit(1);

    if (request.length === 0) {
      res.status(404).json({
        ok: false,
        error: { code: "NO_DELETION_REQUEST", message: "삭제 요청을 먼저 시작해주세요." }
      });
      return;
    }

    res.json({
      ok: true,
      data: {
        reauthConfirmed: true,
        nextStep: "web_handoff",
        message: "재인증 완료. 웹 삭제 요청으로 이동합니다."
      }
    });
  } catch (err) {
    console.error("[deletion/reauth]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * POST /api/v1/account-deletion/web-handoff
 * - 웹 삭제 URL 반환
 * - delete_events에 web_handoff 이벤트 기록
 */
router.post("/v1/account-deletion/web-handoff", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;

    const [request] = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.userId, userId))
      .limit(1);

    if (!request) {
      res.status(404).json({
        ok: false,
        error: { code: "NO_DELETION_REQUEST", message: "삭제 요청을 먼저 시작해주세요." }
      });
      return;
    }

    const now = new Date();

    await db.update(deleteRequests)
      .set({ webHandoffAt: now, status: "web_handoff" })
      .where(eq(deleteRequests.id, request.id));

    await db.insert(deleteEvents).values({
      deleteRequestId: request.id,
      eventType: "delete_web_flow_opened",
      occurredAt: now,
    });

    void trackEvent({ eventName: "delete_web_flow_opened", actorId: userId, props: { deleteRequestId: request.id } });

    const webUrl = `${WEB_DELETE_BASE_URL}?token=${Buffer.from(String(request.id)).toString("base64")}`;

    res.json({
      ok: true,
      data: {
        webDeleteUrl: webUrl,
        message: "아래 링크에서 삭제 요청을 최종 제출해주세요."
      }
    });
  } catch (err) {
    console.error("[deletion/web-handoff]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * GET /public/account-deletion/confirm
 * - 웹 삭제 확인 페이지 (HTML 또는 JSON)
 * - TODO: 실제 웹 페이지 렌더링
 */
router.get("/public/account-deletion/confirm", (req, res) => {
  const { token } = req.query;
  res.json({
    ok: true,
    data: {
      message: "계정 삭제 확인 페이지입니다. 아래 제출 엔드포인트로 POST 요청을 보내 최종 삭제를 완료하세요.",
      token,
      submitUrl: "/api/public/account-deletion/submit"
    }
  });
});

/**
 * POST /public/account-deletion/submit
 * - 웹 삭제 최종 제출
 * - delete_events에 delete_request_submitted 기록
 * - TODO: 비동기 삭제 워커 트리거
 */
router.post("/public/account-deletion/submit", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ ok: false, error: { code: "INVALID_TOKEN", message: "토큰이 필요합니다." } });
      return;
    }

    let requestId: number;
    try {
      requestId = parseInt(Buffer.from(String(token), "base64").toString("utf-8"), 10);
    } catch {
      res.status(400).json({ ok: false, error: { code: "INVALID_TOKEN", message: "유효하지 않은 토큰" } });
      return;
    }

    const [request] = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.id, requestId))
      .limit(1);

    if (!request) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "삭제 요청을 찾을 수 없습니다." } });
      return;
    }

    const now = new Date();
    await db.update(deleteRequests)
      .set({ status: "submitted" })
      .where(eq(deleteRequests.id, requestId));

    await db.insert(deleteEvents).values({
      deleteRequestId: requestId,
      eventType: "delete_request_submitted",
      occurredAt: now,
    });

    void trackEvent({ eventName: "delete_request_submitted", actorId: request.userId, props: { deleteRequestId: requestId } });

    // 비동기 삭제 워커 즉시 실행 (setImmediate로 응답 먼저 반환)
    setImmediate(() => {
      processPendingDeletions().catch(err =>
        console.error("[deletion/submit] worker trigger failed:", err)
      );
    });

    res.json({
      ok: true,
      data: {
        status: "submitted",
        message: "삭제 요청이 접수되었습니다. 고지된 기간 내 처리됩니다."
      }
    });
  } catch (err) {
    console.error("[deletion/submit]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * GET /api/v1/account-deletion/status
 */
router.get("/v1/account-deletion/status", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const [request] = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.userId, userId))
      .limit(1);

    if (!request) {
      res.json({ ok: true, data: { status: "none" } });
      return;
    }

    res.json({
      ok: true,
      data: {
        deleteRequestId: request.id,
        status: request.status,
        requestedAt: request.requestedAt,
        hiddenAt: request.hiddenAt,
        completedAt: request.completedAt,
      }
    });
  } catch (err) {
    console.error("[deletion/status]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
