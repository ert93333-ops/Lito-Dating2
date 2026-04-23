/**
 * ZeroCreditSheet
 *
 * zero_credit 상태 전용 Bottom sheet.
 * - paywall 허용 (코칭 팩 보기)
 * - CTA: "코칭 팩 보기" / "그냥 기본 채팅 계속하기"
 * - draft/context 유지
 * - 기본 채팅과 번역은 계속 무료임을 명시
 * - purchase failed와 혼합 금지 (이 시트는 zero_credit 전용)
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
  onBuyCredits: () => void;
  trialRemaining?: number;
  paidRemaining?: number;
  secondaryCta?: string;
}

export function ZeroCreditSheet({ visible, onDismiss, onBuyCredits, trialRemaining, paidRemaining, secondaryCta }: Props) {
  const colors = useColors();
  const { lang } = useLocale();

  if (!visible) return null;

  const showBalance = (trialRemaining !== undefined) || (paidRemaining !== undefined);

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onDismiss} activeOpacity={1} />
        <View style={[styles.sheet, { backgroundColor: colors.white }]}>

          <View style={[styles.iconWrap, { backgroundColor: "#FFF0F3" }]}>
            <FIcon name="zap" size={26} color={colors.rose} />
          </View>

          <Text style={[styles.title, { color: colors.charcoal }]}>
            {lang === "ko" ? "AI 코칭 크레딧이 없어요" : "AIコーチングクレジットがありません"}
          </Text>
          <Text style={[styles.body, { color: colors.charcoalMid }]}>
            {lang === "ko"
              ? "더 많은 AI 코칭을 이용하려면 크레딧이 필요해요.\n기본 채팅과 번역은 크레딧 없이도 계속 무료입니다."
              : "AIコーチングをもっと利用するにはクレジットが必要です。\n基本チャットと翻訳はクレジットなしで引き続き無料です。"}
          </Text>

          {showBalance && (
            <View style={[styles.balanceRow, { borderColor: colors.border }]}>
              {trialRemaining !== undefined && (
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceNum, { color: colors.charcoal }]}>{trialRemaining}</Text>
                  <Text style={[styles.balanceLabel, { color: colors.charcoalLight }]}>
                    {lang === "ko" ? "체험" : "トライアル"}
                  </Text>
                </View>
              )}
              {trialRemaining !== undefined && paidRemaining !== undefined && (
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
              )}
              {paidRemaining !== undefined && (
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceNum, { color: colors.charcoal }]}>{paidRemaining}</Text>
                  <Text style={[styles.balanceLabel, { color: colors.charcoalLight }]}>
                    {lang === "ko" ? "유료" : "有料"}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.rose }]}
            onPress={onBuyCredits}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryBtnText}>
              {lang === "ko" ? "코칭 팩 보기" : "コーチングパックを見る"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={onDismiss} activeOpacity={0.7}>
            <Text style={[styles.secondaryBtnText, { color: colors.charcoalMid }]}>
              {secondaryCta ?? (lang === "ko" ? "그냥 기본 채팅 계속하기" : "基本チャットを続ける")}
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
  balanceRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    gap: 24,
    alignSelf: "stretch",
    justifyContent: "center",
    marginTop: 4,
  },
  balanceItem: { alignItems: "center", gap: 2 },
  balanceNum: { fontFamily: "Inter_700Bold", fontSize: 22 },
  balanceLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  divider: { width: 1, alignSelf: "stretch" },
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
