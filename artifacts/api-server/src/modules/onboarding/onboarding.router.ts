/**
 * onboarding.router.ts
 *
 * POST /api/v1/onboarding/age-gate     — 18+ 확인 (비협상)
 * POST /api/v1/onboarding/required-consents — 정책 동의 기록
 *
 * 구현 규칙:
 * - age gate는 서버 측 연령 상태 유지 필수
 * - age gate 실패 시 underage로 즉시 응답, 계정 생성 금지
 * - consent 동의는 policy_acceptances 테이블에 기록
 */

import { Router } from "express";
import { eq, and } from "drizzle-orm";
import { db, users, policyAcceptances } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

/**
 * POST /api/v1/onboarding/age-gate
 * Body: { birthYear: number, birthMonth: number, birthDay: number }
 * - 18세 미만이면 403 underage 반환
 * - 성인이면 users.ageGatePassed = true 업데이트
 */
router.post("/v1/onboarding/age-gate", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { birthYear, birthMonth, birthDay } = req.body;

    if (!birthYear || !birthMonth || !birthDay) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_INPUT", message: "생년월일을 입력해주세요." }
      });
      return;
    }

    const today = new Date();
    const birthDate = new Date(birthYear, birthMonth - 1, birthDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    if (age < 18) {
      res.status(403).json({
        ok: false,
        error: { code: "UNDERAGE", message: "LITO는 18세 이상만 이용 가능합니다." }
      });
      return;
    }

    await db.update(users)
      .set({ ageGatePassed: true, updatedAt: new Date() })
      .where(eq(users.id, userId));

    res.json({
      ok: true,
      data: { ageGatePassed: true }
    });
  } catch (err) {
    console.error("[onboarding/age-gate]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/**
 * POST /api/v1/onboarding/required-consents
 * Body: { consents: Array<{ policyType: string, policyVersion: string, accepted: boolean }> }
 * - policyType: "terms", "privacy", "community", "child_safety"
 * - 모두 accepted: true 여야 통과
 * - AI 번역/코칭 동의는 여기서 받지 않는다 (기능 사용 시 별도)
 */
router.post("/v1/onboarding/required-consents", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { consents } = req.body;

    if (!Array.isArray(consents) || consents.length === 0) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_INPUT", message: "동의 항목을 입력해주세요." }
      });
      return;
    }

    const requiredTypes = ["terms", "privacy", "community"];
    const allAccepted = requiredTypes.every((t) =>
      consents.some((c: any) => c.policyType === t && c.accepted === true)
    );

    if (!allAccepted) {
      res.status(400).json({
        ok: false,
        error: { code: "REQUIRED_CONSENTS_NOT_GIVEN", message: "필수 약관에 모두 동의해야 합니다." }
      });
      return;
    }

    const now = new Date();
    const ipAddress = req.ip || null;
    const userAgent = req.headers["user-agent"] || null;

    const rows = consents.map((c: any) => ({
      userId,
      policyType: c.policyType,
      policyVersion: c.policyVersion || "1.0",
      accepted: c.accepted,
      acceptedAt: now,
      ipAddress,
      userAgent,
    }));

    await db.insert(policyAcceptances).values(rows);

    res.json({
      ok: true,
      data: { consentsRecorded: rows.length }
    });
  } catch (err) {
    console.error("[onboarding/required-consents]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
