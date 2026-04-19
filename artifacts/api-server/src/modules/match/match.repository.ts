/**
 * modules/match/match.repository.ts
 *
 * Data access layer for swipe actions and matches.
 * All Drizzle queries for swipeLikes, swipePasses, matchesTable live here.
 * No business logic — only DB I/O.
 */

import { and, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import { db, users, userProfiles, swipeLikes, swipePasses, matchesTable, contactBlockHashes } from "@workspace/db";

export const matchRepository = {
  /**
   * IDs of real DB users that are blocked via the contact-block system.
   * Returns both directions:
   *  - Users whose phone_number_hash is in my contact_block_hashes (I blocked them)
   *  - Users who have my phone_number_hash in their contact_block_hashes (they blocked me)
   */
  async getContactBlockedUserIds(viewerId: number): Promise<number[]> {
    // My phone hash (to find people who blocked me)
    const [myRow] = await db
      .select({ phoneNumberHash: users.phoneNumberHash })
      .from(users)
      .where(eq(users.id, viewerId));
    const myHash = myRow?.phoneNumberHash ?? null;

    // Hashes I've uploaded (to find people I've blocked)
    const myBlockHashes = await db
      .select({ phoneHash: contactBlockHashes.phoneHash })
      .from(contactBlockHashes)
      .where(eq(contactBlockHashes.userId, viewerId));
    const myHashList = myBlockHashes.map((h) => h.phoneHash);

    const blockedIds = new Set<number>();

    // Find users whose phone_number_hash I uploaded (I blocked them)
    if (myHashList.length > 0) {
      const blocked = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
          notInArray(users.id, [viewerId]),
          inArray(users.phoneNumberHash, myHashList)
        ));
      for (const r of blocked) blockedIds.add(r.id);
    }

    // Find users who have MY hash in their contact_block_hashes (they blocked me)
    if (myHash) {
      const blockedByOthers = await db
        .select({ userId: contactBlockHashes.userId })
        .from(contactBlockHashes)
        .where(eq(contactBlockHashes.phoneHash, myHash));
      for (const r of blockedByOthers) blockedIds.add(r.userId);
    }

    return Array.from(blockedIds);
  },

  /** IDs of users that `fromUserId` has already liked. */
  async getLikedUserIds(fromUserId: number): Promise<number[]> {
    const rows = await db
      .select({ id: swipeLikes.toUserId })
      .from(swipeLikes)
      .where(eq(swipeLikes.fromUserId, fromUserId));
    return rows.map((r) => r.id);
  },

  /** IDs of users that `fromUserId` has already passed. */
  async getPassedUserIds(fromUserId: number): Promise<number[]> {
    const rows = await db
      .select({ id: swipePasses.toUserId })
      .from(swipePasses)
      .where(eq(swipePasses.fromUserId, fromUserId));
    return rows.map((r) => r.id);
  },

  /**
   * Fetch real DB users not yet seen by `fromUserId`,
   * with at least one photo.
   */
  async getDiscoverPool(excludeIds: number[]) {
    const hasPhoto = sql`jsonb_array_length(${userProfiles.photos}) > 0`;
    const whereConditions = excludeIds.length > 0
      ? and(notInArray(users.id, excludeIds), hasPhoto)
      : and(hasPhoto);

    return db
      .select()
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(whereConditions);
  },

  /** Record a like. Idempotent (onConflictDoNothing). */
  async insertLike(fromUserId: number, toUserId: number) {
    await db
      .insert(swipeLikes)
      .values({ fromUserId, toUserId })
      .onConflictDoNothing();
  },

  /** Record a pass. Idempotent. */
  async insertPass(fromUserId: number, toUserId: number) {
    await db
      .insert(swipePasses)
      .values({ fromUserId, toUserId })
      .onConflictDoNothing();
  },

  /** Check whether `fromUserId` has liked `toUserId`. */
  async hasMutualLike(fromUserId: number, toUserId: number): Promise<boolean> {
    const [row] = await db
      .select()
      .from(swipeLikes)
      .where(and(eq(swipeLikes.fromUserId, toUserId), eq(swipeLikes.toUserId, fromUserId)))
      .limit(1);
    return !!row;
  },

  /** Find an existing match between two users (in either order). */
  async findExistingMatch(userAId: number, userBId: number) {
    const [row] = await db
      .select()
      .from(matchesTable)
      .where(
        or(
          and(eq(matchesTable.user1Id, userAId), eq(matchesTable.user2Id, userBId)),
          and(eq(matchesTable.user1Id, userBId), eq(matchesTable.user2Id, userAId))
        )
      )
      .limit(1);
    return row ?? null;
  },

  /** Create a new match row. Returns the created row. */
  async insertMatch(user1Id: number, user2Id: number) {
    const [row] = await db
      .insert(matchesTable)
      .values({ user1Id, user2Id })
      .onConflictDoNothing()
      .returning();
    return row ?? null;
  },

  /** All matches for a user (in either position). */
  async getMatchesForUser(userId: number) {
    return db
      .select()
      .from(matchesTable)
      .where(or(eq(matchesTable.user1Id, userId), eq(matchesTable.user2Id, userId)));
  },

  /** Fetch a user + profile by numeric ID. */
  async getUserWithProfile(userId: number) {
    const [row] = await db
      .select()
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  },

  /** Delete all likes FROM a user (used in reset). */
  async deleteLikesFrom(fromUserId: number) {
    await db.delete(swipeLikes).where(eq(swipeLikes.fromUserId, fromUserId));
  },

  /** Delete all passes FROM a user (used in reset). */
  async deletePassesFrom(fromUserId: number) {
    await db.delete(swipePasses).where(eq(swipePasses.fromUserId, fromUserId));
  },
};
