/**
 * modules/match/match.service.ts
 *
 * Business logic for discover feed, swipe actions, and match creation.
 *
 * Responsibilities:
 *  - Discover pool assembly (real DB users + mock users, filter + sort)
 *  - Like / Pass recording
 *  - Mutual-like detection and match creation
 *  - In-memory state management for guest / mock-user interactions
 *
 * No direct DB imports — delegates to matchRepository.
 */

import { matchRepository } from "./match.repository.js";
import { buildServerUser } from "../user/user.service.js";
import { participantRepository } from "../interest/participant.repository.js";
import {
  AI_MOCK_USERS,
  DEMO_USERS,
  ALL_MOCK_USERS,
  guestLikes,
  guestPasses,
  guestMatches,
  type ServerUser,
} from "../../fixtures/mockUsers.js";

// ── Bilingual interest expansion ──────────────────────────────────────────────

const INTEREST_BILINGUAL: Array<[string, string]> = [
  ["여행", "旅行"], ["요리", "料理"], ["카페", "カフェ"], ["독서", "読書"],
  ["게임", "ゲーム"], ["애니메이션", "アニメ"], ["영화", "映画"], ["운동", "運動"],
  ["사진", "写真"], ["일본어", "日本語"], ["한국어", "韓国語"], ["음악", "音楽"],
  ["K-POP", "K-POP"], ["드라마", "ドラマ"], ["패션", "ファッション"],
];

function expandInterestTags(tags: string[]): string[] {
  const expanded = new Set<string>(tags.map((t) => t.toLowerCase()));
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    for (const [ko, ja] of INTEREST_BILINGUAL) {
      if (lower === ko.toLowerCase()) { expanded.add(ja.toLowerCase()); break; }
      if (lower === ja.toLowerCase()) { expanded.add(ko.toLowerCase()); break; }
    }
  }
  return Array.from(expanded);
}

type FilterOpts = {
  country: string;
  minAge: number;
  maxAge: number;
  langLevel: string;
  interests: string[];
};

function applyFilters(user: ServerUser, opts: FilterOpts): boolean {
  if (user.age < opts.minAge || user.age > opts.maxAge) return false;
  if (opts.country !== "all" && user.country !== opts.country) return false;
  if (opts.langLevel !== "all" && user.languageLevel !== opts.langLevel) return false;
  if (opts.interests.length > 0) {
    const expandedFilter = expandInterestTags(opts.interests);
    const userInterests = (user.interests ?? []).map((i) => i.toLowerCase());
    const hasMatch = expandedFilter.some((tag) =>
      userInterests.some((ui) => ui.includes(tag) || tag.includes(ui))
    );
    if (!hasMatch) return false;
  }
  return true;
}

function isDbUserId(id: string): boolean {
  return /^\d+$/.test(id);
}

// ── Service ───────────────────────────────────────────────────────────────────

export const matchService = {
  /**
   * Build the discover feed pool for an authenticated real user.
   * Returns filtered + sorted ServerUser[].
   */
  async discoverForAuthUser(viewerDbId: number, filterOpts: FilterOpts): Promise<ServerUser[]> {
    const [likedIds, passedIds] = await Promise.all([
      matchRepository.getLikedUserIds(viewerDbId),
      matchRepository.getPassedUserIds(viewerDbId),
    ]);

    const excludeIds = [viewerDbId, ...likedIds, ...passedIds];
    const dbRows = await matchRepository.getDiscoverPool(excludeIds);

    const dbServerUsers: ServerUser[] = dbRows
      .map((r) => buildServerUser(r.users, r.user_profiles))
      .filter((u) => applyFilters(u, filterOpts));

    // AI/demo users: filter out ones this viewer has already acted on (in-memory)
    const viewerKey = `db:${viewerDbId}`;
    const dbLikedMockIds = new Set(guestLikes.filter((l) => l.fromId === viewerKey).map((l) => l.toId));
    const dbPassedMockIds = new Set(guestPasses.filter((p) => p.fromId === viewerKey).map((p) => p.toId));

    const mockPool = ALL_MOCK_USERS.filter(
      (u) => !dbLikedMockIds.has(u.id) && !dbPassedMockIds.has(u.id) && applyFilters(u, filterOpts)
    );

    // AI first, then by compatibility score descending
    return [...mockPool, ...dbServerUsers].sort((a, b) => {
      if (a.isAI && !b.isAI) return -1;
      if (!a.isAI && b.isAI) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });
  },

  /** Build the discover feed for an unauthenticated guest viewer. */
  discoverForGuest(viewerId: string, filterOpts: FilterOpts): ServerUser[] {
    const seenIds = new Set([
      ...guestLikes.filter((l) => l.fromId === viewerId).map((l) => l.toId),
      ...guestPasses.filter((p) => p.fromId === viewerId).map((p) => p.toId),
      viewerId,
    ]);

    const pool = ALL_MOCK_USERS.filter(
      (u) => !seenIds.has(u.id) && applyFilters(u, filterOpts)
    );

    return pool.sort((a, b) => {
      if (a.isAI && !b.isAI) return -1;
      if (!a.isAI && b.isAI) return 1;
      return b.compatibilityScore - a.compatibilityScore;
    });
  },

  /**
   * Record a like from an authenticated user and return match info.
   */
  async likeAsAuthUser(fromDbId: number, toId: string): Promise<{
    liked: true;
    matched: boolean;
    matchId: string | null;
    matchedUser: ServerUser | null;
  }> {
    // ── Real DB → real DB ────────────────────────────────────────────────────
    if (isDbUserId(toId)) {
      const toDbId = parseInt(toId, 10);
      await matchRepository.insertLike(fromDbId, toDbId);

      const mutual = await matchRepository.hasMutualLike(fromDbId, toDbId);
      if (!mutual) return { liked: true, matched: false, matchId: null, matchedUser: null };

      const existing = await matchRepository.findExistingMatch(fromDbId, toDbId);
      if (existing) {
        const row = await matchRepository.getUserWithProfile(toDbId);
        const matchedUser = row ? buildServerUser(row.users, row.user_profiles) : null;
        return { liked: true, matched: true, matchId: String(existing.id), matchedUser };
      }

      const newMatch = await matchRepository.insertMatch(fromDbId, toDbId);
      if (!newMatch) return { liked: true, matched: false, matchId: null, matchedUser: null };

      void participantRepository
        .seedParticipants(String(newMatch.id), [fromDbId, toDbId], "match_accept")
        .catch((err) => console.error("[match.service] seedParticipants failed:", err));

      const row = await matchRepository.getUserWithProfile(toDbId);
      const matchedUser = row ? buildServerUser(row.users, row.user_profiles) : null;
      return { liked: true, matched: true, matchId: String(newMatch.id), matchedUser };
    }

    // ── Real DB → mock/AI (in-memory) ────────────────────────────────────────
    const viewerKey = `db:${fromDbId}`;
    const target = ALL_MOCK_USERS.find((u) => u.id === toId) ?? null;

    if (!guestLikes.some((l) => l.fromId === viewerKey && l.toId === toId)) {
      guestLikes.push({ fromId: viewerKey, toId });
    }

    // AI users always like back
    if (AI_MOCK_USERS.some((u) => u.id === toId)) {
      if (!guestLikes.some((l) => l.fromId === toId && l.toId === viewerKey)) {
        guestLikes.push({ fromId: toId, toId: viewerKey });
      }
    }

    const mutual =
      guestLikes.some((l) => l.fromId === viewerKey && l.toId === toId) &&
      guestLikes.some((l) => l.fromId === toId && l.toId === viewerKey);
    const alreadyMatched = guestMatches.some(
      (m) => (m.userA === viewerKey && m.userB === toId) || (m.userA === toId && m.userB === viewerKey)
    );

    if (mutual && !alreadyMatched) {
      const matchId = `match_${viewerKey}_${toId}_${Date.now()}`;
      guestMatches.push({ id: matchId, userA: viewerKey, userB: toId, ts: Date.now() });
      return { liked: true, matched: true, matchId, matchedUser: target };
    }

    return { liked: true, matched: false, matchId: null, matchedUser: null };
  },

  /** Record a like from an unauthenticated guest viewer. */
  likeAsGuest(viewerId: string, toId: string): {
    liked: true;
    matched: boolean;
    matchId: string | null;
    matchedUser: ServerUser | null;
  } {
    const target = ALL_MOCK_USERS.find((u) => u.id === toId) ?? null;

    if (!guestLikes.some((l) => l.fromId === viewerId && l.toId === toId)) {
      guestLikes.push({ fromId: viewerId, toId });
    }

    const mutual =
      guestLikes.some((l) => l.fromId === viewerId && l.toId === toId) &&
      guestLikes.some((l) => l.fromId === toId && l.toId === viewerId);
    const alreadyMatched = guestMatches.some(
      (m) => (m.userA === viewerId && m.userB === toId) || (m.userA === toId && m.userB === viewerId)
    );

    if (mutual && !alreadyMatched) {
      const matchId = `match_${viewerId}_${toId}_${Date.now()}`;
      guestMatches.push({ id: matchId, userA: viewerId, userB: toId, ts: Date.now() });
      return { liked: true, matched: true, matchId, matchedUser: target };
    }

    return { liked: true, matched: false, matchId: null, matchedUser: null };
  },

  /** Record a pass from an authenticated user. */
  async passAsAuthUser(fromDbId: number, toId: string): Promise<void> {
    if (isDbUserId(toId)) {
      await matchRepository.insertPass(fromDbId, parseInt(toId, 10));
      return;
    }
    const viewerKey = `db:${fromDbId}`;
    if (!guestPasses.some((p) => p.fromId === viewerKey && p.toId === toId)) {
      guestPasses.push({ fromId: viewerKey, toId });
    }
  },

  /** Record a pass from a guest. */
  passAsGuest(viewerId: string, toId: string): void {
    if (!guestPasses.some((p) => p.fromId === viewerId && p.toId === toId)) {
      guestPasses.push({ fromId: viewerId, toId });
    }
  },

  /** Get all matches for an authenticated user. */
  async getMatchesForAuthUser(viewerDbId: number) {
    const dbMatchRows = await matchRepository.getMatchesForUser(viewerDbId);

    const dbMatchResults = await Promise.all(
      dbMatchRows.map(async (m) => {
        const partnerId = m.user1Id === viewerDbId ? m.user2Id : m.user1Id;
        const row = await matchRepository.getUserWithProfile(partnerId);
        if (!row) return null;
        return {
          matchId: String(m.id),
          matchedAt: m.createdAt.getTime(),
          user: buildServerUser(row.users, row.user_profiles),
        };
      })
    );

    const viewerKey = `db:${viewerDbId}`;
    const mockMatchResults = guestMatches
      .filter((m) => m.userA === viewerKey || m.userB === viewerKey)
      .map((m) => {
        const partnerId = m.userA === viewerKey ? m.userB : m.userA;
        const partner = ALL_MOCK_USERS.find((u) => u.id === partnerId);
        return partner ? { matchId: m.id, matchedAt: m.ts, user: partner } : null;
      })
      .filter(Boolean);

    return [...dbMatchResults.filter(Boolean), ...mockMatchResults];
  },

  /** Get all in-memory matches for a guest viewer. */
  getMatchesForGuest(viewerId: string) {
    return guestMatches
      .filter((m) => m.userA === viewerId || m.userB === viewerId)
      .map((m) => {
        const partnerId = m.userA === viewerId ? m.userB : m.userA;
        const partner = ALL_MOCK_USERS.find((u) => u.id === partnerId);
        return partner ? { matchId: m.id, matchedAt: m.ts, user: partner } : null;
      })
      .filter(Boolean);
  },

  /** Reset swipe history for an authenticated user. */
  async resetForAuthUser(viewerDbId: number) {
    const before = {
      guestLikes: guestLikes.filter((l) => l.fromId === `db:${viewerDbId}`).length,
      guestPasses: guestPasses.filter((p) => p.fromId === `db:${viewerDbId}`).length,
      guestMatches: guestMatches.filter(
        (m) => m.userA === `db:${viewerDbId}` || m.userB === `db:${viewerDbId}`
      ).length,
    };

    await Promise.all([
      matchRepository.deleteLikesFrom(viewerDbId),
      matchRepository.deletePassesFrom(viewerDbId),
    ]);

    const key = `db:${viewerDbId}`;
    guestLikes.splice(0, guestLikes.length, ...guestLikes.filter((l) => l.fromId !== key));
    guestPasses.splice(0, guestPasses.length, ...guestPasses.filter((p) => p.fromId !== key));
    guestMatches.splice(
      0,
      guestMatches.length,
      ...guestMatches.filter((m) => m.userA !== key && m.userB !== key)
    );

    return before;
  },

  /** Reset swipe history for a guest viewer. */
  resetForGuest(viewerId: string) {
    const before = {
      likes: guestLikes.filter((l) => l.fromId === viewerId).length,
      passes: guestPasses.filter((p) => p.fromId === viewerId).length,
      matches: guestMatches.filter((m) => m.userA === viewerId || m.userB === viewerId).length,
    };
    guestLikes.splice(0, guestLikes.length, ...guestLikes.filter((l) => l.fromId !== viewerId));
    guestPasses.splice(0, guestPasses.length, ...guestPasses.filter((p) => p.fromId !== viewerId));
    guestMatches.splice(
      0,
      guestMatches.length,
      ...guestMatches.filter((m) => m.userA !== viewerId && m.userB !== viewerId)
    );
    return before;
  },

  /** Simulate a like-back from a mock user (test/demo only). */
  likeBack(fromMockId: string, toViewerId: string) {
    if (!guestLikes.some((l) => l.fromId === fromMockId && l.toId === toViewerId)) {
      guestLikes.push({ fromId: fromMockId, toId: toViewerId });
    }
    const mutual =
      guestLikes.some((l) => l.fromId === fromMockId && l.toId === toViewerId) &&
      guestLikes.some((l) => l.fromId === toViewerId && l.toId === fromMockId);
    const alreadyMatched = guestMatches.some(
      (m) =>
        (m.userA === toViewerId && m.userB === fromMockId) ||
        (m.userA === fromMockId && m.userB === toViewerId)
    );
    let matchId: string | null = null;
    if (mutual && !alreadyMatched) {
      matchId = `match_${toViewerId}_${fromMockId}_${Date.now()}`;
      guestMatches.push({ id: matchId, userA: toViewerId, userB: fromMockId, ts: Date.now() });
    }
    return { liked: true, matched: mutual && !alreadyMatched, matchId };
  },
};
