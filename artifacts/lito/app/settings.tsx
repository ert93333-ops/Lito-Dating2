import FIcon from "@/components/FIcon";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { idNeedsAction } from "@/types";
import { API_BASE } from "@/utils/api";

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { logout, profile, updateProfile, token } = useApp();
  const { lang } = useLocale();
  const appLanguage = profile.language;

  const idStatus = profile.trustProfile.idVerified.status;
  const idNeedsAttention = idNeedsAction(profile.trustProfile);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const SettingRow = ({
    icon,
    label,
    sublabel,
    onPress,
    right,
    danger = false,
    iconBg,
    iconColor: iconColorProp,
  }: {
    icon: string;
    label: string;
    sublabel?: string;
    onPress?: () => void;
    right?: React.ReactNode;
    danger?: boolean;
    iconBg?: string;
    iconColor?: string;
  }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? "#FFEDED" : (iconBg ?? colors.roseLight) }]}>
        <FIcon name={icon as any} size={16} color={danger ? colors.destructive : (iconColorProp ?? colors.rose)} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: danger ? colors.destructive : colors.charcoal }]}>
          {label}
        </Text>
        {sublabel && <Text style={[styles.rowSub, { color: colors.charcoalLight }]}>{sublabel}</Text>}
      </View>
      {right || (onPress && <FIcon name="chevron-right" size={16} color={colors.charcoalLight} />)}
    </TouchableOpacity>
  );

  const handleDeleteAccount = () => {
    Alert.alert(
      lang === "ko" ? "계정 삭제" : "アカウント削除",
      lang === "ko"
        ? "계정을 삭제하면 프로필이 즉시 숨겨지고, 데이터는 법령에 따라 완전히 삭제됩니다. 계속하시겠습니까?"
        : "アカウントを削除するとプロフィールが即座に非表示になり、データは法令に従い完全削除されます。続けますか？",
      [
        { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
        {
          text: lang === "ko" ? "삭제 진행" : "削除を進める",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetch(`${API_BASE}/api/v1/account-deletion/start`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token ?? ""}`,
                },
                body: JSON.stringify({ reason: "user_requested" }),
              });
              if (!res.ok && res.status !== 409) {
                throw new Error("failed");
              }
            } catch {
              // 서버 오류여도 로컬 로그아웃 진행
            }
            logout();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FIcon name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.charcoal }]}>
          {lang === "ko" ? "설정" : "設定"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPad + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Identity & verification ──────────────────────────────────────── */}
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "신원 인증" : "本人確認"}
          </Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="award"
              iconBg="#E8F3FF"
              iconColor="#1A6AEB"
              label={lang === "ko" ? "신뢰 센터" : "信頼センター"}
              sublabel={lang === "ko" ? "인증 현황 및 점수 확인" : "認証状況・スコアを確認"}
              onPress={() => router.push("/trust-center")}
            />
            <SettingRow
              icon="credit-card"
              iconBg="#E8F3FF"
              iconColor="#1A6AEB"
              label={lang === "ko" ? "신분증 인증" : "本人確認書類"}
              sublabel={
                idStatus === "verified"
                  ? lang === "ko" ? "인증 완료" : "認証済み"
                  : idStatus === "pending_review"
                  ? lang === "ko" ? "검토 중" : "審査中"
                  : idStatus === "rejected"
                  ? lang === "ko" ? "인증 실패 — 재시도 필요" : "認証失敗 — 再試行が必要"
                  : idStatus === "reverify_required"
                  ? lang === "ko" ? "재인증 필요" : "再認証が必要"
                  : lang === "ko" ? "미인증 — 인증하면 신뢰도 상승" : "未認証 — 認証で信頼度アップ"
              }
              onPress={() => router.push("/verify-id")}
              right={
                idStatus === "rejected" || idStatus === "reverify_required" ? (
                  <View style={[styles.attentionDot, { backgroundColor: colors.rose }]} />
                ) : undefined
              }
            />
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "지원" : "サポート"}
          </Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="mail"
              iconBg="#E8F8EE"
              iconColor="#1A7A4A"
              label={lang === "ko" ? "지원팀에 문의" : "サポートに連絡"}
              sublabel="litosupport@gmail.com"
              onPress={() => Linking.openURL("mailto:litosupport@gmail.com")}
            />
            <SettingRow
              icon="file-text"
              iconBg="#E8F8EE"
              iconColor="#1A7A4A"
              label={lang === "ko" ? "개인정보 보호정책" : "プライバシーポリシー"}
              onPress={() => Linking.openURL("https://litodate.app/privacy")}
            />
            <SettingRow
              icon="help-circle"
              iconBg="#E8F8EE"
              iconColor="#1A7A4A"
              label={lang === "ko" ? "자주 묻는 질문" : "よくある質問"}
              onPress={() => router.push("/faq")}
            />
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "환경설정" : "設定"}
          </Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="globe"
              iconBg="#F0EBFF"
              iconColor="#6B3FEB"
              label={lang === "ko" ? "앱 언어" : "アプリ言語"}
              sublabel={appLanguage === "ko" ? "한국어" : "日本語"}
              right={
                <View style={styles.langToggle}>
                  {(["ko", "ja"] as const).map((lang) => (
                    <TouchableOpacity
                      key={lang}
                      style={[
                        styles.langBtn,
                        {
                          backgroundColor: appLanguage === lang ? colors.rose : colors.muted,
                          borderColor: appLanguage === lang ? colors.rose : colors.border,
                        },
                      ]}
                      onPress={() =>
                        updateProfile({ country: lang === "ko" ? "KR" : "JP", language: lang })
                      }
                    >
                      <Text
                        style={[
                          styles.langBtnText,
                          { color: appLanguage === lang ? colors.white : colors.charcoalMid },
                        ]}
                      >
                        {lang === "ko" ? "KO" : "JA"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              }
            />
            <SettingRow
              icon="bell"
              iconBg="#E8F3FF"
              iconColor="#1A6AEB"
              label={lang === "ko" ? "알림" : "通知"}
              sublabel={lang === "ko" ? "메시지 · 매칭 · AI 알림 설정" : "メッセージ・マッチ・AI通知設定"}
              onPress={() => router.push("/notification-settings")}
            />
          </View>
        </View>

        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.charcoalLight }]}>
            {lang === "ko" ? "계정" : "アカウント"}
          </Text>
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <SettingRow
              icon="shield"
              iconBg="#F0F1F3"
              iconColor="#5A6480"
              label={lang === "ko" ? "차단 · 신고" : "ブロック・報告"}
              onPress={() => router.push("/blocked-users")}
            />
            <SettingRow
              icon="phone-off"
              iconBg="#FFF3E8"
              iconColor="#C07820"
              label={lang === "ko" ? "연락처 차단" : "連絡先ブロック"}
              sublabel={lang === "ko" ? "연락처에 있는 사람 숨기기" : "連絡先の人を非表示にする"}
              onPress={() => router.push("/contact-blocks")}
            />
            <SettingRow
              icon="log-out"
              iconBg="#F0F1F3"
              iconColor="#5A6480"
              label={lang === "ko" ? "로그아웃" : "ログアウト"}
              onPress={() => {
                Alert.alert(
                  lang === "ko" ? "로그아웃" : "ログアウト",
                  lang === "ko" ? "정말 로그아웃하시겠습니까?" : "本当にログアウトしますか？",
                  [
                    { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
                    { text: lang === "ko" ? "로그아웃" : "ログアウト", style: "destructive", onPress: logout },
                  ]
                );
              }}
            />
            <SettingRow
              icon="trash-2"
              label={lang === "ko" ? "계정 삭제" : "アカウント削除"}
              onPress={handleDeleteAccount}
              danger
            />
          </View>
        </View>

        <View style={[styles.appInfo]}>
          <Text style={[styles.appName, { color: colors.rose }]}>lito</Text>
          <Text style={[styles.appVersion, { color: colors.charcoalLight }]}>Version 1.0.0</Text>
          <Text style={[styles.appTagline, { color: colors.charcoalLight }]}>
            한국과 일본을 잇는 인연 · 韓日をつなぐ縁
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
  },
  sectionWrap: { marginBottom: 8, paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 8,
    paddingTop: 16,
  },
  section: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
  },
  rowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  langToggle: { flexDirection: "row", gap: 6 },
  langBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  langBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  appInfo: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 8,
  },
  appName: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
    letterSpacing: -1,
    marginBottom: 4,
  },
  appVersion: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginBottom: 4,
  },
  appTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  attentionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
