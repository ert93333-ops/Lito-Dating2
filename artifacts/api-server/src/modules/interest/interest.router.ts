/**
 * modules/interest/interest.router.ts
 *
 * HTTP transport layer for PRS (Partner Receptivity Score) and analytics admin endpoints.
 * Validates requests, delegates to interestService / analytics infra, returns responses.
 * No scoring or LLM logic here.
 */

import { Router } from "express";
import { aiRateLimit, getAiRateLimitStats } from "../../middleware/aiRateLimit.js";
import { computePrs } from "./interest.service.js";
import { getAggregates, getRecentEvents } from "../../infra/analytics.js";

const router = Router();

// Rate-limit all /ai/* paths
router.use((req, res, next) => {
  if (req.path.startsWith("/ai/")) return aiRateLimit(req, res, next);
  next();
});

/**
 * POST /api/ai/prs
 *
 * Body:     { featureWindow: InterestFeatureWindow, viewerLang?: "ko" | "ja" }
 * Response: ConversationInterestSnapshot + legacy-compat fields
 */
router.post("/ai/prs", async (req, res) => {
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
    const { snapshot, confidenceScore } = await computePrs({ featureWindow, viewerLang: lang });

    console.log(
      `[interest] convId=${snapshot.conversationId} stage=${snapshot.stage} ` +
      `prs=${snapshot.prsScore} cs=${confidenceScore} lowCs=${snapshot.lowConfidenceState}`
    );

    res.json({
      ...snapshot,
      confidenceScore,
      // Legacy compat fields for clients using the old PRSResult shape
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
    });
  } catch (err) {
    console.error("[interest] /ai/prs error:", err);
    res.status(500).json({ error: "Failed to compute PRS" });
  }
});

// ── Admin / Debug endpoints ────────────────────────────────────────────────────

/** GET /api/admin/prs/aggregates */
router.get("/admin/prs/aggregates", (_req, res) => {
  res.json(getAggregates());
});

/** GET /api/admin/prs/events */
router.get("/admin/prs/events", (req, res) => {
  const n = Math.min(Number(req.query.n ?? 50), 200);
  res.json({ events: getRecentEvents(n) });
});

/** GET /api/admin/ai/rate-limits */
router.get("/admin/ai/rate-limits", (_req, res) => {
  res.json(getAiRateLimitStats());
});

export default router;
