import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CompatibilityChip } from "@/components/CompatibilityChip";
import { CountryFlag } from "@/components/CountryFlag";
import { ProfileImage } from "@/components/ProfileImage";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { User } from "@/types";

// ─── Bio translation ─────────────────────────────────────────────────────────

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

interface BioResult { translation: string; pronunciation: string; }
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

function TranslatedBio({ user, viewerLang }: { user: User; viewerLang: "ko" | "ja" }) {
  const colors = useColors();
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
      <Text style={[cardStyles.bio, { color: colors.charcoalLight }]} numberOfLines={2}>
        {originalLine}
      </Text>
    );
  }

  return (
    <View style={{ gap: 3 }}>
      <Text style={[cardStyles.bio, { color: colors.charcoal }]} numberOfLines={2}>
        {result.translation.split("\n")[0]}
      </Text>
      <Text style={[cardStyles.bioOriginal, { color: colors.charcoalLight }]} numberOfLines={1}>
        {originalLine}
      </Text>
    </View>
  );
}

// ─── DiscoverCard ─────────────────────────────────────────────────────────────

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 40;
const CARD_HEIGHT = Math.min(CARD_WIDTH * 1.32, height * 0.62);
const SWIPE_THRESHOLD = 76;
const ROTATION_RANGE = 5; // degrees max tilt

function DiscoverCard({
  user,
  onLike,
  onPass,
  isTop,
  stackIndex,
}: {
  user: User;
  onLike: () => void;
  onPass: () => void;
  isTop: boolean;
  stackIndex: number;
}) {
  const colors = useColors();
  const { profile } = useApp();
  const viewerLang: "ko" | "ja" = profile.country === "KR" ? "ko" : "ja";
  const pan = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const passOpacity = useRef(new Animated.Value(0)).current;

  // ── Spring configs ──────────────────────────────────────────────────────
  // snap-back: tight, crisp, no wobble
  const snapBack = () => {
    Animated.parallel([
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        tension: 200,
        friction: 22,
        useNativeDriver: true,
      }),
      Animated.timing(likeOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(passOpacity, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  // exit: momentum-based timing (no spring bounce at the edge)
  const exitRight = (vy: number) => {
    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: width + 120,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pan.y, {
        toValue: vy * 80,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(onLike);
  };

  const exitLeft = (vy: number) => {
    Animated.parallel([
      Animated.timing(pan.x, {
        toValue: -(width + 120),
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pan.y, {
        toValue: vy * 80,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(onPass);
  };

  const panResponder = isTop
    ? PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy });
          // Fade in like/pass stamp proportionally
          likeOpacity.setValue(Math.min(1, Math.max(0, g.dx / 100)));
          passOpacity.setValue(Math.min(1, Math.max(0, -g.dx / 100)));
        },
        onPanResponderRelease: (_, g) => {
          const fastSwipe = Math.abs(g.vx) > 0.6;
          if (g.dx > SWIPE_THRESHOLD || (g.dx > 40 && fastSwipe && g.vx > 0)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            exitRight(g.vy);
          } else if (g.dx < -SWIPE_THRESHOLD || (g.dx < -40 && fastSwipe && g.vx < 0)) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            exitLeft(g.vy);
          } else {
            snapBack();
          }
        },
        onPanResponderTerminate: () => { snapBack(); },
      })
    : { panHandlers: {} };

  // Rotation: subtle, proportional to drag distance
  const rotate = pan.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: [`-${ROTATION_RANGE}deg`, "0deg", `${ROTATION_RANGE}deg`],
    extrapolate: "clamp",
  });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.surface,
          shadowColor: "#1C1C1E",
          transform: isTop
            ? [{ translateX: pan.x }, { translateY: pan.y }, { rotate }]
            : [],
        },
      ]}
    >
      {/* ── Photo ─────────────────────────────────────────────────────── */}
      <ProfileImage
        photoKey={user.photos[0]}
        size={CARD_WIDTH}
        borderRadius={0}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
      />

      {/* ── Like / Pass stamps ─────────────────────────────────────────── */}
      <Animated.View style={[cardStyles.stamp, cardStyles.stampLeft, { opacity: likeOpacity }]}>
        <View style={[cardStyles.stampInner, { borderColor: "#D85870" }]}>
          <Text style={[cardStyles.stampText, { color: "#D85870" }]}>LIKE</Text>
        </View>
      </Animated.View>
      <Animated.View style={[cardStyles.stamp, cardStyles.stampRight, { opacity: passOpacity }]}>
        <View style={[cardStyles.stampInner, { borderColor: "#8E8E93" }]}>
          <Text style={[cardStyles.stampText, { color: "#8E8E93" }]}>PASS</Text>
        </View>
      </Animated.View>

      {/* ── Card info panel ────────────────────────────────────────────── */}
      <View style={[cardStyles.info, { backgroundColor: colors.surface }]}>
        {/* Name row */}
        <View style={cardStyles.nameRow}>
          <View style={cardStyles.namePart}>
            <Text style={[cardStyles.name, { color: colors.charcoal }]}>{user.nickname}</Text>
            <Text style={[cardStyles.age, { color: colors.charcoalMid }]}>{user.age}</Text>
          </View>
          <View style={cardStyles.nameMeta}>
            <CountryFlag country={user.country} size={16} />
            {user.isVerified && (
              <View style={[cardStyles.verifiedPill, { backgroundColor: colors.roseLight }]}>
                <Feather name="check-circle" size={10} color={colors.rose} />
                <Text style={[cardStyles.verifiedText, { color: colors.rose }]}>Verified</Text>
              </View>
            )}
          </View>
        </View>

        {/* Match score */}
        <View style={cardStyles.scoreRow}>
          <View style={[cardStyles.scorePill, { backgroundColor: colors.roseLight }]}>
            <Feather name="zap" size={11} color={colors.rose} />
            <Text style={[cardStyles.scoreText, { color: colors.rose }]}>{user.compatibilityScore}% match</Text>
          </View>
        </View>

        {/* Interest chips */}
        <View style={cardStyles.chips}>
          {user.compatibilityReasons.slice(0, 3).map((r) => (
            <CompatibilityChip key={r} label={r} />
          ))}
        </View>

        {/* Bio */}
        <TranslatedBio user={user} viewerLang={viewerLang} />
      </View>
    </Animated.View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    overflow: "hidden",
    width: CARD_WIDTH,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 8,
  },
  stamp: {
    position: "absolute",
    top: 40,
  },
  stampLeft: { left: 20, transform: [{ rotate: "-12deg" }] },
  stampRight: { right: 20, transform: [{ rotate: "12deg" }] },
  stampInner: {
    borderWidth: 2.5,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stampText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 2,
  },
  info: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  namePart: { flexDirection: "row", alignItems: "baseline", gap: 6 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22 },
  age: { fontFamily: "Inter_400Regular", fontSize: 18 },
  nameMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    gap: 3,
  },
  verifiedText: { fontFamily: "Inter_500Medium", fontSize: 10 },
  scoreRow: { marginBottom: 10 },
  scorePill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  scoreText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginBottom: 6 },
  bio: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  bioOriginal: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    fontStyle: "italic",
  },
});

// ─── DiscoverScreen ───────────────────────────────────────────────────────────

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { discoverUsers, likeUser, passUser } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLike = (userId: string) => { setTimeout(() => likeUser(userId), 260); };
  const handlePass = (userId: string) => { setTimeout(() => passUser(userId), 260); };

  if (discoverUsers.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: topPad + 20, backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
          <Feather name="heart" size={32} color={colors.rose} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>You're all caught up</Text>
        <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
          모든 프로필을 확인했어요{"\n"}すべてのプロフィールを見ました
        </Text>
      </View>
    );
  }

  const CARD_INFOHEIGHT = CARD_HEIGHT + 160; // approx card total height

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 14 }]}>
        <Text style={[styles.logo, { color: colors.rose }]}>lito</Text>
        <View style={styles.headerRight}>
          <View style={[styles.onlinePill, { backgroundColor: colors.greenLight }]}>
            <View style={[styles.onlineDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.onlineText, { color: colors.green }]}>
              {discoverUsers.length} nearby
            </Text>
          </View>
        </View>
      </View>

      {/* ── Card stack ───────────────────────────────────────────────────── */}
      <View style={[styles.stack, { bottom: bottomPad + 106 }]}>
        {discoverUsers.slice(0, 3).map((user, idx) => {
          const isTop = idx === 0;
          // Background cards: progressively smaller and further back
          const scale = 1 - idx * 0.035;
          const translateY = idx * 12;
          const opacity = 1 - idx * 0.15;
          return (
            <View
              key={user.id}
              style={[
                styles.stackItem,
                {
                  zIndex: 10 - idx,
                  opacity,
                  transform: isTop ? [] : [{ scale }, { translateY }],
                },
              ]}
            >
              <DiscoverCard
                user={user}
                onLike={() => handleLike(user.id)}
                onPass={() => handlePass(user.id)}
                isTop={isTop}
                stackIndex={idx}
              />
            </View>
          );
        })}
      </View>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <View style={[styles.actionRow, { bottom: bottomPad + 28 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => discoverUsers[0] && handlePass(discoverUsers[0].id)}
          activeOpacity={0.75}
        >
          <Feather name="x" size={26} color={colors.charcoalLight} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtnMain, { backgroundColor: colors.rose }]}
          onPress={() => discoverUsers[0] && handleLike(discoverUsers[0].id)}
          activeOpacity={0.8}
        >
          <Feather name="heart" size={28} color={colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.goldLight, borderColor: colors.goldLight }]}
          activeOpacity={0.75}
        >
          <Feather name="star" size={22} color={colors.gold} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 10,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -0.8,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlinePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  onlineText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  stack: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    alignItems: "center",
  },
  stackItem: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  actionRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
  },
  actionBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnMain: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 8,
  },
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
