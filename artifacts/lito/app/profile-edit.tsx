import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
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

import FIcon from "@/components/FIcon";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { INTERESTS_I18N } from "@/utils/interests";
import { uploadPhotoToStorage } from "@/utils/photoUpload";

const MAX_INTERESTS = 8;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

function isUriPhoto(key: string): boolean {
  return (
    key.startsWith("file://") ||
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("content://") ||
    key.startsWith("ph://")
  );
}

function SaveButton({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
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
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={pressIn}
        onPressOut={pressOut}
        onPress={() => {
          if (disabled) return;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={[s.saveBtn, { backgroundColor: disabled ? colors.muted : colors.rose }]}
      >
        <Text style={[s.saveBtnText, { color: disabled ? colors.charcoalLight : "#fff" }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, token } = useApp();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [gender, setGender] = useState<"male" | "female" | "other" | undefined>(profile.gender);
  const [nickname, setNickname] = useState(profile.nickname);
  const [age, setAge] = useState(String(profile.age));
  const [intro, setIntro] = useState(profile.introI18n?.[lang] ?? profile.intro ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(profile.instagramHandle ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests ?? []);
  const [smoking, setSmoking] = useState<"never" | "socially" | "regularly" | "prefer_not_to_say" | undefined>(profile.smoking);
  const [drinking, setDrinking] = useState<"never" | "socially" | "regularly" | "prefer_not_to_say" | undefined>(profile.drinking);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  const parsedAge = parseInt(age, 10);
  const ageValid = age === "" || (!isNaN(parsedAge) && parsedAge >= 18 && parsedAge <= 99);
  const nicknameValid = nickname.trim().length >= 2;
  const canSave = nicknameValid && ageValid;

  const handlePickPhoto = async () => {
    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          lang === "ko" ? "권한 필요" : "権限が必要です",
          lang === "ko"
            ? "사진 접근 권한이 필요합니다. 설정에서 허용해주세요."
            : "写真へのアクセス権限が必要です。設定で許可してください。"
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalPhotoUri(uri);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 토큰 있을 때 GCS에 업로드
      if (token) {
        setIsPhotoUploading(true);
        uploadPhotoToStorage(uri, token)
          .then((servingUrl) => setLocalPhotoUri(servingUrl))
          .catch((err) => {
            console.warn("[profile-edit] 사진 업로드 실패, 로컬 URI 유지:", err);
          })
          .finally(() => setIsPhotoUploading(false));
      }
    }
  };

  const toggleInterest = (storedKey: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(storedKey)) return prev.filter((t) => t !== storedKey);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, storedKey];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!canSave) return;

    const updates: Parameters<typeof updateProfile>[0] = {
      nickname: nickname.trim(),
      age: !isNaN(parsedAge) && parsedAge >= 18 && parsedAge <= 99 ? parsedAge : profile.age,
      gender,
      bio: bio.trim() || profile.bio,
      interests: selectedInterests.length > 0 ? selectedInterests : profile.interests,
      smoking,
      drinking,
    };

    if (instagramHandle.trim()) {
      const handle = instagramHandle.trim();
      updates.instagramHandle = handle.startsWith("@") ? handle : `@${handle}`;
    } else {
      updates.instagramHandle = undefined;
    }

    const introTrimmed = intro.trim();
    if (introTrimmed) {
      const existingI18n = profile.introI18n ?? {};
      updates.intro = introTrimmed;
      updates.introI18n = { ...existingI18n, [lang]: introTrimmed };
    }

    if (localPhotoUri) {
      const otherPhotos = profile.photos.filter((p) => !isUriPhoto(p));
      updates.photos = [localPhotoUri, ...otherPhotos];
    }

    updateProfile(updates);

    if (token) {
      fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nickname: updates.nickname,
          age: updates.age,
          gender: updates.gender,
          bio: updates.bio,
          intro: updates.intro,
          interests: updates.interests,
          instagramHandle: updates.instagramHandle,
          smoking: updates.smoking ?? null,
          drinking: updates.drinking ?? null,
        }),
      }).catch(() => {});
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 8, backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={s.headerBack} onPress={() => router.back()} hitSlop={12}>
          <FIcon name="chevron-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "프로필 편집" : "プロフィール編集"}
        </Text>
        <View style={{ width: 34 }} />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bottomOffset={80}
      >
        {/* ── Photo section ─────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "프로필 사진" : "プロフィール写真"}
          </Text>
          <View style={s.photoRow}>
            <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8}>
              <View style={[s.photoFrame, { borderColor: colors.roseSoft, backgroundColor: colors.roseLight }]}>
                {localPhotoUri ? (
                  <>
                    <Image
                      source={{ uri: localPhotoUri }}
                      style={s.photoPreview}
                      contentFit="cover"
                    />
                    {isPhotoUploading && (
                      <View style={s.uploadOverlay}>
                        <ActivityIndicator size="small" color="#fff" />
                      </View>
                    )}
                  </>
                ) : profile.photos[0] ? (
                  <Image
                    source={
                      isUriPhoto(profile.photos[0])
                        ? { uri: profile.photos[0] }
                        : (() => {
                            const map: Record<string, any> = {
                              profile1: require("@/assets/images/profile1.png"),
                              profile2: require("@/assets/images/profile2.png"),
                              profile3: require("@/assets/images/profile3.png"),
                              profile4: require("@/assets/images/profile4.png"),
                              profile5: require("@/assets/images/profile5.png"),
                              profile6: require("@/assets/images/profile6.png"),
                            };
                            return map[profile.photos[0]];
                          })()
                    }
                    style={s.photoPreview}
                    contentFit="cover"
                  />
                ) : (
                  <View style={s.photoPlaceholder}>
                    <FIcon name="camera" size={28} color={colors.rose} />
                    <Text style={[s.photoPlaceholderText, { color: colors.charcoalLight }]}>
                      {lang === "ko" ? "사진 추가" : "写真を追加"}
                    </Text>
                  </View>
                )}
                <View style={[s.photoEditBadge, { backgroundColor: colors.rose }]}>
                  <FIcon name="camera" size={11} color="#fff" />
                </View>
              </View>
            </TouchableOpacity>
            <View style={s.photoHint}>
              <Text style={[s.photoHintTitle, { color: colors.charcoal }]}>
                {lang === "ko" ? "사진 선택 팁" : "写真選択のヒント"}
              </Text>
              <Text style={[s.photoHintText, { color: colors.charcoalLight }]}>
                {lang === "ko"
                  ? "밝고 자연스러운 사진이 매칭률을 높여요. 얼굴이 잘 보이는 사진을 추천해요."
                  : "明るく自然な写真がマッチ率を高めます。顔がよく見える写真がおすすめです。"}
              </Text>
            </View>
          </View>
          {localPhotoUri && (
            <View style={[s.photoSavedNote, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
              <FIcon name="check-circle" size={13} color={colors.rose} />
              <Text style={[s.photoSavedNoteText, { color: colors.rose }]}>
                {lang === "ko" ? "새 사진이 선택됐어요" : "新しい写真が選択されました"}
              </Text>
            </View>
          )}
        </View>

        {/* ── Basic info ─────────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "기본 정보" : "基本情報"}
          </Text>

          {/* Gender */}
          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "성별" : "性別"}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              {(["male", "female", "other"] as const).map((g) => {
                const label = g === "male"
                  ? (lang === "ko" ? "남성" : "男性")
                  : g === "female"
                  ? (lang === "ko" ? "여성" : "女性")
                  : (lang === "ko" ? "기타" : "その他");
                const selected = gender === g;
                return (
                  <TouchableOpacity
                    key={g}
                    onPress={() => { setGender(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[
                      s.genderBtn,
                      {
                        flex: 1,
                        borderColor: selected ? colors.rose : colors.border,
                        backgroundColor: selected ? colors.roseLight : colors.muted,
                      },
                    ]}
                    activeOpacity={0.75}
                  >
                    <Text style={[s.genderBtnText, { color: selected ? colors.rose : colors.charcoalMid }]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "닉네임" : "ニックネーム"}
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.muted,
                  borderColor: nickname.trim().length > 0 ? colors.rose : colors.border,
                  color: colors.charcoal,
                },
              ]}
              defaultValue={nickname}
              onChangeText={setNickname}
              placeholder={lang === "ko" ? "닉네임 입력" : "ニックネームを入力"}
              placeholderTextColor={colors.charcoalFaint}
              maxLength={20}
              returnKeyType="next"
              autoCorrect={false}
            />
            {nickname.trim().length > 0 && nickname.trim().length < 2 && (
              <Text style={[s.fieldError, { color: colors.rose }]}>
                {lang === "ko" ? "2자 이상 입력해주세요" : "2文字以上入力してください"}
              </Text>
            )}
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "나이" : "年齢"}
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.muted,
                  borderColor: age ? (ageValid ? colors.rose : "#E8607A") : colors.border,
                  color: colors.charcoal,
                },
              ]}
              value={age}
              onChangeText={(v) => setAge(v.replace(/[^0-9]/g, ""))}
              placeholder={lang === "ko" ? "나이 (18~99)" : "年齢 (18〜99)"}
              placeholderTextColor={colors.charcoalFaint}
              keyboardType="number-pad"
              maxLength={2}
              returnKeyType="next"
            />
            {age !== "" && !ageValid && (
              <Text style={[s.fieldError, { color: "#E8607A" }]}>
                {lang === "ko" ? "18~99 사이로 입력해주세요" : "18〜99の間で入力してください"}
              </Text>
            )}
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "한줄 소개" : "ひとこと自己紹介"}
            </Text>
            <TextInput
              style={[
                s.input,
                {
                  backgroundColor: colors.muted,
                  borderColor: intro.trim() ? colors.rose : colors.border,
                  color: colors.charcoal,
                },
              ]}
              defaultValue={intro}
              onChangeText={setIntro}
              placeholder={lang === "ko" ? "예) 커피 좋아하는 개발자" : "例）コーヒー好きのエンジニア"}
              placeholderTextColor={colors.charcoalFaint}
              maxLength={60}
              returnKeyType="next"
              autoCorrect={false}
            />
            <Text style={[s.fieldCount, { color: colors.charcoalFaint }]}>{intro.length}/60</Text>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "자기소개" : "自己紹介"}
            </Text>
            <TextInput
              style={[
                s.input,
                s.inputMultiline,
                {
                  backgroundColor: colors.muted,
                  borderColor: bio.trim() ? colors.rose : colors.border,
                  color: colors.charcoal,
                },
              ]}
              defaultValue={bio}
              onChangeText={setBio}
              placeholder={
                lang === "ko"
                  ? "나를 더 자세히 소개해봐요. 취미, 관심사, 이상형 등..."
                  : "自分をもっと詳しく紹介しましょう。趣味、興味、理想のパートナーなど..."
              }
              placeholderTextColor={colors.charcoalFaint}
              multiline
              maxLength={500}
              textAlignVertical="top"
              autoCorrect={false}
            />
            <Text style={[s.fieldCount, { color: colors.charcoalFaint }]}>{bio.length}/500</Text>
          </View>

          <View style={s.field}>
            <Text style={[s.fieldLabel, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "인스타그램 (선택)" : "インスタグラム（任意）"}
            </Text>
            <View
              style={[
                s.inputIconWrap,
                {
                  backgroundColor: colors.muted,
                  borderColor: instagramHandle ? "#DDD5F8" : colors.border,
                },
              ]}
            >
              <FIcon name="instagram" size={16} color="#7C3AED" />
              <TextInput
                style={[s.inputWithIcon, { color: colors.charcoal }]}
                value={instagramHandle}
                onChangeText={setInstagramHandle}
                placeholder="@username"
                placeholderTextColor={colors.charcoalFaint}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* ── Interests ─────────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={s.sectionHeaderRow}>
            <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "관심사" : "興味・趣味"}
            </Text>
            <Text style={[s.interestCount, { color: colors.charcoalLight }]}>
              {selectedInterests.length}/{MAX_INTERESTS}
            </Text>
          </View>
          <Text style={[s.interestHint, { color: colors.charcoalFaint }]}>
            {lang === "ko"
              ? `최대 ${MAX_INTERESTS}개까지 선택할 수 있어요`
              : `最大${MAX_INTERESTS}個まで選択できます`}
          </Text>
          <View style={s.tagsWrap}>
            {INTERESTS_I18N.map((entry) => {
              const storedKey = entry.ja;
              const displayLabel = entry[lang === "ko" ? "ko" : "ja"];
              const isSelected = selectedInterests.includes(storedKey);
              const isDisabled = !isSelected && selectedInterests.length >= MAX_INTERESTS;
              return (
                <TouchableOpacity
                  key={storedKey}
                  onPress={() => !isDisabled && toggleInterest(storedKey)}
                  activeOpacity={isDisabled ? 1 : 0.75}
                  style={[
                    s.tag,
                    {
                      backgroundColor: isSelected ? colors.rose : colors.muted,
                      borderColor: isSelected ? colors.rose : colors.border,
                      opacity: isDisabled ? 0.4 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.tagText,
                      { color: isSelected ? "#fff" : colors.charcoalMid },
                    ]}
                  >
                    {displayLabel}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Lifestyle section ─────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "라이프스타일" : "ライフスタイル"}
          </Text>

          {/* 흡연 */}
          <Text style={[s.lifestyleSubLabel, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "흡연" : "喫煙"}
          </Text>
          <View style={s.lifestyleRow}>
            {(["never", "socially", "regularly", "prefer_not_to_say"] as const).map((val) => {
              const label =
                val === "never"
                  ? lang === "ko" ? "안 함" : "しない"
                  : val === "socially"
                  ? lang === "ko" ? "가끔" : "たまに"
                  : val === "regularly"
                  ? lang === "ko" ? "자주" : "よくする"
                  : lang === "ko" ? "비공개" : "非公開";
              const selected = smoking === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => {
                    setSmoking(selected ? undefined : val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    s.lifestyleChip,
                    {
                      backgroundColor: selected ? colors.rose : colors.muted,
                      borderColor: selected ? colors.rose : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.lifestyleChipText, { color: selected ? "#fff" : colors.charcoalMid }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 음주 */}
          <Text style={[s.lifestyleSubLabel, { color: colors.charcoalMid, marginTop: 16 }]}>
            {lang === "ko" ? "음주" : "飲酒"}
          </Text>
          <View style={s.lifestyleRow}>
            {(["never", "socially", "regularly", "prefer_not_to_say"] as const).map((val) => {
              const label =
                val === "never"
                  ? lang === "ko" ? "안 함" : "しない"
                  : val === "socially"
                  ? lang === "ko" ? "가끔" : "たまに"
                  : val === "regularly"
                  ? lang === "ko" ? "자주" : "よく飲む"
                  : lang === "ko" ? "비공개" : "非公開";
              const selected = drinking === val;
              return (
                <TouchableOpacity
                  key={val}
                  onPress={() => {
                    setDrinking(selected ? undefined : val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    s.lifestyleChip,
                    {
                      backgroundColor: selected ? colors.rose : colors.muted,
                      borderColor: selected ? colors.rose : colors.border,
                    },
                  ]}
                >
                  <Text style={[s.lifestyleChipText, { color: selected ? "#fff" : colors.charcoalMid }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Save button ───────────────────────────────────────────────────── */}
        <View style={s.saveBtnWrap}>
          <SaveButton
            label={lang === "ko" ? "저장하기" : "保存する"}
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
      </KeyboardAwareScrollViewCompat>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scroll: {
    paddingHorizontal: 0,
    gap: 12,
    paddingTop: 12,
  },

  // ── Section card ─────────────────────────────────────────────────────────
  section: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 4,
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  // ── Photo ─────────────────────────────────────────────────────────────────
  photoRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 4,
  },
  photoFrame: {
    width: 100,
    height: 130,
    borderRadius: 14,
    borderWidth: 2,
    overflow: "hidden",
    position: "relative",
  },
  photoPreview: {
    width: "100%",
    height: "100%",
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
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  photoPlaceholderText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  photoEditBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  photoHint: {
    flex: 1,
    gap: 6,
  },
  photoHintTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  photoHintText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  photoSavedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
  },
  photoSavedNoteText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },

  genderBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  genderBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },

  // ── Form fields ──────────────────────────────────────────────────────────
  field: {
    marginTop: 12,
    gap: 4,
  },
  fieldLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginBottom: 4,
  },
  fieldError: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  fieldCount: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "right",
    marginTop: 3,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  inputMultiline: {
    minHeight: 100,
    paddingTop: 12,
  },
  inputIconWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    gap: 8,
  },
  inputWithIcon: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },

  // ── Interests ─────────────────────────────────────────────────────────────
  interestHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 10,
  },
  interestCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginBottom: 8,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // ── Lifestyle ─────────────────────────────────────────────────────────────
  lifestyleSubLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    marginBottom: 8,
  },
  lifestyleRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  lifestyleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  lifestyleChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtnWrap: {
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
  },
  saveBtn: {
    borderRadius: 100,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  saveBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    letterSpacing: 0.1,
  },
});
