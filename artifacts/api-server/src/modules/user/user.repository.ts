/**
 * modules/user/user.repository.ts
 *
 * Data access layer for users and user profiles.
 * All Drizzle queries for the `users` and `user_profiles` tables live here.
 * No business logic — only DB I/O.
 */

import { eq } from "drizzle-orm";
import { db, users, userProfiles } from "@workspace/db";

export type ProfileUpdateFields = Partial<{
  nickname: string;
  age: number;
  bio: string;
  intro: string;
  interests: string[];
  photos: string[];
  instagramHandle: string;
  languageLevel: string;
}>;

export const userRepository = {
  /** Find a user + profile row by numeric DB ID. */
  async findByIdWithProfile(userId: number) {
    const [row] = await db
      .select()
      .from(users)
      .innerJoin(userProfiles, eq(userProfiles.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  },

  /** Find a user row (no profile join) by numeric DB ID. */
  async findById(userId: number) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return row ?? null;
  },

  /** Find a user by email (lowercase). */
  async findByEmail(email: string) {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return row ?? null;
  },

  /** Find a profile by user ID. */
  async findProfile(userId: number) {
    const [row] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId))
      .limit(1);
    return row ?? null;
  },

  /** Insert a new user row and return it. */
  async insertUser(data: {
    email: string;
    passwordHash: string;
    country: string;
    language: string;
  }) {
    const [user] = await db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        country: data.country,
        language: data.language,
      })
      .returning();
    return user;
  },

  /** Create an empty profile row for a newly registered user. */
  async insertProfile(userId: number) {
    await db.insert(userProfiles).values({ userId });
  },

  /** Update mutable profile fields. Returns the updated profile. */
  async updateProfile(userId: number, fields: ProfileUpdateFields) {
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (fields.nickname !== undefined) setValues.nickname = fields.nickname;
    if (fields.age !== undefined) setValues.age = fields.age;
    if (fields.bio !== undefined) setValues.bio = fields.bio;
    if (fields.intro !== undefined) setValues.intro = fields.intro;
    if (fields.interests !== undefined) setValues.interests = fields.interests;
    if (fields.photos !== undefined) setValues.photos = fields.photos;
    if (fields.instagramHandle !== undefined) setValues.instagramHandle = fields.instagramHandle;
    if (fields.languageLevel !== undefined) setValues.languageLevel = fields.languageLevel;

    await db
      .update(userProfiles)
      .set(setValues)
      .where(eq(userProfiles.userId, userId));

    return this.findProfile(userId);
  },
};
