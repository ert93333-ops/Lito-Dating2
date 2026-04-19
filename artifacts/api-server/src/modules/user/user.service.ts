/**
 * modules/user/user.service.ts
 *
 * Business logic for user profiles.
 *
 * Responsibilities:
 *  - Transform raw DB rows → ServerUser shape
 *  - Trust score computation
 *  - Profile update orchestration
 *
 * No direct DB imports — delegates to userRepository.
 */

import { userRepository, type ProfileUpdateFields } from "./user.repository.js";
import { type ServerUser } from "../../fixtures/mockUsers.js";
import type { users, userProfiles } from "@workspace/db";

type UserRow = typeof users.$inferSelect;
type ProfileRow = typeof userProfiles.$inferSelect;

/** Map a DB user + profile row to the canonical ServerUser shape. */
export function buildServerUser(user: UserRow, profile: ProfileRow): ServerUser {
  const country = (user.country as "KR" | "JP") ?? "KR";
  const cityMap: Record<string, string> = {
    KR: "대한민국 · Korea",
    JP: "日本 · Japan",
  };
  return {
    id: String(user.id),
    nickname: profile.nickname || "Lito 사용자",
    age: profile.age,
    country,
    language: (user.language as "ko" | "ja") ?? "ko",
    city: cityMap[country] ?? "대한민국 · Korea",
    bio: profile.bio || profile.intro || "",
    photos: profile.photos ?? [],
    compatibilityScore: 70 + Math.floor(Math.random() * 25),
    compatibilityReasons: ["실제 사용자", "문화 교류", "언어 연습"],
    lastActive: "방금",
    isOnline: true,
    studyingLanguage: true,
    languageLevel: (profile.languageLevel as "beginner" | "intermediate" | "advanced") || "beginner",
    interests: profile.interests ?? [],
    trustScore: 60,
    trustLayers: {
      humanVerified: false,
      faceMatched: false,
      idVerified: false,
      institutionVerified: false,
    },
    instagramHandle: profile.instagramHandle || undefined,
    gender: (profile.gender as "male" | "female" | "other" | undefined) ?? undefined,
    isAI: false,
  };
}

export const userService = {
  /** Fetch a DB user as ServerUser. Returns null if not found. */
  async getUserById(userId: number): Promise<ServerUser | null> {
    const row = await userRepository.findByIdWithProfile(userId);
    if (!row) return null;
    return buildServerUser(row.users, row.user_profiles);
  },

  /** Update mutable profile fields. Returns the updated profile. */
  async updateProfile(userId: number, fields: ProfileUpdateFields) {
    return userRepository.updateProfile(userId, fields);
  },

  /** Return the raw profile row for /auth/me style responses. */
  async getRawProfile(userId: number) {
    return userRepository.findProfile(userId);
  },
};
