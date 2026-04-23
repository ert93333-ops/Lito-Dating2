/**
 * coachApi.ts — 서버 authoritative 코치/결제/동의 API 클라이언트
 *
 * 모든 함수는 token이 없으면 null을 반환하거나 에러를 throw하지 않는다.
 * 호출부에서 결과를 null-safe하게 처리해야 한다.
 */

import { API_BASE } from "@/utils/api";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface WalletState {
  balance: number;
  trial_remaining: number;
  paid_remaining: number;
  remaining_total: number;
  isZeroCredit: boolean;
}

export interface ConsentStatus {
  translation: boolean;
  conversation_coach: boolean;
  profile_coach: boolean;
}

export interface ServerProfileSuggestion {
  id: number;
  field: string;
  original: string;
  suggestion: string;
  reason: string;
}

export interface ProfileCoachResult {
  blocked: false;
  coach_output_id: number;
  suggestions: ServerProfileSuggestion[];
  charged: boolean;
  consumption_applied: number;
  consumption_source: "trial" | "paid";
  trial_remaining: number;
  paid_remaining: number;
  remaining_total: number;
}

export interface ProfileCoachBlocked {
  blocked: true;
  block_reason: "blocked_no_consent" | "blocked_zero_credit" | "blocked_unsafe" | "no_consent" | "zero_credit";
  trial_remaining?: number;
  paid_remaining?: number;
  remaining_total?: number;
  message?: string;
}

export interface ConvCoachBlocked {
  blocked: true;
  block_reason: "no_consent" | "zero_credit";
  trial_remaining?: number;
  paid_remaining?: number;
  remaining_total?: number;
}

export type ProfileCoachResponse = ProfileCoachResult | ProfileCoachBlocked;

// ── helpers ────────────────────────────────────────────────────────────────────

function authHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Wallet ─────────────────────────────────────────────────────────────────────

export async function fetchWallet(token: string): Promise<WalletState | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/wallet`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? (json.data as WalletState) : null;
  } catch {
    return null;
  }
}

// ── Consents ───────────────────────────────────────────────────────────────────

export async function fetchConsentStatus(token: string): Promise<ConsentStatus | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/consents`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? (json.data as ConsentStatus) : null;
  } catch {
    return null;
  }
}

export async function grantConsentApi(
  token: string,
  feature: "translation" | "conversation_coach" | "profile_coach"
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/consents/${feature}/grant`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    return !!(json.ok && json.data?.granted);
  } catch {
    return false;
  }
}

// ── Profile Coach ──────────────────────────────────────────────────────────────

export async function requestProfileCoach(
  token: string,
  profileSnapshot: Record<string, string>,
  locale: "ko" | "ja"
): Promise<ProfileCoachResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/profile-coach`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ profileSnapshot, locale }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? (json.data as ProfileCoachResponse) : null;
  } catch {
    return null;
  }
}

export async function saveProfileCoachOutput(
  token: string,
  outputId: number,
  selectedFields: string[]
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/ai/profile-coach/${outputId}/save`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ selectedFields }),
    });
    const json = await res.json();
    return !!json.ok;
  } catch {
    return false;
  }
}

// ── Billing: Coach pack purchase verify ────────────────────────────────────────

export interface PurchaseVerifyPayload {
  platform: "apple" | "google";
  productId: string;
  transactionId: string;
  receiptData?: string;
  purchaseToken?: string;
}

export interface PurchaseVerifyResult {
  ok: true;
  creditsAdded: number;
  newBalance: number;
}

export async function verifyPurchase(
  token: string,
  payload: PurchaseVerifyPayload
): Promise<PurchaseVerifyResult | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/purchases/verify`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? (json.data as PurchaseVerifyResult) : null;
  } catch {
    return null;
  }
}

// ── Billing: Ledger entries ────────────────────────────────────────────────────

export async function fetchLedger(token: string): Promise<unknown[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/billing/ledger`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.ok ? json.data?.entries : null;
  } catch {
    return null;
  }
}

// ── Analytics: server canonical event forwarding ───────────────────────────────

export async function forwardEventToServer(
  token: string,
  eventName: string,
  props?: Record<string, string | number | boolean>
): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/analytics/track`, {
      method: "POST",
      headers: authHeaders(token),
      body: JSON.stringify({ eventName, props }),
    });
  } catch {
    // fire-and-forget, silent fail
  }
}
