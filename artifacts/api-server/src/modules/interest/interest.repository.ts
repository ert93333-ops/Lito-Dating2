/**
 * modules/interest/interest.repository.ts
 *
 * Data access layer for interest snapshots.
 * Handles insert/upsert for history + latest tables, and SELECT for read paths.
 * No business logic — only DB I/O.
 */

import { and, desc, eq } from "drizzle-orm";
import { db, interestSnapshots, latestInterestSnapshots } from "@workspace/db";
import type { ConversationInterestSnapshot } from "../../lib/prsScoring.js";

export type SnapshotWriteParams = {
  conversationId: string;
  viewerUserId: number;
  partnerUserId: number;
  snapshot: ConversationInterestSnapshot;
  llmEnriched: boolean;
  messageCount: number;
  sourceMessageIdMin: number | null;
  sourceMessageIdMax: number | null;
};

export const interestRepository = {
  /**
   * Insert a historical snapshot row (append-only).
   * Returns the new row's ID.
   */
  async insertSnapshot(params: SnapshotWriteParams): Promise<number> {
    const [row] = await db
      .insert(interestSnapshots)
      .values({
        conversationId: params.conversationId,
        viewerUserId: params.viewerUserId,
        partnerUserId: params.partnerUserId,
        prsScore: params.snapshot.prsScore,
        confidenceScore: params.snapshot.confidenceScore,
        stage: params.snapshot.stage,
        lowConfidenceState: params.snapshot.lowConfidenceState ?? null,
        reasonCodes: params.snapshot.reasonCodes,
        coachingCodes: [],
        coachingPayload: {},
        featureBreakdown: params.snapshot.featureBreakdown as unknown as Record<string, unknown>,
        penaltyBreakdown: params.snapshot.penaltyBreakdown as unknown as Record<string, unknown>,
        llmEnriched: params.llmEnriched,
        modelVersion: params.snapshot.modelVersion,
        messageCount: params.messageCount,
        sourceMessageIdMin: params.sourceMessageIdMin,
        sourceMessageIdMax: params.sourceMessageIdMax,
        computedAt: new Date(params.snapshot.generatedAt),
      })
      .returning({ id: interestSnapshots.id });
    return row.id;
  },

  /**
   * Upsert the latest snapshot for (conversationId, viewerUserId).
   * ON CONFLICT updates all mutable fields.
   */
  async upsertLatest(params: SnapshotWriteParams, snapshotId: number): Promise<void> {
    await db
      .insert(latestInterestSnapshots)
      .values({
        conversationId: params.conversationId,
        viewerUserId: params.viewerUserId,
        partnerUserId: params.partnerUserId,
        prsScore: params.snapshot.prsScore,
        confidenceScore: params.snapshot.confidenceScore,
        stage: params.snapshot.stage,
        lowConfidenceState: params.snapshot.lowConfidenceState ?? null,
        reasonCodes: params.snapshot.reasonCodes,
        coachingCodes: [],
        coachingPayload: {},
        featureBreakdown: params.snapshot.featureBreakdown as unknown as Record<string, unknown>,
        penaltyBreakdown: params.snapshot.penaltyBreakdown as unknown as Record<string, unknown>,
        llmEnriched: params.llmEnriched,
        modelVersion: params.snapshot.modelVersion,
        messageCount: params.messageCount,
        snapshotId,
        computedAt: new Date(params.snapshot.generatedAt),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [latestInterestSnapshots.conversationId, latestInterestSnapshots.viewerUserId],
        set: {
          partnerUserId: params.partnerUserId,
          prsScore: params.snapshot.prsScore,
          confidenceScore: params.snapshot.confidenceScore,
          stage: params.snapshot.stage,
          lowConfidenceState: params.snapshot.lowConfidenceState ?? null,
          reasonCodes: params.snapshot.reasonCodes,
          coachingCodes: [],
          coachingPayload: {},
          featureBreakdown: params.snapshot.featureBreakdown as unknown as Record<string, unknown>,
          penaltyBreakdown: params.snapshot.penaltyBreakdown as unknown as Record<string, unknown>,
          llmEnriched: params.llmEnriched,
          modelVersion: params.snapshot.modelVersion,
          messageCount: params.messageCount,
          snapshotId,
          computedAt: new Date(params.snapshot.generatedAt),
          updatedAt: new Date(),
        },
      });
  },

  /**
   * Fetch the latest snapshot for an authenticated viewer in a conversation.
   * Returns null if not found.
   */
  async getLatest(
    conversationId: string,
    viewerUserId: number
  ) {
    const rows = await db
      .select()
      .from(latestInterestSnapshots)
      .where(
        and(
          eq(latestInterestSnapshots.conversationId, conversationId),
          eq(latestInterestSnapshots.viewerUserId, viewerUserId)
        )
      )
      .limit(1);
    return rows[0] ?? null;
  },

  /**
   * Fetch historical snapshots for a viewer in a conversation, newest first.
   */
  async getHistory(
    conversationId: string,
    viewerUserId: number,
    limit = 20
  ) {
    return db
      .select()
      .from(interestSnapshots)
      .where(
        and(
          eq(interestSnapshots.conversationId, conversationId),
          eq(interestSnapshots.viewerUserId, viewerUserId)
        )
      )
      .orderBy(desc(interestSnapshots.createdAt))
      .limit(Math.min(limit, 50));
  },
};
