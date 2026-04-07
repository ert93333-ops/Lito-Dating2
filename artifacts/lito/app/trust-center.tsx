/**
 * Trust Center — shows the user's own verification layers and allows them
 * to initiate each verification flow.
 *
 * Implementation status per layer:
 *   Layer 1 (Human / Phone): Placeholder — requires SMS OTP provider (e.g. Firebase Auth, Twilio)
 *   Layer 2 (Face Match):    Placeholder — requires liveness SDK (e.g. AWS Rekognition, Onfido)
 *   Layer 3 (ID / Gov Doc):  Placeholder — requires ID verification vendor (e.g. Onfido, Persona)
 *   Layer 4 (Institution):   Placeholder — requires email domain verification or document upload
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TRUST_LAYERS, TrustLayerRow } from "@/components/TrustBadge";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { computeTrustScore } from "@/types";

// ── CTA config per layer ──────────────────────────────────────────────────────
// Each layer has a "start" action — currently all placeholder alerts.
// Replace alert bodies with real navigation when backends are wired up.

const LAYER_CTA = {
  humanVerified: {
    labelKo: "휴대폰 인증 시작",
    labelJa: "電話番号認証を開始",
    // TODO: router.push("/verify/phone") — Firebase Auth phone OTP
    onPress: (lang: "ko" | "ja") => {
      Alert.alert(
        lang === "ko" ? "휴대폰 인증" : "電話番号認証",
        lang === "ko"
          ? "SMS로 6자리 인증 코드를 전송합니다.\n\n[백엔드 필요: Firebase Auth / Twilio SMS]"
          : "SMSで6桁の認証コードを送信します。\n\n[バックエンド必要: Firebase Auth / Twilio SMS]",
        [{ text: lang === "ko" ? "확인" : "OK" }]
      );
    },
  },
  faceMatched: {
    labelKo: "얼굴 인증 시작",
    labelJa: "顔認証を開始",
    // TODO: router.push("/verify/face") — liveness capture + face compare
    onPress: (lang: "ko" | "ja") => {
      Alert.alert(
        lang === "ko" ? "얼굴 인증" : "顔認証",
        lang === "ko"
          ? "카메라로 실시간 셀피를 찍어 프로필 사진과 비교합니다.\n\n[백엔드 필요: AWS Rekognition / Onfido 생체 인식]"
          : "カメラでリアルタイムセルフィーを撮り、プロフィール写真と照合します。\n\n[バックエンド必要: AWS Rekognition / Onfido 生体認証]",
        [{ text: lang === "ko" ? "확인" : "OK" }]
      );
    },
  },
  idVerified: {
    labelKo: "신분증 인증 시작",
    labelJa: "身分証明書認証を開始",
    // TODO: router.push("/verify/id") — document capture + OCR
    onPress: (lang: "ko" | "ja") => {
      Alert.alert(
        lang === "ko" ? "신분증 인증" : "身分証明書認証",
        lang === "ko"
          ? "여권, 주민등록증, 운전면허증을 촬영하여 제출합니다.\n\n[백엔드 필요: Onfido / Jumio / Persona ID 검증]"
          : "パスポート、マイナンバーカード、運転免許証を撮影して提出します。\n\n[バックエンド必要: Onfido / Jumio / Persona 本人確認]",
        [{ text: lang === "ko" ? "확인" : "OK" }]
      );
    },
  },
  institutionVerified: {
    labelKo: "직장/학교 인증 시작",
    labelJa: "職場/学校認証を開始",
    // TODO: router.push("/verify/institution") — email domain verification
    onPress: (lang: "ko" | "ja") => {
      Alert.alert(
        lang === "ko" ? "직장/학교 인증" : "職場/学校認証",
        lang === "ko"
          ? "직장 또는 학교 이메일로 인증 링크를 발송합니다.\n\n[백엔드 필요: 이메일 도메인 검증 / 학생증 OCR]"
          : "職場または学校のメールアドレスに認証リンクを送信します。\n\n[バックエンド必要: メールドメイン検証 / 学生証 OCR]",
        [{ text: lang === "ko" ? "확인" : "OK" }]
      );
    },
  },
} as const;

// ── TrustCenterScreen ─────────────────────────────────────────────────────────

export default function TrustCenterScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const { lang } = useLocale();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const trustScore = computeTrustScore(profile.trustProfile);

  // Score band color
  const scoreColor =
    trustScore >= 90
      ? "#1A7A4A"
      : trustScore >= 55
      ? "#3B6FD4"
      : trustScore >= 25
      ? "#B07D1A"
      : "#8E8E93";

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.backBtn}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "신뢰 센터" : "信頼センター"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero score card ─────────────────────────────────────────────── */}
        <View style={[s.scoreCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <View style={s.scoreTop}>
            <View style={[s.scoreCircle, { borderColor: scoreColor }]}>
              <Text style={[s.scoreNumber, { color: scoreColor }]}>{trustScore}</Text>
              <Text style={[s.scoreOf, { color: colors.charcoalLight }]}>/100</Text>
            </View>
            <View style={s.scoreRight}>
              <Text style={[s.scoreName, { color: colors.charcoal }]}>
                {lang === "ko" ? "신뢰 점수" : "信頼スコア"}
              </Text>
              <Text style={[s.scoreDesc, { color: colors.charcoalLight }]}>
                {lang === "ko"
                  ? "높을수록 매칭 우선 노출되고\n상대방이 더 신뢰합니다"
                  : "高いほど優先的にマッチングされ\n相手からより信頼されます"}
              </Text>
              <View style={[s.scoreBand, { backgroundColor: `${scoreColor}15` }]}>
                <Text style={[s.scoreBandText, { color: scoreColor }]}>
                  {trustScore >= 90
                    ? lang === "ko" ? "최상위 신뢰 회원" : "最高信頼メンバー"
                    : trustScore >= 55
                    ? lang === "ko" ? "신뢰 인증 회원" : "認証済みメンバー"
                    : trustScore >= 25
                    ? lang === "ko" ? "기본 인증 완료" : "基本認証完了"
                    : lang === "ko" ? "인증 시작 전" : "認証前"}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress track */}
          <View style={[s.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                s.progressFill,
                { width: `${trustScore}%` as any, backgroundColor: scoreColor },
              ]}
            />
          </View>
        </View>

        {/* ── What verification gives you ──────────────────────────────────── */}
        <Text style={[s.sectionTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "인증 혜택" : "認証のメリット"}
        </Text>
        <View style={[s.benefitCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          {[
            {
              icon: "zap" as const,
              ko: "상위 매칭 우선 노출 — 인증 회원 우선",
              ja: "上位マッチ優先表示 — 認証メンバー優先",
            },
            {
              icon: "shield" as const,
              ko: "잠금 해제 — 인증 완료 시 연락처 공유 가능",
              ja: "アンロック — 認証後に連絡先共有が可能",
            },
            {
              icon: "star" as const,
              ko: "신뢰 배지 — 프로필에 레이어별 배지 표시",
              ja: "信頼バッジ — プロフィールにレイヤー別バッジ表示",
            },
          ].map((b, i) => (
            <View key={i} style={[s.benefitRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <Feather name={b.icon} size={15} color={colors.rose} />
              <Text style={[s.benefitText, { color: colors.charcoalMid }]}>
                {lang === "ko" ? b.ko : b.ja}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Layer cards ──────────────────────────────────────────────────── */}
        <Text style={[s.sectionTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "인증 레이어" : "認証レイヤー"}
        </Text>
        <View style={[s.layerCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
          {TRUST_LAYERS.map((layer, i) => {
            const status = profile.trustProfile[layer.key]?.status ?? "none";
            const isActionable = status === "none" || status === "failed";
            const cta = LAYER_CTA[layer.key];

            return (
              <View
                key={layer.key}
                style={[
                  s.layerSection,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                ]}
              >
                <TrustLayerRow
                  layerKey={layer.key}
                  trustProfile={profile.trustProfile}
                  lang={lang}
                />

                {isActionable && (
                  <Pressable
                    style={[s.ctaBtn, { backgroundColor: `${layer.color}10`, borderColor: `${layer.color}30` }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      cta.onPress(lang);
                    }}
                  >
                    <Feather name="arrow-right" size={13} color={layer.color} />
                    <Text style={[s.ctaText, { color: layer.color }]}>
                      {lang === "ko" ? cta.labelKo : cta.labelJa}
                    </Text>
                  </Pressable>
                )}

                {status === "pending" && (
                  <View style={[s.pendingBanner, { backgroundColor: "#FFF8EC", borderColor: "#B07D1A30" }]}>
                    <Feather name="clock" size={12} color="#B07D1A" />
                    <Text style={[s.pendingText, { color: "#B07D1A" }]}>
                      {lang === "ko"
                        ? "검토 중입니다. 보통 1-3 영업일 소요됩니다."
                        : "審査中です。通常1〜3営業日かかります。"}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* ── Re-verification notice ────────────────────────────────────────── */}
        <View style={[s.noticeCard, { backgroundColor: "#FFF8EC", borderColor: "#B07D1A25" }]}>
          <Feather name="info" size={14} color="#B07D1A" />
          <Text style={[s.noticeText, { color: "#7A5A10" }]}>
            {lang === "ko"
              ? "프로필 사진을 변경하면 얼굴 인증이 초기화됩니다. 새 사진 업로드 후 재인증이 필요합니다."
              : "プロフィール写真を変更すると顔認証がリセットされます。新しい写真のアップロード後に再認証が必要です。"}
          </Text>
        </View>

        {/* ── Suspicious activity note ─────────────────────────────────────── */}
        <View style={[s.noticeCard, { backgroundColor: "#FFF0F3", borderColor: "#D8587025", marginTop: 0 }]}>
          <Feather name="alert-triangle" size={14} color={colors.rose} />
          <Text style={[s.noticeText, { color: "#8B2A3C" }]}>
            {lang === "ko"
              ? "의심스러운 활동이 감지되면 추가 인증이 자동으로 요청될 수 있습니다."
              : "不審な活動が検出された場合、追加認証が自動的に要求される場合があります。"}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  backBtn: { padding: 6, marginLeft: -6 },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: -0.4,
  },

  scroll: { paddingHorizontal: 20, paddingTop: 8 },

  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 24,
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  // Score card
  scoreCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scoreTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  scoreCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumber: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -1,
  },
  scoreOf: {
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    marginTop: -2,
  },
  scoreRight: { flex: 1 },
  scoreName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 4,
  },
  scoreDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 8,
  },
  scoreBand: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  scoreBandText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
  },

  // Benefit card
  benefitCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  benefitText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
    flex: 1,
  },

  // Layer section
  layerCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  layerSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 0,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 2,
    marginLeft: 56,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12.5,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 2,
    marginLeft: 56,
  },
  pendingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },

  // Notices
  noticeCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
  },
  noticeText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    lineHeight: 19,
    flex: 1,
  },
});
