import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  ScrollView,
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

const { width, height } = Dimensions.get("window");
const CARD_WIDTH = width - 48;

function DiscoverCard({
  user,
  onLike,
  onPass,
  isTop,
}: {
  user: User;
  onLike: () => void;
  onPass: () => void;
  isTop: boolean;
}) {
  const colors = useColors();
  const pan = useRef(new Animated.ValueXY()).current;
  const [likeOpacity] = useState(new Animated.Value(0));
  const [passOpacity] = useState(new Animated.Value(0));

  const panResponder = isTop
    ? PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onPanResponderMove: (_, g) => {
          pan.setValue({ x: g.dx, y: g.dy });
          likeOpacity.setValue(Math.max(0, g.dx / 80));
          passOpacity.setValue(Math.max(0, -g.dx / 80));
        },
        onPanResponderRelease: (_, g) => {
          if (g.dx > 100) {
            Animated.spring(pan, { toValue: { x: width + 100, y: g.dy }, useNativeDriver: true }).start(onLike);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          } else if (g.dx < -100) {
            Animated.spring(pan, { toValue: { x: -(width + 100), y: g.dy }, useNativeDriver: true }).start(onPass);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          } else {
            Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
            likeOpacity.setValue(0);
            passOpacity.setValue(0);
          }
        },
      })
    : { panHandlers: {} };

  const rotate = pan.x.interpolate({ inputRange: [-width / 2, 0, width / 2], outputRange: ["-8deg", "0deg", "8deg"] });

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          backgroundColor: colors.white,
          shadowColor: colors.rose,
          transform: isTop ? [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] : [],
        },
      ]}
    >
      <ProfileImage photoKey={user.photos[0]} size={CARD_WIDTH} borderRadius={24} style={styles.cardImage} />

      <Animated.View style={[styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.stampText}>LIKE 💕</Text>
      </Animated.View>
      <Animated.View style={[styles.passStamp, { opacity: passOpacity }]}>
        <Text style={styles.stampText}>PASS</Text>
      </Animated.View>

      <View style={[styles.cardInfo, { backgroundColor: colors.white }]}>
        <View style={styles.nameRow}>
          <Text style={[styles.userName, { color: colors.charcoal }]}>{user.nickname}</Text>
          <Text style={[styles.userAge, { color: colors.charcoalLight }]}>, {user.age}</Text>
          <CountryFlag country={user.country} size={18} />
          {user.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: colors.roseLight }]}>
              <Feather name="check-circle" size={12} color={colors.rose} />
            </View>
          )}
        </View>

        <View style={[styles.scoreBadge, { backgroundColor: colors.roseLight }]}>
          <Feather name="cpu" size={12} color={colors.rose} />
          <Text style={[styles.scoreText, { color: colors.rose }]}>{user.compatibilityScore}% match</Text>
        </View>

        <View style={styles.chipsRow}>
          {user.compatibilityReasons.slice(0, 3).map((r) => (
            <CompatibilityChip key={r} label={r} />
          ))}
        </View>

        <Text style={[styles.bioPreview, { color: colors.charcoalLight }]} numberOfLines={2}>
          {user.bio.split("\n")[0]}
        </Text>
      </View>
    </Animated.View>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { discoverUsers, likeUser, passUser } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleLike = (userId: string) => {
    setTimeout(() => likeUser(userId), 300);
  };

  const handlePass = (userId: string) => {
    setTimeout(() => passUser(userId), 300);
  };

  if (discoverUsers.length === 0) {
    return (
      <View style={[styles.empty, { paddingTop: topPad + 20 }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.roseLight }]}>
          <Feather name="heart" size={36} color={colors.rose} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.charcoal }]}>You're all caught up!</Text>
        <Text style={[styles.emptySub, { color: colors.charcoalLight }]}>
          모든 프로필을 확인했어요 · すべてのプロフィールを見ました
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Text style={[styles.logo, { color: colors.rose }]}>lito</Text>
        <View style={styles.headerRight}>
          <Text style={[styles.onlineCount, { color: colors.charcoalLight }]}>
            <Text style={{ color: colors.green }}>● </Text>
            {discoverUsers.length} nearby
          </Text>
        </View>
      </View>

      <View style={[styles.stack, { bottom: bottomPad + 110 }]}>
        {discoverUsers.slice(0, 3).map((user, idx) => {
          const isTop = idx === 0;
          return (
            <View
              key={user.id}
              style={[
                styles.stackItem,
                {
                  zIndex: 3 - idx,
                  transform: [{ scale: 1 - idx * 0.04 }, { translateY: idx * 10 }],
                  opacity: 1 - idx * 0.2,
                },
              ]}
            >
              <DiscoverCard
                user={user}
                onLike={() => handleLike(user.id)}
                onPass={() => handlePass(user.id)}
                isTop={isTop}
              />
            </View>
          );
        })}
      </View>

      <View style={[styles.actionRow, { bottom: bottomPad + 30 }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => discoverUsers[0] && handlePass(discoverUsers[0].id)}
        >
          <Feather name="x" size={28} color={colors.charcoalLight} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtnMain, { backgroundColor: colors.rose }]}
          onPress={() => discoverUsers[0] && handleLike(discoverUsers[0].id)}
        >
          <Feather name="heart" size={30} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
        >
          <Feather name="star" size={24} color={colors.gold} />
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
    paddingBottom: 8,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    letterSpacing: -1,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  onlineCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  stack: {
    position: "absolute",
    top: 0,
    left: 24,
    right: 24,
    alignItems: "center",
  },
  stackItem: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH * 1.1,
  },
  cardInfo: {
    padding: 20,
    paddingBottom: 16,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 4,
  },
  userName: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  userAge: {
    fontFamily: "Inter_400Regular",
    fontSize: 20,
  },
  verifiedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },
  scoreBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
    gap: 5,
  },
  scoreText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  bioPreview: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  likeStamp: {
    position: "absolute",
    top: 40,
    left: 24,
    backgroundColor: "#E8607A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    transform: [{ rotate: "-15deg" }],
  },
  passStamp: {
    position: "absolute",
    top: 40,
    right: 24,
    backgroundColor: "#8E8E93",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    transform: [{ rotate: "15deg" }],
  },
  stampText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    color: "#FFFFFF",
  },
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
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  actionBtnMain: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    lineHeight: 22,
  },
});
