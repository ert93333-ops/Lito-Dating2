import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect } from "react";
import {
  Platform,
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
import { ProfileSuggestion } from "@/types/growth";

// ── Suggestion card ───────────────────────────────────────────────────────────

function SuggestionCard({ suggestion }: { suggestion: ProfileSuggestion }) {
  const colors = useColors();
  const { acceptSuggestion, rejectSuggestion } = useGrowth();
  const { lang } = useLocale();
  const isPending = suggestion.accepted === null;
  const isAccepted = suggestion.accepted === true;
  const isRejected = suggestion.accepted === false;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          borderColor: isAccepted
            ? "#1A7A4A"
            : isRejected
            ? colors.border
            : colors.rose,
          opacity: isRejected ? 0.5 : 1,
        },
      ]}
    >
      {/* Field label */}
      <View style={styles.cardHeader}>
        <View style={[styles.fieldBadge, { backgroundColor: colors.roseLight }]}>
          <Text style={[styles.fieldBadgeText, { color: colors.rose }]}>
            {suggestion.label}
          </Text>
        </View>
        {isAccepted && (
          <View style={[styles.statusBadge, { backgroundColor: "#EFFAF4" }]}>
            <Feather name="check" size={11} color="#1A7A4A" />
            <Text style={[styles.statusText, { color: "#1A7A4A" }]}>
              {lang === "ko" ? "적용됨" : "適用済み"}
            </Text>
          </View>
        )}
      </View>

      {/* Original */}
      {suggestion.original ? (
        <View style={styles.originalBlock}>
          <Text style={[styles.blockLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "현재" : "現在"}
          </Text>
          <Text style={[styles.originalText, { color: colors.charcoalMid }]}>
            {suggestion.original}
          </Text>
        </View>
      ) : null}

      {/* Arrow */}
      <View style={styles.arrowRow}>
        <View style={[styles.arrowLine, { backgroundColor: colors.roseSoft }]} />
        <Feather name="arrow-down" size={14} color={colors.rose} />
        <View style={[styles.arrowLine, { backgroundColor: colors.roseSoft }]} />
      </View>

      {/* Suggestion */}
      <View style={[styles.suggestionBlock, { backgroundColor: colors.roseLight }]}>
        <Text style={[styles.blockLabel, { color: colors.rose }]}>
          {lang === "ko" ? "AI 제안" : "AI提案"}
        </Text>
        <Text style={[styles.suggestionText, { color: colors.charcoal }]}>
          {suggestion.suggestion}
        </Text>
      </View>

      {/* Reason */}
      <Text style={[styles.reason, { color: colors.charcoalLight }]}>
        {suggestion.reason}
      </Text>

      {/* CTA buttons */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.rejectBtn, { borderColor: colors.border }]}
            onPress={() => rejectSuggestion(suggestion.id)}
          >
            <Text style={[styles.rejectBtnText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "유지하기" : "このままにする"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.acceptBtn, { backgroundColor: colors.rose }]}
            onPress={() => acceptSuggestion(suggestion.id)}
          >
            <Text style={styles.acceptBtnText}>
              {lang === "ko" ? "적용하기 ✓" : "適用する ✓"}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── ProfileCoachScreen ────────────────────────────────────────────────────────

export default function ProfileCoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profileSuggestions, refreshProfileSuggestions } = useGrowth();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useEffect(() => {
    if (profileSuggestions.length === 0) {
      refreshProfileSuggestions();
    }
  }, []);

  const pendingCount = profileSuggestions.filter((s) => s.accepted === null).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#FFF0F3", colors.background]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.charcoal} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "AI 프로필 코치" : "AI プロフィールコーチ"}
          </Text>
          <Text style={[styles.headerSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "AI 카운터파트 · AIコーチ"
              : "AIコーチ · AI 코치"}
          </Text>
        </View>
        {pendingCount > 0 && (
          <View style={[styles.pendingBadge, { backgroundColor: colors.rose }]}>
            <Text style={styles.pendingBadgeText}>{pendingCount}</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro copy */}
        <View style={[styles.introCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[styles.introEmoji]}>🤖</Text>
          <Text style={[styles.introText, { color: colors.charcoalMid }]}>
            {lang === "ko"
              ? "프로필을 검토하고 한국-일본 매칭에 더 잘 맞게 개선하는 방법을 제안해드려요. 직접 확인하고 원하는 것만 적용할 수 있어요."
              : "プロフィールをチェックし、韓日マッチングに適した改善案を提案します。内容を確認して、気に入ったものだけ適用できます。"}
          </Text>
        </View>

        {/* Suggestions */}
        {profileSuggestions.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
              {lang === "ko" ? "프로필이 잘 되어 있어요!" : "プロフィールはしっかりできています！"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? "현재 제안할 내용이 없어요. 나중에 다시 확인해보세요."
                : "現在提案することはありません。後でまた確認してみてください。"}
            </Text>
          </View>
        ) : (
          profileSuggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))
        )}

        {/* Refresh */}
        <TouchableOpacity
          style={[styles.refreshBtn, { borderColor: colors.border }]}
          onPress={refreshProfileSuggestions}
        >
          <Feather name="refresh-cw" size={14} color={colors.charcoalMid} />
          <Text style={[styles.refreshBtnText, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "다시 분석하기" : "再分析する"}
          </Text>
        </TouchableOpacity>

        {/* Privacy note */}
        <View style={[styles.privacyNote, { borderColor: colors.border }]}>
          <Feather name="lock" size={12} color={colors.charcoalLight} />
          <Text style={[styles.privacyText, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "채팅 내용은 분석에 사용되지 않아요. 프로필 정보만 참고해요."
              : "チャット内容は分析に使用されません。プロフィール情報のみ参照します。"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  headerSub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  pendingBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingBadgeText: { fontFamily: "Inter_700Bold", fontSize: 11, color: "#fff" },

  scroll: { paddingHorizontal: 20, paddingTop: 16, gap: 14 },

  introCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  introEmoji: { fontSize: 28, marginTop: 2 },
  introText: { fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 21, flex: 1 },

  card: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  fieldBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: { fontFamily: "Inter_500Medium", fontSize: 11 },

  blockLabel: { fontFamily: "Inter_500Medium", fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  originalBlock: { gap: 2 },
  originalText: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, fontStyle: "italic" },
  arrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  arrowLine: { flex: 1, height: 1 },
  suggestionBlock: { borderRadius: 12, padding: 12 },
  suggestionText: { fontFamily: "Inter_400Regular", fontSize: 14.5, lineHeight: 22 },
  reason: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 18 },

  actionRow: { flexDirection: "row", gap: 10 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
  },
  rejectBtnText: { fontFamily: "Inter_500Medium", fontSize: 14 },
  acceptBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  acceptBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" },

  emptyState: { alignItems: "center", paddingTop: 40, gap: 10 },
  emptyEmoji: { fontSize: 48 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center" },
  emptySub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 21 },

  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 4,
  },
  refreshBtnText: { fontFamily: "Inter_500Medium", fontSize: 14 },

  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  privacyText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },
});
