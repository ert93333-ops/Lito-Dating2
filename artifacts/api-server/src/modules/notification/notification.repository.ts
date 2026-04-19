/**
 * modules/notification/notification.repository.ts
 *
 * DB CRUD for all notification tables.
 * No business logic — only DB I/O.
 */

import { and, desc, eq, gte } from "drizzle-orm";
import {
  db,
  deviceTokens,
  notificationPreferences,
  notificationEvents,
  inAppNotifications,
} from "@workspace/db";
import type { NotificationPreference } from "@workspace/db";

export const notificationRepository = {
  // ── Device Tokens ─────────────────────────────────────────────────────────

  async upsertToken(
    userId: number,
    platform: string,
    pushToken: string,
    meta: { appVersion?: string; locale?: string; timezone?: string }
  ): Promise<void> {
    await db
      .insert(deviceTokens)
      .values({
        userId,
        platform,
        pushToken,
        appVersion: meta.appVersion,
        locale: meta.locale,
        timezone: meta.timezone,
        lastSeenAt: new Date(),
        status: "active",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [deviceTokens.pushToken],
        set: {
          userId,
          platform,
          appVersion: meta.appVersion,
          locale: meta.locale,
          timezone: meta.timezone,
          lastSeenAt: new Date(),
          status: "active",
          updatedAt: new Date(),
        },
      });
  },

  async deactivateToken(pushToken: string): Promise<void> {
    await db
      .update(deviceTokens)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(deviceTokens.pushToken, pushToken));
  },

  async getActiveTokensForUser(userId: number) {
    return db
      .select()
      .from(deviceTokens)
      .where(
        and(
          eq(deviceTokens.userId, userId),
          eq(deviceTokens.status, "active")
        )
      );
  },

  // ── Notification Preferences ─────────────────────────────────────────────

  async getPreferences(userId: number): Promise<NotificationPreference | null> {
    const rows = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },

  async upsertPreferences(
    userId: number,
    prefs: Partial<Omit<NotificationPreference, "id" | "userId" | "createdAt" | "updatedAt">>
  ): Promise<NotificationPreference> {
    const [row] = await db
      .insert(notificationPreferences)
      .values({ userId, ...prefs, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: [notificationPreferences.userId],
        set: { ...prefs, updatedAt: new Date() },
      })
      .returning();
    return row;
  },

  // ── Notification Events ───────────────────────────────────────────────────

  async isDuplicate(dedupeKey: string, windowMs = 60_000): Promise<boolean> {
    const cutoff = new Date(Date.now() - windowMs);
    const rows = await db
      .select({ id: notificationEvents.id })
      .from(notificationEvents)
      .where(
        and(
          eq(notificationEvents.dedupeKey, dedupeKey),
          gte(notificationEvents.createdAt, cutoff)
        )
      )
      .limit(1);
    return rows.length > 0;
  },

  async insertEvent(params: {
    userId: number;
    type: string;
    actorUserId?: number;
    conversationId?: string;
    payload?: Record<string, unknown>;
    dedupeKey?: string;
  }): Promise<number> {
    const [row] = await db
      .insert(notificationEvents)
      .values({
        userId: params.userId,
        type: params.type,
        actorUserId: params.actorUserId,
        conversationId: params.conversationId,
        payloadJson: params.payload ?? {},
        dedupeKey: params.dedupeKey,
      })
      .returning({ id: notificationEvents.id });
    return row.id;
  },

  // ── In-App Notifications ──────────────────────────────────────────────────

  async insertInApp(params: {
    userId: number;
    category: string;
    titleKo: string;
    titleJa: string;
    bodyKo: string;
    bodyJa: string;
    payload?: Record<string, unknown>;
  }): Promise<number> {
    const [row] = await db
      .insert(inAppNotifications)
      .values({
        userId: params.userId,
        category: params.category,
        titleKo: params.titleKo,
        titleJa: params.titleJa,
        bodyKo: params.bodyKo,
        bodyJa: params.bodyJa,
        payload: params.payload ?? {},
      })
      .returning({ id: inAppNotifications.id });
    return row.id;
  },

  async listInApp(userId: number, limit = 30) {
    return db
      .select()
      .from(inAppNotifications)
      .where(eq(inAppNotifications.userId, userId))
      .orderBy(desc(inAppNotifications.createdAt))
      .limit(Math.min(limit, 50));
  },

  async markRead(id: number, userId: number): Promise<void> {
    await db
      .update(inAppNotifications)
      .set({ isRead: true })
      .where(
        and(
          eq(inAppNotifications.id, id),
          eq(inAppNotifications.userId, userId)
        )
      );
  },

  async markAllRead(userId: number): Promise<void> {
    await db
      .update(inAppNotifications)
      .set({ isRead: true })
      .where(eq(inAppNotifications.userId, userId));
  },

  async countUnread(userId: number): Promise<number> {
    const rows = await db
      .select({ id: inAppNotifications.id })
      .from(inAppNotifications)
      .where(
        and(
          eq(inAppNotifications.userId, userId),
          eq(inAppNotifications.isRead, false)
        )
      );
    return rows.length;
  },
};
