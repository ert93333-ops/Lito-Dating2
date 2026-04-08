import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { PLANS } from "@/services/monetization";
import { PlanId } from "@/types/growth";

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  planId,
  selected,
  onSelect,
}: {
  planId: PlanId;
  selected: boolean;
  onSelect: () => void;
}) {
  const colors = useColors();
  const { lang } = useLocale();
  const plan = PLANS.find((p) => p.id === planId)!;
  const isPremium = planId === "premium";
  const isPlus = planId === "plus";

  const accentColor = isPremium ? "#B83058" : isPlus ? colors.rose : colors.charcoalLight;
  const bgColor = isPremium ? "#FFF4F7" : isPlus ? "#FFF8FA" : colors.white;
  const tagline = lang === "ja" ? (plan.taglineJa ?? plan.tagline) : plan.tagline;
  const highlights = lang === "ja" ? (plan.highlightsJa ?? plan.highlights) : plan.highlights;

  return (
    <TouchableOpacity
      style={[
        styles.planCard,
        {
          backgroundColor: bgColor,
          borderColor: selected ? accentColor : colors.border,
          borderWidth: selected ? 2 : 1.5,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.88}
    >
      {isPremium && (
        <View style={[styles.planBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.planBadgeText}>
            {lang === "ko" ? "가장 인기" : "人気No.1"}
          </Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <View>
          <Text style={[styles.planName, { color: accentColor }]}>{plan.name}</Text>
          <Text style={[styles.planTagline, { color: colors.charcoalLight }]}>
            {tagline}
          </Text>
        </View>
        <Text style={[styles.planPrice, { color: colors.charcoal }]}>
          {plan.price.USD}
        </Text>
      </View>

      <View style={[styles.planDivider, { backgroundColor: colors.border }]} />

      {highlights.map((h, i) => (
        <View key={i} style={styles.planFeatureRow}>
          <Feather
            name="check"
            size={13}
            color={planId === "free" ? colors.charcoalLight : accentColor}
          />
          <Text style={[styles.planFeatureText, { color: colors.charcoalMid }]}>
            {h}
          </Text>
        </View>
      ))}

      {selected && planId !== "free" && (
        <View style={[styles.selectedIndicator, { backgroundColor: accentColor }]}>
          <Feather name="check" size={14} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

// ── PaywallScreen ─────────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { subscription, upgradePlan, track } = useGrowth();
  const { lang } = useLocale();

  const [selectedPlan, setSelectedPlan] = useState<PlanId>("premium");
  const [loading, setLoading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isCurrent = (planId: PlanId) => subscription.planId === planId;

  const handleUpgrade = async () => {
    if (selectedPlan === "free") return;
    if (isCurrent(selectedPlan)) { router.back(); return; }
    setLoading(true);
    track("plan_selected", { plan: selectedPlan });
    await new Promise((r) => setTimeout(r, 900)); // Simulate billing
    upgradePlan(selectedPlan);
    setUpgraded(true);
    setLoading(false);
    setTimeout(() => router.back(), 1400);
  };

  React.useEffect(() => {
    track("paywall_viewed", { entry_plan: subscription.planId });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#FFF0F3", colors.white]}
        style={[styles.headerGrad, { paddingTop: topPad + 16 }]}
      >
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
        >
          <Feather name="x" size={22} color={colors.charcoalMid} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "Lito 멤버십" : "Lito メンバーシップ"}
        </Text>
        <Text style={[styles.headerSub, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "한국-일본 연결을 더 깊게 경험하세요"
            : "韓日の繋がりをより深く体験しましょう"}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 140 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Trust line ─────────────────────────────────────────────── */}
        <View style={[styles.trustRow, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
          <Feather name="shield" size={13} color={colors.rose} />
          <Text style={[styles.trustText, { color: colors.rose }]}>
            {lang === "ko"
              ? "번역, 안전 기능, 기본 채팅은 항상 무료입니다"
              : "翻訳・安全機能・基本チャットは常に無料です"}
          </Text>
        </View>

        {/* ── Plan cards ─────────────────────────────────────────────── */}
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            planId={plan.id}
            selected={selectedPlan === plan.id}
            onSelect={() => setSelectedPlan(plan.id)}
          />
        ))}

        {/* ── Consumables note ────────────────────────────────────────── */}
        <Text style={[styles.consumableNote, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "부스트, 다이렉트 인트로 등 개별 아이템도 구입 가능합니다"
            : "ブースト・ダイレクトイントロなど単品購入も可能です"}
        </Text>
      </ScrollView>

      {/* ── Sticky CTA ─────────────────────────────────────────────────── */}
      <View
        style={[
          styles.footer,
          { paddingBottom: bottomPad + 14, borderTopColor: colors.border },
        ]}
      >
        {upgraded ? (
          <View style={[styles.successRow, { backgroundColor: "#EFFAF4" }]}>
            <Feather name="check-circle" size={18} color="#1A7A4A" />
            <Text style={[styles.successText, { color: "#1A7A4A" }]}>
              {lang === "ko" ? "업그레이드 완료!" : "アップグレード完了！"}
            </Text>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.ctaBtn,
              {
                backgroundColor:
                  selectedPlan === "free" || isCurrent(selectedPlan)
                    ? colors.charcoalMid
                    : "#B83058",
                opacity: pressed ? 0.88 : 1,
              },
            ]}
            onPress={handleUpgrade}
            disabled={loading || selectedPlan === "free"}
          >
            <Text style={styles.ctaBtnText}>
              {loading
                ? (lang === "ko" ? "처리 중..." : "処理中...")
                : isCurrent(selectedPlan)
                ? (lang === "ko" ? "현재 플랜" : "現在のプラン")
                : selectedPlan === "premium"
                ? (lang === "ko" ? "Premium 시작하기" : "Premium を始める")
                : (lang === "ko" ? "Plus 시작하기" : "Plus を始める")}
            </Text>
          </Pressable>
        )}
        <Text style={[styles.legalNote, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "언제든지 취소할 수 있어요 · 자동 갱신"
            : "いつでもキャンセル可能 · 自動更新"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 0,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginBottom: 4,
    marginTop: 8,
  },
  headerSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  trustText: { fontFamily: "Inter_400Regular", fontSize: 12.5, flex: 1 },

  planCard: {
    borderRadius: 20,
    padding: 18,
    position: "relative",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  planBadge: {
    position: "absolute",
    top: -1,
    right: 18,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  planBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#fff",
    letterSpacing: 0.3,
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    marginTop: 4,
  },
  planName: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 2 },
  planTagline: { fontFamily: "Inter_400Regular", fontSize: 12 },
  planPrice: { fontFamily: "Inter_700Bold", fontSize: 16 },
  planDivider: { height: StyleSheet.hairlineWidth, marginBottom: 12 },
  planFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  planFeatureText: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },
  selectedIndicator: {
    position: "absolute",
    bottom: 18,
    right: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#fff",
    alignItems: "center",
    gap: 8,
  },
  ctaBtn: {
    width: "100%",
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
  },
  successRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 100,
    width: "100%",
    justifyContent: "center",
  },
  successText: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  legalNote: { fontFamily: "Inter_400Regular", fontSize: 11.5, textAlign: "center" },
  consumableNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
  },
});
