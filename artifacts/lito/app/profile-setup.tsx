import { API_BASE } from "@/config";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
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
import { uploadPhotoToStorage, UploadError } from "@/utils/photoUpload";

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

// ── ProfileSetupScreen — 3-step wizard ───────────────────────────────────────
// Step 1: Photos  •  Step 2: Identity  •  Step 3: Interests

const TOTAL_STEPS = 3;

export default function ProfileSetupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, completeProfileSetup, token } = useApp();
  const { t, lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Wizard state — 3 steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1 — Photos
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<(string | null)[]>([null, null, null]);
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoFailed, setPhotoFailed] = useState<Record<string, boolean>>({});

  // Step 2 — Identity
  const [nickname, setNickname] = useState("");
  const [age, setAge] = useState("");
  const [intro, setIntro] = useState("");

  // Step 3 — Interests
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);

  const parsedAge = parseInt(age);
  const ageValid = age === "" || (parsedAge >= 18 && parsedAge <= 99);
  const step2CanContinue = nickname.trim().length >= 2 && (age === "" || ageValid);

  // ── Photo picker ──────────────────────────────────────────────────────────
  const pickPhoto = async (slot: "main" | number) => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          lang === "ko" ? "권한 필요" : "許可が必要",
          lang === "ko"
            ? "사진 접근 권한이 필요합니다. 설정에서 허용해주세요."
            : "写真へのアクセス許可が必要です。設定で許可してください。"
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: slot === "main" ? [4, 5] : [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const slotKey = String(slot);

      // 먼저 로컬 URI로 즉시 미리보기 표시
      if (slot === "main") {
        setMainPhoto(uri);
      } else {
        setExtraPhotos((prev) => {
          const next = [...prev];
          next[slot as number] = uri;
          return next;
        });
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 토큰이 있을 때 GCS에 백그라운드 업로드
      if (token) {
        setPhotoUploading((prev) => ({ ...prev, [slotKey]: true }));
        uploadPhotoToStorage(uri, token)
          .then((servingUrl) => {
            if (slot === "main") {
              setMainPhoto(servingUrl);
            } else {
              setExtraPhotos((prev) => {
                const next = [...prev];
                next[slot as number] = servingUrl;
                return next;
              });
            }
          })
          .catch((err) => {
            console.warn("[profile-setup] 사진 업로드 실패, 로컬 URI 유지:", err);
            setPhotoFailed((prev) => ({ ...prev, [slotKey]: true }));
            if (err instanceof UploadError && !err.retryable) {
              Alert.alert(
                lang === "ko" ? "업로드 실패" : "アップロード失敗",
                err.message
              );
            }
          })
          .finally(() => {
            setPhotoUploading((prev) => ({ ...prev, [slotKey]: false }));
          });
      }
    }
  };

  const removePhoto = (slot: "main" | number) => {
    if (slot === "main") {
      setMainPhoto(null);
    } else {
      setExtraPhotos((prev) => {
        const next = [...prev];
        next[slot as number] = null;
        return next;
      });
    }
  };

  const handleStep2Continue = () => {
    if (!step2CanContinue) return;
    if (age !== "" && !ageValid) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
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
    const allPhotos = [mainPhoto, ...extraPhotos].filter(Boolean) as string[];
    const updates = {
      nickname: nickname.trim() || profile.nickname || "User",
      age: parsedAge >= 18 && parsedAge <= 99 ? parsedAge : profile.age ?? 25,
      country: profile.country,
      language: lang,
      intro: trimmedIntro || "",
      bio: trimmedIntro || "",
      introI18n: {},
      instagramHandle: "",
      aiStyleSummary: undefined,
      interests: selectedInterests.length > 0 ? selectedInterests : [],
      photos: allPhotos.length > 0 ? allPhotos : profile.photos,
    };
    updateProfile(updates);

    if (token) {
      const apiBase = API_BASE;
      fetch(`${apiBase}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nickname: updates.nickname,
          age: updates.age,
          bio: updates.bio,
          intro: updates.intro,
          interests: updates.interests,
          photos: updates.photos,
          languageLevel: profile.languageLevel ?? "beginner",
        }),
      }).catch(() => {});
    }

    completeProfileSetup();
  };

  // ── Shared header ─────────────────────────────────────────────────────────

  const Header = () => (
    <View style={[shared.header, { paddingTop: topPad + 14 }]}>
      <View style={shared.logoRow}>
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
  const CountryPill = () => {
    const isKR = profile.country === "KR";
    return (
      <View style={[shared.countryPill, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
        {/* View-based mini flag — Android-safe, no emoji dependency */}
        <View style={{
          width: 18, height: 18, borderRadius: 9, overflow: "hidden",
          borderWidth: 0.5, borderColor: "#D0C8CA",
        }}>
          {isKR ? (
            <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
              <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 9, backgroundColor: "#C60C30" }} />
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 9, backgroundColor: "#003478" }} />
              <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#FFFFFF" }} />
            </View>
          ) : (
            <View style={{ width: 18, height: 18, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#BC002D" }} />
            </View>
          )}
        </View>
        <Text style={[shared.countryLabel, { color: colors.rose }]}>
          {isKR ? "한국 · Korean" : "日本 · Japanese"}
        </Text>
      </View>
    );
  };

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Photos
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 1) {
    const EXTRA_SLOT_SIZE = 90;
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header />
        <ProgressBar />
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 120 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.pillRow}>
            <CountryPill />
          </View>
          <Text style={[s.heroTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "프로필 사진" : "プロフィール写真"}
          </Text>
          <Text style={[s.heroSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "얼굴이 잘 보이는 사진 1장이 필수예요\n추가 사진은 매력을 더 보여줄 수 있어요"
              : "顔がよく見える写真が1枚必須です\n追加写真で魅力をもっとアピールできます"}
          </Text>

          {/* Required badge row */}
          <View style={s.photoRequiredRow}>
            <View style={[s.photoBadge, { backgroundColor: colors.roseLight }]}>
              <Text style={[s.photoBadgeText, { color: colors.rose }]}>
                {lang === "ko" ? "필수" : "必須"}
              </Text>
            </View>
            <Text style={[s.photoRequiredLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "대표 사진" : "メイン写真"}
            </Text>
          </View>

          {/* Main photo slot */}
          <TouchableOpacity
            style={[
              s.mainPhotoSlot,
              {
                backgroundColor: mainPhoto ? "transparent" : colors.muted,
                borderColor: mainPhoto ? colors.rose : colors.border,
                borderStyle: mainPhoto ? "solid" : "dashed",
              },
            ]}
            onPress={() => pickPhoto("main")}
            activeOpacity={0.78}
          >
            {mainPhoto ? (
              <>
                <Image
                  source={{ uri: mainPhoto }}
                  style={s.mainPhotoImage}
                  contentFit="cover"
                />
                {photoUploading["main"] && (
                  <View style={[s.uploadOverlay, { backgroundColor: "rgba(0,0,0,0.4)" }]}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
                {photoFailed["main"] && !photoUploading["main"] && (
                  <TouchableOpacity
                    style={[s.uploadOverlay, { backgroundColor: "rgba(220,50,50,0.7)" }]}
                    onPress={() => {
                      setPhotoFailed((prev) => ({ ...prev, main: false }));
                      pickPhoto("main");
                    }}
                    activeOpacity={0.8}
                  >
                    <FIcon name="refresh-cw" size={20} color="#fff" />
                    <Text style={{ color: "#fff", fontFamily: "Inter_500Medium", fontSize: 11, marginTop: 4 }}>
                      {lang === "ko" ? "재시도" : "再試行"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[s.removeBtn, { backgroundColor: colors.charcoal }]}
                  onPress={() => removePhoto("main")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FIcon name="x" size={12} color="#fff" />
                </TouchableOpacity>
              </>
            ) : (
              <View style={s.mainPhotoEmpty}>
                <View style={[s.mainPhotoCameraCircle, { backgroundColor: colors.roseSoft }]}>
                  <FIcon name="camera" size={28} color={colors.rose} />
                </View>
                <Text style={[s.mainPhotoHint, { color: colors.charcoalMid }]}>
                  {lang === "ko" ? "탭하여 사진 추가" : "タップして写真を追加"}
                </Text>
                <Text style={[s.mainPhotoSubHint, { color: colors.charcoalLight }]}>
                  {lang === "ko" ? "얼굴이 잘 보이는 사진으로 설정하세요" : "顔がよく見える写真を設定してください"}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Extra photos */}
          <View style={s.extraPhotoSection}>
            <View style={s.extraLabelRow}>
              <Text style={[s.photoRequiredLabel, { color: colors.charcoalMid }]}>
                {lang === "ko" ? "추가 사진" : "追加写真"}
              </Text>
              <View style={[s.photoBadge, { backgroundColor: colors.muted }]}>
                <Text style={[s.photoBadgeText, { color: colors.charcoalLight }]}>
                  {lang === "ko" ? "선택" : "任意"}
                </Text>
              </View>
            </View>

            <View style={s.extraPhotoRow}>
              {[0, 1, 2].map((i) => {
                const uri = extraPhotos[i];
                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      s.extraPhotoSlot,
                      {
                        width: EXTRA_SLOT_SIZE,
                        height: EXTRA_SLOT_SIZE,
                        backgroundColor: uri ? "transparent" : colors.muted,
                        borderColor: uri ? colors.rose : colors.border,
                        borderStyle: uri ? "solid" : "dashed",
                      },
                    ]}
                    onPress={() => pickPhoto(i)}
                    activeOpacity={0.78}
                  >
                    {uri ? (
                      <>
                        <Image
                          source={{ uri }}
                          style={{ width: EXTRA_SLOT_SIZE, height: EXTRA_SLOT_SIZE, borderRadius: 14 }}
                          contentFit="cover"
                        />
                        {photoUploading[String(i)] && (
                          <View style={[s.uploadOverlay, { borderRadius: 14 }]}>
                            <ActivityIndicator size="small" color="#fff" />
                          </View>
                        )}
                        {photoFailed[String(i)] && !photoUploading[String(i)] && (
                          <TouchableOpacity
                            style={[s.uploadOverlay, { borderRadius: 14, backgroundColor: "rgba(220,50,50,0.7)" }]}
                            onPress={() => {
                              setPhotoFailed((prev) => ({ ...prev, [String(i)]: false }));
                              pickPhoto(i);
                            }}
                            activeOpacity={0.8}
                          >
                            <FIcon name="refresh-cw" size={16} color="#fff" />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={[s.removeBtn, s.removeBtnSmall, { backgroundColor: colors.charcoal }]}
                          onPress={() => removePhoto(i)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <FIcon name="x" size={9} color="#fff" />
                        </TouchableOpacity>
                      </>
                    ) : (
                      <FIcon name="plus" size={20} color={colors.charcoalFaint} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Tip card */}
          <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border, marginTop: 16 }]}>
            <Text style={[s.tipText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? "선명하고 혼자 나온 사진이 매칭률을 높여요. 그룹 사진이나 너무 어두운 사진은 피해주세요."
                : "鮮明で一人で写った写真がマッチ率を上げます。グループ写真や暗すぎる写真は避けてください。"}
            </Text>
          </View>
        </ScrollView>

        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton
            label={lang === "ko" ? "다음 →" : "次へ →"}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setStep(2);
            }}
            disabled={!mainPhoto}
          />
        </View>
      </View>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // STEP 2 — Identity (name / age / intro)
  // ══════════════════════════════════════════════════════════════════════════
  if (step === 2) {
    return (
      <KeyboardAvoidingView
        style={[s.container, { backgroundColor: colors.white }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Header />
        <ProgressBar />

        <KeyboardAwareScrollViewCompat
          contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 130 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bottomOffset={80}
        >
          {/* Country context */}
          <View style={s.pillRow}>
            <CountryPill />
          </View>

          {/* Step hero */}
          <Text style={[s.heroTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "안녕하세요!" : "はじめまして！"}
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
              defaultValue={nickname}
              onChangeText={setNickname}
              placeholder={lang === "ko" ? "닉네임을 입력하세요" : "ニックネームを入力"}
              placeholderTextColor={colors.charcoalFaint}
              returnKeyType="next"
              autoFocus
              maxLength={20}
              autoCorrect={false}
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
              defaultValue={intro}
              onChangeText={setIntro}
              placeholder={
                lang === "ko"
                  ? "자신을 한 문장으로 소개해주세요"
                  : "一文で自己紹介してください"
              }
              placeholderTextColor={colors.charcoalFaint}
              maxLength={80}
              returnKeyType="done"
              autoCorrect={false}
            />
            <Text style={[s.charCount, { color: colors.charcoalFaint }]}>
              {intro.length}/80
            </Text>
          </View>

          {/* Soft tip card */}
          <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[s.tipText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? "진솔한 소개가 좋은 인연을 만들어요. 있는 그대로의 나를 보여주세요."
                : "正直な自己紹介が良い縁を生みます。ありのままの自分を見せてください。"}
            </Text>
          </View>
        </KeyboardAwareScrollViewCompat>

        {/* Sticky CTA */}
        <View style={[s.stickyFooter, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <PrimaryButton
            label={lang === "ko" ? "다음 →" : "次へ →"}
            onPress={handleStep2Continue}
            disabled={!step2CanContinue}
          />
        </View>
      </KeyboardAvoidingView>
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
          {lang === "ko" ? "관심사를 골라주세요" : "趣味を選んでください"}
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
          {INTERESTS_I18N.map((item) => {
            const tag = lang === "ja" ? item.ja : item.ko;
            const picked = selectedInterests.includes(tag);
            const atMax = !picked && selectedInterests.length >= 8;
            return (
              <TouchableOpacity
                key={item.ko}
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
          label={lang === "ko" ? "시작하기" : "始める"}
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
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 4,
  },
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

  // Photo step
  photoRequiredRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  photoBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  photoBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
  },
  photoRequiredLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  mainPhotoSlot: {
    width: "100%",
    aspectRatio: 4 / 5,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  mainPhotoImage: {
    width: "100%",
    height: "100%",
  },
  mainPhotoEmpty: {
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  mainPhotoCameraCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  mainPhotoHint: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textAlign: "center",
  },
  mainPhotoSubHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
  },
  uploadOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.88,
  },
  removeBtnSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 5,
    right: 5,
  },
  extraPhotoSection: {
    marginBottom: 8,
  },
  extraLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  extraPhotoRow: {
    flexDirection: "row",
    gap: 10,
  },
  extraPhotoSlot: {
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
