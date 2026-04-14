import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import FIcon from "@/components/FIcon";
import React, { useEffect, useRef, useState } from "react";
import {
  BackHandler,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width } = Dimensions.get("window");

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: "1",
    icon: "heart" as const,
    gradientColors: ["#FFF0F3", "#FAE0E5"] as const,
    accentColor: "#D85870",
    titleKo: "AI 문화 매칭",
    titleJa: "AIカルチャーマッチング",
    titleBi: "AI 문화 매칭 · AI カルチャーマッチング",
    bodyKo: "AI가 한국과 일본 문화를 깊이 이해하여\n가치관이 맞는 사람을 찾아드려요.",
    bodyJa: "AIが韓国と日本の文化を深く理解し\n価値観が合う相手を見つけてくれます。",
  },
  {
    id: "2",
    icon: "message-circle" as const,
    gradientColors: ["#EEF4FF", "#DCE8FF"] as const,
    accentColor: "#3B6FD4",
    titleKo: "실시간 번역",
    titleJa: "リアルタイム翻訳",
    titleBi: "실시간 번역 · リアルタイム翻訳",
    bodyKo: "언어 장벽을 넘어 자연스럽게 대화하세요.\n한일 번역으로 진정한 연결이 가능해요.",
    bodyJa: "言葉の壁を越えて自然に会話できます。\n韓日翻訳で本当のつながりが生まれます。",
  },
  {
    id: "3",
    icon: "shield" as const,
    gradientColors: ["#EFFAF4", "#D8F5E5"] as const,
    accentColor: "#1A7A4A",
    titleKo: "안전한 신뢰 쌓기",
    titleJa: "安全な信頼の構築",
    titleBi: "안전한 신뢰 쌓기 · 安全な信頼構築",
    bodyKo: "준비됐을 때만 연락처를 공유하세요.\n신뢰가 쌓인 후에 앱 밖으로 나갈 수 있어요.",
    bodyJa: "準備ができたときだけ連絡先を共有。\n信頼が深まってからアプリの外へ踏み出せます。",
  },
] as const;

// ── CtaButton ─────────────────────────────────────────────────────────────────

function CtaButton({
  label,
  accentColor,
  onPress,
}: {
  label: string;
  accentColor: string;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 22, stiffness: 420 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View style={[animStyle, { width: "100%" }]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.ctaBtn, { backgroundColor: accentColor }]}
      >
        <Text style={styles.ctaBtnText}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ── FlagBadge ──────────────────────────────────────────────────────────────────
// Modern language badge — gradient rounded square with typographic mark
function FlagBadge({ country, size = 80 }: { country: "KR" | "JP"; size?: number }) {
  const radius = size * 0.28;

  if (country === "JP") {
    return (
      <View style={{
        width: size, height: size, borderRadius: radius, overflow: "hidden",
        shadowColor: "#3B6FD4", shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22, shadowRadius: 14, elevation: 6,
      }}>
        <LinearGradient
          colors={["#3B6FD4", "#6A4FC8", "#C04472"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{
            fontFamily: "Inter_700Bold",
            fontSize: size * 0.38,
            color: "rgba(255,255,255,0.95)",
            letterSpacing: -1,
            lineHeight: size * 0.46,
          }}>
            日
          </Text>
          <View style={{
            position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
            backgroundColor: "rgba(255,255,255,0.25)",
          }} />
        </LinearGradient>
      </View>
    );
  }

  // KR — diagonal gradient in Korean flag colors
  return (
    <View style={{
      width: size, height: size, borderRadius: radius, overflow: "hidden",
      shadowColor: "#C60C30", shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
    }}>
      <LinearGradient
        colors={["#D8324A", "#8B2FC9", "#1C4F9C"]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
      >
        <Text style={{
          fontFamily: "Inter_700Bold",
          fontSize: size * 0.38,
          color: "rgba(255,255,255,0.95)",
          letterSpacing: -1,
          lineHeight: size * 0.46,
        }}>
          한
        </Text>
        {/* Bottom color strip */}
        <View style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
          backgroundColor: "rgba(255,255,255,0.25)",
        }} />
      </LinearGradient>
    </View>
  );
}

// ── LanguageCard ───────────────────────────────────────────────────────────────
// L2 FIX: First screen forces explicit language/country selection.

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
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 380 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 14, stiffness: 280 });
  };

  const isKo = lang === "ko";
  const accentColor = isKo ? "#D85870" : "#3B6FD4";
  const bgColor = isKo ? "#FFF0F3" : "#EEF4FF";
  const borderColor = isKo ? "#F2BDCA" : "#A8C4F5";

  return (
    <Animated.View style={[animStyle, { flex: 1 }]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          langCard.card,
          {
            borderColor: isSelected ? accentColor : colors.border,
            backgroundColor: isSelected ? bgColor : colors.white,
            shadowColor: isSelected ? accentColor : "#000",
            shadowOpacity: isSelected ? 0.18 : 0.05,
          },
        ]}
      >
        {isSelected && (
          <Animated.View
            entering={FadeIn.duration(160)}
            style={[langCard.checkBadge, { backgroundColor: accentColor }]}
          >
            <FIcon name="check" size={13} color="#fff" />
          </Animated.View>
        )}

        <FlagBadge country={isKo ? "KR" : "JP"} size={76} />

        <Text style={[langCard.langMain, { color: isSelected ? accentColor : colors.charcoal }]}>
          {isKo ? "한국어" : "日本語"}
        </Text>
        <Text style={[langCard.langSub, { color: colors.charcoalLight }]}>
          {isKo ? "Korean" : "Japanese"}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

// ── OnboardingScreen ──────────────────────────────────────────────────────────
// Flow: language → slides → login (country auto-set from language choice)
// Back navigation:
//   - "slides" phase: back → previous slide; if slide 0 → back to "language"
//   - "language" phase: back → exit app (default)

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, updateProfile } = useApp();

  const [phase, setPhase] = useState<"language" | "slides">("language");
  const [selectedLang, setSelectedLang] = useState<"ko" | "ja" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── L1 FIX: Android hardware back button handler ───────────────────────────
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "slides") {
        if (currentIndex > 0) {
          const prev = currentIndex - 1;
          flatRef.current?.scrollToIndex({ index: prev, animated: true });
          setCurrentIndex(prev);
          return true;
        }
        // First slide → go back to language selection
        setPhase("language");
        return true;
      }
      // Language phase → exit app (default BackHandler behavior)
      return false;
    });

    return () => handler.remove();
  }, [phase, currentIndex]);

  // ── Slides helpers ─────────────────────────────────────────────────────────
  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      // Last slide → skip country step, go straight to login
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      completeOnboarding();
      router.replace("/login");
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      flatRef.current?.scrollToIndex({ index: prev, animated: true });
      setCurrentIndex(prev);
    } else {
      setPhase("language");
    }
  };

  // ── Language selection helpers ─────────────────────────────────────────────
  const handleLangSelect = (l: "ko" | "ja") => {
    setSelectedLang(l);
    updateProfile({
      language: l,
      country: l === "ko" ? "KR" : "JP",
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleLangContinue = () => {
    if (!selectedLang) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCurrentIndex(0);
    setTimeout(() => {
      flatRef.current?.scrollToIndex({ index: 0, animated: false });
    }, 50);
    setPhase("slides");
  };

  const appLang: "ko" | "ja" = selectedLang ?? "ko";
  const slide = SLIDES[currentIndex];

  // ── Phase: language ────────────────────────────────────────────────────────
  if (phase === "language") {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.logoRow}>
            <Text style={[styles.logo, { color: colors.charcoal }]}>lito</Text>
          </View>
        </View>

        <Animated.View
          entering={FadeInUp.duration(320).springify()}
          style={[langStyles.content, { paddingBottom: bottomPad + 24 }]}
        >
          <View style={langStyles.headline}>
            <Text style={[langStyles.title, { color: colors.charcoal }]}>
              {"언어를 선택하세요\n言語を選択してください"}
            </Text>
            <Text style={[langStyles.sub, { color: colors.charcoalLight }]}>
              {"Choose your language · 언어를 선택 / 言語選択"}
            </Text>
          </View>

          <View style={langStyles.cardRow}>
            {(["ko", "ja"] as const).map((l) => (
              <LanguageCard
                key={l}
                lang={l}
                isSelected={selectedLang === l}
                onPress={() => handleLangSelect(l)}
              />
            ))}
          </View>

          <View style={langStyles.ctaWrap}>
            <TouchableOpacity
              style={[
                langStyles.ctaBtn,
                {
                  backgroundColor: selectedLang ? colors.rose : colors.muted,
                  borderColor: selectedLang ? colors.rose : colors.border,
                },
              ]}
              onPress={handleLangContinue}
              disabled={!selectedLang}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  langStyles.ctaBtnText,
                  { color: selectedLang ? colors.white : colors.charcoalLight },
                ]}
              >
                {selectedLang === "ko"
                  ? "다음 →"
                  : selectedLang === "ja"
                  ? "次へ →"
                  : "언어를 선택해주세요 · 言語を選んでください"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Phase: slides ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        {/* L1 FIX: Back button navigates to previous slide or language phase */}
        <TouchableOpacity
          onPress={goPrev}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.backArrow, { color: colors.charcoalMid }]}>←</Text>
        </TouchableOpacity>
        <View style={styles.logoRow}>
          <Text style={[styles.logo, { color: colors.charcoal }]}>lito</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <LinearGradient
              colors={item.gradientColors}
              style={styles.iconCircle}
            >
              <FIcon name={item.icon} size={52} color={item.accentColor} />
            </LinearGradient>

            <Text style={[styles.title, { color: colors.charcoal }]}>
              {appLang === "ko" ? item.titleKo : item.titleJa}
            </Text>

            <View style={[styles.biTag, { backgroundColor: `${item.accentColor}14` }]}>
              <Text style={[styles.biText, { color: item.accentColor }]}>
                {item.titleBi}
              </Text>
            </View>

            <Text style={[styles.body, { color: colors.charcoalLight }]}>
              {appLang === "ko" ? item.bodyKo : item.bodyJa}
            </Text>

            <Text style={[styles.bodyNative, { color: colors.charcoalMid }]}>
              {appLang === "ko" ? item.bodyJa : item.bodyKo}
            </Text>
          </View>
        )}
      />

      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    i === currentIndex ? slide.accentColor : `${slide.accentColor}30`,
                  width: i === currentIndex ? 22 : 8,
                },
              ]}
            />
          ))}
        </View>

        <CtaButton
          accentColor={slide.accentColor}
          onPress={goNext}
          label={
            currentIndex === SLIDES.length - 1
              ? (appLang === "ko" ? "LITO 시작하기 →" : "LITO をはじめる →")
              : (appLang === "ko" ? "다음 →" : "次へ →")
          }
        />

        {currentIndex === SLIDES.length - 1 && (
          <Text style={[styles.trustNote, { color: colors.charcoalLight }]}>
            한국 · 일본 연결을 지원합니다
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Language phase styles ─────────────────────────────────────────────────────

const langCard = StyleSheet.create({
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
  checkText: { color: "#fff", fontSize: 12, fontFamily: "Inter_700Bold" },
  flag: { fontSize: 54 },
  langMain: { fontFamily: "Inter_700Bold", fontSize: 22 },
  langSub: { fontFamily: "Inter_400Regular", fontSize: 13 },
});

const langStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
  },
  headline: { marginBottom: 36 },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 38,
    marginBottom: 8,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    opacity: 0.8,
  },
  cardRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 28,
  },
  ctaWrap: { width: "100%" },
  ctaBtn: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.1,
  },
});

// ── Slides phase styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.8,
  },
  backBtn: {
    width: 36,
    alignItems: "flex-start",
    justifyContent: "center",
    padding: 4,
  },
  backArrow: {
    fontFamily: "Inter_400Regular",
    fontSize: 22,
    lineHeight: 28,
  },
  skipBtn: { padding: 4 },
  skip: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },

  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  iconCircle: {
    width: 148,
    height: 148,
    borderRadius: 74,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 38,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 36,
  },
  biTag: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  biText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    textAlign: "center",
    letterSpacing: 0.1,
  },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 25,
    marginBottom: 14,
  },
  bodyNative: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 21,
    opacity: 0.75,
  },

  footer: {
    paddingHorizontal: 28,
    alignItems: "center",
    gap: 0,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 22,
  },
  dot: { height: 8, borderRadius: 4 },
  ctaBtn: {
    width: "100%",
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    color: "#fff",
    letterSpacing: 0.1,
  },
  trustNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    marginTop: 14,
    textAlign: "center",
  },
});
