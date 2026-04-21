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
 * - 번역 완료 시 WebSocket chat.translation_updated 브로드캐스트
 *
 * Translation provider: OpenAI GPT-4o-mini
 * - timeout: 10초
 * - 실패 시 fallbackUsed=true, 메시지 전송은 유지
 * - 위험 의미 완화/미화 금지 (원문 그대로 전달)
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, aiConsents, messageTranslations, directMessages } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { openai } from "../../infra/openai.js";
import { trackEvent } from "../../infra/canonicalAnalytics.js";
import { broadcastTranslationUpdated } from "../../infra/wsBroadcaster.js";

const router = Router();

const TRANSLATION_TIMEOUT_MS = 10_000;

async function hasTranslationConsent(userId: number): Promise<boolean> {
  const [consent] = await db.select().from(aiConsents)
    .where(and(
      eq(aiConsents.userId, userId),
      eq(aiConsents.featureType, "translation")
    ))
    .limit(1);
  return !!(consent?.granted && !consent.revokedAt);
}

/**
 * 실제 번역 provider 어댑터 (OpenAI GPT-4o-mini)
 *
 * 원칙:
 * - 위험 의미 완화/미화 금지
 * - 경어 보수 유지 (존댓말 ↔ 존댓말)
 * - 모호성 유지 (의도적 모호 표현 변환 금지)
 * - 10초 timeout
 * - 실패 시 fallbackUsed=true (메시지 전송에 영향 없음)
 */
async function callTranslationProvider(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  mode: "profile" | "chat"
): Promise<{ translatedText: string; confidenceLevel: string; notes: string | null; fallbackUsed: boolean }> {
  const srcLabel = sourceLanguage === "ko" ? "Korean" : "Japanese";
  const tgtLabel = targetLanguage === "ko" ? "Korean" : "Japanese";
  const modeNote = mode === "profile"
    ? "This is a dating profile description."
    : "This is a chat message between two people on a dating app.";

  const systemPrompt = `You are a precise translator for a Korean-Japanese dating app called Lito.
${modeNote}
Rules:
- Translate from ${srcLabel} to ${tgtLabel}
- Preserve honorific level (formal stays formal, casual stays casual)
- Do NOT soften dangerous or warning signals — translate exactly as-is
- Do NOT change intentional ambiguity
- Output ONLY a JSON object: { "translation": "...", "confidence": "high"|"medium"|"low", "notes": null|"string" }
- No markdown, no extra explanation`;

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("TRANSLATION_TIMEOUT")), TRANSLATION_TIMEOUT_MS)
  );

  const translationPromise = openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_completion_tokens: 500,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Text to translate:\n${text}` }
    ],
  });

  const completion = await Promise.race([translationPromise, timeoutPromise]);
  const raw = (completion as Awaited<typeof translationPromise>).choices[0]?.message?.content?.trim() ?? "";

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.translation === "string" && parsed.translation.length > 0) {
      return {
        translatedText: parsed.translation,
        confidenceLevel: parsed.confidence ?? "medium",
        notes: parsed.notes ?? null,
        fallbackUsed: false,
      };
    }
  } catch {
    // fallback below
  }

  return {
    translatedText: text,
    confidenceLevel: "low",
    notes: "번역 파싱 실패. 원문을 사용합니다.",
    fallbackUsed: true,
  };
}

/**
 * POST /api/v1/translations/profile
 * Body: { text, sourceLanguage, targetLanguage }
 */
router.post("/v1/translations/profile", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;

  try {
    const { text, sourceLanguage, targetLanguage } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      res.status(400).json({ ok: false, error: { code: "INVALID_INPUT", message: "text, sourceLanguage, targetLanguage 필수" } });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({
        ok: true,
        data: { translatedText: null, originalText: text, status: "consent_required", block_reason: "consent_not_given", message: "번역 기능 동의가 필요합니다." }
      });
      return;
    }

    await trackEvent({ eventName: "profile_translation_preview_requested", actorId: userId, props: { sourceLanguage, targetLanguage } });

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
      data: { translatedText: null, originalText: req.body?.text, fallbackUsed: true, status: "failed", notes: "번역 오류. 원문으로 계속 이용 가능합니다." }
    });
  }
});

/**
 * POST /api/v1/translations/message
 * Body: { directMessageId?, text, sourceLanguage, targetLanguage, conversationId? }
 */
router.post("/v1/translations/message", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;

  try {
    const { directMessageId, text, sourceLanguage, targetLanguage, conversationId } = req.body;

    if (!text || !sourceLanguage || !targetLanguage) {
      res.status(400).json({ ok: false, error: { code: "INVALID_INPUT", message: "text, sourceLanguage, targetLanguage 필수" } });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({
        ok: true,
        data: { translatedText: null, originalText: text, status: "consent_required", block_reason: "consent_not_given" }
      });
      return;
    }

    await trackEvent({ eventName: "translation_requested", actorId: userId, props: { mode: "chat", sourceLanguage, targetLanguage } });

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

      await trackEvent({ eventName: "message_translation_rendered", actorId: userId, props: { directMessageId, confidenceLevel: result.confidenceLevel } });

      if (conversationId) {
        setImmediate(() => {
          broadcastTranslationUpdated({
            conversationId: String(conversationId),
            directMessageId,
            status: "success",
            translatedText: result.translatedText,
            fallbackUsed: false,
          });
        });
      }
    } else if (directMessageId && result.fallbackUsed && conversationId) {
      setImmediate(() => {
        broadcastTranslationUpdated({
          conversationId: String(conversationId),
          directMessageId,
          status: "failed",
          translatedText: null,
          fallbackUsed: true,
        });
      });
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
      data: { translatedText: null, originalText: req.body?.text, fallbackUsed: true, status: "failed", notes: "번역 오류. 메시지 전송은 유지됩니다." }
    });
  }
});

/** POST /api/v1/messages/:id/translation-retry */
router.post("/v1/messages/:id/translation-retry", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;
  const { id } = req.params;

  try {
    const [dm] = await db.select().from(directMessages)
      .where(eq(directMessages.id, parseInt(id)))
      .limit(1);

    if (!dm) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "메시지를 찾을 수 없습니다." } });
      return;
    }

    const hasConsent = await hasTranslationConsent(userId);
    if (!hasConsent) {
      res.json({ ok: true, data: { status: "consent_required", block_reason: "consent_not_given" } });
      return;
    }

    await trackEvent({ eventName: "translation_retry", actorId: userId, props: { directMessageId: dm.id } });

    const targetLanguage = (req as any).user?.language === "ko" ? "ko" : "ja";
    const sourceLanguage = targetLanguage === "ko" ? "ja" : "ko";

    const result = await callTranslationProvider(dm.content, sourceLanguage, targetLanguage, "chat");

    if (!result.fallbackUsed) {
      await db.insert(messageTranslations).values({
        directMessageId: dm.id,
        sourceLanguage,
        targetLanguage,
        translatedText: result.translatedText,
        confidenceLevel: result.confidenceLevel,
        notes: result.notes,
        fallbackUsed: false,
        status: "success",
      }).onConflictDoNothing();
    }

    const conversationId = req.body?.conversationId;
    if (conversationId) {
      setImmediate(() => {
        broadcastTranslationUpdated({
          conversationId: String(conversationId),
          directMessageId: dm.id,
          status: result.fallbackUsed ? "failed" : "success",
          translatedText: result.fallbackUsed ? null : result.translatedText,
          fallbackUsed: result.fallbackUsed,
        });
      });
    }

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
  const userId = (req as any).user?.userId;
  const { id } = req.params;

  try {
    const [dm] = await db.select({ id: directMessages.id, content: directMessages.content, createdAt: directMessages.createdAt })
      .from(directMessages)
      .where(eq(directMessages.id, parseInt(id)))
      .limit(1);

    if (!dm) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "메시지를 찾을 수 없습니다." } });
      return;
    }

    await trackEvent({ eventName: "original_text_viewed", actorId: userId, props: { directMessageId: dm.id } });

    res.json({ ok: true, data: { messageId: dm.id, originalText: dm.content } });
  } catch (err) {
    console.error("[translations/original]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
