import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import FIcon from "@/components/FIcon";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:3000";

const MAX_PHOTOS = 5;
const MIN_PHOTOS = 4;

type Step = "select" | "generating" | "result" | "error";

interface PhotoSlot {
  uri: string;
  base64: string;
}

// ── Loading animation component ───────────────────────────────────────────────
function AILoadingView({ lang }: { lang: string }) {
  const colors = useColors();
  const pulse = useRef(new Animated.Value(0.7)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const [dots, setDots] = useState(".");

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(pulse, { toValue: 0.7, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true, easing: Easing.linear })
    ).start();

    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 600);
    return () => clearInterval(timer);
  }, []);

  const spin = rotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  const steps = lang === "ko"
    ? ["얼굴 특징 분석 중", "AI 모델 적용 중", "사진 생성 중", "마무리 작업 중"]
    : ["顔の特徴を分析中", "AIモデルを適用中", "写真を生成中", "仕上げ作業中"];

  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStepIdx((i) => Math.min(i + 1, steps.length - 1)), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <View style={load.container}>
      <Animated.View style={[load.circle, { backgroundColor: colors.roseLight, transform: [{ scale: pulse }] }]}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <FIcon name="zap" size={44} color={colors.rose} />
        </Animated.View>
      </Animated.View>

      <Text style={[load.title, { color: colors.charcoal }]}>
        {lang === "ko" ? "AI가 사진을 만들고 있어요" : "AIが写真を作っています"}
      </Text>
      <Text style={[load.sub, { color: colors.charcoalLight }]}>
        {steps[stepIdx]}{dots}
      </Text>
      <Text style={[load.hint, { color: colors.charcoalFaint }]}>
        {lang === "ko" ? "보통 30~60초 정도 걸려요" : "通常30〜60秒ほどかかります"}
      </Text>
    </View>
  );
}

const load = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  circle: {
    width: 120, height: 120, borderRadius: 60,
    alignItems: "center", justifyContent: "center",
    marginBottom: 32,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22, textAlign: "center", marginBottom: 10 },
  sub: { fontFamily: "Inter_500Medium", fontSize: 16, textAlign: "center", marginBottom: 8 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
});

// ── Main screen ────────────────────────────────────────────────────────────────
export default function AIPhotoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLocale();
  const { updateProfile, profile } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [step, setStep] = useState<Step>("select");
  const [photos, setPhotos] = useState<PhotoSlot[]>([]);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canGenerate = photos.length >= MIN_PHOTOS;

  // ── Photo picker ──────────────────────────────────────────────────────────
  const pickPhoto = async () => {
    if (photos.length >= MAX_PHOTOS) return;

    if (Platform.OS !== "web") {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          lang === "ko" ? "권한 필요" : "許可が必要",
          lang === "ko"
            ? "사진 접근 권한이 필요합니다."
            : "写真へのアクセス許可が必要です。"
        );
        return;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled) {
      const newSlots: PhotoSlot[] = result.assets
        .filter((a) => a.base64)
        .slice(0, MAX_PHOTOS - photos.length)
        .map((a) => ({ uri: a.uri, base64: a.base64! }));
      setPhotos((prev) => [...prev, ...newSlots].slice(0, MAX_PHOTOS));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // ── Generate ──────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!canGenerate) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("generating");

    try {
      const base64Photos = photos.map((p) => p.base64);
      const res = await fetch(`${API_BASE}/api/ai/generate-profile-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos: base64Photos }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResultBase64(data.photo);
      setStep("result");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      console.error("[ai-photo] generate error:", err);
      setErrorMsg(err.message ?? "Unknown error");
      setStep("error");
    }
  };

  const handleSetAsProfile = () => {
    if (!resultBase64) return;
    const dataUri = `data:image/png;base64,${resultBase64}`;
    const currentPhotos = profile.photos ?? [];
    updateProfile({ photos: [dataUri, ...currentPhotos.slice(0, 3)] });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(
      lang === "ko" ? "완료" : "完了",
      lang === "ko"
        ? "AI 사진이 대표 프로필 사진으로 설정되었어요!"
        : "AI写真がメインプロフィール写真として設定されました！",
      [{ text: lang === "ko" ? "확인" : "OK", onPress: () => router.back() }]
    );
  };

  // ── Header ────────────────────────────────────────────────────────────────
  const Header = ({ showBack = true }: { showBack?: boolean }) => (
    <View style={[s.header, { paddingTop: topPad + 14 }]}>
      {showBack ? (
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <FIcon name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
      ) : (
        <View style={s.backBtn} />
      )}
      <Text style={[s.headerTitle, { color: colors.charcoal }]}>
        {lang === "ko" ? "AI 증명사진" : "AI証明写真"}
      </Text>
      <View style={s.backBtn} />
    </View>
  );

  // ── Generating step ───────────────────────────────────────────────────────
  if (step === "generating") {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header showBack={false} />
        <AILoadingView lang={lang} />
      </View>
    );
  }

  // ── Error step ────────────────────────────────────────────────────────────
  if (step === "error") {
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header />
        <View style={s.centerContent}>
          <View style={[s.errorCircle, { backgroundColor: colors.roseLight }]}>
            <FIcon name="alert-circle" size={44} color={colors.rose} />
          </View>
          <Text style={[s.errorTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "생성에 실패했어요" : "生成に失敗しました"}
          </Text>
          <Text style={[s.errorSub, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? "잠시 후 다시 시도해주세요"
              : "しばらく経ってからもう一度お試しください"}
          </Text>
          <TouchableOpacity
            style={[s.retryBtn, { backgroundColor: colors.rose }]}
            onPress={() => setStep("select")}
          >
            <Text style={s.retryText}>
              {lang === "ko" ? "다시 시도" : "もう一度試す"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Result step ───────────────────────────────────────────────────────────
  if (step === "result" && resultBase64) {
    const dataUri = `data:image/png;base64,${resultBase64}`;
    return (
      <View style={[s.container, { backgroundColor: colors.white }]}>
        <Header />
        <ScrollView contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 100 }]}>
          <Text style={[s.sectionTitle, { color: colors.charcoal, marginBottom: 8 }]}>
            {lang === "ko" ? "완성된 AI 사진" : "完成したAI写真"}
          </Text>
          <Text style={[s.sectionSub, { color: colors.charcoalLight, marginBottom: 24 }]}>
            {lang === "ko"
              ? "마음에 들면 프로필 사진으로 설정해보세요"
              : "気に入ったらプロフィール写真として設定してみてください"}
          </Text>

          <View style={s.resultImageWrap}>
            <Image
              source={{ uri: dataUri }}
              style={s.resultImage}
              contentFit="cover"
            />
            <View style={[s.resultBadge, { backgroundColor: colors.rose }]}>
              <FIcon name="zap" size={12} color="#fff" />
              <Text style={s.resultBadgeText}>AI</Text>
            </View>
          </View>

          <View style={[s.tipCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <FIcon name="info" size={15} color={colors.charcoalMid} />
            <Text style={[s.tipText, { color: colors.charcoalMid }]}>
              {lang === "ko"
                ? "AI 생성 사진임을 상대방에게 자연스럽게 알리면 더 좋은 인상을 줄 수 있어요."
                : "AI生成写真であることを自然に伝えると、より良い印象を与えられます。"}
            </Text>
          </View>
        </ScrollView>

        <View style={[s.footer, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: colors.rose }]}
            onPress={handleSetAsProfile}
            activeOpacity={0.82}
          >
            <FIcon name="user" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>
              {lang === "ko" ? "대표 사진으로 설정" : "メイン写真として設定"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.secondaryBtn, { borderColor: colors.border }]}
            onPress={() => { setPhotos([]); setResultBase64(null); setStep("select"); }}
            activeOpacity={0.72}
          >
            <Text style={[s.secondaryBtnText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "다시 만들기" : "作り直す"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Select step ───────────────────────────────────────────────────────────
  const remaining = MAX_PHOTOS - photos.length;

  return (
    <View style={[s.container, { backgroundColor: colors.white }]}>
      <Header />
      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 110 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <Text style={[s.heroTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "얼굴 사진을 선택해주세요" : "顔写真を選んでください"}
        </Text>
        <Text style={[s.heroSub, { color: colors.charcoalLight }]}>
          {lang === "ko"
            ? "다양한 각도의 얼굴 사진 4~5장을 선택하면\nAI가 자연스러운 증명사진을 만들어드려요"
            : "様々な角度の顔写真を4〜5枚選ぶと\nAIが自然な証明写真を作成します"}
        </Text>

        {/* Count badge */}
        <View style={s.countRow}>
          <View style={[s.countBadge, {
            backgroundColor: photos.length >= MIN_PHOTOS ? colors.roseLight : colors.muted,
          }]}>
            <Text style={[s.countText, {
              color: photos.length >= MIN_PHOTOS ? colors.rose : colors.charcoalLight,
            }]}>
              {photos.length}/{MAX_PHOTOS}
            </Text>
          </View>
          <Text style={[s.countHint, { color: colors.charcoalLight }]}>
            {lang === "ko"
              ? photos.length < MIN_PHOTOS
                ? `최소 ${MIN_PHOTOS}장 필요 (${MIN_PHOTOS - photos.length}장 더 추가하세요)`
                : "생성 준비 완료!"
              : photos.length < MIN_PHOTOS
                ? `最低${MIN_PHOTOS}枚必要 (あと${MIN_PHOTOS - photos.length}枚追加)`
                : "生成準備完了！"
            }
          </Text>
        </View>

        {/* Photo grid */}
        <View style={s.photoGrid}>
          {photos.map((photo, idx) => (
            <View key={idx} style={s.photoCell}>
              <Image
                source={{ uri: photo.uri }}
                style={s.photoThumb}
                contentFit="cover"
              />
              <TouchableOpacity
                style={[s.removeBtn, { backgroundColor: colors.charcoal }]}
                onPress={() => removePhoto(idx)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <FIcon name="x" size={10} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}

          {photos.length < MAX_PHOTOS && (
            <TouchableOpacity
              style={[s.addBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={pickPhoto}
              activeOpacity={0.72}
            >
              <FIcon name="plus" size={24} color={colors.charcoalMid} />
              <Text style={[s.addBtnText, { color: colors.charcoalMid }]}>
                {remaining === MAX_PHOTOS
                  ? (lang === "ko" ? "사진 추가" : "写真を追加")
                  : `+${remaining}`}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tips */}
        <View style={[s.tipsCard, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Text style={[s.tipsTitle, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "잘 나오는 사진 팁" : "うまく撮れるコツ"}
          </Text>
          {(lang === "ko"
            ? [
                "정면, 측면, 다양한 각도 사진 각 1~2장",
                "밝은 조명 아래 찍은 선명한 사진",
                "혼자 나온 얼굴이 잘 보이는 사진",
                "선글라스나 마스크 없는 사진",
              ]
            : [
                "正面・横顔など様々な角度の写真",
                "明るい照明下で撮影した鮮明な写真",
                "一人で顔がよく見える写真",
                "サングラスやマスクなしの写真",
              ]
          ).map((tip, i) => (
            <View key={i} style={s.tipRow}>
              <View style={[s.tipDot, { backgroundColor: colors.rose }]} />
              <Text style={[s.tipItem, { color: colors.charcoalMid }]}>{tip}</Text>
            </View>
          ))}
        </View>

        {/* AI notice */}
        <View style={[s.noticeCard, { backgroundColor: "#FFF9F0", borderColor: "#FFE0A0" }]}>
          <FIcon name="shield" size={15} color="#B87A00" />
          <Text style={[s.noticeText, { color: "#7A5500" }]}>
            {lang === "ko"
              ? "업로드된 사진은 AI 생성 후 즉시 삭제되며 저장되지 않습니다."
              : "アップロードされた写真はAI生成後すぐに削除され、保存されません。"}
          </Text>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: bottomPad + 14, borderTopColor: colors.border, backgroundColor: colors.white }]}>
        <TouchableOpacity
          style={[s.primaryBtn, {
            backgroundColor: canGenerate ? colors.rose : colors.muted,
          }]}
          onPress={handleGenerate}
          disabled={!canGenerate}
          activeOpacity={0.82}
        >
          <FIcon name="zap" size={18} color={canGenerate ? "#fff" : colors.charcoalLight} />
          <Text style={[s.primaryBtnText, { color: canGenerate ? "#fff" : colors.charcoalLight }]}>
            {lang === "ko" ? "AI 사진 생성하기" : "AI写真を生成する"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17, letterSpacing: -0.3 },

  scroll: { paddingHorizontal: 24, paddingTop: 8 },

  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 26,
    lineHeight: 36,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 22,
    marginBottom: 24,
  },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  countHint: { fontFamily: "Inter_400Regular", fontSize: 13, flex: 1 },

  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  photoCell: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: { width: "100%", height: "100%" },
  removeBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.9,
  },
  addBtn: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },

  tipsCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
    gap: 8,
  },
  tipsTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    marginBottom: 4,
  },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  tipDot: { width: 5, height: 5, borderRadius: 3, marginTop: 7 },
  tipItem: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, flex: 1 },

  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18, flex: 1 },

  tipCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginTop: 8,
    marginBottom: 16,
  },
  tipText: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 20, flex: 1 },

  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 18,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.1,
  },
  secondaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
    paddingVertical: 14,
    borderWidth: 1.5,
  },
  secondaryBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 15 },

  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  errorCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  errorTitle: { fontFamily: "Inter_700Bold", fontSize: 20, textAlign: "center", marginBottom: 8 },
  errorSub: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", marginBottom: 28 },
  retryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 100,
  },
  retryText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#fff" },

  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.3 },
  sectionSub: { fontFamily: "Inter_400Regular", fontSize: 14 },
  resultImageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    marginBottom: 20,
  },
  resultImage: { width: "100%", height: "100%" },
  resultBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  resultBadgeText: { fontFamily: "Inter_700Bold", fontSize: 12, color: "#fff" },
});
