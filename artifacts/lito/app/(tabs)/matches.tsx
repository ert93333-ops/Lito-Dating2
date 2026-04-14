import FIcon from "@/components/FIcon";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { computeTrustScore } from "@/types";
import { Match } from "@/types";

function MatchCard({ match }: { match: Match }) {
  const colors = useColors();
  const { lang } = useLocale();
  const trustScore = computeTrustScore(match.user.trustProfile);

  const goToChat = () => {
    router.push(`/chat/${match.id.replace("match", "conv")}` as any);
  };

  const goToProfile = () => {
    router.push(`/user-profile/${match.user.id}` as any);
  };

  return (
    <View style={[styles.matchCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
      {/* Tap photo → profile */}
      <TouchableOpacity onPress={goToProfile} activeOpacity={0.85}>
        <View style={styles.photoWrap}>
          <ProfileImage photoKey={match.user.photos[0]} size={70} borderRadius={16} />
          {match.isNew && (
            <View style={[styles.newBadge, { backgroundColor: colors.rose }]}>
              <Text style={styles.newBadgeText}>NEW</Text>
            </View>
          )}
          {trustScore >= 55 && (
            <View style={[styles.trustDot, { backgroundColor: "#1A7A4A" }]} />
          )}
        </View>
      </TouchableOpacity>

      {/* Info */}
      <View style={styles.matchInfo}>
        {/* Name row */}
        <View style={styles.matchNameRow}>
          <Text style={[styles.matchName, { color: colors.charcoal }]}>{match.user.nickname.split(" ")[0]}</Text>
          <CountryFlag country={match.user.country} size={14} />
          {match.user.studyingLanguage && (
            <View style={[styles.studyBadge, { backgroundColor: "#E8FAF4", borderColor: "#B8EDD8" }]}>
              <Text style={[styles.studyBadgeText, { color: "#1A7A4A" }]}>
                {match.user.language === "ja" ? "KR 공부중" : "JP 공부중"}
              </Text>
            </View>
          )}
        </View>

        {/* Trust badges */}
        <View style={styles.trustRow}>
          <TrustBadge trustProfile={match.user.trustProfile} size="sm" lang={lang} />
          {trustScore === 0 && (
            <Text style={[styles.noTrustText, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "미인증" : "未認証"}
            </Text>
          )}
        </View>

        {/* Ice breaker or bio */}
        {(match.iceBreaker || match.iceBreakerJa) ? (
          <View style={[styles.iceBreakerRow, { backgroundColor: colors.roseLight, borderColor: "#F2BDCA" }]}>
            <FIcon name="cpu" size={9} color={colors.rose} />
            <Text style={[styles.iceBreakerText, { color: colors.rose }]} numberOfLines={2}>
              {lang === "ja"
                ? (match.iceBreakerJa ?? match.iceBreaker)
                : (match.iceBreaker ?? match.iceBreakerJa)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.matchBio, { color: colors.charcoalLight }]} numberOfLines={1}>
            {match.user.bio.split("\n")[0]}
          </Text>
        )}

        {/* Action buttons */}
        <View style={styles.matchActions}>
          <TouchableOpacity
            style={[styles.matchActionBtn, styles.matchActionBtnOutline, { borderColor: colors.border }]}
            onPress={goToProfile}
            activeOpacity={0.8}
          >
            <FIcon name="user" size={13} color={colors.charcoalMid} />
            <Text style={[styles.matchActionBtnText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "프로필" : "プロフィール"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.matchActionBtn, styles.matchActionBtnFill, { backgroundColor: colors.rose }]}
            onPress={goToChat}
            activeOpacity={0.8}
          >
            <FIcon name="message-circle" size={13} color="#fff" />
            <Text style={[styles.matchActionBtnText, { color: "#fff" }]}>
              {lang === "ko" ? "채팅" : "チャット"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function MatchesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { matches, clearNewMatches } = useApp();
  const { referral, track } = useGrowth();
  const { lang } = useLocale();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  useFocusEffect(useCallback(() => {
    clearNewMatches();
  }, [clearNewMatches]));

  const newMatches = matches.filter((m) => m.isNew);
  const pastMatches = matches.filter((m) => !m.isNew);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>
          {lang === "ko" ? "매칭" : "マッチング"}
        </Text>
        <Text style={[styles.subtitle, { color: colors.charcoalLight }]}>
          {lang === "ko" ? "매칭 · マッチング" : "マッチング · 매칭"}
        </Text>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.rose }]}>
            {lang === "ko" ? "새 매칭" : "新しいマッチ"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchRow}>
            {newMatches.map((m) => (
              <TouchableOpacity
                key={m.id}
                style={styles.newMatchBubble}
                onPress={() => router.push(`/user-profile/${m.user.id}` as any)}
              >
                <View style={[styles.newMatchRing, { borderColor: colors.rose }]}>
                  <ProfileImage photoKey={m.user.photos[0]} size={64} />
                </View>
                <Text style={[styles.newMatchName, { color: colors.charcoal }]} numberOfLines={1}>
                  {m.user.nickname.split(" ")[0]}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {pastMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "이전 매칭" : "過去のマッチ"}
          </Text>
          {pastMatches.map((m) => (
            <MatchCard key={m.id} match={m} />
          ))}
        </View>
      )}

      {matches.length === 0 && (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
            <FIcon name="heart" size={36} color={colors.rose} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "아직 매칭이 없어요" : "まだマッチがいません"}
          </Text>
          <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "스와이프해서 인연을 찾아보세요!" : "スワイプして出会いを見つけましょう！"}
          </Text>
        </View>
      )}

      {/* ── Referral nudge ──────────────────────────────────────────────── */}
      <View style={[styles.referralNudge, { backgroundColor: "#FFF0F3", borderColor: "#F2BDCA" }]}>
        <View style={styles.referralNudgeLeft}>
          <Text style={[styles.referralNudgeTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "친구에게 Lito를 소개해요 🎁" : "友達にLitoを紹介しよう 🎁"}
          </Text>
          <Text style={[styles.referralNudgeSub, { color: colors.charcoalLight }]}>
            {referral.successfulReferrals > 0
              ? lang === "ko"
                ? `${referral.successfulReferrals}명 초대 완료 · 보상 확인하기`
                : `${referral.successfulReferrals}人を招待済み · 報酬を確認する`
              : lang === "ko"
                ? "초대하면 부스트 크레딧을 받아요"
                : "紹介するとブーストクレジットがもらえます"}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.referralNudgeBtn, { backgroundColor: colors.rose }]}
          onPress={() => {
            track("invite_link_created");
            router.push("/referral" as any);
          }}
        >
          <FIcon name="gift" size={14} color="#fff" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 8 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginBottom: 2,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  section: { marginTop: 24, paddingHorizontal: 24 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  newMatchRow: { marginHorizontal: -24, paddingHorizontal: 24 },
  newMatchBubble: {
    alignItems: "center",
    marginRight: 16,
    width: 80,
  },
  newMatchRing: {
    borderWidth: 2.5,
    borderRadius: 40,
    padding: 2,
    marginBottom: 6,
  },
  newMatchName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  matchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  photoWrap: { position: "relative", marginRight: 14 },
  newBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 8,
    color: "#FFF",
  },
  matchInfo: { flex: 1 },
  matchNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  matchName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 6,
    gap: 4,
  },
  scoreLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  matchBio: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  matchActions: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
  },
  matchActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  matchActionBtnOutline: {
    borderWidth: 1,
  },
  matchActionBtnFill: {},
  matchActionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  trustDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 5,
    minHeight: 20,
  },
  noTrustText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  studyBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  studyBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  iceBreakerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginTop: 4,
  },
  iceBreakerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  lastActiveText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 5,
  },
  referralNudge: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 24,
    marginTop: 20,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    gap: 12,
  },
  referralNudgeLeft: { flex: 1 },
  referralNudgeTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 3 },
  referralNudgeSub: { fontFamily: "Inter_400Regular", fontSize: 12 },
  referralNudgeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
});
