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
import { trackEvent } from "../../infra/canonicalAnalytics.js";

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

/**
 * Apple IAP 검증 어댑터
 * 연동 포인트: BILLING_APPLE_SHARED_SECRET 환경변수 설정 필요
 * Apple sandbox: https://sandbox.itunes.apple.com/verifyReceipt
 * Apple production: https://buy.itunes.apple.com/verifyReceipt
 *
 * placeholder 이유: 앱스토어 계정 및 shared secret 미설정
 * 실제 연동 시 receiptData(base64)를 Apple 서버로 POST하고
 * status=0 && in_app[].product_id 일치 여부 확인
 */
async function verifyAppleReceipt(receiptData: string | undefined, productId: string): Promise<string> {
  const sharedSecret = process.env.BILLING_APPLE_SHARED_SECRET;
  if (!sharedSecret) {
    console.warn("[billing/apple] BILLING_APPLE_SHARED_SECRET 미설정 — sandbox 검증 불가 (placeholder 반환)");
    // TODO: 실제 구현 시 이 분기 제거
    // Apple 앱스토어 심사 전 단계에서는 sandbox verify 환경 필요
    throw new Error("APPLE_SECRET_NOT_CONFIGURED");
  }

  if (!receiptData) throw new Error("APPLE_RECEIPT_MISSING");

  const url = process.env.NODE_ENV === "production"
    ? "https://buy.itunes.apple.com/verifyReceipt"
    : "https://sandbox.itunes.apple.com/verifyReceipt";

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ "receipt-data": receiptData, password: sharedSecret }),
  });

  const json = await resp.json() as { status: number; receipt?: { in_app?: Array<{ product_id: string }> } };

  if (json.status === 21007) {
    // production 영수증이지만 sandbox로 전송됨 — sandbox로 재검증
    const sandboxResp = await fetch("https://sandbox.itunes.apple.com/verifyReceipt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "receipt-data": receiptData, password: sharedSecret }),
    });
    const sandboxJson = await sandboxResp.json() as typeof json;
    if (sandboxJson.status !== 0) return "invalid";
    const match = sandboxJson.receipt?.in_app?.some(i => i.product_id === productId);
    return match ? "verified" : "product_mismatch";
  }

  if (json.status !== 0) return "invalid";
  const match = json.receipt?.in_app?.some(i => i.product_id === productId);
  return match ? "verified" : "product_mismatch";
}

/**
 * Google Play 구매 검증 어댑터
 * 연동 포인트: BILLING_GOOGLE_SERVICE_ACCOUNT_JSON 환경변수 설정 필요
 * Google API: https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/products/{productId}/tokens/{purchaseToken}
 *
 * placeholder 이유: Google Play Console 및 서비스 계정 미설정
 */
async function verifyGooglePurchase(purchaseToken: string | undefined, productId: string): Promise<string> {
  const serviceAccountJson = process.env.BILLING_GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson) {
    console.warn("[billing/google] BILLING_GOOGLE_SERVICE_ACCOUNT_JSON 미설정 — 검증 불가 (placeholder 반환)");
    // TODO: 실제 구현 시 googleapis 패키지로 교체
    throw new Error("GOOGLE_SERVICE_ACCOUNT_NOT_CONFIGURED");
  }

  if (!purchaseToken) throw new Error("GOOGLE_PURCHASE_TOKEN_MISSING");

  const packageName = process.env.BILLING_GOOGLE_PACKAGE_NAME ?? "app.litodate";

  // TODO: googleapis JWT 인증 + products.purchases.get 호출
  // const auth = new google.auth.GoogleAuth({ credentials: JSON.parse(serviceAccountJson), scopes: [...] });
  // const androidPublisher = google.androidpublisher({ version: 'v3', auth });
  // const result = await androidPublisher.purchases.products.get({ packageName, productId, token: purchaseToken });
  // if (result.data.purchaseState === 0) return "verified";

  throw new Error("GOOGLE_NOT_YET_IMPLEMENTED");
}

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
    const userId = (req as any).user?.userId;
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

    // Apple/Google 실제 검증
    // placeholder 이유: 앱스토어 심사 전 BILLING_APPLE_SHARED_SECRET, BILLING_GOOGLE_* 미설정
    // 연동 포인트: platform별 분기 → 각 provider verify 함수 호출
    let verificationStatus = "pending";
    try {
      if (platform === "ios") {
        verificationStatus = await verifyAppleReceipt(req.body.receiptData, productId);
      } else if (platform === "android") {
        verificationStatus = await verifyGooglePurchase(req.body.purchaseToken, productId);
      } else {
        res.status(400).json({ ok: false, error: { code: "INVALID_PLATFORM", message: "platform은 ios 또는 android여야 합니다." } });
        return;
      }
    } catch (verifyErr) {
      console.error("[billing/purchases/verify] provider error:", verifyErr);
      res.status(502).json({ ok: false, error: { code: "VERIFICATION_FAILED", message: "영수증 검증 실패. 잠시 후 재시도해주세요." } });
      return;
    }

    if (verificationStatus !== "verified") {
      await db.insert(iapPurchases).values({
        userId,
        platform,
        productId,
        transactionId,
        purchaseToken: purchaseToken || null,
        verificationStatus,
        creditsGranted: 0,
      });
      res.status(400).json({ ok: false, error: { code: "RECEIPT_INVALID", message: "유효하지 않은 영수증입니다.", verificationStatus } });
      return;
    }

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
    const userId = (req as any).user?.userId;

    const [wallet] = await db.select().from(creditWallets)
      .where(eq(creditWallets.userId, userId))
      .limit(1);

    const trialRemaining = wallet?.trialRemaining ?? 3;
    const paidRemaining = wallet?.balanceCache ?? 0;
    const remainingTotal = trialRemaining + paidRemaining;

    res.json({
      ok: true,
      data: {
        balance: paidRemaining,
        trial_remaining: trialRemaining,
        paid_remaining: paidRemaining,
        remaining_total: remainingTotal,
        isZeroCredit: remainingTotal === 0,
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
    const userId = (req as any).user?.userId;

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
