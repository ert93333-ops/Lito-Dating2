/**
 * Referral service — code generation, reward logic, and attribution.
 *
 * Uses simple alphanumeric codes. Deep-link resolution (e.g. branch.io)
 * and server-side attribution would replace `resolveReferralCode`
 * in a production environment.
 */

import {
  ReferralReward,
  ReferralRewardType,
  ReferralState,
} from "@/types/growth";

// ── Code generation ───────────────────────────────────────────────────────────

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

export function generateReferralCode(userId: string): string {
  // Deterministic prefix from userId + random suffix so it's memorable
  const prefix = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase();
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return `${prefix}-${suffix}`;
}

export function buildReferralLink(code: string): string {
  // In production, this would be a Firebase Dynamic Link / Branch link.
  return `https://lito.app/invite/${code}`;
}

// ── Reward definitions ────────────────────────────────────────────────────────

interface RewardDefinition {
  type: ReferralRewardType;
  amount: number;
  description: string;
  triggerOn: "signup" | "first_match" | "first_chat";
}

/**
 * Rewards granted to the REFERRER when a referred user hits a trigger.
 * Designed to be product-native (boosts, intros) not cash-like.
 */
export const REFERRAL_REWARDS: RewardDefinition[] = [
  {
    type: "boost",
    amount: 1,
    description: "1 Boost credit for your next invite who signs up",
    triggerOn: "signup",
  },
  {
    type: "direct_intro",
    amount: 1,
    description: "1 Direct Intro credit when your invite gets their first match",
    triggerOn: "first_match",
  },
];

export function buildReferralReward(type: ReferralRewardType, amount: number, reason: string): ReferralReward {
  return {
    id: `reward_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type,
    amount,
    grantedAt: new Date().toISOString(),
    reason,
    claimed: false,
  };
}

// ── State helpers ─────────────────────────────────────────────────────────────

export function defaultReferralState(userId: string): ReferralState {
  return {
    myCode: generateReferralCode(userId),
    referredBy: null,
    successfulReferrals: 0,
    pendingReferrals: 0,
    rewards: [],
  };
}

/** Returns an updated state after a referral is confirmed. */
export function applyReferralSuccess(
  state: ReferralState
): ReferralState {
  const reward = buildReferralReward("boost", 1, "Friend joined Lito using your invite");
  return {
    ...state,
    successfulReferrals: state.successfulReferrals + 1,
    pendingReferrals: Math.max(0, state.pendingReferrals - 1),
    rewards: [...state.rewards, reward],
  };
}

export function claimReward(
  state: ReferralState,
  rewardId: string
): ReferralState {
  return {
    ...state,
    rewards: state.rewards.map((r) =>
      r.id === rewardId ? { ...r, claimed: true } : r
    ),
  };
}

export function unclaimedRewards(state: ReferralState): ReferralReward[] {
  return state.rewards.filter((r) => !r.claimed);
}

export function totalBoostCreditsFromReferrals(state: ReferralState): number {
  return state.rewards
    .filter((r) => r.type === "boost" && !r.claimed)
    .reduce((sum, r) => sum + r.amount, 0);
}
