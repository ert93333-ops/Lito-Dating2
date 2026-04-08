import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { TrustBadge } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { User } from "@/types";

// ─── Bio translation ─────────────────────────────────────────────────────────
// CRITICAL: Do NOT modify this section. Translation logic must stay intact.

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

interface BioResult { translation: string; }
const bioCache = new Map<string, BioResult>();

async function fetchBioTranslation(
  userId: string, text: string,
  sourceLang: "ko" | "ja", viewerLang: "ko" | "ja"
): Promise<BioResult> {
  const key = `bio_${userId}:${viewerLang}`;
  const cached = bioCache.get(key);
  if (cached) return cached;
  const res = await fetch(`${API_BASE}/api/ai/translate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, sourceLang, viewerLang }),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as BioResult;
  bioCache.set(key, data);
  return data;
}

// TranslatedBio renders on dark photo overlay — text is always white
function TranslatedBio({ user, viewerLang }: { user: User; viewerLang: "ko" | "ja" }) {
  const originalLine = user.bio.split("\n")[0];
  const senderLang = user.language as "ko" | "ja";
  const shouldTranslate = senderLang !== viewerLang;

  const [result, setResult] = useState<BioResult | null>(() =>
    shouldTranslate ? (bioCache.get(`bio_${user.id}:${viewerLang}`) ?? null) : null
  );

  useEffect(() => {
    if (!shouldTranslate || result) return;
    let cancelled = false;
    fetchBioTranslation(user.id, originalLine, senderLang, viewerLang)
      .then((d) => { if (!cancelled) setResult(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user.id, originalLine, senderLang, viewerLang, shouldTranslate, result]);

  if (!shouldTranslate || !result) {
    return (
      <Text style={cardStyles.bioText} numberOfLines={2}>
        {originalLine}
      </Text>
    );
  }

  return (
    <View style={{ gap: 3 }}>
      <Text style={cardStyles.bioText} numberOfLines={2}>
        {result.translation.split("\n")[0]}
      </Text>
      <Text style={cardStyles.bioOriginal} numberOfLines={1}>
        {originalLine}
      </Text>
    </View>
  );
}

// ─── Card geometry ────────────────────────────────────────────────────────────
const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 32;
const CARD_HEIGHT = Math.min(CARD_WIDTH * 1.52, height * 0.62);
const SWIPE_THRESHOLD = 72;
const MAX_ROTATION = 4; // degrees — restrained, premium

// ─── DiscoverCard ─────────────────────────────────────────────────────────────

function DiscoverCard({
  user,
  onLike,
  onPass,
  onReport,
  isTop,
}: {
  user: User;
  onLike: () => void;
  onPass: () => void;
  onReport?: () => void;
  isTop: boolean;
  stackIndex: number;
}) {
  const colors = useColors();
  const { profile } = useApp();
  const { lang } = useLocale();
  const viewerLang: "ko" | "ja" = profile.country === "KR" ? "ko" : "ja";

  // ── Reanimated shared values (run on UI thread) ──────────────────────────
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const likeOpacity = useSharedValue(0);
  const passOpacity = useSharedValue(0);

  // Haptics must run on JS thread
  const triggerLikeHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  const triggerPassHaptic = () =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

  // ── Pan gesture — fully native-thread via Reanimated ────────────────────
  const panGesture = Gesture.Pan()
    .enabled(isTop)
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.35; // damp vertical — feels anchored
      likeOpacity.value = Math.min(1, Math.max(0, e.translationX / 88));
      passOpacity.value = Math.min(1, Math.max(0, -e.translationX / 88));
    })
    .onEnd((e) => {
      const fastRight = e.velocityX > 600;
      const fastLeft = e.velocityX < -600;
      const dx = e.translationX;

      if (dx > SWIPE_THRESHOLD || (dx > 40 && fastRight)) {
        runOnJS(triggerLikeHaptic)();
        translateX.value = withTiming(width + 180, { duration: 230 }, () =>
          runOnJS(onLike)()
        );
        translateY.value = withTiming(e.velocityY * 0.06, { duration: 230 });
        likeOpacity.value = withTiming(0, { duration: 160 });
      } else if (dx < -SWIPE_THRESHOLD || (dx < -40 && fastLeft)) {
        runOnJS(triggerPassHaptic)();
        translateX.value = withTiming(-(width + 180), { duration: 230 }, () =>
          runOnJS(onPass)()
        );
        translateY.value = withTiming(e.velocityY * 0.06, { duration: 230 });
        passOpacity.value = withTiming(0, { duration: 160 });
      } else {
        // Premium spring-back — tight, crisp, no wobble
        translateX.value = withSpring(0, { damping: 28, stiffness: 380, mass: 0.7 });
        translateY.value = withSpring(0, { damping: 28, stiffness: 380, mass: 0.7 });
        likeOpacity.value = withTiming(0, { duration: 130 });
        passOpacity.value = withTiming(0, { duration: 130 });
      }
    });

  // ── Animated styles derived on UI thread ────────────────────────────────
  const cardAnimStyle = useAnimatedStyle(() => {
    if (!isTop) return {};
    const rotate = interpolate(
      translateX.value,
      [-width / 2, 0, width / 2],
      [-MAX_ROTATION, 0, MAX_ROTATION],
      Extrapolation.CLAMP
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const likeAnimStyle = useAnimatedStyle(() => ({
    opacity: likeOpacity.value,
  }));

  const passAnimStyle = useAnimatedStyle(() => ({
    opacity: passOpacity.value,
  }));

  // ── Card body ────────────────────────────────────────────────────────────
  const cardBody = (
    <Animated.View
      style={[
        cardStyles.card,
        { shadowColor: "#0C0C0E" },
        cardAnimStyle,
      ]}
    >
      {/* Photo fills entire card */}
      <ProfileImage
        photoKey={user.photos[0]}
        size={CARD_WIDTH}
        borderRadius={0}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      />

      {/* Report button — top-right corner, only on top card */}
      {isTop && onReport && (
        <TouchableOpacity
          style={cardStyles.reportBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReport();
          }}
          activeOpacity={0.7}
          hitSlop={{ top: 14, right: 14, bottom: 14, left: 14 }}
        >
          <Feather name="flag" size={15} color="rgba(255,255,255,0.9)" />
        </TouchableOpacity>
      )}

      {/* LIKE stamp */}
      <Animated.View style={[cardStyles.stamp, cardStyles.stampLike, likeAnimStyle]}>
        <View style={cardStyles.likeInner}>
          <Feather name="heart" size={13} color="#D85870" />
          <Text style={[cardStyles.stampText, { color: "#D85870" }]}>LIKE</Text>
        </View>
      </Animated.View>

      {/* PASS stamp */}
      <Animated.View style={[cardStyles.stamp, cardStyles.stampPass, passAnimStyle]}>
        <View style={cardStyles.passInner}>
          <Feather name="x" size={13} color="#8E8E93" />
          <Text style={[cardStyles.stampText, { color: "#8E8E93" }]}>PASS</Text>
        </View>
      </Animated.View>

      {/* Deep bottom gradient — transparent → photo-warm dark */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(10,8,10,0.18)",
          "rgba(10,8,10,0.68)",
          "rgba(10,8,10,0.88)",
        ]}
        locations={[0.28, 0.52, 0.78, 1]}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* ── Info overlay — floats over gradient ─────────────────────────── */}
      <View style={cardStyles.info}>
        {/* Name / age / flag / verified */}
        <View style={cardStyles.nameRow}>
          <Text style={cardStyles.name}>{user.nickname}</Text>
          <Text style={cardStyles.age}>{user.age}</Text>
          <CountryFlag country={user.country} size={17} />
          <TrustBadge trustProfile={user.trustProfile} size="sm" />
        </View>

        {/* Match score + city + language study badge */}
        <View style={cardStyles.metaRow}>
          <View style={cardStyles.matchPill}>
            <Feather name="zap" size={10} color="#D85870" />
            <Text style={cardStyles.matchText}>{user.compatibilityScore}% {profile.language === "ko" ? "매치" : "マッチ"}</Text>
          </View>
          {user.city ? (
            <View style={cardStyles.cityRow}>
              <Feather name="map-pin" size={10} color="rgba(255,255,255,0.65)" />
              <Text style={cardStyles.cityText}>{user.city}</Text>
            </View>
          ) : null}
          {user.studyingLanguage && (
            <View style={cardStyles.langBadge}>
              <Text style={cardStyles.langBadgeText}>
                {user.language === "ja"
                  ? (profile.language === "ko" ? "📚 한국어 공부 중" : "📚 韓国語勉強中")
                  : (profile.language === "ko" ? "📚 일본어 공부 중" : "📚 日本語勉強中")}
              </Text>
            </View>
          )}
        </View>

        {/* Interest + compatibility chips */}
        {((user.interests && user.interests.length > 0) || user.compatibilityReasons.length > 0) && (
          <View style={cardStyles.chips}>
            {user.interests
              ? user.interests.slice(0, 2).map((interest) => (
                  <View key={interest} style={cardStyles.chip}>
                    <Text style={cardStyles.chipText}>{interest}</Text>
                  </View>
                ))
              : null}
            {user.compatibilityReasons.slice(0, user.interests ? 1 : 3).map((r) => (
              <View key={r} style={[cardStyles.chip, cardStyles.chipMatch]}>
                <Text style={cardStyles.chipText}>{r}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bio — translation logic preserved exactly */}
        <TranslatedBio user={user} viewerLang={viewerLang} />
      </View>
    </Animated.View>
  );

  // Top card gets gesture detector; background cards are static
  if (isTop) {
    return <GestureDetector gesture={panGesture}>{cardBody}</GestureDetector>;
  }
  return cardBody;
}

// ─── Card styles ──────────────────────────────────────────────────────────────

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: "hidden",
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },

  // Stamps — refined pill with icon, white background for legibility
  stamp: { position: "absolute", top: 44, zIndex: 20 },
  stampLike: { left: 20, transform: [{ rotate: "-12deg" }] },
  stampPass: { right: 20, transform: [{ rotate: "12deg" }] },
  likeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderWidth: 2,
    borderColor: "#D85870",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  passInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 2,
    borderColor: "#8E8E93",
    borderRadius: 8,
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  stampText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 1.4,
  },

  // Info panel — absolute, sits above gradient
  info: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 9,
  },

  // Name row
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 7,
  },
  name: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 5,
  },
  age: {
    fontFamily: "Inter_400Regular",
    fontSize: 22,
    color: "rgba(255,255,255,0.82)",
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
  verifiedText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9.5,
    color: "#fff",
    letterSpacing: 0.2,
  },

  // Meta row
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
  },
  matchText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    color: "#D85870",
  },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  cityText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
  },

  // Chips — glass effect on dark bg
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 4,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
  },
  chipMatch: {
    backgroundColor: "rgba(216,88,112,0.22)",
    borderColor: "rgba(216,88,112,0.35)",
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.92)",
  },

  // Language study badge — teal-ish glass pill
  langBadge: {
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
    backgroundColor: "rgba(52,199,140,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(52,199,140,0.42)",
  },
  langBadgeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 10.5,
    color: "rgba(255,255,255,0.92)",
  },

  // Report button — L4 FIX: increased to 38×38 for accessibility
  reportBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 25,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.32)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },

  // Bio text — white on dark, small and quiet
  bioText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
    color: "rgba(255,255,255,0.88)",
  },
  bioOriginal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
    color: "rgba(255,255,255,0.52)",
  },
});

// ─── ActionButton ─────────────────────────────────────────────────────────────
// Reusable action button with spring scale feedback and optional haptic.
// All three action buttons (pass / like / star) use this for consistent feel.

interface ActionBtnProps {
  onPress: () => void;
  hapticStyle?: "light" | "medium";
  style?: object;
  children: React.ReactNode;
}

function ActionButton({ onPress, hapticStyle = "light", style, children }: ActionBtnProps) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.88, { damping: 18, stiffness: 480 });
  };

  const handlePressOut = () => {
    // Spring back with a gentle overshoot — satisfying physical feel
    scale.value = withSpring(1, { damping: 12, stiffness: 280, mass: 0.85 });
  };

  const handlePress = () => {
    if (hapticStyle === "medium") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <Animated.View style={[animStyle, style]}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {children}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── DiscoverScreen ───────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { discoverUsers, likeUser, passUser, profile } = useApp();
  const { chemistryPicks, track } = useGrowth();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const TAB_BAR_H = Platform.OS === "web" ? 84 : 70;

  const handleLike = (userId: string) => { setTimeout(() => likeUser(userId), 240); };
  const handlePass = (userId: string) => { setTimeout(() => passUser(userId), 240); };

  if (discoverUsers.length === 0) {
    return (
      <View
        style={[
          styles.empty,
          { paddingTop: topPad + 20, backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
          <Feather name="heart" size={32} color={colors.rose} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>
          {profile.language === "ko" ? "오늘의 추천을 모두 봤어요" : "今日のおすすめを全部見ました"}
        </Text>
        <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
          {profile.language === "ko"
            ? "새 사람이 주변에 나타나면 알려드릴게요"
            : "新しい人が現れたらお知らせします"}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={[styles.logo, { color: colors.rose }]}>lito</Text>
        <View style={styles.headerRight}>
          {/* Chemistry Picks pill — navigates to profile coach for now */}
          {chemistryPicks.length > 0 && (
            <TouchableOpacity
              style={[styles.picksPill, { backgroundColor: "#FFF0F3", borderColor: "#F2BDCA" }]}
              onPress={() => {
                track("daily_picks_viewed");
                router.push("/profile-coach" as any);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.picksText, { color: colors.rose }]}>
                {chemistryPicks.length} {profile.language === "ko" ? "픽" : "ピック"}
              </Text>
            </TouchableOpacity>
          )}
          <View style={[styles.onlinePill, { backgroundColor: colors.greenLight }]}>
            <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.onlineText, { color: colors.green }]}>
              {discoverUsers.length} {profile.language === "ko" ? "근처" : "近く"}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            activeOpacity={0.7}
          >
            <Feather name="sliders" size={16} color={colors.charcoalMid} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Card stack ─────────────────────────────────────────────────── */}
      <View style={[styles.stack, { bottom: TAB_BAR_H + 106 }]}>
        {discoverUsers.slice(0, 3).map((user, idx) => {
          const isTop = idx === 0;
          // Background cards: scale down, push back
          const scale = 1 - idx * 0.03;
          const translateY = idx * 13;
          const opacity = 1 - idx * 0.16;
          return (
            <View
              key={user.id}
              style={[
                styles.stackItem,
                {
                  zIndex: 10 - idx,
                  opacity: isTop ? 1 : opacity,
                  transform: isTop ? [] : [{ scale }, { translateY }],
                },
              ]}
            >
              <DiscoverCard
                user={user}
                onLike={() => handleLike(user.id)}
                onPass={() => handlePass(user.id)}
                onReport={isTop ? () => router.push({
                  pathname: "/report-user" as any,
                  params: { userId: user.id, nickname: user.nickname },
                }) : undefined}
                isTop={isTop}
                stackIndex={idx}
              />
            </View>
          );
        })}
      </View>

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <View style={[styles.actionRow, { bottom: TAB_BAR_H + 16 }]}>

        {/* Pass — Light haptic, small scale */}
        <ActionButton
          onPress={() => discoverUsers[0] && handlePass(discoverUsers[0].id)}
          hapticStyle="light"
        >
          <View
            style={[
              styles.actionBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Feather name="x" size={24} color={colors.charcoalMid} />
          </View>
        </ActionButton>

        {/* Like — Medium haptic, deeper scale pop */}
        <ActionButton
          onPress={() => discoverUsers[0] && handleLike(discoverUsers[0].id)}
          hapticStyle="medium"
        >
          <View
            style={[styles.actionBtnMain, { backgroundColor: colors.rose, shadowColor: colors.rose }]}
          >
            <Feather name="heart" size={28} color={colors.white} />
          </View>
        </ActionButton>

        {/* Super like — Light haptic */}
        <ActionButton onPress={() => {}} hapticStyle="light">
          <View
            style={[
              styles.actionBtn,
              { backgroundColor: colors.goldLight, borderColor: "transparent" },
            ]}
          >
            <Feather name="star" size={20} color={colors.gold} />
          </View>
        </ActionButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.8,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  picksPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
  },
  picksEmoji: { fontSize: 11 },
  picksText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3 },
  onlineText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },

  // ── Card stack ────────────────────────────────────────────────────────────
  stack: {
    position: "absolute",
    top: 0,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  stackItem: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  actionBtnMain: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    elevation: 12,
  },

  // ── Empty state ───────────────────────────────────────────────────────────
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 22,
  },
});
