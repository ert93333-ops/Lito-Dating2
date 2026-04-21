/**
 * deletion.worker.ts
 *
 * 계정 삭제 비동기 워커.
 * delete_request_submitted 이후 단계별 purge job을 처리한다.
 *
 * 상태 흐름:
 * submitted → visibility_hidden → session_revoked → purge_profile →
 * purge_messages → purge_translations → purge_ai_outputs →
 * finalize_retention → finalize_user → completed
 *
 * - 각 단계 실패 시 retry_count 증가 + error_reason 기록
 * - 최대 3회 재시도
 * - raw prompt/response 장기 저장 없음
 */

import { db, deleteRequests, deleteJobs, deleteEvents, users, directMessages } from "@workspace/db";
import { eq, and, lt, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { trackEvent } from "../../infra/canonicalAnalytics.js";

export type DeletionJobType =
  | "revoke_provider"
  | "purge_profile"
  | "purge_messages"
  | "purge_translations"
  | "purge_ai_outputs"
  | "finalize_retention"
  | "finalize_user";

const JOB_SEQUENCE: DeletionJobType[] = [
  "revoke_provider",
  "purge_profile",
  "purge_messages",
  "purge_translations",
  "purge_ai_outputs",
  "finalize_retention",
  "finalize_user",
];

async function executeJob(job: typeof deleteJobs.$inferSelect, requestId: number, userId: number): Promise<void> {
  const jobType = job.jobType as DeletionJobType;

  switch (jobType) {
    case "revoke_provider": {
      // OAuth 세션 무효화 — Apple/Google revocation placeholder
      // TODO: Apple revoke token API 연동
      // TODO: Google revoke token API 연동
      console.log(`[deletion.worker] revoke_provider for userId=${userId} (placeholder — social auth revocation)`);
      break;
    }
    case "purge_profile": {
      // 프로필 데이터 익명화
      await db.execute(sql`
        UPDATE user_profiles SET
          nickname = 'Deleted User',
          bio = NULL,
          photos = '[]'::jsonb,
          interests = '[]'::jsonb,
          updated_at = NOW()
        WHERE user_id = ${userId}
      `);
      break;
    }
    case "purge_messages": {
      // 메시지 내용 삭제 (메타데이터만 보존)
      await db.execute(sql`
        UPDATE chat_messages SET
          content = '[삭제된 메시지]',
          updated_at = NOW()
        WHERE sender_user_id = ${userId}
      `);
      await db.execute(sql`
        UPDATE direct_messages SET
          content = '[삭제된 메시지]'
        WHERE sender_id = ${userId}::text
      `);
      break;
    }
    case "purge_translations": {
      // 번역 데이터 삭제
      await db.execute(sql`
        DELETE FROM message_translations
        WHERE direct_message_id IN (
          SELECT id FROM direct_messages WHERE sender_id = ${userId}::text
        )
      `);
      break;
    }
    case "purge_ai_outputs": {
      // AI ledger는 보존 (거래 기록), ai_consents 삭제
      await db.execute(sql`
        DELETE FROM ai_consents WHERE user_id = ${userId}
      `);
      await db.execute(sql`
        DELETE FROM profile_coach_outputs WHERE user_id = ${userId}
      `);
      break;
    }
    case "finalize_retention": {
      // 법적 보존 기간 필요한 데이터 체크 — 현재 없음
      // TODO: 법적 의무 보존 데이터 분리 저장
      console.log(`[deletion.worker] finalize_retention for userId=${userId} — no retention exceptions`);
      break;
    }
    case "finalize_user": {
      // 사용자 계정 소프트 삭제
      await db.update(users)
        .set({
          email: `deleted_${userId}@deleted.lito`,
          visibilityStatus: "deleted",
          updatedAt: new Date(),
        } as any)
        .where(eq(users.id, userId));
      break;
    }
  }
}

async function runDeleteRequest(requestId: number): Promise<void> {
  const [request] = await db.select().from(deleteRequests)
    .where(eq(deleteRequests.id, requestId))
    .limit(1);

  if (!request || !["submitted", "processing"].includes(request.status)) return;

  await db.update(deleteRequests)
    .set({ status: "processing" } as any)
    .where(eq(deleteRequests.id, requestId));

  const userId = request.userId;

  for (const jobType of JOB_SEQUENCE) {
    const existing = await db.select().from(deleteJobs)
      .where(and(
        eq(deleteJobs.deleteRequestId, requestId),
        eq(deleteJobs.jobType, jobType)
      ))
      .limit(1);

    if (existing.length > 0 && existing[0].status === "completed") continue;

    const [job] = existing.length > 0
      ? existing
      : await db.insert(deleteJobs).values({
          deleteRequestId: requestId,
          jobType,
          status: "pending",
          retryCount: 0,
        }).returning();

    if (job.retryCount >= 3) {
      console.error(`[deletion.worker] job ${jobType} exceeded max retries for request ${requestId}`);
      continue;
    }

    try {
      await db.update(deleteJobs)
        .set({ status: "running", startedAt: new Date() } as any)
        .where(eq(deleteJobs.id, job.id));

      await executeJob(job, requestId, userId);

      await db.update(deleteJobs)
        .set({ status: "completed", completedAt: new Date() } as any)
        .where(eq(deleteJobs.id, job.id));

    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[deletion.worker] job ${jobType} failed:`, err);
      await db.update(deleteJobs)
        .set({
          status: "failed",
          retryCount: job.retryCount + 1,
          errorMessage: errMsg,
        } as any)
        .where(eq(deleteJobs.id, job.id));
    }
  }

  const allJobs = await db.select().from(deleteJobs)
    .where(eq(deleteJobs.deleteRequestId, requestId));

  const allDone = allJobs.length === JOB_SEQUENCE.length &&
    allJobs.every(j => j.status === "completed");

  if (allDone) {
    const now = new Date();
    await db.update(deleteRequests)
      .set({ status: "completed", completedAt: now } as any)
      .where(eq(deleteRequests.id, requestId));

    await db.insert(deleteEvents).values({
      deleteRequestId: requestId,
      eventType: "delete_completed",
      occurredAt: now,
    });

    await trackEvent({
      eventName: "delete_completed",
      actorId: userId,
      props: { requestId },
    });

    console.log(`[deletion.worker] deletion completed for userId=${userId}`);
  }
}

export async function processPendingDeletions(): Promise<void> {
  try {
    const pending = await db.select().from(deleteRequests)
      .where(eq(deleteRequests.status as any, "submitted"))
      .limit(10);

    for (const req of pending) {
      try {
        await runDeleteRequest(req.id);
      } catch (err) {
        console.error(`[deletion.worker] runDeleteRequest failed for ${req.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[deletion.worker] processPendingDeletions failed:", err);
  }
}

export function startDeletionWorker(intervalMs = 30_000): NodeJS.Timeout {
  console.log(`[deletion.worker] started — polling every ${intervalMs}ms`);
  return setInterval(() => {
    processPendingDeletions().catch(err =>
      console.error("[deletion.worker] poll error:", err)
    );
  }, intervalMs);
}
