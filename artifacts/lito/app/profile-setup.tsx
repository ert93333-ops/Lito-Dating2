import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LitoMark } from "@/components/LitoMark";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ── Interest tags with emoji ──────────────────────────────────────────────────
const INTERESTS: { tag: string; emoji: string }[] = [
  { tag: "K-Pop", emoji: "🎵" },
  { tag: "K-Drama", emoji: "📺" },
  { tag: "Anime", emoji: "✨" },
  { tag: "Travel", emoji: "✈️" },
  { tag: "Cooking", emoji: "🍳" },
  { tag: "Coffee", emoji: "☕" },
  { tag: "Photography", emoji: "📸" },
  { tag: "Music", emoji: "🎶" },
  { tag: "Books", emoji: "📚" },
  { tag: "Fitness", emoji: "💪" },
  { tag: "Gaming", emoji: "🎮" },
  { tag: "Nature", emoji: "🌿" },
  { tag: "Movies", emoji: "🎬" },
  { tag: "Fashion", emoji: "👗" },
  { tag: "Design", emoji: "🎨" },
  { tag: "Language Exchange", emoji: "🗣️" },
  { tag: "Food Tour", emoji: "🍜" },
  { tag: "Hiking", emoji: "🏔️" },
  { tag: "Art", emoji: "🖼️" },
  { tag: "Tech", emoji: "💻" },
];

// ── AnimatedPressable CTA ─────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => {
    if (disabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }], width: "100%" }}>
      <Pressable
        onPress={() => {
          if (disabled) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          btn.root,
          { backgroundColor: disabled ? colors.muted : colors.rose },
        ]}
      >
        <Text style={[btn.text, { color: disabled ? colors.charcoalLight : "#fff" }]}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const btn = StyleSheet.create({
  root: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  text: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.1,
  },
});

// ── ProfileSetupScreen — 2-step wizard ───────────────────────────────────────
// Country is already selected in onboarding, so this wizard starts at identity.

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, completeProfileSetup } = useApp();
  const { t, lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Wizard state — 2 steps
  const [step, setStep] = useState<1 | 2>(1);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [intro, setIntro] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const parsedAge = parseInt(age);
  const ageValid = age === "" || (parsedAge >= 18 && parsedAge <= 99);
  const step1CanContinue = nickname.trim().length >= 2 && (age === "" || ageValid);

  const handleStep1Continue = () => {
    if (!step1CanContinue) return;
    if (age !== "" && !ageValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(2);
  };

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 8) return prev;
      return [...prev, tag];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleFinish = () => {
    const trimmedIntro = intro.trim();
    updateProfile({
      nickname: nickname.trim() || "User",
      age: parsedAge >= 18 && parsedAge <= 99 ? parsedAge : 25,
      country: profile.country,
      language: lang,
      intro: trimmedIntro || undefined,
      bio: trimmedIntro || undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
    });
    completeProfileSetup();
  };

  // ── Shared header ─────────────────────────────────────────────────────────
  const TOTAL_STEPS = 2;

  const Header = () => (
    <View style={[shared.header, { paddingTop: topPad + 14 }]}>
      <View style={shared.logoRow}>
        <LitoMark size={28} />
        <Text style={[shared.logo, { color: colors.charcoal }]}>lito</Text>
      </View>
      <View style={shared.stepBadge}>
        <Text style={[shared.stepText, { color: colors.rose }]}>
          {step}
        </Text>
        <Text style={[shared.stepTotal, { color: colors.charcoalLight }]}>
          /{TOTAL_STEPS}
        </Text>
      </View>
    </View>
  );

  const ProgressBar = () => (
    <View style={[shared.progressTrack, { backgroundColor: colors.border }]}>
      <LinearGradient
        colors={["#E8607A", "#D85870"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[shared.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` as any }]}
      />
    </View>
  );

  // Country context pill — shown in each step as a persistent reminder
  const CountryPill = () => (
    <View style={[shared.countryPill, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
      <Text style={shared.countryFlag}>
        {profile.country === "KR" ? "🇰🇷" : "🇯🇵"}
      </Text>
      <Text style={[shared.countryLabel, { color: colors.rose }]}>
        {profile.country === "KR" ? "한국 · Korean" : "日本 · Japanese"}
      </Text>
    </View>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Identity (name / age / intro)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header />
        <ProgressBar />

        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Country context */}
          <View style={s.pillRow}>
            <CountryPill />
          </View>

          {/* Step hero */}
          <Text style={[s.heroTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "안녕하세요 👋" : "はじめまして 👋"}
          </Text>
          <Text style={[s.heroSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "상대방에게 보여질 프로필을 만들어봐요"
              : "相手に見せるプロフィールを作りましょう"}
          </Text>

          {/* Nickname field */}
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "닉네임" : "ニックネーム"}
            </Text>
            <TextInput
              style={[
                s.input,
                s.inputLarge,
                {
                  backgroundColor: colors.muted,
                  borderColor: nickname.length > 0 ? colors.rose : colors.border,
                  color: colors.charcoal,
                },
              ]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={lang === "ko" ? "닉네임을 입력하세요" : "ニックネームを入力"}
              placeholderTextColor={colors.charcoalFaint}
              returnKeyType="next"
              autoFocus
              maxLength={20}
            />
            {nickname.trim().length > 0 && nickname.trim().length < 2 && (
              <Text style={[s.fieldHint, { color: colors.rose }]}>
                {lang === "ko" ? "2자 이상 입력해주세요" : "2文字以上入力してください"}
              </Text>
            )}
          </View>

          {/* Age field */}
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "나이" : "年齢"}
            </Text>
            <View style={s.ageRow}>
              <TextInput
                style={[
                  s.input,
                  s.ageInput,
                  {
                    backgroundColor: colors.muted,
                    borderColor: age.length > 0 ? colors.rose : colors.border,
                    color: colors.charcoal,
                  },
                ]}
                value={age}
                onChangeText={setAge}
                placeholder={lang === "ko" ? "나이" : "年齢"}
                placeholderTextColor={colors.charcoalFaint}
                keyboardType="numeric"
                returnKeyType="next"
                maxLength={2}
              />
              <Text style={[s.ageSuffix, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "세" : "歳"}
              </Text>
            </View>
            {age !== "" && !ageValid && (
              <Text style={[s.fieldHint, { color: colors.rose }]}>
                {lang === "ko" ? "18~99세 사이로 입력해주세요" : "18〜99歳の範囲で入力してください"}
              </Text>
            )}
          </View>

          {/* Intro field */}
          <View style={s.field}>
            <View style={s.labelRow}>
              <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
                {lang === "ko" ? "한 줄 소개" : "一言紹介"}
              </Text>
              <Text style={[s.optional, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "선택" : "任意"}
              </Text>
            </View>
            <TextInput
              style={[
                s.input,
                s.introInput,
                {
                  backgroundColor: colors.muted,
                  borderColor: intro.length > 0 ? colors.rose : colors.border,
                  color: colors.charcoal,
                },
              ]}
              value={intro}
              onChangeText={setIntro}
              placeholder={
                lang === "ko"
                  ? "자신을 한 문장으로 소개해주세요"
                  : "一文で自己紹介してください"
              }
              placeholderTextColor={colors.charcoalFaint}
              maxLength={80}
              returnKeyType="done"
            />
            <Text style={[s.charCount, { color: colors.charcoalFaint }]}>
              {intro.length}/80
            </Text>
          </View>

          {/* Soft tip card */}
          <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={s.tipEmoji}>💡</Text>
            <Text style={[s.tipText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? "진솔한 소개가 좋은 인연을 만들어요. 있는 그대로의 나를 보여주세요."
                : "正直な自己紹介が良い縁を生みます。ありのままの自分を見せてください。"}
            </Text>
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton
            label={lang === "ko" ? "다음 →" : "次へ →"}
            onPress={handleStep1Continue}
            disabled={!step1CanContinue}
          />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Interests
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[s.container, { backgroundColor: colors.white }]}>
      <Header />
      <ProgressBar />

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Country context */}
        <View style={s.pillRow}>
          <CountryPill />
        </View>

        {/* Step hero */}
        <Text style={[s.heroTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "관심사를 골라주세요 ✨" : "趣味を選んでください ✨"}
        </Text>
        <View style={s.interestMeta}>
          <Text style={[s.heroSub, { color: colors.charcoalLight, marginBottom: 0 }]}>
            {lang === "ko"
              ? "공통 관심사가 대화의 시작이 돼요"
              : "共通の趣味が会話のきっかけになります"}
          </Text>
          <View style={[s.countBadge, { backgroundColor: selectedInterests.length > 0 ? colors.roseLight : colors.muted }]}>
            <Text style={[s.countBadgeText, { color: selectedInterests.length > 0 ? colors.rose : colors.charcoalLight }]}>
              {selectedInterests.length}/8
            </Text>
          </View>
        </View>

        {/* Interest tags grid */}
        <View style={s.interestGrid}>
          {INTERESTS.map(({ tag, emoji }) => {
            const picked = selectedInterests.includes(tag);
            const atMax = !picked && selectedInterests.length >= 8;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  s.interestTag,
                  {
                    backgroundColor: picked ? colors.rose : colors.muted,
                    borderColor: picked ? colors.rose : colors.border,
                    opacity: atMax ? 0.4 : 1,
                  },
                ]}
                onPress={() => toggleInterest(tag)}
                disabled={atMax}
                activeOpacity={0.72}
              >
                <Text style={s.tagEmoji}>{emoji}</Text>
                <Text
                  style={[
                    s.tagText,
                    { color: picked ? "#fff" : colors.charcoalMid },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Skip hint */}
        <Text style={[s.skipHint, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "관심사는 나중에 프로필에서 추가할 수 있어요"
            : "趣味は後でプロフィールから追加できます"}
        </Text>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
        <PrimaryButton
          label={lang === "ko" ? "시작하기 🎉" : "始める 🎉"}
          onPress={handleFinish}
        />
      </View>
    </View>
  );
}

// ── Shared step styles ────────────────────────────────────────────────────────
const shared = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    letterSpacing: -0.6,
  },
  stepBadge: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  stepText: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.5,
  },
  stepTotal: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  countryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  countryFlag: { fontSize: 16 },
  countryLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1 },

  scroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  pillRow: {
    marginBottom: 24,
  },

  // Hero
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    lineHeight: 40,
    marginBottom: 8,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 32,
    flex: 1,
  },

  // Fields
  field: { marginBottom: 24 },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  optional: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  input: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontFamily: "Inter_400Regular",
    fontSize: 16,
  },
  inputLarge: {
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  introInput: {
    height: 88,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  ageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  ageInput: {
    width: 100,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "Inter_500Medium",
  },
  ageSuffix: {
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  fieldHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 6,
  },
  charCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    textAlign: "right",
    marginTop: 5,
  },

  // Tip card
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
  tipEmoji: { fontSize: 16, marginTop: 1 },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 21,
    flex: 1,
  },

  // Interests
  interestMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  countBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  interestTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
  },
  tagEmoji: { fontSize: 14 },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
  },
  skipHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },

  // Sticky footer
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
