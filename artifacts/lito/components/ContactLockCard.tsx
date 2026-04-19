/**
 * ContactLockCard
 *
 * 4 states based on conversation.externalUnlocked + unlockRequestState:
 *
 *  LOCKED   — neither unlocked nor request pending  [collapsed by default]
 *  SENT     — I sent a request, waiting for partner [collapsed by default]
 *  RECEIVED — partner sent a request, I need to accept/decline [open by default]
 *  UNLOCKED — externalUnlocked: true → show Instagram handle [open by default]
 *
 * LOCKED and SENT states render as a compact pill row by default.
 * Tapping the pill expands to the full card. Tapping the header row collapses again.
 */

import FIcon from "@/components/FIcon";
import { TrustBadge } from "@/components/TrustBadge";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Clipboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import { computeTrustScore } from "@/types";
import type { Conversation, TrustProfile } from "@/types";

// Enable LayoutAnimation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MIN_TRUST_TO_REQUEST = 25;

interface ContactLockCardProps {
  conversation: Conversation;
  myTrustProfile: TrustProfile;
  lang: "ko" | "ja";
  onRequestUnlock: () => void;
  onRespondUnlock: (accept: boolean) => void;
  onGoToTrustCenter: () => void;
}

export function ContactLockCard({
  conversation,
  myTrustProfile,
  lang,
  onRequestUnlock,
  onRespondUnlock,
  onGoToTrustCenter,
}: ContactLockCardProps) {
  const colors = useColors();
  const myScore = computeTrustScore(myTrustProfile);
  const canRequest = myScore >= MIN_TRUST_TO_REQUEST;

  const handle = conversation.user.instagramHandle;
  const partnerName = conversation.user.nickname.split(" ")[0];

  const isUnlocked = conversation.externalUnlocked;
  const requestState = conversation.unlockRequestState;

  // RECEIVED and UNLOCKED need immediate attention / are positive — open by default.
  // LOCKED and SENT are secondary info — collapsed by default.
  const defaultOpen = isUnlocked || requestState === "received";
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsOpen((prev) => !prev);
  };

  // ── Pulse animation for "sent" state ──────────────────────────────────────
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (requestState !== "sent") return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.65, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [requestState, pulse]);

  // ── Slide-in animation for UNLOCKED state ──────────────────────────────────
  const slideY = useRef(new Animated.Value(-8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isUnlocked) return;
    Animated.parallel([
      Animated.spring(slideY, { toValue: 0, useNativeDriver: true, speed: 18, bounciness: 6 }),
      Animated.timing(fadeIn, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, [isUnlocked, slideY, fadeIn]);

  const handleCopy = () => {
    if (!handle) return;
    if (Platform.OS !== "web") {
      Clipboard.setString(handle);
    }
  };

  // ── UNLOCKED — always open, no toggle needed ──────────────────────────────
  if (isUnlocked) {
    return (
      <Animated.View
        style={[
          styles.card,
          styles.unlockedCard,
          {
            backgroundColor: "#F0FAF4",
            borderColor: "#AEEDC8",
            transform: [{ translateY: slideY }],
            opacity: fadeIn,
          },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#C5F0D8" }]}>
          <FIcon name="instagram" size={15} color="#1A7A4A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: "#1A7A4A" }]}>
            {lang === "ko" ? "인스타그램 공개됨" : "インスタグラム公開"}
          </Text>
          {handle ? (
            <Text style={[styles.handleText, { color: "#1A7A4A" }]}>{handle}</Text>
          ) : (
            <Text style={[styles.cardSub, { color: "#3A8A5A" }]}>
              {lang === "ko"
                ? `${partnerName}님이 아직 핸들을 등록하지 않았어요`
                : `${partnerName}さんはまだ登録していません`}
            </Text>
          )}
        </View>
        {handle && Platform.OS !== "web" && (
          <TouchableOpacity
            style={[styles.copyBtn, { backgroundColor: "#C5F0D8" }]}
            onPress={handleCopy}
            hitSlop={8}
          >
            <FIcon name="send" size={12} color="#1A7A4A" />
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  }

  // ── RECEIVED — always open (partner is waiting for action) ────────────────
  if (requestState === "received") {
    return (
      <View
        style={[
          styles.card,
          styles.receivedCard,
          { backgroundColor: "#FFF8EC", borderColor: "#F5D98A" },
        ]}
      >
        <View style={[styles.iconWrap, { backgroundColor: "#FDEFC2" }]}>
          <FIcon name="instagram" size={15} color="#B07D1A" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: "#8A5D00" }]}>
            {lang === "ko"
              ? `${partnerName}님이 인스타 공개를 요청했어요`
              : `${partnerName}さんがインスタ公開をリクエストしました`}
          </Text>
          <Text style={[styles.cardSub, { color: "#B07D1A" }]}>
            {lang === "ko"
              ? "수락하면 서로의 인스타그램을 볼 수 있어요"
              : "承認するとお互いのインスタグラムが見られます"}
          </Text>
          <View style={styles.respondBtns}>
            <TouchableOpacity
              style={[styles.declineBtn, { borderColor: "#F5D98A" }]}
              onPress={() => onRespondUnlock(false)}
            >
              <Text style={[styles.declineBtnText, { color: "#8A5D00" }]}>
                {lang === "ko" ? "거절" : "断る"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { backgroundColor: "#B07D1A" }]}
              onPress={() => onRespondUnlock(true)}
            >
              <FIcon name="check" size={12} color="#fff" />
              <Text style={styles.acceptBtnText}>
                {lang === "ko" ? "수락하기" : "承認する"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ── SENT — collapsed pill by default ─────────────────────────────────────
  if (requestState === "sent") {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: "#EEF4FF", borderColor: "#C0D0F8", gap: 0 },
        ]}
      >
        {/* Pill row — always visible, tap to toggle */}
        <Pressable style={styles.pillRow} onPress={toggle} hitSlop={4}>
          <Animated.View
            style={[styles.iconWrapSm, { backgroundColor: "#C0D0F8", opacity: pulse }]}
          >
            <FIcon name="send" size={13} color="#3B6FD4" />
          </Animated.View>
          <Text style={[styles.pillLabel, { color: "#1A3D8A", flex: 1 }]}>
            {lang === "ko" ? "인스타 요청 전송됨" : "インスタリクエスト送信済み"}
          </Text>
          <FIcon
            name={isOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color="#3B6FD4"
          />
        </Pressable>

        {/* Expandable body */}
        {isOpen && (
          <View style={styles.expandedBody}>
            <Text style={[styles.cardSub, { color: "#3B6FD4" }]}>
              {lang === "ko"
                ? `${partnerName}님이 수락하면 알려드릴게요`
                : `${partnerName}さんが承認したらお知らせします`}
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ── LOCKED — collapsed pill by default ───────────────────────────────────
  return (
    <View
      style={[
        styles.card,
        styles.lockedCard,
        { backgroundColor: colors.surface, borderColor: colors.border, gap: 0 },
      ]}
    >
      {/* Pill row — always visible, tap to toggle */}
      <Pressable style={styles.pillRow} onPress={toggle} hitSlop={4}>
        <View style={[styles.iconWrapSm, { backgroundColor: colors.roseLight }]}>
          <FIcon name="lock" size={13} color={colors.rose} />
        </View>
        <Text style={[styles.pillLabel, { color: colors.charcoal, flex: 1 }]}>
          {lang === "ko" ? "인스타그램이 잠겨 있어요" : "インスタグラムはロック中"}
        </Text>
        <FIcon
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={14}
          color={colors.charcoalLight}
        />
      </Pressable>

      {/* Expandable body */}
      {isOpen && (
        <View style={styles.expandedBody}>
          {/* Sub-label */}
          <Text style={[styles.cardSub, { color: colors.charcoalLight, marginBottom: 8 }]}>
            {lang === "ko"
              ? "신뢰 인증 후 연락처를 공개 요청할 수 있어요"
              : "信頼認証後、連絡先の公開をリクエストできます"}
          </Text>

          {/* Partner trust info */}
          <View style={[styles.trustRow, { borderColor: colors.border }]}>
            <Text style={[styles.trustLabel, { color: colors.charcoalLight }]}>
              {lang === "ko" ? `${partnerName}님 인증` : `${partnerName}さんの認証`}
            </Text>
            {computeTrustScore(conversation.user.trustProfile) === 0 ? (
              <Text style={[styles.trustLabel, { color: colors.charcoalFaint }]}>
                {lang === "ko" ? "미인증" : "未認証"}
              </Text>
            ) : (
              <TrustBadge
                trustProfile={conversation.user.trustProfile}
                size="sm"
                lang={lang}
              />
            )}
          </View>

          {/* CTA */}
          {canRequest ? (
            <Pressable
              style={({ pressed }) => [
                styles.requestBtn,
                { backgroundColor: pressed ? "#C8305A" : colors.rose, marginTop: 8 },
              ]}
              onPress={onRequestUnlock}
            >
              <FIcon name="instagram" size={14} color="#fff" />
              <Text style={styles.requestBtnText}>
                {lang === "ko" ? "인스타 공개 요청하기" : "インスタ公開をリクエスト"}
              </Text>
              <FIcon name="chevron-right" size={13} color="rgba(255,255,255,0.8)" />
            </Pressable>
          ) : (
            <TouchableOpacity
              style={[
                styles.verifyBtn,
                { borderColor: colors.roseSoft, backgroundColor: colors.roseLight, marginTop: 8 },
              ]}
              onPress={onGoToTrustCenter}
            >
              <FIcon name="shield" size={13} color={colors.rose} />
              <Text style={[styles.verifyBtnText, { color: colors.rose }]}>
                {lang === "ko"
                  ? "본인 인증 후 요청 가능해요 →"
                  : "本人確認後にリクエストできます →"}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 12,
    marginVertical: 4,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  unlockedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  receivedCard: {
    gap: 10,
    padding: 12,
  },
  lockedCard: {},

  // ── Pill row (collapsed header) ──
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pillLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // ── Expanded body ──
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconWrapSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 2,
  },
  cardSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  handleText: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    letterSpacing: 0.2,
  },

  // ── Unlocked ──
  copyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Received ──
  respondBtns: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  declineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderRadius: 10,
    paddingVertical: 9,
  },
  acceptBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  // ── Trust row ──
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  trustLabel: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },

  // ── Request / Verify buttons ──
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  requestBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
  verifyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
  },
  verifyBtnText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12.5,
  },
});
