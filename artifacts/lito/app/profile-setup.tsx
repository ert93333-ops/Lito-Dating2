import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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

const INTERESTS = [
  "K-Pop", "K-Drama", "Anime", "Travel", "Cooking",
  "Coffee", "Photography", "Music", "Books", "Fitness",
  "Gaming", "Nature", "Movies", "Fashion", "Design",
  "Language Exchange", "Food Tour", "Hiking", "Art", "Tech",
];

const L = {
  ko: {
    title: "프로필 설정",
    countryPrompt: "어느 나라에서 오셨나요?",
    countryHint: "국가를 먼저 선택해주세요 — 번역 방향이 결정됩니다",
    korea: "🇰🇷 한국",
    japan: "🇯🇵 일본",
    nickname: "닉네임",
    nicknamePh: "닉네임을 입력하세요",
    age: "나이",
    agePh: "나이",
    intro: "한 줄 소개",
    introPh: "자신을 한 문장으로 소개해보세요",
    bio: "자기 소개",
    bioPh: "자신에 대해 이야기해보세요 (한국어 또는 일본어 환영!)",
    interests: "관심사",
    interestHint: "좋아하는 것을 선택하세요 (최대 8개)",
    instagram: "인스타그램 (선택 사항)",
    instagramPh: "@아이디",
    cta: "시작하기 →",
  },
  ja: {
    title: "プロフィール設定",
    countryPrompt: "どちらの国から来ましたか？",
    countryHint: "まず国籍を選択してください — 翻訳の方向が決まります",
    korea: "🇰🇷 韓国",
    japan: "🇯🇵 日本",
    nickname: "ニックネーム",
    nicknamePh: "ニックネームを入力してください",
    age: "年齢",
    agePh: "年齢",
    intro: "一言紹介",
    introPh: "一文で自己紹介してください",
    bio: "自己紹介",
    bioPh: "自分について話してください（韓国語・日本語歓迎！）",
    interests: "趣味・興味",
    interestHint: "好きなものを選んでください（最大8つ）",
    instagram: "Instagram（任意）",
    instagramPh: "@ハンドル",
    cta: "始める →",
  },
};

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile, completeProfileSetup } = useApp();

  const [country, setCountry] = useState<"KR" | "JP" | null>(null);
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [intro, setIntro] = useState("");
  const [bio, setBio] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [instagram, setInstagram] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const lang: "ko" | "ja" = country === "KR" ? "ko" : "ja";
  const s = L[lang];

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 8) return prev;
      return [...prev, tag];
    });
  };

  const handleSave = () => {
    updateProfile({
      nickname: nickname.trim() || "User",
      age: parseInt(age) || 25,
      country: country ?? "JP",
      language: lang,
      intro: intro.trim() || undefined,
      bio: bio.trim() || "",
      interests: selectedInterests.length > 0 ? selectedInterests : undefined,
      instagramHandle: instagram.trim() || undefined,
    });
    completeProfileSetup();
    // RootNavigator in _layout.tsx handles the redirect to /(tabs)/discover
  };

  const canSave = !!country && nickname.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.white }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 20 }]}>
        <Text style={[styles.logo, { color: colors.rose }]}>lito</Text>
        <Text style={[styles.headerTitle, { color: colors.charcoal }]}>
          {s.title}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Country selection — prominent, required ─────────────────── */}
        <View style={styles.countrySection}>
          <Text style={[styles.countryPrompt, { color: colors.charcoal }]}>
            {"어느 나라에서 오셨나요?\nどちらの国から来ましたか？"}
          </Text>
          <Text style={[styles.countryHint, { color: colors.charcoalLight }]}>
            {"국가를 먼저 선택해주세요 · まず国籍を選択してください"}
          </Text>
          <View style={styles.countryRow}>
            {(["KR", "JP"] as const).map((c) => {
              const isSelected = country === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.countryBtn,
                    {
                      backgroundColor: isSelected ? colors.rose : colors.roseLight,
                      borderColor: isSelected ? colors.rose : colors.roseSoft,
                    },
                  ]}
                  onPress={() => setCountry(c)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.countryFlag}>{c === "KR" ? "🇰🇷" : "🇯🇵"}</Text>
                  <Text
                    style={[
                      styles.countryLabel,
                      { color: isSelected ? colors.white : colors.charcoal },
                    ]}
                  >
                    {c === "KR" ? "한국 / 韓国" : "일본 / 日本"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Rest of form — only shown after country is selected ────── */}
        {country && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Nickname */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.nickname}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
                value={nickname}
                onChangeText={setNickname}
                placeholder={s.nicknamePh}
                placeholderTextColor={colors.charcoalLight}
                returnKeyType="next"
              />
            </View>

            {/* Age */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.age}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal, width: 120 }]}
                value={age}
                onChangeText={setAge}
                placeholder={s.agePh}
                placeholderTextColor={colors.charcoalLight}
                keyboardType="numeric"
                returnKeyType="next"
              />
            </View>

            {/* Short intro */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.intro}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
                value={intro}
                onChangeText={setIntro}
                placeholder={s.introPh}
                placeholderTextColor={colors.charcoalLight}
                maxLength={80}
                returnKeyType="next"
              />
            </View>

            {/* Bio */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.bio}</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.bioInput,
                  { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal },
                ]}
                value={bio}
                onChangeText={setBio}
                placeholder={s.bioPh}
                placeholderTextColor={colors.charcoalLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Interests */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.interests}</Text>
              <Text style={[styles.interestHint, { color: colors.charcoalLight }]}>{s.interestHint}</Text>
              <View style={styles.tagsGrid}>
                {INTERESTS.map((tag) => {
                  const picked = selectedInterests.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[
                        styles.tag,
                        {
                          backgroundColor: picked ? colors.rose : colors.muted,
                          borderColor: picked ? colors.rose : colors.border,
                        },
                      ]}
                      onPress={() => toggleInterest(tag)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tagText, { color: picked ? colors.white : colors.charcoalMid }]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Instagram */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: colors.charcoalMid }]}>{s.instagram}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.charcoal }]}
                value={instagram}
                onChangeText={setInstagram}
                placeholder={s.instagramPh}
                placeholderTextColor={colors.charcoalLight}
                autoCapitalize="none"
                returnKeyType="done"
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* ── Footer CTA ───────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: bottomPad + 12, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.ctaBtn,
            { backgroundColor: canSave ? colors.rose : colors.muted },
          ]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <Text style={[styles.ctaText, { color: canSave ? colors.white : colors.charcoalLight }]}>
            {country ? s.cta : (lang === "ko" ? "국가를 먼저 선택해주세요" : "まず国籍を選択してください")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 28,
    paddingBottom: 20,
    alignItems: "flex-start",
  },
  logo: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    letterSpacing: -1,
    marginBottom: 6,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
  },
  scroll: { paddingHorizontal: 24 },

  countrySection: { marginBottom: 4 },
  countryPrompt: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 6,
  },
  countryHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 18,
  },
  countryRow: { flexDirection: "row", gap: 14 },
  countryBtn: {
    flex: 1,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    gap: 8,
  },
  countryFlag: { fontSize: 40 },
  countryLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },

  divider: { height: 1, marginVertical: 28 },

  field: { marginBottom: 22 },
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 8,
  },
  input: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  bioInput: {
    minHeight: 110,
    paddingTop: 14,
  },
  interestHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 12,
  },
  tagsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: 1,
    backgroundColor: "transparent",
  },
  ctaBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
