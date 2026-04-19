/**
 * modules/interest/interest.router.ts
 *
 * HTTP transport layer for PRS (Partner Receptivity Score) and analytics endpoints.
 * Validates requests, delegates to interestService / interestRepository, returns responses.
 * No scoring or LLM logic here.
 *
 * Security:
 *  - All read paths require authentication (requireAuth).
 *  - Viewer identity is always derived from req.user.userId — never from client body.
 *  - Conversation membership is verified against conversation_participants.
 *  - POST /ai/prs (legacy pull) is locked to internal/test use only.
 */

import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { aiRateLimit, getAiRateLimitStats } from "../../middleware/aiRateLimit.js";
import { computePrs } from "./interest.service.js";
import { interestRepository } from "./interest.repository.js";
import { participantRepository } from "./participant.repository.js";
import { getAggregates, getRecentEvents } from "../../infra/analytics.js";

const router = Router();

// ── GET /api/ai/prs/:conversationId ───────────────────────────────────────────

/**
 * Return the latest PRS snapshot for the authenticated viewer.
 *
 * viewerUserId is derived from req.user — never from client query/body.
 * Returns 404 if no snapshot exists or user is not a participant.
 */
router.get("/ai/prs/:conversationId", requireAuth, async (req, res) => {
  try {
    const conversationId = String(req.params["conversationId"]);
    const viewerUserId = req.user!.userId;

    const isMember = await participantRepository.isParticipant(conversationId, viewerUserId);
    if (!isMember) {
      res.status(403).json({ error: "이 대화에 접근할 권한이 없습니다." });
      return;
    }

    const latest = await interestRepository.getLatest(conversationId, viewerUserId);
    if (!latest) {
      res.status(404).json({ error: "아직 분석 결과가 없습니다." });
      return;
    }

    res.json({
      conversationId,
      viewerUserId,
      prsScore: latest.prsScore,
      confidenceScore: latest.confidenceScore,
      stage: latest.stage,
      lowConfidenceState: latest.lowConfidenceState,
      reasonCodes: latest.reasonCodes,
      coachingCodes: latest.coachingCodes,
      llmEnriched: latest.llmEnriched,
      modelVersion: latest.modelVersion,
      messageCount: latest.messageCount,
      computedAt: latest.computedAt,
      updatedAt: latest.updatedAt,
    });
  } catch (err) {
    console.error("[interest] GET /ai/prs/:conversationId error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ── GET /api/ai/prs/:conversationId/history ───────────────────────────────────

/**
 * Return snapshot history for the authenticated viewer in a conversation.
 * Query param: ?limit=N (max 50)
 */
router.get("/ai/prs/:conversationId/history", requireAuth, async (req, res) => {
  try {
    const conversationId = String(req.params["conversationId"]);
    const viewerUserId = req.user!.userId;
    const limit = Math.min(Number(req.query["limit"] ?? 20), 50);

    const isMember = await participantRepository.isParticipant(conversationId, viewerUserId);
    if (!isMember) {
      res.status(403).json({ error: "이 대화에 접근할 권한이 없습니다." });
      return;
    }

    const history = await interestRepository.getHistory(conversationId, viewerUserId, limit);
    res.json({ conversationId, viewerUserId, history });
  } catch (err) {
    console.error("[interest] GET /ai/prs/:conversationId/history error:", err);
    res.status(500).json({ error: "서버 오류" });
  }
});

// ── POST /api/ai/prs (INTERNAL / TEST ONLY) ───────────────────────────────────

/**
 * Legacy pull endpoint — accepts a client-provided featureWindow.
 *
 * IMPORTANT:
 *  - This endpoint is NOT for production client use.
 *  - myUserId/partnerUserId from featureWindow are NOT trusted from client.
 *  - The authenticated userId is used as myUserId.
 *  - Rate-limited. Requires authentication.
 */
router.post("/ai/prs", requireAuth, aiRateLimit, async (req, res) => {
  try {
    const { featureWindow, viewerLang } = req.body as {
      featureWindow: Record<string, unknown>;
      viewerLang?: "ko" | "ja";
    };

    if (!featureWindow || typeof featureWindow !== "object") {
      res.status(400).json({ error: "featureWindow is required" });
      return;
    }

    const lang = viewerLang ?? "ko";

    const sanitizedFeatureWindow: Record<string, unknown> = {
      ...featureWindow,
      myUserId: String(req.user!.userId),
    };

    const { snapshot, confidenceScore } = await computePrs({
      featureWindow: sanitizedFeatureWindow,
      viewerLang: lang,
    });

    res.json({
      ...snapshot,
      confidenceScore,
      prs: snapshot.prsScore,
      confidence: confidenceScore,
      stage: snapshot.stage,
      reasons: snapshot.generatedInsights.map((i) =>
        lang === "ko" ? i.textKo : i.textJa
      ),
      ...(snapshot.lowConfidenceState
        ? {
            lowConfidenceReason:
              lang === "ko"
                ? "아직 대화 데이터가 충분하지 않아요. 더 대화를 나눠보세요."
                : "まだ会話データが十分ではありません。もう少し話してみましょう。",
          }
        : {}),
      computedAt: snapshot.generatedAt,
      _warning: "This endpoint is for internal/test use only. Not for production clients.",
    });
  } catch (err) {
    console.error("[interest] /ai/prs error:", err);
    res.status(500).json({ error: "Failed to compute PRS" });
  }
});

// ── Admin / Debug endpoints ────────────────────────────────────────────────────

router.get("/admin/prs/aggregates", (_req, res) => {
  res.json(getAggregates());
});

router.get("/admin/prs/events", (req, res) => {
  const n = Math.min(Number(req.query.n ?? 50), 200);
  res.json({ events: getRecentEvents(n) });
});

router.get("/admin/ai/rate-limits", (_req, res) => {
  res.json(getAiRateLimitStats());
});

export default router;
