/**
 * modules/interest/interest.worker.ts
 *
 * Async interest analysis worker.
 *
 * Responsibilities:
 *  - Debounce analysis requests per conversation (30-second window)
 *  - Resolve conversation participants from conversation_participants
 *  - Run directional feature extraction for each viewer direction
 *  - Orchestrate Layer 1 (deterministic) and Layer 2 (LLM, optional) scoring
 *  - Store history + latest snapshots
 *  - Deliver viewer-scoped WS updates via registered broadcast callback
 *
 * Design rules:
 *  - NEVER throws — all errors are logged and swallowed.
 *  - NEVER blocks the chat path — only called via setImmediate from ws.ts.
 *  - Single-instance MVP: in-memory state is not safe for multi-instance deploy.
 *  - LLM calls are guarded by llmCircuit and retried with exponential backoff.
 *
 * Deduplication:
 *  Skips history INSERT when all of the following are true:
 *    - abs(prsScore delta) < 3
 *    - stage unchanged
 *    - lowConfidenceState unchanged
 *    - reasonCodes hash unchanged
 *    - llmEnriched unchanged
 */

import crypto from "node:crypto";
import { chatRepository } from "../chat/chat.repository.js";
import { participantRepository } from "./participant.repository.js";
import { extractFeatureWindow } from "./feature.extractor.js";
import { computePrs } from "./interest.service.js";
import { interestRepository } from "./interest.repository.js";
import { llmCircuit } from "./llm.circuit.js";
import { generateConversationInterestSnapshot } from "../../lib/prsScoring.js";
import type { ConversationInterestSnapshot } from "../../lib/prsScoring.js";
import type { LatestInterestSnapshot } from "@workspace/db";

const DEBOUNCE_MS = 30_000;
const MIN_SNAPSHOT_AGE_MS = 30_000;
const LLM_RATE_LIMIT_MS = 2 * 60_000;
const MAX_MESSAGES = 50;
const MATERIAL_CHANGE_PRS_THRESHOLD = 3;
const LLM_MATERIAL_PRS_THRESHOLD = 5;

const NEUTRAL_SEMANTIC = { warmth: 0.5, authenticity: 0.5, linguisticMatch: 0.5 };

interface WorkerState {
  timerId: ReturnType<typeof setTimeout> | null;
  isRunning: boolean;
  pendingRun: boolean;
  latestMessageId: number;
  lastSnapshotAt: number;
  lastLlmCallAt: number;
}

const workerState = new Map<string, WorkerState>();

type BroadcastToViewerFn = (
  conversationId: string,
  viewerUserId: number,
  payload: unknown
) => void;

let broadcastToViewer: BroadcastToViewerFn = () => {};

/**
 * Register the WS broadcast function.
 * Called once from ws.ts during setup.
 */
export function registerBroadcast(fn: BroadcastToViewerFn): void {
  broadcastToViewer = fn;
}

function getOrCreateState(conversationId: string): WorkerState {
  if (!workerState.has(conversationId)) {
    workerState.set(conversationId, {
      timerId: null,
      isRunning: false,
      pendingRun: false,
      latestMessageId: 0,
      lastSnapshotAt: 0,
      lastLlmCallAt: 0,
    });
  }
  return workerState.get(conversationId)!;
}

/**
 * Schedule an analysis run for a conversation.
 * Called from ws.ts via setImmediate after message save — fire-and-forget.
 */
export function schedule(conversationId: string, messageId: number): void {
  const state = getOrCreateState(conversationId);
  state.latestMessageId = Math.max(state.latestMessageId, messageId);

  if (state.timerId !== null) clearTimeout(state.timerId);
  state.timerId = setTimeout(() => {
    void run(conversationId);
  }, DEBOUNCE_MS);
}

async function run(conversationId: string): Promise<void> {
  const state = getOrCreateState(conversationId);

  if (state.isRunning) {
    state.pendingRun = true;
    return;
  }

  if (Date.now() - state.lastSnapshotAt < MIN_SNAPSHOT_AGE_MS) {
    return;
  }

  state.isRunning = true;
  state.pendingRun = false;

  try {
    await doAnalysis(conversationId, state);
    state.lastSnapshotAt = Date.now();
  } catch (err) {
    console.error(`[interest.worker] analysis failed for ${conversationId}:`, err);
  } finally {
    state.isRunning = false;
    if (state.pendingRun) {
      state.pendingRun = false;
      void run(conversationId);
    }
  }
}

async function doAnalysis(conversationId: string, state: WorkerState): Promise<void> {
  const participants = await participantRepository.getParticipants(conversationId);
  if (participants.length < 2) {
    return;
  }

  const messages = await chatRepository.getMessages(conversationId);
  const sample = messages.slice(-MAX_MESSAGES);

  if (sample.length === 0) return;

  const llmAllowed = Date.now() - state.lastLlmCallAt >= LLM_RATE_LIMIT_MS;

  for (const viewerUserId of participants) {
    const partnerUserId = participants.find((id) => id !== viewerUserId);
    if (!partnerUserId) continue;

    await analyseOneDirection(
      conversationId,
      viewerUserId,
      partnerUserId,
      sample,
      state,
      llmAllowed
    );
  }

  if (llmAllowed) {
    state.lastLlmCallAt = Date.now();
  }
}

async function analyseOneDirection(
  conversationId: string,
  viewerUserId: number,
  partnerUserId: number,
  messages: Awaited<ReturnType<typeof chatRepository.getMessages>>,
  state: WorkerState,
  llmAllowed: boolean
): Promise<void> {
  const featureWindow = extractFeatureWindow(
    messages,
    viewerUserId,
    partnerUserId,
    conversationId
  );

  const sourceMin = featureWindow._sourceMessageIdMin as number | null;
  const sourceMax = featureWindow._sourceMessageIdMax as number | null;
  const messageCount = messages.slice(-50).length;

  const existingLatest = await interestRepository.getLatest(conversationId, viewerUserId);

  const layer1Snapshot = generateConversationInterestSnapshot(featureWindow, NEUTRAL_SEMANTIC);

  const isFirstSnapshot = existingLatest === null;
  const hasMaterialChange = isMaterialChange(layer1Snapshot, existingLatest, false);

  if (isFirstSnapshot || hasMaterialChange) {
    const snapshotId = await interestRepository.insertSnapshot({
      conversationId,
      viewerUserId,
      partnerUserId,
      snapshot: layer1Snapshot,
      llmEnriched: false,
      messageCount,
      sourceMessageIdMin: sourceMin,
      sourceMessageIdMax: sourceMax,
    });

    await interestRepository.upsertLatest(
      {
        conversationId,
        viewerUserId,
        partnerUserId,
        snapshot: layer1Snapshot,
        llmEnriched: false,
        messageCount,
        sourceMessageIdMin: sourceMin,
        sourceMessageIdMax: sourceMax,
      },
      snapshotId
    );

    console.log(
      `[interest.worker] layer1 stored conv=${conversationId} viewer=${viewerUserId} ` +
      `prs=${layer1Snapshot.prsScore} cs=${layer1Snapshot.confidenceScore} ` +
      `stage=${layer1Snapshot.stage}`
    );
  }

  if (!llmAllowed || !llmCircuit.isAllowed()) {
    if (isFirstSnapshot || hasMaterialChange) {
      deliverToViewer(conversationId, viewerUserId, layer1Snapshot, false);
    }
    return;
  }

  let layer2Delivered = false;

  try {
    const viewerLang = "ko";
    const enrichedResult = await withRetry(3, async () =>
      computePrs({ featureWindow, viewerLang })
    );

    llmCircuit.recordSuccess();

    const enrichedSnapshot = enrichedResult.snapshot;
    const isLayer2Material = isLlmMaterialChange(enrichedSnapshot, layer1Snapshot);

    if (isLayer2Material) {
      const enrichedSnapshotId = await interestRepository.insertSnapshot({
        conversationId,
        viewerUserId,
        partnerUserId,
        snapshot: enrichedSnapshot,
        llmEnriched: true,
        messageCount,
        sourceMessageIdMin: sourceMin,
        sourceMessageIdMax: sourceMax,
      });

      await interestRepository.upsertLatest(
        {
          conversationId,
          viewerUserId,
          partnerUserId,
          snapshot: enrichedSnapshot,
          llmEnriched: true,
          messageCount,
          sourceMessageIdMin: sourceMin,
          sourceMessageIdMax: sourceMax,
        },
        enrichedSnapshotId
      );

      deliverToViewer(conversationId, viewerUserId, enrichedSnapshot, true);
      layer2Delivered = true;

      console.log(
        `[interest.worker] layer2 stored conv=${conversationId} viewer=${viewerUserId} ` +
        `prs=${enrichedSnapshot.prsScore} cs=${enrichedSnapshot.confidenceScore}`
      );
    }
  } catch (err) {
    llmCircuit.recordFailure();
    console.error(
      `[interest.worker] layer2 failed conv=${conversationId} viewer=${viewerUserId}:`,
      err
    );
  }

  if (!layer2Delivered && (isFirstSnapshot || hasMaterialChange)) {
    deliverToViewer(conversationId, viewerUserId, layer1Snapshot, false);
  }
}

function deliverToViewer(
  conversationId: string,
  viewerUserId: number,
  snapshot: ConversationInterestSnapshot,
  llmEnriched: boolean
): void {
  try {
    broadcastToViewer(conversationId, viewerUserId, {
      type: "prs_update",
      conversationId,
      snapshot: {
        prsScore: snapshot.prsScore,
        confidenceScore: snapshot.confidenceScore,
        stage: snapshot.stage,
        lowConfidenceState: snapshot.lowConfidenceState,
        reasonCodes: snapshot.reasonCodes,
        generatedInsights: snapshot.generatedInsights,
        llmEnriched,
        computedAt: snapshot.generatedAt,
        modelVersion: snapshot.modelVersion,
      },
    });
  } catch (err) {
    console.error(`[interest.worker] WS delivery failed viewer=${viewerUserId}:`, err);
  }
}

function hashCodes(codes: string[]): string {
  const sorted = [...codes].sort();
  const unique = [...new Set(sorted)];
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(unique))
    .digest("hex")
    .slice(0, 8);
}

function isMaterialChange(
  next: ConversationInterestSnapshot,
  existing: LatestInterestSnapshot | null,
  llmEnriched: boolean
): boolean {
  if (!existing) return true;
  if (Math.abs(next.prsScore - existing.prsScore) >= MATERIAL_CHANGE_PRS_THRESHOLD) return true;
  if (next.stage !== existing.stage) return true;
  if ((next.lowConfidenceState ?? null) !== (existing.lowConfidenceState ?? null)) return true;

  const nextHash = hashCodes(next.reasonCodes);
  const existingHash = hashCodes(
    Array.isArray(existing.reasonCodes) ? (existing.reasonCodes as string[]) : []
  );
  if (nextHash !== existingHash) return true;

  if (!existing.llmEnriched && llmEnriched) return true;

  return false;
}

function isLlmMaterialChange(
  enriched: ConversationInterestSnapshot,
  base: ConversationInterestSnapshot
): boolean {
  if (Math.abs(enriched.prsScore - base.prsScore) >= LLM_MATERIAL_PRS_THRESHOLD) return true;
  if ((enriched.lowConfidenceState ?? null) !== (base.lowConfidenceState ?? null)) return true;
  if (enriched.stage !== base.stage) return true;
  if (hashCodes(enriched.reasonCodes) !== hashCodes(base.reasonCodes)) return true;
  return false;
}

async function withRetry<T>(
  maxAttempts: number,
  fn: () => Promise<T>
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts) {
        const delayMs = attempt * 1000 + (Math.random() * 600 - 300);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}
