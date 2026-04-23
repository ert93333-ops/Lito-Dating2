/**
 * ai_consents.router.ts
 *
 * POST /api/v1/ai/consents/translation/grant        — 번역 동의
 * POST /api/v1/ai/consents/conversation-coach/grant — 대화 코칭 동의
 * POST /api/v1/ai/consents/profile-coach/grant      — 프로필 코칭 동의
 * GET  /api/v1/ai/consents                          — 현재 동의 상태 조회
 * POST /api/v1/ai/consents/:featureType/revoke      — 동의 철회
 *
 * 구현 규칙:
 * - consent_not_given이면 외부 AI 호출 금지
 * - 동의 철회 시 즉시 중단 (해당 기능 AI 호출 불가)
 * - 번역/코칭 동의는 온보딩에서 분리, 기능 first-use 시 받음
 * - featureType: "translation" | "conversation_coach" | "profile_coach"
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, aiConsents } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const VALID_FEATURE_TYPES = ["translation", "conversation_coach", "profile_coach"] as const;
type FeatureType = typeof VALID_FEATURE_TYPES[number];

function isValidFeatureType(ft: string): ft is FeatureType {
  return (VALID_FEATURE_TYPES as readonly string[]).includes(ft);
}

async function grantConsent(userId: number, featureType: FeatureType) {
  const [existing] = await db.select().from(aiConsents)
    .where(and(
      eq(aiConsents.userId, userId),
      eq(aiConsents.featureType, featureType)
    ))
    .limit(1);

  const now = new Date();
  if (existing) {
    await db.update(aiConsents)
      .set({ granted: true, grantedAt: now, revokedAt: null, updatedAt: now })
      .where(eq(aiConsents.id, existing.id));
  } else {
    await db.insert(aiConsents).values({
      userId,
      featureType,
      granted: true,
      grantedAt: now,
      updatedAt: now,
    });
  }
}

router.post("/v1/ai/consents/translation/grant", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    await grantConsent(userId, "translation");
    res.json({ ok: true, data: { featureType: "translation", granted: true } });
  } catch (err) {
    console.error("[ai_consents/translation/grant]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.post("/v1/ai/consents/conversation_coach/grant", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    await grantConsent(userId, "conversation_coach");
    res.json({ ok: true, data: { featureType: "conversation_coach", granted: true } });
  } catch (err) {
    console.error("[ai_consents/conversation_coach/grant]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.post("/v1/ai/consents/conversation-coach/grant", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    await grantConsent(userId, "conversation_coach");
    res.json({ ok: true, data: { featureType: "conversation_coach", granted: true } });
  } catch (err) {
    console.error("[ai_consents/conversation-coach/grant]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.post("/v1/ai/consents/profile_coach/grant", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    await grantConsent(userId, "profile_coach");
    res.json({ ok: true, data: { featureType: "profile_coach", granted: true } });
  } catch (err) {
    console.error("[ai_consents/profile_coach/grant]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.post("/v1/ai/consents/profile-coach/grant", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    await grantConsent(userId, "profile_coach");
    res.json({ ok: true, data: { featureType: "profile_coach", granted: true } });
  } catch (err) {
    console.error("[ai_consents/profile-coach/grant]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.get("/v1/ai/consents", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const rows = await db.select().from(aiConsents).where(eq(aiConsents.userId, userId));
    const result: Record<string, boolean> = {
      translation: false,
      conversation_coach: false,
      profile_coach: false,
    };
    for (const r of rows) {
      result[r.featureType] = r.granted && !r.revokedAt;
    }
    res.json({ ok: true, data: result });
  } catch (err) {
    console.error("[ai_consents/get]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

router.post("/v1/ai/consents/:featureType/revoke", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.userId;
    const { featureType } = req.params;

    if (!isValidFeatureType(featureType)) {
      res.status(400).json({ ok: false, error: { code: "INVALID_FEATURE_TYPE", message: "유효하지 않은 기능 유형" } });
      return;
    }

    const now = new Date();
    await db.update(aiConsents)
      .set({ granted: false, revokedAt: now, updatedAt: now })
      .where(and(eq(aiConsents.userId, userId), eq(aiConsents.featureType, featureType)));

    res.json({ ok: true, data: { featureType, granted: false, revokedAt: now } });
  } catch (err) {
    console.error("[ai_consents/revoke]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
