/**
 * modules/interest/interest.service.ts
 *
 * Orchestrates the PRS (Partner Receptivity Score) pipeline:
 *  1. Calls the LLM to extract three semantic features heuristics cannot capture
 *     (warmth, authenticity, linguisticMatch) from recent partner messages.
 *  2. Delegates ALL scoring formula logic to core/prsScoring.ts (pure, deterministic).
 *  3. Records a telemetry event via infra/analytics.ts.
 *
 * Design rules:
 *  - NO formula logic here. This is an orchestrator only.
 *  - LLM is a semantic feature extractor, NOT the final decision maker.
 *  - Falls back to neutral (0.5) scores on any LLM failure — never throws.
 */

import { openai } from "../../infra/openai.js";
import {
  generateConversationInterestSnapshot,
  computeConfidenceScore,
  type SemanticScores,
} from "../../lib/prsScoring.js";
import { trackPrsEvent, type LocalePair } from "../../infra/analytics.js";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type PrsInput = {
  featureWindow: Record<string, unknown>;
  viewerLang?: "ko" | "ja";
};

export type PrsResult = {
  snapshot: ReturnType<typeof generateConversationInterestSnapshot>;
  confidenceScore: number;
  localePair: string;
};

/**
 * extractSemanticScores
 *
 * Calls GPT-4.1-mini to score three features of recent partner messages.
 * Returns neutral defaults (0.5) on any error — never throws.
 */
async function extractSemanticScores(
  featureWindow: Record<string, unknown>,
  lang: "ko" | "ja",
  localePair: string
): Promise<SemanticScores> {
  const recentMsgs = Array.isArray(featureWindow.recentMessages)
    ? (featureWindow.recentMessages as Array<{ sender: string; text: string }>)
        .slice(-8)
        .map((m) => `${m.sender === "me" ? "Me" : "Partner"}: ${m.text}`)
        .join("\n")
    : "";

  const semanticPrompt = `You are analyzing a conversation on a Korean-Japanese dating app.
Locale pair: ${localePair}. Language for reasoning: ${lang === "ko" ? "Korean" : "Japanese"}.

Return ONLY a JSON object (no markdown, no explanation) with these three fields:
- warmth: float 0.0-1.0 (how warm, kind, and emotionally supportive is the PARTNER's language?)
- authenticity: float 0.0-1.0 (how specific and genuine is the PARTNER's writing vs generic/template-like?)
- linguisticMatch: float 0.0-1.0 (how much does the PARTNER adapt their style/length/tone to mirror the other person?)

IMPORTANT:
- Score the PARTNER's messages only (lines starting with "Partner:")
- 0.0 = very low, 0.5 = neutral/unknown, 1.0 = very high
- Output ONLY the JSON object

Conversation:
${recentMsgs || "(no messages yet)"}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-mini",
      max_completion_tokens: 60,
      messages: [
        { role: "system", content: semanticPrompt },
        { role: "user", content: "Return the JSON scores:" },
      ],
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";
    const parsed = JSON.parse(
      raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim()
    ) as Record<string, unknown>;

    return {
      warmth: typeof parsed.warmth === "number" ? clamp01(parsed.warmth) : 0.5,
      authenticity: typeof parsed.authenticity === "number" ? clamp01(parsed.authenticity) : 0.5,
      linguisticMatch: typeof parsed.linguisticMatch === "number" ? clamp01(parsed.linguisticMatch) : 0.5,
    };
  } catch (e) {
    console.warn("[interest.service] LLM semantic extraction failed, using defaults:", e);
    return { warmth: 0.5, authenticity: 0.5, linguisticMatch: 0.5 };
  }
}

/**
 * computePrs
 *
 * Full PRS pipeline: semantic extraction → scoring → telemetry.
 * Returns the snapshot and confidence score.
 */
export async function computePrs(input: PrsInput): Promise<PrsResult> {
  const { featureWindow, viewerLang = "ko" } = input;

  const localePair = String(
    (featureWindow.translation as Record<string, unknown>)?.localePair ?? "KR-JP"
  );

  const semanticScores = await extractSemanticScores(featureWindow, viewerLang, localePair);
  const snapshot = generateConversationInterestSnapshot(featureWindow, semanticScores);
  const { score: confidenceScore } = computeConfidenceScore(featureWindow);

  // ── Telemetry ──────────────────────────────────────────────────────────────
  const hasScamSignal = snapshot.reasonCodes.includes("SCAM_RISK_DETECTED");
  const hasProgressionSignal =
    snapshot.reasonCodes.includes("CALL_DATE_SIGNAL") ||
    snapshot.reasonCodes.includes("AVAILABILITY_SHARED");
  const translationRate = Number(
    (featureWindow.translation as Record<string, unknown>)?.translatedMessageRate ?? 1
  );

  trackPrsEvent({
    kind: "interest_snapshot_generated",
    ts: Date.now(),
    conversationId: snapshot.conversationId,
    modelVersion: "v1.1",
    featureVersion: "v1",
    prsScore: snapshot.prsScore,
    confidenceScore,
    stage: snapshot.stage as "opening" | "discovery" | "escalation",
    localePair: localePair as LocalePair,
    lowConfidenceState: snapshot.lowConfidenceState,
    reasonCodeCount: snapshot.reasonCodes.length,
    hasScamSignal,
    hasProgressionSignal,
    translationRate,
  });

  if (hasScamSignal) {
    trackPrsEvent({
      kind: "scam_penalty_triggered",
      ts: Date.now(),
      conversationId: snapshot.conversationId,
      modelVersion: "v1.1",
      scamRiskPenalty: Number(
        (featureWindow.penalties as Record<string, unknown>)?.scamRiskPenalty ?? 0
      ),
    });
  }

  if (translationRate < 0.4) {
    trackPrsEvent({
      kind: "translation_reliability_low",
      ts: Date.now(),
      conversationId: snapshot.conversationId,
      modelVersion: "v1.1",
      translatedRate: translationRate,
      localePair: localePair as LocalePair,
    });
  }

  if (snapshot.lowConfidenceState === "mixed_signals") {
    trackPrsEvent({ kind: "mixed_signals_detected", ts: Date.now(), conversationId: snapshot.conversationId, modelVersion: "v1.1" });
  }

  if (snapshot.lowConfidenceState === "low_confidence_hidden_score") {
    trackPrsEvent({ kind: "low_confidence_hidden_score", ts: Date.now(), conversationId: snapshot.conversationId, modelVersion: "v1.1" });
  }

  return { snapshot, confidenceScore, localePair };
}
