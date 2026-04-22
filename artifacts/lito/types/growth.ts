// ── Plan & Monetization Types ─────────────────────────────────────────────────

export type PlanId = "free" | "plus" | "premium";

/**
 * Entitlements gate specific features. Checked via useEntitlement().
 * Never paywall translation, safety, or basic matching/chat.
 */
export type EntitlementKey =
  | "unlimited_likes"        // Plus+: no daily like cap
  | "rewind"                 // Plus+: undo last swipe
  | "advanced_filters"       // Plus+: filter by country, intent, interests
  | "boost_monthly"          // Plus+: 1 free boost/month
  | "travel_mode"            // Plus+: limited city/travel browsing
  | "see_who_liked"          // Premium: see all incoming likes
  | "incognito"              // Premium: browse without appearing in discovery
  | "direct_intro"           // Premium: limited cold-start message quota
  | "ai_profile_coach"       // Premium: unlimited AI coach usage
  | "ai_opener_unlimited"    // Premium: unlimited AI opener suggestions
  | "priority_exposure"      // Premium: ranked higher in discovery
  | "chemistry_picks_daily"  // All plans: basic picks (Free = 3/day, Plus+ = unlimited)
  | "ai_coach_unlimited";   // Premium: unlimited AI conversation coach uses

export type ConsumableId = "boost" | "direct_intro" | "city_pass" | "ai_review" | "ai_coach_credit";

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  taglineKo?: string;
  taglineJa?: string;
  /** Display prices (not real billing) */
  price: { KRW: string; JPY: string; USD: string };
  /** Feature bullets shown in comparison UI */
  highlights: string[];
  highlightsKo?: string[];
  highlightsJa?: string[];
  entitlements: EntitlementKey[];
  dailyLikes: number | null; // null = unlimited
  monthlyBoosts: number;
  monthlyDirectIntros: number;
}

export interface ConsumableDefinition {
  id: ConsumableId;
  name: string;
  description: string;
  priceUSD: string;
}

export interface SubscriptionState {
  planId: PlanId;
  expiresAt: string | null;
  consumables: Partial<Record<ConsumableId, number>>;
  /** Tracks per-period usage, e.g. { daily_likes: 5, ai_coach_uses: 2 } */
  featureUsage: Record<string, number>;
  purchaseHistory: PurchaseRecord[];
}

export interface PurchaseRecord {
  id: string;
  type: "subscription" | "consumable";
  planId?: PlanId;
  consumableId?: ConsumableId;
  quantity?: number;
  purchasedAt: string;
  priceDisplay: string;
}

// ── Referral Types ────────────────────────────────────────────────────────────

export type ReferralRewardType =
  | "boost"
  | "direct_intro"
  | "premium_trial_7d"
  | "bonus_likes_50";

export interface ReferralReward {
  id: string;
  type: ReferralRewardType;
  amount: number;
  grantedAt: string;
  reason: string;
  claimed: boolean;
}

export interface ReferralState {
  myCode: string;
  referredBy: string | null;
  successfulReferrals: number;
  pendingReferrals: number;
  rewards: ReferralReward[];
}

// ── AI Matching Types ─────────────────────────────────────────────────────────

/**
 * Heuristic compatibility scores (0–100).
 * Rule-based for MVP. Designed so real ML scores can replace each dimension.
 */
export interface CompatibilityBreakdown {
  intentFit: number;          // Relationship goal alignment
  interestOverlap: number;    // Shared hobbies/interests
  culturalFit: number;        // KR↔JP openness & cross-cultural comfort
  conversationStyle: number;  // Communication style compatibility
  meetingFeasibility: number; // City proximity or travel openness
}

export interface ChemistryPick {
  userId: string;
  score: number; // 0–100 weighted composite
  breakdown: CompatibilityBreakdown;
  reasons: string[]; // 1–3 human-readable explanation lines
  isTopPick: boolean;
  generatedAt: string;
}

// ── Profile Coach Types ───────────────────────────────────────────────────────

export type ProfileField = "intro" | "bio";

export interface ProfileSuggestion {
  id: string;
  field: ProfileField;
  label: string; // display name for the field
  original: string;
  suggestion: string;
  reason: string;
  accepted: boolean | null; // null = pending user review
  generatedAt: string;
}

// ── Opener Suggestions ────────────────────────────────────────────────────────

export interface OpenerSuggestion {
  text: string;
  context: string; // Why this opener fits (shown as a soft hint)
}

// ── Chemistry Card (shareable) ────────────────────────────────────────────────

export interface ChemistryCard {
  datingType: string;          // e.g. "The Curious Bridge"
  datingTypeBi: string;        // Korean or Japanese translation
  emoji: string;               // Representing the type
  description: string;
  traits: string[];
  compatibleWith: string;
  generatedAt: string;
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  // Monetization
  | "paywall_viewed"
  | "plan_selected"
  | "purchase_started"
  | "purchase_completed"
  | "purchase_verified"
  | "purchase_failed"
  | "purchase_cancelled"
  | "purchase_success_returned"
  | "feature_gate_hit"
  | "boost_used"
  | "direct_intro_used"
  // AI Matching
  | "daily_picks_viewed"
  | "daily_pick_liked"
  | "profile_coach_opened"
  | "profile_coach_saved"
  | "profile_suggestion_accepted"
  | "profile_suggestion_rejected"
  | "opener_suggestion_used"
  | "ai_recommendation_liked"
  // Conversation Coach
  | "first_message_help_opened"
  | "first_message_seed_inserted"
  | "coach_entry_visible"
  | "coach_opened"
  | "coach_action_selected"
  | "coach_request_started"
  | "coach_request_completed"
  | "coach_result_rendered"
  | "coach_result_selected"
  | "coach_result_applied_to_draft"
  | "coach_result_abandoned"
  | "coach_blocked_no_consent"
  | "coach_blocked_zero_credit"
  | "coach_blocked_unsafe"
  | "coach_request_no_charge_failure"
  // Consent
  | "consent_sheet_shown"
  | "consent_granted"
  | "consent_declined"
  // Viral / Referral
  | "invite_link_created"
  | "referral_code_shared"
  | "referral_signup_completed"
  | "referral_reward_granted"
  | "chemistry_card_generated"
  | "chemistry_card_shared"
  | "friend_help_started"
  // AI coach (legacy)
  | "ai_coach_used";
