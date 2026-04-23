/**
 * app/notification-settings.tsx
 *
 * Notification preferences screen.
 * Loads prefs from server, lets user toggle per-category, saves on unmount/change.
 *
 * Categories (per spec):
 *   messages    — always on, highest priority
 *   matches     — on by default
 *   safety      — always on, cannot be disabled
 *   ai          — off by default (opt-in push)
 *   promotions  — off by default
 *
 * Preview mode: none / name / full
 * Quiet hours: start/end (0–23)
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
// expo-notifications removed from Expo Go (SDK 53+) — use try/require
let Notifications: typeof import("expo-notifications") | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require("expo-notifications");
} catch {
  // Running in Expo Go
}
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { useApp } from "@/context/AppContext";
import FIcon from "@/components/FIcon";

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "";

interface Prefs {
  messagesEnabled: boolean;
  matchesEnabled: boolean;
  safetyEnabled: boolean;
  aiEnabled: boolean;
  promotionsEnabled: boolean;
  previewMode: "none" | "name" | "full";
  quietHoursStart: number;
  quietHoursEnd: number;
}

const DEFAULT_PREFS: Prefs = {
  messagesEnabled: true,
  matchesEnabled: true,
  safetyEnabled: true,
  aiEnabled: false,
  promotionsEnabled: false,
  previewMode: "none",
  quietHoursStart: 22,
  quietHoursEnd: 8,
};

export default function NotificationSettingsScreen() {
  const colors = useColors();
  const { lang } = useLocale();
  const { token: jwt } = useApp();
  const router = useRouter();

  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [osStatus, setOsStatus] = useState<"granted" | "denied" | "unknown">("unknown");

  useEffect(() => {
    const checkOs = async () => {
      if (!Notifications) { setOsStatus("unknown"); return; }
      const { status } = await Notifications.getPermissionsAsync();
      setOsStatus(status === "granted" ? "granted" : status === "denied" ? "denied" : "unknown");
    };
    checkOs();
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      if (!jwt) return;
      try {
        const res = await fetch(`${API_BASE}/api/notifications/preferences`, {
          headers: { Authorization: `Bearer ${jwt}` },
        });
        if (res.ok) {
          const data = await res.json() as Prefs;
          setPrefs({ ...DEFAULT_PREFS, ...data });
        }
      } catch {}
      setLoading(false);
    };
    loadPrefs();
  }, [jwt]);

  const savePrefs = useCallback(
    async (updated: Prefs) => {
      if (!jwt) return;
      try {
        await fetch(`${API_BASE}/api/notifications/preferences`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(updated),
        });
      } catch {}
    },
    [jwt]
  );

  const toggle = useCallback(
    (key: keyof Prefs, value: boolean) => {
      const updated = { ...prefs, [key]: value };
      setPrefs(updated);
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  const setPreviewMode = useCallback(
    (mode: Prefs["previewMode"]) => {
      const updated = { ...prefs, previewMode: mode };
      setPrefs(updated);
      savePrefs(updated);
    },
    [prefs, savePrefs]
  );

  const requestOsPermission = async () => {
    if (osStatus === "denied") {
      Alert.alert(
        lang === "ko" ? "알림 권한" : "通知の許可",
        lang === "ko"
          ? "시스템 설정에서 알림을 허용해주세요."
          : "システム設定から通知を許可してください。",
        [
          { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
          {
            text: lang === "ko" ? "설정 열기" : "設定を開く",
            onPress: () => Linking.openSettings(),
          },
        ]
      );
      return;
    }
    if (!Notifications) return;
    const { status } = await Notifications.requestPermissionsAsync();
    setOsStatus(status === "granted" ? "granted" : "denied");
  };

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.rose} />
      </View>
    );
  }

  const PREVIEW_OPTIONS: Array<{ value: Prefs["previewMode"]; labelKo: string; labelJa: string }> = [
    { value: "none", labelKo: "미리보기 숨김", labelJa: "プレビュー非表示" },
    { value: "name", labelKo: "이름만", labelJa: "名前のみ" },
    { value: "full", labelKo: "전체 내용", labelJa: "全文表示" },
  ];

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <FIcon name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={s.title}>{lang === "ko" ? "알림 설정" : "通知設定"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {osStatus !== "granted" && (
        <TouchableOpacity style={s.permBanner} onPress={requestOsPermission}>
          <FIcon name="bell" size={16} color={colors.rose} />
          <Text style={s.permText}>
            {lang === "ko"
              ? "푸시 알림을 받으려면 권한이 필요해요"
              : "プッシュ通知を受け取るには許可が必要です"}
          </Text>
          <Text style={s.permCta}>{lang === "ko" ? "허용 →" : "許可 →"}</Text>
        </TouchableOpacity>
      )}

      <Text style={s.sectionTitle}>{lang === "ko" ? "알림 유형" : "通知の種類"}</Text>
      <View style={s.card}>
        <Row
          label={lang === "ko" ? "메시지" : "メッセージ"}
          sublabel={lang === "ko" ? "새 메시지 수신 알림" : "新しいメッセージの通知"}
          value={prefs.messagesEnabled}
          onChange={(v) => toggle("messagesEnabled", v)}
          colors={colors}
        />
        <Row
          label={lang === "ko" ? "매칭 / 좋아요" : "マッチ・いいね"}
          sublabel={lang === "ko" ? "새 매칭, 좋아요 알림" : "新しいマッチやいいねの通知"}
          value={prefs.matchesEnabled}
          onChange={(v) => toggle("matchesEnabled", v)}
          colors={colors}
        />
        <Row
          label={lang === "ko" ? "안전 / 보안" : "安全・セキュリティ"}
          sublabel={lang === "ko" ? "계정 보안, 신뢰 알림 (항상 켜짐)" : "アカウントセキュリティ通知（常にオン）"}
          value={true}
          disabled
          onChange={() => {}}
          colors={colors}
        />
        <Row
          label={lang === "ko" ? "AI 인사이트" : "AIインサイト"}
          sublabel={lang === "ko" ? "대화 분석, 코칭 알림 (기본 꺼짐)" : "会話分析・コーチング通知（デフォルトオフ）"}
          value={prefs.aiEnabled}
          onChange={(v) => toggle("aiEnabled", v)}
          colors={colors}
        />
        <Row
          label={lang === "ko" ? "프로모션" : "プロモーション"}
          sublabel={lang === "ko" ? "이벤트, 혜택 알림" : "イベント・特典の通知"}
          value={prefs.promotionsEnabled}
          onChange={(v) => toggle("promotionsEnabled", v)}
          colors={colors}
          last
        />
      </View>

      <Text style={s.sectionTitle}>{lang === "ko" ? "잠금화면 미리보기" : "ロック画面プレビュー"}</Text>
      <View style={s.card}>
        {PREVIEW_OPTIONS.map((opt, i) => (
          <TouchableOpacity
            key={opt.value}
            style={[
              s.optionRow,
              i < PREVIEW_OPTIONS.length - 1 && s.optionBorder,
              { borderColor: colors.border },
            ]}
            onPress={() => setPreviewMode(opt.value)}
          >
            <Text style={[s.optionLabel, { color: colors.charcoal }]}>
              {lang === "ko" ? opt.labelKo : opt.labelJa}
            </Text>
            {prefs.previewMode === opt.value && (
              <FIcon name="check" size={17} color={colors.rose} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.hint}>
        {lang === "ko"
          ? "데이팅앱 특성상 잠금화면에 내용이 노출되지 않도록 '미리보기 숨김'을 권장합니다."
          : "プライバシー保護のため、ロック画面では「プレビュー非表示」を推奨します。"}
      </Text>

      <Text style={s.sectionTitle}>{lang === "ko" ? "방해 금지 시간" : "おやすみモード"}</Text>
      <View style={s.card}>
        <View style={s.quietRow}>
          <Text style={[s.quietLabel, { color: colors.charcoal }]}>
            {lang === "ko"
              ? `${prefs.quietHoursStart}:00 ~ ${prefs.quietHoursEnd}:00`
              : `${prefs.quietHoursStart}:00 〜 ${prefs.quietHoursEnd}:00`}
          </Text>
          <Text style={[s.quietSub, { color: colors.charcoalMid }]}>
            {lang === "ko"
              ? "이 시간에는 메시지·안전 알림만 전달됩니다"
              : "この時間はメッセージ・安全通知のみ届きます"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function Row({
  label,
  sublabel,
  value,
  onChange,
  disabled = false,
  last = false,
  colors,
}: {
  label: string;
  sublabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  last?: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: 14,
          paddingHorizontal: 16,
          gap: 12,
          borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontFamily: "Inter_500Medium", color: colors.charcoal }}>
          {label}
        </Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.charcoalLight, marginTop: 2 }}>
          {sublabel}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: colors.rose }}
        thumbColor={colors.white}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 48 },
    centered: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 56,
      paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backBtn: { width: 40 },
    title: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: colors.charcoal },
    permBanner: {
      margin: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      backgroundColor: colors.roseLight,
      borderRadius: 12,
      padding: 14,
    },
    permText: {
      flex: 1,
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.charcoal,
      lineHeight: 18,
    },
    permCta: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      color: colors.rose,
    },
    sectionTitle: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      color: colors.charcoalLight,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginTop: 24,
      marginBottom: 8,
      marginHorizontal: 20,
    },
    card: {
      marginHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.white,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden",
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    optionBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
    optionLabel: { fontSize: 15, fontFamily: "Inter_400Regular" },
    hint: {
      fontSize: 12,
      fontFamily: "Inter_400Regular",
      color: colors.charcoalLight,
      marginHorizontal: 20,
      marginTop: 8,
      lineHeight: 18,
    },
    quietRow: { paddingVertical: 14, paddingHorizontal: 16, gap: 4 },
    quietLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
    quietSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  });
}
