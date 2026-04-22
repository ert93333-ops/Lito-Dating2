/**
 * Analytics service — lightweight event tracking facade.
 *
 * 1. 개발 환경: console.log
 * 2. 서버 canonical event 포워딩 (fire-and-forget, 토큰이 있을 때만)
 */

import { AnalyticsEvent } from "@/types/growth";
import { API_BASE } from "@/utils/api";

export interface TrackPayload {
  event: AnalyticsEvent;
  props?: Record<string, string | number | boolean>;
}

let _token: string | null = null;

/** AppContext에서 토큰이 변경될 때 이 함수로 갱신 */
export function setAnalyticsToken(token: string | null): void {
  _token = token;
}

function sendToServer(payload: TrackPayload): void {
  if (!_token) return;
  const token = _token;
  fetch(`${API_BASE}/api/v1/analytics/track`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ eventName: payload.event, props: payload.props }),
  }).catch(() => {});
}

/** Replace this function to connect a real analytics provider. */
function send(payload: TrackPayload): void {
  if (__DEV__) {
    console.log(`[analytics] ${payload.event}`, payload.props ?? "");
  }
  sendToServer(payload);
}

export function trackEvent(
  event: AnalyticsEvent,
  props?: Record<string, string | number | boolean>
): void {
  send({ event, props });
}
