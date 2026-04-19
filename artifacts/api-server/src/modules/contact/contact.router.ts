/**
 * modules/contact/contact.router.ts
 *
 * 연락처 차단 기능 엔드포인트.
 *
 * 개인정보 보호 원칙:
 *  - 원본 전화번호는 절대 서버에 전달되지 않는다.
 *  - 클라이언트에서 SHA-256 해시 처리 후 해시값만 전송한다.
 *  - 서버는 해시 대 해시로만 비교한다.
 *
 * Endpoints:
 *  PATCH /api/contact/my-phone     — 자신의 전화번호 해시 등록 (연락처에서 나를 차단하게 함)
 *  POST  /api/contact/block        — 연락처 해시 배열 업로드, 매칭 유저 차단 처리
 *  GET   /api/contact/block/count  — 현재 차단된 연락처 수 조회
 *  DELETE /api/contact/block       — 연락처 차단 전체 해제
 */

import { Router } from "express";
import { eq, sql } from "drizzle-orm";
import { db, users, contactBlockHashes } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";
import { logger } from "../../lib/logger.js";

const router = Router();

// ── PATCH /api/contact/my-phone ───────────────────────────────────────────────
// 자신의 전화번호 해시를 등록한다.
// 이렇게 해야 상대방이 나를 연락처에서 발견했을 때 차단 대상이 된다.
router.patch("/contact/my-phone", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { phoneHash } = req.body as { phoneHash?: string };

  if (!phoneHash || typeof phoneHash !== "string" || !/^[a-f0-9]{64}$/i.test(phoneHash)) {
    res.status(400).json({ error: "phoneHash는 64자리 SHA-256 hex 문자열이어야 합니다." });
    return;
  }

  try {
    await db
      .update(users)
      .set({ phoneNumberHash: phoneHash.toLowerCase() })
      .where(eq(users.id, userId));

    logger.info({ userId }, "Phone number hash registered");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, userId }, "Failed to register phone hash");
    res.status(500).json({ error: "전화번호 해시 등록에 실패했습니다." });
  }
});

// ── POST /api/contact/block ───────────────────────────────────────────────────
// 클라이언트가 연락처에서 추출한 SHA-256 해시 배열을 업로드한다.
// 서버는 users.phone_number_hash와 비교해 매칭 유저를 찾고,
// contact_block_hashes 테이블에 저장 (discover에서 제외됨).
// 반환: { blocked: number } — 새로 차단된 연락처 수
router.post("/contact/block", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  const { hashes } = req.body as { hashes?: string[] };

  if (!Array.isArray(hashes) || hashes.length === 0) {
    res.status(400).json({ error: "hashes 배열이 필요합니다." });
    return;
  }

  // 최대 2000개 제한 (연락처 수 상한)
  const validHashes = hashes
    .filter((h): h is string => typeof h === "string" && /^[a-f0-9]{64}$/i.test(h))
    .slice(0, 2000)
    .map((h) => h.toLowerCase());

  if (validHashes.length === 0) {
    res.status(400).json({ error: "유효한 해시가 없습니다." });
    return;
  }

  try {
    // 기존 차단 해시 조회 (중복 제외)
    const existing = await db
      .select({ phoneHash: contactBlockHashes.phoneHash })
      .from(contactBlockHashes)
      .where(eq(contactBlockHashes.userId, userId));
    const existingSet = new Set(existing.map((e) => e.phoneHash));

    const newHashes = validHashes.filter((h) => !existingSet.has(h));

    if (newHashes.length > 0) {
      await db.insert(contactBlockHashes).values(
        newHashes.map((phoneHash) => ({ userId, phoneHash }))
      );
    }

    logger.info({ userId, total: validHashes.length, newlyBlocked: newHashes.length }, "Contact hashes uploaded");
    res.json({ blocked: newHashes.length, total: validHashes.length + existingSet.size });
  } catch (err) {
    logger.error({ err, userId }, "Failed to store contact block hashes");
    res.status(500).json({ error: "연락처 차단 저장에 실패했습니다." });
  }
});

// ── GET /api/contact/block/count ─────────────────────────────────────────────
router.get("/contact/block/count", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactBlockHashes)
      .where(eq(contactBlockHashes.userId, userId));
    res.json({ count: row?.count ?? 0 });
  } catch (err) {
    logger.error({ err }, "Failed to get contact block count");
    res.status(500).json({ error: "조회에 실패했습니다." });
  }
});

// ── DELETE /api/contact/block ─────────────────────────────────────────────────
// 연락처 차단 전체 해제
router.delete("/contact/block", requireAuth, async (req, res) => {
  const userId = req.user!.userId;
  try {
    await db.delete(contactBlockHashes).where(eq(contactBlockHashes.userId, userId));
    logger.info({ userId }, "Contact blocks cleared");
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "Failed to clear contact blocks");
    res.status(500).json({ error: "초기화에 실패했습니다." });
  }
});

export default router;
