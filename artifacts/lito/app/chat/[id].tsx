import FIcon from "@/components/FIcon";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ContactLockCard } from "@/components/ContactLockCard";
import { CountryFlag } from "@/components/CountryFlag";
import { NoConsentSheet } from "@/components/chat/NoConsentSheet";
import { ZeroCreditSheet } from "@/components/chat/ZeroCreditSheet";
import { UnsafeNotice } from "@/components/chat/UnsafeNotice";
import { ProfileImage } from "@/components/ProfileImage";
import { PRSInsightCard, type PRSCardState } from "@/components/PRSInsightCard";
import { useApp } from "@/context/AppContext";
import { useGrowth } from "@/context/GrowthContext";
import { useColors } from "@/hooks/useColors";
import { useLocale } from "@/hooks/useLocale";
import { AI_COACH_PACKS } from "@/services/monetization";
import { getConversationInterestSnapshot } from "@/services/prsScoring";
import { Message, computeTrustScore } from "@/types";

const CURRENT_USER_ID = "me";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : "http://localhost:8080";

// ── Module-level translation cache ───────────────────────────────────────────
// Persists across remounts. Key = "<msgId>:<targetLang>"
interface TranslationResult { translation: string; pronunciation: string; }
const translationCache = new Map<string, TranslationResult>();

// ── Per-message enrichment ────────────────────────────────────────────────────
// Each entry is keyed by message ID and stores the state for that individual message.
interface Enrichment {
  translatedText?: string;
  showTranslation?: boolean;   // Whether translation is currently shown (tap-to-toggle)
  isLoading?: boolean;
  failed?: boolean;
}

// ── AI Coach structured response ─────────────────────────────────────────────
interface CoachTone {
  emoji: string;
  label: string;
  suggestions: string[];
  tip: string;
}
interface CoachResult {
  summary: string;
  tones: CoachTone[];
}

// ─── MessageBubble ────────────────────────────────────────────────────────────
//
// Two-layer architecture:
//   Layer 1: msg.originalText  — always rendered
//   Layer 2: translatedText    — rendered when translation is available
//
// Per-message translate button triggers translation for just that message.

interface BubbleProps {
  msg: Message;
  enrichment: Enrichment | undefined;
  viewerLang: "ko" | "ja";
  /** Called when the user taps the received message bubble — toggles translation. */
  onToggleTranslation: () => void;
  /** L6 FIX: Show visible first-use translation hint on this bubble */
  showFirstUseHint?: boolean;
}

function MessageBubble({ msg, enrichment, viewerLang, onToggleTranslation, showFirstUseHint = false }: BubbleProps) {
  const colors = useColors();
  const isMe = msg.senderId === CURRENT_USER_ID;

  const hasTranslation = !!enrichment?.translatedText;
  const isTranslating = !!enrichment?.isLoading;
  const showTranslation = !!enrichment?.showTranslation;

  const translationLangLabel = msg.originalLanguage === "ko" ? "JA" : "KO";

  // ── Entry animation (fade + slide up 10px) ──────────────────────────────
  const entryOpacity   = useRef(new Animated.Value(0)).current;
  const entryTranslateY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entryOpacity, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entryTranslateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  // Only on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Translation crossfade ─────────────────────────────────────────────────
  const translationFade = useRef(new Animated.Value(0)).current;
  const prevShow = useRef(false);
  useEffect(() => {
    if (showTranslation === prevShow.current) return;
    prevShow.current = showTranslation;
    Animated.timing(translationFade, {
      toValue: showTranslation ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [showTranslation, translationFade]);

  if (isMe) {
    return (
      <Animated.View
        style={[
          bubble.wrap,
          { alignSelf: "flex-end", opacity: entryOpacity, transform: [{ translateY: entryTranslateY }] },
        ]}
      >
        <View style={[bubble.balloonMe, { backgroundColor: colors.bubbleMe }]}>
          <Text style={[bubble.textMe, { color: colors.white }]}>
            {msg.originalText}
          </Text>
        </View>
        <Text style={[bubble.time, { color: colors.charcoalLight, alignSelf: "flex-end" }]}>
          {fmtTime(msg.createdAt)}
        </Text>
      </Animated.View>
    );
  }

  // ── Received message — tappable to toggle translation ────────────────────
  return (
    <Animated.View
      style={[
        bubble.wrap,
        { alignSelf: "flex-start", opacity: entryOpacity, transform: [{ translateY: entryTranslateY }] },
      ]}
    >
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggleTranslation();
        }}
        activeOpacity={0.82}
      >
        <View
          style={[
            bubble.balloonThem,
            {
              backgroundColor: colors.bubbleThem,
              borderColor: colors.border,
              borderLeftColor: showTranslation ? colors.roseSoft : colors.border,
              borderLeftWidth: showTranslation ? 3 : StyleSheet.hairlineWidth,
            },
          ]}
        >
          {/* Layer 1 — original text */}
          <Text style={[bubble.textOriginal, { color: colors.charcoalMid }]}>
            {msg.originalText}
          </Text>

          {/* Translation loading */}
          {isTranslating && (
            <>
              <View style={[bubble.divider, { backgroundColor: colors.border }]} />
              <ActivityIndicator
                size="small"
                color={colors.rose}
                style={{ alignSelf: "flex-start", marginTop: 2 }}
              />
            </>
          )}

          {/* Layer 2 — translated text: crossfade in/out */}
          {hasTranslation && !isTranslating && (
            <Animated.View style={{ opacity: translationFade, overflow: "hidden" }}>
              <View style={[bubble.divider, { backgroundColor: colors.border }]} />
              <View style={bubble.translationRow}>
                <View style={[bubble.langChip, { backgroundColor: colors.roseLight }]}>
                  <Text style={[bubble.langChipText, { color: colors.rose }]}>
                    {translationLangLabel}
                  </Text>
                </View>
                <Text style={[bubble.textTranslation, { color: colors.charcoal }]}>
                  {enrichment!.translatedText}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* First-use callout */}
          {!hasTranslation && !isTranslating && showFirstUseHint && (
            <View style={[bubble.firstUseHint, { backgroundColor: colors.roseLight, borderColor: "#F2BDCA" }]}>
              <FIcon name="globe" size={12} color={colors.rose} />
              <Text style={[bubble.firstUseHintText, { color: colors.rose }]}>
                {viewerLang === "ko" ? "탭해서 번역" : "タップして翻訳"}
              </Text>
            </View>
          )}
          {/* Subtle globe hint */}
          {!hasTranslation && !isTranslating && !showFirstUseHint && (
            <View style={bubble.translateHint}>
              <FIcon name="globe" size={11} color={colors.charcoalLight} style={{ opacity: 0.55 }} />
            </View>
          )}
        </View>
      </TouchableOpacity>

      <Text style={[bubble.time, { color: colors.charcoalLight, alignSelf: "flex-start" }]}>
        {fmtTime(msg.createdAt)}
      </Text>
    </Animated.View>
  );
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const bubble = StyleSheet.create({
  wrap: { maxWidth: "80%", marginBottom: 14 },

  balloonMe: {
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  balloonThem: {
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: StyleSheet.hairlineWidth,
  },

  // Layer 1 — original: the raw authentic voice
  textOriginal: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 21,
    letterSpacing: 0.1,
  },

  // Layer 2 — translation row wraps chip + text
  translationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    flexWrap: "wrap",
  },

  // Small language label chip
  langChip: {
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginTop: 2,
    alignSelf: "flex-start",
  },
  langChipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.8,
  },

  // Layer 2 — translated text: primary readable content
  textTranslation: {
    fontFamily: "Inter_500Medium",
    fontSize: 15.5,
    lineHeight: 23,
    flex: 1,
    flexShrink: 1,
  },

  // Subtle globe hint shown at bottom of untranslated bubble
  translateHint: {
    position: "absolute",
    bottom: 8,
    right: 10,
  },

  // L6 FIX: Visible first-use callout for translation discoverability
  firstUseHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  firstUseHintText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
    letterSpacing: 0.1,
  },

  textMe: {
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    lineHeight: 22,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 9,
  },

  time: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 5,
    opacity: 0.5,
  },

});

// ─── AiCoachCreditsModal ──────────────────────────────────────────────────────
// Bottom-sheet style modal shown when AI coach credits are exhausted.
// Offers credit packs (mocked) and plan upgrade without blocking the chat.

interface AiCoachCreditsModalProps {
  visible: boolean;
  planId: string;
  onClose: () => void;
  onBuyPack: (count: number) => void;
  onUpgrade: () => void;
}

function AiCoachCreditsModal({
  visible,
  planId,
  onClose,
  onBuyPack,
  onUpgrade,
}: AiCoachCreditsModalProps) {
  const colors = useColors();
  const { lang } = useLocale();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={creditModal.backdrop} onPress={onClose} />
      <View style={[creditModal.sheet, { backgroundColor: colors.surface }]}>
        {/* Handle */}
        <View style={[creditModal.handle, { backgroundColor: colors.border }]} />

        {/* Header */}
        <View style={creditModal.header}>
          <View style={[creditModal.iconWrap, { backgroundColor: "#FFF0F3" }]}>
            <FIcon name="zap" size={20} color="#D85870" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[creditModal.title, { color: colors.charcoal }]}>
              {lang === "ko" ? "AI 코치 크레딧" : "AIコーチクレジット"}
            </Text>
            <Text style={[creditModal.subtitle, { color: colors.charcoalLight }]}>
              {planId === "free"
                ? lang === "ko" ? "오늘의 무료 크레딧 5개를 모두 사용했어요" : "今日の無料クレジット5回を使い切りました"
                : lang === "ko" ? "오늘의 크레딧 20개를 모두 사용했어요" : "今日のクレジット20回を使い切りました"}
            </Text>
          </View>
        </View>

        {/* Divider */}
        <View style={[creditModal.divider, { backgroundColor: colors.border }]} />

        {/* Credit packs */}
        <Text style={[creditModal.sectionLabel, { color: colors.charcoalLight }]}>
          {lang === "ko" ? "추가 크레딧 구매 · 매일 초기화" : "追加クレジット購入 · 毎日リセット"}
        </Text>

        {AI_COACH_PACKS.map((pack) => (
          <Pressable
            key={pack.count}
            style={[
              creditModal.packRow,
              {
                backgroundColor: pack.popular ? "#FFF0F3" : colors.background,
                borderColor: pack.popular ? "#F2BDCA" : colors.border,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onBuyPack(pack.count);
            }}
          >
            <View style={creditModal.packLeft}>
              {pack.popular && (
                <View style={[creditModal.popularBadge, { backgroundColor: "#D85870" }]}>
                  <Text style={creditModal.popularText}>
                    {lang === "ko" ? "인기" : "人気"}
                  </Text>
                </View>
              )}
              <Text style={[creditModal.packLabel, { color: colors.charcoal }]}>
                {pack.label}
              </Text>
              <Text style={[creditModal.packDesc, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "일회성 구매" : "一回限り"}
              </Text>
            </View>
            <View style={[creditModal.packPricePill, { backgroundColor: pack.popular ? "#D85870" : colors.muted }]}>
              <Text style={[creditModal.packPrice, { color: pack.popular ? "#fff" : colors.charcoal }]}>
                {pack.priceUSD}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* Upgrade to Premium */}
        <Pressable
          style={[creditModal.upgradeBtn, { backgroundColor: "#D85870" }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onUpgrade();
          }}
        >
          <FIcon name="zap" size={15} color="#fff" />
          <Text style={creditModal.upgradeBtnText}>
            {lang === "ko" ? "프리미엄으로 무제한 · $19.99/월" : "プレミアムで無制限 · $19.99/月"}
          </Text>
        </Pressable>

        <Text style={[creditModal.disclaimer, { color: colors.charcoalFaint }]}>
          {lang === "ko" ? "구매는 모의 처리됩니다 — 실제 결제 없음" : "購入はモック処理です — 実際の請求なし"}
        </Text>
      </View>
    </Modal>
  );
}

const creditModal = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 22,
    paddingBottom: 36,
    paddingTop: 14,
    gap: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 20,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 18,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 3,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 19,
  },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 16 },
  sectionLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  packRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginBottom: 9,
  },
  packLeft: { gap: 3 },
  popularBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    alignSelf: "flex-start",
    marginBottom: 2,
  },
  popularText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    color: "#fff",
    letterSpacing: 0.4,
  },
  packLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  packDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  packPricePill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  packPrice: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 100,
    paddingVertical: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  upgradeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  disclaimer: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    textAlign: "center",
  },
});

// ─── AiCoachPopup ─────────────────────────────────────────────────────────────
// Top slide-down coaching card. Never blocks the chat. Never touches the input.
// 2-step: Step 1 = summary + tone pills  →  Step 2 = tone's suggestions + tip.

interface AiCoachPopupProps {
  visible: boolean;
  data: CoachResult | null;
  topOffset: number;
  onClose: () => void;
  onSuggestionSelect: (text: string) => void;
}

function AiCoachPopup({ visible, data, topOffset, onClose, onSuggestionSelect }: AiCoachPopupProps) {
  const colors = useColors();
  const slideAnim = useRef(new Animated.Value(-320)).current;
  const [selectedTone, setSelectedTone] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setSelectedTone(null);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -320,
        duration: 200,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!mounted || !data) return null;

  // Defensive: normalise tones at render time so .map() never crashes
  const safeTones: CoachTone[] = Array.isArray(data.tones)
    ? data.tones.map((t) => ({
        emoji: t?.emoji ?? "💬",
        label: t?.label ?? "일반",
        suggestions: Array.isArray(t?.suggestions)
          ? t.suggestions.filter((s): s is string => typeof s === "string")
          : [],
        tip: t?.tip ?? "",
      }))
    : [];

  const safeSummary = data.summary || "대화 내용을 분석했어요.";
  const tone = selectedTone !== null && selectedTone < safeTones.length
    ? safeTones[selectedTone]
    : null;

  return (
    <Animated.View
      style={[popup.container, { top: topOffset, transform: [{ translateY: slideAnim }] }]}
      pointerEvents="box-none"
    >
      <View style={[popup.card, { backgroundColor: colors.surface }]}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <View style={popup.header}>
          {tone ? (
            <TouchableOpacity
              onPress={() => setSelectedTone(null)}
              style={popup.backBtn}
              hitSlop={12}
            >
              <FIcon name="arrow-left" size={17} color={colors.charcoalLight} />
            </TouchableOpacity>
          ) : (
            <FIcon name="zap" size={16} color={colors.charcoalLight} />
          )}
          <Text style={[popup.headerTitle, { color: colors.charcoal }]} numberOfLines={1}>
            {tone ? tone.label : "대화 코치"}
          </Text>
          <TouchableOpacity onPress={onClose} style={popup.closeBtn} hitSlop={12}>
            <FIcon name="x" size={18} color={colors.charcoalLight} />
          </TouchableOpacity>
        </View>

        {tone === null ? (
          // ── Step 1: Situation summary + tone selection ───────────────────
          <>
            <View style={[popup.summaryWrap, { backgroundColor: colors.muted }]}>
              <Text style={[popup.summaryText, { color: colors.charcoal }]}>{safeSummary}</Text>
            </View>
            {safeTones.length === 0 ? (
              <Text style={[popup.label, { color: colors.charcoalFaint, textAlign: "center", paddingVertical: 8 }]}>
                스타일 정보를 불러올 수 없어요
              </Text>
            ) : (
              <>
                <Text style={[popup.label, { color: colors.charcoalLight }]}>답변 스타일 선택</Text>
                <View style={popup.toneRow}>
                  {safeTones.map((t, i) => (
                    <Pressable
                      key={`${t.label}-${i}`}
                      onPress={() => {
                        setSelectedTone(i);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      style={[popup.tonePill, { backgroundColor: colors.muted, borderColor: colors.border }]}
                    >
                      <Text style={[popup.toneLabel, { color: colors.charcoal }]}>{t.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          // ── Step 2: Selected tone's suggestions + tip ────────────────────
          <>
            {tone.suggestions.length === 0 ? (
              <Text style={[popup.label, { color: colors.charcoalFaint, paddingVertical: 10 }]}>
                추천 예시를 불러올 수 없어요
              </Text>
            ) : (
              tone.suggestions.map((s, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [
                    popup.suggestionRow,
                    i < tone.suggestions.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border,
                    },
                    pressed && { backgroundColor: colors.roseLight, borderRadius: 10 },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onSuggestionSelect(s);
                  }}
                >
                  <Text style={[popup.bullet, { color: "#D85870" }]}>•</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[popup.suggestionText, { color: colors.charcoal }]}>{s}</Text>
                    <Text style={[popup.tapHint, { color: colors.charcoalFaint }]}>
                      탭하면 입력창에 채워져요
                    </Text>
                  </View>
                </Pressable>
              ))
            )}
            {tone.tip ? (
              <View style={[popup.tipWrap, { backgroundColor: colors.muted }]}>
                <Text style={[popup.tipLabel, { color: "#D85870" }]}>팁</Text>
                <Text style={[popup.tipText, { color: colors.charcoal }]}>{tone.tip}</Text>
              </View>
            ) : null}
          </>
        )}
      </View>
    </Animated.View>
  );
}

const popup = StyleSheet.create({
  container: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 999,
    elevation: 16,
  },
  card: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  headerIcon: { fontSize: 16 },
  backBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    flex: 1,
  },
  closeBtn: { padding: 2 },
  summaryWrap: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 12,
  },
  summaryText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  label: {
    fontFamily: "Inter_500Medium",
    fontSize: 11.5,
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  toneRow: {
    flexDirection: "row",
    gap: 8,
  },
  tonePill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  toneEmoji: { fontSize: 20 },
  toneLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  suggestionRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 10,
    alignItems: "flex-start",
  },
  bullet: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
  },
  suggestionText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14.5,
    lineHeight: 22,
    flex: 1,
  },
  tipWrap: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 10,
    gap: 3,
  },
  tipLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  tipText: {
    fontFamily: "Inter_400Regular",
    fontSize: 13.5,
    lineHeight: 20,
  },
  tapHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.1,
  },
});

// ─── ChatDetailScreen ────────────────────────────────────────────────────────

export default function ChatDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t, lang } = useLocale();
  const { id, draft } = useLocalSearchParams<{ id: string; draft?: string }>();
  const {
    conversations,
    messages,
    profile,
    token,
    sendMessage,
    unlockExternalContact,
    requestUnlock,
    respondToUnlock,
    blockUser,
    loadConversationMessages,
    joinConversation,
    leaveConversation,
  } = useApp();
  const {
    subscription,
    getAiCoachCreditsRemaining,
    consumeAiCoachCredit,
    buyAiCoachCredits,
    upgradePlan,
    walletBalance,
    walletState,
    consentStatus,
    grantConsent,
    refreshWallet,
    track,
  } = useGrowth();

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showCoachSheet, setShowCoachSheet] = useState(false);
  const [showTrustGateModal, setShowTrustGateModal] = useState(false);
  const [coachData, setCoachData] = useState<CoachResult | null>(null);

  // S08: Blocked UI 3종 분리 상태
  const [showNoConsentSheet, setShowNoConsentSheet] = useState(false);
  const [showZeroCreditSheet, setShowZeroCreditSheet] = useState(false);
  const [showUnsafeNotice, setShowUnsafeNotice] = useState(false);
  const [isGrantingConsent, setIsGrantingConsent] = useState(false);
  // L6 FIX: track whether user has ever tapped translate — to show/hide first-use hint
  const [hasUsedTranslation, setHasUsedTranslation] = useState(false);

  // ── PRS Insight Card state (isolated — no changes to existing chat logic) ──
  const [prsCardState, setPrsCardState] = useState<PRSCardState>({ status: "loading" });
  const [prsExpanded, setPrsExpanded] = useState(false);

  const [inputText, setInputText] = useState(draft ? decodeURIComponent(draft) : "");
  const sendBtnScale = useRef(new Animated.Value(1)).current;

  const handleSendPressIn = () => {
    Animated.spring(sendBtnScale, { toValue: 0.88, useNativeDriver: true, speed: 30, bounciness: 0 }).start();
  };
  const handleSendPressOut = () => {
    Animated.spring(sendBtnScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 5 }).start();
  };

  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [enrichmentMap, setEnrichmentMap] = useState<Record<string, Enrichment>>({});
  const inflight = useRef<Set<string>>(new Set());
  const flatRef = useRef<FlatList>(null);

  // ── Quick reply chips state ───────────────────────────────────────────────
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [quickRepliesLoading, setQuickRepliesLoading] = useState(false);
  const [quickRepliesExpanded, setQuickRepliesExpanded] = useState(false);
  const quickRepliesPanelAnim = useRef(new Animated.Value(0)).current;
  const quickRepliesPanelVisible = useRef(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const lastFetchedMsgId = useRef<string | null>(null);

  const conversation = conversations.find((c) => c.id === id);
  const convMessages = messages[id || "conv1"] || [];
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  // 채팅 화면 열릴 때: 서버에서 메시지 로드 + WS 방 입장
  useEffect(() => {
    if (!id) return;
    loadConversationMessages(id);
    joinConversation(id);
    return () => leaveConversation(id);
  }, [id, loadConversationMessages, joinConversation, leaveConversation]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  // ── PRS: fetch conversation interest snapshot ─────────────────────────────
  // Runs once when the chat opens (and again if message count grows by ≥3).
  // Completely isolated: touches only prsCardState — zero changes to existing state.
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (!conversation) return;

    const partnerCountry = conversation.user.country === "JP" ? "JP" : "KR";
    const myCountry: "KR" | "JP" = profile.country === "JP" ? "JP" : "KR";

    // Re-fetch when message count grows by ≥ 3 (de-bounced via ref)
    const newCount = convMessages.length;
    if (newCount > 0 && Math.abs(newCount - prevMsgCountRef.current) < 3 && prevMsgCountRef.current > 0) {
      return;
    }
    prevMsgCountRef.current = newCount;

    // Require at least 4 total messages before running PRS
    if (newCount < 4) {
      setPrsCardState({ status: "not_enough_data", lang });
      return;
    }

    setPrsCardState({ status: "loading" });

    getConversationInterestSnapshot({
      messages: convMessages,
      conversationId: id || "conv1",
      myUserId: CURRENT_USER_ID,
      partnerUserId: conversation.user.id ?? "partner",
      myCountry,
      partnerCountry,
      viewerLang: lang,
      apiBase: API_BASE,
    })
      .then((outcome) => {
        if (outcome.ready) {
          setPrsCardState({ status: "ready", snapshot: outcome, lang });
        } else if (outcome.lowConfidenceState === "not_enough_data") {
          setPrsCardState({ status: "not_enough_data", lang });
        } else {
          setPrsCardState({ status: "low_confidence", lang });
        }
      })
      .catch(() => {
        // Silently hide on error — don't show broken state to user
        setPrsCardState({ status: "hidden" });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, convMessages.length]);

  if (!conversation) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface, paddingTop: topPad }]}>
        <Text style={{ color: colors.charcoal, padding: 20 }}>Conversation not found</Text>
      </View>
    );
  }

  // Viewer's primary language — always follows the locale (language) setting
  const viewerLang: "ko" | "ja" = lang === "ko" ? "ko" : "ja";

  // ── Per-message translation toggle ───────────────────────────────────────
  // Called when user taps a received message bubble.
  //
  // Toggle logic:
  //   • Translation already fetched + showing  → hide
  //   • Translation already fetched + hidden   → show
  //   • Translation not yet fetched            → fetch then show
  //
  // Direction rule (message-based, never viewer-based):
  //   Korean message  → always translate TO Japanese
  //   Japanese message → always translate TO Korean
  const handleTranslateMessage = useCallback(async (msg: Message) => {
    const sourceLang = msg.originalLanguage as "ko" | "ja";
    const targetLang: "ko" | "ja" = sourceLang === "ko" ? "ja" : "ko";
    const cacheKey = `${msg.id}:${targetLang}`;

    // L6 FIX: mark translation as used on first tap — hides first-use hint from all bubbles
    setHasUsedTranslation(true);

    // 1. Translation already in state — just toggle visibility
    const current = enrichmentMap[msg.id];
    if (current?.translatedText) {
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: { ...current, showTranslation: !current.showTranslation },
      }));
      return;
    }

    // 2. Module cache hit — no fetch needed
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: {
          translatedText: cached.translation,
          showTranslation: true,
        },
      }));
      return;
    }

    // 2. Already in flight — ignore duplicate tap
    if (inflight.current.has(cacheKey)) return;
    inflight.current.add(cacheKey);

    // 3. Set loading state for this specific message
    setEnrichmentMap((prev) => ({
      ...prev,
      [msg.id]: { isLoading: true },
    }));

    try {
      const res = await fetch(`${API_BASE}/api/ai/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: msg.originalText,
          sourceLang: msg.originalLanguage,
          viewerLang: targetLang,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as TranslationResult;
      // Normalise: server may return empty string for pronunciation — treat as absent
      const normalised: TranslationResult = {
        translation: data.translation,
        pronunciation: data.pronunciation || "",
      };
      translationCache.set(cacheKey, normalised);
      // Haptic reward — translation revealed
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: {
          translatedText: normalised.translation,
          showTranslation: true,
        },
      }));
    } catch {
      // Show failed state — user can tap again to retry
      setEnrichmentMap((prev) => ({
        ...prev,
        [msg.id]: { failed: true },
      }));
    } finally {
      inflight.current.delete(cacheKey);
    }
  }, [enrichmentMap]); // enrichmentMap needed for toggle-visibility check

  // ── Quick reply chips: auto-fetch when last message is from partner ─────────
  const fetchQuickReplies = useCallback(async (msgs: typeof convMessages) => {
    if (msgs.length === 0) return;
    const lastMsg = msgs[msgs.length - 1];
    if (lastMsg.senderId === CURRENT_USER_ID) {
      // Last message is mine — clear chips
      setQuickReplies([]);
      return;
    }
    // Already fetched for this message
    if (lastFetchedMsgId.current === lastMsg.id) return;
    lastFetchedMsgId.current = lastMsg.id;

    setQuickRepliesLoading(true);
    setQuickReplies([]);
    try {
      const recentMsgs = msgs.slice(-8).map((m) => ({
        sender: m.senderId === CURRENT_USER_ID ? "me" : "them",
        text: m.originalText,
      }));
      const res = await fetch(`${API_BASE}/api/ai/suggest-reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: recentMsgs, targetLang: viewerLang, count: 3 }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = (await res.json()) as { suggestions?: string[]; suggestion?: string };
      const chips = Array.isArray(data.suggestions) && data.suggestions.length > 0
        ? data.suggestions
        : data.suggestion ? [data.suggestion] : [];
      setQuickReplies(chips);
    } catch {
      setQuickReplies([]);
    } finally {
      setQuickRepliesLoading(false);
    }
  // viewerLang is derived from profile which doesn't change mid-session
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewerLang]);

  useEffect(() => {
    if (convMessages.length > 0) {
      fetchQuickReplies(convMessages);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convMessages.length]);

  // ── Quick replies panel slide-up animation ────────────────────────────────
  const panelShouldShow = quickRepliesLoading || quickReplies.length > 0;
  useEffect(() => {
    if (panelShouldShow && !quickRepliesPanelVisible.current) {
      quickRepliesPanelVisible.current = true;
      quickRepliesPanelAnim.setValue(0);
      Animated.timing(quickRepliesPanelAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else if (!panelShouldShow) {
      quickRepliesPanelVisible.current = false;
    }
  }, [panelShouldShow, quickRepliesPanelAnim]);

  // ── NOTE: Batch enrichment effect removed ─────────────────────────────────
  // Translation is now purely per-message tap-to-toggle.
  // No global "translation ON/OFF" toggle exists anymore.
  // Each bubble fetches lazily on first tap, then toggles visibility on subsequent taps.

  // ── renderItem ───────────────────────────────────────────────────────────
  // Each bubble receives its own enrichment slice and a stable per-message callback.
  // FlatList re-renders items when enrichmentMap changes (via extraData).
  //
  // L6 FIX: Find the first received message that hasn't been translated yet — show first-use hint.
  const firstUntranslatedReceivedId = React.useMemo(() => {
    if (hasUsedTranslation) return null;
    const first = convMessages.find(
      (m) => m.senderId !== CURRENT_USER_ID && !enrichmentMap[m.id]?.translatedText
    );
    return first?.id ?? null;
  }, [convMessages, enrichmentMap, hasUsedTranslation]);

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      if (item.senderId === CURRENT_USER_ID) {
        return (
          <MessageBubble
            msg={item}
            enrichment={undefined}
            viewerLang={viewerLang}
            onToggleTranslation={() => {}}
          />
        );
      }
      return (
        <MessageBubble
          msg={item}
          enrichment={enrichmentMap[item.id]}
          viewerLang={viewerLang}
          onToggleTranslation={() => handleTranslateMessage(item)}
          showFirstUseHint={item.id === firstUntranslatedReceivedId}
        />
      );
    },
    [enrichmentMap, viewerLang, handleTranslateMessage, firstUntranslatedReceivedId]
  );

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleSend = () => {
    if (!inputText.trim() || !id) return;
    sendMessage(id, inputText.trim());
    setInputText("");
    setQuickReplies([]);
    lastFetchedMsgId.current = null;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSuggestionSelect = (text: string) => {
    setInputText(text);
    setShowCoachSheet(false);
    setQuickReplies([]);
  };

  const handleAiSuggest = async () => {
    if (aiSuggesting) return;

    // Guard: need at least one received message to coach on
    const lastThemMsg = convMessages.slice().reverse().find((m) => m.senderId !== CURRENT_USER_ID);
    if (!lastThemMsg) {
      Alert.alert("AI 코치", "상대방의 메시지가 없습니다.");
      return;
    }

    track("coach_opened");

    // State machine: no_consent → zero_credit → server call
    // 1. consent 체크 (로컬 consent status 기준 fast-path)
    if (consentStatus !== null && !consentStatus.conversation_coach) {
      track("coach_blocked_no_consent");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowNoConsentSheet(true);
      return;
    }

    // 2. 크레딧 fast-path 체크 (서버가 최종 권한, 여기선 UI 방어막)
    const serverTotal = (walletState?.remaining_total) ?? (walletState?.trial_remaining ?? 3) + (walletBalance ?? 0);
    const localCredits = getAiCoachCreditsRemaining();
    const hasFunds = localCredits > 0 || serverTotal > 0;
    if (consentStatus !== null && !hasFunds) {
      track("coach_blocked_zero_credit");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setShowZeroCreditSheet(true);
      return;
    }

    setAiSuggesting(true);
    track("coach_request_started");
    try {
      const recentMessages = convMessages.slice(-10).map((m) => ({
        sender: m.senderId === CURRENT_USER_ID ? "me" : "them",
        text: m.originalText,
      }));
      const targetLang = viewerLang;
      const uiLang = viewerLang;
      const prsContext =
        prsCardState.status === "ready" ? prsCardState.snapshot : null;

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API_BASE}/api/ai/coach`, {
        method: "POST",
        headers,
        body: JSON.stringify({ messages: recentMessages, targetLang, uiLang, prsContext }),
      });

      const raw: any = await response.json().catch(() => ({}));

      // 서버 authoritative blocked 응답 처리
      if (raw?.ok === true && raw?.data?.blocked) {
        const blockReason = raw.data.block_reason as string;
        if (blockReason === "no_consent") {
          track("coach_blocked_no_consent");
          setShowNoConsentSheet(true);
          return;
        }
        if (blockReason === "zero_credit") {
          track("coach_blocked_zero_credit");
          setShowZeroCreditSheet(true);
          return;
        }
        if (blockReason === "unsafe") {
          track("coach_blocked_unsafe");
          setShowUnsafeNotice(true);
          return;
        }
        track("coach_request_no_charge_failure");
        return;
      }

      if (!response.ok || raw?.error) {
        track("coach_request_no_charge_failure");
        throw new Error(raw?.error ?? `API ${response.status}`);
      }

      const safeData: CoachResult = {
        summary:
          typeof raw?.summary === "string" && raw.summary
            ? raw.summary
            : "대화 분석을 불러올 수 없습니다.",
        tones: Array.isArray(raw?.tones)
          ? (raw.tones as any[]).map((t: any) => ({
              emoji: typeof t?.emoji === "string" ? t.emoji : "",
              label: typeof t?.label === "string" ? t.label : "일반",
              suggestions: Array.isArray(t?.suggestions)
                ? (t.suggestions as unknown[]).filter((s): s is string => typeof s === "string")
                : [],
              tip: typeof t?.tip === "string" ? t.tip : "",
            }))
          : [],
      };

      track("coach_request_completed");
      setCoachData(safeData);
      setShowCoachSheet(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // 성공 후 서버 wallet 동기화
      refreshWallet().catch(() => {});
    } catch (err) {
      console.error("[AI Coach] error:", err);
      track("coach_request_no_charge_failure");
      Alert.alert("AI 코치", "AI 코치를 불러오는 중 문제가 발생했어요. 다시 시도해주세요.");
    } finally {
      setAiSuggesting(false);
    }
  };

  const handleUnlock = () => {
    if (!id) return;
    unlockExternalContact(id);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 8,
            borderBottomColor: colors.border,
            backgroundColor: colors.surface,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FIcon name="arrow-left" size={22} color={colors.charcoal} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerUser}
          activeOpacity={0.7}
          onPress={() => router.push(`/user-profile/${conversation.user.id}` as any)}
        >
          <View style={styles.avatarWrap}>
            <ProfileImage photoKey={conversation.user.photos[0]} size={40} />
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: colors.green, borderColor: colors.surface },
              ]}
            />
          </View>
          <View style={styles.headerInfo}>
            <View style={styles.headerNameRow}>
              <Text style={[styles.headerName, { color: colors.charcoal }]}>
                {conversation.user.nickname}
              </Text>
              <CountryFlag country={conversation.user.country} size={13} />
            </View>
            <Text style={[styles.headerStatus, { color: colors.charcoalLight }]}>
              {conversation.user.lastActive}
            </Text>
          </View>
        </TouchableOpacity>

        {/* More options */}
        <TouchableOpacity
          style={styles.moreBtn}
          onPress={() => setShowMoreMenu(true)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <FIcon name="more-vertical" size={20} color={colors.charcoal} />
        </TouchableOpacity>

      </View>

      {/* ── Contact lock card (4-state) ─────────────────────────────────── */}
      <ContactLockCard
        conversation={conversation}
        myTrustProfile={profile.trustProfile}
        lang={lang}
        onRequestUnlock={() => {
          if (computeTrustScore(profile.trustProfile) < 25) {
            setShowTrustGateModal(true);
          } else {
            requestUnlock(id!);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        }}
        onRespondUnlock={(accept) => {
          respondToUnlock(id!, accept);
          Haptics.notificationAsync(
            accept
              ? Haptics.NotificationFeedbackType.Success
              : Haptics.NotificationFeedbackType.Warning
          );
        }}
        onGoToTrustCenter={() => router.push("/trust-center" as any)}
      />

      {/* ── PRS Insight Card — between banner and messages, isolated ──── */}
      <PRSInsightCard
        state={prsCardState}
        expanded={prsExpanded}
        onToggle={() => setPrsExpanded((v) => !v)}
      />

      {/* ── Message list ────────────────────────────────────────────────── */}
      <FlatList
        ref={flatRef}
        data={convMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        extraData={enrichmentMap}
        contentContainerStyle={[styles.messageList, { paddingBottom: 20 }]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
      />

      {/* ── AI Coach credits modal (legacy, 구독 플로우용 유지) ───────────── */}
      <AiCoachCreditsModal
        visible={showCreditsModal}
        planId={subscription.planId}
        onClose={() => setShowCreditsModal(false)}
        onBuyPack={(count) => {
          buyAiCoachCredits(count);
          setShowCreditsModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
        onUpgrade={() => {
          setShowCreditsModal(false);
          router.push("/paywall" as any);
        }}
      />

      {/* ── Blocked UI 3종 분리 (S07/S08) ────────────────────────────────── */}
      <NoConsentSheet
        visible={showNoConsentSheet}
        onDismiss={() => setShowNoConsentSheet(false)}
        isGranting={isGrantingConsent}
        onConsentGranted={async () => {
          setIsGrantingConsent(true);
          const ok = await grantConsent("conversation_coach");
          setIsGrantingConsent(false);
          setShowNoConsentSheet(false);
          if (ok) {
            track("consent_granted", { feature: "conversation_coach" });
          }
        }}
      />
      <ZeroCreditSheet
        visible={showZeroCreditSheet}
        onDismiss={() => setShowZeroCreditSheet(false)}
        onBuyCredits={() => {
          setShowZeroCreditSheet(false);
          router.push("/paywall" as any);
        }}
        trialRemaining={walletState?.trial_remaining}
        paidRemaining={walletState?.paid_remaining}
      />

      {/* ── AI Conversation Coach popup (top slide-down, non-blocking) ───── */}
      <AiCoachPopup
        visible={showCoachSheet}
        data={coachData}
        topOffset={topPad + 72}
        onClose={() => setShowCoachSheet(false)}
        onSuggestionSelect={handleSuggestionSelect}
      />

      {/* ── Unsafe 인라인 배너 (S08) ─────────────────────────────────────── */}
      {showUnsafeNotice && (
        <UnsafeNotice
          onReport={() => { setShowUnsafeNotice(false); router.push(`/report-user?id=${conversation?.user.id}` as any); }}
          onBlock={() => { setShowUnsafeNotice(false); if (conversation?.user.id) blockUser(conversation.user.id); }}
          onHelp={() => { setShowUnsafeNotice(false); router.push("/trust-center" as any); }}
        />
      )}

      {/* ── Quick reply chips (collapsible, slides up) ───────────────────── */}
      {(quickRepliesLoading || quickReplies.length > 0) && (
        <Animated.View
          style={[
            styles.quickRepliesOuter,
            {
              borderTopColor: colors.border,
              backgroundColor: colors.surface,
              opacity: quickRepliesPanelAnim,
              transform: [{
                translateY: quickRepliesPanelAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [16, 0],
                }),
              }],
            },
          ]}
        >
          {/* Toggle header */}
          <TouchableOpacity
            style={styles.quickRepliesLabelRow}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQuickRepliesExpanded((v) => !v);
            }}
            activeOpacity={0.7}
          >
            <FIcon name="zap" size={11} color={colors.rose} />
            <Text style={[styles.quickRepliesLabel, { color: colors.charcoalLight, flex: 1 }]}>
              {viewerLang === "ko" ? "AI 빠른 답장" : "AIクイック返信"}
              {quickReplies.length > 0 && !quickRepliesLoading ? ` (${quickReplies.length})` : ""}
            </Text>
            <FIcon
              name={quickRepliesExpanded ? "chevron-down" : "chevron-up"}
              size={13}
              color={colors.charcoalLight}
            />
          </TouchableOpacity>

          {/* Chips */}
          {quickRepliesExpanded && (
            <View style={styles.quickRepliesChipRow}>
              {quickRepliesLoading ? (
                [0, 1, 2].map((i) => (
                  <View
                    key={i}
                    style={[styles.quickReplyChipSkeleton, { backgroundColor: colors.muted, borderColor: colors.border, width: 88 + i * 22 }]}
                  />
                ))
              ) : (
                quickReplies.map((reply, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.quickReplyChip, { backgroundColor: colors.roseLight, borderColor: colors.roseSoft }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setQuickRepliesExpanded(false);
                      handleSuggestionSelect(reply);
                    }}
                    activeOpacity={0.72}
                  >
                    <Text style={[styles.quickReplyChipText, { color: colors.rose }]} numberOfLines={2}>
                      {reply}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <View
          style={[
            styles.inputArea,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              paddingBottom: bottomPad + 12,
            },
          ]}
        >
          {/* AI suggest button — with live credit display */}
          {(() => {
            const remaining = getAiCoachCreditsRemaining();
            const isUnlimited = remaining === Infinity;
            const isEmpty = !isUnlimited && remaining <= 0;
            return (
              <TouchableOpacity
                style={[
                  styles.aiBtn,
                  {
                    backgroundColor: isEmpty
                      ? colors.muted
                      : aiSuggesting
                      ? colors.roseSoft
                      : colors.roseLight,
                    borderColor: isEmpty ? colors.border : colors.roseSoft,
                  },
                ]}
                onPress={handleAiSuggest}
                disabled={aiSuggesting}
                activeOpacity={0.75}
              >
                {aiSuggesting ? (
                  <ActivityIndicator size="small" color={colors.rose} />
                ) : (
                  <>
                    <FIcon
                      name={isEmpty ? "lock" : "zap"}
                      size={13}
                      color={isEmpty ? colors.charcoalLight : colors.rose}
                    />
                    <Text
                      style={[
                        styles.aiBtnLabel,
                        { color: isEmpty ? colors.charcoalLight : colors.rose },
                      ]}
                    >
                      AI
                    </Text>
                    {!isUnlimited && (
                      <View
                        style={[
                          styles.aiBtnBadge,
                          { backgroundColor: isEmpty ? colors.border : "#D85870" },
                        ]}
                      >
                        <Text style={[styles.aiBtnBadgeText, { color: "#fff" }]}>
                          {remaining}
                        </Text>
                      </View>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })()}

          {/* Text input */}
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
                color: colors.charcoal,
              },
            ]}
            placeholder={t("chat.placeholder")}
            placeholderTextColor={colors.charcoalLight}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />

          {/* Send button — scale spring + haptic on press */}
          <Animated.View style={{ transform: [{ scale: sendBtnScale }] }}>
            <Pressable
              style={[
                styles.sendBtn,
                {
                  backgroundColor: inputText.trim() ? colors.rose : colors.muted,
                  borderColor: inputText.trim() ? colors.rose : colors.border,
                },
              ]}
              onPress={handleSend}
              onPressIn={handleSendPressIn}
              onPressOut={handleSendPressOut}
              disabled={!inputText.trim()}
            >
              <FIcon
                name="send"
                size={16}
                color={inputText.trim() ? colors.white : colors.charcoalFaint}
              />
            </Pressable>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>

      {/* ── More menu (report / block) ──────────────────────────────────── */}
      <Modal visible={showMoreMenu} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)" }}
          onPress={() => setShowMoreMenu(false)}
        />
        <View style={[moreMenuStyles.sheet, { backgroundColor: colors.surface }]}>
          <View style={[moreMenuStyles.handle, { backgroundColor: colors.border }]} />

          {/* Profile row */}
          <TouchableOpacity
            style={moreMenuStyles.row}
            onPress={() => {
              setShowMoreMenu(false);
              router.push(`/user-profile/${conversation.user.id}` as any);
            }}
          >
            <View style={[moreMenuStyles.iconWrap, { backgroundColor: "#EEF4FF" }]}>
              <FIcon name="user" size={17} color="#3B6FD4" />
            </View>
            <View style={moreMenuStyles.rowText}>
              <Text style={[moreMenuStyles.rowLabel, { color: colors.charcoal }]}>
                {lang === "ko" ? "프로필 보기" : "プロフィールを見る"}
              </Text>
              <Text style={[moreMenuStyles.rowSub, { color: colors.charcoalLight }]}>
                {lang === "ko" ? `${conversation.user.nickname}의 상세 정보` : `${conversation.user.nickname}の詳細情報`}
              </Text>
            </View>
            <FIcon name="chevron-right" size={15} color={colors.border} />
          </TouchableOpacity>

          <View style={[moreMenuStyles.divider, { backgroundColor: colors.border }]} />

          {/* Report */}
          <TouchableOpacity
            style={moreMenuStyles.row}
            onPress={() => {
              setShowMoreMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(
                `/report-user?userId=${conversation.user.id}&nickname=${encodeURIComponent(conversation.user.nickname)}` as any
              );
            }}
          >
            <View style={[moreMenuStyles.iconWrap, { backgroundColor: "#FFF3ED" }]}>
              <FIcon name="flag" size={17} color="#C05020" />
            </View>
            <View style={moreMenuStyles.rowText}>
              <Text style={[moreMenuStyles.rowLabel, { color: "#C05020" }]}>
                {lang === "ko" ? "신고하기" : "通報する"}
              </Text>
              <Text style={[moreMenuStyles.rowSub, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "사기, 스팸, 부적절한 행동 신고" : "詐欺、スパム、不適切な行動を報告"}
              </Text>
            </View>
            <FIcon name="chevron-right" size={15} color={colors.border} />
          </TouchableOpacity>

          {/* Block */}
          <TouchableOpacity
            style={moreMenuStyles.row}
            onPress={() => {
              setShowMoreMenu(false);
              Alert.alert(
                lang === "ko" ? "차단하기" : "ブロックする",
                lang === "ko"
                  ? `${conversation.user.nickname}을(를) 차단하면 더 이상 메시지를 보내거나 받을 수 없어요. 계속할까요?`
                  : `${conversation.user.nickname}をブロックすると、メッセージの送受信ができなくなります。続けますか？`,
                [
                  { text: lang === "ko" ? "취소" : "キャンセル", style: "cancel" },
                  {
                    text: lang === "ko" ? "차단" : "ブロック",
                    style: "destructive",
                    onPress: () => {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      blockUser(conversation.user.id);
                      router.back();
                    },
                  },
                ]
              );
            }}
          >
            <View style={[moreMenuStyles.iconWrap, { backgroundColor: "#FFF0EE" }]}>
              <FIcon name="slash" size={17} color="#C0392B" />
            </View>
            <View style={moreMenuStyles.rowText}>
              <Text style={[moreMenuStyles.rowLabel, { color: "#C0392B" }]}>
                {lang === "ko" ? "차단하기" : "ブロックする"}
              </Text>
              <Text style={[moreMenuStyles.rowSub, { color: colors.charcoalLight }]}>
                {lang === "ko" ? "이 사용자를 영구 차단해요" : "このユーザーを永久にブロックします"}
              </Text>
            </View>
            <FIcon name="chevron-right" size={15} color={colors.border} />
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={[moreMenuStyles.cancelBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => setShowMoreMenu(false)}
          >
            <Text style={[moreMenuStyles.cancelText, { color: colors.charcoalMid }]}>
              {lang === "ko" ? "닫기" : "閉じる"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* ── Trust Gate Modal ─────────────────────────────────────────────── */}
      <Modal visible={showTrustGateModal} transparent animationType="fade">
        <Pressable
          style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
          onPress={() => setShowTrustGateModal(false)}
        />
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 40 + insets.bottom,
            backgroundColor: colors.surface,
            borderRadius: 18,
            padding: 20,
            gap: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View style={{ alignItems: "center", gap: 6 }}>
            <View style={{ backgroundColor: colors.roseLight, borderRadius: 30, padding: 10, marginBottom: 4 }}>
              <FIcon name="lock" size={22} color={colors.rose} />
            </View>
            <Text style={{ fontFamily: "Inter_700Bold", fontSize: 16, color: colors.charcoal, textAlign: "center" }}>
              {lang === "ko" ? "본인 인증이 필요해요" : "本人確認が必要です"}
            </Text>
            <Text style={{ fontFamily: "Inter_400Regular", fontSize: 13, color: colors.charcoalLight, textAlign: "center", lineHeight: 19 }}>
              {lang === "ko"
                ? "연락처 공개 요청은 신뢰 점수 25점 이상인 경우에만 가능해요. 신뢰 센터에서 인증을 완료해 주세요."
                : "連絡先の公開リクエストは信頼スコア25点以上が必要です。トラストセンターで認証を完了してください。"}
            </Text>
          </View>
          <TouchableOpacity
            style={{ backgroundColor: colors.rose, borderRadius: 12, paddingVertical: 13, alignItems: "center" }}
            onPress={() => {
              setShowTrustGateModal(false);
              router.push("/trust-center" as any);
            }}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#fff" }}>
              {lang === "ko" ? "신뢰 센터로 이동" : "トラストセンターへ"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{ alignItems: "center", paddingVertical: 6 }}
            onPress={() => setShowTrustGateModal(false)}
          >
            <Text style={{ fontFamily: "Inter_500Medium", fontSize: 13, color: colors.charcoalLight }}>
              {lang === "ko" ? "닫기" : "閉じる"}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarWrap: {
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
  headerUser: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 2,
  },
  headerName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  headerStatus: {
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
  },

  // Translation toggle — wider pill with label
  translationToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  translationToggleLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.5,
  },

  // ── Banners ──────────────────────────────────────────────────────────────
  unlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  unlockIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },

  // ── Message list ──────────────────────────────────────────────────────────
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // ── Input area ────────────────────────────────────────────────────────────
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  aiBtn: {
    minWidth: 44,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 3,
    borderWidth: 1,
    marginBottom: 4,
    paddingHorizontal: 10,
  },
  aiBtnLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  aiBtnBadge: {
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    marginLeft: 1,
  },
  aiBtnBadgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.2,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 11 : 8,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },

  // ── Quick reply chips ──────────────────────────────────────────────────────
  quickRepliesOuter: {
    paddingHorizontal: 14,
    paddingTop: 9,
    paddingBottom: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  quickRepliesLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickRepliesLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 10.5,
    letterSpacing: 0.2,
  },
  quickRepliesChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  quickReplyChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 7,
    maxWidth: "100%",
    flexShrink: 1,
  },
  quickReplyChipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  quickReplyChipSkeleton: {
    height: 32,
    borderRadius: 20,
    borderWidth: 1,
    opacity: 0.5,
  },
});

const moreMenuStyles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 2,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  rowSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
  cancelBtn: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    paddingVertical: 14,
  },
  cancelText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
