/**
 * UnsafeNotice
 *
 * unsafe_interaction 상태 전용 배너.
 * - paywall 금지
 * - coach CTA 숨김/비활성
 * - CTA: 신고하기 / 차단하기 / 도움말 보기
 * - 번역 / 원문 보기 유지
 * - 서버 상태 갱신 시 즉시 반영
 */

import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import FIcon from "@/components/FIcon";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

interface Props {
  onReport: () => void;
  onBlock: () => void;
  onHelp?: () => void;
}

export function UnsafeNotice({ onReport, onBlock, onHelp }: Props) {
  const colors = useColors();
  const { lang } = useLocale();

  return (
    <View style={[styles.container, { backgroundColor: "#FFF7ED", borderColor: "#F59E0B" }]}>
      <View style={styles.headerRow}>
        <FIcon name="alert-triangle" size={16} color="#B45309" />
        <Text style={[styles.title, { color: "#92400E" }]}>
          {lang === "ko" ? "안전 알림" : "安全通知"}
        </Text>
      </View>
      <Text style={[styles.body, { color: "#78350F" }]}>
        {lang === "ko"
          ? "이 대화에서 부적절한 내용이 감지되었어요. AI 코치는 일시적으로 사용할 수 없습니다. 채팅과 번역은 계속 이용할 수 있어요."
          : "この会話で不適切なコンテンツが検出されました。AIコーチは一時的にご利用いただけません。チャットと翻訳は引き続きご利用いただけます。"}
      </Text>
      <View style={styles.ctaRow}>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: "#DC2626" }]}
          onPress={onReport}
          activeOpacity={0.85}
        >
          <FIcon name="flag" size={13} color="#fff" />
          <Text style={styles.ctaBtnText}>
            {lang === "ko" ? "신고하기" : "通報する"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.ctaBtn, { backgroundColor: "#374151" }]}
          onPress={onBlock}
          activeOpacity={0.85}
        >
          <FIcon name="slash" size={13} color="#fff" />
          <Text style={styles.ctaBtnText}>
            {lang === "ko" ? "차단하기" : "ブロックする"}
          </Text>
        </TouchableOpacity>
        {onHelp && (
          <TouchableOpacity
            style={[styles.ctaBtn, { backgroundColor: "#6B7280" }]}
            onPress={onHelp}
            activeOpacity={0.85}
          >
            <FIcon name="info" size={13} color="#fff" />
            <Text style={styles.ctaBtnText}>
              {lang === "ko" ? "도움말" : "ヘルプ"}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontFamily: "Inter_700Bold", fontSize: 13 },
  body: { fontFamily: "Inter_400Regular", fontSize: 13, lineHeight: 19 },
  ctaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  ctaBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#fff" },
});
