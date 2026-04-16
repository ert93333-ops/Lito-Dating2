import { API_BASE } from "@/config";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import { uploadPhotoToStorage, UploadError } from "@/utils/photoUpload";

const MAX_PHOTOS = 6;
const MAX_INTERESTS = 8;

// ── 사진 슬롯 타입 ─────────────────────────────────────────────────────────────

interface PhotoSlot {
  /** 로컬 URI 또는 서버 URL */
  uri: string;
  /** 서버에 업로드 완료된 URL (null이면 아직 업로드 중이거나 실패) */
  serverUrl: string | null;
  /** 업로드 중 여부 */
  uploading: boolean;
  /** 업로드 실패 여부 */
  failed: boolean;
}

function isUriPhoto(key: string): boolean {
  return (
    key.startsWith("file://") ||
    key.startsWith("http://") ||
    key.startsWith("https://") ||
    key.startsWith("content://") ||
    key.startsWith("ph://")
  );
}

// ── SaveButton ──────────────────────────────────────────────────────────────────

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

// ── PhotoGrid 컴포넌트 ──────────────────────────────────────────────────────────

function PhotoGrid({
  photos,
  onAdd,
  onRemove,
  onRetry,
  onMoveUp,
  lang,
}: {
  photos: PhotoSlot[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onRetry: (index: number) => void;
  onMoveUp: (index: number) => void;
  lang: string;
}) {
  const colors = useColors();
  const SLOT_SIZE = (Platform.OS === "web" ? 320 : 340) / 3 - 12;

  const slots: (PhotoSlot | null)[] = [];
  for (let i = 0; i < MAX_PHOTOS; i++) {
    slots.push(photos[i] ?? null);
  }

  return (
    <View style={ps.grid}>
      {slots.map((slot, i) => {
        const isMain = i === 0;
        const hasPhoto = !!slot;

        return (
          <View key={i} style={[ps.slotWrapper, { width: SLOT_SIZE, height: SLOT_SIZE * 1.25 }]}>
            {hasPhoto ? (
              <View style={[ps.slot, { borderColor: isMain ? colors.rose : colors.border }]}>
                <Image
                  source={{ uri: slot.uri }}
                  style={ps.slotImage}
                  contentFit="cover"
                />

                {/* 업로드 중 오버레이 */}
                {slot.uploading && (
                  <View style={ps.overlay}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={ps.overlayText}>
                      {lang === "ko" ? "업로드 중..." : "アップロード中..."}
                    </Text>
                  </View>
                )}

                {/* 업로드 실패 오버레이 */}
                {slot.failed && !slot.uploading && (
                  <TouchableOpacity
                    style={[ps.overlay, { backgroundColor: "rgba(220,50,50,0.7)" }]}
                    onPress={() => onRetry(i)}
                    activeOpacity={0.8}
                  >
                    <FIcon name="refresh-cw" size={20} color="#fff" />
                    <Text style={ps.overlayText}>
                      {lang === "ko" ? "재시도" : "再試行"}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* 메인 뱃지 */}
                {isMain && (
                  <View style={[ps.mainBadge, { backgroundColor: colors.rose }]}>
                    <Text style={ps.mainBadgeText}>
                      {lang === "ko" ? "대표" : "メイン"}
                    </Text>
                  </View>
                )}

                {/* 삭제 버튼 */}
                <TouchableOpacity
                  style={[ps.removeBtn, { backgroundColor: colors.charcoal }]}
                  onPress={() => onRemove(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FIcon name="x" size={10} color="#fff" />
                </TouchableOpacity>

                {/* 순서 올리기 버튼 (첫 번째가 아닐 때만) */}
                {i > 0 && !slot.uploading && !slot.failed && (
                  <TouchableOpacity
                    style={[ps.moveBtn, { backgroundColor: colors.rose }]}
                    onPress={() => onMoveUp(i)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <FIcon name="arrow-up" size={10} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  ps.slot,
                  ps.emptySlot,
                  { borderColor: colors.border, backgroundColor: colors.muted },
                ]}
                onPress={onAdd}
                activeOpacity={0.7}
              >
                <FIcon name="plus" size={24} color={colors.charcoalFaint} />
                {i === 0 && photos.length === 0 && (
                  <Text style={[ps.emptyLabel, { color: colors.charcoalLight }]}>
                    {lang === "ko" ? "필수" : "必須"}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const ps = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  slotWrapper: {
    borderRadius: 14,
    overflow: "hidden",
  },
  slot: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: "hidden",
  },
  emptySlot: {
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  emptyLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  slotImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    borderRadius: 12,
  },
  overlayText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    color: "#fff",
  },
  mainBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  mainBadgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    color: "#fff",
  },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  moveBtn: {
    position: "absolute",
    bottom: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});

// ── 메인 화면 ───────────────────────────────────────────────────────────────────

export default function ProfileEditScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile, token } = useApp();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── 사진 상태 ─────────────────────────────────────────────────────────────
  const initPhotos: PhotoSlot[] = (profile.photos ?? [])
    .filter((p) => !!p)
    .map((uri) => ({
      uri,
      serverUrl: isUriPhoto(uri) ? uri : null,
      uploading: false,
      failed: false,
    }));

  const [photos, setPhotos] = useState<PhotoSlot[]>(initPhotos);

  // ── 폼 상태 ───────────────────────────────────────────────────────────────
  const [nickname, setNickname] = useState(profile.nickname);
  const [age, setAge] = useState(String(profile.age));
  const [intro, setIntro] = useState(profile.introI18n?.[lang] ?? profile.intro ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [instagramHandle, setInstagramHandle] = useState(profile.instagramHandle ?? "");
  const [selectedInterests, setSelectedInterests] = useState<string[]>(profile.interests ?? []);
  const [saving, setSaving] = useState(false);

  const parsedAge = parseInt(age, 10);
  const ageValid = age === "" || (!isNaN(parsedAge) && parsedAge >= 18 && parsedAge <= 99);
  const nicknameValid = nickname.trim().length >= 2;
  const hasAnyUploading = photos.some((p) => p.uploading);
  const canSave = nicknameValid && ageValid && !hasAnyUploading && !saving;

  // ── 사진 업로드 ───────────────────────────────────────────────────────────
  const uploadPhoto = useCallback(async (uri: string, index: number) => {
    if (!token) return;

    setPhotos((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], uploading: true, failed: false };
      }
      return next;
    });

    try {
      const serverUrl = await uploadPhotoToStorage(uri, token);
      setPhotos((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], uri: serverUrl, serverUrl, uploading: false, failed: false };
        }
        return next;
      });
    } catch (err) {
      console.warn(`[profile-edit] 사진 ${index} 업로드 실패:`, err);
      setPhotos((prev) => {
        const next = [...prev];
        if (next[index]) {
          next[index] = { ...next[index], uploading: false, failed: true };
        }
        return next;
      });

      if (err instanceof UploadError && !err.retryable) {
        Alert.alert(
          lang === "ko" ? "업로드 실패" : "アップロード失敗",
          err.message
        );
      }
    }
  }, [token, lang]);

  const handleAddPhoto = useCallback(async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert(
        lang === "ko" ? "사진 한도" : "写真の上限",
        lang === "ko" ? `최대 ${MAX_PHOTOS}장까지 등록할 수 있어요.` : `最大${MAX_PHOTOS}枚まで登録できます。`
      );
      return;
    }

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
      const newIndex = photos.length;

      setPhotos((prev) => [
        ...prev,
        { uri, serverUrl: null, uploading: false, failed: false },
      ]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // 백그라운드 업로드
      uploadPhoto(uri, newIndex);
    }
  }, [photos.length, lang, uploadPhoto]);

  const handleRemovePhoto = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleRetryPhoto = useCallback((index: number) => {
    const photo = photos[index];
    if (!photo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    uploadPhoto(photo.uri, index);
  }, [photos, uploadPhoto]);

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotos((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  // ── 관심사 ────────────────────────────────────────────────────────────────
  const toggleInterest = (storedKey: string) => {
    setSelectedInterests((prev) => {
      if (prev.includes(storedKey)) return prev.filter((t) => t !== storedKey);
      if (prev.length >= MAX_INTERESTS) return prev;
      return [...prev, storedKey];
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── 저장 ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);

    const photoUrls = photos
      .filter((p) => !p.failed)
      .map((p) => p.serverUrl ?? p.uri);

    const updates: Parameters<typeof updateProfile>[0] = {
      nickname: nickname.trim(),
      age: !isNaN(parsedAge) && parsedAge >= 18 && parsedAge <= 99 ? parsedAge : profile.age,
      bio: bio.trim() || profile.bio,
      interests: selectedInterests.length > 0 ? selectedInterests : profile.interests,
      photos: photoUrls.length > 0 ? photoUrls : profile.photos,
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

    updateProfile(updates);

    // 서버에도 저장
    if (token) {
      const apiBase = API_BASE;
      try {
        await fetch(`${apiBase}/api/auth/profile`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            nickname: updates.nickname,
            age: updates.age,
            bio: updates.bio,
            intro: updates.intro,
            interests: updates.interests,
            photos: updates.photos,
            instagramHandle: updates.instagramHandle,
            languageLevel: profile.languageLevel ?? "beginner",
          }),
        });
      } catch (err) {
        console.warn("[profile-edit] 서버 저장 실패:", err);
      }
    }

    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  };

  // ── 렌더링 ────────────────────────────────────────────────────────────────

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
          <View style={s.sectionHeader}>
            <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "프로필 사진" : "プロフィール写真"}
            </Text>
            <Text style={[s.photoCount, { color: colors.charcoalFaint }]}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>

          <PhotoGrid
            photos={photos}
            onAdd={handleAddPhoto}
            onRemove={handleRemovePhoto}
            onRetry={handleRetryPhoto}
            onMoveUp={handleMoveUp}
            lang={lang}
          />

          <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <FIcon name="info" size={13} color={colors.charcoalLight} />
            <Text style={[s.tipText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? "첫 번째 사진이 대표 사진으로 사용됩니다. 화살표(↑) 버튼으로 순서를 변경할 수 있어요."
                : "最初の写真がメイン写真として使用されます。矢印(↑)ボタンで順序を変更できます。"}
            </Text>
          </View>
        </View>

        {/* ── Basic info ─────────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "기본 정보" : "基本情報"}
          </Text>

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
              <FIcon name="instagram" size={16} color={instagramHandle ? "#C13584" : colors.charcoalFaint} />
              <TextInput
                style={[s.inputWithIcon, { color: colors.charcoal }]}
                defaultValue={instagramHandle}
                onChangeText={setInstagramHandle}
                placeholder="@username"
                placeholderTextColor={colors.charcoalFaint}
                maxLength={30}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>
        </View>

        {/* ── Interests ──────────────────────────────────────────────────────── */}
        <View style={[s.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[s.sectionLabel, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "관심사" : "興味・関心"}
          </Text>
          <Text style={[s.interestHint, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "공통 관심사가 많을수록 매칭 확률이 높아져요"
              : "共通の興味が多いほどマッチング率が上がります"}
          </Text>
          <Text style={[s.interestCount, { color: colors.rose }]}>
            {selectedInterests.length}/{MAX_INTERESTS}
          </Text>
          <View style={s.tagsWrap}>
            {Object.entries(INTERESTS_I18N).map(([key, labels]) => {
              const selected = selectedInterests.includes(key);
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    s.tag,
                    {
                      backgroundColor: selected ? colors.roseLight : colors.muted,
                      borderColor: selected ? colors.rose : colors.border,
                    },
                  ]}
                  onPress={() => toggleInterest(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[s.tagText, { color: selected ? colors.rose : colors.charcoalMid }]}>
                    {lang === "ko" ? labels.ko : labels.ja}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Save ───────────────────────────────────────────────────────────── */}
        <View style={s.saveBtnWrap}>
          <SaveButton
            label={
              saving
                ? (lang === "ko" ? "저장 중..." : "保存中...")
                : (lang === "ko" ? "저장하기" : "保存する")
            }
            onPress={handleSave}
            disabled={!canSave}
          />
        </View>
      </KeyboardAwareScrollViewCompat>
    </KeyboardAvoidingView>
  );
}

// ── 스타일 ──────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  photoCount: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tipText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
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
    marginBottom: 4,
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

  // ── Save button ───────────────────────────────────────────────────────────
  saveBtnWrap: {
    paddingHorizontal: 0,
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
