// ─────────────────────────────────────────────────────────────────────────────
// services/prsScoring.ts
//
// Client-side PRS orchestrator.
//
// Responsibility: Bridge between the mobile app and the scoring API.
//  1. Calls extractInterestFeatureWindow() from prsSignals.ts
//  2. Attaches identity metadata (myUserId, partnerUserId)
//  3. POSTs the feature window to POST /api/ai/prs
//  4. Returns a typed ConversationInterestSnapshot
//
// Design:
//  • No scoring logic here — all formula work happens in lib/prsScoring.ts (server).
//  • This file is the ONLY place that knows the API endpoint path.
//  • Errors are surfaced, not silently swallowed — callers decide how to handle them.
//  • A local in-memory cache prevents redundant API calls within the same session.
// ─────────────────────────────────────────────────────────────────────────────

import { extractInterestFeatureWindow } from "./prsSignals";
import type {
  Message,
  ConversationInterestSnapshot,
  LowConfidenceState,
  PenaltyFeatures,
  ReasonCode,
} from "../types";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PRSOrchestrationInput {
  messages: Message[];
  conversationId: string;
  myUserId: string;
  partnerUserId: string;
  myCountry: "KR" | "JP";
  partnerCountry: "KR" | "JP";
  viewerLang: "ko" | "ja";
  /** Replit dev domain base URL (e.g. https://xxx.replit.dev). No trailing slash. */
  apiBase: string;
  /** JWT access token — required for authenticated PRS API calls */
  token?: string;
}

/** Lightweight result when the score should not be shown to the user. */
export interface PRSNotReady {
  ready: false;
  lowConfidenceState: Exclude<LowConfidenceState, null>;
  /** Localised explanation string for the user */
  reasonText: string;
}

export type PRSOutcome =
  | ({ ready: true } & ConversationInterestSnapshot)
  | PRSNotReady;

// ── In-memory cache ───────────────────────────────────────────────────────────
// Keyed by conversationId. Cache is invalidated whenever the message count
// changes by more than CACHE_STALE_THRESHOLD.

const CACHE_STALE_THRESHOLD = 3; // re-compute after 3 new messages

interface CacheEntry {
  snapshot: ConversationInterestSnapshot;
  messageCount: number;
  cachedAt: number;
}

const _snapshotCache = new Map<string, CacheEntry>();

function isCacheFresh(entry: CacheEntry, currentMessageCount: number): boolean {
  const stale = currentMessageCount - entry.messageCount >= CACHE_STALE_THRESHOLD;
  const tooOld = Date.now() - entry.cachedAt > 5 * 60_000; // 5 min TTL
  return !stale && !tooOld;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function localiseNotReadyReason(
  state: Exclude<LowConfidenceState, null>,
  lang: "ko" | "ja"
): string {
  const table: Record<Exclude<LowConfidenceState, null>, { ko: string; ja: string }> = {
    not_enough_data: {
      ko: "아직 대화가 충분하지 않아요. 더 대화를 나눠보세요.",
      ja: "まだ会話が十分ではありません。もう少し話してみましょう。",
    },
    low_confidence_hidden_score: {
      ko: "아직 신호가 불확실해요. 조금 더 대화해 보세요.",
      ja: "まだシグナルが不確かです。もう少し会話してみましょう。",
    },
    mixed_signals: {
      ko: "긍정적인 신호와 불확실한 신호가 함께 보여요.",
      ja: "ポジティブなシグナルと不確かなシグナルが混在しています。",
    },
  };
  return table[state][lang];
}

// ── Main orchestrator ─────────────────────────────────────────────────────────

/**
 * getConversationInterestSnapshot
 *
 * Extracts features from the message list, posts them to the scoring API, and
 * returns either a ready ConversationInterestSnapshot or a PRSNotReady result.
 *
 * Flow:
 *  1. Check cache (by conversationId + message count)
 *  2. extractInterestFeatureWindow(messages, calibration, MY_ID)
 *  3. Attach identity fields (myUserId, partnerUserId)
 *  4. POST /api/ai/prs with featureWindow + viewerLang
 *  5. Parse response → ConversationInterestSnapshot
 *  6. Check lowConfidenceState → return PRSOutcome
 *  7. Cache the result
 */
export async function getConversationInterestSnapshot(
  input: PRSOrchestrationInput
): Promise<PRSOutcome> {
  const {
    messages,
    conversationId,
    myUserId,
    partnerUserId,
    myCountry,
    partnerCountry,
    viewerLang,
    apiBase,
    token,
  } = input;

  // Step 1: Cache check
  const cached = _snapshotCache.get(conversationId);
  if (cached && isCacheFresh(cached, messages.length)) {
    return toOutcome(cached.snapshot);
  }

  // Step 2: Feature extraction (client-side, pure)
  // Signature: (messages, conversationId, myUserId, partnerUserId, myCountry, partnerCountry)
  const featureWindow = extractInterestFeatureWindow(
    messages,
    conversationId,
    myUserId,
    partnerUserId,
    myCountry,
    partnerCountry
  );

  // Step 3: Attach identity metadata
  const enrichedFeatureWindow = {
    ...featureWindow,
    myUserId,
    partnerUserId,
    conversationId,
    timeWindowEnd: new Date().toISOString(),
    timeWindowStart:
      messages.length > 0
        ? new Date(messages[0].createdAt).toISOString()
        : new Date().toISOString(),
  };

  // Step 4: POST to scoring API
  const endpoint = `${apiBase}/api/ai/prs`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      featureWindow: enrichedFeatureWindow,
      viewerLang,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`[prsScoring] API error ${response.status}: ${body}`);
  }

  // Step 5: Parse snapshot
  const raw = (await response.json()) as Record<string, unknown>;

  const snapshot: ConversationInterestSnapshot = {
    conversationId: String(raw.conversationId ?? conversationId),
    myUserId: String(raw.myUserId ?? myUserId),
    partnerUserId: String(raw.partnerUserId ?? partnerUserId),
    stage: (raw.stage as ConversationInterestSnapshot["stage"]) ?? "opening",
    prsScore: typeof raw.prsScore === "number" ? raw.prsScore : (raw.prs as number ?? 0),
    confidenceScore: typeof raw.confidenceScore === "number" ? raw.confidenceScore : (raw.confidence as number ?? 0),
    lowConfidenceState: (raw.lowConfidenceState as LowConfidenceState) ?? null,
    featureBreakdown: (raw.featureBreakdown as ConversationInterestSnapshot["featureBreakdown"]) ?? {
      responsiveness: 0.5,
      reciprocity: 0.5,
      linguistic: 0.5,
      temporal: 0.5,
      warmth: 0.5,
      progression: 0.5,
      penaltyTotal: 0,
    },
    penaltyBreakdown: (raw.penaltyBreakdown as PenaltyFeatures) ?? {
      earlyOversharePenalty: 0,
      selfPromotionPenalty: 0,
      genericTemplatePenalty: 0,
      nonContingentTopicSwitchPenalty: 0,
      scamRiskPenalty: 0,
    },
    reasonCodes: Array.isArray(raw.reasonCodes) ? (raw.reasonCodes as ReasonCode[]) : [],
    generatedInsights: Array.isArray(raw.generatedInsights)
      ? (raw.generatedInsights as ConversationInterestSnapshot["generatedInsights"])
      : [],
    generatedAt: String(raw.generatedAt ?? raw.computedAt ?? new Date().toISOString()),
    modelVersion: String(raw.modelVersion ?? "1.0.0"),
  };

  // Step 6 & 7: Cache and return
  _snapshotCache.set(conversationId, {
    snapshot,
    messageCount: messages.length,
    cachedAt: Date.now(),
  });

  return toOutcome(snapshot, viewerLang);
}

function toOutcome(
  snapshot: ConversationInterestSnapshot,
  viewerLang: "ko" | "ja" = "ko"
): PRSOutcome {
  if (snapshot.lowConfidenceState !== null) {
    return {
      ready: false,
      lowConfidenceState: snapshot.lowConfidenceState,
      reasonText: localiseNotReadyReason(snapshot.lowConfidenceState, viewerLang),
    };
  }
  return { ready: true, ...snapshot };
}

// ── Cache management utilities ────────────────────────────────────────────────

/** Invalidate the cached snapshot for a specific conversation. */
export function invalidatePRSCache(conversationId: string): void {
  _snapshotCache.delete(conversationId);
}

/** Clear the entire in-memory cache (e.g. on logout). */
export function clearPRSCache(): void {
  _snapshotCache.clear();
}

/** Peek at a cached snapshot without re-fetching (for UI optimistic display). */
export function getCachedSnapshot(
  conversationId: string
): ConversationInterestSnapshot | null {
  return _snapshotCache.get(conversationId)?.snapshot ?? null;
}
