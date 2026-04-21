/**
 * billing.router.ts
 *
 * GET  /api/v1/billing/products           — IAP 상품 목록 (SKU 정보)
 * POST /api/v1/billing/purchases/verify   — IAP 영수증 검증 + wallet grant
 * GET  /api/v1/billing/wallet             — 크레딧 잔액 조회
 * GET  /api/v1/billing/ledger             — 크레딧 내역 조회
 *
 * 구현 규칙:
 * - 번역은 상품 아님 (차감 없음)
 * - 기본 채팅은 상품 아님 (유료화 금지)
 * - 서버 검증 후 wallet grant
 * - 코칭 성공 반환 시만 ledger debit (coaching router에서 처리)
 * - zero_credit이어도 채팅/번역은 유지
 * - SKU: lito_ai_coach_10 / lito_ai_coach_30 / lito_ai_coach_70
 */

import { Router } from "express";
import { eq, desc } from "drizzle-orm";
import { db, iapPurchases, creditWallets, aiLedger } from "@workspace/db";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const IAP_PRODUCTS = [
  {
    productId: "lito_ai_coach_10",
    credits: 10,
    displayName: "AI 코칭 스타터 10회",
    priceKR: "6,600원",
    priceJP: "700엔",
  },
  {
    productId: "lito_ai_coach_30",
    credits: 30,
    displayName: "AI 코칭 스탠다드 30회",
    priceKR: "14,900원",
    priceJP: "1,500엔",
  },
  {
    productId: "lito_ai_coach_70",
    credits: 70,
    displayName: "AI 코칭 밸류 70회",
    priceKR: "29,000원",
    priceJP: "3,000엔",
  },
];

const CREDITS_MAP: Record<string, number> = {
  lito_ai_coach_10: 10,
  lito_ai_coach_30: 30,
  lito_ai_coach_70: 70,
};

/** GET /api/v1/billing/products */
router.get("/v1/billing/products", requireAuth, (req, res) => {
  res.json({ ok: true, data: { products: IAP_PRODUCTS } });
});

/**
 * POST /api/v1/billing/purchases/verify
 * Body: { platform: "ios" | "android", productId: string, transactionId: string, purchaseToken?: string, receiptData?: string }
 *
 * TODO: Apple/Google 실제 서버 검증 구현
 * placeholder: transactionId 기반 중복 방지 + wallet grant 구조만 구현
 */
router.post("/v1/billing/purchases/verify", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { platform, productId, transactionId, purchaseToken } = req.body;

    if (!platform || !productId || !transactionId) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_INPUT", message: "platform, productId, transactionId 필수" }
      });
      return;
    }

    const credits = CREDITS_MAP[productId];
    if (!credits) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_PRODUCT", message: "유효하지 않은 상품 ID" }
      });
      return;
    }

    const existing = await db.select().from(iapPurchases)
      .where(eq(iapPurchases.transactionId, transactionId))
      .limit(1);

    if (existing.length > 0) {
      res.status(409).json({
        ok: false,
        error: { code: "ALREADY_VERIFIED", message: "이미 처리된 거래입니다." }
      });
      return;
    }

    // TODO: 실제 Apple/Google 검증 API 호출
    // 현재는 구조만 구현 (placeholder)
    const verificationStatus = "verified"; // placeholder

    const now = new Date();

    await db.insert(iapPurchases).values({
      userId,
      platform,
      productId,
      transactionId,
      purchaseToken: purchaseToken || null,
      verificationStatus,
      verifiedAt: now,
      creditsGranted: credits,
    });

    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    let newBalance: number;
    if (!wallet) {
      await db.insert(creditWallets).values({ userId, balanceCache: credits, updatedAt: now });
      newBalance = credits;
    } else {
      newBalance = wallet.balanceCache + credits;
      await db.update(creditWallets)
        .set({ balanceCache: newBalance, updatedAt: now })
        .where(eq(creditWallets.userId, userId));
    }

    await db.insert(aiLedger).values({
      userId,
      entryType: "credit",
      credits,
      featureType: "iap_purchase",
      referenceId: transactionId,
      balanceAfter: newBalance,
    });

    res.json({
      ok: true,
      data: {
        verified: true,
        creditsGranted: credits,
        newBalance,
      }
    });
  } catch (err) {
    console.error("[billing/purchases/verify]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/** GET /api/v1/billing/wallet */
router.get("/v1/billing/wallet", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    const balance = wallet?.balanceCache ?? 0;

    res.json({
      ok: true,
      data: {
        balance,
        isZeroCredit: balance === 0,
        note: "채팅과 번역은 크레딧과 무관하게 무료 이용 가능합니다."
      }
    });
  } catch (err) {
    console.error("[billing/wallet]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

/** GET /api/v1/billing/ledger */
router.get("/v1/billing/ledger", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;

    const entries = await db.select().from(aiLedger)
      .where(eq(aiLedger.userId, userId))
      .orderBy(desc(aiLedger.createdAt))
      .limit(50);

    res.json({ ok: true, data: { entries } });
  } catch (err) {
    console.error("[billing/ledger]", err);
    res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "서버 오류" } });
  }
});

export default router;
