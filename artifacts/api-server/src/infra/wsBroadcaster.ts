/**
 * infra/wsBroadcaster.ts
 *
 * WebSocket 브로드캐스트 공유 레지스트리.
 * ws.ts가 초기화 시 broadcastToRoom 함수를 등록하고,
 * 다른 모듈(translations, reports 등)이 실시간 이벤트를 push할 때 사용한다.
 *
 * chat.translation_updated — 번역 상태 변경 시
 * chat.safety_state_updated — 안전 상태 변경 시
 */

type BroadcastFn = (conversationId: string, payload: unknown) => void;

let _broadcastToRoom: BroadcastFn | null = null;

export function registerRoomBroadcast(fn: BroadcastFn): void {
  _broadcastToRoom = fn;
}

export function broadcastTranslationUpdated(params: {
  conversationId: string;
  directMessageId: number;
  status: "success" | "failed" | "pending" | "consent_required";
  translatedText?: string | null;
  fallbackUsed?: boolean;
}): void {
  if (!_broadcastToRoom) return;
  try {
    _broadcastToRoom(params.conversationId, {
      type: "chat.translation_updated",
      conversationId: params.conversationId,
      directMessageId: params.directMessageId,
      status: params.status,
      translatedText: params.translatedText ?? null,
      fallbackUsed: params.fallbackUsed ?? false,
    });
  } catch (err) {
    console.error("[wsBroadcaster] broadcastTranslationUpdated failed:", err);
  }
}

export function broadcastSafetyStateUpdated(params: {
  conversationId: string;
  affectedUserId?: number;
  safetyEvent: "user_blocked" | "report_submitted" | "conversation_locked";
  details?: Record<string, unknown>;
}): void {
  if (!_broadcastToRoom) return;
  try {
    _broadcastToRoom(params.conversationId, {
      type: "chat.safety_state_updated",
      conversationId: params.conversationId,
      affectedUserId: params.affectedUserId ?? null,
      safetyEvent: params.safetyEvent,
      details: params.details ?? {},
    });
  } catch (err) {
    console.error("[wsBroadcaster] broadcastSafetyStateUpdated failed:", err);
  }
}
