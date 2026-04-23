import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import FIcon from "@/components/FIcon";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { INTERESTS_I18N } from "@/utils/interests";
import { uploadPhotoToStorage } from "@/utils/photoUpload";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

const TOTAL_STEPS = 8;

// ── Language level labels ──────────────────────────────────────────────────────

type LangLevel = "beginner" | "elementary" | "intermediate" | "advanced" | "fluent";

const LANG_LEVELS: { value: LangLevel; labelKo: string; labelJa: string }[] = [
  { value: "beginner",     labelKo: "입문",  labelJa: "入門" },
  { value: "elementary",   labelKo: "초급",  labelJa: "初級" },
  { value: "intermediate", labelKo: "중급",  labelJa: "中級" },
  { value: "advanced",     labelKo: "고급",  labelJa: "高級" },
  { value: "fluent",       labelKo: "유창",  labelJa: "流暢" },
];

// ── PrimaryButton ──────────────────────────────────────────────────────────────

function PrimaryButton({
  label,
  onPress,
  disabled,
  sublabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  sublabel?: string;
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
        style={[btn.root, { backgroundColor: disabled ? colors.muted : colors.rose }]}
      >
        <Text style={[btn.text, { color: disabled ? colors.charcoalLight : "#fff" }]}>
          {label}
        </Text>
        {sublabel ? (
          <Text style={[btn.sub, { color: disabled ? colors.charcoalLight : "rgba(255,255,255,0.75)" }]}>
            {sublabel}
          </Text>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

const btn = StyleSheet.create({
  root: { borderRadius: 100, paddingVertical: 18, alignItems: "center", justifyContent: "center", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 5 },
  text: { fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: 0.1 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});

// ── Confetti particle ──────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#D85870","#F0A500","#1A7A4A","#3B6FD4","#8B4FD8","#E87C3C","#2BBFAA"];

function ConfettiParticle({ delay, startX }: { delay: number; startX: number }) {
  const y = useRef(new Animated.Value(-20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const size = 8 + Math.random() * 6;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 100, useNativeDriver: true }),
        Animated.timing(y, { toValue: 600, duration: 1800, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 4, duration: 1800, useNativeDriver: true }),
      ]),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: startX,
        top: 0,
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: color,
        opacity,
        transform: [
          { translateY: y },
          { rotate: rotate.interpolate({ inputRange: [0, 4], outputRange: ["0deg", "720deg"] }) },
        ],
      }}
    />
  );
}

// ── SelectionCard ──────────────────────────────────────────────────────────────

function SelectionCard({
  label,
  sublabel,
  selected,
  onPress,
  accentColor = "#D85870",
  icon,
  emoji,
}: {
  label: string;
  sublabel?: string;
  selected: boolean;
  onPress: () => void;
  accentColor?: string;
  icon?: string;
  emoji?: string;
}) {
  const colors = useColors();
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 6 }).start();

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[
          sc.card,
          {
            borderColor: selected ? accentColor : colors.border,
            backgroundColor: selected ? `${accentColor}12` : colors.white,
            shadowColor: selected ? accentColor : "#000",
            shadowOpacity: selected ? 0.14 : 0.04,
          },
        ]}
        activeOpacity={1}
      >
        {emoji ? <Text style={sc.emoji}>{emoji}</Text> : null}
        {icon && !emoji ? (
          <View style={[sc.iconWrap, { backgroundColor: selected ? accentColor : colors.muted }]}>
            <FIcon name={icon as any} size={18} color={selected ? "#fff" : colors.charcoalMid} />
          </View>
        ) : null}
        <View style={sc.textCol}>
          <Text style={[sc.label, { color: selected ? accentColor : colors.charcoal }]}>{label}</Text>
          {sublabel ? <Text style={[sc.sub, { color: colors.charcoalLight }]}>{sublabel}</Text> : null}
        </View>
        {selected && (
          <View style={[sc.check, { backgroundColor: accentColor }]}>
            <FIcon name="check" size={12} color="#fff" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const sc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 12,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 2,
  },
  emoji: { fontSize: 26 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1 },
  label: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  sub: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 2 },
  check: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
});

// ── ProfileSetupScreen ─────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, completeProfileSetup, token } = useApp();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Step state
  const [step, setStep] = useState(1);

  // Step transition — simple fade only (no slide) for reliable cross-platform behavior
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const goTo = (next: number) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => {
      setStep(next);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    });
  };

  const goBack = () => {
    if (step <= 1) return;
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: false }).start(() => {
      setStep(step - 1);
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    });
  };

  // ── Step 1: Name ───────────────────────────────────────────────────────────
  const [nickname, setNickname] = useState(profile.nickname ?? "");

  // ── Step 2: DOB ────────────────────────────────────────────────────────────
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");

  const currentYear = new Date().getFullYear();
  const parsedYear = parseInt(birthYear);
  const parsedMonth = parseInt(birthMonth);
  const parsedDay = parseInt(birthDay);

  const dobFilled = birthYear.length === 4 && birthMonth.length > 0 && birthDay.length > 0;
  const dobValid = (() => {
    if (!dobFilled) return false;
    if (parsedYear < 1900 || parsedYear > currentYear) return false;
    if (parsedMonth < 1 || parsedMonth > 12) return false;
    if (parsedDay < 1 || parsedDay > 31) return false;
    const age = currentYear - parsedYear - (new Date().getMonth() + 1 < parsedMonth || (new Date().getMonth() + 1 === parsedMonth && new Date().getDate() < parsedDay) ? 1 : 0);
    return age >= 19;
  })();

  const dobAge = dobFilled && parsedYear > 1900
    ? currentYear - parsedYear - (new Date().getMonth() + 1 < parsedMonth || (new Date().getMonth() + 1 === parsedMonth && new Date().getDate() < parsedDay) ? 1 : 0)
    : null;
  const dobTooYoung = dobFilled && dobAge !== null && dobAge < 19;

  // ── Step 3: Gender + Interested in ────────────────────────────────────────
  const [gender, setGender] = useState<"male" | "female" | "other" | null>(null);
  const [interestedIn, setInterestedIn] = useState<"male" | "female" | "any" | null>(null);

  // ── Step 4: Nationality ────────────────────────────────────────────────────
  const [nationality, setNationality] = useState<"KR" | "JP" | "other" | null>(
    profile.country === "KR" ? "KR" : profile.country === "JP" ? "JP" : null
  );

  // ── Step 5: Language levels ────────────────────────────────────────────────
  const [koLevel, setKoLevel] = useState<LangLevel>("beginner");
  const [jaLevel, setJaLevel] = useState<LangLevel>("beginner");

  // ── Step 6: Interests ─────────────────────────────────────────────────────
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const toggleInterest = (tag: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= 10) return prev;
      return [...prev, tag];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Step 2 DOB refs (must be at top level per React hooks rules) ──────────
  const monthRef = useRef<TextInput>(null);
  const dayRef = useRef<TextInput>(null);

  // ── Step 7: Photos ────────────────────────────────────────────────────────
  const [photos, setPhotos] = useState<(string | null)[]>([null, null, null, null, null, null]);
  const [photoUploading, setPhotoUploading] = useState<Record<number, boolean>>({});

  const photoCount = photos.filter(Boolean).length;

  const pickPhoto = async (slot: number) => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          lang === "ko" ? "권한 필요" : "許可が必要",
          lang === "ko" ? "사진 접근 권한이 필요합니다." : "写真へのアクセス許可が必要です。"
        );
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setPhotos((prev) => { const n = [...prev]; n[slot] = uri; return n; });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (token) {
        setPhotoUploading((prev) => ({ ...prev, [slot]: true }));
        uploadPhotoToStorage(uri, token)
          .then((url) => setPhotos((prev) => { const n = [...prev]; n[slot] = url; return n; }))
          .catch(() => {})
          .finally(() => setPhotoUploading((prev) => ({ ...prev, [slot]: false })));
      }
    }
  };

  const removePhoto = (slot: number) => {
    setPhotos((prev) => { const n = [...prev]; n[slot] = null; return n; });
  };

  // ── Finish ─────────────────────────────────────────────────────────────────
  const handleFinish = () => {
    const allPhotos = photos.filter(Boolean) as string[];
    const computedAge = dobAge ?? profile.age ?? 25;
    const updates = {
      nickname: nickname.trim() || profile.nickname || "User",
      age: computedAge >= 19 && computedAge <= 99 ? computedAge : profile.age ?? 25,
      gender: gender ?? undefined,
      country: nationality === "KR" ? "KR" as const : nationality === "JP" ? "JP" as const : profile.country,
      language: lang,
      languageLevel: koLevel,
      interests: selectedInterests,
      photos: allPhotos.length > 0 ? allPhotos : profile.photos,
    };
    updateProfile(updates);

    if (token) {
      fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nickname: updates.nickname,
          age: updates.age,
          interests: updates.interests,
          languageLevel: updates.languageLevel,
        }),
      }).catch(() => {});
    }

    completeProfileSetup();
  };

  // ── Shared header ──────────────────────────────────────────────────────────
  const Header = ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <View>
      <View style={[sh.header, { paddingTop: topPad + 14 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {step > 1 && (
            <TouchableOpacity onPress={goBack} style={sh.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <FIcon name="chevron-left" size={20} color={colors.charcoalMid} />
            </TouchableOpacity>
          )}
          <Text style={[sh.logo, { color: colors.charcoal }]}>lito</Text>
        </View>
        <View style={sh.stepBadge}>
          <Text style={[sh.stepNum, { color: colors.rose }]}>{step + 4}</Text>
          <Text style={[sh.stepOf, { color: colors.charcoalLight }]}>/12</Text>
        </View>
      </View>
      <View style={[sh.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View style={[sh.progressFill, { width: `${((step + 4) / 12) * 100}%` as any, backgroundColor: colors.rose }]} />
      </View>
      <View style={sh.titleBlock}>
        <Text style={[sh.title, { color: colors.charcoal }]}>{title}</Text>
        {subtitle ? <Text style={[sh.subtitle, { color: colors.charcoalLight }]}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const stepAnim = { opacity: fadeAnim };

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Name
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    const nameReady = nickname.trim().length >= 2;
    return (
      <KeyboardAvoidingView style={[s.container, { backgroundColor: colors.white }]} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Header
          title={lang === "ko" ? "안녕하세요!\n이름을 알려주세요" : "はじめまして！\nお名前を教えてください"}
          subtitle={lang === "ko" ? "프로필 카드에 표시될 이름이에요." : "プロフィールカードに表示される名前です。"}
        />
        <KeyboardAwareScrollViewCompat contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <Animated.View style={stepAnim}>
            {/* Live preview card */}
            {nickname.trim().length > 0 && (
              <View style={[nameStyle.previewCard, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
                <View style={[nameStyle.previewAvatar, { backgroundColor: colors.rose }]}>
                  <Text style={nameStyle.previewInitial}>{nickname.trim().charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                  <Text style={[nameStyle.previewHello, { color: colors.charcoalLight }]}>
                    {lang === "ko" ? "안녕하세요," : "はじめまして、"}
                  </Text>
                  <Text style={[nameStyle.previewName, { color: colors.rose }]}>{nickname.trim()}</Text>
                </View>
              </View>
            )}

            <TextInput
              style={[s.bigInput, { backgroundColor: colors.muted, borderColor: nameReady ? colors.rose : colors.border, color: colors.charcoal }]}
              value={nickname}
              onChangeText={setNickname}
              placeholder={lang === "ko" ? "예: 민준, Haruka..." : "例: 大輝, 지수..."}
              placeholderTextColor={colors.charcoalFaint}
              returnKeyType="done"
              autoFocus
              maxLength={20}
              autoCorrect={false}
              autoCapitalize="words"
            />
            {nickname.length > 0 && nickname.trim().length < 2 && (
              <Text style={[s.hint, { color: colors.rose }]}>
                {lang === "ko" ? "2자 이상 입력해주세요" : "2文字以上入力してください"}
              </Text>
            )}
            <Text style={[s.charCount, { color: colors.charcoalFaint }]}>{nickname.length}/20</Text>
          </Animated.View>
        </KeyboardAwareScrollViewCompat>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton label={lang === "ko" ? "다음 →" : "次へ →"} onPress={() => goTo(2)} disabled={!nameReady} />
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Date of Birth
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "생년월일을 입력해주세요" : "生年月日を入力してください"}
          subtitle={lang === "ko" ? "나이는 프로필에서 자동으로 계산돼요. 19세 이상만 사용 가능해요." : "年齢はプロフィールで自動計算されます。19歳以上が対象です。"}
        />
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <Animated.View style={stepAnim}>
          <View style={dobStyle.row}>
            <View style={dobStyle.fieldWrap}>
              <Text style={[dobStyle.label, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "년도" : "年"}
              </Text>
              <TextInput
                style={[dobStyle.input, { backgroundColor: colors.muted, borderColor: birthYear.length > 0 ? colors.rose : colors.border, color: colors.charcoal }]}
                value={birthYear}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, "").slice(0, 4);
                  setBirthYear(clean);
                  if (clean.length === 4) monthRef.current?.focus();
                }}
                placeholder="1998"
                placeholderTextColor={colors.charcoalFaint}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="next"
              />
            </View>
            <View style={dobStyle.fieldWrap}>
              <Text style={[dobStyle.label, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "월" : "月"}
              </Text>
              <TextInput
                ref={monthRef}
                style={[dobStyle.input, dobStyle.inputSm, { backgroundColor: colors.muted, borderColor: birthMonth.length > 0 ? colors.rose : colors.border, color: colors.charcoal }]}
                value={birthMonth}
                onChangeText={(v) => {
                  const clean = v.replace(/\D/g, "").slice(0, 2);
                  setBirthMonth(clean);
                  if (clean.length === 2) dayRef.current?.focus();
                }}
                placeholder="03"
                placeholderTextColor={colors.charcoalFaint}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="next"
              />
            </View>
            <View style={dobStyle.fieldWrap}>
              <Text style={[dobStyle.label, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "일" : "日"}
              </Text>
              <TextInput
                ref={dayRef}
                style={[dobStyle.input, dobStyle.inputSm, { backgroundColor: colors.muted, borderColor: birthDay.length > 0 ? colors.rose : colors.border, color: colors.charcoal }]}
                value={birthDay}
                onChangeText={(v) => setBirthDay(v.replace(/\D/g, "").slice(0, 2))}
                placeholder="15"
                placeholderTextColor={colors.charcoalFaint}
                keyboardType="number-pad"
                maxLength={2}
                returnKeyType="done"
              />
            </View>
          </View>

          {dobAge !== null && !dobTooYoung && (
            <View style={[dobStyle.agePill, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
              <FIcon name="check-circle" size={16} color={colors.rose} />
              <Text style={[dobStyle.ageText, { color: colors.rose }]}>
                {lang === "ko" ? `${dobAge}세` : `${dobAge}歳`}
              </Text>
            </View>
          )}
          {dobTooYoung && (
            <View style={[dobStyle.agePill, { backgroundColor: "#FFEDED", borderColor: "#FFBBBB" }]}>
              <FIcon name="alert-circle" size={16} color="#D85870" />
              <Text style={[dobStyle.ageText, { color: "#D85870" }]}>
                {lang === "ko" ? "19세 미만은 이용할 수 없어요" : "19歳未満はご利用いただけません"}
              </Text>
            </View>
          )}
        </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton label={lang === "ko" ? "다음 →" : "次へ →"} onPress={() => goTo(3)} disabled={!dobValid} />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Gender + Interested in
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 3) {
    const step3Ready = gender !== null && interestedIn !== null;
    const genderOptions: { value: "male" | "female" | "other"; labelKo: string; labelJa: string; emoji: string }[] = [
      { value: "male",   labelKo: "남성", labelJa: "男性",  emoji: "👨" },
      { value: "female", labelKo: "여성", labelJa: "女性",  emoji: "👩" },
      { value: "other",  labelKo: "기타", labelJa: "その他", emoji: "🧑" },
    ];
    const interestOptions: { value: "male" | "female" | "any"; labelKo: string; labelJa: string; emoji: string }[] = [
      { value: "male",   labelKo: "남성",    labelJa: "男性",    emoji: "👨" },
      { value: "female", labelKo: "여성",    labelJa: "女性",    emoji: "👩" },
      { value: "any",    labelKo: "상관없음", labelJa: "どちらでも", emoji: "💛" },
    ];
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "성별을 선택해주세요" : "性別を選択してください"}
          subtitle={lang === "ko" ? "매칭 알고리즘에서 사용됩니다." : "マッチングアルゴリズムで使用されます。"}
        />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={stepAnim}>
            <Text style={[s.sectionLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "나의 성별" : "自分の性別"}
            </Text>
            <View style={s.optionRow}>
              {genderOptions.map((g) => (
                <View key={g.value} style={{ flex: 1 }}>
                  <SelectionCard
                    label={lang === "ko" ? g.labelKo : g.labelJa}
                    selected={gender === g.value}
                    onPress={() => setGender(g.value)}
                    emoji={g.emoji}
                  />
                </View>
              ))}
            </View>

            <Text style={[s.sectionLabel, { color: colors.charcoalMid, marginTop: 28 }]}>
              {lang === "ko" ? "관심 있는 상대" : "興味のある相手"}
            </Text>
            <View style={s.optionRow}>
              {interestOptions.map((o) => (
                <View key={o.value} style={{ flex: 1 }}>
                  <SelectionCard
                    label={lang === "ko" ? o.labelKo : o.labelJa}
                    selected={interestedIn === o.value}
                    onPress={() => setInterestedIn(o.value)}
                    emoji={o.emoji}
                  />
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton label={lang === "ko" ? "다음 →" : "次へ →"} onPress={() => goTo(4)} disabled={!step3Ready} />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Nationality
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 4) {
    const natOptions: { value: "KR" | "JP" | "other"; labelKo: string; labelJa: string; emoji: string; subKo: string; subJa: string }[] = [
      { value: "KR",    labelKo: "한국",   labelJa: "韓国",   emoji: "🇰🇷", subKo: "Korean",   subJa: "韓国人" },
      { value: "JP",    labelKo: "일본",   labelJa: "日本",   emoji: "🇯🇵", subKo: "Japanese", subJa: "日本人" },
      { value: "other", labelKo: "기타 국적", labelJa: "その他", emoji: "🌏", subKo: "Other",    subJa: "その他" },
    ];
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "국적을 선택해주세요" : "国籍を選択してください"}
          subtitle={lang === "ko" ? "상대 프로필에서 볼 수 있어요." : "相手のプロフィールに表示されます。"}
        />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={[stepAnim, { gap: 12 }]}>
            {natOptions.map((n) => (
              <SelectionCard
                key={n.value}
                label={lang === "ko" ? n.labelKo : n.labelJa}
                sublabel={lang === "ko" ? n.subKo : n.subJa}
                selected={nationality === n.value}
                onPress={() => setNationality(n.value)}
                emoji={n.emoji}
              />
            ))}
          </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton label={lang === "ko" ? "다음 →" : "次へ →"} onPress={() => goTo(5)} disabled={nationality === null} />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 5 — Language Level
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 5) {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "언어 실력을 알려주세요" : "言語スキルを教えてください"}
          subtitle={lang === "ko" ? "비슷한 레벨의 상대를 더 잘 연결해드려요." : "同レベルの相手とより繋がりやすくなります。"}
        />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={stepAnim}>
            {/* Korean level */}
            <Text style={[s.sectionLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "KR 한국어" : "KR 韓国語"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={llStyle.levelRow}>
              {LANG_LEVELS.map((lv) => {
                const sel = koLevel === lv.value;
                return (
                  <TouchableOpacity
                    key={lv.value}
                    onPress={() => { setKoLevel(lv.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[llStyle.chip, { borderColor: sel ? "#D85870" : colors.border, backgroundColor: sel ? "#D85870" : colors.white }]}
                  >
                    <Text style={[llStyle.chipText, { color: sel ? "#fff" : colors.charcoalMid }]}>
                      {lang === "ko" ? lv.labelKo : lv.labelJa}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Japanese level */}
            <Text style={[s.sectionLabel, { color: colors.charcoalMid, marginTop: 28 }]}>
              {lang === "ko" ? "JP 日本語" : "JP 日本語"}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={llStyle.levelRow}>
              {LANG_LEVELS.map((lv) => {
                const sel = jaLevel === lv.value;
                return (
                  <TouchableOpacity
                    key={lv.value}
                    onPress={() => { setJaLevel(lv.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[llStyle.chip, { borderColor: sel ? "#3B6FD4" : colors.border, backgroundColor: sel ? "#3B6FD4" : colors.white }]}
                  >
                    <Text style={[llStyle.chipText, { color: sel ? "#fff" : colors.charcoalMid }]}>
                      {lang === "ko" ? lv.labelKo : lv.labelJa}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: 28 }]}>
              <Text style={[s.tipText, { color: colors.charcoalMid }]}>
                {lang === "ko"
                  ? "정확한 레벨을 선택하면 더 잘 맞는 상대를 만날 수 있어요."
                  : "正確なレベルを選ぶと、より相性の良い相手と出会えます。"}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton label={lang === "ko" ? "다음 →" : "次へ →"} onPress={() => goTo(6)} />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 6 — Interests
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 6) {
    const interestReady = selectedInterests.length >= 3;
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "관심사를 골라주세요" : "興味・趣味を選んでください"}
          subtitle={lang === "ko" ? "3개 이상 선택하면 더 잘 맞는 상대를 찾아드려요." : "3つ以上選ぶと、より相性の良い相手が見つかります。"}
        />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={stepAnim}>
            <View style={intStyle.tagWrap}>
              {INTERESTS_I18N.map((item) => {
                const stored = item.ko;
                const sel = selectedInterests.includes(stored);
                return (
                  <TouchableOpacity
                    key={stored}
                    onPress={() => toggleInterest(stored)}
                    style={[
                      intStyle.tag,
                      {
                        borderColor: sel ? "#D85870" : colors.border,
                        backgroundColor: sel ? "#D85870" : colors.white,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[intStyle.tagText, { color: sel ? "#fff" : colors.charcoalMid }]}>
                      {lang === "ko" ? item.ko : item.ja}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton
            label={interestReady ? (lang === "ko" ? "다음 →" : "次へ →") : (lang === "ko" ? `다음 (${selectedInterests.length}개 선택됨)` : `次へ (${selectedInterests.length}個選択)`)}
            onPress={() => goTo(7)}
            disabled={!interestReady}
          />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 7 — Photos
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 7) {
    const photoReady = photoCount >= 2;
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header
          title={lang === "ko" ? "사진을 추가해주세요" : "写真を追加してください"}
          subtitle={lang === "ko" ? "사진이 있으면 매칭률이 3배 높아져요. 최소 2장 필요해요." : "写真があるとマッチ率が3倍に。最低2枚必要です。"}
        />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]} showsVerticalScrollIndicator={false}>
          <Animated.View style={stepAnim}>
            {/* Upload counter pill */}
            <View style={[photoStyle.countPill, { backgroundColor: photoCount >= 2 ? "#E8F8EE" : colors.roseLight, borderColor: photoCount >= 2 ? "#A9DFC2" : colors.roseSoft }]}>
              <FIcon name={photoCount >= 2 ? "check-circle" : "camera"} size={15} color={photoCount >= 2 ? "#1A7A4A" : colors.rose} />
              <Text style={[photoStyle.countText, { color: photoCount >= 2 ? "#1A7A4A" : colors.rose }]}>
                {lang === "ko" ? `${photoCount}/6장 업로드됨` : `${photoCount}/6枚アップロード済み`}
              </Text>
            </View>

            {/* 2-column grid */}
            <View style={photoStyle.grid}>
              {photos.map((uri, idx) => (
                <View key={idx} style={photoStyle.cell}>
                  {uri ? (
                    <View style={{ position: "relative" }}>
                      <Image source={{ uri }} style={photoStyle.img} contentFit="cover" />
                      {photoUploading[idx] && (
                        <View style={photoStyle.uploadOverlay}>
                          <ActivityIndicator color="#fff" size="small" />
                        </View>
                      )}
                      {idx === 0 && (
                        <View style={[photoStyle.mainBadge, { backgroundColor: colors.rose }]}>
                          <Text style={photoStyle.mainBadgeText}>{lang === "ko" ? "대표" : "メイン"}</Text>
                        </View>
                      )}
                      <TouchableOpacity style={photoStyle.removeBtn} onPress={() => removePhoto(idx)}>
                        <FIcon name="x" size={12} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[photoStyle.addCell, { borderColor: colors.border, backgroundColor: colors.muted }]}
                      onPress={() => pickPhoto(idx)}
                      activeOpacity={0.7}
                    >
                      <FIcon name="plus" size={26} color={colors.charcoalFaint} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>

            <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[s.tipText, { color: colors.charcoalMid }]}>
                {lang === "ko"
                  ? "밝고 선명한 사진을 사용하면 매칭 성공률이 높아요."
                  : "明るくクリアな写真を使うと、マッチ率が上がります。"}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton
            label={photoReady ? (lang === "ko" ? "다음 →" : "次へ →") : (lang === "ko" ? "사진을 2장 더 추가해주세요" : "写真を2枚以上追加してください")}
            onPress={() => goTo(8)}
            disabled={!photoReady}
          />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 8 — Done!
  // ══════════════════════════════════════════════════════════════════════════
  const confettiParticles = Array.from({ length: 24 }, (_, i) => ({
    delay: i * 60,
    startX: (Math.random() * 280) + 20,
  }));

  return (
    <View style={[s.container, { backgroundColor: colors.white }]}>
      {/* Confetti layer */}
      <View style={doneStyle.confettiLayer} pointerEvents="none">
        {confettiParticles.map((p, i) => (
          <ConfettiParticle key={i} delay={p.delay} startX={p.startX} />
        ))}
      </View>

      <View style={[doneStyle.content, { paddingTop: topPad + 32, paddingBottom: bottomPad + 32 }]}>
        <View style={doneStyle.topSection}>
          <Text style={doneStyle.heroEmoji}>🎉</Text>
          <Text style={[doneStyle.heroTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "프로필 완성!" : "プロフィール完成！"}
          </Text>
          <Text style={[doneStyle.heroSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "이제 마음에 드는 상대를 만날 준비가 됐어요.\n먼저 발견 탭에서 상대들을 찾아보세요!"
              : "いよいよ素敵な相手に会う準備ができました。\nまず発見タブから相手を探してみましょう！"}
          </Text>

          {/* Stats cards */}
          <View style={doneStyle.statsRow}>
            <View style={[doneStyle.statCard, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
              <Text style={[doneStyle.statNum, { color: colors.rose }]}>1,200+</Text>
              <Text style={[doneStyle.statLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "활성 멤버" : "アクティブ会員"}
              </Text>
            </View>
            <View style={[doneStyle.statCard, { backgroundColor: "#EEF4FF", borderColor: "#C5D9FF" }]}>
              <Text style={[doneStyle.statNum, { color: "#3B6FD4" }]}>98%</Text>
              <Text style={[doneStyle.statLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "응답률" : "返信率"}
              </Text>
            </View>
            <View style={[doneStyle.statCard, { backgroundColor: "#EFFAF4", borderColor: "#A9DFC2" }]}>
              <Text style={[doneStyle.statNum, { color: "#1A7A4A" }]}>4.8★</Text>
              <Text style={[doneStyle.statLabel, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "사용자 만족도" : "満足度"}
              </Text>
            </View>
          </View>
        </View>

        <View style={doneStyle.ctaSection}>
          <PrimaryButton
            label={lang === "ko" ? "발견 시작하기 →" : "発見を始める →"}
            onPress={handleFinish}
          />
          <Text style={[doneStyle.footNote, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "프로필은 언제든지 편집할 수 있어요"
              : "プロフィールはいつでも編集できます"}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const sh = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 4, marginRight: 2 },
  logo: { fontFamily: "Inter_700Bold", fontSize: 20, letterSpacing: -0.6 },
  stepBadge: { flexDirection: "row", alignItems: "baseline" },
  stepNum: { fontFamily: "Inter_700Bold", fontSize: 16 },
  stepOf: { fontFamily: "Inter_400Regular", fontSize: 14 },
  progressTrack: { height: 3, marginHorizontal: 20, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, borderRadius: 2 },
  titleBlock: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 10 },
  title: { fontFamily: "Inter_700Bold", fontSize: 26, lineHeight: 34 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21, marginTop: 6, opacity: 0.8 },
});

const s = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 16, flexGrow: 1 },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bigInput: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    borderRadius: 18,
    borderWidth: 2,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 8,
    marginTop: 20,
  },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 4 },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "right" },
  sectionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 12 },
  optionRow: { flexDirection: "row", gap: 10 },
  tipCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginTop: 8 },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13.5, lineHeight: 20 },
});

// ── Step-specific styles ───────────────────────────────────────────────────────

const nameStyle = StyleSheet.create({
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 8,
    marginTop: 4,
  },
  previewAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  previewInitial: { fontFamily: "Inter_700Bold", fontSize: 22, color: "#fff" },
  previewHello: { fontFamily: "Inter_400Regular", fontSize: 12 },
  previewName: { fontFamily: "Inter_700Bold", fontSize: 20 },
});

const dobStyle = StyleSheet.create({
  row: { flexDirection: "row", gap: 12, marginTop: 20 },
  fieldWrap: { flex: 1 },
  label: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 6 },
  input: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 16,
    textAlign: "center",
  },
  inputSm: { flex: 1 },
  agePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginTop: 16,
  },
  ageText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});

const llStyle = StyleSheet.create({
  levelRow: { gap: 10, paddingRight: 20 },
  chip: {
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});

const intStyle = StyleSheet.create({
  section: { marginBottom: 24 },
  catLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  tagWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});

const photoStyle = StyleSheet.create({
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 50,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  countText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cell: {
    width: "47%",
    aspectRatio: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%", borderRadius: 16 },
  addCell: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadOverlay: {
    position: "absolute",
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  mainBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
  },
  mainBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11, color: "#fff" },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});

const doneStyle = StyleSheet.create({
  confettiLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
    overflow: "hidden",
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    zIndex: 1,
  },
  topSection: { alignItems: "center" },
  heroEmoji: { fontSize: 72, marginBottom: 16 },
  heroTitle: { fontFamily: "Inter_700Bold", fontSize: 32, textAlign: "center", marginBottom: 12 },
  heroSub: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 23, marginBottom: 32 },
  statsRow: { flexDirection: "row", gap: 10, width: "100%" },
  statCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 14,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  ctaSection: { gap: 12 },
  footNote: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
});
