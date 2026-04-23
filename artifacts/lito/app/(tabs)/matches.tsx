import FIcon from "@/components/FIcon";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { FadeScreen } from "@/components/FadeScreen";
import { ProfileImage } from "@/components/ProfileImage";
import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { computeTrustScore } from "@/types";
import { Match } from "@/types";

function MatchCard({ match, index = 0 }: { match: Match; index?: number }) {
  const colors = useColors();
  const { lang } = useLocale();
  const { profile } = useApp();
  const trustScore = computeTrustScore(match.user.trustProfile);

  // Staggered entry: fade + 14px slide-up
  const entryOpacity   = useRef(new Animated.Value(0)).current;
  const entryTranslate = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const delay = 60 + index * 70;
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 280,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(entryTranslate, {
        toValue: 0,
        delay,
        useNativeDriver: true,
        damping: 22,
        stiffness: 240,
        mass: 0.85,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToChat = (draft?: string) => {
    const convId = match.id.replace("match", "conv");
    const path = draft
      ? `/chat/${convId}?draft=${encodeURIComponent(draft)}`
      : `/chat/${convId}`;
    router.push(path as any);
  };

  const goToProfile = () => {
    router.push(`/user-profile/${match.user.id}` as any);
  };

  return (
    <Animated.View
      style={[
        styles.matchCard,
        { backgroundColor: colors.white, borderColor: colors.border },
        { opacity: entryOpacity, transform: [{ translateY: entryTranslate }] },
      ]}
    >
      {/* Tap photo → profile */}
      <TouchableOpacity
        onPress={goToProfile}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={lang === "ko" ? `${match.user.nickname} 프로필 보기` : `${match.user.nickname}のプロフィールを見る`}
      >
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
          {match.isNew && (
            <View style={[styles.newPill, { backgroundColor: colors.rose }]}>
              <Text style={styles.newPillText}>{lang === "ko" ? "새 매칭" : "新しいマッチ"}</Text>
            </View>
          )}
        </View>

        {/* One-line bio */}
        <Text style={[styles.matchBio, { color: colors.charcoalLight }]} numberOfLines={1}>
          {(lang === "ja" ? (match.iceBreakerJa ?? match.iceBreaker) : (match.iceBreaker ?? match.iceBreakerJa))
            ?? match.user.bio.split("\n")[0]}
        </Text>

        {/* Single chat button */}
        <TouchableOpacity
          style={[styles.matchChatBtn, { backgroundColor: colors.rose }]}
          onPress={() => goToChat()}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={lang === "ko" ? "채팅 시작" : "チャットを始める"}
        >
          <FIcon name="message-circle" size={13} color="#fff" />
          <Text style={[styles.matchActionBtnText, { color: "#fff" }]}>
            {lang === "ko" ? "채팅하기" : "チャット"}
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function NewMatchBubble({ match, index }: { match: Match; index: number }) {
  const colors = useColors();

  const scaleAnim   = useRef(new Animated.Value(0.6)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const delay = index * 55;
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay,
        useNativeDriver: true,
        damping: 16,
        stiffness: 320,
        mass: 0.75,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View style={[styles.newMatchBubble, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        onPress={() => router.push(`/user-profile/${match.user.id}` as any)}
        activeOpacity={0.82}
      >
        <View style={[styles.newMatchRing, { borderColor: colors.rose }]}>
          <ProfileImage photoKey={match.user.photos[0]} size={64} />
        </View>
        <Text style={[styles.newMatchName, { color: colors.charcoal }]} numberOfLines={1}>
          {match.user.nickname.split(" ")[0]}
        </Text>
      </TouchableOpacity>
    </Animated.View>
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
    <FadeScreen style={{ backgroundColor: colors.background }}>
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPad + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <Text style={[styles.title, { color: colors.charcoal }]}>
          {lang === "ko" ? "매칭" : "マッチング"}
        </Text>
      </View>

      {newMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.rose }]}>
            {lang === "ko" ? "새 매칭" : "新しいマッチ"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.newMatchRow}>
            {newMatches.map((m, i) => (
              <NewMatchBubble key={m.id} match={m} index={i} />
            ))}
          </ScrollView>
        </View>
      )}

      {pastMatches.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "이전 매칭" : "過去のマッチ"}
          </Text>
          {pastMatches.map((m, i) => (
            <MatchCard key={m.id} match={m} index={i} />
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
            {lang === "ko" ? "친구에게 Lito를 소개해요" : "友達にLitoを紹介しよう"}
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
    </FadeScreen>
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
  matchChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  matchActionBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  newPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newPillText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    color: "#fff",
  },
  starterTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  starterTriggerText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  starterList: { marginTop: 10, gap: 7 },
  starterPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
    gap: 8,
  },
  starterPillText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
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
