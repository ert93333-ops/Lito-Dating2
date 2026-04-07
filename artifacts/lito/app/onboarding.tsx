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
  withTiming,
  FadeIn,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LitoMark } from "@/components/LitoMark";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

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

// ── CountryCard ───────────────────────────────────────────────────────────────
// Large, tappable country card used in the country selection phase.

function CountryCard({
  country,
  isSelected,
  onPress,
}: {
  country: "KR" | "JP";
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

  const isKR = country === "KR";

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          countryStyles.card,
          {
            borderColor: isSelected ? colors.rose : colors.border,
            backgroundColor: isSelected ? colors.roseLight : colors.white,
            shadowColor: isSelected ? colors.rose : "#000",
            shadowOpacity: isSelected ? 0.18 : 0.05,
          },
        ]}
      >
        {isSelected && (
          <Animated.View
            entering={FadeIn.duration(160)}
            style={[countryStyles.checkBadge, { backgroundColor: colors.rose }]}
          >
            <Text style={countryStyles.checkText}>✓</Text>
          </Animated.View>
        )}

        <Text style={countryStyles.flag}>{isKR ? "🇰🇷" : "🇯🇵"}</Text>

        <Text style={[countryStyles.nameMain, { color: colors.charcoal }]}>
          {isKR ? "한국" : "日本"}
        </Text>
        <Text style={[countryStyles.nameSub, { color: colors.charcoalLight }]}>
          {isKR ? "Korea" : "Japan"}
        </Text>

        <View
          style={[
            countryStyles.langBadge,
            {
              backgroundColor: isSelected ? colors.roseSoft : colors.muted,
              borderColor: isSelected ? colors.roseSoft : colors.border,
            },
          ]}
        >
          <Text
            style={[
              countryStyles.langText,
              { color: isSelected ? colors.rose : colors.charcoalMid },
            ]}
          >
            {isKR ? "한국어" : "日本語"}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

// ── OnboardingScreen ──────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, updateProfile } = useApp();

  // "slides" — feature carousel. "country" — country selection before login.
  const [phase, setPhase] = useState<"slides" | "country">("slides");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<"KR" | "JP" | null>(null);
  const flatRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Slides phase — advance or move to country selection
  const goNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const next = currentIndex + 1;
      flatRef.current?.scrollToIndex({ index: next, animated: true });
      setCurrentIndex(next);
    } else {
      // Last slide — transition to country selection instead of skipping to login
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase("country");
    }
  };

  const skip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase("country");
  };

  // Country phase — select a country, commit to AppContext, proceed
  const handleCountrySelect = (c: "KR" | "JP") => {
    setSelectedCountry(c);
    updateProfile({ country: c }); // sets profile.language automatically
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCountryContinue = () => {
    if (!selectedCountry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeOnboarding();
    router.replace("/login");
  };

  const slide = SLIDES[currentIndex];

  // ── Country selection phase ────────────────────────────────────────────────
  if (phase === "country") {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }]}>

        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <View style={styles.logoRow}>
            <LitoMark size={32} />
            <Text style={[styles.logo, { color: colors.charcoal }]}>lito</Text>
          </View>
        </View>

        {/* Content */}
        <Animated.View
          entering={FadeInUp.duration(320).springify()}
          style={[countryStyles.content, { paddingBottom: bottomPad + 24 }]}
        >
          {/* Headline — trilingual since we don't know language yet */}
          <View style={countryStyles.headline}>
            <Text style={[countryStyles.headlineTitle, { color: colors.charcoal }]}>
              {"어느 나라에서\n오셨나요?"}
            </Text>
            <Text style={[countryStyles.headlineSub, { color: colors.charcoalMid }]}>
              {"どちらの国から来ましたか？"}
            </Text>
            <Text style={[countryStyles.headlineHint, { color: colors.charcoalLight }]}>
              {"This sets your language and translation direction"}
            </Text>
          </View>

          {/* Country cards — side by side */}
          <View style={countryStyles.cardRow}>
            {(["KR", "JP"] as const).map((c) => (
              <CountryCard
                key={c}
                country={c}
                isSelected={selectedCountry === c}
                onPress={() => handleCountrySelect(c)}
              />
            ))}
          </View>

          {/* Language auto-set note */}
          <View style={[countryStyles.langNote, { borderColor: colors.border }]}>
            <Text style={[countryStyles.langNoteText, { color: colors.charcoalLight }]}>
              🌐{"  "}앱 언어가 자동으로 설정됩니다 · アプリ言語が自動設定されます
            </Text>
          </View>

          {/* Continue CTA */}
          <View style={countryStyles.ctaWrap}>
            <TouchableOpacity
              style={[
                countryStyles.ctaBtn,
                {
                  backgroundColor: selectedCountry ? colors.rose : colors.muted,
                  borderColor: selectedCountry ? colors.rose : colors.border,
                },
              ]}
              onPress={handleCountryContinue}
              disabled={!selectedCountry}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  countryStyles.ctaBtnText,
                  { color: selectedCountry ? colors.white : colors.charcoalLight },
                ]}
              >
                {selectedCountry === "KR"
                  ? "시작하기 →"
                  : selectedCountry === "JP"
                  ? "始める →"
                  : "국가를 선택해주세요 · 国を選んでください"}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    );
  }

  // ── Slides phase ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>

      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.logoRow}>
          <LitoMark size={32} />
          <Text style={[styles.logo, { color: colors.charcoal }]}>lito</Text>
        </View>
        <TouchableOpacity onPress={skip} style={styles.skipBtn}>
          <Text style={[styles.skip, { color: colors.charcoalLight }]}>건너뛰기 · スキップ</Text>
        </TouchableOpacity>
      </View>

      {/* Slide list */}
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
              <Text style={styles.emoji}>{item.emoji}</Text>
            </LinearGradient>

            <Text style={[styles.title, { color: colors.charcoal }]}>
              {item.titleKo}
            </Text>

            <View style={[styles.biTag, { backgroundColor: `${item.accentColor}14` }]}>
              <Text style={[styles.biText, { color: item.accentColor }]}>
                {item.titleBi}
              </Text>
            </View>

            <Text style={[styles.body, { color: colors.charcoalLight }]}>
              {item.bodyKo}
            </Text>

            <Text style={[styles.bodyNative, { color: colors.charcoalMid }]}>
              {item.bodyJa}
            </Text>
          </View>
        )}
      />

      {/* Footer */}
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

        <CtaButton
          accentColor={slide.accentColor}
          onPress={goNext}
          label={
            currentIndex === SLIDES.length - 1
              ? "국가 선택하기 · 国を選ぶ"
              : "다음 · 次へ"
          }
        />

        {currentIndex === SLIDES.length - 1 && (
          <Text style={[styles.trustNote, { color: colors.charcoalLight }]}>
            🇰🇷 한국 · 🇯🇵 일본 연결을 지원합니다
          </Text>
        )}
      </View>
    </View>
  );
}

// ── Country phase styles ──────────────────────────────────────────────────────

const countryStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
  },

  headline: {
    marginBottom: 40,
  },
  headlineTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 32,
    lineHeight: 42,
    marginBottom: 8,
  },
  headlineSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 17,
    lineHeight: 26,
    marginBottom: 6,
  },
  headlineHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
    opacity: 0.75,
  },

  cardRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 20,
  },

  card: {
    flex: 1,
    borderRadius: 24,
    borderWidth: 2,
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
    position: "relative",
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
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
  checkText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  flag: { fontSize: 54 },
  nameMain: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
  },
  nameSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  langBadge: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginTop: 4,
    borderWidth: 1,
  },
  langText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  langNote: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 28,
    alignItems: "center",
  },
  langNoteText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 19,
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
  emoji: { fontSize: 64 },
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
