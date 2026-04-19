/**
 * modules/notification/notification.service.ts
 *
 * MVP notification pipeline.
 *
 * Pipeline:
 *   emit(params)
 *   → 1. dedupe check  (time-window, per user+type+conversation)
 *   → 2. category resolve  (TYPE_TO_CATEGORY map)
 *   → 3. preference check  (category enabled for user)
 *   → 4. in-app insert  (always, even if push is disabled)
 *   → 5. event audit log  (fire-and-forget audit trail)
 *   → 6. push delivery  (per active device token)
 *        - quiet hours gate (non-transactional only)
 *        - preview mode applied to title/body
 *        - Expo Push Service → APNs / FCM proxy
 *
 * MVP categories:
 *   messages          transactional  always deliverable
 *   matches_likes     transactional  always deliverable
 *   safety_security   transactional  FORCED ON — cannot be disabled by user
 *   account_updates   transactional  always deliverable
 *
 * AI-triggered notifications: NOT included in MVP. Reserved for Phase 2.
 */

import { notificationRepository } from "./notification.repository.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * Transactional event types are never suppressed by quiet hours.
 * All MVP types are transactional.
 */
const TRANSACTIONAL_TYPES = new Set([
  "message.created",
  "match.created",
  "like.received",
  "superlike.received",
  "safety.risk_detected",
  "account.warning",
  "verification.completed",
  "profile.photo_approved",
  "subscription.updated",
]);

// ── Category types ────────────────────────────────────────────────────────────

type NotificationCategory =
  | "messages"
  | "matches_likes"
  | "safety_security"
  | "account_updates";

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  "message.created":      "messages",
  "match.created":        "matches_likes",
  "like.received":        "matches_likes",
  "superlike.received":   "matches_likes",
  "safety.risk_detected": "safety_security",
  "account.warning":      "safety_security",
  "verification.completed": "account_updates",
  "profile.photo_approved": "account_updates",
  "subscription.updated":   "account_updates",
};

/**
 * Expo push channel IDs — must match the Android channel registration in the client.
 */
const CATEGORY_TO_CHANNEL: Record<NotificationCategory, string> = {
  messages:        "messages",
  matches_likes:   "matches_likes",
  safety_security: "safety_security",
  account_updates: "account_updates",
};

// ── Copy builder ──────────────────────────────────────────────────────────────

type Lang = "ko" | "ja";
type NotifCopy = { titleKo: string; titleJa: string; bodyKo: string; bodyJa: string };

function buildCopy(type: string, payload: Record<string, unknown>): NotifCopy {
  const actorName = (payload["actorName"] as string) ?? "";

  switch (type) {
    case "message.created":
      return {
        titleKo: actorName ? `${actorName}님이 메시지를 보냈어요` : "새 메시지가 도착했어요",
        titleJa: actorName ? `${actorName}さんからメッセージが届きました` : "新しいメッセージが届きました",
        bodyKo:  "지금 확인해보세요",
        bodyJa:  "今すぐ確認しましょう",
      };
    case "match.created":
      return {
        titleKo: "새로운 매칭이 생겼어요",
        titleJa: "新しいマッチが成立しました",
        bodyKo:  "새로운 인연이 연결됐어요. 먼저 인사를 건네보세요",
        bodyJa:  "新しいご縁がつながりました。まず挨拶してみましょう",
      };
    case "like.received":
      return {
        titleKo: "누군가 당신에게 관심을 보였어요",
        titleJa: "あなたに興味を持っている方がいます",
        bodyKo:  "매칭으로 이어질 수 있어요",
        bodyJa:  "マッチにつながるかもしれません",
      };
    case "superlike.received":
      return {
        titleKo: "특별한 관심을 받았어요",
        titleJa: "特別な関心が寄せられています",
        bodyKo:  "슈퍼라이크를 받았어요",
        bodyJa:  "スーパーライクが届いています",
      };
    case "safety.risk_detected":
      return {
        titleKo: "이 대화에서 주의가 필요해요",
        titleJa: "この会話では注意が必要です",
        bodyKo:  "앱 밖 연락이나 금전 요청에는 주의하세요",
        bodyJa:  "アプリ外の連絡や金銭の要求には注意してください",
      };
    case "account.warning":
      return {
        titleKo: "계정 보안 알림",
        titleJa: "アカウントセキュリティのお知らせ",
        bodyKo:  "계정에 주의가 필요한 활동이 감지됐어요",
        bodyJa:  "アカウントに注意が必要な活動が検出されました",
      };
    case "verification.completed":
      return {
        titleKo: "본인 인증이 완료됐어요",
        titleJa: "本人確認が完了しました",
        bodyKo:  "인증 배지가 프로필에 추가됐어요",
        bodyJa:  "認証バッジがプロフィールに追加されました",
      };
    case "profile.photo_approved":
      return {
        titleKo: "프로필 사진이 승인됐어요",
        titleJa: "プロフィール写真が承認されました",
        bodyKo:  "새 사진이 프로필에 표시됩니다",
        bodyJa:  "新しい写真がプロフィールに表示されます",
      };
    case "subscription.updated":
      return {
        titleKo: "구독 상태가 변경됐어요",
        titleJa: "サブスクリプションの状態が変更されました",
        bodyKo:  "구독 정보를 확인해보세요",
        bodyJa:  "サブスクリプション情報をご確認ください",
      };
    default:
      return {
        titleKo: "Lito 알림",
        titleJa: "Litoからの通知",
        bodyKo:  "",
        bodyJa:  "",
      };
  }
}

// ── Quiet hours ───────────────────────────────────────────────────────────────

/**
 * Returns true if the current local time falls within [quietStart, quietEnd).
 * Handles overnight spans (e.g. 22–08).
 * Falls back to Asia/Seoul if timezone is invalid.
 */
function isQuietHours(quietStart: number, quietEnd: number, timezone: string | null): boolean {
  const now = new Date();
  let hour: number;
  try {
    const tz = timezone ?? "Asia/Seoul";
    hour = parseInt(
      now.toLocaleString("en-US", { hour: "2-digit", hour12: false, timeZone: tz }),
      10
    );
  } catch {
    hour = now.getHours();
  }
  if (quietStart > quietEnd) {
    return hour >= quietStart || hour < quietEnd;
  }
  return hour >= quietStart && hour < quietEnd;
}

// ── Push sender ───────────────────────────────────────────────────────────────

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to:        pushToken,
        title,
        body,
        data,
        sound:     "default",
        channelId: data["channelId"] ?? "default",
      }),
    });
    if (!res.ok) {
      console.error("[notification] Expo push failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[notification] Expo push error:", err);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export type NotificationEmitParams = {
  userId:            number;
  type:              string;
  actorUserId?:      number;
  conversationId?:   string;
  payload?:          Record<string, unknown>;
  /** Deduplication window in ms. Default 60 s. Set to 0 to bypass. */
  dedupeWindowMs?:   number;
};

export const notificationService = {
  /**
   * Main entry point. Call via `void notificationService.emit(...).catch(...)`.
   *
   * Pipeline:
   *  1. Dedupe check
   *  2. Category + preference check (safety_security is always allowed)
   *  3. In-app notification insert
   *  4. Event audit log insert
   *  5. Push delivery per active device token
   */
  async emit(params: NotificationEmitParams): Promise<void> {
    const {
      userId,
      type,
      actorUserId,
      conversationId,
      payload = {},
      dedupeWindowMs = 60_000,
    } = params;

    // ── 1. Dedupe ──────────────────────────────────────────────────────────────
    if (dedupeWindowMs > 0) {
      const dedupeKey = conversationId
        ? `${type}:${userId}:${conversationId}`
        : `${type}:${userId}`;
      const isDup = await notificationRepository.isDuplicate(dedupeKey, dedupeWindowMs);
      if (isDup) return;

      // Persist the event audit log with dedupe key
      await notificationRepository.insertEvent({
        userId, type, actorUserId, conversationId, payload, dedupeKey,
      });
    }

    // ── 2. Category + preference check ────────────────────────────────────────
    const category: NotificationCategory = TYPE_TO_CATEGORY[type] ?? "account_updates";
    const prefs = await notificationRepository.getPreferences(userId);

    if (category !== "safety_security") {
      // safety_security is forced ON — skip preference check
      const enabled = prefs ? ((): boolean => {
        switch (category) {
          case "messages":       return prefs.messagesEnabled;
          case "matches_likes":  return prefs.matchesLikesEnabled;
          case "account_updates":return prefs.accountUpdatesEnabled;
          default:               return false;
        }
      })() : true;   // no prefs row yet → default ON

      if (!enabled) return;
    }

    // ── 3. In-app notification insert (always, even if push off) ──────────────
    const copy = buildCopy(type, payload);
    await notificationRepository.insertInApp({
      userId,
      category,
      titleKo: copy.titleKo,
      titleJa: copy.titleJa,
      bodyKo:  copy.bodyKo,
      bodyJa:  copy.bodyJa,
      payload: { type, conversationId, actorUserId, ...payload },
    });

    // ── 4. Push delivery ──────────────────────────────────────────────────────
    const tokens = await notificationRepository.getActiveTokensForUser(userId);
    if (tokens.length === 0) return;

    const isTransactional = TRANSACTIONAL_TYPES.has(type);
    const channelId = CATEGORY_TO_CHANNEL[category];

    for (const token of tokens) {
      // Quiet hours gate — skip for transactional events
      if (!isTransactional) {
        const inQuiet = isQuietHours(
          prefs?.quietHoursStart ?? 22,
          prefs?.quietHoursEnd ?? 8,
          token.timezone ?? null
        );
        if (inQuiet) continue;
      }

      // Preview mode
      const previewMode = prefs?.previewMode ?? "none";
      const lang: Lang = token.locale?.startsWith("ja") ? "ja" : "ko";

      let title: string;
      let body: string;

      if (previewMode === "none") {
        // No content — generic title only
        title = lang === "ja" ? "Litoからの通知" : "Lito 알림";
        body  = "";
      } else if (previewMode === "name_only") {
        // Title with context, no message body
        title = lang === "ja" ? copy.titleJa : copy.titleKo;
        body  = "";
      } else {
        // full — show everything
        title = lang === "ja" ? copy.titleJa : copy.titleKo;
        body  = lang === "ja" ? copy.bodyJa  : copy.bodyKo;
      }

      await sendExpoPush(token.pushToken, title, body, {
        type,
        conversationId,
        channelId,
      });
    }
  },
};
