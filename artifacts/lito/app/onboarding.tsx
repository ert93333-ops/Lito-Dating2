import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import FIcon from "@/components/FIcon";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

// ── Value card data ────────────────────────────────────────────────────────────

const VALUE_CARDS = [
  {
    icon: "heart" as const,
    gradientColors: ["#FFF0F3", "#FBDDE3"] as const,
    accentColor: "#D85870",
    iconBg: "#F7C5D0",
    titleKo: "AI 문화 매칭",
    titleJa: "AIカルチャーマッチング",
    bodyKo: "AI가 한·일 문화를 깊이 이해해\n가치관이 맞는 상대를 찾아드려요.",
    bodyJa: "AIが韓日文化を深く理解し\n価値観が合う相手を見つけます。",
  },
  {
    icon: "message-circle" as const,
    gradientColors: ["#EEF4FF", "#DAEAFF"] as const,
    accentColor: "#3B6FD4",
    iconBg: "#BCCFF5",
    titleKo: "실시간 번역",
    titleJa: "リアルタイム翻訳",
    bodyKo: "언어 장벽 없이 자연스럽게 대화해요.\n한일 번역으로 진정한 연결이 가능해요.",
    bodyJa: "言葉の壁なく自然に会話できます。\n韓日翻訳で本当の繋がりが生まれます。",
  },
  {
    icon: "shield" as const,
    gradientColors: ["#EFFAF4", "#D4F2E3"] as const,
    accentColor: "#1A7A4A",
    iconBg: "#A9DFC2",
    titleKo: "안전한 신뢰 쌓기",
    titleJa: "安全な信頼の構築",
    bodyKo: "준비됐을 때만 연락처를 공유해요.\n신뢰가 쌓인 후에 앱 밖으로 나갈 수 있어요.",
    bodyJa: "準備ができたときだけ連絡先を共有。\n信頼が深まってからアプリの外へ。",
  },
] as const;

// ── FlagBadge ──────────────────────────────────────────────────────────────────

function FlagBadge({ country, size = 80 }: { country: "KR" | "JP"; size?: number }) {
  const radius = size * 0.28;
  if (country === "JP") {
    return (
      <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}>
        <LinearGradient
          colors={["#3B6FD4", "#6A4FC8", "#C04472"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: "rgba(255,255,255,0.95)", letterSpacing: -1, lineHeight: size * 0.46 }}>
            日
          </Text>
        </LinearGradient>
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius, overflow: "hidden" }}>
      <LinearGradient
        colors={["#D8324A", "#8B2FC9", "#1C4F9C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{ fontFamily: "Inter_700Bold", fontSize: size * 0.38, color: "rgba(255,255,255,0.95)", letterSpacing: -1, lineHeight: size * 0.46 }}>
          한
        </Text>
      </LinearGradient>
    </View>
  );
}

// ── LanguageCard ───────────────────────────────────────────────────────────────

function LanguageCard({
  lang,
  isSelected,
  onPress,
}: {
  lang: "ko" | "ja";
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  };

  const isKo = lang === "ko";
  const accentColor = isKo ? "#D85870" : "#3B6FD4";
  const bgColor = isKo ? "#FFF0F3" : "#EEF4FF";

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ scale }] }]}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          lc.card,
          {
            borderColor: isSelected ? accentColor : colors.border,
            backgroundColor: isSelected ? bgColor : colors.white,
            shadowColor: isSelected ? accentColor : "#000",
            shadowOpacity: isSelected ? 0.18 : 0.04,
          },
        ]}
      >
        {isSelected && (
          <View style={[lc.checkBadge, { backgroundColor: accentColor }]}>
            <FIcon name="check" size={13} color="#fff" />
          </View>
        )}
        <FlagBadge country={isKo ? "KR" : "JP"} size={76} />
        <Text style={[lc.langMain, { color: isSelected ? accentColor : colors.charcoal }]}>
          {isKo ? "한국어" : "日本語"}
        </Text>
        <Text style={[lc.langSub, { color: colors.charcoalLight }]}>
          {isKo ? "Korean" : "Japanese"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── OnboardingScreen ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();

  const [phase, setPhase] = useState<"welcome" | "language">("welcome");
  const [selectedLang, setSelectedLang] = useState<"ko" | "ja" | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Welcome card stagger animations
  const cardAnims = useRef(
    VALUE_CARDS.map(() => ({
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(30),
    }))
  ).current;

  // Phase transition
  const phaseOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (phase === "welcome") {
      Animated.stagger(
        110,
        cardAnims.map(({ opacity, translateX }) =>
          Animated.parallel([
            Animated.timing(opacity, { toValue: 1, duration: 320, useNativeDriver: true }),
            Animated.spring(translateX, { toValue: 0, speed: 16, bounciness: 5, useNativeDriver: true }),
          ])
        )
      ).start();
    }
  }, [phase]);

  // Android back button
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "language") { setPhase("welcome"); return true; }
      return false;
    });
    return () => handler.remove();
  }, [phase]);

  const goToLanguage = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.timing(phaseOpacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setPhase("language");
      Animated.timing(phaseOpacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    });
  };

  const handleLangSelect = (l: "ko" | "ja") => {
    setSelectedLang(l);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLangContinue = () => {
    if (!selectedLang) return;
    updateProfile({
      language: selectedLang,
      country: selectedLang === "ko" ? "KR" : "JP",
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace("/login");
  };

  // ── Phase: welcome ───────────────────────────────────────────────────────────
  if (phase === "welcome") {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <View style={[s.header, { paddingTop: topPad + 16 }]}>
          <Text style={[s.logo, { color: colors.charcoal }]}>lito</Text>
        </View>

        <Animated.View style={[s.welcomeContent, { paddingBottom: bottomPad + 24, opacity: phaseOpacity }]}>
          <View style={s.welcomeHeadline}>
            <Text style={[s.welcomeTitle, { color: colors.charcoal }]}>
              {"한국과 일본을 잇는 인연\n韓日をつなぐ縁"}
            </Text>
          </View>

          <View style={s.cardStack}>
            {VALUE_CARDS.map((card, i) => (
              <Animated.View
                key={card.titleKo}
                style={[
                  s.valueCard,
                  {
                    borderColor: `${card.accentColor}22`,
                    opacity: cardAnims[i].opacity,
                    transform: [{ translateX: cardAnims[i].translateX }],
                  },
                ]}
              >
                <LinearGradient
                  colors={card.gradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={s.valueCardGrad}
                >
                  <View style={[s.valueCardIcon, { backgroundColor: card.iconBg }]}>
                    <FIcon name={card.icon} size={22} color={card.accentColor} />
                  </View>
                  <View style={s.valueCardText}>
                    <Text style={[s.valueCardTitle, { color: card.accentColor }]}>
                      {card.titleKo}
                    </Text>
                    <Text style={[s.valueCardBody, { color: "#4A3040" }]}>
                      {card.bodyKo}
                    </Text>
                  </View>
                </LinearGradient>
              </Animated.View>
            ))}
          </View>

          <View style={s.welcomeFooter}>
            <TouchableOpacity
              style={[s.ctaBtn, { backgroundColor: colors.rose }]}
              onPress={goToLanguage}
              activeOpacity={0.85}
            >
              <Text style={s.ctaBtnText}>{"시작하기 →"}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Phase: language ──────────────────────────────────────────────────────────
  return (
    <View style={[s.container, { backgroundColor: colors.white }]}>
      <View style={[s.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity
          onPress={() => setPhase("welcome")}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <FIcon name="chevron-left" size={22} color={colors.charcoalMid} />
        </TouchableOpacity>
        <Text style={[s.logo, { color: colors.charcoal }]}>lito</Text>
        <View style={{ width: 36 }} />
      </View>

      <Animated.View style={[s.langContent, { paddingBottom: bottomPad + 24, opacity: phaseOpacity }]}>
        <View style={s.langHeadline}>
          <Text style={[s.langTitle, { color: colors.charcoal }]}>
            {"언어를 선택하세요\n言語を選択してください"}
          </Text>
          <Text style={[s.langSub, { color: colors.charcoalLight }]}>
            앱 언어 및 매칭 국가가 설정됩니다
          </Text>
        </View>

        <View style={s.langCardRow}>
          {(["ko", "ja"] as const).map((l) => (
            <LanguageCard
              key={l}
              lang={l}
              isSelected={selectedLang === l}
              onPress={() => handleLangSelect(l)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[
            s.ctaBtn,
            {
              backgroundColor: selectedLang ? colors.rose : colors.muted,
              borderWidth: selectedLang ? 0 : 1.5,
              borderColor: colors.border,
            },
          ]}
          onPress={handleLangContinue}
          disabled={!selectedLang}
          activeOpacity={0.85}
        >
          <Text style={[s.ctaBtnText, { color: selectedLang ? "#fff" : colors.charcoalLight }]}>
            {selectedLang === "ko"
              ? "다음 →"
              : selectedLang === "ja"
              ? "次へ →"
              : "언어를 선택해주세요 · 言語を選んでください"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
    position: "relative",
  },
  logo: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.8 },
  backBtn: {
    position: "absolute",
    left: 24,
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Welcome ──────────────────────────────────────────────────────────────────
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  welcomeHeadline: { marginBottom: 28, paddingHorizontal: 4 },
  welcomeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 36,
  },
  cardStack: { gap: 12, flex: 1 },
  valueCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  valueCardGrad: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
  },
  valueCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  valueCardText: { flex: 1 },
  valueCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  valueCardBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    opacity: 0.82,
  },
  welcomeFooter: { marginTop: 24 },

  // ── Language ─────────────────────────────────────────────────────────────────
  langContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
  },
  langHeadline: { marginBottom: 32 },
  langTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 27,
    lineHeight: 38,
    marginBottom: 8,
  },
  langSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.8,
  },
  langCardRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 32,
  },

  // ── Shared CTA ───────────────────────────────────────────────────────────────
  ctaBtn: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    color: "#fff",
    letterSpacing: 0.1,
  },
});

const lc = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1.5,
    paddingVertical: 28,
    paddingHorizontal: 12,
    alignItems: "center",
    gap: 10,
    position: "relative",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 18,
    elevation: 4,
  },
  checkBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  langMain: { fontFamily: "Inter_700Bold", fontSize: 22 },
  langSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
