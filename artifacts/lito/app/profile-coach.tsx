import FIcon from "@/components/FIcon";
import { NoConsentSheet } from "@/components/chat/NoConsentSheet";
import { ZeroCreditSheet } from "@/components/chat/ZeroCreditSheet";
import { UnsafeNotice } from "@/components/chat/UnsafeNotice";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
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
            <FIcon name="check" size={11} color="#1A7A4A" />
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
        <FIcon name="arrow-down" size={14} color={colors.rose} />
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
  const {
    profileSuggestions,
    profileCoachLoading,
    profileCoachBlockedState,
    clearProfileCoachBlock,
    refreshProfileSuggestions,
    consentStatus,
    grantConsent,
    walletState,
    track,
  } = useGrowth();
  const { lang } = useLocale();

  // 로컬 no_consent 시트 표시 상태 (서버 호출 전 pre-check)
  const [showNoConsentSheet, setShowNoConsentSheet] = useState(false);
  const [isGranting, setIsGranting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // 화면 열릴 때 analytics만 — 자동 coach 실행 금지
  useEffect(() => {
    track("profile_coach_opened");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 서버 blocked 상태를 우선순위에 따라 시트 표시
  // unsafe > no_consent > zero_credit
  const serverBlockedAs = profileCoachBlockedState;

  // 명시적 탭 → consent 게이트 → 서버 요청
  const handleStartCoach = async () => {
    if (profileCoachLoading) return;
    // 로컬 consent pre-check — 서버 호출 전 빠른 분기
    if (consentStatus !== null && !consentStatus.profile_coach) {
      setShowNoConsentSheet(true);
      return;
    }
    await refreshProfileSuggestions();
  };

  // 동의 완료 후 자동 실행 금지 — 사용자가 다시 버튼을 눌러야 함
  const handleConsentGranted = async () => {
    setIsGranting(true);
    try {
      await grantConsent("profile_coach");
    } finally {
      setIsGranting(false);
      setShowNoConsentSheet(false);
      // 동의 후 자동 코치 실행 금지 — UX 원칙
    }
  };

  const pendingCount = profileSuggestions.filter((s) => s.accepted === null || s.accepted === undefined).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── NoConsent Sheet (로컬 pre-check) ─────────────────────────── */}
      <NoConsentSheet
        visible={showNoConsentSheet && serverBlockedAs !== "unsafe"}
        onDismiss={() => setShowNoConsentSheet(false)}
        onConsentGranted={handleConsentGranted}
        isGranting={isGranting}
        bodyOverride={lang === "ko"
          ? "AI 프로필 코치를 사용하려면 AI 데이터 처리에 동의해야 합니다.\n채팅 내용은 사용되지 않으며, 프로필 정보만 참고합니다."
          : "AIプロフィールコーチを使用するには、AIデータ処理に同意が必要です。\nチャット内容は使用されず、プロフィール情報のみ参照します。"}
      />

      {/* ── NoConsent Sheet (서버 응답) ────────────────────────────────── */}
      <NoConsentSheet
        visible={serverBlockedAs === "no_consent" && !showNoConsentSheet}
        onDismiss={clearProfileCoachBlock}
        onConsentGranted={handleConsentGranted}
        isGranting={isGranting}
        bodyOverride={lang === "ko"
          ? "AI 프로필 코치를 사용하려면 AI 데이터 처리에 동의해야 합니다.\n채팅 내용은 사용되지 않으며, 프로필 정보만 참고합니다."
          : "AIプロフィールコーチを使用するには、AIデータ処理に同意が必要です。\nチャット内容は使用されず、プロフィール情報のみ参照します。"}
      />

      {/* ── ZeroCredit Sheet ──────────────────────────────────────────── */}
      <ZeroCreditSheet
        visible={serverBlockedAs === "zero_credit"}
        onDismiss={() => {
          clearProfileCoachBlock();
          track("continue_basic_chat_after_paywall");
        }}
        onBuyCredits={() => {
          clearProfileCoachBlock();
          router.push("/paywall");
        }}
        trialRemaining={walletState?.trial_remaining}
        paidRemaining={walletState?.paid_remaining}
        secondaryCta={lang === "ko" ? "그냥 직접 수정하기" : "そのまま自分で編集する"}
      />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#FFF0F3", colors.background]}
        style={[styles.header, { paddingTop: topPad + 14 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <FIcon name="arrow-left" size={20} color={colors.charcoal} />
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

        {/* Wallet balance indicator (trial + paid, 서버 authoritative) */}
        {walletState !== null && (
          <View style={[styles.walletRow, { borderColor: colors.border }]}>
            <FIcon name="credit-card" size={12} color={colors.charcoalMid} />
            <Text style={[styles.walletText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? `체험 ${walletState.trial_remaining} · 유료 ${walletState.paid_remaining}`
                : `トライアル ${walletState.trial_remaining} · 有料 ${walletState.paid_remaining}`}
            </Text>
          </View>
        )}

        {/* Unsafe Notice (profile context) — coach CTA 숨김, paywall 금지 */}
        {serverBlockedAs === "unsafe" && (
          <UnsafeNotice
            onReport={() => { /* 프로필 안전 신고: 지원팀 연결 */ }}
            onBlock={() => { clearProfileCoachBlock(); router.back(); }}
            onHelp={() => { /* 도움말 링크 */ }}
          />
        )}

        {/* Suggestions / Loading / CTA */}
        {profileCoachLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={colors.rose} />
            <Text style={[styles.emptySub, { color: colors.charcoalLight, marginTop: 12 }]}>
              {lang === "ko" ? "AI가 프로필을 분석하고 있어요..." : "AIがプロフィールを分析中..."}
            </Text>
          </View>
        ) : profileSuggestions.length === 0 && serverBlockedAs !== "unsafe" ? (
          /* 미분석 상태 — 명시적 CTA만 제공, 자동 실행 없음 */
          <View style={styles.emptyState}>
            <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
              {lang === "ko" ? "아직 분석을 시작하지 않았어요" : "まだ分析を開始していません"}
            </Text>
            <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
              {lang === "ko"
                ? "아래 버튼을 눌러 AI 프로필 분석을 시작하세요."
                : "下のボタンを押してAIプロフィール分析を開始してください。"}
            </Text>
            <TouchableOpacity
              style={[styles.startBtn, { backgroundColor: colors.rose }]}
              onPress={handleStartCoach}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>
                {lang === "ko" ? "분석 시작하기" : "分析を始める"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          profileSuggestions.map((s) => (
            <SuggestionCard key={s.id} suggestion={s} />
          ))
        )}

        {/* Re-analyse (표시 조건: 결과가 있을 때만) */}
        {profileSuggestions.length > 0 && (
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: colors.border }]}
            onPress={handleStartCoach}
            disabled={profileCoachLoading}
          >
            <FIcon name="refresh-cw" size={14} color={colors.charcoalMid} />
            <Text style={[styles.refreshBtnText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "다시 분석하기" : "再分析する"}
            </Text>
          </TouchableOpacity>
        )}

        {/* Privacy note */}
        <View style={[styles.privacyNote, { borderColor: colors.border }]}>
          <FIcon name="lock" size={12} color={colors.charcoalLight} />
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

  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  walletText: { fontFamily: "Inter_400Regular", fontSize: 11 },

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
  startBtn: {
    marginTop: 10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 24,
    alignItems: "center",
  },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },

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
