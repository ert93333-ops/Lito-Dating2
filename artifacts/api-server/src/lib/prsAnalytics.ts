// ─────────────────────────────────────────────────────────────────────────────
// lib/prsAnalytics.ts
//
// PRS Telemetry & Analytics — in-memory event logger.
//
// Architecture:
//  • Pure in-memory ring buffer (max 1000 events). No database dependency.
//  • `trackPrsEvent(event)` — call from route handlers after every snapshot.
//  • `getAggregates()` — called by the admin debug API to return distributions.
//  • `getRecentEvents(n)` — returns last N raw events for admin inspection.
//
// v2 upgrade path:
//  • Replace ring buffer with a persistent write to Postgres or a log service.
//  • Add per-user and per-conversation indexing.
//  • Stream events to a time-series store for trend analysis.
// ─────────────────────────────────────────────────────────────────────────────

// ── Event types ───────────────────────────────────────────────────────────────

export type PrsEventKind =
  | "interest_snapshot_generated"
  | "prs_score_bucket_assigned"
  | "confidence_score_bucket_assigned"
  | "low_confidence_hidden_score"
  | "stage_detected"
  | "reason_code_generated"
  | "coaching_suggestion_generated"
  | "interest_snapshot_refresh_triggered"
  | "scam_penalty_triggered"
  | "translation_reliability_low"
  | "mixed_signals_detected";

export type PrsBucket = "0-19" | "20-39" | "40-59" | "60-79" | "80-100";
export type CsBucket  = "0-34" | "35-49" | "50-74" | "75-100";
export type ConversationStage = "opening" | "discovery" | "escalation";
export type LocalePair = "KR-KR" | "KR-JP" | "JP-KR" | "JP-JP";

export interface PrsEventBase {
  kind: PrsEventKind;
  ts: number;
  conversationId: string;
  modelVersion: string;
}

export interface SnapshotGeneratedEvent extends PrsEventBase {
  kind: "interest_snapshot_generated";
  prsScore: number;
  confidenceScore: number;
  stage: ConversationStage;
  localePair: LocalePair;
  lowConfidenceState: string | null;
  reasonCodeCount: number;
  hasScamSignal: boolean;
  hasProgressionSignal: boolean;
  translationRate: number;
  featureVersion: string;
}

export interface StageBucketEvent extends PrsEventBase {
  kind: "stage_detected";
  stage: ConversationStage;
}

export interface ScamEvent extends PrsEventBase {
  kind: "scam_penalty_triggered";
  scamRiskPenalty: number;
}

export interface TranslationLowEvent extends PrsEventBase {
  kind: "translation_reliability_low";
  translatedRate: number;
  localePair: LocalePair;
}

export type PrsEvent =
  | SnapshotGeneratedEvent
  | StageBucketEvent
  | ScamEvent
  | TranslationLowEvent
  | (PrsEventBase & { kind: Exclude<PrsEventKind, "interest_snapshot_generated" | "stage_detected" | "scam_penalty_triggered" | "translation_reliability_low"> });

// ── Ring buffer ───────────────────────────────────────────────────────────────

const MAX_EVENTS = 1000;
const _events: PrsEvent[] = [];

export function trackPrsEvent(event: PrsEvent): void {
  _events.push(event);
  if (_events.length > MAX_EVENTS) _events.shift();
  // Structured log line — parseable by any log aggregator (Datadog, Cloudwatch, etc.)
  console.log(`[prs:telemetry] ${JSON.stringify(event)}`);
}

export function getRecentEvents(n = 50): PrsEvent[] {
  return _events.slice(-n);
}

// ── Bucket helpers ────────────────────────────────────────────────────────────

export function prsBucket(score: number): PrsBucket {
  if (score < 20) return "0-19";
  if (score < 40) return "20-39";
  if (score < 60) return "40-59";
  if (score < 80) return "60-79";
  return "80-100";
}

export function csBucket(score: number): CsBucket {
  if (score < 35) return "0-34";
  if (score < 50) return "35-49";
  if (score < 75) return "50-74";
  return "75-100";
}

// ── Aggregate computation ─────────────────────────────────────────────────────

export interface PrsAggregates {
  totalSnapshots: number;
  prsBuckets: Record<PrsBucket, number>;
  csBuckets: Record<CsBucket, number>;
  stageDistribution: Record<ConversationStage, number>;
  localePairDistribution: Record<string, number>;
  pctHiddenScore: number;
  pctMixedSignals: number;
  pctProgressionSignal: number;
  pctScamPenalty: number;
  pctTranslationLow: number;
  avgPrs: number;
  avgCs: number;
  computedAt: string;
}

export function getAggregates(): PrsAggregates {
  const snaps = _events.filter(
    (e): e is SnapshotGeneratedEvent => e.kind === "interest_snapshot_generated"
  );

  const total = snaps.length;

  const prsBuckets: Record<PrsBucket, number> = { "0-19": 0, "20-39": 0, "40-59": 0, "60-79": 0, "80-100": 0 };
  const csBuckets: Record<CsBucket, number>   = { "0-34": 0, "35-49": 0, "50-74": 0, "75-100": 0 };
  const stageDistribution: Record<ConversationStage, number> = { opening: 0, discovery: 0, escalation: 0 };
  const localePairDistribution: Record<string, number> = {};

  let hiddenCount = 0;
  let mixedCount = 0;
  let progressionCount = 0;
  let scamCount = 0;
  let translationLowCount = 0;
  let prsSum = 0;
  let csSum = 0;

  for (const s of snaps) {
    prsBuckets[prsBucket(s.prsScore)]++;
    csBuckets[csBucket(s.confidenceScore)]++;
    stageDistribution[s.stage]++;
    localePairDistribution[s.localePair] = (localePairDistribution[s.localePair] ?? 0) + 1;
    if (s.lowConfidenceState === "low_confidence_hidden_score") hiddenCount++;
    if (s.lowConfidenceState === "mixed_signals") mixedCount++;
    if (s.hasProgressionSignal) progressionCount++;
    if (s.hasScamSignal) scamCount++;
    if (s.translationRate < 0.4) translationLowCount++;
    prsSum += s.prsScore;
    csSum += s.confidenceScore;
  }

  const safe = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  return {
    totalSnapshots: total,
    prsBuckets,
    csBuckets,
    stageDistribution,
    localePairDistribution,
    pctHiddenScore: safe(hiddenCount),
    pctMixedSignals: safe(mixedCount),
    pctProgressionSignal: safe(progressionCount),
    pctScamPenalty: safe(scamCount),
    pctTranslationLow: safe(translationLowCount),
    avgPrs: total > 0 ? Math.round(prsSum / total) : 0,
    avgCs: total > 0 ? Math.round(csSum / total) : 0,
    computedAt: new Date().toISOString(),
  };
}
