/**
 * modules/interest/participant.repository.ts
 *
 * Data access layer for conversation_participants.
 * Used by ws.ts (join auth) and interest.worker.ts (participant resolution).
 * No business logic — only DB I/O.
 */

import { and, eq } from "drizzle-orm";
import { db, conversationParticipants } from "@workspace/db";

export const participantRepository = {
  /**
   * Check if a user is a participant of a conversation.
   */
  async isParticipant(conversationId: string, userId: number): Promise<boolean> {
    const rows = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);
    return rows.length > 0;
  },

  /**
   * Return all participant userIds for a conversation.
   */
  async getParticipants(conversationId: string): Promise<number[]> {
    const rows = await db
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));
    return rows.map((r) => r.userId);
  },

  /**
   * Add a single participant to a conversation.
   * ON CONFLICT DO NOTHING — idempotent.
   */
  async addParticipant(
    conversationId: string,
    userId: number,
    membershipSource: string = "system"
  ): Promise<void> {
    await db
      .insert(conversationParticipants)
      .values({ conversationId, userId, membershipSource })
      .onConflictDoNothing();
  },

  /**
   * Seed multiple participants for a conversation at once.
   * ON CONFLICT DO NOTHING — idempotent.
   */
  async seedParticipants(
    conversationId: string,
    userIds: number[],
    membershipSource: string = "system"
  ): Promise<void> {
    if (userIds.length === 0) return;
    await db
      .insert(conversationParticipants)
      .values(userIds.map((userId) => ({ conversationId, userId, membershipSource })))
      .onConflictDoNothing();
  },
};
