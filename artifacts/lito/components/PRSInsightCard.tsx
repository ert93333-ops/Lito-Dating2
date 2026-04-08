// ─────────────────────────────────────────────────────────────────────────────
// components/PRSInsightCard.tsx
//
// AI Mutual Interest Signal UI — "대화 신호" card.
//
// FRAMING RULES (hard requirements):
//  ✗ Never say "호감도", "점수", "확률", "좋아해요", "관심도"
//  ✗ Never show raw 0–100 number directly in the main label
//  ✓ Say "대화 신호" / "会話シグナル" — signals, not certainty
//  ✓ Always include reasoning so the user understands why
//  ✓ Support low-confidence / mixed / not-enough-data states gracefully
//
// UX:
//  • Compact bar by default (36px) — doesn't dominate the screen
//  • Tapping expands to show insights + stage + disclaimer
//  • X button collapses back to compact
//  • Loading state: skeleton pulse (no flash)
//  • Error state: silently hidden (don't show broken state)
// ─────────────────────────────────────────────────────────────────────────────

import FIcon from "@/components/FIcon";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { ConversationInterestSnapshot, LowConfidenceState } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PRSCardState =
  | { status: "loading" }
  | { status: "hidden" }  // error or explicitly dismissed
  | { status: "not_enough_data"; lang: "ko" | "ja" }
  | { status: "low_confidence"; lang: "ko" | "ja" }
  | { status: "ready"; snapshot: ConversationInterestSnapshot; lang: "ko" | "ja" };

// ── Copy tables ───────────────────────────────────────────────────────────────

const COPY = {
  notEnoughData: {
    ko: "대화 신호가 쌓이는 중이에요",
    ja: "会話シグナルが蓄積中です",
  },
  lowConfidence: {
    ko: "신호가 아직 불확실해요",
    ja: "シグナルはまだ不確かです",
  },
  signalLabel: {
    ko: "대화 신호",
    ja: "会話シグナル",
  },
  stageBadge: {
    opening:   { ko: "초반 대화", ja: "序盤" },
    discovery: { ko: "탐색 중", ja: "探索中" },
    escalation:{ ko: "진전 신호", ja: "発展段階" },
  },
  strengthLabel: {
    // 0–39
    weak:     { ko: "신호가 약해요", ja: "シグナルが弱いです" },
    // 40–64
    forming:  { ko: "신호가 형성되고 있어요", ja: "シグナルが形成されています" },
    // 65–84
    positive: { ko: "대화 신호가 긍정적이에요", ja: "会話シグナルがポジティブです" },
    // 85–100
    strong:   { ko: "신호가 활발해요", ja: "シグナルが活発です" },
    mixed:    { ko: "신호가 엇갈려요", ja: "シグナルが混在しています" },
  },
  disclaimer: {
    ko: "AI 분석은 참고용이에요. 최종 판단은 본인이 하세요.",
    ja: "AI分析はご参考用です。最終判断はご自身で行ってください。",
  },
  expand: { ko: "자세히 보기", ja: "詳しく見る" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function strengthTier(prs: number): "weak" | "forming" | "positive" | "strong" {
  if (prs < 40)  return "weak";
  if (prs < 65)  return "forming";
  if (prs < 85)  return "positive";
  return "strong";
}

// ── Skeleton pulse ────────────────────────────────────────────────────────────

function SkeletonBar({ width, colors }: { width: number; colors: ReturnType<typeof useColors> }) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          height: 10,
          width,
          borderRadius: 5,
          backgroundColor: colors.border,
        },
        { opacity: anim },
      ]}
    />
  );
}

// ── Signal strength bar (visual only, no number shown) ───────────────────────

function SignalBar({
  prs,
  lowConfidenceState,
  colors,
}: {
  prs: number;
  lowConfidenceState: LowConfidenceState;
  colors: ReturnType<typeof useColors>;
}) {
  const tier = strengthTier(prs);
  const barColor =
    tier === "weak"     ? colors.charcoalFaint :
    tier === "forming"  ? colors.blue :
    tier === "positive" ? colors.rose :
                          colors.rose;

  const alphaOpacity = lowConfidenceState === "mixed_signals" ? 0.6 : 1.0;
  // Use flex-based width to avoid percentage string TS issues
  const fillFlex = Math.max(1, Math.round(prs));
  const remainFlex = Math.max(0, 100 - fillFlex);

  return (
    <View
      style={{
        height: 5,
        flexDirection: "row",
        borderRadius: 3,
        overflow: "hidden",
        marginVertical: 10,
        backgroundColor: colors.border,
      }}
    >
      <View style={{ flex: fillFlex, height: 5, backgroundColor: barColor, opacity: alphaOpacity }} />
      {remainFlex > 0 && <View style={{ flex: remainFlex }} />}
    </View>
  );
}

// ── ConversationStageBadge ────────────────────────────────────────────────────

function ConversationStageBadge({
  stage,
  lang,
  colors,
}: {
  stage: "opening" | "discovery" | "escalation";
  lang: "ko" | "ja";
  colors: ReturnType<typeof useColors>;
}) {
  const label = COPY.stageBadge[stage]?.[lang] ?? COPY.stageBadge.opening[lang];
  const bgColor =
    stage === "escalation" ? colors.roseSoft :
    stage === "discovery"  ? "#E8F0FE" :
                             colors.muted;
  const textColor =
    stage === "escalation" ? colors.rose :
    stage === "discovery"  ? colors.blue :
                             colors.charcoalLight;

  return (
    <View style={[s.stageBadge, { backgroundColor: bgColor }]}>
      <Text style={[s.stageBadgeText, { color: textColor }]}>{label}</Text>
    </View>
  );
}

// ── ReasonInsightList ─────────────────────────────────────────────────────────

function ReasonInsightList({
  insights,
  lang,
  colors,
}: {
  insights: ConversationInterestSnapshot["generatedInsights"];
  lang: "ko" | "ja";
  colors: ReturnType<typeof useColors>;
}) {
  if (!insights || insights.length === 0) return null;

  return (
    <View style={s.insightList}>
      {insights.slice(0, 3).map((item, idx) => {
        const text = lang === "ko" ? item.textKo : item.textJa;
        const dotColor =
          item.polarity === "positive" ? colors.green :
          item.polarity === "negative" ? colors.rose :
                                         colors.charcoalLight;
        return (
          <View key={idx} style={s.insightRow}>
            <View style={[s.insightDot, { backgroundColor: dotColor }]} />
            <Text style={[s.insightText, { color: colors.charcoalMid }]}>{text}</Text>
          </View>
        );
      })}
    </View>
  );
}

// ── ConfidenceAwareInsightBlock (expanded body) ───────────────────────────────

function ConfidenceAwareInsightBlock({
  snapshot,
  lang,
  colors,
}: {
  snapshot: ConversationInterestSnapshot;
  lang: "ko" | "ja";
  colors: ReturnType<typeof useColors>;
}) {
  const tier = strengthTier(snapshot.prsScore);
  const strengthText = snapshot.lowConfidenceState === "mixed_signals"
    ? COPY.strengthLabel.mixed[lang]
    : COPY.strengthLabel[tier][lang];

  return (
    <View style={s.expandedBody}>
      {/* Stage + strength label row */}
      <View style={s.expandedTopRow}>
        <ConversationStageBadge stage={snapshot.stage} lang={lang} colors={colors} />
        <Text style={[s.strengthLabel, { color: colors.charcoalMid }]}>
          {strengthText}
        </Text>
      </View>

      {/* Visual signal bar */}
      <SignalBar
        prs={snapshot.prsScore}
        lowConfidenceState={snapshot.lowConfidenceState}
        colors={colors}
      />

      {/* Reason insights */}
      <ReasonInsightList
        insights={snapshot.generatedInsights}
        lang={lang}
        colors={colors}
      />

      {/* Confidence caveat when mixed */}
      {snapshot.lowConfidenceState === "mixed_signals" && (
        <Text style={[s.caveatText, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "긍정적인 신호와 아닌 신호가 함께 보여요. 조금 더 대화해 보세요."
            : "ポジティブなシグナルとそうでないものが混在しています。"}
        </Text>
      )}

      {/* Disclaimer */}
      <Text style={[s.disclaimer, { color: colors.charcoalFaint }]}>
        {COPY.disclaimer[lang]}
      </Text>
    </View>
  );
}

// ── LowConfidenceFallbackState ────────────────────────────────────────────────

function LowConfidenceFallbackState({
  type,
  lang,
  colors,
}: {
  type: "not_enough_data" | "low_confidence";
  lang: "ko" | "ja";
  colors: ReturnType<typeof useColors>;
}) {
  const text =
    type === "not_enough_data"
      ? COPY.notEnoughData[lang]
      : COPY.lowConfidence[lang];

  return (
    <View style={[s.fallbackRow, { backgroundColor: colors.muted }]}>
      <FIcon name="bar-chart-2" size={13} color={colors.charcoalLight} />
      <Text style={[s.fallbackText, { color: colors.charcoalLight }]}>{text}</Text>
    </View>
  );
}

// ── Main: PRSInsightCard ──────────────────────────────────────────────────────

interface PRSInsightCardProps {
  state: PRSCardState;
  /** Controlled expanded state — parent keeps this via useState */
  expanded: boolean;
  onToggle: () => void;
}

export function PRSInsightCard({ state, expanded, onToggle }: PRSInsightCardProps) {
  const colors = useColors();

  // Hidden states — render nothing to avoid layout noise
  if (state.status === "hidden") return null;

  // Loading state — compact skeleton
  if (state.status === "loading") {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[s.compactRow, { gap: 10 }]}>
          <SkeletonBar width={12} colors={colors} />
          <SkeletonBar width={120} colors={colors} />
        </View>
      </View>
    );
  }

  // Not enough data — static compact strip, no expand
  if (state.status === "not_enough_data") {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <LowConfidenceFallbackState type="not_enough_data" lang={state.lang} colors={colors} />
      </View>
    );
  }

  // Low confidence — static compact strip, no expand
  if (state.status === "low_confidence") {
    return (
      <View style={[s.wrapper, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <LowConfidenceFallbackState type="low_confidence" lang={state.lang} colors={colors} />
      </View>
    );
  }

  // Ready — compact header (always) + expandable body
  const { snapshot, lang } = state;
  const tier = strengthTier(snapshot.prsScore);
  const isMixed = snapshot.lowConfidenceState === "mixed_signals";

  const signalLabel = COPY.signalLabel[lang];
  const strengthText = isMixed
    ? COPY.strengthLabel.mixed[lang]
    : COPY.strengthLabel[tier][lang];

  const dotColor =
    isMixed          ? colors.gold :
    tier === "weak"  ? colors.charcoalFaint :
    tier === "forming"? colors.blue :
                        colors.rose;

  return (
    <View
      style={[
        s.wrapper,
        {
          backgroundColor: colors.surface,
          borderBottomColor: expanded ? colors.border : colors.border,
        },
      ]}
    >
      {/* Compact header row — always visible, tap to expand */}
      <Pressable
        onPress={onToggle}
        style={s.compactRow}
        accessibilityRole="button"
        accessibilityLabel={signalLabel}
        accessibilityHint={lang === "ko" ? "탭하면 자세한 신호를 확인해요" : "タップして詳細を確認"}
      >
        {/* Signal dot */}
        <View style={[s.dot, { backgroundColor: dotColor }]} />

        {/* Label */}
        <Text style={[s.compactLabel, { color: colors.charcoalLight }]}>
          {signalLabel}
        </Text>
        <Text style={[s.compactStrength, { color: colors.charcoalMid }]}>
          {strengthText}
        </Text>

        {/* Chevron */}
        <FIcon
          name={expanded ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.charcoalLight}
          style={{ marginLeft: "auto" }}
        />
      </Pressable>

      {/* Expandable body */}
      {expanded && (
        <ConfidenceAwareInsightBlock
          snapshot={snapshot}
          lang={lang}
          colors={colors}
        />
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
  },

  // Compact header row
  compactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 9,
    minHeight: 36,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  compactLabel: {
    fontSize: 11,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  compactStrength: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Expanded body
  expandedBody: {
    paddingBottom: 14,
    paddingTop: 2,
  },
  expandedTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  strengthLabel: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Stage badge
  stageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stageBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Insights
  insightList: {
    gap: 6,
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  insightDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  insightText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },

  // Caveat / disclaimer
  caveatText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
    fontStyle: "italic",
  },
  disclaimer: {
    fontSize: 10,
    lineHeight: 14,
    marginTop: 4,
  },

  // Fallback
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 6,
    marginVertical: 4,
  },
  fallbackText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
