/**
 * modules/notification/notification.service.ts
 *
 * Notification pipeline orchestrator.
 *
 * Pipeline:
 *   emit(event)
 *   → dedupe check
 *   → preference check
 *   → quiet hours check
 *   → in-app insert (always, unless category disabled)
 *   → push send (only if push enabled for category)
 *
 * Push provider: Expo Push Notification Service (https://exp.host/--/api/v2/push/send)
 * This acts as a proxy for both APNs and FCM without needing raw credentials.
 *
 * Privacy:
 *   - previewMode "none"  → title only, no body
 *   - previewMode "name"  → title with name, generic body
 *   - previewMode "full"  → full body
 *
 * Quiet hours: non-transactional events are deferred (dropped) during quiet hours.
 * Transactional = messages, matches, safety.
 */

import { notificationRepository } from "./notification.repository.js";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const TRANSACTIONAL_TYPES = new Set([
  "message.created",
  "match.created",
  "like.received",
  "superlike.received",
  "safety.risk_detected",
  "verification.completed",
]);

type NotificationCategory = "messages" | "matches" | "safety" | "ai" | "promotions";

const TYPE_TO_CATEGORY: Record<string, NotificationCategory> = {
  "message.created": "messages",
  "match.created": "matches",
  "like.received": "matches",
  "superlike.received": "matches",
  "safety.risk_detected": "safety",
  "verification.completed": "safety",
  "ai.insight.updated": "ai",
  "ai.coaching.ready": "ai",
  "conversation.reengagement_due": "promotions",
  "profile.photo_approved": "promotions",
};

type Lang = "ko" | "ja";

type NotifCopy = {
  titleKo: string;
  titleJa: string;
  bodyKo: string;
  bodyJa: string;
};

function buildCopy(
  type: string,
  payload: Record<string, unknown>
): NotifCopy {
  const actorName = (payload.actorName as string) ?? "";

  switch (type) {
    case "message.created":
      return {
        titleKo: actorName ? `${actorName}님이 메시지를 보냈어요` : "새 메시지가 도착했어요",
        titleJa: actorName ? `${actorName}さんからメッセージが届きました` : "新しいメッセージが届きました",
        bodyKo: "지금 확인해보세요",
        bodyJa: "今すぐ確認しましょう",
      };
    case "match.created":
      return {
        titleKo: "새로운 매칭이 생겼어요",
        titleJa: "新しいマッチが成立しました",
        bodyKo: "새로운 인연이 연결됐어요. 먼저 인사를 건네보세요",
        bodyJa: "新しいご縁がつながりました。まず挨拶してみましょう",
      };
    case "like.received":
      return {
        titleKo: "누군가 당신에게 관심을 보였어요",
        titleJa: "あなたに興味を持っている方がいます",
        bodyKo: "매칭으로 이어질 수 있어요",
        bodyJa: "マッチにつながるかもしれません",
      };
    case "superlike.received":
      return {
        titleKo: "특별한 관심을 받았어요",
        titleJa: "特別な関心が寄せられています",
        bodyKo: "슈퍼라이크를 받았어요",
        bodyJa: "スーパーライクが届いています",
      };
    case "safety.risk_detected":
      return {
        titleKo: "이 대화에서 주의가 필요해요",
        titleJa: "この会話では注意が必要です",
        bodyKo: "앱 밖 연락이나 금전 요청에는 주의하세요",
        bodyJa: "アプリ外の連絡や金銭の要求には注意してください",
      };
    case "ai.insight.updated":
      return {
        titleKo: "대화 인사이트가 업데이트됐어요",
        titleJa: "会話のインサイトが更新されました",
        bodyKo: payload.bodyKo as string ?? "지금 확인해보세요",
        bodyJa: payload.bodyJa as string ?? "今すぐ確認しましょう",
      };
    case "ai.coaching.ready":
      return {
        titleKo: "AI 코칭 준비됐어요",
        titleJa: "AIコーチングが準備できました",
        bodyKo: payload.bodyKo as string ?? "대화 조언을 확인해보세요",
        bodyJa: payload.bodyJa as string ?? "会話のアドバイスを確認しましょう",
      };
    case "conversation.reengagement_due":
      return {
        titleKo: "오래된 대화가 있어요",
        titleJa: "しばらく話していない方がいます",
        bodyKo: "안부를 전해보는 건 어떨까요?",
        bodyJa: "近況を伝えてみてはどうでしょうか？",
      };
    default:
      return {
        titleKo: "Lito 알림",
        titleJa: "Litoからの通知",
        bodyKo: "",
        bodyJa: "",
      };
  }
}

function isQuietHours(
  quietStart: number,
  quietEnd: number,
  timezone: string | null
): boolean {
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

async function sendExpoPush(
  pushToken: string,
  title: string,
  body: string,
  data: Record<string, unknown>
): Promise<void> {
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        to: pushToken,
        title,
        body,
        data,
        sound: "default",
        channelId: data.channelId ?? "default",
      }),
    });
    if (!res.ok) {
      console.error("[notification] Expo push failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("[notification] Expo push error:", err);
  }
}

export type NotificationEmitParams = {
  userId: number;
  type: string;
  actorUserId?: number;
  conversationId?: string;
  payload?: Record<string, unknown>;
  dedupeWindowMs?: number;
};

export const notificationService = {
  /**
   * Main entry point.
   * Fire-and-forget — always call via void or setImmediate from services.
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

    const dedupeKey = conversationId
      ? `${type}:${userId}:${conversationId}`
      : `${type}:${userId}`;

    const isDup = await notificationRepository.isDuplicate(dedupeKey, dedupeWindowMs);
    if (isDup) return;

    const category = TYPE_TO_CATEGORY[type] ?? "promotions";
    const copy = buildCopy(type, payload);
    const isTransactional = TRANSACTIONAL_TYPES.has(type);

    const prefs = await notificationRepository.getPreferences(userId);

    const categoryEnabled = !prefs || (() => {
      switch (category) {
        case "messages": return prefs.messagesEnabled;
        case "matches": return prefs.matchesEnabled;
        case "safety": return prefs.safetyEnabled;
        case "ai": return prefs.aiEnabled;
        case "promotions": return prefs.promotionsEnabled;
        default: return false;
      }
    })();

    if (!categoryEnabled) return;

    await notificationRepository.insertEvent({
      userId,
      type,
      actorUserId,
      conversationId,
      payload,
      dedupeKey,
    });

    await notificationRepository.insertInApp({
      userId,
      category,
      titleKo: copy.titleKo,
      titleJa: copy.titleJa,
      bodyKo: copy.bodyKo,
      bodyJa: copy.bodyJa,
      payload: { type, conversationId, actorUserId, ...payload },
    });

    if (category === "ai" && !prefs?.aiEnabled) return;
    if (category === "promotions" && !prefs?.promotionsEnabled) return;

    const tokens = await notificationRepository.getActiveTokensForUser(userId);
    if (tokens.length === 0) return;

    for (const token of tokens) {
      if (!isTransactional) {
        const inQuiet = isQuietHours(
          prefs?.quietHoursStart ?? 22,
          prefs?.quietHoursEnd ?? 8,
          token.timezone ?? null
        );
        if (inQuiet) continue;
      }

      const previewMode = prefs?.previewMode ?? "none";
      const lang: Lang = (token.locale?.startsWith("ja") ? "ja" : "ko") as Lang;

      let title: string;
      let body: string;

      if (previewMode === "none" || category === "messages") {
        title = lang === "ja" ? "새 메시지" : copy.titleJa;
        if (lang === "ko") title = category === "messages" ? "새 메시지가 도착했어요" : copy.titleKo;
        body = "";
      } else {
        title = lang === "ja" ? copy.titleJa : copy.titleKo;
        body = previewMode === "full" ? (lang === "ja" ? copy.bodyJa : copy.bodyKo) : "";
      }

      const channelId: string = {
        messages: "messages",
        matches: "matches_likes",
        safety: "safety_security",
        ai: "ai_insights",
        promotions: "promotions",
      }[category] ?? "default";

      await sendExpoPush(token.pushToken, title, body, {
        type,
        conversationId,
        channelId,
      });
    }
  },
};
