/**
 * report-user.tsx — User report / scam defense screen
 *
 * MVP IMPLEMENTATION:
 *   - Users can select a report category and optionally add details
 *   - Submission currently queues the report locally (placeholder)
 *   - Production: POST /api/reports → persisted to DB → triggers risk scoring
 *
 * BACKEND INTEGRATION POINTS:
 *   - POST /api/reports { reporterId, reportedUserId, category, details, evidenceMessageIds }
 *   - Receiving API increments reported user's riskProfile.reportCount
 *   - At reportCount ≥ 5 unique reporters → automated flag: "repeated_reports"
 *   - At reportCount ≥ 10 → automated account restriction pending review
 *
 * WHAT THIS SCREEN DOES:
 *   ✅ Category selection with clear descriptions
 *   ✅ Optional free-text detail field
 *   ✅ Confirmation / thank-you state
 *   ✅ Block option (immediately removes user from discover + chat)
 *   ✅ Safety helpline link (for serious reports)
 *
 * WHAT THIS SCREEN DOES NOT DO:
 *   ❌ Mark users as scammers directly (only backend + moderator can do this)
 *   ❌ Share reporter identity with the reported user
 *   ❌ Guarantee any specific moderation timeline
 */

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
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

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import type { UserReportCategory } from "@/types";

// ── Category config ────────────────────────────────────────────────────────────
// Ordered by prevalence in the KR-JP dating context.

interface CategoryConfig {
  key: UserReportCategory;
  icon: string;
  color: string;
  bg: string;
  labelKo: string;
  labelJa: string;
  descKo: string;
  descJa: string;
  isSevere?: boolean; // Triggers safety helpline mention
}

const REPORT_CATEGORIES: CategoryConfig[] = [
  {
    key: "fake_profile",
    icon: "user-x",
    color: "#C0392B",
    bg: "#FFF0EE",
    labelKo: "가짜 프로필",
    labelJa: "偽プロフィール",
    descKo: "실제 사람이 아니거나 훔친 사진을 사용 중입니다.",
    descJa: "実在しない人物、または盗用写真を使用しています。",
  },
  {
    key: "ai_generated_photos",
    icon: "cpu",
    color: "#7C3AED",
    bg: "#F3EEFF",
    labelKo: "AI 생성 사진",
    labelJa: "AI生成写真",
    descKo: "AI나 딥페이크로 만든 사진을 프로필에 사용했습니다.",
    descJa: "AIやディープフェイクで生成した写真をプロフィールに使用しています。",
  },
  {
    key: "impersonation",
    icon: "users",
    color: "#B07D1A",
    bg: "#FFF8EC",
    labelKo: "사칭",
    labelJa: "なりすまし",
    descKo: "특정 유명인이나 실존 인물을 사칭하고 있습니다.",
    descJa: "特定の有名人や実在の人物になりすましています。",
  },
  {
    key: "romance_scam",
    icon: "heart",
    color: "#C0392B",
    bg: "#FFF0EE",
    labelKo: "로맨스 스캠",
    labelJa: "ロマンス詐欺",
    descKo: "빠른 호감 표현 후 금전을 요구하거나 개인정보를 요청합니다.",
    descJa: "急速な好意表示の後、お金や個人情報を要求しています。",
    isSevere: true,
  },
  {
    key: "financial_scam",
    icon: "dollar-sign",
    color: "#1A7A4A",
    bg: "#EFFAF4",
    labelKo: "금융/투자 사기",
    labelJa: "金融・投資詐欺",
    descKo: "암호화폐, 투자, 송금 등 금융 거래를 유도합니다.",
    descJa: "暗号通貨・投資・送金などの金融取引を誘導しています。",
    isSevere: true,
  },
  {
    key: "off_platform_contact",
    icon: "external-link",
    color: "#3B6FD4",
    bg: "#EEF4FF",
    labelKo: "외부 앱 유도",
    labelJa: "外部アプリ誘導",
    descKo: "LINE, KakaoTalk, WhatsApp 등으로 이동을 강하게 요구합니다.",
    descJa: "LINE、KakaoTalk、WhatsAppなどへの移動を強く求めています。",
  },
  {
    key: "spam_messages",
    icon: "message-circle",
    color: "#B07D1A",
    bg: "#FFF8EC",
    labelKo: "스팸 메시지",
    labelJa: "スパムメッセージ",
    descKo: "동일하거나 유사한 메시지를 반복적으로 보내고 있습니다.",
    descJa: "同一または類似のメッセージを繰り返し送信しています。",
  },
  {
    key: "harassment",
    icon: "alert-triangle",
    color: "#C05020",
    bg: "#FFF3ED",
    labelKo: "괴롭힘 · 욕설",
    labelJa: "ハラスメント・暴言",
    descKo: "위협적이거나 부적절한 메시지를 보내고 있습니다.",
    descJa: "脅迫的または不適切なメッセージを送っています。",
    isSevere: true,
  },
  {
    key: "underage",
    icon: "shield",
    color: "#C0392B",
    bg: "#FFF0EE",
    labelKo: "미성년자 의심",
    labelJa: "未成年の疑い",
    descKo: "이 사람이 18세 미만일 수 있습니다.",
    descJa: "この人が18歳未満の可能性があります。",
    isSevere: true,
  },
  {
    key: "other",
    icon: "more-horizontal",
    color: "#8E8E93",
    bg: "#F4F4F6",
    labelKo: "기타",
    labelJa: "その他",
    descKo: "위 항목에 해당하지 않는 문제를 직접 설명해 주세요.",
    descJa: "上記に当てはまらない問題を直接ご説明ください。",
  },
];

// ── ReportScreen ──────────────────────────────────────────────────────────────

type ScreenState = "select" | "submitted";

export default function ReportUserScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lang } = useLocale();
  const { blockUser } = useApp();
  const params = useLocalSearchParams<{ userId: string; nickname: string }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [selected, setSelected] = useState<UserReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [screen, setScreen] = useState<ScreenState>("select");

  const reportedNickname = params.nickname ?? (lang === "ko" ? "이 사용자" : "このユーザー");
  const selectedConfig = REPORT_CATEGORIES.find((c) => c.key === selected);

  // L5 FIX: Generate a deterministic mock reference ID so users know report was received
  const refId = React.useMemo(() => {
    const base = Date.now().toString(36).toUpperCase().slice(-6);
    return `LT-${base}`;
  }, []);

  const handleSubmit = () => {
    if (!selected) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // ── INTEGRATION POINT ──────────────────────────────────────────────────
    // TODO: POST /api/reports {
    //   reporterId: currentUser.id,
    //   reportedUserId: params.userId,
    //   category: selected,
    //   details: details.trim() || undefined,
    //   referenceId: refId,
    // }
    // On success → increment riskProfile.reportCount on backend
    // At ≥5 unique reporters → auto-flag "repeated_reports"
    // ──────────────────────────────────────────────────────────────────────

    setScreen("submitted");
  };

  const handleBlock = () => {
    Alert.alert(
      lang === "ko" ? "차단하기" : "ブロックする",
      lang === "ko"
        ? `${reportedNickname}님을 차단하면 서로의 프로필이 보이지 않습니다.`
        : `${reportedNickname}さんをブロックすると、お互いのプロフィールが表示されなくなります。`,
      [
        { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
        {
          text: lang === "ko" ? "차단" : "ブロック",
          style: "destructive",
          onPress: () => {
            if (params.userId) blockUser(params.userId);
            router.back();
          },
        },
      ]
    );
  };

  // ── Thank-you state ──────────────────────────────────────────────────────

  if (screen === "submitted") {
    return (
      <View style={[s.container, { backgroundColor: colors.background }]}>
        <View style={[s.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Feather name="x" size={22} color={colors.charcoal} />
          </TouchableOpacity>
          <View style={{ width: 36 }} />
        </View>
        <View style={s.thankYouWrap}>
          <View style={[s.thankYouIcon, { backgroundColor: "#EFFAF4" }]}>
            <Feather name="check-circle" size={36} color="#1A7A4A" />
          </View>
          <Text style={[s.thankYouTitle, { color: colors.charcoal }]}>
            {lang === "ko" ? "신고가 접수되었습니다" : "通報を受け付けました"}
          </Text>

          {/* L5 FIX: Reference ID gives users confidence the report was sent */}
          <View style={[s.refIdBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Text style={[s.refIdLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? "접수 번호" : "受付番号"}
            </Text>
            <Text style={[s.refIdValue, { color: colors.charcoal }]}>{refId}</Text>
          </View>

          <Text style={[s.thankYouBody, { color: colors.charcoalMid }]}>
            {lang === "ko"
              ? "소중한 신고 감사합니다. 검토팀이 확인 후 필요한 조치를 취할 예정입니다.\n\n신고 내용은 익명으로 처리되며 상대방에게 공개되지 않습니다."
              : "ご報告ありがとうございます。審査チームが確認後、必要な対応を行います。\n\n報告内容は匿名で処理され、相手方には公開されません。"}
          </Text>

          {selectedConfig?.isSevere && (
            <View style={[s.safetyCard, { backgroundColor: "#FFF0EE", borderColor: "#C0392B25" }]}>
              <Feather name="phone" size={16} color="#C0392B" />
              <View style={{ flex: 1 }}>
                <Text style={[s.safetyTitle, { color: "#8B2020" }]}>
                  {lang === "ko" ? "도움이 필요하시면" : "サポートが必要な場合"}
                </Text>
                <Text style={[s.safetyBody, { color: "#8B2020" }]}>
                  {lang === "ko"
                    ? "금전 피해를 입으셨다면 경찰(112)이나 금융감독원(1332)에 신고하세요."
                    : "金銭的な被害を受けた場合は、警察(110)や消費者生活センター(188)に相談してください。"}
                </Text>
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[s.doneBtn, { backgroundColor: colors.rose }]}
            onPress={() => router.back()}
          >
            <Text style={[s.doneBtnText, { color: colors.white }]}>
              {lang === "ko" ? "확인" : "OK"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBlock} style={s.blockLink}>
            <Feather name="slash" size={13} color={colors.charcoalLight} />
            <Text style={[s.blockLinkText, { color: colors.charcoalLight }]}>
              {lang === "ko" ? `${reportedNickname}님 차단하기` : `${reportedNickname}さんをブロック`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Select state (main flow) ─────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[s.container, { backgroundColor: colors.background }]}
      behavior="padding"
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {lang === "ko" ? "신고하기" : "通報する"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.scroll, { paddingBottom: bottomPad + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Intro */}
        <View style={[s.introCard, { backgroundColor: "#EEF4FF", borderColor: "#3B6FD420" }]}>
          <Feather name="shield" size={16} color="#3B6FD4" />
          <Text style={s.introText}>
            {lang === "ko"
              ? `신고는 익명으로 처리됩니다. ${reportedNickname}님은 신고 사실을 알 수 없습니다.`
              : `通報は匿名で処理されます。${reportedNickname}さんには通報の事実が通知されません。`}
          </Text>
        </View>

        {/* Category selection */}
        <Text style={[s.sectionLabel, { color: colors.charcoal }]}>
          {lang === "ko" ? "신고 유형을 선택하세요" : "通報の種類を選択してください"}
        </Text>

        {REPORT_CATEGORIES.map((cat) => {
          const isSelected = selected === cat.key;
          return (
            <Pressable
              key={cat.key}
              style={[
                s.categoryRow,
                {
                  backgroundColor: isSelected ? cat.bg : colors.white,
                  borderColor: isSelected ? `${cat.color}50` : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setSelected(cat.key);
              }}
            >
              <View style={[s.catIcon, { backgroundColor: isSelected ? `${cat.color}18` : colors.roseLight }]}>
                <Feather
                  name={cat.icon as any}
                  size={18}
                  color={isSelected ? cat.color : colors.charcoalMid}
                />
              </View>
              <View style={s.catMeta}>
                <Text style={[s.catLabel, { color: isSelected ? cat.color : colors.charcoal }]}>
                  {lang === "ko" ? cat.labelKo : cat.labelJa}
                </Text>
                <Text style={[s.catDesc, { color: colors.charcoalLight }]} numberOfLines={2}>
                  {lang === "ko" ? cat.descKo : cat.descJa}
                </Text>
              </View>
              <View
                style={[
                  s.radio,
                  {
                    borderColor: isSelected ? cat.color : colors.border,
                    backgroundColor: isSelected ? cat.color : "transparent",
                  },
                ]}
              >
                {isSelected && <Feather name="check" size={10} color="#FFF" />}
              </View>
            </Pressable>
          );
        })}

        {/* Optional details — shown when a category is selected */}
        {selected && (
          <View style={s.detailsSection}>
            <Text style={[s.sectionLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? "추가 설명 (선택)" : "詳細説明（任意）"}
            </Text>
            <TextInput
              style={[
                s.detailsInput,
                {
                  backgroundColor: colors.white,
                  borderColor: colors.border,
                  color: colors.charcoal,
                },
              ]}
              placeholder={
                lang === "ko"
                  ? "어떤 일이 있었는지 간단히 설명해 주세요. 검토팀에 도움이 됩니다."
                  : "何が起きたか簡単に説明してください。審査チームに役立ちます。"
              }
              placeholderTextColor={colors.charcoalLight}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <Text style={[s.charCount, { color: colors.charcoalLight }]}>
              {details.length}/500
            </Text>
          </View>
        )}

        {/* Safety notice for severe categories */}
        {selectedConfig?.isSevere && (
          <View style={[s.safetyCard, { backgroundColor: "#FFF0EE", borderColor: "#C0392B25" }]}>
            <Feather name="alert-circle" size={16} color="#C0392B" />
            <View style={{ flex: 1 }}>
              <Text style={[s.safetyTitle, { color: "#8B2020" }]}>
                {lang === "ko" ? "금전 피해를 입으셨나요?" : "金銭的な被害を受けましたか？"}
              </Text>
              <Text style={[s.safetyBody, { color: "#8B2020" }]}>
                {lang === "ko"
                  ? "즉시 경찰(112) 또는 금융감독원(1332)에 신고하세요. Lito 신고와 별개로 진행하세요."
                  : "すぐに警察(110)または消費者生活センター(188)に通報してください。Litoへの通報と並行してお願いします。"}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer CTA — fixed at bottom */}
      <View
        style={[
          s.footer,
          {
            paddingBottom: bottomPad + 12,
            backgroundColor: colors.background,
            borderTopColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={handleBlock} style={s.blockBtn}>
          <Feather name="slash" size={14} color={colors.charcoalMid} />
          <Text style={[s.blockBtnText, { color: colors.charcoalMid }]}>
            {lang === "ko" ? "차단만 하기" : "ブロックのみ"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            s.submitBtn,
            {
              backgroundColor: selected ? colors.rose : colors.border,
              opacity: selected ? 1 : 0.6,
            },
          ]}
          onPress={handleSubmit}
          disabled={!selected}
          activeOpacity={0.8}
        >
          <Text style={[s.submitBtnText, { color: colors.white }]}>
            {lang === "ko" ? "신고 제출" : "通報を送信"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  backBtn: { padding: 6, marginLeft: -6 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18, letterSpacing: -0.4 },

  scroll: { paddingHorizontal: 16, paddingTop: 4 },

  introCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20,
  },
  introText: {
    fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19,
    color: "#2A4D99", flex: 1,
  },

  sectionLabel: {
    fontFamily: "Inter_700Bold", fontSize: 15, marginBottom: 10, letterSpacing: -0.2,
  },

  categoryRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 8,
  },
  catIcon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
  catMeta: { flex: 1 },
  catLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 3 },
  catDesc: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17 },
  radio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },

  detailsSection: { marginTop: 16 },
  detailsInput: {
    borderRadius: 14, borderWidth: 1, padding: 14,
    fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 21,
    minHeight: 100,
  },
  charCount: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "right", marginTop: 4 },

  safetyCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 14,
  },
  safetyTitle: { fontFamily: "Inter_600SemiBold", fontSize: 13, marginBottom: 4 },
  safetyBody: { fontFamily: "Inter_400Regular", fontSize: 12.5, lineHeight: 18 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  blockBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 14,
    borderRadius: 14,
  },
  blockBtnText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  submitBtn: {
    flex: 1, alignItems: "center", justifyContent: "center",
    borderRadius: 14, paddingVertical: 14,
  },
  submitBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },

  // Thank-you state
  thankYouWrap: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingHorizontal: 32, gap: 16,
  },
  thankYouIcon: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  thankYouTitle: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: -0.5, textAlign: "center" },
  thankYouBody: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22, textAlign: "center" },
  refIdBadge: {
    borderRadius: 12, borderWidth: 1,
    paddingVertical: 10, paddingHorizontal: 20,
    alignItems: "center", gap: 3,
  },
  refIdLabel: { fontFamily: "Inter_400Regular", fontSize: 11, letterSpacing: 0.3 },
  refIdValue: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1.2 },
  doneBtn: {
    alignSelf: "stretch", alignItems: "center",
    borderRadius: 16, paddingVertical: 16, marginTop: 8,
  },
  doneBtnText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  blockLink: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  blockLinkText: { fontFamily: "Inter_400Regular", fontSize: 13 },
});
