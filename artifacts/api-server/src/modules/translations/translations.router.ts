/**
 * translations.router.ts
 *
 * POST /api/v1/translations/profile  — 프로필 번역 (core, 무료)
 * POST /api/v1/translations/message  — 메시지 번역 (core, 무료)
 * POST /api/v1/messages/:id/translation-retry — 번역 재시도
 * GET  /api/v1/messages/:id/original — 원문 조회
 *
 * 구현 규칙:
 * - 번역은 차감 대상 아님 (무료 core 기능)
 * - translation_fail은 메시지 실패가 아님
 * - consent_not_given이면 번역 수행 안 함 (원문만 반환)
 * - unsafe_interaction에서도 번역은 유지 (위험 의미 완화/미화 금지)
 * - fallback: 번역 실패 시 원문 유지 + fallbackUsed=true
 * - raw prompt/response 장기 저장 금지
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, aiConsents, messageTranslations, directMessages } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

async function hasTranslationConsent(userId: number): Promise<boolean> {
  const [consent] = await db.select().from(aiConsents)
    .where(and(
      eq(aiConsents.userId, userId),
      eq(aiConsents.featureType, "translation")
    ))
    .limit(1);
  return !!(consent?.granted && !consent.revokedAt);
}

async function callTranslationProvider(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  mode: "profile" | "chat"
): Promise<{ translatedText: string; confidenceLevel: string; notes: string | null; fallbackUsed: boolean }> {
  // TODO: 실제 외부 AI 번역 provider 연동
  // 원칙: 위험 의미 완화/미화 금지, 경어 보수 유지, 모호성 유지
  // placeholder — 실제 구현 필요
  return {
    translatedText: `[번역 미구현: ${text}]`,
    confidenceLevel: "low",
    notes: "TODO: 외부 번역 provider 연동 필요",
    fallbackUsed: true,
  };
}

/**
 * POST /api/v1/translations/profile
 * Body: { text: string, sourceLanguage: "ko"|"ja", targetLanguage: "ko"|"ja" }
 */
router.post("/v1/translations/profile", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_INPUT", message: "text, sourceLanguage, targetLanguage 필수" }
      });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({
        ok: true,
        data: {
          translatedText: null,
          originalText: text,
          status: "consent_required",
          block_reason: "consent_not_given",
          message: "번역 기능 동의가 필요합니다."
        }
      });
      return;
    }

    const result = await callTranslationProvider(text, sourceLanguage, targetLanguage, "profile");

    res.json({
      ok: true,
      data: {
        translatedText: result.fallbackUsed ? null : result.translatedText,
        originalText: text,
        confidenceLevel: result.confidenceLevel,
        notes: result.notes,
        fallbackUsed: result.fallbackUsed,
        status: result.fallbackUsed ? "failed" : "success",
      }
    });
  } catch (err) {
    console.error("[translations/profile]", err);
    res.json({
      ok: true,
      data: {
        translatedText: null,
        originalText: req.body?.text,
        fallbackUsed: true,
        status: "failed",
        notes: "번역 오류. 원문으로 계속 이용 가능합니다."
      }
    });
  }
});

/**
 * POST /api/v1/translations/message
 * Body: { directMessageId: number, text: string, sourceLanguage: "ko"|"ja", targetLanguage: "ko"|"ja" }
 */
router.post("/v1/translations/message", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { directMessageId, text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_INPUT", message: "text, sourceLanguage, targetLanguage 필수" }
      });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({
        ok: true,
        data: {
          translatedText: null,
          originalText: text,
          status: "consent_required",
          block_reason: "consent_not_given",
        }
      });
      return;
    }

    const result = await callTranslationProvider(text, sourceLanguage, targetLanguage, "chat");

    if (directMessageId && !result.fallbackUsed) {
      await db.insert(messageTranslations).values({
        directMessageId,
        sourceLanguage,
        targetLanguage,
        translatedText: result.translatedText,
        confidenceLevel: result.confidenceLevel,
        notes: result.notes,
        fallbackUsed: false,
        status: "success",
      }).onConflictDoNothing();
    }

    res.json({
      ok: true,
      data: {
        translatedText: result.fallbackUsed ? null : result.translatedText,
        originalText: text,
        confidenceLevel: result.confidenceLevel,
        notes: result.notes,
        fallbackUsed: result.fallbackUsed,
        status: result.fallbackUsed ? "failed" : "success",
      }
    });
  } catch (err) {
    console.error("[translations/message]", err);
    res.json({
      ok: true,
      data: {
        translatedText: null,
        originalText: req.body?.text,
        fallbackUsed: true,
        status: "failed",
        notes: "번역 오류. 메시지 전송은 유지됩니다."
      }
    });
  }
});

/** POST /api/v1/messages/:id/translation-retry */
router.post("/v1/messages/:id/translation-retry", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const [dm] = await db.select().from(directMessages)
      .where(eq(directMessages.id, parseInt(id)))
      .limit(1);

    if (!dm) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "메시지를 찾을 수 없습니다." } });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({
        ok: true,
        data: { status: "consent_required", block_reason: "consent_not_given" }
      });
      return;
    }

    const targetLanguage = (req as any).user?.language === "ko" ? "ko" : "ja";
    const sourceLanguage = targetLanguage === "ko" ? "ja" : "ko";

    const result = await callTranslationProvider(dm.content, sourceLanguage, targetLanguage, "chat");

    res.json({
      ok: true,
      data: {
        messageId: dm.id,
        translatedText: result.fallbackUsed ? null : result.translatedText,
        fallbackUsed: result.fallbackUsed,
        status: result.fallbackUsed ? "failed" : "success",
      }
    });
  } catch (err) {
    console.error("[translations/retry]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/** GET /api/v1/messages/:id/original */
router.get("/v1/messages/:id/original", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const [dm] = await db.select({ id: directMessages.id, content: directMessages.content, createdAt: directMessages.createdAt })
      .from(directMessages)
      .where(eq(directMessages.id, parseInt(id)))
      .limit(1);

    if (!dm) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "메시지를 찾을 수 없습니다." } });
      return;
    }

    res.json({ ok: true, data: { messageId: dm.id, originalText: dm.content } });
  } catch (err) {
    console.error("[translations/original]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
