import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

// ── Interest tags ─────────────────────────────────────────────────────────────
const INTERESTS = [
  "K-Pop", "K-Drama", "Anime", "Travel", "Cooking",
  "Coffee", "Photography", "Music", "Books", "Fitness",
  "Gaming", "Nature", "Movies", "Fashion", "Design",
  "Language Exchange", "Food Tour", "Hiking", "Art", "Tech",
];

// ── ProfileSetupScreen — 3-step wizard ───────────────────────────────────────
export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, completeProfileSetup } = useApp();
  const { t, lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Wizard state
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [country, setCountry] = useState<"KR" | "JP" | null>(null);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [intro, setIntro] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  // ── Step 1: Country selection ─────────────────────────────────────────────
  const handleCountrySelect = (c: "KR" | "JP") => {
    setCountry(c);
    // Immediately commits to AppContext — profile.language switches right away
    // useLocale() will now return the correct language for steps 2 and 3
    updateProfile({ country: c });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Brief delay so the selection feels acknowledged before advancing
    setTimeout(() => setStep(2), 200);
  };

  // ── Step 2: Name + age + intro ────────────────────────────────────────────
  const step2CanContinue = nickname.trim().length > 0;

  const handleStep2Continue = () => {
    if (!step2CanContinue) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
  };

  // ── Step 3: Interests + finish ────────────────────────────────────────────
  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 8) return prev;
      return [...prev, tag];
    });
  };

  const handleFinish = () => {
    updateProfile({
      nickname: nickname.trim() || "User",
      age: parseInt(age) || 25,
      country: country ?? "JP",
      language: lang,
      intro: intro.trim() || undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
    });
    completeProfileSetup();
    // _layout.tsx → RootNavigator routes to /(tabs)/discover
  };

  // ── Step header (shared) ──────────────────────────────────────────────────
  const StepHeader = () => (
    <View style={[stepStyles.header, { paddingTop: topPad + 14 }]}>
      <Text style={[stepStyles.logo, { color: colors.rose }]}>lito</Text>
      <View style={stepStyles.stepCounter}>
        <Text style={[stepStyles.stepText, { color: colors.charcoalLight }]}>
          {step} / 3
        </Text>
      </View>
    </View>
  );

  // ── Step progress bar (shared) ────────────────────────────────────────────
  const ProgressBar = () => (
    <View style={[stepStyles.progressTrack, { backgroundColor: colors.border }]}>
      <LinearGradient
        colors={["#E8607A", "#D85870"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[stepStyles.progressFill, { width: `${(step / 3) * 100}%` as any }]}
      />
    </View>
  );

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Country selection
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <StepHeader />
        <ProgressBar />

        <View style={styles.step1Content}>
          {/* Headline — bilingual, since we don't know language yet */}
          <View style={styles.step1Headline}>
            <Text style={[styles.step1Title, { color: colors.charcoal }]}>
              {"Where are you from?"}
            </Text>
            <Text style={[styles.step1TitleBi, { color: colors.charcoalMid }]}>
              {"어느 나라에서 오셨나요?"}
            </Text>
            <Text style={[styles.step1TitleBi, { color: colors.charcoalMid }]}>
              {"どちらの国から来ましたか？"}
            </Text>
            <Text style={[styles.step1Hint, { color: colors.charcoalLight }]}>
              This sets your app language and translation direction.{"\n"}
              이 선택이 앱 언어 및 번역 방향을 결정합니다.
            </Text>
          </View>

          {/* Country cards */}
          <View style={styles.countryRow}>
            {(["KR", "JP"] as const).map((c) => {
              const isSelected = country === c;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => handleCountrySelect(c)}
                  activeOpacity={0.88}
                  style={[
                    styles.countryCard,
                    {
                      borderColor: isSelected ? colors.rose : colors.border,
                      backgroundColor: isSelected ? colors.roseLight : colors.white,
                    },
                  ]}
                >
                  {isSelected && (
                    <View style={[styles.countryCheckmark, { backgroundColor: colors.rose }]}>
                      <Feather name="check" size={11} color={colors.white} />
                    </View>
                  )}
                  <Text style={styles.countryFlag}>
                    {c === "KR" ? "🇰🇷" : "🇯🇵"}
                  </Text>
                  <Text style={[styles.countryNameMain, { color: colors.charcoal }]}>
                    {c === "KR" ? "한국" : "日本"}
                  </Text>
                  <Text style={[styles.countryNameSub, { color: colors.charcoalLight }]}>
                    {c === "KR" ? "Korea" : "Japan"}
                  </Text>
                  <View
                    style={[
                      styles.countryLangBadge,
                      { backgroundColor: isSelected ? colors.roseSoft : colors.muted },
                    ]}
                  >
                    <Text style={[styles.countryLangText, { color: isSelected ? colors.rose : colors.charcoalLight }]}>
                      {c === "KR" ? "한국어" : "日本語"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Language set note */}
          <View style={[styles.langNoteRow, { borderColor: colors.border }]}>
            <Feather name="globe" size={13} color={colors.charcoalLight} />
            <Text style={[styles.langNote, { color: colors.charcoalLight }]}>
              App language is set automatically based on your country
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Name / age / intro
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <View style={[styles.container, { backgroundColor: colors.white }]}>
        <StepHeader />
        <ProgressBar />

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Country context chip */}
          <View style={styles.contextRow}>
            <View style={[styles.contextChip, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
              <Text style={styles.contextFlag}>{country === "KR" ? "🇰🇷" : "🇯🇵"}</Text>
              <Text style={[styles.contextChipText, { color: colors.rose }]}>
                {country === "KR" ? "한국 · Korean" : "日本 · Japanese"}
              </Text>
            </View>
          </View>

          {/* Headline */}
          <Text style={[styles.stepTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "자신을 소개해주세요" : "自己紹介をしてください"}
          </Text>
          <Text style={[styles.stepSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "프로필에 표시될 기본 정보를 입력해주세요"
              : "プロフィールに表示される基本情報を入力してください"}
          </Text>

          {/* Nickname */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.charcoalMid }]}>
              {t("setup.nickname")}
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal },
              ]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={t("setup.nicknamePlaceholder")}
              placeholderTextColor={colors.charcoalLight}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Age */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.charcoalMid }]}>
              {t("setup.age")}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.shortInput,
                { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal },
              ]}
              value={age}
              onChangeText={setAge}
              placeholder={t("setup.agePlaceholder")}
              placeholderTextColor={colors.charcoalLight}
              keyboardType="numeric"
              returnKeyType="next"
              maxLength={2}
            />
          </View>

          {/* Short intro */}
          <View style={styles.field}>
            <Text style={[styles.label, { color: colors.charcoalMid }]}>
              {t("setup.intro")}
              <Text style={[styles.optionalTag, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "  (선택)" : "  (任意)"}
              </Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal },
              ]}
              value={intro}
              onChangeText={setIntro}
              placeholder={t("setup.introPlaceholder")}
              placeholderTextColor={colors.charcoalLight}
              maxLength={80}
              returnKeyType="done"
            />
          </View>
        </ScrollView>

        {/* Sticky footer */}
        <View
          style={[
            stepStyles.footer,
            { paddingBottom: bottomPad + 14, borderTopColor: colors.border },
          ]}
        >
          <TouchableOpacity
            style={[
              stepStyles.ctaBtn,
              { backgroundColor: step2CanContinue ? colors.rose : colors.muted },
            ]}
            onPress={handleStep2Continue}
            disabled={!step2CanContinue}
            activeOpacity={0.85}
          >
            <Text
              style={[
                stepStyles.ctaBtnText,
                { color: step2CanContinue ? colors.white : colors.charcoalLight },
              ]}
            >
              {lang === "ko" ? "다음 →" : "次へ →"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Interests
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      <StepHeader />
      <ProgressBar />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Headline */}
        <Text style={[styles.stepTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "관심사를 선택해주세요" : "趣味を選んでください"}
        </Text>
        <Text style={[styles.stepSub, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? `${selectedInterests.length}/8개 선택됨 · 나중에 변경 가능해요`
            : `${selectedInterests.length}/8個選択中 · 後で変更できます`}
        </Text>

        {/* Interest grid */}
        <View style={styles.interestGrid}>
          {INTERESTS.map((tag) => {
            const picked = selectedInterests.includes(tag);
            const atMax = !picked && selectedInterests.length >= 8;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.interestTag,
                  {
                    backgroundColor: picked ? colors.rose : colors.muted,
                    borderColor: picked ? colors.rose : colors.border,
                    opacity: atMax ? 0.45 : 1,
                  },
                ]}
                onPress={() => {
                  toggleInterest(tag);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                disabled={atMax}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.interestTagText,
                    { color: picked ? colors.white : colors.charcoalMid },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Skip hint */}
        <Text style={[styles.skipHint, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "관심사를 선택하지 않고 바로 시작할 수도 있어요"
            : "興味がなければスキップしてもOKです"}
        </Text>
      </ScrollView>

      {/* Sticky footer */}
      <View
        style={[
          stepStyles.footer,
          { paddingBottom: bottomPad + 14, borderTopColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[stepStyles.ctaBtn, { backgroundColor: colors.rose }]}
          onPress={handleFinish}
          activeOpacity={0.85}
        >
          <Text style={[stepStyles.ctaBtnText, { color: colors.white }]}>
            {lang === "ko" ? "시작하기 →" : "始める →"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Shared step styles ────────────────────────────────────────────────────────
const stepStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -0.8,
  },
  stepCounter: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  stepText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  progressTrack: {
    height: 3,
    marginHorizontal: 0,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 3,
    borderRadius: 2,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    backgroundColor: "#fff",
  },
  ctaBtn: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  ctaBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
});

// ── Screen styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Step 1 ────────────────────────────────────────────────────────────────
  step1Content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  step1Headline: { marginBottom: 36 },
  step1Title: {
    fontFamily: "Inter_700Bold",
    fontSize: 30,
    marginBottom: 10,
    lineHeight: 38,
  },
  step1TitleBi: {
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  step1Hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
    opacity: 0.75,
  },

  countryRow: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 28,
  },
  countryCard: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 2,
    paddingVertical: 28,
    alignItems: "center",
    gap: 8,
    position: "relative",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  countryCheckmark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  countryFlag: { fontSize: 52 },
  countryNameMain: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  countryNameSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  countryLangBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 4,
  },
  countryLangText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  langNoteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  langNote: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
  },

  // ── Steps 2 & 3 ───────────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  contextRow: { marginBottom: 22 },
  contextChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  contextFlag: { fontSize: 16 },
  contextChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  stepTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    marginBottom: 6,
    lineHeight: 34,
  },
  stepSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 28,
  },

  field: { marginBottom: 22 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 9,
  },
  optionalTag: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textTransform: "none",
    letterSpacing: 0,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  shortInput: { width: 120 },

  // Interests
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  interestTag: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  interestTagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13.5,
  },
  skipHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
});
