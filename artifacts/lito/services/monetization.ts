/**
 * Monetization service — plan definitions, entitlement mapping,
 * usage limits, and billing abstraction.
 *
 * Billing is intentionally mocked. Real App Store / Play Store billing
 * (via RevenueCat or similar) can be connected by replacing the
 * `mockPurchase` function and wiring up receipt validation.
 */

import {
  ConsumableDefinition,
  ConsumableId,
  EntitlementKey,
  Plan,
  PlanId,
  SubscriptionState,
} from "@/types/growth";

// ── Plan definitions ──────────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "Start your Korean-Japanese journey",
    price: { KRW: "₩0", JPY: "¥0", USD: "$0" },
    highlights: [
      "Basic profile & discovery",
      "Up to 20 likes/day",
      "Chat with all matches",
      "Real-time KR↔JP translation",
      "3 AI Chemistry Picks/day",
      "Safety & reporting tools",
    ],
    entitlements: ["chemistry_picks_daily"],
    dailyLikes: 20,
    monthlyBoosts: 0,
    monthlyDirectIntros: 0,
  },
  {
    id: "plus",
    name: "Plus",
    tagline: "Accelerate your connections",
    price: { KRW: "₩12,900/월", JPY: "¥1,200/月", USD: "$9.99/mo" },
    highlights: [
      "Unlimited likes",
      "Rewind last swipe",
      "Advanced filters (country, intent, interests)",
      "1 free Boost/month",
      "Limited Travel Mode",
      "Better discovery visibility",
      "Unlimited AI Chemistry Picks",
    ],
    entitlements: [
      "chemistry_picks_daily",
      "unlimited_likes",
      "rewind",
      "advanced_filters",
      "boost_monthly",
      "travel_mode",
    ],
    dailyLikes: null,
    monthlyBoosts: 1,
    monthlyDirectIntros: 0,
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "The full Lito experience",
    price: { KRW: "₩24,900/월", JPY: "¥2,200/月", USD: "$19.99/mo" },
    highlights: [
      "Everything in Plus",
      "See who liked you",
      "Incognito / private mode",
      "5 Direct Intros/month",
      "Priority exposure in discovery",
      "Unlimited AI Profile Coach",
      "Unlimited AI Opener suggestions",
      "Deep compatibility explanations",
    ],
    entitlements: [
      "chemistry_picks_daily",
      "unlimited_likes",
      "rewind",
      "advanced_filters",
      "boost_monthly",
      "travel_mode",
      "see_who_liked",
      "incognito",
      "direct_intro",
      "ai_profile_coach",
      "ai_opener_unlimited",
      "priority_exposure",
    ],
    dailyLikes: null,
    monthlyBoosts: 2,
    monthlyDirectIntros: 5,
  },
];

export function getPlan(id: PlanId): Plan {
  return PLANS.find((p) => p.id === id) ?? PLANS[0];
}

// ── Consumable definitions ────────────────────────────────────────────────────

export const CONSUMABLES: ConsumableDefinition[] = [
  {
    id: "boost",
    name: "Boost",
    description: "Rise to the top of discovery for 30 minutes",
    priceUSD: "$2.99",
  },
  {
    id: "direct_intro",
    name: "Direct Intro",
    description: "Send a first message before matching",
    priceUSD: "$4.99",
  },
  {
    id: "city_pass",
    name: "City Pass",
    description: "Browse and match in a city for 48 hours",
    priceUSD: "$3.99",
  },
  {
    id: "ai_review",
    name: "AI Profile Review",
    description: "In-depth AI analysis of your profile with improvement tips",
    priceUSD: "$1.99",
  },
];

export function getConsumable(id: ConsumableId): ConsumableDefinition | undefined {
  return CONSUMABLES.find((c) => c.id === id);
}

// ── Entitlement checks ────────────────────────────────────────────────────────

export function isEntitled(
  subscription: SubscriptionState,
  key: EntitlementKey
): boolean {
  const plan = getPlan(subscription.planId);
  return plan.entitlements.includes(key);
}

// ── Usage limits ──────────────────────────────────────────────────────────────

/** Daily like limit for a given plan. null = unlimited. */
export function getDailyLikeLimit(planId: PlanId): number | null {
  return getPlan(planId).dailyLikes;
}

/** How many uses of a feature are remaining in the current period. */
export function getUsageRemaining(
  subscription: SubscriptionState,
  featureKey: string,
  limit: number
): number {
  const used = subscription.featureUsage[featureKey] ?? 0;
  return Math.max(0, limit - used);
}

// ── Default state ─────────────────────────────────────────────────────────────

export function defaultSubscriptionState(): SubscriptionState {
  return {
    planId: "free",
    expiresAt: null,
    consumables: {},
    featureUsage: {},
    purchaseHistory: [],
  };
}

// ── Mock billing ──────────────────────────────────────────────────────────────
/**
 * Simulates a successful plan upgrade.
 * Replace with RevenueCat / App Store / Play Store purchase flow.
 * NEVER mark this as a real purchase in production code paths.
 */
export function mockUpgradeToPlan(
  current: SubscriptionState,
  planId: PlanId
): SubscriptionState {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  return {
    ...current,
    planId,
    expiresAt,
    purchaseHistory: [
      ...current.purchaseHistory,
      {
        id: `purchase_${Date.now()}`,
        type: "subscription",
        planId,
        purchasedAt: new Date().toISOString(),
        priceDisplay: getPlan(planId).price.USD,
      },
    ],
  };
}

export function mockAddConsumable(
  current: SubscriptionState,
  consumableId: ConsumableId,
  quantity: number
): SubscriptionState {
  const existing = current.consumables[consumableId] ?? 0;
  const def = getConsumable(consumableId);
  return {
    ...current,
    consumables: {
      ...current.consumables,
      [consumableId]: existing + quantity,
    },
    purchaseHistory: [
      ...current.purchaseHistory,
      {
        id: `purchase_${Date.now()}`,
        type: "consumable",
        consumableId,
        quantity,
        purchasedAt: new Date().toISOString(),
        priceDisplay: def?.priceUSD ?? "—",
      },
    ],
  };
}
