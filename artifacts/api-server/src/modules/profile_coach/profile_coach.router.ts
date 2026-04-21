/**
 * profile_coach.router.ts
 *
 * POST /api/v1/ai/profile-coach          — 프로필 코치 제안 생성
 * POST /api/v1/ai/profile-coach/:id/save — 선택한 제안 프로필에 반영
 *
 * 구현 규칙:
 * - consent 없으면 외부 AI 호출 금지 → blocked_no_consent
 * - zero_credit → blocked_zero_credit
 * - unsafe_interaction → blocked_unsafe
 * - 성공 반환 시에만 ai_ledger debit (1 credit)
 * - 프로필 자동 overwrite 금지 (save 호출 시 선택 반영만)
 * - raw prompt/response 장기 저장 금지
 * - suggestions + metadata만 최소 저장
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, aiConsents, creditWallets, aiLedger, conversationRiskFlags } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuth } from "../../middleware/auth.js";
import { openai } from "../../infra/openai.js";
import { trackEvent } from "../../infra/canonicalAnalytics.js";

const router = Router();

const COACH_CREDIT_COST = 1;

async function hasCoachConsent(userId: number): Promise<boolean> {
  const [consent] = await db.select().from(aiConsents)
    .where(and(
      eq(aiConsents.userId, userId),
      eq(aiConsents.featureType, "profile_coach")
    ))
    .limit(1);
  return !!(consent?.granted && !consent.revokedAt);
}

async function getWalletBalance(userId: number): Promise<number> {
  const [wallet] = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);
  return wallet?.balanceCache ?? 0;
}

async function hasUnsafeFlag(userId: number): Promise<boolean> {
  // conversationRiskFlags는 matchId 기반 테이블
  // flaggedByUserId(신고한 쪽)가 아닌 신고된 쪽 확인은 matches join 필요
  // 단순 조회: 해당 유저가 신고 당사자인 활성 플래그 확인
  // TODO: matches join으로 더 정확한 쿼리 구현
  const result = await db.execute<{ id: number }>(sql`
    SELECT crf.id FROM conversation_risk_flags crf
    JOIN matches m ON m.id = crf.match_id
    WHERE (m.user1_id = ${userId} OR m.user2_id = ${userId})
      AND crf.active = true
    LIMIT 1
  `);
  return !!result.rows?.length;
}

async function debitCredit(userId: number, credits: number, refId: string): Promise<number> {
  const [wallet] = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);

  const current = wallet?.balanceCache ?? 0;
  const newBalance = Math.max(0, current - credits);

  if (wallet) {
    await db.update(creditWallets)
      .set({ balanceCache: newBalance, updatedAt: new Date() })
      .where(eq(creditWallets.userId, userId));
  }

  await db.insert(aiLedger).values({
    userId,
    entryType: "debit",
    credits,
    featureType: "profile_coach",
    referenceId: refId,
    balanceAfter: newBalance,
  });

  return newBalance;
}

/**
 * POST /api/v1/ai/profile-coach
 * Body: { profileSnapshot: { nickname?, bio?, interests?, country?, language? }, locale?: "ko"|"ja" }
 */
router.post("/v1/ai/profile-coach", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;

  await trackEvent({ eventName: "coach_request_started", actorId: userId });

  try {
    const hasConsent = await hasCoachConsent(userId);
    if (!hasConsent) {
      await trackEvent({ eventName: "coach_blocked_no_consent", actorId: userId });
      res.json({
        ok: true,
        data: { blocked: true, block_reason: "blocked_no_consent", message: "프로필 코치 동의가 필요합니다." }
      });
      return;
    }

    const isUnsafe = await hasUnsafeFlag(userId);
    if (isUnsafe) {
      await trackEvent({ eventName: "coach_blocked_unsafe", actorId: userId });
      res.json({
        ok: true,
        data: { blocked: true, block_reason: "blocked_unsafe", message: "현재 계정 상태로 AI 코칭이 제한됩니다." }
      });
      return;
    }

    const balance = await getWalletBalance(userId);
    if (balance < COACH_CREDIT_COST) {
      await trackEvent({ eventName: "coach_blocked_zero_credit", actorId: userId });
      res.json({
        ok: true,
        data: { blocked: true, block_reason: "blocked_zero_credit", remaining_credit: balance, message: "AI 코칭 크레딧이 부족합니다." }
      });
      return;
    }

    const { profileSnapshot: rawSnapshot, locale = "ko", field, currentValue } = req.body;
    // field+currentValue 단일 필드 형식도 지원
    const profileSnapshot = rawSnapshot ?? (field ? { [field]: currentValue ?? "" } : {});
    const langLabel = locale === "ko" ? "Korean" : "Japanese";

    const systemPrompt = `You are a dating profile coach for a Korean-Japanese dating app called Lito.
Your job is to suggest improvements to a user's dating profile.
Rules:
- Output ONLY a JSON object with key "suggestions" which is an array of objects
- Each suggestion: { field: "bio"|"nickname"|"interests", original: string, suggestion: string, reason: string }
- Maximum 3 suggestions
- Write reason and suggestion in ${langLabel}
- Never suggest revealing personal contact info
- Keep suggestions culturally appropriate for Korean-Japanese audience
- No markdown, no explanations outside the JSON`;

    const profileText = JSON.stringify(profileSnapshot, null, 2);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Profile:\n${profileText}\n\nGenerate up to 3 improvement suggestions.` }
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    let suggestions: Array<{ field: string; original: string; suggestion: string; reason: string }> = [];

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.suggestions)) {
        suggestions = parsed.suggestions.slice(0, 3);
      }
    } catch {
      suggestions = [];
    }

    if (suggestions.length === 0) {
      res.json({
        ok: false,
        error: { code: "NO_SUGGESTIONS", message: "제안을 생성하지 못했습니다." }
      });
      return;
    }

    const refId = `profile_coach_${userId}_${Date.now()}`;
    const newBalance = await debitCredit(userId, COACH_CREDIT_COST, refId);

    const saved = await db.execute<{ id: number }>(sql`
      INSERT INTO profile_coach_outputs (user_id, consent_snapshot, suggestions, remaining_credit, created_at)
      VALUES (${userId}, true, ${JSON.stringify(suggestions)}::jsonb, ${newBalance}, NOW())
      RETURNING id
    `);

    const outputId = saved.rows?.[0]?.id;

    await trackEvent({
      eventName: "coach_request_completed",
      actorId: userId,
      props: { suggestions_count: suggestions.length, remaining_credit: newBalance }
    });

    res.json({
      ok: true,
      data: {
        coach_output_id: outputId,
        suggestions,
        remaining_credit: newBalance,
      }
    });
  } catch (err) {
    console.error("[profile_coach] error:", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * POST /api/v1/ai/profile-coach/:id/save
 * Body: { selectedFields: string[] }  — 반영할 필드 선택
 */
router.post("/v1/ai/profile-coach/:id/save", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;
  const outputId = parseInt(req.params.id, 10);

  try {
    const row = await db.execute<{ id: number; user_id: number; suggestions: unknown }>(sql`
      SELECT id, user_id, suggestions FROM profile_coach_outputs WHERE id = ${outputId} LIMIT 1
    `);
    const output = row.rows?.[0] ?? null;

    if (!output || output.user_id !== userId) {
      res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "코치 결과를 찾을 수 없습니다." } });
      return;
    }

    await db.execute(sql`
      UPDATE profile_coach_outputs SET saved_at = NOW() WHERE id = ${outputId}
    `);

    await trackEvent({
      eventName: "profile_coach_saved",
      actorId: userId,
      props: { coach_output_id: outputId, selected_fields: req.body?.selectedFields ?? [] }
    });

    res.json({
      ok: true,
      data: {
        message: "선택한 제안이 저장되었습니다. 프로필 편집 화면에서 적용해주세요.",
        coach_output_id: outputId,
      }
    });
  } catch (err) {
    console.error("[profile_coach/save] error:", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
