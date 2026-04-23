/**
 * infra/canonicalAnalytics.ts
 *
 * Canonical server-side analytics event store.
 * 26개 표준 이벤트 저장 — raw prompt/response 저장 금지.
 *
 * 모든 서버 모듈은 이 경로를 통해 이벤트를 기록한다.
 * DB 연결 실패 시 console.error만 기록하고 메인 플로우를 방해하지 않는다.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

// ── Canonical event types ─────────────────────────────────────────────────────

export type CanonicalEventName =
  | "auth_completed"
  | "age_gate_passed"
  | "required_consents_completed"
  | "profile_translation_preview_requested"
  | "profile_published"
  | "candidate_viewed"
  | "match_created"
  | "first_message_sent"
  | "first_reply_received"
  | "translation_requested"
  | "message_translation_rendered"
  | "translation_retry"
  | "original_text_viewed"
  | "coach_opened"
  | "coach_request_started"
  | "coach_request_completed"
  | "coach_request_no_charge_failure"
  | "coach_blocked_unsafe"
  | "coach_blocked_zero_credit"
  | "coach_blocked_no_consent"
  | "coach_conv_success"
  | "consent_granted"
  | "profile_coach_saved"
  | "purchase_started"
  | "purchase_verified"
  | "purchase_verify_failed"
  | "purchase_success_returned"
  | "purchase_failed"
  | "report_submitted"
  | "block_user_completed"
  | "delete_request_started_in_app"
  | "delete_web_flow_opened"
  | "delete_request_submitted"
  | "delete_completed";

export interface CanonicalEventPayload {
  eventName: CanonicalEventName;
  actorId?: number;
  targetId?: number;
  conversationId?: string;
  props?: Record<string, unknown>;
  clientIp?: string;
}

// ── Event store ───────────────────────────────────────────────────────────────

export async function trackEvent(payload: CanonicalEventPayload): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO analytics_events
            (event_name, actor_id, target_id, conversation_id, props, client_ip, created_at)
          VALUES
            (${payload.eventName},
             ${payload.actorId ?? null},
             ${payload.targetId ?? null},
             ${payload.conversationId ?? null},
             ${payload.props ? JSON.stringify(payload.props) : null}::jsonb,
             ${payload.clientIp ?? null},
             NOW())`
    );
  } catch (err) {
    console.error("[canonicalAnalytics] trackEvent failed:", payload.eventName, err);
  }
}

// ── Admin query helpers ───────────────────────────────────────────────────────

export async function getEventCounts(since?: Date): Promise<Record<string, number>> {
  const sinceTs = since ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  try {
    const rows = await db.execute<{ event_name: string; cnt: string }>(
      sql`SELECT event_name, COUNT(*) as cnt
          FROM analytics_events
          WHERE created_at >= ${sinceTs.toISOString()}
          GROUP BY event_name
          ORDER BY cnt DESC`
    );
    const result: Record<string, number> = {};
    for (const row of rows.rows) {
      result[row.event_name] = parseInt(row.cnt, 10);
    }
    return result;
  } catch (err) {
    console.error("[canonicalAnalytics] getEventCounts failed:", err);
    return {};
  }
}

export async function getRecentEventsForAdmin(limit = 100): Promise<unknown[]> {
  try {
    const rows = await db.execute(
      sql`SELECT id, event_name, actor_id, target_id, conversation_id, props, created_at
          FROM analytics_events
          ORDER BY created_at DESC
          LIMIT ${limit}`
    );
    return rows.rows;
  } catch (err) {
    console.error("[canonicalAnalytics] getRecentEventsForAdmin failed:", err);
    return [];
  }
}
