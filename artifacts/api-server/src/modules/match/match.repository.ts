/**
 * modules/match/match.repository.ts
 *
 * Data access layer for swipe actions and matches.
 * All Drizzle queries for swipeLikes, swipePasses, matchesTable live here.
 * No business logic — only DB I/O.
 */

import { and, eq, notInArray, or, sql } from "drizzle-orm";
import { db, users, userProfiles, swipeLikes, swipePasses, matchesTable } from "@workspace/db";

export const matchRepository = {
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
