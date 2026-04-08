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
    taglineKo: "한국-일본의 인연을 시작해요",
    taglineJa: "韓日の出会いを始めよう",
    price: { KRW: "₩0", JPY: "¥0", USD: "$0" },
    highlights: [
      "Basic profile & discovery",
      "Up to 20 likes/day",
      "Chat with all matches",
      "Real-time KR↔JP translation",
      "3 AI Chemistry Picks/day",
      "Safety & reporting tools",
    ],
    highlightsJa: [
      "プロフィール作成・探索",
      "1日最大20いいね",
      "全マッチとチャット",
      "韓日リアルタイム翻訳",
      "AIケミストリーピック 3回/日",
      "安全・報告ツール",
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
    taglineKo: "더 깊은 연결을 만들어요",
    taglineJa: "つながりをもっと深めよう",
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
    highlightsJa: [
      "いいね無制限",
      "スワイプを巻き戻し",
      "詳細フィルター（国・目的・興味）",
      "ブースト 1回/月 無料",
      "限定トラベルモード",
      "探索での表示優先度アップ",
      "AIケミストリーピック 無制限",
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
    taglineKo: "Lito의 모든 경험을 누려요",
    taglineJa: "Litoのすべてを体験しよう",
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
    highlightsJa: [
      "Plusのすべてを含む",
      "あなたをいいねした人を確認",
      "シークレット・プライベートモード",
      "ダイレクトイントロ 5回/月",
      "探索での優先表示",
      "AIプロフィールコーチ 無制限",
      "AIオープナー提案 無制限",
      "相性の詳細解説",
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
      "ai_coach_unlimited",
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
  {
    id: "ai_coach_credit",
    name: "AI Coach Credits",
    description: "AI conversation coaching uses that stack on top of your daily quota",
    priceUSD: "$0.99",
  },
];

// ── AI Coach credit limits ────────────────────────────────────────────────────

/** Daily AI coach use limit per plan. null = unlimited (Premium). */
export function getAiCoachDailyLimit(planId: PlanId): number | null {
  if (planId === "premium") return null;
  if (planId === "plus") return 20;
  return 5; // free
}

/** Credit pack sizes and their display prices for the purchase UI. */
export const AI_COACH_PACKS = [
  { count: 10, label: "10 uses",  priceUSD: "$0.99",  popular: false },
  { count: 30, label: "30 uses",  priceUSD: "$1.99",  popular: true  },
  { count: 100, label: "100 uses", priceUSD: "$4.99",  popular: false },
] as const;

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
