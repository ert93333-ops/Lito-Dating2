import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
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
import Svg, { Circle, G, Path } from "react-native-svg";
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

// ── FlagBadge ──────────────────────────────────────────────────────────────────
// SVG-based flag — no emoji dependency, Android-safe
// KR: Taeguk (태극) yin-yang in Korean red/blue, rotated -45°
// JP: Hi-no-maru (日の丸) red circle on white

function FlagBadge({ country, size = 64 }: { country: "KR" | "JP"; size?: number }) {
  if (country === "JP") {
    return (
      <View style={{
        shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
      }}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Circle cx="50" cy="50" r="50" fill="#FFFFFF" />
          <Circle cx="50" cy="50" r="30" fill="#BC002D" />
          <Circle cx="50" cy="50" r="49" fill="none" stroke="#E0DADA" strokeWidth="2" />
        </Svg>
      </View>
    );
  }

  // KR — Taeguk (rotated yin-yang)
  return (
    <View style={{
      shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1, shadowRadius: 4, elevation: 3,
    }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="50" fill="#FFFFFF" />
        <G rotation="-45" origin="50, 50">
          <Path
            d="M 50 10 A 40 40 0 0 1 50 90 A 20 20 0 0 1 50 50 A 20 20 0 0 0 50 10 Z"
            fill="#C60C30"
          />
          <Path
            d="M 50 10 A 40 40 0 0 0 50 90 A 20 20 0 0 0 50 50 A 20 20 0 0 1 50 10 Z"
            fill="#003478"
          />
          <Circle cx="50" cy="30" r="9" fill="#003478" />
          <Circle cx="50" cy="70" r="9" fill="#C60C30" />
        </G>
        <Circle cx="50" cy="50" r="49" fill="none" stroke="#D0C8CA" strokeWidth="2" />
      </Svg>
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
            <Text style={langCard.checkText}>✓</Text>
          </Animated.View>
        )}

        <FlagBadge country={isKo ? "KR" : "JP"} size={64} />

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

// ── CountryCard ───────────────────────────────────────────────────────────────

function CountryCard({
  country,
  isSelected,
  onPress,
  appLang,
}: {
  country: "KR" | "JP";
  isSelected: boolean;
  onPress: () => void;
  appLang: "ko" | "ja";
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

        <FlagBadge country={country} size={64} />

        <Text style={[countryStyles.nameMain, { color: colors.charcoal }]}>
          {isKR
            ? (appLang === "ko" ? "한국" : "韓国")
            : (appLang === "ko" ? "일본" : "日本")}
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
// Flow: language (L2 fix) → slides → country → login
// Back navigation (L1 fix):
//   - "slides" phase: back → previous slide; if slide 0 → back to "language"
//   - "country" phase: back → last slide in "slides"
//   - "language" phase: back → exit app (default)

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, updateProfile } = useApp();

  const [phase, setPhase] = useState<"language" | "slides" | "country">("language");
  const [selectedLang, setSelectedLang] = useState<"ko" | "ja" | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<"KR" | "JP" | null>(null);
  const flatRef = useRef<FlatList>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── L1 FIX: Android hardware back button handler ───────────────────────────
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const handler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (phase === "country") {
        // Go back to last slide
        setPhase("slides");
        const last = SLIDES.length - 1;
        setCurrentIndex(last);
        setTimeout(() => {
          flatRef.current?.scrollToIndex({ index: last, animated: false });
        }, 50);
        return true;
      }
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPhase("country");
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

  const skipToCountry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhase("country");
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

  // ── Country selection helpers ──────────────────────────────────────────────
  const handleCountrySelect = (c: "KR" | "JP") => {
    setSelectedCountry(c);
    updateProfile({ country: c, language: c === "KR" ? "ko" : "ja" });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCountryContinue = () => {
    if (!selectedCountry) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    completeOnboarding();
    router.replace("/login");
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

  // ── Phase: country ─────────────────────────────────────────────────────────
  if (phase === "country") {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <View style={[styles.header, { paddingTop: topPad + 16 }]}>
          <TouchableOpacity
            onPress={() => {
              setPhase("slides");
              const last = SLIDES.length - 1;
              setCurrentIndex(last);
              setTimeout(() => {
                flatRef.current?.scrollToIndex({ index: last, animated: false });
              }, 50);
            }}
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

        <Animated.View
          entering={FadeInUp.duration(320).springify()}
          style={[countryStyles.content, { paddingBottom: bottomPad + 24 }]}
        >
          <View style={countryStyles.headline}>
            <Text style={[countryStyles.headlineTitle, { color: colors.charcoal }]}>
              {appLang === "ko"
                ? "어느 나라에서\n오셨나요?"
                : "どちらの国から\n来ましたか？"}
            </Text>
            <Text style={[countryStyles.headlineSub, { color: colors.charcoalMid }]}>
              {appLang === "ko"
                ? "どちらの国から来ましたか？"
                : "어느 나라에서 오셨나요?"}
            </Text>
            <Text style={[countryStyles.headlineHint, { color: colors.charcoalLight }]}>
              {appLang === "ko"
                ? "번역 방향이 자동으로 설정됩니다"
                : "翻訳方向が自動的に設定されます"}
            </Text>
          </View>

          <View style={countryStyles.cardRow}>
            {(["KR", "JP"] as const).map((c) => (
              <CountryCard
                key={c}
                country={c}
                isSelected={selectedCountry === c}
                onPress={() => handleCountrySelect(c)}
                appLang={appLang}
              />
            ))}
          </View>

          <View style={[countryStyles.langNote, { borderColor: colors.border }]}>
            <Text style={[countryStyles.langNoteText, { color: colors.charcoalLight }]}>
              {appLang === "ko"
                ? "🌐  앱 언어가 자동으로 설정됩니다 · アプリ言語が自動設定されます"
                : "🌐  アプリ言語が自動設定されます · 앱 언어가 자동으로 설정됩니다"}
            </Text>
          </View>

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
                  ? (appLang === "ko" ? "시작하기 →" : "始める →")
                  : selectedCountry === "JP"
                  ? (appLang === "ko" ? "시작하기 →" : "始める →")
                  : (appLang === "ko" ? "국가를 선택해주세요" : "国を選んでください")}
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
        <TouchableOpacity onPress={skipToCountry} style={styles.skipBtn}>
          <Text style={[styles.skip, { color: colors.charcoalLight }]}>
            {appLang === "ko" ? "건너뛰기" : "スキップ"}
          </Text>
        </TouchableOpacity>
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
              <Text style={styles.emoji}>{item.emoji}</Text>
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
              ? (appLang === "ko" ? "국가 선택하기 →" : "国を選ぶ →")
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

// ── Country phase styles ──────────────────────────────────────────────────────

const countryStyles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    justifyContent: "center",
  },

  headline: { marginBottom: 40 },
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
