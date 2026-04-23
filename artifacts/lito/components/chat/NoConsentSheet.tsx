/**
 * NoConsentSheet
 *
 * no_consent 상태 전용 Bottom sheet.
 * - 상품 카드 금지
 * - CTA: "동의하고 계속" / "지금은 안 함"
 * - 동의 후 자동 코칭 실행 금지 (onConsentGranted 호출 후 사용자가 다시 눌러야 함)
 * - 기본 채팅/번역은 계속 가능함을 명시
 */

import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import FIcon from "@/components/FIcon";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";

interface Props {
  visible: boolean;
  onDismiss: () => void;
  onConsentGranted: () => void;
  isGranting?: boolean;
}

export function NoConsentSheet({ visible, onDismiss, onConsentGranted, isGranting }: Props) {
  const colors = useColors();
  const { lang } = useLocale();

  if (!visible) return null;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>

          <View style={[styles.iconWrap, { backgroundColor: "#F0F4FF" }]}>
            <FIcon name="shield" size={26} color="#4A6CF7" />
          </View>

          <Text style={[styles.title, { color: colors.charcoal }]}>
            {lang === "ko" ? "AI 코치 이용 동의" : "AIコーチ 利用同意"}
          </Text>
          <Text style={[styles.body, { color: colors.charcoalMid }]}>
            {lang === "ko"
              ? "AI 코치를 사용하려면 AI 데이터 처리에 동의해야 합니다.\n채팅 내용은 사용되지 않으며, 대화 맥락만 참고합니다."
              : "AIコーチを使用するには、AIデータ処理に同意が必要です。\nチャット内容は使用されず、会話の文脈のみを参照します。"}
          </Text>

          <View style={[styles.infoRow, { backgroundColor: colors.roseLight, borderColor: colors.rose }]}>
            <FIcon name="message-circle" size={13} color={colors.rose} />
            <Text style={[styles.infoText, { color: colors.rose }]}>
              {lang === "ko"
                ? "기본 채팅과 번역은 동의 여부와 무관하게 계속 무료입니다."
                : "基本チャットと翻訳は、同意の有無に関わらず引き続き無料です。"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: "#4A6CF7", opacity: isGranting ? 0.6 : 1 }]}
            onPress={onConsentGranted}
            disabled={isGranting}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {isGranting
                ? (lang === "ko" ? "처리 중..." : "処理中...")
                : (lang === "ko" ? "동의하고 계속" : "同意して続ける")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={[styles.secondaryBtnText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "지금은 안 함" : "今はしない"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 18, textAlign: "center" },
  body: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "stretch",
    marginTop: 4,
  },
  infoText: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 17, flex: 1 },
  primaryBtn: {
    alignSelf: "stretch",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, color: "#fff" },
  secondaryBtn: { paddingVertical: 8, paddingHorizontal: 16 },
  secondaryBtnText: { fontFamily: "Inter_400Regular", fontSize: 14 },
});
