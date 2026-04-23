/**
 * modules/coaching/coaching.router.ts
 *
 * HTTP transport layer for AI coaching and language features.
 * Validates requests, delegates to coachingService, returns responses.
 * No LLM calls or business logic here.
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, creditWallets, aiConsents, aiLedger } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { aiRateLimit } from "../../middleware/aiRateLimit.js";
import { trackEvent } from "../../infra/canonicalAnalytics.js";
import {
  suggestReply,
  translate,
  coach,
  personaReply,
  conversationStarter,
  generateProfilePhoto,
  PERSONA_PROMPTS,
} from "./coaching.service.js";

const router = Router();

const COACH_CREDIT_COST = 1;

/** 대화 코치 동의 확인 */
async function hasCoachConsent(userId: number): Promise<boolean> {
  const [consent] = await db.select().from(aiConsents)
    .where(and(
      eq(aiConsents.userId, userId),
      eq(aiConsents.featureType, "conversation_coach")
    ))
    .limit(1);
  return !!(consent?.granted && !consent.revokedAt);
}

/**
 * Trial-first credit deduction.
 * 성공 반환 후에만 호출할 것.
 * @returns consumption info
 */
async function debitCoachCredit(
  userId: number,
  featureType: "conversation_coach" | "profile_coach",
  refId: string
): Promise<{ consumption_source: "trial" | "paid"; trial_remaining: number; paid_remaining: number; remaining_total: number }> {
  const [wallet] = await db.select().from(creditWallets)
    .where(eq(creditWallets.userId, userId))
    .limit(1);

  const trialNow = wallet?.trialRemaining ?? 3;
  const paidNow = wallet?.balanceCache ?? 0;

  let newTrial = trialNow;
  let newPaid = paidNow;
  let source: "trial" | "paid";

  if (trialNow >= COACH_CREDIT_COST) {
    newTrial = trialNow - COACH_CREDIT_COST;
    source = "trial";
  } else {
    newPaid = Math.max(0, paidNow - COACH_CREDIT_COST);
    source = "paid";
  }

  const newBalance = newPaid;
  const now = new Date();

  if (!wallet) {
    await db.insert(creditWallets).values({
      userId,
      balanceCache: newPaid,
      trialRemaining: newTrial,
      updatedAt: now,
    });
  } else {
    await db.update(creditWallets)
      .set({ balanceCache: newPaid, trialRemaining: newTrial, updatedAt: now })
      .where(eq(creditWallets.userId, userId));
  }

  await db.insert(aiLedger).values({
    userId,
    entryType: "debit",
    credits: COACH_CREDIT_COST,
    featureType,
    referenceId: refId,
    balanceAfter: newBalance,
  });

  return {
    consumption_source: source,
    trial_remaining: newTrial,
    paid_remaining: newPaid,
    remaining_total: newTrial + newPaid,
  };
}

// Rate-limit all /ai/* paths
router.use((req, res, next) => {
  if (req.path.startsWith("/ai/")) return aiRateLimit(req, res, next);
  next();
});

/**
 * POST /api/ai/suggest-reply
 * Body: { messages, targetLang?, count? }
 * Response: { suggestion: string, suggestions: string[] }
 */
router.post("/ai/suggest-reply", async (req, res) => {
  try {
    const { messages, targetLang, count } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
      count?: number;
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    const suggestions = await suggestReply({ messages, targetLang, count });
    res.json({ suggestion: suggestions[0], suggestions });
  } catch (err) {
    console.error("[coaching] /ai/suggest-reply error:", err);
    if (err instanceof Error && err.message === "NO_SUGGESTIONS_GENERATED") {
      res.status(500).json({ error: "No suggestion generated" });
      return;
    }
    res.status(500).json({ error: "Failed to generate suggestion" });
  }
});

/**
 * POST /api/ai/translate
 * Body: { text, sourceLang, viewerLang }
 * Response: { translation: string, pronunciation: string }
 */
router.post("/ai/translate", async (req, res) => {
  try {
    const { text, sourceLang, viewerLang } = req.body as {
      text: string;
      sourceLang: "ko" | "ja";
      viewerLang: "ko" | "ja";
    };

    if (!text || !sourceLang || !viewerLang) {
      res.status(400).json({ error: "text, sourceLang, and viewerLang are required" });
      return;
    }

    const result = await translate({ text, sourceLang, viewerLang });
    res.json(result);
  } catch (err) {
    console.error("[coaching] /ai/translate error:", err);
    if (err instanceof Error && err.message === "NO_TRANSLATION_GENERATED") {
      res.status(500).json({ error: "No translation generated" });
      return;
    }
    res.status(500).json({ error: "Failed to translate" });
  }
});

/**
 * POST /api/ai/coach
 * Body: { messages, targetLang?, uiLang?, prsContext? }
 * Response: { summary, tones, charged, consumption_source, consumption_applied, trial_remaining, paid_remaining, remaining_total }
 *
 * Blocks:
 *  - no_consent      → { blocked: true, block_reason: "no_consent" }
 *  - zero_credit     → { blocked: true, block_reason: "zero_credit" }
 */
router.post("/ai/coach", requireAuth, async (req, res) => {
  const userId = (req as any).user?.userId;
  try {
    // 1. consent 확인
    const consent = await hasCoachConsent(userId);
    if (!consent) {
      await trackEvent({ eventName: "coach_blocked_no_consent", actorId: userId });
      res.json({ ok: true, data: { blocked: true, block_reason: "no_consent" } });
      return;
    }

    // 2. 크레딧 잔액 확인
    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);
    const trialNow = wallet?.trialRemaining ?? 3;
    const paidNow = wallet?.balanceCache ?? 0;
    if (trialNow + paidNow < COACH_CREDIT_COST) {
      await trackEvent({ eventName: "coach_blocked_zero_credit", actorId: userId });
      res.json({
        ok: true,
        data: {
          blocked: true,
          block_reason: "zero_credit",
          trial_remaining: trialNow,
          paid_remaining: paidNow,
          remaining_total: 0,
        }
      });
      return;
    }

    // 3. 요청 유효성
    const { messages, targetLang, uiLang, prsContext } = req.body as {
      messages: Array<{ sender: string; text: string }>;
      targetLang?: "ko" | "ja";
      uiLang?: "ko" | "ja";
      prsContext?: Record<string, unknown> | null;
    };
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages array is required" });
      return;
    }

    // 4. AI 호출
    const result = await coach({ messages, targetLang, uiLang, prsContext });

    // 5. 성공 시에만 차감 (trial first)
    const refId = `conv_coach_${userId}_${Date.now()}`;
    const consumption = await debitCoachCredit(userId, "conversation_coach", refId);

    await trackEvent({
      eventName: "coach_conv_success",
      actorId: userId,
      props: {
        consumption_source: consumption.consumption_source,
        remaining_total: consumption.remaining_total,
      }
    });

    res.json({
      ...result,
      charged: true,
      consumption_applied: COACH_CREDIT_COST,
      consumption_source: consumption.consumption_source,
      trial_remaining: consumption.trial_remaining,
      paid_remaining: consumption.paid_remaining,
      remaining_total: consumption.remaining_total,
    });
  } catch (err) {
    console.error("[coaching] /ai/coach error:", err);
    if (err instanceof Error) {
      if (err.message === "MALFORMED_COACH_RESPONSE") {
        res.status(500).json({ error: "Failed to parse coaching response" });
        return;
      }
      if (err.message === "INVALID_COACH_SHAPE") {
        res.status(500).json({ error: "Malformed coaching response from AI" });
        return;
      }
    }
    res.status(500).json({ error: "Failed to generate coaching" });
  }
});

/**
 * POST /api/ai/persona
 * Body: { personaId, history, myLanguage }
 * Response: { reply: string }
 */
router.post("/ai/persona", async (req, res) => {
  try {
    const { personaId, history, myLanguage } = req.body as {
      personaId: string;
      history: { role: "user" | "assistant"; text: string }[];
      myLanguage: "ko" | "ja";
    };

    if (!PERSONA_PROMPTS[personaId]) {
      res.status(400).json({ error: `Unknown personaId: ${personaId}` });
      return;
    }

    const reply = await personaReply({ personaId, history, myLanguage });
    res.json({ reply });
  } catch (err) {
    console.error("[coaching] /ai/persona error:", err);
    res.status(500).json({ error: "Failed to generate persona reply" });
  }
});

/**
 * POST /api/ai/conversation-starter
 * Body: { myLang?, theirProfile }
 * Response: { starters: string[] }
 */
router.post("/ai/conversation-starter", async (req, res) => {
  try {
    const { myLang, theirProfile } = req.body as {
      myLang?: "ko" | "ja";
      theirProfile?: {
        nickname?: string;
        bio?: string;
        interests?: string[];
        country?: string;
      };
    };

    if (!theirProfile) {
      res.status(400).json({ error: "theirProfile is required" });
      return;
    }

    const starters = await conversationStarter({ myLang, theirProfile });
    res.json({ starters });
  } catch (err) {
    console.error("[coaching] /ai/conversation-starter error:", err);
    if (err instanceof Error && err.message === "NO_STARTERS_GENERATED") {
      res.status(500).json({ error: "No starters generated" });
      return;
    }
    res.status(500).json({ error: "Failed to generate conversation starters" });
  }
});

/**
 * POST /api/ai/generate-profile-photo
 * Body: { photos: string[] }  — base64-encoded images (1–5)
 * Response: { photo: string } — base64-encoded PNG
 */
router.post("/ai/generate-profile-photo", async (req, res) => {
  try {
    const { photos } = req.body as { photos: string[] };

    if (!Array.isArray(photos) || photos.length < 1) {
      res.status(400).json({ error: "Provide at least 1 face photo" });
      return;
    }
    if (photos.length > 5) {
      res.status(400).json({ error: "Maximum 5 photos allowed" });
      return;
    }

    const photo = await generateProfilePhoto({ photos });
    res.json({ photo });
  } catch (err) {
    console.error("[coaching] /ai/generate-profile-photo error:", err);
    res.status(500).json({ error: "Failed to generate profile photo" });
  }
});

export default router;
