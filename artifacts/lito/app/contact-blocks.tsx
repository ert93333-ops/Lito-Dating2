/**
 * contact-blocks.tsx — 연락처 차단 화면
 *
 * 기기 연락처를 읽어 SHA-256으로 해시한 뒤 서버에 업로드한다.
 * 원본 전화번호는 기기 밖으로 나가지 않는다.
 *
 * 흐름:
 *  1. 연락처 접근 권한 요청
 *  2. 전화번호 정규화 (국가코드 포함 E.164)
 *  3. SHA-256 해시 (expo-crypto)
 *  4. 서버에 해시 배열 POST → 매칭 유저를 discover에서 제외
 *  5. 자신의 전화번호 해시도 등록 (상대방 연락처에서 나를 차단하게 함)
 */

import * as Contacts from "expo-contacts";
import * as Crypto from "expo-crypto";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { API_BASE } from "@/utils/api";

type SyncState = "idle" | "requesting" | "reading" | "hashing" | "uploading" | "done" | "error";

/** 전화번호를 최대한 E.164 형태로 정규화 (숫자만, 0으로 시작하면 KR 기본 82 추가) */
function normalizePhone(raw: string, defaultCountryCode = "82"): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return defaultCountryCode + digits.slice(1);
  return digits;
}

async function sha256(text: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    text
  );
  return digest;
}

export default function ContactBlocksScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { token } = useApp();
  const { lang } = useLocale();

  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [blockedCount, setBlockedCount] = useState<number | null>(null);
  const [newlyBlocked, setNewlyBlocked] = useState<number | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<Contacts.PermissionStatus | null>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const ko = lang === "ko";

  // 현재 차단 수 조회
  const fetchCount = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/contact/block/count`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json() as { count: number };
        setBlockedCount(data.count);
      }
    } catch {
      // 조회 실패는 무시
    }
  }, [token]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  const handleSync = useCallback(async () => {
    if (!token) return;
    setSyncState("requesting");
    setNewlyBlocked(null);

    try {
      // 1. 권한 요청
      const { status } = await Contacts.requestPermissionsAsync();
      setPermissionStatus(status);

      if (status !== Contacts.PermissionStatus.GRANTED) {
        setSyncState("idle");
        Alert.alert(
          ko ? "연락처 접근 거부" : "連絡先アクセス拒否",
          ko
            ? "설정에서 연락처 접근을 허용해주세요."
            : "設定から連絡先へのアクセスを許可してください。"
        );
        return;
      }

      // 2. 연락처 읽기
      setSyncState("reading");
      const { data: contacts } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });

      // 전화번호 추출 및 정규화
      const phones: string[] = [];
      for (const contact of contacts) {
        for (const pn of contact.phoneNumbers ?? []) {
          const raw = pn.number ?? "";
          if (raw.replace(/\D/g, "").length >= 7) {
            phones.push(normalizePhone(raw));
          }
        }
      }

      const uniquePhones = Array.from(new Set(phones));

      // 3. SHA-256 해시 (기기에서)
      setSyncState("hashing");
      const hashes: string[] = [];
      for (const phone of uniquePhones) {
        hashes.push(await sha256(phone));
      }

      // 4. 서버에 업로드
      setSyncState("uploading");
      const res = await fetch(`${API_BASE}/api/contact/block`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hashes }),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { blocked: number; total: number };

      setNewlyBlocked(data.blocked);
      setBlockedCount(data.total);
      setSyncState("done");
    } catch (err) {
      console.error("[contact-blocks] sync error:", err);
      setSyncState("error");
    }
  }, [token, ko]);

  const handleClear = useCallback(() => {
    Alert.alert(
      ko ? "연락처 차단 해제" : "連絡先ブロック解除",
      ko
        ? "모든 연락처 차단을 해제할까요? 해제 후 해당 사용자들이 다시 discover에 나타납니다."
        : "すべての連絡先ブロックを解除しますか？",
      [
        { text: ko ? "취소" : "キャンセル", style: "cancel" },
        {
          text: ko ? "해제" : "解除",
          style: "destructive",
          onPress: async () => {
            if (!token) return;
            try {
              await fetch(`${API_BASE}/api/contact/block`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` },
              });
              setBlockedCount(0);
              setNewlyBlocked(null);
              setSyncState("idle");
            } catch {
              Alert.alert(ko ? "오류" : "エラー", ko ? "초기화에 실패했습니다." : "初期化に失敗しました。");
            }
          },
        },
      ]
    );
  }, [token, ko]);

  const isLoading =
    syncState === "requesting" ||
    syncState === "reading" ||
    syncState === "hashing" ||
    syncState === "uploading";

  const stateLabel: Record<SyncState, string> = {
    idle: "",
    requesting: ko ? "연락처 권한 요청 중..." : "連絡先の許可を要求中...",
    reading: ko ? "연락처 읽는 중..." : "連絡先を読み込み中...",
    hashing: ko ? "개인정보 보호 처리 중..." : "プライバシー処理中...",
    uploading: ko ? "동기화 중..." : "同期中...",
    done: "",
    error: ko ? "오류가 발생했습니다. 다시 시도해 주세요." : "エラーが発生しました。もう一度お試しください。",
  };

  return (
    <View style={[s.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <FIcon name="chevron-left" size={24} color={colors.charcoal} />
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: colors.charcoal }]}>
          {ko ? "연락처 차단" : "連絡先ブロック"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomPad + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy notice card */}
        <View style={[s.privacyCard, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}>
          <FIcon name="shield" size={20} color={colors.rose} />
          <View style={s.privacyTextWrap}>
            <Text style={[s.privacyTitle, { color: colors.rose }]}>
              {ko ? "원본 번호는 기기 밖으로 나가지 않습니다" : "電話番号はデバイス外に送信されません"}
            </Text>
            <Text style={[s.privacyDesc, { color: colors.charcoalMid }]}>
              {ko
                ? "전화번호를 기기에서 SHA-256으로 암호화한 뒤, 암호화된 값만 서버에 전송합니다. 원본 번호는 서버에 저장되지 않습니다."
                : "電話番号はデバイス上でSHA-256暗号化され、暗号化された値のみサーバーに送信されます。元の番号はサーバーに保存されません。"}
            </Text>
          </View>
        </View>

        {/* Current status */}
        {blockedCount !== null && (
          <View style={[s.statusCard, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[s.statusCount, { color: colors.charcoal }]}>
              {blockedCount}
            </Text>
            <Text style={[s.statusLabel, { color: colors.charcoalLight }]}>
              {ko ? "명의 연락처가 차단되어 있습니다" : "件の連絡先がブロックされています"}
            </Text>
          </View>
        )}

        {/* Sync result */}
        {syncState === "done" && newlyBlocked !== null && (
          <View style={[s.resultCard, { backgroundColor: "#F0FFF4", borderColor: "#BBF7D0" }]}>
            <FIcon name="check-circle" size={20} color="#16A34A" />
            <Text style={[s.resultText, { color: "#166534" }]}>
              {ko
                ? `연락처 동기화 완료. ${newlyBlocked}명이 새로 차단되었습니다.`
                : `連絡先を同期しました。${newlyBlocked}件を新たにブロックしました。`}
            </Text>
          </View>
        )}

        {/* Error */}
        {syncState === "error" && (
          <View style={[s.resultCard, { backgroundColor: "#FFF1F2", borderColor: "#FECDD3" }]}>
            <FIcon name="alert-circle" size={20} color="#E11D48" />
            <Text style={[s.resultText, { color: "#9F1239" }]}>
              {stateLabel.error}
            </Text>
          </View>
        )}

        {/* Loading state */}
        {isLoading && (
          <View style={s.loadingRow}>
            <ActivityIndicator size="small" color={colors.rose} />
            <Text style={[s.loadingText, { color: colors.charcoalMid }]}>
              {stateLabel[syncState]}
            </Text>
          </View>
        )}

        {/* What this does */}
        <View style={s.howWrap}>
          <Text style={[s.howTitle, { color: colors.charcoal }]}>
            {ko ? "이 기능은 어떻게 작동하나요?" : "この機能の仕組みは？"}
          </Text>
          {[
            ko ? "기기 연락처에서 전화번호를 읽어 암호화합니다" : "連絡先から電話番号を読み取り暗号化します",
            ko ? "같은 번호로 가입한 lito 사용자를 discover에서 숨깁니다" : "同じ番号で登録したlitoユーザーをdiscoverから非表示にします",
            ko ? "차단된 사람은 나를 볼 수 없고, 나도 그 사람을 볼 수 없습니다" : "ブロックした相手はあなたを見られず、あなたも相手を見られません",
            ko ? "언제든 차단을 해제할 수 있습니다" : "いつでもブロックを解除できます",
          ].map((text, i) => (
            <View key={i} style={s.howRow}>
              <View style={[s.howDot, { backgroundColor: colors.rose }]} />
              <Text style={[s.howText, { color: colors.charcoalMid }]}>{text}</Text>
            </View>
          ))}
        </View>

        {/* Sync button */}
        <TouchableOpacity
          style={[s.syncBtn, { backgroundColor: colors.rose }, isLoading && { opacity: 0.6 }]}
          onPress={handleSync}
          disabled={isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <FIcon name="users" size={18} color="#fff" />
              <Text style={s.syncBtnText}>
                {ko ? "연락처 동기화" : "連絡先を同期"}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Clear button */}
        {blockedCount !== null && blockedCount > 0 && (
          <TouchableOpacity
            style={[s.clearBtn, { borderColor: colors.border }]}
            onPress={handleClear}
            activeOpacity={0.8}
          >
            <Text style={[s.clearBtnText, { color: colors.charcoalMid }]}>
              {ko ? "연락처 차단 전체 해제" : "すべての連絡先ブロックを解除"}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  privacyCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  privacyTextWrap: { flex: 1 },
  privacyTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 6,
  },
  privacyDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  statusCard: {
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusCount: {
    fontFamily: "Inter_700Bold",
    fontSize: 40,
    letterSpacing: -1,
  },
  statusLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: 4,
  },
  resultCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  resultText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  loadingRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  loadingText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  howWrap: { gap: 10 },
  howTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 4,
  },
  howRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
  },
  howDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 6,
  },
  howText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    flex: 1,
    lineHeight: 20,
  },
  syncBtn: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  syncBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  clearBtn: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  clearBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
});
