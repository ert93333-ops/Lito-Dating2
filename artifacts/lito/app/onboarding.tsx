import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
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
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LitoMark } from "@/components/LitoMark";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const { width } = Dimensions.get("window");

// ── Slide data ────────────────────────────────────────────────────────────────

const SLIDES = [
  {
    id: "1",
    emoji: "🤝",
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
    emoji: "💬",
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
    emoji: "🛡️",
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
// Animated press-scale CTA for onboarding — spring scale + haptic.

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

// ── OnboardingScreen ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useApp();
  const { lang } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      completeOnboarding();
      router.replace("/login");
    }
  };

  const skip = () => {
    completeOnboarding();
    router.replace("/login");
  };

  const slide = SLIDES[currentIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>

      {/* ── Header ───────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.logoRow}>
          <LitoMark size={32} />
          <Text style={[styles.logo, { color: colors.charcoal }]}>lito</Text>
        </View>
        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={[styles.skip, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "건너뛰기" : "スキップ"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Slide list ───────────────────────────────────────────────── */}
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

            {/* Icon block — gradient circle */}
            <LinearGradient
              colors={item.gradientColors}
              style={styles.iconCircle}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
            </LinearGradient>

            {/* Title */}
            <Text style={[styles.title, { color: colors.charcoal }]}>
              {lang === "ko" ? item.titleKo : item.titleJa}
            </Text>

            {/* Bilingual subtitle — rose accent */}
            <View style={[styles.biTag, { backgroundColor: `${item.accentColor}14` }]}>
              <Text style={[styles.biText, { color: item.accentColor }]}>
                {item.titleBi}
              </Text>
            </View>

            {/* Body */}
            <Text style={[styles.body, { color: colors.charcoalLight }]}>
              {lang === "ko" ? item.bodyKo : item.bodyJa}
            </Text>

            {/* Native language secondary copy */}
            <Text style={[styles.bodyNative, { color: colors.charcoalMid }]}>
              {lang === "ko" ? item.bodyJa : item.bodyKo}
            </Text>
          </View>
        )}
      />

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 24 }]}>

        {/* Progress dots */}
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

        {/* CTA button — spring scale on press */}
        <CtaButton
          accentColor={slide.accentColor}
          onPress={goNext}
          label={
            currentIndex === SLIDES.length - 1
              ? lang === "ko" ? "시작하기 · 始める" : "始める · 시작하기"
              : lang === "ko" ? "다음" : "次へ"
          }
        />

        {/* Trust cue on last slide */}
        {currentIndex === SLIDES.length - 1 && (
          <Text style={[styles.trustNote, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "🇰🇷 한국 · 🇯🇵 일본 연결을 지원합니다"
              : "🇰🇷 韓国 · 🇯🇵 日本のつながりをサポート"}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
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
  skipBtn: { padding: 4 },
  skip: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },

  // Slide
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 24,
    gap: 0,
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
  emoji: {
    fontSize: 64,
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

  // Footer
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
