/**
 * GrowthContext — central state for monetization, AI matching, and referral.
 *
 * Wraps AppContext — read profile from useApp(), growth state from useGrowth().
 * Designed for clean separation: core app state stays in AppContext,
 * all growth/product systems live here.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useApp } from "@/context/AppContext";
import {
  generateChemistryCard,
  generateChemistryPicks,
  generateOpeners,
} from "@/services/aiMatching";
import { trackEvent, setAnalyticsToken } from "@/services/analytics";
import {
  fetchWallet,
  fetchConsentStatus,
  grantConsentApi,
  requestProfileCoach,
  saveProfileCoachOutput,
  type ConsentStatus,
} from "@/services/coachApi";
import {
  defaultSubscriptionState,
  getAiCoachDailyLimit,
  getDailyLikeLimit,
  isEntitled,
  mockAddConsumable,
  mockUpgradeToPlan,
} from "@/services/monetization";
import {
  applyReferralSuccess,
  buildReferralLink,
  claimReward,
  defaultReferralState,
} from "@/services/referral";
import {
  ChemistryCard,
  ChemistryPick,
  ConsumableId,
  EntitlementKey,
  OpenerSuggestion,
  PlanId,
  ProfileField,
  ProfileSuggestion,
  ReferralState,
  SubscriptionState,
} from "@/types/growth";
import { User } from "@/types";

// ── Trial config ───────────────────────────────────────────────────────────────
const SHARED_TRIAL_COUNT = 3;

// ── Context shape ─────────────────────────────────────────────────────────────

interface GrowthContextType {
  // Subscription
  subscription: SubscriptionState;
  isEntitled: (key: EntitlementKey) => boolean;
  getDailyLikesRemaining: () => number;
  consumeOneLike: () => boolean;
  useConsumable: (id: ConsumableId) => boolean;
  addConsumable: (id: ConsumableId, count: number) => void;
  upgradePlan: (planId: PlanId) => void;

  // AI Matching
  chemistryPicks: ChemistryPick[];
  refreshChemistryPicks: () => void;
  getOpeners: (targetUser: User) => OpenerSuggestion[];
  chemistryCard: ChemistryCard | null;
  refreshChemistryCard: () => void;

  // Profile Coach
  profileSuggestions: ProfileSuggestion[];
  profileCoachLoading: boolean;
  profileCoachOutputId: number | null;
  refreshProfileSuggestions: () => Promise<void>;
  acceptSuggestion: (id: string) => Promise<void>;
  rejectSuggestion: (id: string) => void;

  // Referral
  referral: ReferralState;
  getReferralLink: () => string;
  applyReferralCode: (code: string) => boolean;
  claimReferralReward: (rewardId: string) => void;
  simulateReferralSuccess: () => void;

  // Server-authoritative wallet & consents
  walletBalance: number | null;
  trialRemaining: number;
  consentStatus: ConsentStatus | null;
  walletLoading: boolean;
  refreshWallet: () => Promise<void>;
  refreshConsents: () => Promise<void>;
  grantConsent: (feature: "translation" | "conversation_coach" | "profile_coach") => Promise<boolean>;

  // AI Coach credits (local fast path + server authoritative gate)
  getAiCoachCreditsRemaining: () => number;
  consumeAiCoachCredit: () => boolean;
  buyAiCoachCredits: (count: number) => void;

  // Analytics (pass-through so screens don't import service directly)
  track: typeof trackEvent;
}

const GrowthContext = createContext<GrowthContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function GrowthProvider({ children }: { children: React.ReactNode }) {
  const { profile, discoverUsers, updateProfile, token } = useApp();

  const [subscription, setSubscription] = useState<SubscriptionState>(
    defaultSubscriptionState
  );
  const [chemistryPicks, setChemistryPicks] = useState<ChemistryPick[]>([]);
  const [chemistryCard, setChemistryCard] = useState<ChemistryCard | null>(null);
  const [profileSuggestions, setProfileSuggestions] = useState<ProfileSuggestion[]>([]);
  const [profileCoachLoading, setProfileCoachLoading] = useState(false);
  const [profileCoachOutputId, setProfileCoachOutputId] = useState<number | null>(null);
  const [referral, setReferral] = useState<ReferralState>(() =>
    defaultReferralState(profile.id || "user_default")
  );

  // ── Server-authoritative state ────────────────────────────────────────────
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  // Shared trial credits — 3 total, consumed only on successful coach result
  const [trialRemaining, setTrialRemaining] = useState(SHARED_TRIAL_COUNT);

  // Keep refs to avoid stale closures in callbacks
  const profileRef = useRef(profile);
  useEffect(() => { profileRef.current = profile; }, [profile]);

  const subscriptionRef = useRef(subscription);
  useEffect(() => { subscriptionRef.current = subscription; }, [subscription]);

  const tokenRef = useRef(token);
  useEffect(() => { tokenRef.current = token; }, [token]);

  // ── Sync analytics token when login state changes ─────────────────────────
  useEffect(() => {
    setAnalyticsToken(token);
  }, [token]);

  // ── Bootstrap server state when token is available ────────────────────────
  useEffect(() => {
    if (!token) {
      setWalletBalance(null);
      setConsentStatus(null);
      return;
    }
    fetchWallet(token).then((w) => { if (w) setWalletBalance(w.balance); });
    fetchConsentStatus(token).then((c) => { if (c) setConsentStatus(c); });
  }, [token]);

  // Generate initial chemistry picks once profile + candidates are available
  useEffect(() => {
    if (discoverUsers.length > 0 && chemistryPicks.length === 0) {
      const limit = subscription.planId === "free" ? 3 : 10;
      const picks = generateChemistryPicks(profile, discoverUsers, limit);
      setChemistryPicks(picks);
    }
  }, [discoverUsers.length, profile.id]);

  // ── Subscription methods ────────────────────────────────────────────────────

  const checkEntitlement = useCallback((key: EntitlementKey): boolean => {
    return isEntitled(subscriptionRef.current, key);
  }, []);

  const getDailyLikesRemaining = useCallback((): number => {
    const limit = getDailyLikeLimit(subscriptionRef.current.planId);
    if (limit === null) return Infinity;
    const used = subscriptionRef.current.featureUsage["daily_likes"] ?? 0;
    return Math.max(0, limit - used);
  }, []);

  const consumeOneLike = useCallback((): boolean => {
    const remaining = getDailyLikesRemaining();
    if (remaining <= 0) {
      trackEvent("feature_gate_hit", { feature: "daily_likes", plan: subscriptionRef.current.planId });
      return false;
    }
    setSubscription((prev) => ({
      ...prev,
      featureUsage: {
        ...prev.featureUsage,
        daily_likes: (prev.featureUsage["daily_likes"] ?? 0) + 1,
      },
    }));
    return true;
  }, [getDailyLikesRemaining]);

  const useConsumable = useCallback((id: ConsumableId): boolean => {
    const count = subscriptionRef.current.consumables[id] ?? 0;
    if (count <= 0) {
      trackEvent("feature_gate_hit", { feature: id, plan: subscriptionRef.current.planId });
      return false;
    }
    setSubscription((prev) => ({
      ...prev,
      consumables: {
        ...prev.consumables,
        [id]: (prev.consumables[id] ?? 0) - 1,
      },
    }));
    if (id === "boost") trackEvent("boost_used");
    if (id === "direct_intro") trackEvent("direct_intro_used");
    return true;
  }, []);

  const addConsumable = useCallback((id: ConsumableId, count: number) => {
    setSubscription((prev) => mockAddConsumable(prev, id, count));
  }, []);

  const upgradePlan = useCallback((planId: PlanId) => {
    trackEvent("purchase_started", { plan: planId });
    // Mock upgrade — replace with real billing in production
    setSubscription((prev) => mockUpgradeToPlan(prev, planId));
    trackEvent("purchase_completed", { plan: planId });
  }, []);

  // ── AI Coach credit methods ─────────────────────────────────────────────────

  const getAiCoachCreditsRemaining = useCallback((): number => {
    const sub = subscriptionRef.current;
    // Premium users have unlimited access — return a sentinel Infinity
    if (isEntitled(sub, "ai_coach_unlimited")) return Infinity;
    const dailyLimit = getAiCoachDailyLimit(sub.planId) ?? 0;
    const usedToday = sub.featureUsage["ai_coach_uses"] ?? 0;
    const planLeft = Math.max(0, dailyLimit - usedToday);
    const packs = sub.consumables["ai_coach_credit"] ?? 0;
    return planLeft + packs;
  }, []);

  const consumeAiCoachCredit = useCallback((): boolean => {
    const sub = subscriptionRef.current;
    // Premium unlimited — allow without deduction
    if (isEntitled(sub, "ai_coach_unlimited")) {
      trackEvent("ai_coach_used" as any);
      return true;
    }
    const dailyLimit = getAiCoachDailyLimit(sub.planId) ?? 0;
    const usedToday = sub.featureUsage["ai_coach_uses"] ?? 0;
    const planLeft = Math.max(0, dailyLimit - usedToday);
    const packs = sub.consumables["ai_coach_credit"] ?? 0;

    if (planLeft > 0) {
      // Deduct from daily plan quota
      setSubscription((prev) => ({
        ...prev,
        featureUsage: { ...prev.featureUsage, ai_coach_uses: usedToday + 1 },
      }));
      trackEvent("ai_coach_used" as any);
      return true;
    } else if (packs > 0) {
      // Deduct from purchased credit pack
      setSubscription((prev) => ({
        ...prev,
        consumables: { ...prev.consumables, ai_coach_credit: packs - 1 },
      }));
      trackEvent("ai_coach_used" as any);
      return true;
    } else {
      trackEvent("feature_gate_hit", { feature: "ai_coach", plan: sub.planId });
      return false;
    }
  }, []);

  const buyAiCoachCredits = useCallback((count: number) => {
    setSubscription((prev) => mockAddConsumable(prev, "ai_coach_credit", count));
    trackEvent("purchase_completed", { plan: "consumable" } as any);
  }, []);

  // ── AI Matching methods ─────────────────────────────────────────────────────

  const refreshChemistryPicks = useCallback(() => {
    const limit = subscriptionRef.current.planId === "free" ? 3 : 10;
    const picks = generateChemistryPicks(profileRef.current, discoverUsers, limit);
    setChemistryPicks(picks);
    trackEvent("daily_picks_viewed");
  }, [discoverUsers]);

  const getOpeners = useCallback((targetUser: User): OpenerSuggestion[] => {
    return generateOpeners(profileRef.current, targetUser);
  }, []);

  const refreshChemistryCard = useCallback(() => {
    const card = generateChemistryCard(profileRef.current);
    setChemistryCard(card);
    trackEvent("chemistry_card_generated");
  }, []);

  // ── Server wallet / consent methods ────────────────────────────────────────

  const refreshWallet = useCallback(async (): Promise<void> => {
    const t = tokenRef.current;
    if (!t) return;
    setWalletLoading(true);
    try {
      const w = await fetchWallet(t);
      if (w) setWalletBalance(w.balance);
    } finally {
      setWalletLoading(false);
    }
  }, []);

  const refreshConsents = useCallback(async (): Promise<void> => {
    const t = tokenRef.current;
    if (!t) return;
    const c = await fetchConsentStatus(t);
    if (c) setConsentStatus(c);
  }, []);

  const grantConsent = useCallback(async (
    feature: "translation" | "conversation_coach" | "profile_coach"
  ): Promise<boolean> => {
    const t = tokenRef.current;
    if (!t) return false;
    const ok = await grantConsentApi(t, feature);
    if (ok) {
      setConsentStatus((prev) => prev ? { ...prev, [feature]: true } : { translation: false, conversation_coach: false, profile_coach: false, [feature]: true });
      trackEvent("consent_granted", { feature });
    }
    return ok;
  }, []);

  // ── Profile Coach methods ───────────────────────────────────────────────────

  const refreshProfileSuggestions = useCallback(async (): Promise<void> => {
    const t = tokenRef.current;
    if (!t) return;
    setProfileCoachLoading(true);
    setProfileCoachOutputId(null);
    trackEvent("profile_coach_opened");
    try {
      const p = profileRef.current;
      const profileSnapshot: Record<string, string> = {};
      if (p.bio) profileSnapshot.bio = p.bio;
      if (p.intro) profileSnapshot.intro = p.intro;
      const locale: "ko" | "ja" = (p as any).country === "JP" ? "ja" : "ko";
      const result = await requestProfileCoach(t, profileSnapshot, locale);
      if (!result) return;
      if (result.blocked) {
        return;
      }
      setProfileCoachOutputId(result.coach_output_id);
      const fieldLabels: Record<string, string> = { intro: "한 줄 소개", bio: "자기소개" };
      const mapped: ProfileSuggestion[] = result.suggestions.map((s) => ({
        id: String(s.id),
        field: s.field as ProfileField,
        label: fieldLabels[s.field] ?? s.field,
        original: s.original ?? "",
        suggestion: s.suggestion,
        reason: s.reason ?? "",
        accepted: null,
        generatedAt: new Date().toISOString(),
      }));
      setProfileSuggestions(mapped);
      trackEvent("profile_coach_saved");
    } finally {
      setProfileCoachLoading(false);
    }
  }, []);

  const acceptSuggestion = useCallback(async (id: string): Promise<void> => {
    const t = tokenRef.current;
    setProfileSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        updateProfile({ [s.field]: s.suggestion } as any);
        trackEvent("profile_suggestion_accepted", { field: s.field });
        return { ...s, accepted: true };
      })
    );
    // Persist accepted state to server if we have an outputId
    if (t && profileCoachOutputId !== null) {
      const accepted = profileSuggestions
        .filter((s) => s.id === id || s.accepted === true)
        .map((s) => s.field);
      await saveProfileCoachOutput(t, profileCoachOutputId, accepted).catch(() => {});
    }
  }, [updateProfile, profileCoachOutputId, profileSuggestions]);

  const rejectSuggestion = useCallback((id: string) => {
    setProfileSuggestions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        trackEvent("profile_suggestion_rejected", { field: s.field });
        return { ...s, accepted: false };
      })
    );
  }, []);

  // ── Referral methods ────────────────────────────────────────────────────────

  const getReferralLink = useCallback((): string => {
    const link = buildReferralLink(referral.myCode);
    trackEvent("invite_link_created", { code: referral.myCode });
    return link;
  }, [referral.myCode]);

  const applyReferralCode = useCallback((code: string): boolean => {
    if (code === referral.myCode) return false; // can't use own code
    if (referral.referredBy) return false; // already referred
    setReferral((prev) => ({ ...prev, referredBy: code }));
    trackEvent("referral_signup_completed", { code });
    return true;
  }, [referral.myCode, referral.referredBy]);

  const claimReferralReward = useCallback((rewardId: string) => {
    setReferral((prev) => claimReward(prev, rewardId));
    // Apply consumable reward
    const reward = referral.rewards.find((r) => r.id === rewardId);
    if (reward?.type === "boost") {
      addConsumable("boost", reward.amount);
    } else if (reward?.type === "direct_intro") {
      addConsumable("direct_intro", reward.amount);
    }
  }, [referral.rewards, addConsumable]);

  const simulateReferralSuccess = useCallback(() => {
    setReferral((prev) => applyReferralSuccess(prev));
    trackEvent("referral_reward_granted");
  }, []);

  // ── Value ───────────────────────────────────────────────────────────────────

  return (
    <GrowthContext.Provider
      value={{
        subscription,
        isEntitled: checkEntitlement,
        getDailyLikesRemaining,
        consumeOneLike,
        useConsumable,
        addConsumable,
        upgradePlan,
        chemistryPicks,
        refreshChemistryPicks,
        getOpeners,
        chemistryCard,
        refreshChemistryCard,
        profileSuggestions,
        profileCoachLoading,
        profileCoachOutputId,
        refreshProfileSuggestions,
        acceptSuggestion,
        rejectSuggestion,
        referral,
        getReferralLink,
        applyReferralCode,
        claimReferralReward,
        simulateReferralSuccess,
        walletBalance,
        trialRemaining,
        consentStatus,
        walletLoading,
        refreshWallet,
        refreshConsents,
        grantConsent,
        getAiCoachCreditsRemaining,
        consumeAiCoachCredit,
        buyAiCoachCredits,
        track: trackEvent,
      }}
    >
      {children}
    </GrowthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useGrowth(): GrowthContextType {
  const ctx = useContext(GrowthContext);
  if (!ctx) throw new Error("useGrowth must be used within GrowthProvider");
  return ctx;
}
